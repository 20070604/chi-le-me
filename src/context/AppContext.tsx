import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { getDish, nutritionGoals } from '../data/dishes'
import { calculateDeficits } from '../lib/recommend'
import type { GenderPreference, GoalId, HometownSelection, MealRecord, MealType, Nutrition, RecommendationMode } from '../types'

interface AppState {
  records: MealRecord[]
  goal: GoalId
  userName: string
  gender: GenderPreference | null
  hometown: HometownSelection | null
  recommendationMode: RecommendationMode
  favorites: number[]
}

type Action =
  | { type: 'ADD'; record: MealRecord }
  | { type: 'REMOVE'; id: string }
  | { type: 'SERVINGS'; id: string; servings: number }
  | { type: 'GOAL'; goal: GoalId }
  | { type: 'NAME'; userName: string }
  | { type: 'PROFILE'; userName: string; gender: GenderPreference | null; hometown: HometownSelection | null; recommendationMode: RecommendationMode }
  | { type: 'FAVORITE'; dishId: number }
  | { type: 'RESET' }

interface AppContextValue extends AppState {
  intake: Nutrition
  target: Nutrition
  deficits: ReturnType<typeof calculateDeficits>
  addRecord: (dishId: number, mealType: MealType, servings?: number, recordDate?: string) => void
  removeRecord: (id: string) => void
  updateServings: (id: string, servings: number) => void
  setGoal: (goal: GoalId) => void
  setUserName: (userName: string) => void
  updateProfile: (profile: { userName: string; gender: GenderPreference | null; hometown: HometownSelection | null; recommendationMode: RecommendationMode }) => void
  toggleFavorite: (dishId: number) => void
  resetData: () => void
}

const storageKey = 'flavor-compass-state-v1'

function localDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function seedRecords(): MealRecord[] {
  const now = new Date().toISOString()
  return [
    { id: 'seed-breakfast', dishId: 107, servings: 0.7, mealType: 'breakfast', createdAt: now },
    { id: 'seed-lunch', dishId: 102, servings: 1, mealType: 'lunch', createdAt: now },
  ]
}

const genderValues: GenderPreference[] = ['male', 'female', 'private']

function parseHometown(value: unknown): HometownSelection | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<HometownSelection>
  if (![candidate.provinceCode, candidate.provinceName, candidate.cityCode, candidate.cityName].every((item) => typeof item === 'string' && item.trim())) return null
  return {
    provinceCode: candidate.provinceCode as string,
    provinceName: candidate.provinceName as string,
    cityCode: candidate.cityCode as string,
    cityName: candidate.cityName as string,
    areaCode: typeof candidate.areaCode === 'string' ? candidate.areaCode : undefined,
    areaName: typeof candidate.areaName === 'string' ? candidate.areaName : undefined,
  }
}

function initialState(): AppState {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppState>
      return {
        records: Array.isArray(parsed.records) ? parsed.records : seedRecords(),
        goal: parsed.goal && parsed.goal in nutritionGoals ? parsed.goal : 'maintain',
        userName: typeof parsed.userName === 'string' && parsed.userName.trim() ? parsed.userName.trim().slice(0, 12) : '小味',
        gender: parsed.gender && genderValues.includes(parsed.gender) ? parsed.gender : null,
        hometown: parseHometown(parsed.hometown),
        recommendationMode: parsed.recommendationMode === 'healthy' ? 'healthy' : 'standard',
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((id): id is number => typeof id === 'number') : [],
      }
    }
  } catch {
    // Keep the demo usable when storage is disabled.
  }
  return { records: seedRecords(), goal: 'maintain', userName: '小味', gender: null, hometown: null, recommendationMode: 'standard', favorites: [] }
}

function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'ADD') return { ...state, records: [...state.records, action.record] }
  if (action.type === 'REMOVE') return { ...state, records: state.records.filter((record) => record.id !== action.id) }
  if (action.type === 'SERVINGS') {
    return {
      ...state,
      records: state.records.map((record) =>
        record.id === action.id ? { ...record, servings: Math.max(0.25, action.servings) } : record,
      ),
    }
  }
  if (action.type === 'GOAL') return { ...state, goal: action.goal }
  if (action.type === 'NAME') return { ...state, userName: action.userName.trim().slice(0, 12) }
  if (action.type === 'PROFILE') {
    return {
      ...state,
      userName: action.userName.trim().slice(0, 12),
      gender: action.gender,
      hometown: action.hometown,
      recommendationMode: action.recommendationMode,
    }
  }
  if (action.type === 'FAVORITE') {
    return {
      ...state,
      favorites: state.favorites.includes(action.dishId)
        ? state.favorites.filter((id) => id !== action.dishId)
        : [...state.favorites, action.dishId],
    }
  }
  if (action.type === 'RESET') return { records: seedRecords(), goal: 'maintain', userName: '小味', gender: null, hometown: null, recommendationMode: 'standard', favorites: [] }
  return state
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const target = nutritionGoals[state.goal].target
  const intake = useMemo(() => {
    const today = localDateKey(new Date())
    return state.records.reduce<Nutrition>(
        (total, record) => {
          if (localDateKey(new Date(record.createdAt)) !== today) return total
          const dish = getDish(record.dishId)
          if (!dish) return total
          ;(Object.keys(total) as (keyof Nutrition)[]).forEach((key) => {
            total[key] += dish.nutrition[key] * record.servings
          })
          return total
        },
        { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
      )
  }, [state.records])

  const value: AppContextValue = {
    ...state,
    intake,
    target,
    deficits: calculateDeficits(intake, target),
    addRecord: (dishId, mealType, servings = 1, recordDate) =>
      dispatch({
        type: 'ADD',
        record: {
          id: `${Date.now()}-${dishId}`,
          dishId,
          mealType,
          servings,
          createdAt: recordDate ? new Date(`${recordDate}T12:00:00`).toISOString() : new Date().toISOString(),
        },
      }),
    removeRecord: (id) => dispatch({ type: 'REMOVE', id }),
    updateServings: (id, servings) => dispatch({ type: 'SERVINGS', id, servings }),
    setGoal: (goal) => dispatch({ type: 'GOAL', goal }),
    setUserName: (userName) => dispatch({ type: 'NAME', userName }),
    updateProfile: ({ userName, gender, hometown, recommendationMode }) => dispatch({ type: 'PROFILE', userName, gender, hometown, recommendationMode }),
    toggleFavorite: (dishId) => dispatch({ type: 'FAVORITE', dishId }),
    resetData: () => dispatch({ type: 'RESET' }),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
