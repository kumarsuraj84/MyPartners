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

// Single AI service instance — swap provider here to change AI backend
export const aiService: AIProvider = new GroqProvider()
