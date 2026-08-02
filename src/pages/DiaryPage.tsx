import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { AddMealSheet } from '../components/actions'
import { OnlineDishResults } from '../components/OnlineDishResults'
import { DishArtwork, NutritionRing, Sheet, Toast } from '../components/ui'
import { useApp } from '../context/AppContext'
import { dishCatalog, getDish, mealLabels } from '../data/dishes'
import { calculateDeficits } from '../lib/recommend'
import type { Dish, MealRecord, MealType, Nutrition } from '../types'

const ringConfig = [
  { key: 'calories' as const, label: '热量', unit: 'kcal', color: '#c9563e' },
  { key: 'protein' as const, label: '蛋白质', unit: 'g', color: '#3f7967' },
  { key: 'carbs' as const, label: '碳水', unit: 'g', color: '#627c94' },
  { key: 'fiber' as const, label: '纤维', unit: 'g', color: '#7c946e' },
]

const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const catalogFilters = ['全部', '快手', '高蛋白', '低脂', '素食'] as const
type CatalogFilter = (typeof catalogFilters)[number]

const movementProfiles = [
  { name: '轻快步行', rate: 4.5, intensity: '低冲击', note: '适合饭后完成' },
  { name: '城市骑行', rate: 6.5, intensity: '中等强度', note: '保持稳定呼吸' },
  { name: '轻松慢跑', rate: 8, intensity: '较高强度', note: '注意热身与补水' },
] as const

function movementMinutes(calories: number, rate: number) {
  return Math.max(5, Math.ceil(calories / rate / 5) * 5)
}

function toDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function nutritionFor(records: MealRecord[]): Nutrition {
  return records.reduce<Nutrition>((total, record) => {
    const dish = getDish(record.dishId)
    if (!dish) return total
    ;(Object.keys(total) as (keyof Nutrition)[]).forEach((key) => { total[key] += dish.nutrition[key] * record.servings })
    return total
  }, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 })
}

export function DiaryPage() {
  const navigate = useNavigate()
  const { records, target, removeRecord, updateServings } = useApp()
  const todayKey = toDateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [dateOpen, setDateOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('全部')
  const [catalogLimit, setCatalogLimit] = useState(18)
  const [selectedDish, setSelectedDish] = useState<Dish>()
  const [pendingDelete, setPendingDelete] = useState<MealRecord>()
  const [movementOpen, setMovementOpen] = useState(false)
  const [toast, setToast] = useState('')
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`)
  const isToday = selectedDate === todayKey
  const dayRecords = useMemo(() => records.filter((record) => toDateKey(new Date(record.createdAt)) === selectedDate), [records, selectedDate])
  const dayIntake = useMemo(() => nutritionFor(dayRecords), [dayRecords])
  const dayDeficits = useMemo(() => calculateDeficits(dayIntake, target), [dayIntake, target])
  const grouped = useMemo(() => mealOrder.map((type) => ({ type, records: dayRecords.filter((record) => record.mealType === type) })), [dayRecords])
  const catalogMatches = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase('zh-CN')
    return dishCatalog.filter((dish) => {
      const matchesFilter = catalogFilter === '全部' || [...dish.constraints, ...dish.highlights].some((tag) => tag.includes(catalogFilter))
      if (!matchesFilter) return false
      if (!query) return true
      return [dish.name, dish.subtitle, dish.region, ...dish.ingredients, ...dish.constraints, ...dish.highlights]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(query)
    })
  }, [catalogFilter, catalogQuery])
  const visibleCatalog = catalogMatches.slice(0, catalogLimit)
  const recentDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - index)
    return date
  }), [])
  const calorieRemaining = Math.max(0, target.calories - dayIntake.calories)
  const calorieExcess = Math.max(0, Math.round(dayIntake.calories - target.calories))
  const movementOptions = movementProfiles.map((activity) => ({
    ...activity,
    minutes: calorieExcess ? movementMinutes(calorieExcess, activity.rate) : activity.name === '轻快步行' ? 15 : 10,
  }))
  const primaryMovement = movementOptions[0]
  const actionableDeficit = dayDeficits.find((item) => item.key === 'fiber' || item.key === 'protein')
  const dateLabel = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(selectedDateObject).replace('周', '周')

  const chooseDish = (dish: Dish) => {
    setPickerOpen(false)
    setSelectedDish(dish)
  }

  const openCatalog = () => {
    setCatalogLimit(18)
    setPickerOpen(true)
  }

  const chooseDate = (date: string) => {
    setSelectedDate(date)
    setDateOpen(false)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const dish = getDish(pendingDelete.dishId)
    removeRecord(pendingDelete.id)
    setPendingDelete(undefined)
    setToast(`${dish?.name || '这条记录'}已删除`)
  }

  return (
    <main className="page diary-page diary-page--cool">
      <header className="topbar">
        <div><span className="eyebrow">膳食日记</span><h1>{isToday ? '今天吃得怎么样？' : '这天吃得怎么样？'}</h1></div>
        <div className="diary-header-actions">
          <button className="diary-plan-link" onClick={openCatalog} aria-label="打开菜单"><Icon name="notebook" /><span>菜单</span></button>
          <button className="date-chip" onClick={() => setDateOpen(true)} aria-label={`选择日期，当前${dateLabel}`}><Icon name="calendar" />{isToday ? dateLabel.replace('星期', '周') : dateLabel}</button>
        </div>
      </header>

      <section className="daily-overview">
        <div className="daily-overview__lead">
          <span>{isToday ? '今日能量' : `${dateLabel}能量`}</span><strong>{Math.round(dayIntake.calories)}<small> / {target.calories} kcal</small></strong>
          <p>{dayRecords.length ? <>还可摄入约 <b>{Math.round(calorieRemaining)} kcal</b></> : '还没有记录这一天'}</p>
        </div>
        <div className="overview-badge"><Icon name="leaf" /><span>均衡指数<strong>{Math.round(Math.min(dayIntake.protein / target.protein, 1) * 36 + Math.min(dayIntake.fiber / target.fiber, 1) * 34 + Math.min(dayIntake.calories / target.calories, 1) * 30)}</strong></span></div>
      </section>

      <section className="ring-panel">
        {ringConfig.map((item) => <NutritionRing key={item.key} label={item.label} value={dayIntake[item.key]} target={target[item.key]} unit={item.unit} color={item.color} />)}
      </section>

      <section className="diary-guidance" aria-label="今日饮食与运动建议">
        <button className="deficit-card" onClick={() => navigate('/recommend')}>
          <span className="deficit-card__icon"><Icon name="sparkles" /></span>
          <span className="deficit-card__copy">
            <small>吃了么提醒</small>
            <strong>{actionableDeficit?.label || '这天的营养很均衡'}</strong>
            <em>{actionableDeficit?.suggestion || '继续保持，多样化搭配就好'}</em>
          </span>
          <span className="deficit-card__action">去补一补 <Icon name="chevron-right" /></span>
        </button>

        <button className={`activity-balance-card ${calorieExcess ? 'has-excess' : 'is-balanced'}`} onClick={() => setMovementOpen(true)}>
          <span className="activity-balance-card__icon"><Icon name={calorieExcess ? 'flame' : 'check'} /></span>
          <span className="activity-balance-card__copy">
            <small>摄入超出</small>
            <strong>{calorieExcess ? `+${calorieExcess} kcal` : '今日未超出'}</strong>
            <em>{calorieExcess ? `${primaryMovement.name}约 ${primaryMovement.minutes} 分钟可抵消` : '无需额外抵消，饭后轻走即可'}</em>
          </span>
          <span className="activity-balance-card__action">运动方案 <Icon name="chevron-right" /></span>
        </button>
      </section>

      <section className="meals-section section-block">
        <div className="section-heading"><div><span className="eyebrow">{isToday ? '今日已吃' : dateLabel}</span><h2>{dayRecords.length} 条饮食记录</h2></div><button className="text-button" onClick={openCatalog}><Icon name="plus" /> 添加</button></div>
        <div className="meal-timeline">
          {grouped.map(({ type, records: mealRecords }) => (
            <div className="meal-group" key={type}>
              <div className="meal-group__marker"><span />{mealLabels[type]}</div>
              <div className="meal-group__content">
                {mealRecords.length ? mealRecords.map((record) => <MealRow record={record} key={record.id} onRemove={() => setPendingDelete(record)} onServings={(value) => updateServings(record.id, value)} />) : <button className="empty-meal" onClick={openCatalog}><Icon name="plus" />还没有记录，点此添加</button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Sheet open={dateOpen} title="选择查看日期" onClose={() => setDateOpen(false)}>
        <div className="date-week">
          {recentDates.map((date) => { const key = toDateKey(date); return <button className={selectedDate === key ? 'is-active' : ''} onClick={() => chooseDate(key)} key={key}><span>{new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date)}</span><strong>{date.getDate()}</strong></button> })}
        </div>
        <label className="field-label" htmlFor="diary-date">选择其他日期</label>
        <input className="date-input" id="diary-date" type="date" max={todayKey} value={selectedDate} onChange={(event) => event.target.value && chooseDate(event.target.value)} />
        {!isToday && <button className="button button--quiet button--block" onClick={() => chooseDate(todayKey)}><Icon name="calendar" /> 回到今天</button>}
      </Sheet>

      <Sheet open={movementOpen} title="运动抵消建议" onClose={() => setMovementOpen(false)}>
        <section className={`movement-balance-sheet ${calorieExcess ? 'has-excess' : 'is-balanced'}`}>
          <header>
            <span><Icon name={calorieExcess ? 'flame' : 'check'} /></span>
            <div>
              <small>{calorieExcess ? `${dateLabel}摄入超出` : `${dateLabel}能量状态`}</small>
              <strong>{calorieExcess ? <>{calorieExcess}<em> kcal</em></> : '无需抵消'}</strong>
              <p>{calorieExcess ? '以下任选一种完成即可，不需要叠加。' : '今天仍在目标范围内，保持轻量活动即可。'}</p>
            </div>
          </header>

          <div className="movement-option-list">
            {movementOptions.map((activity, index) => (
              <article className={index === 0 ? 'is-recommended' : ''} key={activity.name}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{activity.name}</strong><small>{activity.intensity} · {activity.note}</small></div>
                <b>{activity.minutes}<small>分钟</small></b>
              </article>
            ))}
          </div>

          <p className="movement-balance-note"><Icon name="bolt" /> 运动消耗按约 60 kg 成人估算，实际结果会随体重、速度和强度变化。</p>
        </section>
      </Sheet>

      <Sheet open={pickerOpen} title="菜单" onClose={() => setPickerOpen(false)}>
        <div className="dish-library-intro"><span><Icon name="notebook" /></span><div><strong>选择一道，记入{dateLabel}</strong><small>支持菜名、食材、地域与营养标签搜索</small></div></div>
        <label className="dish-library-search">
          <Icon name="search" />
          <input value={catalogQuery} onChange={(event) => { setCatalogQuery(event.target.value); setCatalogLimit(18) }} placeholder="搜索菜名或食材" aria-label="搜索菜单" />
        </label>
        <div className="dish-library-filters" aria-label="菜品筛选">
          {catalogFilters.map((filter) => <button className={catalogFilter === filter ? 'is-active' : ''} onClick={() => { setCatalogFilter(filter); setCatalogLimit(18) }} aria-pressed={catalogFilter === filter} key={filter}>{filter}</button>)}
        </div>
        {visibleCatalog.length ? <>
          <div className="dish-menu-grid">
            {visibleCatalog.map((dish) => <button key={dish.id} onClick={() => chooseDish(dish)} aria-label={`添加${dish.name}`}>
              <span className="dish-menu-grid__visual"><img src={dish.image} alt={dish.imageAlt} loading="lazy" style={{ objectFit: dish.imageFit || 'cover', objectPosition: dish.imagePosition || '50% 50%', backgroundColor: dish.accent }} /><i><Icon name="plus" /></i></span>
              <strong>{dish.name}</strong>
              <small>{dish.nutrition.calories} kcal · {dish.highlights[0]}</small>
            </button>)}
          </div>
          {visibleCatalog.length < catalogMatches.length && <button className="dish-library-more" onClick={() => setCatalogLimit((current) => current + 18)}>查看更多菜品<small>继续向下浏览菜单</small></button>}
        </> : <div className="dish-library-empty"><Icon name="search" /><strong>本地菜单没有找到</strong><span>正在继续查询网络菜谱</span></div>}
        <OnlineDishResults query={catalogQuery} context="diary" enabled={pickerOpen} compact showLibraryWhenEmpty />
      </Sheet>

      <Sheet open={Boolean(pendingDelete)} title="删除这条记录？" onClose={() => setPendingDelete(undefined)}>
        <div className="confirm-copy"><Icon name="trash" /><strong>{pendingDelete ? getDish(pendingDelete.dishId)?.name : ''}</strong><p>删除后，这一餐的营养统计会同步更新。</p></div>
        <div className="sheet-actions"><button onClick={() => setPendingDelete(undefined)}>取消</button><button className="is-danger" onClick={confirmDelete}>确认删除</button></div>
      </Sheet>

      <AddMealSheet dish={selectedDish} recordDate={selectedDate} onClose={() => setSelectedDish(undefined)} onAdded={setToast} />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </main>
  )
}

function MealRow({ record, onRemove, onServings }: { record: MealRecord; onRemove: () => void; onServings: (value: number) => void }) {
  const dish = getDish(record.dishId)
  if (!dish) return null
  return (
    <article className="meal-row">
      <DishArtwork dish={dish} compact />
      <div className="meal-row__copy"><strong>{dish.name}</strong><span>{Math.round(dish.nutrition.calories * record.servings)} kcal · {record.servings} 份</span></div>
      <div className="meal-row__stepper"><button onClick={() => onServings(record.servings - 0.25)} aria-label={`减少${dish.name}份量`}><Icon name="minus" /></button><button onClick={() => onServings(record.servings + 0.25)} aria-label={`增加${dish.name}份量`}><Icon name="plus" /></button></div>
      <button className="meal-row__remove" onClick={onRemove} aria-label={`删除${dish.name}`}><Icon name="trash" /></button>
    </article>
  )
}
