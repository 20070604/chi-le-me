import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { AdvisorMascotMedia } from '../components/AdvisorMascotButton'
import { useApp } from '../context/AppContext'
import { getDish, nutritionGoals } from '../data/dishes'
import { getOnlineDishImage, searchOnlineDishes, type OnlineDishResult } from '../lib/onlineSearch'
import { askTasteAdvisor, type AdvisorResponse, type AdvisorTurn } from '../lib/tasteAdvisor'

interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: AdvisorResponse
  onlineItems?: OnlineDishResult[]
  onlineLoading?: boolean
  failed?: boolean
}

export function AdvisorPage() {
  const navigate = useNavigate()
  const { userName, gender, hometown, recommendationMode, goal, records, intake, target, favorites } = useApp()
  const [draft, setDraft] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const profile = useMemo(() => ({
    userName,
    gender,
    hometown: hometown ? [hometown.provinceName, hometown.cityName, hometown.areaName].filter(Boolean).join(' · ') : null,
    goal: nutritionGoals[goal].name,
    targetCalories: target.calories,
    intakeCalories: Math.round(intake.calories),
    recentMeals: records.slice(-6).flatMap((record) => {
      const dish = getDish(record.dishId)
      return dish ? [dish.name] : []
    }),
    favorites: favorites.flatMap((dishId) => {
      const dish = getDish(dishId)
      return dish ? [dish.name] : []
    }).slice(0, 8),
    recommendationMode,
  }), [favorites, gender, goal, hometown, intake.calories, recommendationMode, records, target.calories, userName])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries, loading])

  useEffect(() => () => controllerRef.current?.abort(), [])

  const submit = async (message = draft) => {
    const normalized = message.trim().replace(/\s+/g, ' ').slice(0, 500)
    if (normalized.length < 2 || loading) return
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    const assistantId = `assistant-${Date.now()}`
    const userEntry: ChatEntry = { id: `user-${Date.now()}`, role: 'user', text: normalized }
    const history: AdvisorTurn[] = entries.slice(-6).map((entry) => ({ role: entry.role, content: entry.text }))
    setEntries((current) => [...current, userEntry])
    setDraft('')
    setLoading(true)

    // GPT Mini plans and verifies the web menu while DeepSeek writes the concise conversational answer.
    const onlineQuery = recommendationMode === 'healthy'
      ? `${normalized}；健康版：优先少油、少盐、营养均衡，并提供详细做法`
      : normalized
    const onlinePromise = searchOnlineDishes(onlineQuery, 'home', controller.signal, undefined, { refreshKey: assistantId })

    try {
      const response = await askTasteAdvisor({ message: normalized, depth: 'quick', profile, history }, controller.signal)
      setEntries((current) => [...current, {
        id: assistantId,
        role: 'assistant',
        text: response.answer,
        response,
        onlineLoading: true,
      }])
      setLoading(false)

      const onlineItems = await onlinePromise
      setEntries((current) => current.map((entry) => entry.id === assistantId ? { ...entry, onlineItems, onlineLoading: false } : entry))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      try {
        const onlineItems = await onlinePromise
        setEntries((current) => [...current, {
          id: assistantId,
          role: 'assistant',
          text: '我已经按你的要求从全网筛选了几道真实菜谱，可以直接打开查看完整做法。',
          onlineItems,
          onlineLoading: false,
        }])
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === 'AbortError') return
        setEntries((current) => [...current, {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: '全网菜谱搜索暂时没有响应。你的问题已经保留，可以直接重试。',
          failed: true,
        }])
      }
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <main className="page advisor-page">
      <header className="advisor-topbar">
        <button type="button" onClick={() => navigate(-1)} aria-label="返回"><Icon name="arrow-left" /></button>
        <div><strong>味觉顾问</strong><span><i />全网检索 · 在线</span></div>
        <AdvisorMascotMedia className="advisor-topbar__mascot" />
      </header>

      {entries.length === 0 && <section className="advisor-welcome">
        <span>今天，想吃点什么？</span>
        <h1>一句话就好，<br />其余交给我。</h1>
        <p>你的问题会交给 GPT Mini 从全网寻找真实菜谱，不受本地菜单限制。</p>
      </section>}

      <section className="advisor-thread" aria-live="polite" aria-busy={loading}>
        {entries.map((entry) => entry.role === 'user'
          ? <article className="advisor-message advisor-message--user" key={entry.id}><p>{entry.text}</p></article>
          : <AdvisorAnswer entry={entry} onFollowUp={(question) => void submit(question)} key={entry.id} />)}

        {loading && <article className="advisor-message advisor-message--assistant advisor-message--thinking">
          <header><span><Icon name="sparkles" /></span><small>正在理解需求并搜索全网</small></header>
          <div><i /><i /><i /></div>
          <p>正在查找真实菜谱与可执行做法…</p>
        </article>}
        <div ref={endRef} />
      </section>

      {entries.length === 0 && <section className="advisor-starters" aria-label="快捷提问">
        {['晚饭想吃得清爽一点', '家里只有鸡蛋和番茄', '按我今天的营养缺口推荐'].map((prompt) => <button type="button" onClick={() => void submit(prompt)} key={prompt}>{prompt}<Icon name="chevron-right" /></button>)}
      </section>}

      <form className="advisor-composer" onSubmit={handleSubmit}>
        <label htmlFor="advisor-input">继续问味觉顾问</label>
        <div>
          <textarea id="advisor-input" rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="说说你现在想吃什么…" maxLength={500} />
          <button type="submit" disabled={draft.trim().length < 2 || loading} aria-label="发送"><Icon name="send" /></button>
        </div>
        <p>菜品来自全网真实网页；营养与健康决定仍由你确认。</p>
      </form>
    </main>
  )
}

function AdvisorAnswer({ entry, onFollowUp }: { entry: ChatEntry; onFollowUp: (question: string) => void }) {
  const response = entry.response

  return (
    <article className={`advisor-message advisor-message--assistant ${entry.failed ? 'is-failed' : ''}`}>
      <header>
        <span><Icon name="sparkles" /></span>
        <div><small>味觉顾问</small>{response && <em>AI 建议</em>}</div>
      </header>
      <p>{entry.text}</p>

      {(entry.onlineLoading || (entry.onlineItems && entry.onlineItems.length > 0)) && <section className="advisor-dish-results" aria-label="推荐菜品">
        {entry.onlineLoading
          ? <div className="advisor-dish-loading"><i /><i /><i /></div>
          : <div className="advisor-dish-list">{entry.onlineItems?.slice(0, 5).map((item) => <Link className="advisor-dish-card" to={`/recipe/${encodeURIComponent(item.id)}`} key={item.id}>
            <span className="advisor-dish-card__visual"><img src={getOnlineDishImage(item.name, item.imageUrl)} alt={`${item.name}菜品图片`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getOnlineDishImage(item.name) }} /></span>
            <span className="advisor-dish-card__copy"><strong>{item.name}</strong><p>{item.summary}</p><small>查看食材与做法</small></span>
            <span className="advisor-dish-card__action" aria-hidden="true"><Icon name="chevron-right" /></span>
          </Link>)}</div>}
      </section>}

      {response && response.followUps.length > 0 && <footer className="advisor-followups">
        {response.followUps.map((question) => <button type="button" onClick={() => onFollowUp(question)} key={question}>{question}</button>)}
      </footer>}
    </article>
  )
}
