import { dishes } from '../data/dishes'
import { regionalDishAffinity } from '../data/regionalCuisine'
import type { Dish, RecommendationProfile, TasteTag } from '../types'
import { defaultTasteDna, loadTasteDna, saveTasteDna } from './tasteDna'

export type PantryAmount = 'enough' | 'low'
export type KitchenSpice = 'none' | 'mild' | 'hot'
export type KitchenTool = 'any' | 'stove' | 'airfryer' | 'oven'
export type KitchenFeedback = 'fit' | 'light' | 'heavy' | 'dislike'

export interface KitchenPantryItem {
  id: string
  name: string
  amount: PantryAmount
  source: 'scan' | 'manual'
  updatedAt: number
}

export interface KitchenPreferences {
  minutes: 15 | 30 | 45
  people: 1 | 2 | 4
  spice: KitchenSpice
  lowOil: boolean
  tool: KitchenTool
  exclusions: string[]
}

export interface KitchenRecommendation {
  dish: Dish
  kind: 'best' | 'fast' | 'waste'
  label: string
  reasons: string[]
  matched: string[]
  missing: string[]
}

export interface TasteFeedbackEntry {
  id: string
  dishId: number
  feedback: KitchenFeedback
  createdAt: number
}

export const pantryStorageKey = 'flavor-compass-pantry-v1'
export const kitchenPreferencesStorageKey = 'flavor-compass-kitchen-preferences-v1'
export const kitchenFeedbackStorageKey = 'flavor-compass-kitchen-feedback-v1'
export const activeCookStorageKey = 'flavor-compass-active-cook-v1'

export const defaultKitchenPreferences: KitchenPreferences = {
  minutes: 30,
  people: 2,
  spice: 'mild',
  lowOil: false,
  tool: 'any',
  exclusions: [],
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN').replace(/[\s、，,。；;]+/g, '')
}

function ingredientMatches(left: string, right: string) {
  const a = normalized(left)
  const b = normalized(right)
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}

function isPantryItem(value: unknown): value is KitchenPantryItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<KitchenPantryItem>
  return typeof item.id === 'string'
    && typeof item.name === 'string'
    && Boolean(item.name.trim())
    && (item.amount === 'enough' || item.amount === 'low')
    && (item.source === 'scan' || item.source === 'manual')
    && typeof item.updatedAt === 'number'
}

export function loadKitchenPantry(): KitchenPantryItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(pantryStorageKey) || '[]') as unknown
    return Array.isArray(value) ? value.filter(isPantryItem).slice(0, 30) : []
  } catch {
    return []
  }
}

export function saveKitchenPantry(items: KitchenPantryItem[]) {
  localStorage.setItem(pantryStorageKey, JSON.stringify(items.slice(0, 30)))
}

export function loadKitchenPreferences(): KitchenPreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(kitchenPreferencesStorageKey) || 'null') as Partial<KitchenPreferences> | null
    if (!stored) return { ...defaultKitchenPreferences }
    return {
      minutes: stored.minutes === 15 || stored.minutes === 30 || stored.minutes === 45 ? stored.minutes : 30,
      people: stored.people === 1 || stored.people === 2 || stored.people === 4 ? stored.people : 2,
      spice: stored.spice === 'none' || stored.spice === 'mild' || stored.spice === 'hot' ? stored.spice : 'mild',
      lowOil: Boolean(stored.lowOil),
      tool: stored.tool === 'stove' || stored.tool === 'airfryer' || stored.tool === 'oven' ? stored.tool : 'any',
      exclusions: Array.isArray(stored.exclusions) ? stored.exclusions.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 12) : [],
    }
  } catch {
    return { ...defaultKitchenPreferences }
  }
}

export function saveKitchenPreferences(preferences: KitchenPreferences) {
  localStorage.setItem(kitchenPreferencesStorageKey, JSON.stringify(preferences))
}

export function addPantryNames(current: KitchenPantryItem[], names: string[], source: KitchenPantryItem['source']) {
  const next = [...current]
  names.map((name) => name.trim()).filter(Boolean).forEach((name) => {
    const existing = next.find((item) => ingredientMatches(item.name, name))
    if (existing) {
      existing.name = name
      existing.updatedAt = Date.now()
      existing.source = source
      return
    }
    next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, amount: 'enough', source, updatedAt: Date.now() })
  })
  return next.slice(0, 30)
}

function dishTasteFit(dish: Dish, profile: RecommendationProfile) {
  const entries = Object.entries(dish.tastes) as Array<[TasteTag, number]>
  if (!entries.length) return 0
  return entries.reduce((total, [taste, value]) => total + (1 - Math.abs(profile.tasteDna[taste] / 100 - value)), 0) / entries.length
}

export function rankKitchenDishes(items: KitchenPantryItem[], preferences: KitchenPreferences, profile: RecommendationProfile): KitchenRecommendation[] {
  const exclusions = preferences.exclusions.map((value) => normalized(value.replace(/过敏|不要|不吃|忌口|禁食/g, ''))).filter(Boolean)
  const eligible = dishes.filter((dish) => {
    const searchable = normalized(`${dish.name}${dish.ingredients.join('')}${dish.constraints.join('')}`)
    if (exclusions.some((term) => searchable.includes(term))) return false
    if (preferences.spice === 'none' && ((dish.tastes.辣 || 0) > .55 || (dish.tastes.麻辣 || 0) > .65)) return false
    return true
  })

  const scored = eligible.map((dish) => {
    const matched = items.filter((item) => dish.ingredients.some((ingredient) => ingredientMatches(item.name, ingredient)))
    const missing = dish.ingredients.filter((ingredient) => !items.some((item) => ingredientMatches(item.name, ingredient)))
    const lowMatches = matched.filter((item) => item.amount === 'low')
    const staleMatches = matched.filter((item) => Date.now() - item.updatedAt > 7 * 24 * 60 * 60 * 1000)
    const timeFit = dish.time <= preferences.minutes ? 1 : Math.max(0, 1 - (dish.time - preferences.minutes) / 30)
    const tasteFit = dishTasteFit(dish, profile)
    const hometownFit = regionalDishAffinity(dish, profile.hometown)
    const spiceFit = preferences.spice === 'hot' ? Math.max(dish.tastes.辣 || 0, dish.tastes.麻辣 || 0) : 0
    const lowOilFit = preferences.lowOil ? (dish.constraints.includes('低脂') ? 8 : dish.nutrition.fat > 20 ? -6 : 2) : 0
    const toolFit = preferences.tool === 'airfryer' || preferences.tool === 'oven'
      ? (/鸡|鱼|虾/.test(`${dish.name}${dish.ingredients.join('')}`) ? 4 : 0)
      : 0
    const score = matched.length * 28 + lowMatches.length * 8 - staleMatches.length * 6 - missing.length * 3 + timeFit * 18 + tasteFit * 16 + hometownFit * 5 + spiceFit * 6 + lowOilFit + toolFit
    return { dish, matched, missing, lowMatches, staleMatches, score }
  })

  const byBest = [...scored].sort((a, b) => b.score - a.score)
  const selected: Array<(typeof scored)[number] & { kind: KitchenRecommendation['kind']; label: string }> = []
  const take = (candidate: (typeof scored)[number] | undefined, kind: KitchenRecommendation['kind'], label: string) => {
    if (candidate && !selected.some((item) => item.dish.id === candidate.dish.id)) selected.push({ ...candidate, kind, label })
  }

  take(byBest[0], 'best', '综合最合适')
  take([...scored].filter((item) => !selected.some((picked) => picked.dish.id === item.dish.id)).sort((a, b) => a.dish.time - b.dish.time || b.score - a.score)[0], 'fast', '最快完成')
  take([...scored].filter((item) => !selected.some((picked) => picked.dish.id === item.dish.id)).sort((a, b) => b.lowMatches.length - a.lowMatches.length || b.matched.length - a.matched.length || b.score - a.score)[0], 'waste', '最少浪费')
  byBest.forEach((candidate) => take(candidate, selected.length === 1 ? 'fast' : 'waste', selected.length === 1 ? '最快完成' : '最少浪费'))

  return selected.slice(0, 3).map((item) => {
    const pantryReason = item.matched.length ? `直接用上 ${item.matched.length} 种现有食材` : '按你的口味与时间条件排序'
    const missingReason = item.missing.length ? `还需准备 ${item.missing.slice(0, 2).join('、')}` : '现有食材基本够用'
    const reasonByKind = item.kind === 'fast'
      ? `${item.dish.time} 分钟可以完成`
      : item.kind === 'waste' && item.lowMatches.length
        ? `优先消耗 ${item.lowMatches.slice(0, 2).map((entry) => entry.name).join('、')}`
        : preferences.lowOil && item.dish.constraints.includes('低脂')
          ? `符合本餐少油条件，适合 ${preferences.people === 4 ? '3–4' : preferences.people} 人`
          : `${item.dish.time} 分钟，适合 ${preferences.people === 4 ? '3–4' : preferences.people} 人用餐`
    return {
      dish: item.dish,
      kind: item.kind,
      label: item.label,
      reasons: [pantryReason, reasonByKind, missingReason],
      matched: item.matched.map((entry) => entry.name),
      missing: item.missing,
    }
  })
}

export function tasteMemorySummary() {
  const profile = loadTasteDna()
  const top = (Object.entries(profile) as Array<[TasteTag, number]>).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([taste]) => taste)
  return `偏${top.join('、')} · ${profile.辣 >= 58 || profile.麻辣 >= 62 ? '偏爱辣感' : '温和辣度'}`
}

export function recordKitchenFeedback(dish: Dish, feedback: KitchenFeedback) {
  const entry: TasteFeedbackEntry = { id: `${Date.now()}-${dish.id}`, dishId: dish.id, feedback, createdAt: Date.now() }
  try {
    const stored = JSON.parse(localStorage.getItem(kitchenFeedbackStorageKey) || '[]') as TasteFeedbackEntry[]
    localStorage.setItem(kitchenFeedbackStorageKey, JSON.stringify([entry, ...(Array.isArray(stored) ? stored : [])].slice(0, 30)))
  } catch {
    localStorage.setItem(kitchenFeedbackStorageKey, JSON.stringify([entry]))
  }

  const profile = loadTasteDna()
  const next = { ...profile }
  const dishTastes = Object.entries(dish.tastes) as Array<[TasteTag, number]>
  dishTastes.forEach(([taste, value]) => {
    if (feedback === 'fit') next[taste] = Math.min(100, Math.round(next[taste] + value * 2))
    if (feedback === 'light') next[taste] = Math.min(100, Math.round(next[taste] + value * 4))
    if (feedback === 'heavy') next[taste] = Math.max(0, Math.round(next[taste] - value * 4))
    if (feedback === 'dislike') next[taste] = Math.max(0, Math.round(next[taste] - value * 3))
  })
  if (feedback === 'heavy') next.清淡 = Math.min(100, next.清淡 + 4)
  saveTasteDna(next)
}

export function resetTasteMemory() {
  saveTasteDna({ ...defaultTasteDna })
  localStorage.removeItem(kitchenFeedbackStorageKey)
}
