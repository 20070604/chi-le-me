import { advisorDepthConfig, buildAdvisorMessages, resolveAdvisorDepth, type AdvisorDepth, type AdvisorRequest } from './tasteAdvisorSkill'

export interface AiGatewayConfig {
  apiKey?: string
  baseUrl?: string
  textModel?: string
  visionModel?: string
  fallbackModel?: string
  chatFastModel?: string
  chatBalancedModel?: string
  chatDeepModel?: string
  timeoutMs?: number
}

export interface TasteCandidate {
  id: number
  name: string
  region: string
  tags: string[]
  ingredients: string[]
  nutrition: Record<string, number>
}

export interface TasteRequest {
  query?: string
  selectedTastes?: string[]
  tasteDna?: unknown
  gender?: string
  hometown?: unknown
  recommendationMode?: 'standard' | 'healthy'
  locale?: string
  candidates?: TasteCandidate[]
}

export interface PantryRequest {
  image?: string
}

export interface WebDishSearchRequest {
  query?: string
  context?: 'home' | 'kitchen' | 'weekly' | 'diary' | 'nutrition'
  limit?: number
  ideas?: WebDishIdea[]
  excludeNames?: string[]
}

export interface WebDishIdea {
  name: string
  reason: string
  keywords?: string
  imageKeywords?: string
}

export interface WebDishSearchItem {
  id: string
  name: string
  summary: string
  sourceTitle: string
  sourceUrl: string
  sourceSite: string
  snippet: string
  imageUrl?: string
  imageCredit?: string
  imageSourceUrl?: string
  ingredients?: Array<{ name: string; amount?: string }>
  steps?: Array<{ text: string; imageUrl?: string }>
  tips?: string
  timeMinutes?: number
  difficulty?: '简单' | '适中'
  region?: string
  highlights?: string[]
  nutrition?: { calories: number; protein: number; fat: number; carbs: number; fiber: number }
  video?: { title: string; pageUrl: string; embedUrl: string }
  videoChecked?: boolean
}

export interface RecipeDetailsRequest {
  sourceUrl?: string
  name?: string
  summary?: string
  snippet?: string
}

interface ModelAnswer<T> {
  confidence: number
  value: T
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>
}

const DEFAULT_BASE_URL = 'https://api.openai-next.com/v1'
const DEFAULT_TEXT_MODEL = 'gpt-5.4-mini'
const DEFAULT_VISION_MODEL = 'gpt-5.4-mini'
const DEFAULT_FALLBACK_MODEL = 'gpt-5.6-terra'
const DEFAULT_CHAT_FAST_MODEL = 'deepseek-v4-flash'
const DEFAULT_CHAT_BALANCED_MODEL = 'qwen3.5-plus'
const DEFAULT_CHAT_DEEP_MODEL = 'gpt-5.6-terra'

export function createAiGateway(config: AiGatewayConfig) {
  const apiKey = config.apiKey?.trim()
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
  const textModel = config.textModel || DEFAULT_TEXT_MODEL
  const visionModel = config.visionModel || DEFAULT_VISION_MODEL
  const fallbackModel = config.fallbackModel || DEFAULT_FALLBACK_MODEL
  const chatModels: Record<AdvisorDepth, string> = {
    quick: config.chatFastModel || DEFAULT_CHAT_FAST_MODEL,
    balanced: config.chatBalancedModel || DEFAULT_CHAT_BALANCED_MODEL,
    deep: config.chatDeepModel || DEFAULT_CHAT_DEEP_MODEL,
  }
  const timeoutMs = config.timeoutMs || 18_000

  const requestJson = async (model: string, messages: unknown[], maxTokens = 900) => {
    if (!apiKey) throw new Error('AI 服务密钥尚未配置')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`上游模型 ${model} 返回 ${response.status}`)
      const payload = await response.json() as ChatCompletionResponse
      const content = payload.choices?.[0]?.message?.content
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content) ? content.map((part) => part.text || '').join('') : ''
      return parseJsonObject(text)
    } finally {
      clearTimeout(timer)
    }
  }

  const withAccuracyFallback = async <T>(primaryModel: string, messages: unknown[], validate: (payload: Record<string, unknown>) => ModelAnswer<T>, confidenceThreshold = 0.76, maxTokens = 900) => {
    let primaryError: unknown
    let primaryValue: T | undefined
    try {
      const primary = validate(await requestJson(primaryModel, messages, maxTokens))
      if (primary.confidence >= confidenceThreshold || fallbackModel === primaryModel) return primary.value
      primaryValue = primary.value
    } catch (error) {
      primaryError = error
    }

    try {
      return validate(await requestJson(fallbackModel, messages, maxTokens)).value
    } catch (fallbackError) {
      if (primaryValue !== undefined) return primaryValue
      throw fallbackError || primaryError || new Error('AI 模型暂时不可用')
    }
  }

  const analyzeTaste = async (input: TasteRequest) => {
    const candidates = Array.isArray(input.candidates) ? input.candidates.slice(0, 30) : []
    if (!candidates.length) throw new Error('没有可供推荐的菜品')

    const messages = [
      {
        role: 'system',
        content: '你是高级中餐饮食推荐引擎。只根据候选菜品作答，兼顾用户明确需求、口味、家乡饮食文化和营养。输出纯 JSON，不要 Markdown。',
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: '选出最多5道菜并排序。score 为0到0.99；reasons 是1到3条简短、具体、可解释的中文理由。',
          output: { confidence: '0到1', items: [{ dishId: '候选id', score: 0.92, reasons: ['理由'] }] },
          user: {
            query: input.query || '',
            selectedTastes: input.selectedTastes || [],
            tasteDna: input.tasteDna || null,
            gender: input.gender || '',
            hometown: input.hometown || null,
            recommendationMode: input.recommendationMode === 'healthy' ? '健康版：优先少油、少盐与营养均衡' : '普通版：兼顾完整菜谱与外卖便利性',
            locale: input.locale || 'zh-CN',
          },
          candidates,
        }),
      },
    ]

    const candidateIds = new Set(candidates.map((item) => item.id))
    return withAccuracyFallback(textModel, messages, (payload) => {
      const rawItems = Array.isArray(payload.items) ? payload.items : []
      const items = rawItems.flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return []
        const item = raw as Record<string, unknown>
        const dishId = Number(item.dishId)
        if (!candidateIds.has(dishId)) return []
        const reasons = Array.isArray(item.reasons) ? item.reasons.filter((reason): reason is string => typeof reason === 'string').slice(0, 3) : []
        return [{ dishId, score: clamp(Number(item.score), 0, 0.99), reasons }]
      }).slice(0, 5)
      if (!items.length) throw new Error('模型没有返回有效菜品')
      return { confidence: clamp(Number(payload.confidence), 0, 1), value: { items } }
    })
  }

  const scanPantry = async (input: PantryRequest) => {
    if (!input.image?.startsWith('data:image/')) throw new Error('没有收到有效食材照片')
    if (input.image.length > 12_000_000) throw new Error('照片过大，请重新拍摄')

    const messages = [
      {
        role: 'system',
        content: '你是严谨的厨房食材视觉识别器。只识别画面中确实可见的食材，不猜测菜名、调味料或不可见内容。输出纯 JSON，不要 Markdown。',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: '识别图中最多8种可用于做饭的食材，并给出5道能使用这些食材的常见具体菜名。返回 {"confidence":0到1,"ingredients":[{"name":"中文食材名","confidence":0到1}],"dishNames":["具体菜名"]}。只写画面明确可见的食材，按置信度降序。' },
          { type: 'image_url', image_url: { url: input.image } },
        ],
      },
    ]

    return withAccuracyFallback(visionModel, messages, (payload) => {
      const rawIngredients = Array.isArray(payload.ingredients) ? payload.ingredients : []
      const seen = new Set<string>()
      const ingredients = rawIngredients.flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return []
        const item = raw as Record<string, unknown>
        const name = typeof item.name === 'string' ? item.name.trim().slice(0, 12) : ''
        if (!name || seen.has(name)) return []
        seen.add(name)
        return [{ name, confidence: clamp(Number(item.confidence), 0, 0.99) }]
      }).sort((left, right) => right.confidence - left.confidence).slice(0, 8)
      if (!ingredients.length) throw new Error('没有识别到明确食材')
      const recipeIdeas = normalizeDishIdeas(payload.dishNames, 5)
      const strongest = ingredients[0]?.confidence || 0
      const modelConfidence = clamp(Number(payload.confidence), 0, 1)
      return { confidence: Math.max(modelConfidence, strongest * 0.9), value: { ingredients, recipeQuery: `${ingredients.map((item) => item.name).join('、')} 家常菜 菜谱`, recipeIdeas } }
    }, 0.66, 500)
  }

  const searchWebDishes = async (input: WebDishSearchRequest) => {
    const query = input.query?.trim().slice(0, 180) || ''
    if (query.length < 2) throw new Error('请输入更具体的菜名、食材或口味')
    const limit = Math.max(3, Math.min(6, Number(input.limit) || 5))
    const excludedNames = new Set((input.excludeNames || []).map((name) => normalizeDishName(name)).filter(Boolean).slice(0, 12))
    const cacheKey = `v2:${input.context || 'home'}:${query}:${limit}:${[...excludedNames].sort().join('|')}`
    const cached = webDishCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return { items: cached.items, cached: true }

    const messages = [
      {
        role: 'system',
        content: '你是联网菜谱检索规划器。把用户需求转成真实、常见、可在中文互联网检索到的具体菜名。不要编造网红店名、来源或网址。只输出纯 JSON。',
      },
      {
        role: 'user',
        content: JSON.stringify({
          query,
          context: input.context || 'home',
          excludeNames: input.excludeNames || [],
          task: `给出${limit}个互不重复的具体菜名，兼顾需求匹配和多样性。绝对不要返回 excludeNames 中已有的菜。keywords用于菜谱网页检索；imageKeywords必须是适合开放版权图片检索的英文菜名或英文核心食材短语；reason不超过24个汉字。`,
          output: { confidence: '0到1', ideas: [{ name: '具体菜名', reason: '为什么符合', keywords: '菜名 核心食材 菜谱 做法', imageKeywords: 'accurate English dish name' }] },
        }),
      },
    ]

    const suppliedIdeas = normalizeDishIdeas(input.ideas, limit).filter((idea) => !excludedNames.has(normalizeDishName(idea.name)))
    const ideas = suppliedIdeas.length >= 2 ? suppliedIdeas : await withAccuracyFallback(textModel, messages, (payload) => {
      const value = normalizeDishIdeas(payload.ideas, limit).filter((idea) => !excludedNames.has(normalizeDishName(idea.name)))
      if (value.length < 2) throw new Error('模型没有生成有效检索词')
      return { confidence: clamp(Number(payload.confidence), 0, 1), value }
    }, 0.76, 650)

    const items = (await Promise.all(ideas.map((idea, index) => findRecipeSource(idea, index))))
      .filter((item): item is WebDishSearchItem => Boolean(item))
      .filter((item) => !excludedNames.has(normalizeDishName(item.name)))
    if (!items.length) throw new Error('暂时没有找到可靠的网络菜谱')
    webDishCache.set(cacheKey, { expiresAt: Date.now() + 15 * 60_000, items })
    return { items, cached: false }
  }

  const getRecipeDetails = async (input: RecipeDetailsRequest) => {
    const name = input.name?.trim().slice(0, 60) || ''
    const sourceUrl = input.sourceUrl?.trim() || ''
    if (!name || !isSafePublicUrl(sourceUrl) || !trustedRecipeSites.some(([domain]) => sourceUrl.toLowerCase().includes(domain))) throw new Error('菜谱来源无效')

    const sourceDetailsPromise: Promise<Pick<WebDishSearchItem, 'ingredients' | 'steps' | 'tips'>> = /xiachufang\.com\/recipe\//i.test(sourceUrl)
      ? fetchXiachufangDetails(sourceUrl)
      : Promise.resolve({})
    const [sourceDetails, video] = await Promise.all([
      sourceDetailsPromise,
      findRecipeVideo(name),
    ])
    const sourceIngredients = sanitizeIngredients(sourceDetails.ingredients, name)

    const messages = [
      {
        role: 'system',
        content: '你是严谨的菜谱数据整理器。根据菜名整理真正属于这道菜的一人份食材、营养估值、时间、难度、菜系和步骤。食材 name 只能是食材或调味料名称，严禁把网页标题、作者、说明句、历史介绍拆成食材。不要夸大精度；步骤仅在没有来源步骤时生成。只输出纯 JSON。',
      },
      {
        role: 'user',
        content: JSON.stringify({
          name,
          summary: input.summary || '',
          snippet: input.snippet || '',
          sourceIngredients,
          hasSourceSteps: Boolean(sourceDetails.steps?.length),
          task: '返回6到14项一人份 ingredients，每项包含简短 name 和 amount；再返回 timeMinutes(5-180)、difficulty(简单或适中)、region、2到3个 highlights、每人份 nutrition，以及5到8条简洁 steps。nutrition包含 calories、protein、fat、carbs、fiber，单位分别为kcal和g。食材必须与菜名严格一致。',
          output: { confidence: '0到1', ingredients: [{ name: '鸡翅中', amount: '6只' }], timeMinutes: 30, difficulty: '适中', region: '家常菜', highlights: ['均衡', '好执行'], nutrition: { calories: 420, protein: 24, fat: 15, carbs: 48, fiber: 6 }, steps: ['步骤一'] },
        }),
      },
    ]

    const metadata = await withAccuracyFallback(textModel, messages, (payload) => {
      const nutrition = payload.nutrition && typeof payload.nutrition === 'object' ? payload.nutrition as Record<string, unknown> : {}
      const generatedSteps = Array.isArray(payload.steps) ? payload.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 3).slice(0, 8) : []
      const highlights = Array.isArray(payload.highlights) ? payload.highlights.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 3) : []
      const generatedIngredients = sanitizeIngredients(payload.ingredients, name)
      if (!sourceIngredients.length && generatedIngredients.length < 3) throw new Error('模型没有返回与菜名匹配的有效食材')
      const value = {
        timeMinutes: Math.round(clamp(Number(payload.timeMinutes), 5, 180)),
        difficulty: payload.difficulty === '简单' ? '简单' as const : '适中' as const,
        region: typeof payload.region === 'string' ? payload.region.trim().slice(0, 20) : '家常风味',
        highlights: highlights.length ? highlights : ['真实菜谱', '好执行'],
        nutrition: {
          calories: Math.round(clamp(Number(nutrition.calories), 80, 1200)),
          protein: Math.round(clamp(Number(nutrition.protein), 1, 120)),
          fat: Math.round(clamp(Number(nutrition.fat), 1, 100)),
          carbs: Math.round(clamp(Number(nutrition.carbs), 1, 180)),
          fiber: Math.round(clamp(Number(nutrition.fiber), 0, 40)),
        },
        generatedIngredients,
        generatedSteps,
      }
      return { confidence: clamp(Number(payload.confidence), 0, 1), value }
    }, 0.7, 900).catch(() => ({
      timeMinutes: 30,
      difficulty: '适中' as const,
      region: '家常风味',
      highlights: ['真实菜谱', '好执行'],
      nutrition: { calories: 420, protein: 24, fat: 15, carbs: 48, fiber: 6 },
      generatedIngredients: fallbackIngredientsForDish(name),
      generatedSteps: [],
    }))

    const steps = sourceDetails.steps?.length
      ? sourceDetails.steps
      : metadata.generatedSteps.map((text) => ({ text }))
    const ingredients = sourceIngredients.length
      ? sourceIngredients
      : /火鸡.*面/.test(name)
        ? fallbackIngredientsForDish(name)
        : metadata.generatedIngredients
    return {
      ...sourceDetails,
      ingredients,
      steps,
      timeMinutes: metadata.timeMinutes,
      difficulty: metadata.difficulty,
      region: metadata.region,
      highlights: metadata.highlights,
      nutrition: metadata.nutrition,
      video,
      videoChecked: true,
    }
  }

  const chatWithAdvisor = async (input: AdvisorRequest) => {
    const message = input.message?.trim().slice(0, 800) || ''
    if (message.length < 2) throw new Error('请说得再具体一点')
    const depth = resolveAdvisorDepth(input.depth, message)
    const startedAt = Date.now()
    const maxTokens = depth === 'quick' ? 620 : depth === 'balanced' ? 900 : 1_250
    const confidenceThreshold = depth === 'quick' ? 0.68 : depth === 'balanced' ? 0.75 : 0.8
    const messages = buildAdvisorMessages({ ...input, message }, depth)

    const result = await withAccuracyFallback(chatModels[depth], messages, (payload) => {
      const answer = typeof payload.answer === 'string' ? payload.answer.trim().slice(0, 360) : ''
      if (!answer) throw new Error('味觉顾问没有返回有效回答')

      const rawDimensions = Array.isArray(payload.dimensions) ? payload.dimensions : []
      const dimensions = rawDimensions.flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return []
        const item = raw as Record<string, unknown>
        const label = typeof item.label === 'string' ? item.label.trim().slice(0, 12) : ''
        const summary = typeof item.summary === 'string' ? item.summary.trim().slice(0, 72) : ''
        if (!label || !summary) return []
        return [{
          key: typeof item.key === 'string' ? item.key.trim().slice(0, 20) : label,
          label,
          summary,
        }]
      }).slice(0, advisorDepthConfig[depth].dimensionLimit)

      const assumptions = Array.isArray(payload.assumptions)
        ? payload.assumptions.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim().slice(0, 72)).slice(0, 2)
        : []
      const followUps = Array.isArray(payload.followUps)
        ? payload.followUps.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim().slice(0, 36)).slice(0, 3)
        : []

      return {
        confidence: clamp(Number(payload.confidence), 0, 1),
        value: { answer, dimensions, assumptions, followUps },
      }
    }, confidenceThreshold, maxTokens)

    return {
      ...result,
      depth,
      modeLabel: advisorDepthConfig[depth].label,
      latencyMs: Date.now() - startedAt,
    }
  }

  return { analyzeTaste, scanPantry, searchWebDishes, getRecipeDetails, chatWithAdvisor }
}

function parseJsonObject(value: string) {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型没有返回 JSON')
  return JSON.parse(value.slice(start, end + 1)) as Record<string, unknown>
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum
  return Math.max(minimum, Math.min(maximum, value))
}

const webDishCache = new Map<string, { expiresAt: number; items: WebDishSearchItem[] }>()
const dishImageCache = new Map<string, { expiresAt: number; image?: Pick<WebDishSearchItem, 'imageUrl' | 'imageCredit' | 'imageSourceUrl'> }>()
const trustedRecipeSites: Array<[string, string, number]> = [
  ['xiachufang.com', '下厨房', 12],
  ['douguo.com', '豆果美食', 11],
  ['meishichina.com', '美食天下', 10],
]

async function findRecipeSource(idea: { name: string; reason: string; keywords: string; imageKeywords?: string }, index: number): Promise<WebDishSearchItem | null> {
  const licensedImagePromise = findLicensedDishImage(idea)
  const xiachufangResult = await searchXiachufang(idea)
  if (xiachufangResult) {
    const licensedImage = xiachufangResult.imageUrl ? undefined : await licensedImagePromise
    return { ...xiachufangResult, ...licensedImage }
  }

  const searchQuery = `${idea.name} ${idea.keywords} 菜谱 做法`
  const searchUrl = `https://www.bing.com/search?format=rss&mkt=zh-CN&q=${encodeURIComponent(searchQuery)}`
  try {
    const response = await fetchWithTimeout(searchUrl, 7_000, { Accept: 'application/rss+xml, application/xml;q=0.9' })
    if (!response.ok) throw new Error(`搜索服务返回 ${response.status}`)
    const entries = parseBingRss(await response.text())
    const ranked = entries.map((entry, order) => ({ entry, score: sourceScore(entry, idea.name) - order * 0.08 })).sort((left, right) => right.score - left.score)
    const best = ranked.find(({ entry, score }) => score >= 10 && isRecipeSourceUrl(entry.link) && entryMatchesDish(entry, idea.name))?.entry
    const licensedImage = await licensedImagePromise
    if (!best) return fallbackSearchItem(idea, index, licensedImage)
    const sourceSite = siteLabel(best.link)
    const imageUrl = await fetchRecipeImage(best.link)
    return {
      id: `web-${hashString(best.link)}`,
      name: idea.name,
      summary: idea.reason,
      sourceTitle: cleanText(best.title).slice(0, 90),
      sourceUrl: best.link,
      sourceSite,
      snippet: cleanText(best.description).slice(0, 110),
      ...(imageUrl ? { imageUrl } : licensedImage),
    }
  } catch {
    return fallbackSearchItem(idea, index, await licensedImagePromise)
  }
}

async function searchXiachufang(idea: { name: string; reason: string }): Promise<WebDishSearchItem | null> {
  const searchUrl = `https://www.xiachufang.com/search/?keyword=${encodeURIComponent(idea.name)}`
  try {
    const response = await fetchWithTimeout(searchUrl, 7_000, { Accept: 'text/html' })
    if (!response.ok) return null
    const html = await response.text()
    const cards = [...html.matchAll(/<div class="recipe\s+recipe-[\s\S]*?<\/li>/gi)].slice(0, 8)
    const candidates = cards.flatMap((match) => {
      const card = match[0]
      const href = card.match(/href="(\/recipe\/\d+\/)"/i)?.[1]
      const nameHtml = card.match(/<p class="name">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1]
      if (!href || !nameHtml) return []
      const name = cleanText(nameHtml)
      const image = card.match(/data-src="(https:[^"]+)"/i)?.[1] || card.match(/<img[^>]+src="(https:[^"]+)"/i)?.[1]
      const ingredientHtml = card.match(/<p class="ing[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''
      const commonChars = [...idea.name].filter((character) => name.includes(character) && !/\s|的|味|菜/.test(character)).length
      return [{
        score: commonChars * 2 + (name.includes(idea.name) || idea.name.includes(name) ? 8 : 0),
        name,
        href,
        image: image ? decodeXml(image) : undefined,
        ingredients: cleanText(ingredientHtml).replace(/、+/g, '、').slice(0, 110),
      }]
    }).sort((left, right) => right.score - left.score)
    const best = candidates.find((candidate) => candidate.score >= 4)
    if (!best) return null
    const sourceUrl = new URL(best.href, 'https://www.xiachufang.com').toString()
    const details = await fetchXiachufangDetails(sourceUrl)
    return {
      id: `web-${hashString(sourceUrl)}`,
      name: best.name || idea.name,
      summary: idea.reason,
      sourceTitle: `${best.name || idea.name}的做法步骤图`,
      sourceUrl,
      sourceSite: '下厨房',
      snippet: best.ingredients || `查看${best.name || idea.name}的完整食材和步骤。`,
      imageUrl: best.image && isSafePublicUrl(best.image) ? best.image : undefined,
      ...details,
    }
  } catch {
    return null
  }
}

async function fetchXiachufangDetails(sourceUrl: string): Promise<Pick<WebDishSearchItem, 'ingredients' | 'steps' | 'tips'>> {
  try {
    const response = await fetchWithTimeout(sourceUrl, 5_000, { Accept: 'text/html' })
    if (!response.ok) return {}
    const html = (await response.text()).slice(0, 500_000)
    const ingredientsBlock = html.match(/<div class="ings">([\s\S]*?)<\/div>/i)?.[1] || ''
    const ingredients = [...ingredientsBlock.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((match) => {
      const row = match[1]
      const name = cleanText(row.match(/<td class="name"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '').slice(0, 40)
      const amount = cleanText(row.match(/<td class="unit"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '').slice(0, 30)
      return name ? [{ name, amount: amount || undefined }] : []
    }).slice(0, 20)

    const stepsBlock = html.match(/<div class="steps">[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/i)?.[1] || ''
    const steps = [...stepsBlock.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].flatMap((match) => {
      const item = match[1]
      const text = cleanText(item.match(/<p class="text"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '').slice(0, 240)
      const rawImage = item.match(/<img[^>]+src="(https:[^"]+)"/i)?.[1]
      const imageUrl = rawImage ? decodeXml(rawImage) : undefined
      return text ? [{ text, imageUrl: imageUrl && isSafePublicUrl(imageUrl) ? imageUrl : undefined }] : []
    }).slice(0, 12)

    const tips = cleanText(html.match(/<div class="tip">([\s\S]*?)<\/div>/i)?.[1] || '').slice(0, 240) || undefined
    return {
      ingredients: ingredients.length ? ingredients : undefined,
      steps: steps.length ? steps : undefined,
      tips,
    }
  } catch {
    return {}
  }
}

async function findRecipeVideo(name: string): Promise<WebDishSearchItem['video']> {
  const bilibiliUrl = `https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&keyword=${encodeURIComponent(`${name} 做法`)}`
  try {
    const response = await fetchWithTimeout(bilibiliUrl, 5_000, {
      Accept: 'application/json',
      Referer: 'https://search.bilibili.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
    })
    if (response.ok) {
      const payload = await response.json() as { code?: number; data?: { result?: Array<{ title?: string; bvid?: string }> } }
      const item = payload.code === 0 ? payload.data?.result?.find((candidate) => /^BV[0-9A-Za-z]+$/.test(candidate.bvid || '')) : undefined
      if (item?.bvid) return {
        title: cleanText(item.title || `${name}视频教程`).slice(0, 90),
        pageUrl: `https://www.bilibili.com/video/${item.bvid}`,
        embedUrl: `https://player.bilibili.com/player.html?bvid=${item.bvid}&page=1&high_quality=1&danmaku=0`,
      }
    }
  } catch { /* Fall through to public web search. */ }

  const searchUrl = `https://www.bing.com/search?format=rss&mkt=zh-CN&q=${encodeURIComponent(`site:bilibili.com/video ${name} 做法 教程`)}`
  try {
    const response = await fetchWithTimeout(searchUrl, 5_000, { Accept: 'application/rss+xml, application/xml;q=0.9' })
    if (!response.ok) return undefined
    const entry = parseBingRss(await response.text()).find((item) => /bilibili\.com\/video\/BV[0-9A-Za-z]+/i.test(item.link))
    const bvid = entry?.link.match(/\/video\/(BV[0-9A-Za-z]+)/i)?.[1]
    if (!entry || !bvid) return undefined
    return {
      title: cleanText(entry.title).slice(0, 90) || `${name}视频教程`,
      pageUrl: entry.link,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0`,
    }
  } catch {
    return undefined
  }
}

function fallbackSearchItem(idea: { name: string; reason: string }, index: number, image?: Pick<WebDishSearchItem, 'imageUrl' | 'imageCredit' | 'imageSourceUrl'>): WebDishSearchItem {
  const sourceUrl = `https://www.xiachufang.com/search/?keyword=${encodeURIComponent(idea.name)}`
  return {
    id: `web-search-${index}-${hashString(idea.name)}`,
    name: idea.name,
    summary: idea.reason,
    sourceTitle: `${idea.name}菜谱检索`,
    sourceUrl,
    sourceSite: '菜谱检索',
    snippet: `${idea.name}的食材、用量与完整烹饪步骤。`,
    ...image,
  }
}

interface RssEntry { title: string; link: string; description: string }

function parseBingRss(xml: string): RssEntry[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1]
    return {
      title: decodeXml(tagValue(item, 'title')),
      link: decodeXml(tagValue(item, 'link')),
      description: decodeXml(tagValue(item, 'description')),
    }
  }).filter((entry) => entry.title && entry.link)
}

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))
  return match?.[1]?.trim() || ''
}

function decodeXml(value: string) {
  return value.replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function cleanText(value: string) {
  return decodeXml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeDishName(value: string) {
  return value.toLowerCase().replace(/[\s·•（）()\-—_]/g, '')
}

function sourceScore(entry: RssEntry, dishName: string) {
  let score = 0
  const lowerUrl = entry.link.toLowerCase()
  trustedRecipeSites.forEach(([domain, , weight]) => { if (lowerUrl.includes(domain)) score += weight })
  const meaningfulChars = [...dishName].filter((character) => !/\s|的|味|菜/.test(character))
  score += meaningfulChars.filter((character) => entry.title.includes(character)).length * 0.8
  if (/菜谱|做法|步骤|怎么做|教程/.test(entry.title + entry.description)) score += 3
  if (/小说|百科|医学|软件下载|应用商店/.test(entry.title + entry.description)) score -= 12
  return score
}

function isRecipeSourceUrl(value: string) {
  if (!isSafePublicUrl(value)) return false
  const lower = value.toLowerCase()
  return /xiachufang\.com\/recipe\/\d+/.test(lower)
    || /douguo\.com\/cookbook\/\d+/.test(lower)
    || /meishichina\.com\/recipe\/\d+/.test(lower)
}

function entryMatchesDish(entry: RssEntry, dishName: string) {
  const text = cleanText(`${entry.title} ${entry.description}`)
  const normalizedDish = normalizeDishName(dishName)
  if (!normalizedDish) return false
  if (normalizeDishName(text).includes(normalizedDish)) return /菜谱|做法|步骤|怎么做|教程/.test(text)
  const meaningfulChars = [...new Set([...dishName].filter((character) => !/\s|的|味|菜/.test(character)))]
  const coverage = meaningfulChars.length ? meaningfulChars.filter((character) => text.includes(character)).length / meaningfulChars.length : 0
  return coverage >= .75 && /菜谱|做法|步骤|怎么做|教程/.test(text)
}

function siteLabel(url: string) {
  const match = trustedRecipeSites.find(([domain]) => url.toLowerCase().includes(domain))
  if (match) return match[1]
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '网络菜谱' }
}

function isSafePublicUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)
  } catch {
    return false
  }
}

async function fetchRecipeImage(url: string) {
  if (!trustedRecipeSites.some(([domain]) => url.toLowerCase().includes(domain))) return undefined
  try {
    const response = await fetchWithTimeout(url, 4_000, { Accept: 'text/html' })
    if (!response.ok) return undefined
    const html = (await response.text()).slice(0, 400_000)
    const match = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i)
    if (!match?.[1]) return undefined
    const imageUrl = new URL(decodeXml(match[1]), url).toString()
    return isSafePublicUrl(imageUrl) ? imageUrl : undefined
  } catch {
    return undefined
  }
}

interface OpenverseImageSearchResponse {
  results?: Array<{
    title?: string
    thumbnail?: string
    url?: string
    foreign_landing_url?: string
    creator?: string
    license?: string
    mature?: boolean
  }>
}

async function findLicensedDishImage(idea: { name: string; imageKeywords?: string }) {
  const cacheKey = normalizeDishName(`${idea.name}:${idea.imageKeywords || ''}`)
  const cached = dishImageCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.image

  const queries = [...new Set([
    idea.imageKeywords?.trim(),
    idea.name.trim(),
    genericDishImageQuery(idea.name),
  ].filter((value): value is string => Boolean(value)))]
  for (const query of queries) {
    try {
      const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=5&license_type=commercial&mature=false`
      const response = await fetchWithTimeout(url, 6_000, { Accept: 'application/json' })
      if (!response.ok) continue
      const payload = await response.json() as OpenverseImageSearchResponse
      const candidates = payload.results?.filter((candidate) => !candidate.mature && isSafePublicUrl(candidate.thumbnail || candidate.url || '')) || []
      const result = candidates.length
        ? candidates[parseInt(hashString(`${idea.name}:${query}`), 36) % candidates.length]
        : undefined
      const imageUrl = result?.thumbnail || result?.url
      if (!result || !imageUrl) continue
      const image = {
        imageUrl,
        imageCredit: [result.creator, result.license?.toUpperCase()].filter(Boolean).join(' · ') || 'Openverse',
        imageSourceUrl: isSafePublicUrl(result.foreign_landing_url || '') ? result.foreign_landing_url : 'https://openverse.org/',
      }
      dishImageCache.set(cacheKey, { expiresAt: Date.now() + 24 * 60 * 60_000, image })
      return image
    } catch { /* Try the next precise query. */ }
  }

  dishImageCache.set(cacheKey, { expiresAt: Date.now() + 15 * 60_000, image: undefined })
  return undefined
}

function genericDishImageQuery(name: string) {
  if (/鸡翅/.test(name)) return 'cooked chicken wings food'
  if (/鸡腿/.test(name)) return 'roasted chicken drumsticks food'
  if (/鸡/.test(name)) return 'cooked chicken dish food'
  if (/面|粉|米线/.test(name)) return 'spicy Asian noodles food'
  if (/豆腐/.test(name)) return 'tofu dish food'
  if (/鱼/.test(name)) return 'cooked fish dish food'
  if (/虾|海鲜/.test(name)) return 'cooked shrimp seafood dish'
  if (/牛/.test(name)) return 'cooked beef dish food'
  if (/饭|粥/.test(name)) return 'Asian rice dish food'
  return 'Chinese food dish'
}

function sanitizeIngredients(value: unknown, dishName = ''): Array<{ name: string; amount?: string }> {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const dishKey = normalizeDishName(dishName)
  return value.flatMap((raw) => {
    const candidate = typeof raw === 'string' ? { name: raw } : raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
    if (!candidate) return []
    const name = typeof candidate.name === 'string' ? cleanText(candidate.name).replace(/[：:]+$/, '').trim() : ''
    const amount = typeof candidate.amount === 'string' ? cleanText(candidate.amount).trim().slice(0, 24) : undefined
    const key = normalizeDishName(name)
    const looksLikeSentence = /[。！？；]|以来|今天|发展|承载|研究|认为|简介|做法|步骤|来源|作者|评分|做过/.test(name)
    if (!key || key === dishKey || seen.has(key) || name.length > 18 || looksLikeSentence) return []
    seen.add(key)
    return [{ name, amount: amount || undefined }]
  }).slice(0, 16)
}

function fallbackIngredientsForDish(name: string): Array<{ name: string; amount?: string }> {
  if (/火鸡.*面/.test(name)) return [{ name: '韩式火鸡面', amount: '1包' }, { name: '鸡蛋', amount: '1个' }, { name: '海苔碎', amount: '适量' }, { name: '熟芝麻', amount: '1茶匙' }, { name: '芝士片', amount: '1片（可选）' }]
  if (/可乐鸡翅/.test(name)) return [{ name: '鸡翅中', amount: '6只' }, { name: '可乐', amount: '250毫升' }, { name: '生抽', amount: '1汤匙' }, { name: '老抽', amount: '半茶匙' }, { name: '姜', amount: '3片' }, { name: '食用油', amount: '少量' }]
  if (/鸡翅/.test(name)) return [{ name: '鸡翅中', amount: '6只' }, { name: '姜', amount: '3片' }, { name: '蒜', amount: '2瓣' }, { name: '生抽', amount: '1汤匙' }, { name: '料酒', amount: '1汤匙' }, { name: '食用油', amount: '少量' }]
  if (/豆腐/.test(name)) return [{ name: '豆腐', amount: '300克' }, { name: '葱', amount: '1根' }, { name: '蒜', amount: '2瓣' }, { name: '生抽', amount: '1汤匙' }, { name: '食用油', amount: '适量' }]
  if (/鱼/.test(name)) return [{ name: '鲜鱼', amount: '1条' }, { name: '姜', amount: '4片' }, { name: '葱', amount: '2根' }, { name: '料酒', amount: '1汤匙' }, { name: '盐', amount: '适量' }]
  if (/虾/.test(name)) return [{ name: '鲜虾', amount: '200克' }, { name: '蒜', amount: '3瓣' }, { name: '葱', amount: '1根' }, { name: '料酒', amount: '1茶匙' }, { name: '盐', amount: '适量' }]
  if (/牛/.test(name)) return [{ name: '牛肉', amount: '200克' }, { name: '姜', amount: '3片' }, { name: '生抽', amount: '1汤匙' }, { name: '淀粉', amount: '1茶匙' }, { name: '食用油', amount: '适量' }]
  if (/面|粉|米线/.test(name)) return [{ name: '面条', amount: '120克' }, { name: '时蔬', amount: '100克' }, { name: '葱', amount: '1根' }, { name: '生抽', amount: '1汤匙' }, { name: '食用油', amount: '适量' }]
  return [{ name: name.slice(0, 12), amount: '1份' }, { name: '葱', amount: '适量' }, { name: '姜', amount: '适量' }, { name: '生抽', amount: '1汤匙' }, { name: '食用油', amount: '适量' }]
}

async function fetchWithTimeout(url: string, timeoutMs: number, headers: Record<string, string>) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { headers: { 'User-Agent': 'ChiLeMe/1.0 recipe-search', ...headers }, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function normalizeDishIdeas(value: unknown, limit: number) {
  const rawIdeas = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  return rawIdeas.flatMap((raw) => {
    if (typeof raw === 'string') {
      const name = raw.trim().slice(0, 28)
      if (!name || seen.has(name)) return []
      seen.add(name)
      return [{ name, reason: '由照片中的真实食材直接匹配', keywords: `${name} 菜谱 做法`, imageKeywords: name }]
    }
    if (!raw || typeof raw !== 'object') return []
    const idea = raw as Record<string, unknown>
    const name = typeof idea.name === 'string' ? idea.name.trim().slice(0, 28) : ''
    if (!name || seen.has(name)) return []
    seen.add(name)
    return [{
      name,
      reason: typeof idea.reason === 'string' ? idea.reason.trim().slice(0, 48) : '符合当前饮食需求',
      keywords: typeof idea.keywords === 'string' ? idea.keywords.trim().slice(0, 80) : `${name} 菜谱 做法`,
      imageKeywords: typeof idea.imageKeywords === 'string' ? idea.imageKeywords.trim().slice(0, 80) : name,
    }]
  }).slice(0, limit)
}
