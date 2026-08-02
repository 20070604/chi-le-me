import { createAiGateway, type WebDishSearchRequest } from '../../server/aiGateway'

declare const process: { env: Record<string, string | undefined> }

interface ApiRequest { method?: string; body?: unknown }
interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'private, max-age=300')
  if (request.method !== 'POST') return response.status(405).json({ error: '只支持 POST 请求' })

  try {
    const gateway = createAiGateway({
      apiKey: process.env.OPENAI_NEXT_API_KEY,
      baseUrl: process.env.OPENAI_NEXT_BASE_URL,
      textModel: process.env.AI_TEXT_MODEL,
      visionModel: process.env.AI_VISION_MODEL,
      fallbackModel: process.env.AI_FALLBACK_MODEL,
    })
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    return response.status(200).json(await gateway.searchWebDishes((body || {}) as WebDishSearchRequest))
  } catch (error) {
    return response.status(503).json({ error: safeMessage(error) })
  }
}

function safeMessage(error: unknown) {
  return error instanceof Error ? error.message : '联网搜索暂时不可用'
}
