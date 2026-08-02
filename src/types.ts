export type TasteTag = '酸甜' | '麻辣' | '咸鲜' | '清淡' | '辣' | '香'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type GoalId = 'lose' | 'maintain' | 'gain'

export type GenderPreference = 'male' | 'female' | 'private'

export type RecommendationMode = 'standard' | 'healthy'

export interface HometownSelection {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  areaCode?: string
  areaName?: string
}

export interface RecommendationProfile {
  gender: GenderPreference | null
  hometown: HometownSelection | null
  tasteDna: Record<TasteTag, number>
  recommendationMode?: RecommendationMode
}

export interface Nutrition {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

export interface Dish {
  id: number
  name: string
  subtitle: string
  image: string
  imageAlt: string
  imagePosition?: string
  imageFit?: 'cover' | 'contain'
  photoCredit: string
  photoUrl: string
  emoji: string
  colors: [string, string]
  accent: string
  region: string
  time: number
  difficulty: '简单' | '适中'
  tastes: Partial<Record<TasteTag, number>>
  ingredients: string[]
  constraints: string[]
  nutrition: Nutrition
  highlights: string[]
  steps: string[]
}

export interface SearchResult {
  dish: Dish
  score: number
  reasons: string[]
}

export interface MealRecord {
  id: string
  dishId: number
  servings: number
  mealType: MealType
  createdAt: string
}

export interface Deficit {
  key: keyof Nutrition
  label: string
  current: number
  target: number
  ratio: number
  suggestion: string
}
