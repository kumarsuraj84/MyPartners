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
    let activeConfig = config

    // Refresh token if expired
    if (activeConfig.expiresAt && activeConfig.expiresAt < new Date()) {
      if (!activeConfig.refreshToken) return { processed: 0, errors: 1 }
      try {
        activeConfig = await this.refreshTokens(activeConfig)
      } catch {
        return { processed: 0, errors: 1 }
      }
    }

    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )
    oauth2Client.setCredentials({ access_token: activeConfig.accessToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Find the integration record for upserts
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: config.userId, provider: this.provider } },
    })
    if (!integration) return { processed: 0, errors: 1 }

    // Fetch up to 50 messages from the last 7 days
    const afterEpoch = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: `after:${afterEpoch} in:inbox`,
    }).catch(() => null)
    if (!listRes) return { processed: 0, errors: 1 }

    const messageIds = listRes.data.messages ?? []
    let processed = 0
    let errors = 0

    for (const { id: msgId } of messageIds) {
      if (!msgId) continue
      try {
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: msgId,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        })
        const headers = msgRes.data.payload?.headers ?? []
        const get = (name: string) => headers.find((h: { name?: string | null; value?: string | null }) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

        const fromRaw = get('From')
        const fromMatch = fromRaw.match(/^(.*?)\s*<(.+)>$/)
        const fromName = fromMatch ? fromMatch[1].trim().replace(/^"|"$/g, '') : undefined
        const fromAddress = fromMatch ? fromMatch[2] : fromRaw.trim()
        const subject = get('Subject') || undefined
        const dateStr = get('Date')
        const receivedAt = dateStr ? new Date(dateStr) : new Date()
        const snippet = msgRes.data.snippet ?? ''

        await prisma.message.upsert({
          where: { integrationId_externalId: { integrationId: integration.id, externalId: msgId } },
          create: {
            integrationId: integration.id,
            userId: config.userId,
            externalId: msgId,
            provider: this.provider,
            fromAddress,
            fromName,
            subject,
            body: snippet,
            summary: snippet.slice(0, 300),
            receivedAt,
            threadId: msgRes.data.threadId ?? undefined,
          },
          update: {},
        })
        processed++
      } catch {
        errors++
      }
    }

    return { processed, errors }
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
