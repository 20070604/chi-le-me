import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { getOnlineDishImage, loadOnlineDishLibrary, searchOnlineDishes, type OnlineDishIdea, type OnlineDishResult, type OnlineSearchContext } from '../lib/onlineSearch'

export function OnlineDishResults({ query, context, enabled = true, compact = false, showLibraryWhenEmpty = false, ideas }: {
  query: string
  context: OnlineSearchContext
  enabled?: boolean
  compact?: boolean
  showLibraryWhenEmpty?: boolean
  ideas?: OnlineDishIdea[]
}) {
  const [items, setItems] = useState<OnlineDishResult[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const normalized = query.trim().replace(/\s+/g, ' ')
  const ideasKey = ideas?.map((idea) => idea.name).join('|') || ''

  useEffect(() => {
    if (!enabled || normalized.length < 2) {
      setItems(enabled && showLibraryWhenEmpty ? loadOnlineDishLibrary(9) : [])
      setLoading(false)
      setFailed(false)
      return
    }

    const controller = new AbortController()
    setItems([])
    const delay = context === 'diary' || context === 'weekly' ? 220 : 20
    const timer = window.setTimeout(() => {
      setLoading(true)
      setFailed(false)
      searchOnlineDishes(normalized, context, controller.signal, ideas)
        .then((results) => setItems(results))
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setItems([])
          setFailed(true)
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, delay)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [context, enabled, ideas, ideasKey, normalized, retry, showLibraryWhenEmpty])

  if (!enabled || (normalized.length < 2 && !items.length)) return null
  const showingLibrary = normalized.length < 2

  return (
    <section className={`online-dishes ${compact ? 'online-dishes--compact' : ''}`} aria-live="polite">
      <header>
        <div><span><Icon name="sparkles" /></span><div><small>无限菜单 · AI 联网</small><strong>{loading ? '正在全网查找可靠做法' : showingLibrary ? `已缓存 ${items.length} 道联网菜谱` : '来自真实网页的更多灵感'}</strong></div></div>
        <em><i />{showingLibrary ? '本机菜库' : '实时来源'}</em>
      </header>

      {loading && !items.length && <div className="online-dishes__loading">{[0, 1, 2].map((item) => <span key={item}><i /><b /><small /></span>)}</div>}

      {!loading && failed && <button type="button" className="online-dishes__retry" onClick={() => setRetry((value) => value + 1)}><Icon name="refresh" /><span><strong>联网搜索暂时没有响应</strong><small>轻触重新搜索</small></span></button>}

      {items.length > 0 && <div className="online-dishes__grid">
        {items.map((item) => <Link to={`/recipe/${encodeURIComponent(item.id)}`} key={item.id} title={item.sourceTitle}>
          <span className="online-dishes__visual">
            <img
              src={getOnlineDishImage(item.name, item.imageUrl)}
              alt={`${item.name}菜品图片`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(event) => { event.currentTarget.src = getOnlineDishImage(item.name) }}
            />
            <small>{item.sourceSite}</small>
          </span>
          <span className="online-dishes__copy"><strong>{item.name}</strong><p>{item.summary}</p><em>在这里查看 <Icon name="chevron-right" /></em></span>
        </Link>)}
      </div>}

      {items.length > 0 && <footer><Icon name="check" />模型负责检索与归纳；食材用量、步骤以来源网页为准</footer>}
    </section>
  )
}
