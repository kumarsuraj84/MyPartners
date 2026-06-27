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

class OllamaProvider implements AIProvider {
  private baseUrl: string
  private model: string

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:3b'
  }

  async complete(options: AICompletionOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        stream: false,
        options: { temperature: options.temperature ?? 0.3 },
        format: options.responseFormat === 'json' ? 'json' : undefined,
      }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`)
    const data = await res.json() as { message: { content: string } }
    return data.message?.content ?? ''
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
const ollamaProvider = new OllamaProvider()
registerProvider('groq', groqProvider)
registerProvider('ollama', ollamaProvider)

const activeProviderName = process.env.AI_PROVIDER || 'groq'
const defaultProvider = providerRegistry.get(activeProviderName) ?? groqProvider

// Active AI service — set AI_PROVIDER=ollama in .env to use local Llama
export const aiService: AIProvider = defaultProvider
