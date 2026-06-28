// Google Calendar Connector — implements the Connector interface.
// Fetches today's events from Google Calendar and stores them as AIJob records.
import type { Connector, ConnectorConfig, ConnectorStatus } from '../../lib/connector.js'
import { prisma } from '../../lib/prisma.js'

export class GoogleCalendarConnector implements Connector {
  readonly provider = 'google_calendar'
  readonly displayName = 'Google Calendar'
  readonly scopes = ['https://www.googleapis.com/auth/calendar.readonly']

  async getAuthUrl(userId: string, state?: string): Promise<string> {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI
    if (!clientId || !redirectUri) throw new Error('Google Calendar integration not configured')

    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(clientId, process.env.GOOGLE_CALENDAR_CLIENT_SECRET, redirectUri)
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: state ?? userId,
    })
  }

  async handleCallback(code: string, userId: string): Promise<ConnectorConfig> {
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
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
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    )
    oauth2Client.setCredentials({ access_token: activeConfig.accessToken })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Today's window in UTC
    const now = new Date()
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

    const listRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    }).catch(() => null)

    if (!listRes) return { processed: 0, errors: 1 }

    const events = listRes.data.items ?? []
    let processed = 0

    for (const event of events) {
      if (!event.id) continue
      try {
        const startTime = event.start?.dateTime ?? event.start?.date ?? null
        const endTime = event.end?.dateTime ?? event.end?.date ?? null
        const attendees = (event.attendees ?? []).map(
          (a: { displayName?: string | null; email?: string | null }) =>
            a.displayName ?? a.email ?? '',
        ).filter(Boolean)

        const metadata = {
          eventId: event.id,
          title: event.summary ?? 'Untitled Event',
          startTime,
          endTime,
          attendees,
          location: event.location ?? null,
          description: event.description ?? null,
        }

        await prisma.aIJob.upsert({
          where: {
            id: `cal_${config.userId}_${event.id}`,
          },
          create: {
            id: `cal_${config.userId}_${event.id}`,
            userId: config.userId,
            type: 'calendar_event',
            status: 'completed',
            output: metadata,
            metadata,
            completedAt: new Date(),
          },
          update: {
            status: 'completed',
            output: metadata,
            metadata,
            completedAt: new Date(),
          },
        })
        processed++
      } catch {
        // Skip individual event errors
      }
    }

    return { processed, errors: 0 }
  }

  /** Attempt to refresh an expired access token and persist the new tokens. */
  private async refreshTokens(config: ConnectorConfig): Promise<ConnectorConfig> {
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
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

export const googleCalendarConnector = new GoogleCalendarConnector()
