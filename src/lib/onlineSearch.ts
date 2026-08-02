export type OnlineSearchContext = 'home' | 'kitchen' | 'weekly' | 'diary' | 'nutrition'

export interface OnlineDishIdea {
  name: string
  reason: string
  keywords?: string
  imageKeywords?: string
}

export interface OnlineDishResult {
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

export interface OnlineSearchOptions {
  excludeNames?: string[]
  refreshKey?: string
}

interface OnlineSearchResponse {
  items?: OnlineDishResult[]
}

interface StoredSearch {
  savedAt: number
  items: OnlineDishResult[]
}

interface StoredOnlineLibrary {
  searches: Record<string, StoredSearch>
  library: OnlineDishResult[]
}

const STORAGE_KEY = 'flavor-compass-online-dish-library-v2'
const CACHE_TTL = 24 * 60 * 60_000
const resultCache = new Map<string, OnlineDishResult[]>()
let storedLibrary = loadStoredLibrary()

export async function searchOnlineDishes(query: string, context: OnlineSearchContext, signal?: AbortSignal, ideas?: OnlineDishIdea[], options?: OnlineSearchOptions) {
  const normalized = query.trim().replace(/\s+/g, ' ').slice(0, 180)
  if (normalized.length < 2) return []
  const excludedNames = (options?.excludeNames || []).map(normalizeDishName).filter(Boolean)
  const key = `${context}:${normalized}:${options?.refreshKey || ''}`
  const cached = resultCache.get(key)
  if (cached) return cached
  const persisted = storedLibrary.searches[key]
  if (persisted && Date.now() - persisted.savedAt < CACHE_TTL) {
    resultCache.set(key, persisted.items)
    return persisted.items
  }

  const endpoint = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, '') || ''
  const response = await fetch(`${endpoint}/api/search/dishes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: normalized, context, limit: 5, ideas, excludeNames: options?.excludeNames }),
    signal,
  })
  if (!response.ok) throw new Error(`联网搜索返回 ${response.status}`)
  const payload = await response.json() as OnlineSearchResponse
  const items = (payload.items || []).filter((item) => item.name && /^https:\/\//.test(item.sourceUrl) && !excludedNames.includes(normalizeDishName(item.name))).slice(0, 6)
  if (!items.length) throw new Error('没有找到可用的网络菜谱')
  resultCache.set(key, items)
  rememberSearch(key, items)
  return items
}

export function loadOnlineDishLibrary(limit = 12) {
  return storedLibrary.library.slice(0, limit)
}

export function getOnlineDishById(id: string) {
  return storedLibrary.library.find((item) => item.id === id)
}

export function getOnlineDishImage(name: string, imageUrl?: string) {
  if (imageUrl) return imageUrl
  if (/面|粉|米线|拉面/.test(name)) return '/images/dishes/tomato-chicken-pasta.jpg'
  if (/豆腐/.test(name)) return '/images/dishes/mapo-tofu.jpg'
  if (/鱼/.test(name)) return '/images/dishes/pickled-fish-soup.jpg'
  if (/虾|海鲜/.test(name)) return '/images/dishes/broccoli-shrimp.jpg'
  if (/牛/.test(name)) return '/images/dishes/pepper-beef.jpg'
  if (/鸡|鸭|鹅/.test(name)) return '/images/dishes/lemon-chicken.jpg'
  if (/粥|燕麦|南瓜|早餐/.test(name)) return '/images/dishes/pumpkin-oatmeal.jpg'
  return '/images/dishes/grain-bowl.jpg'
}

export async function loadOnlineRecipeDetails(item: OnlineDishResult, signal?: AbortSignal) {
  if (item.steps?.length && item.ingredients?.length && item.nutrition && item.timeMinutes && item.videoChecked) return item
  const endpoint = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, '') || ''
  const response = await fetch(`${endpoint}/api/recipe/details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceUrl: item.sourceUrl, name: item.name, summary: item.summary, snippet: item.snippet }),
    signal,
  })
  if (!response.ok) throw new Error(`菜谱详情返回 ${response.status}`)
  const details = await response.json() as Partial<OnlineDishResult>
  const enriched = {
    ...item,
    ...details,
    ingredients: details.ingredients?.length ? details.ingredients : item.ingredients,
    steps: details.steps?.length ? details.steps : item.steps,
  }
  rememberDishDetails(enriched)
  return enriched
}

function normalizeDishName(value: string) {
  return value.toLowerCase().replace(/[\s·•（）()\-—_]/g, '')
}

function rememberSearch(key: string, items: OnlineDishResult[]) {
  const byUrl = new Map<string, OnlineDishResult>()
  ;[...items, ...storedLibrary.library].forEach((item) => {
    if (!byUrl.has(item.sourceUrl)) byUrl.set(item.sourceUrl, item)
  })
  const searches = { ...storedLibrary.searches, [key]: { savedAt: Date.now(), items } }
  const recentSearches = Object.fromEntries(Object.entries(searches).sort(([, left], [, right]) => right.savedAt - left.savedAt).slice(0, 50))
  storedLibrary = { searches: recentSearches, library: [...byUrl.values()].slice(0, 1000) }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(storedLibrary)) } catch { /* Memory cache remains available. */ }
}

function rememberDishDetails(item: OnlineDishResult) {
  const update = (candidate: OnlineDishResult) => candidate.id === item.id || candidate.sourceUrl === item.sourceUrl ? item : candidate
  const searches = Object.fromEntries(Object.entries(storedLibrary.searches).map(([key, search]) => [key, { ...search, items: search.items.map(update) }]))
  const library = [item, ...storedLibrary.library.filter((candidate) => candidate.id !== item.id && candidate.sourceUrl !== item.sourceUrl)].slice(0, 1000)
  storedLibrary = { searches, library }
  resultCache.forEach((items, key) => resultCache.set(key, items.map(update)))
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(storedLibrary)) } catch { /* Memory cache remains available. */ }
}

function loadStoredLibrary(): StoredOnlineLibrary {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as StoredOnlineLibrary | null
    if (stored && stored.searches && Array.isArray(stored.library)) return stored
  } catch { /* Start with an empty dynamic library. */ }
  return { searches: {}, library: [] }
}
