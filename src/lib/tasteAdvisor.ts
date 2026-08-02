export type AdvisorDepth = 'quick' | 'balanced' | 'deep'

export interface AdvisorTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AdvisorProfileContext {
  userName: string
  gender: string | null
  hometown: string | null
  goal: string
  targetCalories: number
  intakeCalories: number
  recentMeals: string[]
  favorites: string[]
  recommendationMode: 'standard' | 'healthy'
}

export interface AdvisorResponse {
  answer: string
  dimensions: Array<{ key: string; label: string; summary: string }>
  assumptions: string[]
  followUps: string[]
  depth: AdvisorDepth
  modeLabel: string
  confidence: number
  latencyMs: number
}

export async function askTasteAdvisor(input: {
  message: string
  depth: AdvisorDepth
  profile: AdvisorProfileContext
  history: AdvisorTurn[]
}, signal?: AbortSignal) {
  const endpoint = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, '') || ''
  const response = await fetch(`${endpoint}/api/advisor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  if (!response.ok) throw new Error(`味觉顾问暂时没有响应（${response.status}）`)
  return response.json() as Promise<AdvisorResponse>
}
