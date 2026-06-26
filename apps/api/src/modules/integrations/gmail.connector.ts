// Gmail Connector — reference implementation of the Connector interface.
// All future connectors follow this pattern: implement Connector, register in index.ts.
import type { Connector, ConnectorConfig, ConnectorStatus } from '../../lib/connector.js'
import { prisma } from '../../lib/prisma.js'

export class GmailConnector implements Connector {
  readonly provider = 'gmail'
  readonly displayName = 'Gmail'
  readonly scopes = ['https://www.googleapis.com/auth/gmail.readonly']

  async getAuthUrl(userId: string): Promise<string> {
    const clientId = process.env.GMAIL_CLIENT_ID
    const redirectUri = process.env.GMAIL_REDIRECT_URI
    if (!clientId || !redirectUri) throw new Error('Gmail integration not configured')

    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(clientId, process.env.GMAIL_CLIENT_SECRET, redirectUri)
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: userId,
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

  async sync(_config: ConnectorConfig): Promise<{ processed: number; errors: number }> {
    // Message sync is driven by the AI processing pipeline on demand.
    // Scheduled background sync is a future capability gated behind calendarSync feature flag.
    return { processed: 0, errors: 0 }
  }

  async healthCheck(config: ConnectorConfig): Promise<ConnectorStatus> {
    if (!config.accessToken) {
      return { connected: false, healthy: false, error: 'No access token' }
    }
    const tokenExpired = config.expiresAt != null && config.expiresAt < new Date()
    if (tokenExpired && !config.refreshToken) {
      return { connected: true, healthy: false, error: 'Token expired — reconnect required' }
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
