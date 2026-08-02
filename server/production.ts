import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createAiGateway, type PantryRequest, type RecipeDetailsRequest, type TasteRequest, type WebDishSearchRequest } from './aiGateway'
import type { AdvisorRequest } from './tasteAdvisorSkill'

const port = Number(process.env.PORT || 9001)
const host = process.env.HOST || '127.0.0.1'
const maxBodyBytes = 12_000_000

const gateway = createAiGateway({
  apiKey: process.env.OPENAI_NEXT_API_KEY,
  baseUrl: process.env.OPENAI_NEXT_BASE_URL,
  textModel: process.env.AI_TEXT_MODEL,
  visionModel: process.env.AI_VISION_MODEL,
  fallbackModel: process.env.AI_FALLBACK_MODEL,
  chatFastModel: process.env.AI_CHAT_FAST_MODEL,
  chatBalancedModel: process.env.AI_CHAT_BALANCED_MODEL,
  chatDeepModel: process.env.AI_CHAT_DEEP_MODEL,
})

const handlers: Record<string, (payload: Record<string, unknown>) => Promise<unknown>> = {
  '/api/taste/analyze': (payload) => gateway.analyzeTaste(payload as TasteRequest),
  '/api/pantry/scan': (payload) => gateway.scanPantry(payload as PantryRequest),
  '/api/search/dishes': (payload) => gateway.searchWebDishes(payload as WebDishSearchRequest),
  '/api/recipe/details': (payload) => gateway.getRecipeDetails(payload as RecipeDetailsRequest),
  '/api/advisor/chat': (payload) => gateway.chatWithAdvisor(payload as AdvisorRequest),
}

const server = createServer(async (request, response) => {
  setCommonHeaders(response)
  const path = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (request.method === 'GET' && path === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'chi-le-me-api',
      configured: Boolean(process.env.OPENAI_NEXT_API_KEY),
      models: {
        text: process.env.AI_TEXT_MODEL || 'gpt-5.4-mini',
        vision: process.env.AI_VISION_MODEL || 'gpt-5.4-mini',
        advisor: process.env.AI_CHAT_FAST_MODEL || 'deepseek-v4-flash',
      },
    })
    return
  }

  const handler = handlers[path]
  if (!handler) {
    sendJson(response, 404, { error: '接口不存在' })
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: '只支持 POST 请求' })
    return
  }

  try {
    const payload = await readJsonBody(request)
    const result = await handler(payload)
    if (path === '/api/search/dishes') response.setHeader('Cache-Control', 'private, max-age=300')
    sendJson(response, 200, result)
  } catch (error) {
    sendJson(response, error instanceof SyntaxError ? 400 : 503, { error: safeErrorMessage(error) })
  }
})

server.requestTimeout = 75_000
server.headersTimeout = 80_000
server.listen(port, host, () => {
  console.log(`Chi Le Me API listening on http://${host}:${port}`)
})

const shutdown = () => server.close(() => process.exit(0))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

function setCommonHeaders(response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('X-Content-Type-Options', 'nosniff')
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.end(JSON.stringify(body))
}

function readJsonBody(request: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = ''
    let tooLarge = false
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      if (tooLarge) return
      body += chunk
      if (Buffer.byteLength(body, 'utf8') > maxBodyBytes) {
        tooLarge = true
        body = ''
      }
    })
    request.on('end', () => {
      if (tooLarge) return reject(new Error('请求内容过大'))
      try {
        resolve(body ? JSON.parse(body) as Record<string, unknown> : {})
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.name === 'AbortError' ? 'AI 响应超时，请重试' : error.message
  return 'AI 服务暂时不可用'
}
