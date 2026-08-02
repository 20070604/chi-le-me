export type AdvisorDepth = 'quick' | 'balanced' | 'deep'

export interface AdvisorProfileContext {
  userName?: string
  gender?: string | null
  hometown?: string | null
  goal?: string
  targetCalories?: number
  intakeCalories?: number
  recentMeals?: string[]
  favorites?: string[]
  recommendationMode?: 'standard' | 'healthy'
}

export interface AdvisorTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AdvisorRequest {
  message?: string
  depth?: AdvisorDepth
  profile?: AdvisorProfileContext
  history?: AdvisorTurn[]
}

export const advisorDepthConfig = {
  quick: { label: '灵感快答', dimensionLimit: 2 },
  balanced: { label: '均衡顾问', dimensionLimit: 4 },
  deep: { label: '深度推演', dimensionLimit: 6 },
} as const

export function resolveAdvisorDepth(requested: AdvisorDepth | undefined, message: string): AdvisorDepth {
  if (requested === 'quick' || requested === 'deep') return requested
  const complexIntent = /一周|连续|比较|权衡|综合|详细|计划|营养|减脂|增肌|血糖|过敏|预算|家庭|宴请/.test(message) || message.length > 56
  return complexIntent ? 'deep' : 'balanced'
}

export function buildAdvisorMessages(input: AdvisorRequest, depth: AdvisorDepth) {
  const history = (input.history || []).filter((turn) => turn && typeof turn.content === 'string').slice(-6)
  const mode = advisorDepthConfig[depth]

  return [
    {
      role: 'system',
      content: [
        '你是“吃了么”的味觉顾问 Skill。把用户当下需求整理成清楚、可执行的饮食方向。',
        '综合口味倾向、家乡饮食文化、营养目标、近期饮食、时间与食材可得性。性别只用于用户明确要求的营养语境，不得刻板推断口味。',
        '当 profile.recommendationMode 为 healthy 时，优先给出少油、少盐、营养均衡且做法详细的方向；standard 则兼顾完整菜谱与外卖便利性。',
        '不要读取、使用或假设任何本地菜品库。具体菜谱由独立的 GPT Mini 全网搜索链路检索，你只负责理解需求、归纳约束与解释推荐方向。',
        `当前使用“${mode.label}”，最多输出 ${mode.dimensionLimit} 个有区分度的分析维度。`,
        '只展示简洁、可核验的判断依据，不输出隐藏思维过程。涉及疾病、过敏或医学饮食时，明确提示这不是医疗诊断。',
        '不要编造用户没有提供的信息。信息不足时，在 assumptions 中明确列出假设。',
        '输出纯 JSON，不要 Markdown。',
      ].join('\n'),
    },
    ...history.map((turn) => ({ role: turn.role, content: turn.content.slice(0, 800) })),
    {
      role: 'user',
      content: JSON.stringify({
        task: '回答当前问题并给出多维摘要。answer 使用自然、克制的中文，不超过 150 字；不要声称菜品来自本地库。',
        message: input.message || '',
        profile: input.profile || {},
        output: {
          confidence: '0 到 1',
          answer: '直接回答',
          dimensions: [{ key: 'taste', label: '口味', summary: '具体依据' }],
          assumptions: ['必要时列出，最多 2 条'],
          followUps: ['用户可以继续追问的短问题，最多 3 条'],
        },
      }),
    },
  ]
}
