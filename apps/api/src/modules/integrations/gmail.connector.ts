// Gmail Connector — reference implementation of the Connector interface.
// All future connectors follow this pattern: implement Connector, register in index.ts.
import type { Connector, ConnectorConfig, ConnectorStatus } from '../../lib/connector.js'
import { prisma } from '../../lib/prisma.js'

export class GmailConnector implements Connector {
  readonly provider = 'gmail'
  readonly displayName = 'Gmail'
  readonly scopes = ['https://www.googleapis.com/auth/gmail.readonly']

  async getAuthUrl(userId: string, state?: string): Promise<string> {
    const clientId = process.env.GMAIL_CLIENT_ID
    const redirectUri = process.env.GMAIL_REDIRECT_URI
    if (!clientId || !redirectUri) throw new Error('Gmail integration not configured')

    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(clientId, process.env.GMAIL_CLIENT_SECRET, redirectUri)
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      // Use the caller-supplied state (which should contain a CSRF nonce) or fall back to userId
      state: state ?? userId,
    })
  }

  async handleCallback(code: string, userId: string): Promise<ConnectorConfig> {
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )
    const { tokens } = await oauth2Client.getToken(code)

    const integration = await prisma.integration.upsert({
      where: { userId_provider: { userId, provider: this.provider } },
      create: {
        userId,
        provider: this.provider,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
      },
    })

    return {
      provider: this.provider,
      userId,
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken,
      expiresAt: integration.expiresAt,
    }
  }

  async sync(config: ConnectorConfig): Promise<{ processed: number; errors: number }> {
    // Message sync is driven by the AI processing pipeline on demand.
    // Scheduled background sync is a future capability gated behind calendarSync feature flag.

    // TODO: implement Gmail message fetch using googleapis.
    // Example starting point:
    //   const { google } = await import('googleapis')
    //   const oauth2Client = new google.auth.OAuth2(...)
    //   oauth2Client.setCredentials({ access_token: config.accessToken })
    //   const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    //   const res = await gmail.users.messages.list({ userId: 'me', maxResults: 50 })
    //   // process res.data.messages and upsert into local DB
    void config
    return { processed: 0, errors: 0 }
  }

  /** Attempt to refresh an expired access token and persist the new tokens. */
  private async refreshTokens(config: ConnectorConfig): Promise<ConnectorConfig> {
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )
    oauth2Client.setCredentials({ refresh_token: config.refreshToken })
    const { credentials } = await oauth2Client.refreshAccessToken()

    const updated = await prisma.integration.update({
      where: { userId_provider: { userId: config.userId, provider: this.provider } },
      data: {
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      },
    })

    return {
      ...config,
      accessToken: updated.accessToken,
      expiresAt: updated.expiresAt,
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<ConnectorStatus> {
    if (!config.accessToken) {
      return { connected: false, healthy: false, error: 'No access token' }
    }
    const tokenExpired = config.expiresAt != null && config.expiresAt < new Date()
    if (tokenExpired && !config.refreshToken) {
      return { connected: true, healthy: false, error: 'Token expired — reconnect required' }
    }
    // If the token is expired but we have a refresh token, attempt a silent refresh
    if (tokenExpired && config.refreshToken) {
      try {
        await this.refreshTokens(config)
        return {
          connected: true,
          healthy: true,
          metadata: { hasRefreshToken: true, tokenRefreshed: true },
        }
      } catch {
        return { connected: true, healthy: false, error: 'Token refresh failed — reconnect required' }
      }
    }
    return {
      connected: true,
      healthy: !tokenExpired,
      metadata: { hasRefreshToken: config.refreshToken != null },
    }
  }

  async disconnect(config: ConnectorConfig): Promise<void> {
    await prisma.integration.update({
      where: { userId_provider: { userId: config.userId, provider: this.provider } },
      data: { isActive: false, accessToken: null, refreshToken: null },
    })
  }
}

export const gmailConnector = new GmailConnector()
