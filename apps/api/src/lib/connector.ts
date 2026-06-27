// Connector Framework — standardised lifecycle for every external integration.
// Every connector MUST implement this interface.
// The Gmail connector is the reference implementation.

export interface ConnectorStatus {
  connected: boolean
  healthy: boolean
  lastSync?: Date
  error?: string
  metadata?: Record<string, unknown>
}

export interface ConnectorConfig {
  provider: string
  userId: string
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: Date | null
  metadata?: Record<string, unknown> | null
}

export interface Connector {
  readonly provider: string
  readonly displayName: string
  readonly scopes: string[]

  /** Returns the OAuth/redirect URL to start the auth flow.
   * @param state - Optional pre-built state string (e.g. JSON with userId + CSRF nonce).
   *   When omitted the connector falls back to using userId as the state. */
  getAuthUrl(userId: string, state?: string): Promise<string>

  /** Exchanges an auth code/callback payload for tokens and persists the Integration row. */
  handleCallback(code: string, userId: string): Promise<ConnectorConfig>

  /** Pulls new data from the provider and writes it to local tables. */
  sync(config: ConnectorConfig): Promise<{ processed: number; errors: number }>

  /** Returns the live health and token validity of this connector instance. */
  healthCheck(config: ConnectorConfig): Promise<ConnectorStatus>

  /** Revokes remote tokens and marks the Integration inactive. */
  disconnect(config: ConnectorConfig): Promise<void>
}

// ─── Provider Registry ────────────────────────────────────────────────────────

const registry = new Map<string, Connector>()

export function registerConnector(connector: Connector): void {
  registry.set(connector.provider, connector)
}

export function getConnector(provider: string): Connector | undefined {
  return registry.get(provider)
}

export function listConnectors(): Array<{ provider: string; displayName: string; scopes: string[] }> {
  return Array.from(registry.values()).map(c => ({
    provider: c.provider,
    displayName: c.displayName,
    scopes: c.scopes,
  }))
}
