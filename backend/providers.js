import Anthropic from '@anthropic-ai/sdk'

const PROVIDER = process.env.AI_PROVIDER || 'claude'

async function chatClaude(messages, system) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1024,
    system,
    messages,
  })
  return response.content[0].text
}

async function chatOllama(messages, system) {
  const model = process.env.OLLAMA_MODEL || 'llama3'
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)
  const data = await response.json()
  return data.message.content
}

export async function chat(messages, system) {
  if (PROVIDER === 'ollama') return chatOllama(messages, system)
  return chatClaude(messages, system)
}
