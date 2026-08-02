import { dishes } from '../data/dishes'
import { regionalRecommendationPayload } from '../data/regionalCuisine'
import type { RecommendationProfile, SearchResult, TasteTag } from '../types'
import { searchDishes } from './recommend'

export interface TasteAnalysisResponse {
  source: 'remote' | 'local'
  results: SearchResult[]
}

interface RemoteTasteResponse {
  items?: Array<{ dishId: number; score: number; reasons?: string[] }>
}

export interface PantryIngredient {
  name: string
  confidence: number
}

export interface PantryAnalysisResponse {
  source: 'remote'
  ingredients: PantryIngredient[]
  recipeQuery?: string
  recipeIdeas?: Array<{ name: string; reason: string; keywords?: string }>
}

interface RemotePantryResponse {
  ingredients?: PantryIngredient[]
  recipeQuery?: string
  recipeIdeas?: Array<{ name: string; reason: string; keywords?: string }>
}

/**
 * Secure AI boundary: the browser sends intent to our backend, never an API key.
 * Taste ranking has a deterministic local fallback. Image recognition deliberately
 * has no fabricated fallback: without the backend it fails into manual confirmation.
 */
export async function analyzeTaste(query: string, selected: TasteTag[], profile?: RecommendationProfile, signal?: AbortSignal): Promise<TasteAnalysisResponse> {
  const endpoint = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, '') || ''

  try {
    const response = await fetch(`${endpoint}/api/taste/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        selectedTastes: selected,
        tasteDna: profile?.tasteDna,
        gender: profile?.gender,
        hometown: regionalRecommendationPayload(profile?.hometown || null),
        recommendationMode: profile?.recommendationMode || 'standard',
        locale: 'zh-CN',
        candidates: dishes.map((dish) => ({
          id: dish.id,
          name: dish.name,
          region: dish.region,
          tags: Object.entries(dish.tastes).filter(([, weight]) => (weight || 0) > 0).map(([taste]) => taste),
          ingredients: dish.ingredients,
          nutrition: dish.nutrition,
        })),
      }),
      signal,
    })
    if (!response.ok) throw new Error(`Taste API responded ${response.status}`)
    const payload = await response.json() as RemoteTasteResponse
    const results = (payload.items || []).flatMap((item) => {
      const dish = dishes.find((candidate) => candidate.id === item.dishId)
      if (!dish) return []
      return [{ dish, score: Math.max(0, Math.min(0.99, item.score)), reasons: item.reasons?.slice(0, 3) || dish.highlights.slice(0, 2) }]
    })
    if (!results.length) throw new Error('Taste API returned no usable dishes')
    return { source: 'remote', results }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return { source: 'local', results: searchDishes(query, selected, profile).slice(0, 5) }
  }
}

export async function analyzePantryImage(image?: File, signal?: AbortSignal): Promise<PantryAnalysisResponse> {
  const endpoint = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, '') || ''
  if (!image) throw new Error('请先选择一张真实食材照片')

  try {
    const optimizedImage = await optimizePantryImage(image)
    const response = await fetch(`${endpoint}/api/pantry/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: optimizedImage }),
      signal,
    })
    if (!response.ok) throw new Error(`Pantry API responded ${response.status}`)
    const payload = await response.json() as RemotePantryResponse
    const ingredients = (payload.ingredients || []).filter((item) => item.name && Number.isFinite(item.confidence)).slice(0, 8)
    if (!ingredients.length) throw new Error('Pantry API returned no usable ingredients')
    return { source: 'remote', ingredients, recipeQuery: payload.recipeQuery, recipeIdeas: payload.recipeIdeas }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw error
  }
}

async function optimizePantryImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file)
    const maxEdge = 1280
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法压缩照片')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return readFileAsDataUrl(file)
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('无法读取照片'))
    reader.onerror = () => reject(reader.error || new Error('无法读取照片'))
    reader.readAsDataURL(file)
  })
}
