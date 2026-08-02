import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { OnlineDishResults } from '../components/OnlineDishResults'
import { Sheet, Toast } from '../components/ui'
import { useApp } from '../context/AppContext'
import { dishes, getDish, mealLabels } from '../data/dishes'
import {
  addPantryNames,
  activeCookStorageKey,
  loadKitchenPantry,
  loadKitchenPreferences,
  rankKitchenDishes,
  resetTasteMemory,
  saveKitchenPantry,
  saveKitchenPreferences,
  tasteMemorySummary,
  type KitchenPantryItem,
  type KitchenPreferences,
  type KitchenRecommendation,
} from '../lib/kitchen'
import { loadTasteDna } from '../lib/tasteDna'
import { analyzePantryImage } from '../lib/aiTaste'
import type { OnlineDishIdea } from '../lib/onlineSearch'
import type { Dish, MealType, Nutrition, RecommendationProfile } from '../types'

type KitchenMode = 'today' | 'plan'
type TodaySheet = 'manual' | 'manage' | 'conditions' | 'schedule' | null

const planStorageKey = 'flavor-compass-meal-plans-v2'
const shoppingStorageKey = 'flavor-compass-shopping-overrides-v1'
const planMeals: MealType[] = ['breakfast', 'lunch', 'dinner']
const mealTimes = ['08:00', '12:30', '18:30']
const defaultMealPlans = [
  [107, 102, 201],
  [108, 101, 104],
  [107, 103, 105],
  [108, 106, 101],
  [107, 102, 104],
  [108, 201, 105],
  [107, 103, 106],
]

type ShoppingOverrides = { custom: string[]; removed: string[] }

function loadShoppingOverrides(): ShoppingOverrides {
  try {
    const stored = JSON.parse(localStorage.getItem(shoppingStorageKey) || '{}') as Partial<ShoppingOverrides>
    return {
      custom: Array.isArray(stored.custom) ? stored.custom.filter((item): item is string => typeof item === 'string') : [],
      removed: Array.isArray(stored.removed) ? stored.removed.filter((item): item is string => typeof item === 'string') : [],
    }
  } catch {
    return { custom: [], removed: [] }
  }
}

function localDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`)
}

function formatPlanDate(key: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(dateFromKey(key))
}

function sameIngredient(left: string, right: string) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('zh-CN').replace(/[\s、，,。；;]+/g, '')
  const a = normalize(left)
  const b = normalize(right)
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}

function loadPlans() {
  try {
    const stored = JSON.parse(localStorage.getItem(planStorageKey) || '{}') as Record<string, number[]>
    return stored && typeof stored === 'object' ? stored : {}
  } catch {
    return {}
  }
}

function mealMoment() {
  const hour = new Date().getHours()
  if (hour < 10) return { label: '早餐时间', greeting: '清醒地开始今天', dish: getDish(107) || dishes[0] }
  if (hour < 15) return { label: '午餐时间', greeting: '把午餐做得刚刚好', dish: getDish(102) || dishes[0] }
  return { label: '晚餐时间', greeting: '今晚，从现有食材开始', dish: getDish(104) || dishes[0] }
}

export function StudioPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requestedMode = params.get('mode')
  const mode: KitchenMode = requestedMode === 'plan' ? 'plan' : 'today'
  const [pantry, setPantry] = useState<KitchenPantryItem[]>(loadKitchenPantry)
  const [plans, setPlans] = useState<Record<string, number[]>>(loadPlans)
  const planDates = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today)
      date.setDate(today.getDate() + offset)
      return localDateKey(date)
    })
  }, [])
  const moment = useMemo(mealMoment, [])

  useEffect(() => {
    if (requestedMode && requestedMode !== 'today' && requestedMode !== 'plan') navigate('/studio?mode=today', { replace: true })
  }, [navigate, requestedMode])

  useEffect(() => saveKitchenPantry(pantry), [pantry])
  useEffect(() => localStorage.setItem(planStorageKey, JSON.stringify(plans)), [plans])

  const changeMode = (next: KitchenMode) => {
    navigate(`/studio?mode=${next}`, { replace: true })
    requestAnimationFrame(() => document.querySelector('.kitchen-mode-nav')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
  }

  return (
    <main className="page studio-page kitchen-page">
      <section className="kitchen-hero">
        <img src={moment.dish.image} alt={moment.dish.imageAlt} style={{ objectFit: moment.dish.imageFit || 'cover', objectPosition: moment.dish.imagePosition || '50% 50%', backgroundColor: moment.dish.accent }} />
        <div className="kitchen-hero__shade" />
        <header><div><strong>吃了么</strong><span>厨房</span></div></header>
        <div className="kitchen-hero__copy"><span>{moment.label}</span><h1>{moment.greeting}</h1></div>
        <div className="kitchen-hero__foot"><span><Icon name="clock" />约 {moment.dish.time} 分钟灵感</span><small>{moment.dish.photoCredit}</small></div>
      </section>

      <nav className="kitchen-mode-nav" aria-label="厨房模式">
        <button type="button" className={mode === 'today' ? 'is-active' : ''} onClick={() => changeMode('today')} aria-pressed={mode === 'today'}><Icon name="chef" /><span><strong>今天做饭</strong><small>从现有食材开始</small></span></button>
        <button type="button" className={mode === 'plan' ? 'is-active' : ''} onClick={() => changeMode('plan')} aria-pressed={mode === 'plan'}><Icon name="calendar" /><span><strong>一周菜单</strong><small>菜单与购物清单</small></span></button>
      </nav>

      <div className="kitchen-workspace">
        {mode === 'today'
          ? <TodayKitchen pantry={pantry} setPantry={setPantry} plans={plans} setPlans={setPlans} planDates={planDates} />
          : <WeeklyKitchen pantry={pantry} plans={plans} setPlans={setPlans} planDates={planDates} />}
      </div>
    </main>
  )
}

function TodayKitchen({ pantry, setPantry, plans, setPlans, planDates }: {
  pantry: KitchenPantryItem[]
  setPantry: Dispatch<SetStateAction<KitchenPantryItem[]>>
  plans: Record<string, number[]>
  setPlans: Dispatch<SetStateAction<Record<string, number[]>>>
  planDates: string[]
}) {
  const navigate = useNavigate()
  const { gender, hometown } = useApp()
  const [selectedIds, setSelectedIds] = useState(() => pantry.map((item) => item.id))
  const [preferences, setPreferences] = useState<KitchenPreferences>(loadKitchenPreferences)
  const [sheet, setSheet] = useState<TodaySheet>(null)
  const [manualText, setManualText] = useState('')
  const [cameraScanning, setCameraScanning] = useState(false)
  const [exclusionDraft, setExclusionDraft] = useState(() => preferences.exclusions.join('、'))
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [scheduleDish, setScheduleDish] = useState<Dish>()
  const [scheduleDate, setScheduleDate] = useState(planDates[0])
  const [scheduleMeal, setScheduleMeal] = useState<MealType>('dinner')
  const [toast, setToast] = useState('')
  const [onlineIdeas, setOnlineIdeas] = useState<OnlineDishIdea[]>()
  const generateTimerRef = useRef<number>()

  useEffect(() => saveKitchenPreferences(preferences), [preferences])
  useEffect(() => () => {
    if (generateTimerRef.current) window.clearTimeout(generateTimerRef.current)
  }, [])

  const profile = useMemo<RecommendationProfile>(() => ({ gender, hometown, tasteDna: loadTasteDna() }), [gender, hometown])
  const selectedPantry = useMemo(() => pantry.filter((item) => selectedIds.includes(item.id)), [pantry, selectedIds])
  const recommendations = useMemo(() => generated ? rankKitchenDishes(selectedPantry, preferences, profile) : [], [generated, preferences, profile, selectedPantry])
  const lowCount = pantry.filter((item) => item.amount === 'low').length

  const addNames = (names: string[], source: KitchenPantryItem['source']) => {
    const next = addPantryNames(pantry, names, source)
    setPantry(next)
    setSelectedIds(next.map((item) => item.id))
    setGenerated(false)
    setOnlineIdeas(undefined)
  }

  const addManual = () => {
    const names = manualText.split(/[、，,；;\n]+/).map((item) => item.trim()).filter(Boolean)
    if (!names.length) return
    addNames(names, 'manual')
    setManualText('')
    setSheet(null)
    setToast(`已加入 ${names.length} 种食材`)
  }

  const chooseImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setCameraScanning(true)
    setGenerated(false)
    try {
      const result = await analyzePantryImage(file)
      const names = result.ingredients.map((item) => item.name).filter(Boolean)
      if (!names.length) throw new Error('未识别到明确食材')
      addNames(names, 'scan')
      setOnlineIdeas(result.recipeIdeas)
      setGenerated(true)
      setToast(`识别到 ${names.length} 种食材，正在同步搜索可做菜谱`)
    } catch (error) {
      setToast(error instanceof Error && error.message.includes('尚未配置')
        ? '视觉识别服务尚未配置，请先手动添加食材'
        : '这张照片暂时无法识别，请手动添加食材')
    } finally {
      setCameraScanning(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setGenerated(false)
    setOnlineIdeas(undefined)
  }

  const generate = () => {
    if (!selectedPantry.length) return
    setGenerating(true)
    setGenerated(false)
    if (generateTimerRef.current) window.clearTimeout(generateTimerRef.current)
    generateTimerRef.current = window.setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
      requestAnimationFrame(() => document.querySelector('.kitchen-results')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))
    }, 520)
  }

  const beginCooking = (dish: Dish) => {
    localStorage.setItem(activeCookStorageKey, JSON.stringify({ dishId: dish.id, pantryIds: selectedIds, startedAt: Date.now() }))
    navigate(`/dish/${dish.id}?mode=cook`)
  }

  const openSchedule = (dish: Dish) => {
    setScheduleDish(dish)
    setScheduleDate(planDates[0])
    setScheduleMeal('dinner')
    setSheet('schedule')
  }

  const addToPlan = () => {
    if (!scheduleDish) return
    const dateIndex = Math.max(0, planDates.indexOf(scheduleDate))
    const base = [...(plans[scheduleDate] || defaultMealPlans[dateIndex % defaultMealPlans.length])]
    const mealIndex = planMeals.indexOf(scheduleMeal)
    base[mealIndex] = scheduleDish.id
    setPlans((current) => ({ ...current, [scheduleDate]: base }))
    setSheet(null)
    setToast(`${scheduleDish.name}已加入${formatPlanDate(scheduleDate)}${mealLabels[scheduleMeal]}`)
  }

  const openConditions = () => {
    setExclusionDraft(preferences.exclusions.join('、'))
    setSheet('conditions')
  }

  const applyConditions = () => {
    setPreferences((current) => ({ ...current, exclusions: exclusionDraft.split(/[、，,；;\n]+/).map((item) => item.trim()).filter(Boolean).slice(0, 12) }))
    setGenerated(false)
    setSheet(null)
  }

  return (
    <section className="today-kitchen">
      <section className="kitchen-pantry-card">
        <div className="kitchen-pantry-top">
          <div>
            <span>今日食材</span>
            <strong>{pantry.length ? `${selectedPantry.length} 种用于这一餐` : '家里有什么，就从什么开始'}</strong>
            <small>{pantry.length ? `${pantry.length} 种在库${lowCount ? ` · ${lowCount} 种建议优先用` : ''}` : '相机识别，或手动添加'}</small>
          </div>
          <div className="kitchen-pantry-tools">
            {pantry.length > 0 && <button type="button" className="is-manage" onClick={() => setSheet('manage')} aria-label="管理库存"><Icon name="sliders" /></button>}
            <label className={cameraScanning ? 'is-scanning' : ''} htmlFor="kitchen-camera-input"><Icon name={cameraScanning ? 'refresh' : 'camera'} /><span>{cameraScanning ? '识别中' : '相机'}</span></label>
            <input id="kitchen-camera-input" type="file" accept="image/*" capture="environment" onChange={chooseImage} disabled={cameraScanning} />
            <button type="button" className="is-add" onClick={() => setSheet('manual')}><Icon name="plus" />添加</button>
          </div>
        </div>
        {pantry.length > 0 && <div className="kitchen-ingredient-rail">{pantry.map((item) => { const stale = Date.now() - item.updatedAt > 7 * 24 * 60 * 60 * 1000; return <button type="button" className={`${selectedIds.includes(item.id) ? 'is-active' : ''} ${item.amount === 'low' ? 'is-low' : ''} ${stale ? 'is-stale' : ''}`} onClick={() => toggleSelected(item.id)} aria-pressed={selectedIds.includes(item.id)} key={item.id}><span>{selectedIds.includes(item.id) ? <Icon name="check" /> : <Icon name="plus" />}</span><strong>{item.name}</strong><small>{stale ? '可能没有了' : item.amount === 'low' ? '建议先用' : '大概够用'}</small></button> })}</div>}
      </section>

      <section className="kitchen-conditions">
        <header><div><span>本餐条件</span><h2>只调整今天需要的</h2></div><button type="button" onClick={openConditions}>更多条件 <Icon name="sliders" /></button></header>
        <div>
          <button type="button" onClick={() => { setPreferences((current) => ({ ...current, minutes: current.minutes === 15 ? 30 : current.minutes === 30 ? 45 : 15 })); setGenerated(false) }}><Icon name="clock" /><span><small>用时</small><strong>{preferences.minutes} 分钟</strong></span><em>轻触切换</em></button>
          <button type="button" onClick={() => { setPreferences((current) => ({ ...current, people: current.people === 1 ? 2 : current.people === 2 ? 4 : 1 })); setGenerated(false) }}><Icon name="person" /><span><small>人数</small><strong>{preferences.people === 4 ? '3–4' : preferences.people} 人</strong></span><em>轻触切换</em></button>
          <button type="button" onClick={openConditions}><Icon name="leaf" /><span><small>忌口与过敏</small><strong>{preferences.exclusions.length ? `${preferences.exclusions.length} 项已排除` : '未设置'}</strong></span><Icon name="chevron-right" /></button>
        </div>
        <p><Icon name="compass" />长期味觉记忆：{tasteMemorySummary()}</p>
      </section>

      <button type="button" className="kitchen-generate" disabled={!selectedPantry.length || generating} onClick={generate}><span><Icon name={generating ? 'refresh' : 'chef'} /></span><span><strong>{generating ? '正在组合这一餐' : '用这些食材出方案'}</strong><small>{generating ? '核对食材、时间与口味条件' : `${selectedPantry.length || 0} 种食材 · ${preferences.minutes} 分钟内`}</small></span><Icon name="chevron-right" /></button>

      {generated && <RecommendationResults recommendations={recommendations} onCook={beginCooking} onSchedule={openSchedule} />}
      <OnlineDishResults
        query={`${selectedPantry.map((item) => item.name).join('、')} ${preferences.minutes}分钟 ${preferences.lowOil ? '少油' : ''} ${preferences.spice === 'none' ? '不辣' : preferences.spice === 'hot' ? '辣' : '微辣'} 菜谱`}
        context="kitchen"
        enabled={generated}
        ideas={onlineIdeas}
      />

      <Sheet open={sheet === 'manual'} title="手动添加真实食材" onClose={() => setSheet(null)}>
        <div className="kitchen-manual-sheet"><p>输入家里真实存在的食材，用顿号或逗号分隔。</p><label htmlFor="manual-ingredients">食材名称</label><textarea id="manual-ingredients" autoFocus value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder="例如：番茄、鸡蛋、豆腐" rows={3} /><button type="button" className="kitchen-sheet-primary" disabled={!manualText.trim()} onClick={addManual}><Icon name="plus" />加入今日食材盘</button></div>
      </Sheet>

      <Sheet open={sheet === 'manage'} title="管理家里现有食材" onClose={() => setSheet(null)}>
        <div className="kitchen-manage-sheet">{pantry.map((item) => <article key={item.id}><span><strong>{item.name}</strong><small>{item.source === 'scan' ? '照片识别' : '手动添加'}</small></span><button type="button" className={item.amount === 'low' ? 'is-low' : ''} onClick={() => setPantry((current) => current.map((entry) => entry.id === item.id ? { ...entry, amount: entry.amount === 'low' ? 'enough' : 'low', updatedAt: Date.now() } : entry))}>{item.amount === 'low' ? '建议先用' : '大概够用'}</button><button type="button" aria-label={`删除${item.name}`} onClick={() => { setPantry((current) => current.filter((entry) => entry.id !== item.id)); setSelectedIds((current) => current.filter((id) => id !== item.id)); setGenerated(false) }}><Icon name="trash" /></button></article>)}<button type="button" className="kitchen-manage-sheet__add" onClick={() => setSheet('manual')}><Icon name="plus" />继续添加食材</button></div>
      </Sheet>

      <Sheet open={sheet === 'conditions'} title="本餐更多条件" onClose={() => setSheet(null)}>
        <div className="kitchen-condition-sheet">
          <fieldset><legend>完成时间</legend><div>{([15, 30, 45] as const).map((value) => <button type="button" className={preferences.minutes === value ? 'is-active' : ''} onClick={() => setPreferences((current) => ({ ...current, minutes: value }))} key={value}>{value} 分钟</button>)}</div></fieldset>
          <fieldset><legend>用餐人数</legend><div>{([1, 2, 4] as const).map((value) => <button type="button" className={preferences.people === value ? 'is-active' : ''} onClick={() => setPreferences((current) => ({ ...current, people: value }))} key={value}>{value === 4 ? '3–4' : value} 人</button>)}</div></fieldset>
          <fieldset><legend>本餐辣度</legend><div>{([['none', '不辣'], ['mild', '微辣'], ['hot', '尽兴辣']] as const).map(([value, label]) => <button type="button" className={preferences.spice === value ? 'is-active' : ''} onClick={() => setPreferences((current) => ({ ...current, spice: value }))} key={value}>{label}</button>)}</div></fieldset>
          <fieldset><legend>烹饪工具</legend><div className="is-four">{([['any', '不限'], ['stove', '灶台'], ['airfryer', '空气炸锅'], ['oven', '烤箱']] as const).map(([value, label]) => <button type="button" className={preferences.tool === value ? 'is-active' : ''} onClick={() => setPreferences((current) => ({ ...current, tool: value }))} key={value}>{label}</button>)}</div></fieldset>
          <button type="button" className={`kitchen-oil-toggle ${preferences.lowOil ? 'is-active' : ''}`} onClick={() => setPreferences((current) => ({ ...current, lowOil: !current.lowOil }))} aria-pressed={preferences.lowOil}><span><Icon name="leaf" /><strong>本餐少油</strong></span><i><b /></i></button>
          <label className="kitchen-exclusion-field" htmlFor="meal-exclusions"><span>忌口与过敏 <small>硬性排除</small></span><textarea id="meal-exclusions" value={exclusionDraft} onChange={(event) => setExclusionDraft(event.target.value)} placeholder="例如：花生过敏、不要香菜" rows={2} /></label>
          <div className="kitchen-memory-row"><span><Icon name="compass" /><span><small>味觉记忆</small><strong>{tasteMemorySummary()}</strong></span></span><button type="button" onClick={() => { resetTasteMemory(); setToast('味觉记忆已恢复默认') }}>重置</button></div>
          <button type="button" className="kitchen-sheet-primary" onClick={applyConditions}><Icon name="check" />应用本餐条件</button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'schedule'} title="加入一周菜单" onClose={() => setSheet(null)}>
      {scheduleDish && <div className="kitchen-schedule-sheet"><article><img src={scheduleDish.image} alt="" style={{ objectFit: scheduleDish.imageFit || 'cover', objectPosition: scheduleDish.imagePosition || '50% 50%', backgroundColor: scheduleDish.accent }} /><span><small>准备安排</small><strong>{scheduleDish.name}</strong><em>{scheduleDish.time} 分钟</em></span></article><fieldset><legend>选择日期</legend><div>{planDates.map((key, index) => <button type="button" className={scheduleDate === key ? 'is-active' : ''} onClick={() => setScheduleDate(key)} key={key}><span>{index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(dateFromKey(key))}</span><strong>{dateFromKey(key).getDate()}</strong></button>)}</div></fieldset><fieldset><legend>选择餐次</legend><div>{planMeals.map((meal) => <button type="button" className={scheduleMeal === meal ? 'is-active' : ''} onClick={() => setScheduleMeal(meal)} key={meal}>{mealLabels[meal]}</button>)}</div></fieldset><button type="button" className="kitchen-sheet-primary" onClick={addToPlan}><Icon name="calendar" />确认加入菜单</button></div>}
      </Sheet>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </section>
  )
}

function RecommendationResults({ recommendations, onCook, onSchedule }: { recommendations: KitchenRecommendation[]; onCook: (dish: Dish) => void; onSchedule: (dish: Dish) => void }) {
  if (!recommendations.length) return <section className="kitchen-results is-empty"><Icon name="leaf" /><strong>没有符合硬性限制的菜品</strong><p>请调整忌口与过敏条件，或者补充更多食材后再试。</p></section>
  const [primary, ...alternatives] = recommendations
  return (
    <section className="kitchen-results" aria-live="polite">
      <header className="kitchen-section-heading"><div><span>这一餐的答案</span><h2>一个主方案，两个明确备选</h2><p>理由来自现有食材、完成时间与个人口味，不使用装饰性匹配分。</p></div></header>
      <article className="kitchen-primary-recipe">
        <figure><img src={primary.dish.image} alt={primary.dish.imageAlt} style={{ objectFit: primary.dish.imageFit || 'cover', objectPosition: primary.dish.imagePosition || '50% 50%', backgroundColor: primary.dish.accent }} /><figcaption><span>{primary.label}</span><small>{primary.dish.photoCredit}</small></figcaption></figure>
        <div className="kitchen-primary-recipe__copy"><span>{primary.dish.region} · {primary.dish.difficulty}</span><h3>{primary.dish.name}</h3><p>{primary.dish.subtitle}</p><ul>{primary.reasons.map((reason) => <li key={reason}><Icon name="check" />{reason}</li>)}</ul>{primary.missing.length > 0 && <div className="kitchen-missing"><span>还需准备</span>{primary.missing.slice(0, 4).map((item) => <em key={item}>{item}</em>)}</div>}<div className="kitchen-recipe-actions"><button type="button" onClick={() => onSchedule(primary.dish)}><Icon name="calendar" />加入菜单</button><button type="button" className="is-primary" onClick={() => onCook(primary.dish)}><Icon name="chef" />开始做</button></div></div>
      </article>
      <div className="kitchen-alternatives">{alternatives.map((item) => <article key={item.dish.id}><img src={item.dish.image} alt="" style={{ objectFit: item.dish.imageFit || 'cover', objectPosition: item.dish.imagePosition || '50% 50%', backgroundColor: item.dish.accent }} /><div><span>{item.label}</span><strong>{item.dish.name}</strong><small>{item.reasons[1]}</small><p>{item.reasons[0]}</p></div><div><button type="button" onClick={() => onSchedule(item.dish)} aria-label={`把${item.dish.name}加入菜单`}><Icon name="calendar" /></button><button type="button" onClick={() => onCook(item.dish)}>开做 <Icon name="chevron-right" /></button></div></article>)}</div>
    </section>
  )
}

function WeeklyKitchen({ pantry, plans, setPlans, planDates }: {
  pantry: KitchenPantryItem[]
  plans: Record<string, number[]>
  setPlans: Dispatch<SetStateAction<Record<string, number[]>>>
  planDates: string[]
}) {
  const { addRecord, target } = useApp()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(planDates[0])
  const [editingMeal, setEditingMeal] = useState<number | null>(null)
  const [replaceQuery, setReplaceQuery] = useState('')
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [checkedShopping, setCheckedShopping] = useState<string[]>([])
  const [shoppingQuery, setShoppingQuery] = useState('')
  const [shoppingOverrides, setShoppingOverrides] = useState<ShoppingOverrides>(loadShoppingOverrides)
  const [toast, setToast] = useState('')
  const selectedDateIndex = Math.max(0, planDates.indexOf(selectedDate))
  const planIds = plans[selectedDate] || defaultMealPlans[selectedDateIndex % defaultMealPlans.length]
  const plan = planIds.map((id) => getDish(id)).filter((dish): dish is Dish => Boolean(dish))
  const total = plan.reduce<Nutrition>((sum, dish) => ({ calories: sum.calories + dish.nutrition.calories, protein: sum.protein + dish.nutrition.protein, fat: sum.fat + dish.nutrition.fat, carbs: sum.carbs + dish.nutrition.carbs, fiber: sum.fiber + dish.nutrition.fiber }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 })
  const caloriePenalty = Math.min(18, Math.round(Math.abs(total.calories - target.calories) / target.calories * 24))
  const proteinPenalty = total.protein >= target.protein * .82 ? 0 : 6
  const fiberPenalty = total.fiber >= target.fiber * .78 ? 0 : 5
  const planScore = 98 - caloriePenalty - proteinPenalty - fiberPenalty
  const lowPantry = pantry.filter((item) => item.amount === 'low')

  const automaticShoppingItems = useMemo(() => {
    const names: string[] = []
    planDates.forEach((key, index) => {
      const ids = plans[key] || defaultMealPlans[index % defaultMealPlans.length]
      ids.forEach((id) => getDish(id)?.ingredients.forEach((ingredient) => {
        if (!pantry.some((item) => sameIngredient(item.name, ingredient)) && !names.some((item) => sameIngredient(item, ingredient))) names.push(ingredient)
      }))
    })
    return names
  }, [pantry, planDates, plans])

  const shoppingItems = useMemo(() => {
    const automatic = automaticShoppingItems.filter((item) => !shoppingOverrides.removed.some((removed) => sameIngredient(removed, item)))
    const custom = shoppingOverrides.custom.filter((item) => !automatic.some((automaticItem) => sameIngredient(automaticItem, item)))
    return [...automatic, ...custom]
  }, [automaticShoppingItems, shoppingOverrides])
  const ingredientCatalog = useMemo(() => Array.from(new Set(dishes.flatMap((dish) => dish.ingredients))).sort((a, b) => a.localeCompare(b, 'zh-CN')), [])
  const normalizedShoppingQuery = shoppingQuery.trim().toLocaleLowerCase('zh-CN')
  const shoppingSuggestions = useMemo(() => normalizedShoppingQuery
    ? ingredientCatalog.filter((item) => item.toLocaleLowerCase('zh-CN').includes(normalizedShoppingQuery) && !shoppingItems.some((current) => sameIngredient(current, item))).slice(0, 8)
    : [], [ingredientCatalog, normalizedShoppingQuery, shoppingItems])
  const visibleShoppingItems = useMemo(() => normalizedShoppingQuery
    ? shoppingItems.filter((item) => item.toLocaleLowerCase('zh-CN').includes(normalizedShoppingQuery))
    : shoppingItems, [normalizedShoppingQuery, shoppingItems])
  const checkedShoppingCount = shoppingItems.filter((item) => checkedShopping.some((checked) => sameIngredient(checked, item))).length

  useEffect(() => localStorage.setItem(shoppingStorageKey, JSON.stringify(shoppingOverrides)), [shoppingOverrides])

  const updatePlan = (next: number[]) => setPlans((current) => ({ ...current, [selectedDate]: next }))
  const replaceMeal = (dish: Dish) => {
    if (editingMeal === null) return
    const next = [...planIds]
    next[editingMeal] = dish.id
    updatePlan(next)
    setEditingMeal(null)
    setReplaceQuery('')
    setToast(`${mealLabels[planMeals[editingMeal]]}已换成${dish.name}`)
  }
  const regenerate = () => {
    const next = defaultMealPlans[(selectedDateIndex + 1 + (plans[selectedDate] ? 1 : 0)) % defaultMealPlans.length]
    updatePlan([...next])
    navigator.vibrate?.(8)
  }
  const recordDay = () => {
    plan.forEach((dish, index) => addRecord(dish.id, planMeals[index], 1, selectedDate))
    setToast(`${formatPlanDate(selectedDate)}三餐已写入记录`)
  }
  const addShoppingItem = (value: string) => {
    const name = value.trim()
    if (!name) return
    setShoppingOverrides((current) => {
      const alreadyAutomatic = automaticShoppingItems.some((item) => sameIngredient(item, name))
      return {
        custom: alreadyAutomatic || current.custom.some((item) => sameIngredient(item, name)) ? current.custom : [...current.custom, name],
        removed: current.removed.filter((item) => !sameIngredient(item, name)),
      }
    })
    setShoppingQuery('')
    setToast(`${name}已加入购物清单`)
  }
  const removeShoppingItem = (name: string) => {
    setShoppingOverrides((current) => ({
      custom: current.custom.filter((item) => !sameIngredient(item, name)),
      removed: automaticShoppingItems.some((item) => sameIngredient(item, name)) && !current.removed.some((item) => sameIngredient(item, name)) ? [...current.removed, name] : current.removed,
    }))
    setCheckedShopping((current) => current.filter((item) => !sameIngredient(item, name)))
    setToast(`${name}已从购物清单删除`)
  }

  return (
    <section className="weekly-kitchen">
      <header className="kitchen-section-heading"><div><span>一周菜单</span><h2>让库存、菜单和购物清单一起工作</h2><p>每一餐都可以单独替换；只有确认吃过，才会进入膳食记录。</p></div><button type="button" onClick={() => setShoppingOpen(true)}><Icon name="bag" /><span>购物清单</span><em>{shoppingItems.length}</em></button></header>

      <section className="week-inventory-brief"><span><Icon name="leaf" /></span><div><strong>家里现有 {pantry.length} 种食材</strong><p>{lowPantry.length ? `${lowPantry.map((item) => item.name).slice(0, 3).join('、')}建议优先安排` : '库存状态稳定，可以按口味规划'}</p></div><button type="button" onClick={() => setShoppingOpen(true)}>缺 {shoppingItems.length} 项 <Icon name="chevron-right" /></button></section>

      <div className="week-date-strip" aria-label="选择菜单日期">{planDates.map((key, index) => { const date = dateFromKey(key); return <button type="button" className={selectedDate === key ? 'is-active' : ''} onClick={() => { setSelectedDate(key); setEditingMeal(null); setReplaceQuery(''); setScoreOpen(false) }} aria-pressed={selectedDate === key} key={key}><span>{index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date).replace('周', '')}</span><strong>{date.getDate()}</strong><small>{date.getMonth() + 1}月</small></button> })}</div>

      <section className="week-day-summary"><div><span>{formatPlanDate(selectedDate)}</span><strong>{planScore}<small>/100</small></strong><button type="button" onClick={() => setScoreOpen(true)}>营养贴合依据 <Icon name="chevron-right" /></button></div><div><span>全天估算</span><strong>{total.calories}<small> kcal</small></strong><p>{total.protein}g 蛋白质 · {total.fiber}g 纤维</p></div></section>

      <div className="week-meal-list">{plan.map((dish, index) => <article key={`${selectedDate}-${planMeals[index]}`}><div className="week-meal-list__time"><span>{mealTimes[index]}</span><small>{mealLabels[planMeals[index]]}</small></div><img src={dish.image} alt="" style={{ objectFit: dish.imageFit || 'cover', objectPosition: dish.imagePosition || '50% 50%', backgroundColor: dish.accent }} /><button type="button" className="week-meal-list__dish" onClick={() => navigate(`/dish/${dish.id}`)}><strong>{dish.name}</strong><small>{dish.nutrition.calories} kcal · {dish.time} 分钟</small><p>{dish.highlights[0]}</p></button><button type="button" className="week-meal-list__replace" onClick={() => { setEditingMeal(index); setReplaceQuery('') }} aria-label={`更换${mealLabels[planMeals[index]]}`}><Icon name="refresh" /><span>更换</span></button></article>)}</div>

      <div className="week-actions"><button type="button" onClick={regenerate}><Icon name="refresh" />换一天方案</button><button type="button" className="is-primary" onClick={recordDay}><Icon name="check" />确认吃过并记录</button></div>

      <Sheet open={editingMeal !== null} title={`更换${editingMeal === null ? '餐食' : mealLabels[planMeals[editingMeal]]}`} onClose={() => { setEditingMeal(null); setReplaceQuery('') }}>
        <label className="week-replace-search"><Icon name="search" /><input value={replaceQuery} onChange={(event) => setReplaceQuery(event.target.value)} placeholder="搜索菜名、食材或口味" aria-label="搜索替换菜品" /></label>
        <div className="week-replace-sheet">{dishes.filter((dish) => (editingMeal === null || dish.id !== planIds[editingMeal]) && (!replaceQuery.trim() || [dish.name, dish.region, ...dish.ingredients, ...dish.highlights].join(' ').includes(replaceQuery.trim()))).map((dish) => <button type="button" onClick={() => replaceMeal(dish)} key={dish.id}><img src={dish.image} alt="" style={{ objectFit: dish.imageFit || 'cover', objectPosition: dish.imagePosition || '50% 50%', backgroundColor: dish.accent }} /><span><strong>{dish.name}</strong><small>{dish.time} 分钟 · {dish.nutrition.calories} kcal</small></span><Icon name="chevron-right" /></button>)}</div>
        <OnlineDishResults query={replaceQuery} context="weekly" enabled={editingMeal !== null} compact showLibraryWhenEmpty />
      </Sheet>

      <Sheet open={shoppingOpen} title="本周购物清单" onClose={() => { setShoppingOpen(false); setShoppingQuery('') }}>
        <div className="week-shopping-sheet">
          <header><span><Icon name="bag" /></span><div><strong>{shoppingItems.length} 项待管理</strong><p>菜单自动生成，也可以自行增删。</p></div><em>{checkedShoppingCount} 项已购</em></header>
          <form className="week-shopping-search" onSubmit={(event) => { event.preventDefault(); addShoppingItem(shoppingQuery) }}>
            <Icon name="search" />
            <input value={shoppingQuery} onChange={(event) => setShoppingQuery(event.target.value)} placeholder="搜索食材，或输入自定义项目" aria-label="搜索或添加购物项目" />
            <button type="submit" disabled={!shoppingQuery.trim()}><Icon name="plus" />添加</button>
          </form>
          {shoppingSuggestions.length > 0 && <div className="week-shopping-suggestions"><small>搜索建议</small><div>{shoppingSuggestions.map((item) => <button type="button" onClick={() => addShoppingItem(item)} key={item}><Icon name="plus" />{item}</button>)}</div></div>}
          {visibleShoppingItems.length > 0
            ? <div className="week-shopping-list">{visibleShoppingItems.map((item) => { const checked = checkedShopping.some((name) => sameIngredient(name, item)); const custom = shoppingOverrides.custom.some((name) => sameIngredient(name, item)); return <article className={checked ? 'is-checked' : ''} key={item}><button type="button" className="week-shopping-check" onClick={() => setCheckedShopping((current) => checked ? current.filter((name) => !sameIngredient(name, item)) : [...current, item])} aria-label={checked ? `取消${item}已购买状态` : `标记${item}已购买`} aria-pressed={checked}>{checked && <Icon name="check" />}</button><span><strong>{item}</strong><small>{custom ? '手动添加' : '来自本周菜单'}</small></span><button type="button" className="week-shopping-delete" onClick={() => removeShoppingItem(item)} aria-label={`删除${item}`}><Icon name="trash" /></button></article> })}</div>
            : <section><Icon name={shoppingQuery ? 'search' : 'check'} /><strong>{shoppingQuery ? '没有匹配项目' : '现有食材已经够用'}</strong><small>{shoppingQuery ? '可以直接添加当前输入的自定义项目' : '也可以搜索并添加临时需要购买的食材'}</small></section>}
          <footer>自动清单已扣除家中现有食材；删除和自定义项目会保存在本机。</footer>
        </div>
      </Sheet>

      <Sheet open={scoreOpen} title="营养贴合依据" onClose={() => setScoreOpen(false)}>
        <div className="week-score-sheet"><header><strong>{planScore}<small>/100</small></strong><div><span>{formatPlanDate(selectedDate)}</span><h3>{planScore >= 90 ? '核心营养目标贴合' : '还有清晰的调整空间'}</h3><p>从 98 分起，只根据热量、蛋白质与膳食纤维偏差扣分。</p></div></header>{[
          ['热量匹配', `${total.calories} / ${target.calories} kcal`, caloriePenalty],
          ['蛋白质', `${total.protein} / ${target.protein} g`, proteinPenalty],
          ['膳食纤维', `${total.fiber} / ${target.fiber} g`, fiberPenalty],
        ].map(([label, value, penalty]) => <article key={String(label)}><span><strong>{label}</strong><small>{value}</small></span><em className={penalty ? 'has-penalty' : ''}>{penalty ? `−${penalty} 分` : '不扣分'}</em></article>)}<footer>评分解释营养目标匹配度，不代表菜品本身好坏。</footer></div>
      </Sheet>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </section>
  )
}
