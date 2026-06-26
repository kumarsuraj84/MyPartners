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
  private client: Groq
  private model: string

  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY })
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  }

  async complete(options: AICompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
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

const defaultProvider = new GroqProvider()
registerProvider('groq', defaultProvider)

// Active AI service — backed by the registry. To switch providers at runtime,
// update this reference; no other code changes required.
export const aiService: AIProvider = defaultProvider
