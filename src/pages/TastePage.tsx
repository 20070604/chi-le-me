import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { dishes, tasteTags } from '../data/dishes'
import { allHomeScenes, getMealPeriod, homeSceneLibrary, mealPeriodLabels, type HomeScene, type MealPeriod } from '../data/homeScenes'
import { searchDishes } from '../lib/recommend'
import { analyzePantryImage, analyzeTaste, type PantryAnalysisResponse } from '../lib/aiTaste'
import { loadTasteDna } from '../lib/tasteDna'
import { openDelivery } from '../lib/delivery'
import { getOnlineDishImage, searchOnlineDishes, type OnlineDishIdea, type OnlineDishResult } from '../lib/onlineSearch'
import type { Dish, RecommendationMode, SearchResult, TasteTag } from '../types'
import { Icon } from '../components/Icon'
import { AdvisorMascotButton } from '../components/AdvisorMascotButton'
import { DishCard, Sheet, Toast } from '../components/ui'

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((event: SpeechResultEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

interface SpeechResultEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string; confidence: number }
    }
  }
}

type AnalysisPhase = 'idle' | 'analyzing' | 'ready'
type OnlineSearchStatus = 'idle' | 'loading' | 'ready' | 'failed'

const tasteGlyphs: Record<TasteTag, string> = { 酸甜: '酸', 麻辣: '麻', 咸鲜: '鲜', 清淡: '清', 辣: '辣', 香: '香' }

interface HomePlayback {
  order: string[]
  cursor: number
}

const HOME_SCENE_KEY = 'flavor-compass-home-scenes-v3'

function shuffledSceneIds(scenes: HomeScene[], previous?: string) {
  const order = scenes.map((scene) => scene.id)
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[order[index], order[target]] = [order[target], order[index]]
  }
  if (previous && order[0] === previous) order.push(order.shift() as string)
  return order
}

function initialHomePlayback(period: MealPeriod, advance: boolean): HomePlayback {
  const scenes = homeSceneLibrary[period]
  const storageKey = `${HOME_SCENE_KEY}-${period}`
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as HomePlayback | null
    const valid = stored && stored.order.length === scenes.length && stored.order.every((id) => scenes.some((scene) => scene.id === id))
    if (valid) {
      if (!advance) return stored
      const nextCursor = stored.cursor + 1
      if (nextCursor < stored.order.length) return { order: stored.order, cursor: nextCursor }
      return { order: shuffledSceneIds(scenes, stored.order[stored.cursor]), cursor: 0 }
    }
  } catch { /* Start a fresh sequence when storage is unavailable or malformed. */ }
  return { order: shuffledSceneIds(scenes), cursor: 0 }
}

export function TastePage({ advanceHomeScene = false }: { advanceHomeScene?: boolean }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userName, gender, hometown, recommendationMode } = useApp()
  const [query, setQuery] = useState(() => searchParams.get('query') || '')
  const [pendingQuery, setPendingQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState<TasteTag[]>([])
  const [phase, setPhase] = useState<AnalysisPhase>('idle')
  const [analysisStep, setAnalysisStep] = useState(0)
  const [aiResults, setAiResults] = useState<SearchResult[]>()
  const [listening, setListening] = useState(false)
  const [voiceHint, setVoiceHint] = useState('说出你此刻想吃的感觉')
  const [toast, setToast] = useState('')
  const [mealPeriod] = useState<MealPeriod>(() => getMealPeriod())
  const [homePlayback] = useState<HomePlayback>(() => initialHomePlayback(mealPeriod, advanceHomeScene))
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraPreview, setCameraPreview] = useState('')
  const [cameraScanning, setCameraScanning] = useState(false)
  const [cameraAnalysis, setCameraAnalysis] = useState<PantryAnalysisResponse>()
  const [cameraIngredients, setCameraIngredients] = useState<string[]>([])
  const [onlineResults, setOnlineResults] = useState<OnlineDishResult[]>([])
  const [onlineSearchStatus, setOnlineSearchStatus] = useState<OnlineSearchStatus>('idle')
  const recognitionRef = useRef<SpeechRecognitionLike>()
  const finalTranscriptRef = useRef('')
  const voiceTimerRef = useRef<number>()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const cameraAbortRef = useRef<AbortController>()
  const onlineAbortRef = useRef<AbortController>()
  const presetHandledRef = useRef(false)
  const startOnlineSearch = useCallback((nextQuery: string, ideas?: OnlineDishIdea[], options?: { preserveResults?: boolean; excludeNames?: string[] }) => {
    const normalized = nextQuery.trim().replace(/\s+/g, ' ')
    if (normalized.length < 2) return
    const searchRequest = recommendationMode === 'healthy'
      ? `${normalized}；健康版：优先少油、少盐、营养均衡，并提供详细做法`
      : normalized
    const controller = new AbortController()
    onlineAbortRef.current?.abort()
    onlineAbortRef.current = controller
    if (!options?.preserveResults) setOnlineResults([])
    setOnlineSearchStatus('loading')
    searchOnlineDishes(searchRequest, 'home', controller.signal, ideas, {
      excludeNames: options?.excludeNames,
      refreshKey: options?.preserveResults ? String(Date.now()) : undefined,
    }).then((items) => {
      if (controller.signal.aborted) return
      setOnlineResults(items)
      setOnlineSearchStatus('ready')
      setPhase('ready')
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (!controller.signal.aborted) {
        setOnlineSearchStatus(options?.preserveResults ? 'ready' : 'failed')
        if (options?.preserveResults) setToast('这次没有找到新的菜，再试一次看看')
      }
    })
  }, [recommendationMode])
  const recommendationProfile = useMemo(() => ({ gender, hometown, recommendationMode, tasteDna: loadTasteDna() }), [gender, hometown, recommendationMode])
  const results = useMemo(() => {
    const ranked = aiResults || searchDishes(submitted, selected, recommendationProfile).slice(0, 5)
    const fallback = searchDishes('', selected, recommendationProfile)
    const merged = [...ranked]
    fallback.forEach((result) => {
      if (merged.length < 5 && !merged.some((item) => item.dish.id === result.dish.id)) merged.push(result)
    })
    return merged.slice(0, 5)
  }, [aiResults, recommendationProfile, submitted, selected])
  const insights = useMemo(() => deriveInsights(submitted, selected), [submitted, selected])
  const primaryResult = results[0]
  const onlinePrimary = onlineResults[0]
  const periodScenes = homeSceneLibrary[mealPeriod]
  const selectedHeroScene = periodScenes.find((scene) => scene.id === homePlayback.order[homePlayback.cursor]) || periodScenes[0]
  const resultHeroScene = primaryResult ? allHomeScenes.find((scene) => scene.id === `dish-${primaryResult.dish.id}`) : undefined
  const onlineHeroScene: HomeScene | undefined = onlinePrimary ? {
    id: onlinePrimary.id,
    image: getOnlineDishImage(onlinePrimary.name, onlinePrimary.imageUrl),
    imageAlt: `${onlinePrimary.name}真实菜谱图片`,
    photoCredit: onlinePrimary.sourceSite,
    photoUrl: onlinePrimary.sourceUrl,
    label: onlinePrimary.name,
    position: '50% 50%',
  } : undefined
  const activeScene = phase === 'ready' && onlineHeroScene
    ? onlineHeroScene
    : phase === 'ready' && onlineSearchStatus === 'failed' && resultHeroScene
      ? resultHeroScene
      : selectedHeroScene
  const timeContext = mealPeriodLabels[mealPeriod]

  useEffect(() => {
    try { sessionStorage.setItem(`${HOME_SCENE_KEY}-${mealPeriod}`, JSON.stringify(homePlayback)) } catch { /* Playback still works without storage. */ }
  }, [homePlayback, mealPeriod])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const controller = new AbortController()
    setAnalysisStep(0)
    const timers = [
      window.setTimeout(() => setAnalysisStep(1), 620),
      window.setTimeout(() => setAnalysisStep(2), 1240),
    ]
    analyzeTaste(pendingQuery, selected, recommendationProfile, controller.signal).then((analysis) => {
      if (!controller.signal.aborted) {
        setAiResults(analysis.results)
        setSubmitted(pendingQuery)
        setPhase('ready')
      }
    }).catch(() => undefined)
    return () => {
      controller.abort()
      timers.forEach(window.clearTimeout)
    }
  }, [pendingQuery, phase, recommendationProfile, selected])

  useEffect(() => () => {
    recognitionRef.current?.abort()
    cameraAbortRef.current?.abort()
    onlineAbortRef.current?.abort()
    if (voiceTimerRef.current) window.clearTimeout(voiceTimerRef.current)
  }, [])

  useEffect(() => () => {
    if (cameraPreview.startsWith('blob:')) URL.revokeObjectURL(cameraPreview)
  }, [cameraPreview])

  useEffect(() => {
    const preset = searchParams.get('query')?.trim()
    if (!presetHandledRef.current && preset && searchParams.get('auto') === '1') {
      presetHandledRef.current = true
      setQuery(preset)
      setPendingQuery(preset)
      setSubmitted(preset)
      setAiResults(undefined)
      setPhase('analyzing')
      startOnlineSearch(preset)
    }
  }, [searchParams, startOnlineSearch])

  const runSearch = (nextQuery = query, preparedIdeas?: OnlineDishIdea[]) => {
    const cleaned = nextQuery.trim()
    if (!cleaned && !selected.length) {
      inputRef.current?.focus()
      setToast('先告诉我一种感觉、食材或身体目标')
      return
    }
    const searchPrompt = cleaned || `想吃${selected.join('、')}口味的菜`
    setQuery(cleaned)
    setPendingQuery(searchPrompt)
    setSubmitted(searchPrompt)
    setAiResults(undefined)
    setPhase('analyzing')
    startOnlineSearch(searchPrompt, preparedIdeas)
  }

  const refreshOnlineResults = () => {
    const searchPrompt = submitted || pendingQuery || query.trim()
    if (!searchPrompt || !onlineResults.length) return
    startOnlineSearch(searchPrompt, undefined, {
      preserveResults: true,
      excludeNames: onlineResults.map((item) => item.name),
    })
  }

  const openOnlineRecipe = (item: OnlineDishResult) => navigate(`/recipe/${encodeURIComponent(item.id)}`)

  const toggleTaste = (taste: TasteTag) => {
    setAiResults(undefined)
    setSelected((current) => current.includes(taste) ? [] : [taste])
  }

  const captureAndScan = async (file: File) => {
    if (cameraPreview.startsWith('blob:')) URL.revokeObjectURL(cameraPreview)
    const preview = URL.createObjectURL(file)
    const controller = new AbortController()
    cameraAbortRef.current?.abort()
    cameraAbortRef.current = controller
    setCameraPreview(preview)
    setCameraOpen(true)
    setCameraScanning(true)
    setCameraAnalysis(undefined)
    setCameraIngredients([])
    try {
      const [analysis] = await Promise.all([
        analyzePantryImage(file, controller.signal),
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ])
      if (controller.signal.aborted) return
      setCameraAnalysis(analysis)
      setCameraIngredients(analysis.ingredients.map((item) => item.name))
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setToast('这张照片暂时无法识别，请重新拍摄')
    } finally {
      if (!controller.signal.aborted) setCameraScanning(false)
    }
  }

  const chooseCameraImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void captureAndScan(file)
  }

  const closeCamera = () => {
    cameraAbortRef.current?.abort()
    setCameraScanning(false)
    setCameraOpen(false)
  }

  const toggleCameraIngredient = (name: string) => setCameraIngredients((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])

  const useCameraIngredients = () => {
    if (!cameraIngredients.length) return
    const nextQuery = `${cameraIngredients.join('、')}，帮我搭配一顿营养均衡的饭`
    setCameraOpen(false)
    runSearch(nextQuery, cameraAnalysis?.recipeIdeas)
  }

  const startVoice = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setToast('此浏览器暂不支持语音识别，文字输入仍可完整体验')
      inputRef.current?.focus()
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 3
    finalTranscriptRef.current = ''
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setListening(true)
      setVoiceHint('正在听 · 说完后会自动分析')
      voiceTimerRef.current = window.setTimeout(() => recognition.stop(), 8000)
    }

    recognition.onresult = (event) => {
      let interim = ''
      let final = finalTranscriptRef.current
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript
        if (event.results[index].isFinal) final += transcript
        else interim += transcript
      }
      finalTranscriptRef.current = final
      setQuery((final + interim).trim())
      setVoiceHint(interim ? `识别中：“${interim.trim()}”` : '已听见，正在确认…')
    }

    recognition.onerror = ({ error }) => {
      const messages: Record<string, string> = {
        'not-allowed': '需要麦克风权限；也可以直接输入文字',
        'no-speech': '没有听到声音，请靠近麦克风再试一次',
        network: '语音服务暂时不可用，文字输入不受影响',
        'audio-capture': '没有检测到可用麦克风',
        'language-not-supported': '当前环境暂不支持中文识别',
      }
      setToast(messages[error] || '这次没听清，请再试一次')
      setVoiceHint('语音未完成 · 可以直接键入')
      setListening(false)
    }

    recognition.onend = () => {
      if (voiceTimerRef.current) window.clearTimeout(voiceTimerRef.current)
      setListening(false)
      const transcript = finalTranscriptRef.current.trim()
      if (transcript) {
        setVoiceHint('识别完成 · 正在生成味觉向量')
        runSearch(transcript)
      } else {
        setVoiceHint('说出你此刻想吃的感觉')
      }
    }

    try {
      recognition.start()
    } catch {
      setToast('语音正在启动，请稍后再试')
    }
  }

  return (
    <main className={`page taste-page flagship-home is-${phase}`}>
      <section className="flagship-hero" aria-label="今日寻味">
        <img key={activeScene.id} className="flagship-hero__image" src={activeScene.image} alt={activeScene.imageAlt} style={{ objectPosition: activeScene.position }} referrerPolicy="no-referrer" />
        <span className="flagship-hero__scrim" aria-hidden="true" />

        <header className="flagship-topbar">
          <div className="flagship-wordmark"><strong>吃了么</strong><small>CHI LE ME</small></div>
          <AdvisorMascotButton onActivate={() => navigate('/advisor')} />
        </header>

        <div className="flagship-hero__copy">
          {phase === 'idle' && <>
            <span>{timeContext} · 嗨，{userName}</span>
            <h1>今天，<br />你吃了吗？</h1>
          </>}
          {phase === 'analyzing' && <AnalysisExperience query={pendingQuery || selected.join('、')} step={analysisStep} />}
          {phase === 'ready' && onlineSearchStatus === 'loading' && !onlinePrimary && <OnlineSearchExperience query={pendingQuery} />}
          {phase === 'ready' && onlinePrimary && <>
            <span>此刻，为你挑中</span>
            <h1>{onlinePrimary.name}</h1>
            <p>{onlinePrimary.summary}</p>
            <button className="flagship-answer-link" onClick={() => openOnlineRecipe(onlinePrimary)}>查看完整菜谱 <Icon name="chevron-right" /></button>
          </>}
          {phase === 'ready' && onlineSearchStatus === 'failed' && primaryResult && <>
            <span>网络暂不可用 · 先看缓存</span>
            <h1>{primaryResult.dish.name}</h1>
            <p>{primaryResult.dish.subtitle}</p>
            <button className="flagship-answer-link" onClick={() => navigate(`/dish/${primaryResult.dish.id}`)}>查看缓存菜谱 <Icon name="chevron-right" /></button>
          </>}
        </div>

        <form className={`flagship-composer ${listening ? 'is-listening' : ''}`} onSubmit={(event) => { event.preventDefault(); runSearch() }}>
          <button type="button" className="flagship-composer__tool" onClick={() => cameraInputRef.current?.click()} aria-label="打开相机识别食材"><Icon name="camera" /></button>
          <label className="flagship-composer__field">
            <span className="sr-only">描述你想吃的口味、食材或目标</span>
            <textarea ref={inputRef} rows={1} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="说说你此刻想吃什么" />
            {query && <button type="button" className="flagship-composer__clear" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="清空输入"><Icon name="close" /></button>}
          </label>
          <button type="button" className={`flagship-composer__tool ${listening ? 'is-active' : ''}`} onClick={startVoice} aria-label={listening ? '结束聆听' : '语音输入'} aria-pressed={listening}><Icon name="mic" /></button>
          <button className="flagship-composer__send" type="submit" aria-label="搜索菜品" disabled={phase === 'analyzing'}><Icon name="search" /></button>
        </form>
        <input ref={cameraInputRef} className="home-camera-input" type="file" accept="image/*" capture="environment" onChange={chooseCameraImage} aria-label="拍摄或选择食材照片" />
        {listening && <div className="flagship-voice-status" role="status" aria-live="polite"><i /><span>{voiceHint}</span></div>}
      </section>

      <section className="flagship-drawer">
        <span className="flagship-drawer__handle" aria-hidden="true" />

        {phase !== 'idle' && onlineSearchStatus === 'loading' && !onlinePrimary && <OnlineRecommendationLoading query={pendingQuery} />}

        {phase === 'ready' && onlinePrimary && <OnlineRecommendation items={onlineResults} insights={insights} refreshing={onlineSearchStatus === 'loading'} onRefresh={refreshOnlineResults} onSelect={openOnlineRecipe} />}

        {phase === 'ready' && onlineSearchStatus === 'failed' && primaryResult && <section className="flagship-recommendations" id="taste-results">
          <div className="flagship-section-heading"><div><span>离线缓存参考</span><h2>先吃这一道</h2></div><small>{Math.round(primaryResult.score * 100)}% 合拍</small></div>
          <p className="flagship-offline-note">联网菜谱暂时没有响应，这道菜来自设备缓存，可稍后重新搜索。</p>
          <div className="flagship-reasons"><span>因为你提到</span>{insights.map((item) => <strong key={item}>{item}</strong>)}</div>
          <DishCard result={primaryResult} onDelivery={openDelivery} />
        </section>}

        <section className="flagship-taste-tuner" aria-label="口味偏好">
          <div className="flagship-section-heading"><div><span>口味偏好</span><h2>更具体一点</h2></div>{selected.length > 0 && <small>已选 {selected.length} 个</small>}</div>
          <div className="flagship-taste-chips">
            {tasteTags.map((taste) => <button type="button" className={selected.includes(taste) ? 'is-active' : ''} onClick={() => toggleTaste(taste)} aria-pressed={selected.includes(taste)} key={taste}><i>{tasteGlyphs[taste]}</i>{taste}</button>)}
          </div>
        </section>

        {phase !== 'ready' && primaryResult && <section className="flagship-recommendations" id="taste-results">
          <div className="flagship-section-heading"><div><span>今日灵感</span><h2>认真吃顿好的</h2></div></div>
          <p className="flagship-intro">从真实菜品中，挑出此刻值得吃的一道。</p>
          <DishCard result={primaryResult} onDelivery={openDelivery} />
          <div className="flagship-alternatives">
            {results.slice(1, 4).map((result) => <button type="button" onClick={() => navigate(`/dish/${result.dish.id}`)} key={result.dish.id}>
              <img src={result.dish.image} alt="" loading="lazy" style={{ objectFit: result.dish.imageFit || 'cover', objectPosition: result.dish.imagePosition || '50% 50%', backgroundColor: result.dish.accent }} />
              <span><strong>{result.dish.name}</strong><small>{result.dish.region} · {result.dish.time} 分钟</small></span>
              <Icon name="chevron-right" />
            </button>)}
          </div>
        </section>}

        <MysteryDishBox mode={recommendationMode} onSelect={(dishId) => navigate(`/dish/${dishId}`)} />
      </section>

      <Sheet open={cameraOpen} title="识别这张照片" onClose={closeCamera}>
        <div className="home-camera-sheet">
          <div className="home-camera-preview">
            {cameraPreview && <img src={cameraPreview} alt="刚刚拍摄的食材照片" />}
            {cameraScanning && <div className="home-camera-scanning" role="status" aria-live="polite"><span><Icon name="scan" /></span><strong>正在识别食材</strong><small>检查画面 · 匹配食材</small></div>}
          </div>
          {cameraAnalysis && !cameraScanning && <>
            <div className="home-camera-heading"><div><span><i />识别完成</span><strong>确认照片里的食材</strong></div><small>点击可删除误识别项</small></div>
            <div className="home-camera-ingredients">
              {cameraAnalysis.ingredients.map((item) => <button type="button" className={cameraIngredients.includes(item.name) ? 'is-active' : ''} onClick={() => toggleCameraIngredient(item.name)} aria-pressed={cameraIngredients.includes(item.name)} key={item.name}><span>{cameraIngredients.includes(item.name) ? <Icon name="check" /> : <Icon name="plus" />}</span><strong>{item.name}</strong><small>{Math.round(item.confidence * 100)}%</small></button>)}
            </div>
          </>}
          <div className="home-camera-actions">
            <button type="button" onClick={() => cameraInputRef.current?.click()}><Icon name="camera" /> 重新拍摄</button>
            <button type="button" className="is-primary" disabled={cameraScanning || !cameraIngredients.length} onClick={useCameraIngredients}>用这些食材找菜 <Icon name="chevron-right" /></button>
          </div>
        </div>
      </Sheet>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </main>
  )
}

type MysteryBoxPhase = 'closed' | 'opening' | 'revealed'

function MysteryDishBox({ mode, onSelect }: { mode: RecommendationMode; onSelect: (dishId: number) => void }) {
  const [phase, setPhase] = useState<MysteryBoxPhase>('closed')
  const [dish, setDish] = useState<Dish | null>(null)
  const revealTimerRef = useRef<number>()
  const pool = useMemo(
    () => mode === 'healthy'
      ? dishes.filter((item) => item.nutrition.calories <= 470 && item.nutrition.fat <= 20)
      : dishes,
    [mode],
  )

  useEffect(() => () => {
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current)
  }, [])

  const openBox = () => {
    if (phase === 'opening') return
    const candidates = pool.filter((item) => item.id !== dish?.id)
    const nextPool = candidates.length ? candidates : pool
    const nextDish = nextPool[Math.floor(Math.random() * nextPool.length)]
    if (!nextDish) return
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current)
    setPhase('opening')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    revealTimerRef.current = window.setTimeout(() => {
      setDish(nextDish)
      setPhase('revealed')
    }, reducedMotion ? 80 : 1_420)
  }

  return (
    <section className={`home-mystery-box is-${phase}`} aria-labelledby="home-mystery-title">
      <header className="home-mystery-box__heading">
        <div><span>不知道吃什么？</span><h2 id="home-mystery-title">拆一份今日盲盒</h2></div>
        <small>{mode === 'healthy' ? '健康版' : '普通版'}</small>
      </header>
      <p className="home-mystery-box__intro">不分析，不纠结，只给这一餐一个答案。</p>

      <div className="home-mystery-box__stage" aria-live="polite" aria-busy={phase === 'opening'}>
        {phase !== 'revealed' || !dish ? (
          <button type="button" className="home-mystery-box__trigger" onClick={openBox} disabled={phase === 'opening'}>
            <span className="home-mystery-box__aura" aria-hidden="true" />
            <span className="home-mystery-box__object" aria-hidden="true">
              <i className="home-mystery-box__lid"><b>?</b></i>
              <i className="home-mystery-box__body"><b>CHI LE ME</b></i>
              <em /><em /><em />
            </span>
            <strong>{phase === 'opening' ? '正在拆开…' : '点击开启'}</strong>
            <small>{phase === 'opening' ? '摇一摇，答案马上出现' : '每次只给一个答案'}</small>
          </button>
        ) : (
          <article className="home-mystery-result">
            <div className="home-mystery-result__visual">
              <img src={dish.image} alt={`${dish.name}盲盒结果`} style={{ objectFit: dish.imageFit || 'cover', objectPosition: dish.imagePosition || '50% 50%', backgroundColor: dish.accent }} />
              <span><i />今日手气</span>
            </div>
            <div className="home-mystery-result__copy">
              <small>盲盒为你选中</small>
              <h3>{dish.name}</h3>
              <p>{dish.subtitle}</p>
              <div><span>{dish.region}</span><span>{dish.time} 分钟</span><span>{dish.nutrition.calories} kcal</span></div>
            </div>
            <footer>
              <button type="button" className="is-primary" onClick={() => onSelect(dish.id)}>查看菜谱 <Icon name="chevron-right" /></button>
              <button type="button" onClick={openBox}><Icon name="refresh" /> 再抽一次</button>
            </footer>
          </article>
        )}
      </div>
    </section>
  )
}

function OnlineSearchExperience({ query }: { query: string }) {
  return (
    <div className="flagship-thinking" role="status" aria-live="polite">
      <span>正在联网寻味</span>
      <h1>从真实菜谱里找答案</h1>
      <p>“{query || '你此刻想吃的东西'}”</p>
      <div aria-hidden="true"><i /><i /><i /></div>
    </div>
  )
}

function OnlineRecommendationLoading({ query }: { query: string }) {
  return (
    <section className="flagship-recommendations flagship-online-loading" id="taste-results" role="status" aria-live="polite">
      <div className="flagship-section-heading"><div><span>AI 联网搜索</span><h2>正在找真正合适的菜</h2></div><small>实时检索</small></div>
      <p>正在理解“{query}”，并核对真实菜谱与图片。</p>
      <div className="flagship-online-loading__card" aria-hidden="true"><i /><span><b /><small /><small /></span></div>
    </section>
  )
}

function OnlineRecommendation({ items, insights, refreshing, onRefresh, onSelect }: {
  items: OnlineDishResult[]
  insights: string[]
  refreshing: boolean
  onRefresh: () => void
  onSelect: (item: OnlineDishResult) => void
}) {
  const primary = items[0]
  return (
    <section className="flagship-recommendations flagship-online-answer" id="taste-results">
      <div className="flagship-section-heading flagship-online-heading"><div><span>今日答案</span><h2>先吃这一道</h2></div><button type="button" className={`flagship-answer-refresh ${refreshing ? 'is-refreshing' : ''}`} onClick={onRefresh} disabled={refreshing} aria-label="换一批不重复的菜"><Icon name="refresh" /></button></div>
      <div className="flagship-reasons"><span>因为你提到</span>{insights.map((item) => <strong key={item}>{item}</strong>)}</div>

      <article className="flagship-online-primary">
        <button type="button" className="flagship-online-primary__visual" onClick={() => onSelect(primary)} aria-label={`在应用内查看${primary.name}菜谱`}>
          <img
            src={getOnlineDishImage(primary.name, primary.imageUrl)}
            alt={`${primary.name}菜品图片`}
            referrerPolicy="no-referrer"
            onError={(event) => { event.currentTarget.src = getOnlineDishImage(primary.name) }}
          />
          <small><i /> 来自 {primary.sourceSite}</small>
        </button>
        <div className="flagship-online-primary__body">
          <span className="flagship-online-badge"><Icon name="sparkles" /> 智能搜索结果</span>
          <h3>{primary.name}</h3>
          <p>{primary.summary}</p>
          <div className="flagship-online-source"><small>真实来源</small><strong>{primary.sourceTitle}</strong></div>
          <button type="button" className="flagship-online-primary__action" onClick={() => onSelect(primary)}>在这里查看食材与步骤 <Icon name="chevron-right" /></button>
        </div>
      </article>

      {items.length > 1 && <div className="flagship-online-alternatives">
        <div className="flagship-section-heading"><div><span>换个口味</span><h2>另外几道也不错</h2></div></div>
        <div>
          {items.slice(1, 4).map((item) => <button type="button" onClick={() => onSelect(item)} key={item.id} aria-label={`在应用内查看${item.name}菜谱`}>
            <span className="flagship-online-alternatives__visual">
              <img
                src={getOnlineDishImage(item.name, item.imageUrl)}
                alt={`${item.name}菜品图片`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(event) => { event.currentTarget.src = getOnlineDishImage(item.name) }}
              />
            </span>
            <span><strong>{item.name}</strong><small>{item.sourceSite} · {item.summary}</small></span>
            <Icon name="chevron-right" />
          </button>)}
        </div>
      </div>}
      <footer className="flagship-online-disclosure"><Icon name="check" />结果由模型检索并归纳，食材用量与步骤以来源网页为准</footer>
    </section>
  )
}

function AnalysisExperience({ query, step }: { query: string; step: number }) {
  const messages = ['正在听你的口味', '正在对照今天的状态', '正在挑出最合适的一道']
  return (
    <div className="flagship-thinking" role="status" aria-live="polite">
      <span>稍等一下</span>
      <h1>{messages[step] || messages[0]}</h1>
      <p>“{query || '你的口味偏好'}”</p>
      <div aria-hidden="true"><i /><i /><i /></div>
    </div>
  )
}

function deriveInsights(query: string, selected: TasteTag[]) {
  const found = new Set<string>(selected)
  const rules: [RegExp, string][] = [
    [/高蛋白|蛋白质/, '高蛋白'], [/少油|低脂|清爽/, '轻油'], [/鸡|鸡胸/, '鸡肉'], [/鱼|海鲜/, '鱼鲜'],
    [/酸/, '酸香'], [/辣|麻/, '微刺激'], [/蔬菜|纤维/, '多蔬菜'], [/饱腹/, '高饱腹'],
  ]
  rules.forEach(([pattern, label]) => pattern.test(query) && found.add(label))
  if (!found.size) ['均衡', '当季', '好执行'].forEach((item) => found.add(item))
  return Array.from(found).slice(0, 4)
}
