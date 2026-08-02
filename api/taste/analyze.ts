import { createAiGateway, type TasteRequest } from '../../server/aiGateway'

declare const process: { env: Record<string, string | undefined> }

interface ApiRequest { method?: string; body?: unknown }
interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: '只支持 POST 请求' })

  try {
    const gateway = createAiGateway({
      apiKey: process.env.ADVISOR_API_KEY,
      baseUrl: process.env.ADVISOR_BASE_URL,
      model: process.env.ADVISOR_MODEL,
    })
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    return response.status(200).json(await gateway.analyzeTaste((body || {}) as TasteRequest))
  } catch (error) {
    return response.status(503).json({ error: safeMessage(error) })
  }
}

function safeMessage(error: unknown) {
  return error instanceof Error ? error.message : 'AI 服务暂时不可用'
}
