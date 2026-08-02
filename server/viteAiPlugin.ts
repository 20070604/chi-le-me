import type { Plugin } from 'vite'
import { createAiGateway, type AiGatewayConfig, type PantryRequest, type RecipeDetailsRequest, type TasteRequest, type WebDishSearchRequest } from './aiGateway'
import type { AdvisorRequest } from './tasteAdvisorSkill'

interface RequestBodyStream {
  setEncoding: (encoding: string) => void
  on: {
    (event: 'data', listener: (chunk: string) => void): void
    (event: 'end', listener: () => void): void
    (event: 'error', listener: (error: Error) => void): void
  }
}

export function aiApiPlugin(config: AiGatewayConfig): Plugin {
  const gateway = createAiGateway(config)

  return {
    name: 'chi-le-me-ai-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0]
        if (path !== '/api/taste/analyze' && path !== '/api/pantry/scan' && path !== '/api/search/dishes' && path !== '/api/recipe/details' && path !== '/api/advisor/chat') return next()

        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: '只支持 POST 请求' }))
          return
        }

        try {
          const payload = await readJsonBody(request)
          const result = path === '/api/taste/analyze'
            ? await gateway.analyzeTaste(payload as TasteRequest)
            : path === '/api/pantry/scan'
              ? await gateway.scanPantry(payload as PantryRequest)
              : path === '/api/search/dishes'
                ? await gateway.searchWebDishes(payload as WebDishSearchRequest)
                : path === '/api/recipe/details'
                  ? await gateway.getRecipeDetails(payload as RecipeDetailsRequest)
                  : await gateway.chatWithAdvisor(payload as AdvisorRequest)
          response.statusCode = 200
          response.end(JSON.stringify(result))
        } catch (error) {
          response.statusCode = error instanceof SyntaxError ? 400 : 503
          response.end(JSON.stringify({ error: safeErrorMessage(error) }))
        }
      })
    },
  }
}

function readJsonBody(request: RequestBodyStream) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      body += chunk
      if (body.length > 12_000_000) reject(new Error('请求内容过大'))
    })
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) as Record<string, unknown> : {}) } catch (error) { reject(error) }
    })
    request.on('error', reject)
  })
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.name === 'AbortError' ? 'AI 响应超时，请重试' : error.message
  return 'AI 服务暂时不可用'
}
