import Groq from 'groq-sdk'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

export interface AIProvider {
  complete(options: AICompletionOptions): Promise<string>
}

class GroqProvider implements AIProvider {
  private client: Groq | null = null
  private model: string

  constructor() {
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  }

  private getClient(): Groq {
    if (!this.client) {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set')
      this.client = new Groq({ apiKey: process.env.GROQ_API_KEY })
    }
    return this.client
  }

  async complete(options: AICompletionOptions): Promise<string> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
      response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
    })
    return response.choices[0]?.message?.content ?? ''
  }
}

// ─── Provider Registry ────────────────────────────────────────────────────────
// Register providers here. No business logic may reference a specific provider.
// All callers use `aiService` (the active provider) or `getProvider()` by name.

const providerRegistry = new Map<string, AIProvider>()

export function registerProvider(name: string, provider: AIProvider): void {
  providerRegistry.set(name, provider)
}

export function getProvider(name: string): AIProvider | undefined {
  return providerRegistry.get(name)
}

export function listProviders(): string[] {
  return Array.from(providerRegistry.keys())
}

const groqProvider = new GroqProvider()
registerProvider('groq', groqProvider)

const activeProviderName = process.env.AI_PROVIDER || 'groq'
const defaultProvider = providerRegistry.get(activeProviderName) ?? groqProvider

export const aiService: AIProvider = defaultProvider
