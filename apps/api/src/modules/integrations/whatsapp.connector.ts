// WhatsApp Connector — stub implementation of the Connector interface.
// WhatsApp Business API uses webhooks for inbound messages, not polling.
// Token-based auth: configure accessToken via settings, not OAuth.
import type { Connector, ConnectorConfig, ConnectorStatus } from '../../lib/connector.js'
import { prisma } from '../../lib/prisma.js'

export class WhatsAppConnector implements Connector {
  readonly provider = 'whatsapp'
  readonly displayName = 'WhatsApp'
  readonly scopes: string[] = []

  async getAuthUrl(_userId: string, _state?: string): Promise<string> {
    throw new Error('WhatsApp uses token-based auth — configure via settings')
  }

  async handleCallback(_code: string, _userId: string): Promise<ConnectorConfig> {
    throw new Error('WhatsApp uses token-based auth — configure via settings')
  }

  async sync(_config: ConnectorConfig): Promise<{ processed: number; errors: number }> {
    // WhatsApp Business API uses webhooks, not polling — nothing to pull here.
    return { processed: 0, errors: 0 }
  }

  async healthCheck(config: ConnectorConfig): Promise<ConnectorStatus> {
    const connected = !!config.accessToken
    return { connected, healthy: connected }
  }

  async disconnect(config: ConnectorConfig): Promise<void> {
    await prisma.integration.update({
      where: { userId_provider: { userId: config.userId, provider: this.provider } },
      data: { isActive: false },
    })
  }
}

export const whatsappConnector = new WhatsAppConnector()
