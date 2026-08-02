import type { TasteTag } from '../types'

export const tasteDnaStorageKey = 'flavor-compass-dna-v1'

export const defaultTasteDna: Record<TasteTag, number> = {
  酸甜: 54,
  麻辣: 42,
  咸鲜: 86,
  清淡: 68,
  辣: 36,
  香: 79,
}

const tasteKeys = Object.keys(defaultTasteDna) as TasteTag[]

export function loadTasteDna(): Record<TasteTag, number> {
  try {
    const stored = JSON.parse(localStorage.getItem(tasteDnaStorageKey) || 'null') as Partial<Record<TasteTag, number>> | null
    if (!stored) return { ...defaultTasteDna }
    return tasteKeys.reduce<Record<TasteTag, number>>((profile, taste) => {
      const value = stored[taste]
      profile[taste] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : defaultTasteDna[taste]
      return profile
    }, { ...defaultTasteDna })
  } catch {
    return { ...defaultTasteDna }
  }
}

export function saveTasteDna(profile: Record<TasteTag, number>) {
  localStorage.setItem(tasteDnaStorageKey, JSON.stringify(profile))
}
