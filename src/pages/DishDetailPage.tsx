import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AddMealSheet } from '../components/actions'
import { Icon } from '../components/Icon'
import { DishArtwork, Toast } from '../components/ui'
import { useApp } from '../context/AppContext'
import { dishes, getDish } from '../data/dishes'
import { getDishVideo } from '../data/dishVideos'
import { openDelivery } from '../lib/delivery'
import { activeCookStorageKey, loadKitchenPantry, recordKitchenFeedback, saveKitchenPantry, type KitchenFeedback } from '../lib/kitchen'
import type { Dish, MealType } from '../types'

const nutritionLabels = {
  protein: ['蛋白质', 'g'],
  fat: ['脂肪', 'g'],
  carbs: ['碳水', 'g'],
  fiber: ['纤维', 'g'],
} as const

export function DishDetailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id } = useParams()
  const dish = getDish(Number(id)) || dishes[0]
  const { favorites, toggleFavorite } = useApp()
  const [servings, setServings] = useState(1)
  const [mealDish, setMealDish] = useState<Dish>()
  const [toast, setToast] = useState('')
  const [guideMode, setGuideMode] = useState<'steps' | 'video'>('steps')
  const [tutorialExpanded, setTutorialExpanded] = useState(false)
  const related = useMemo(() => dishes.filter((item) => item.id !== dish.id).slice(0, 3), [dish.id])
  const isFavorite = favorites.includes(dish.id)
  const video = getDishVideo(dish)
  const cooking = searchParams.get('mode') === 'cook'

  useEffect(() => {
    setServings(1)
    setGuideMode('steps')
    setTutorialExpanded(false)
  }, [dish.id])

  const toggleSaved = () => {
    toggleFavorite(dish.id)
    setToast(isFavorite ? '已从“想吃清单”移除' : '已收藏到“想吃清单”')
  }

  if (cooking) return <CookingExperience dish={dish} onExit={() => navigate('/studio?mode=today')} />

  return (
    <main className="page detail-page detail-page--refined">
      <section className="detail-visual">
        <DishArtwork dish={dish} />
        <header className="detail-visual__bar"><button className="icon-button icon-button--glass" onClick={() => navigate(-1)} aria-label="返回上一页"><Icon name="arrow-left" /></button><span>菜谱详情</span><button className={`icon-button icon-button--glass favorite-button ${isFavorite ? 'is-active' : ''}`} onClick={toggleSaved} aria-label={isFavorite ? '取消收藏' : '收藏菜谱'} aria-pressed={isFavorite}><Icon name="heart" fill={isFavorite ? 'currentColor' : 'none'} /></button></header>
        <div className="detail-visual__caption"><span>{dish.region} · 今日推荐</span></div>
      </section>

      <section className="detail-intro">
        <div className="detail-intro__title"><div><span className="eyebrow">{dish.highlights.join(' · ')}</span><h1>{dish.name}</h1><p>{dish.subtitle}。一份刚好满足味蕾，也照顾今天的营养缺口。</p></div><div className="match-seal"><strong>94</strong><span>% 合拍</span></div></div>
        <div className="detail-facts">
          <div><Icon name="clock" /><span><strong>{dish.time} 分钟</strong><small>烹饪时间</small></span></div>
          <div><Icon name="chef" /><span><strong>{dish.difficulty}</strong><small>制作难度</small></span></div>
          <div><Icon name="flame" /><span><strong>{dish.nutrition.calories} kcal</strong><small>每人份</small></span></div>
        </div>
      </section>

      <section className="nutrition-card section-block">
        <div className="section-heading section-heading--compact"><h2>每份营养</h2><div className="portion-stepper"><button onClick={() => setServings(Math.max(0.5, servings - 0.5))} aria-label="减少菜谱份量"><Icon name="minus" /></button><strong aria-live="polite">{servings} 份</strong><button onClick={() => setServings(servings + 0.5)} aria-label="增加菜谱份量"><Icon name="plus" /></button></div></div>
        <div className="detail-nutrition-compact">
          {(Object.keys(nutritionLabels) as (keyof typeof nutritionLabels)[]).map((key) => (
            <div key={key}><span>{nutritionLabels[key][0]}</span><strong>{Math.round(dish.nutrition[key] * servings)}<small>{nutritionLabels[key][1]}</small></strong></div>
          ))}
        </div>
      </section>

      <section className="ingredients-section section-block">
        <div className="section-heading section-heading--compact"><h2>准备食材</h2><span className="result-meta">{dish.ingredients.length} 样 · {servings} 人份</span></div>
        <div className="ingredient-chips">{dish.ingredients.map((ingredient) => <span key={ingredient}><strong>{ingredient}</strong></span>)}</div>
      </section>

      <section className="steps-section section-block">
        <div className="section-heading section-heading--compact"><h2>跟着做</h2><span className="result-meta"><Icon name="clock" /> {dish.steps.length} 步 · {dish.time} min</span></div>
        <div className="recipe-mode-switch" role="tablist" aria-label="菜谱教程方式">
          <button type="button" role="tab" aria-selected={guideMode === 'steps'} className={guideMode === 'steps' ? 'is-active' : ''} onClick={() => setGuideMode('steps')}><Icon name="notebook" /> 图文步骤</button>
          <button type="button" role="tab" aria-selected={guideMode === 'video'} className={guideMode === 'video' ? 'is-active' : ''} onClick={() => setGuideMode('video')}><Icon name="play" /> 视频教程</button>
        </div>
        {guideMode === 'steps' ? <>
          <button type="button" className="recipe-guide-toggle" aria-expanded={tutorialExpanded} aria-controls="dish-picture-tutorial" onClick={() => setTutorialExpanded((value) => !value)}>
            <span><Icon name="notebook" /></span>
            <span><strong>图文教程</strong><small>{tutorialExpanded ? '图片与步骤已展开' : '按需展开，不占页面空间'}</small></span>
            <span>{tutorialExpanded ? '收起' : '展开'}<Icon name="chevron-right" /></span>
          </button>
          {tutorialExpanded && <div className="recipe-tutorial-panel" id="dish-picture-tutorial">
            <figure><img src={dish.image} alt={`${dish.name}成品与摆盘参考`} loading="lazy" style={{ objectFit: dish.imageFit || 'cover', objectPosition: dish.imagePosition || '50% 50%', backgroundColor: dish.accent }} /><figcaption><span>成品参考</span><small>{dish.photoCredit}</small></figcaption></figure>
            <ol className="recipe-steps">
              {dish.steps.map((step, index) => <li key={step}><span>{index + 1}</span><div><small>{index === 0 ? '准备' : index === dish.steps.length - 1 ? '完成' : '烹饪'}</small><p>{step}</p></div></li>)}
            </ol>
          </div>}
        </> : <div className="recipe-video-card">
          <span className="recipe-video-card__icon"><Icon name="play" /></span>
          <div><small>{video.platform} · 已匹配</small><strong>{video.title}</strong><p>{video.creator}</p></div>
          <a href={video.url} target="_blank" rel="noreferrer">打开视频 <Icon name="chevron-right" /></a>
        </div>}
      </section>

      <section className="chef-note"><span><Icon name="chef" /></span><div><small>吃了么小贴士</small><p>营养数据按常见食材用量估算。少油、少盐，能让这道菜更贴合你的今日目标。</p></div></section>

      <section className="related-section section-block"><div className="section-heading"><div><span className="eyebrow">换个口味</span><h2>也许你还喜欢</h2></div></div><div className="related-row">{related.map((item) => <button key={item.id} onClick={() => navigate(`/dish/${item.id}`)}><DishArtwork dish={item} compact /><strong>{item.name}</strong><small>{item.nutrition.calories} kcal</small></button>)}</div></section>

      <div className="detail-actionbar"><button className="button button--quiet" onClick={() => setMealDish(dish)}><Icon name="plus" /> 记入膳食</button><button className="button button--primary" onClick={() => openDelivery(dish)}><Icon name="bag" /> 叫个外卖</button></div>
      <AddMealSheet dish={mealDish} onClose={() => setMealDish(undefined)} onAdded={setToast} />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </main>
  )
}

function CookingExperience({ dish, onExit }: { dish: Dish; onExit: () => void }) {
  const { addRecord } = useApp()
  const video = getDishVideo(dish)
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [complete, setComplete] = useState(false)
  const [finished, setFinished] = useState(false)
  const [feedback, setFeedback] = useState<KitchenFeedback>()
  const [usedUpIds, setUsedUpIds] = useState<string[]>([])
  const pantry = useMemo(loadKitchenPantry, [])
  const activeCook = useMemo(() => {
    try {
      const value = JSON.parse(localStorage.getItem(activeCookStorageKey) || 'null') as { dishId?: number; pantryIds?: string[] } | null
      return value?.dishId === dish.id && Array.isArray(value.pantryIds) ? value : null
    } catch {
      return null
    }
  }, [dish.id])
  const usedPantry = useMemo(() => pantry.filter((item) => activeCook?.pantryIds?.includes(item.id) && dish.ingredients.some((ingredient) => {
    const left = item.name.replace(/\s/g, '')
    const right = ingredient.replace(/\s/g, '')
    return left.includes(right) || right.includes(left)
  })), [activeCook?.pantryIds, dish.ingredients, pantry])

  useEffect(() => {
    if (complete || finished) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [complete, finished])

  const elapsedCopy = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const mealType: MealType = new Date().getHours() < 10 ? 'breakfast' : new Date().getHours() < 16 ? 'lunch' : 'dinner'

  const finishCooking = () => {
    if (!feedback) return
    recordKitchenFeedback(dish, feedback)
    const usedIds = new Set(usedPantry.map((item) => item.id))
    const removedIds = new Set(usedUpIds)
    saveKitchenPantry(pantry.filter((item) => !removedIds.has(item.id)).map((item) => usedIds.has(item.id) ? { ...item, amount: 'low' as const, updatedAt: Date.now() } : item))
    addRecord(dish.id, mealType, 1)
    localStorage.removeItem(activeCookStorageKey)
    navigator.vibrate?.(12)
    setFinished(true)
  }

  if (finished) return (
    <main className="page cooking-page cooking-page--complete">
      <div className="cooking-finish-mark"><Icon name="check" /></div>
      <span>这一餐完成了</span>
      <h1>{dish.name}</h1>
      <p>已写入今日记录，味觉反馈和食材库存也已同步更新。</p>
      <div><span><small>用时</small><strong>{elapsedCopy}</strong></span><span><small>本次反馈</small><strong>{feedback === 'fit' ? '正合适' : feedback === 'light' ? '偏淡' : feedback === 'heavy' ? '偏重' : '不喜欢'}</strong></span></div>
      <button type="button" onClick={onExit}><Icon name="chef" />返回厨房</button>
    </main>
  )

  if (complete) return (
    <main className="page cooking-page cooking-page--feedback">
      <header><button type="button" onClick={() => setComplete(false)} aria-label="返回最后一步"><Icon name="arrow-left" /></button><span>完成这一餐</span><em>{elapsedCopy}</em></header>
      <section className="cooking-feedback-intro"><img src={dish.image} alt="" style={{ objectFit: dish.imageFit || 'cover', objectPosition: dish.imagePosition || '50% 50%', backgroundColor: dish.accent }} /><div><span>已经做好了吗？</span><h1>{dish.name}</h1><p>用一次轻反馈，让下一次推荐更合口味。</p></div></section>
      <section className="cooking-feedback-options"><h2>这次味道怎么样</h2><div>{([
        ['fit', '正合适', '保持这份口味'],
        ['light', '偏淡', '下次更有味道'],
        ['heavy', '偏重', '下次更清爽'],
        ['dislike', '不喜欢', '降低类似推荐'],
      ] as const).map(([value, label, note]) => <button type="button" className={feedback === value ? 'is-active' : ''} onClick={() => setFeedback(value)} aria-pressed={feedback === value} key={value}><span>{feedback === value && <Icon name="check" />}</span><strong>{label}</strong><small>{note}</small></button>)}</div></section>
      {usedPantry.length > 0 && <section className="cooking-inventory-check"><header><div><span>食材库存</span><h2>哪些已经用完</h2></div><small>未勾选的会标记为“建议先用”</small></header><div>{usedPantry.map((item) => <button type="button" className={usedUpIds.includes(item.id) ? 'is-active' : ''} onClick={() => setUsedUpIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} aria-pressed={usedUpIds.includes(item.id)} key={item.id}><span>{usedUpIds.includes(item.id) && <Icon name="check" />}</span><strong>{item.name}</strong></button>)}</div></section>}
      <button type="button" className="cooking-finish-button" disabled={!feedback} onClick={finishCooking}><Icon name="check" />完成并写入记录</button>
    </main>
  )

  return (
    <main className="page cooking-page">
    <section className="cooking-visual"><img src={dish.image} alt={dish.imageAlt} style={{ objectFit: dish.imageFit || 'cover', objectPosition: dish.imagePosition || '50% 50%', backgroundColor: dish.accent }} /><div /><header><button type="button" onClick={onExit} aria-label="退出做饭模式"><Icon name="arrow-left" /></button><span>正在做 · {dish.name}</span><em>{elapsedCopy}</em></header><div className="cooking-progress"><span style={{ width: `${(step + 1) / dish.steps.length * 100}%` }} /></div></section>
      <section className="cooking-step"><header><div><span>STEP {String(step + 1).padStart(2, '0')}</span><small>{step === 0 ? '准备' : step === dish.steps.length - 1 ? '完成' : '烹饪'}</small></div><strong>{step + 1}<small>/{dish.steps.length}</small></strong></header><p>{dish.steps[step]}</p><div><span><Icon name="clock" />总预计 {dish.time} 分钟</span><a href={video.url} target="_blank" rel="noreferrer"><Icon name="play" />查看对应视频</a></div></section>
      <section className="cooking-next-preview">{step < dish.steps.length - 1 ? <><span>下一步</span><p>{dish.steps[step + 1]}</p></> : <><span>最后一步</span><p>确认成熟度与味道，准备装盘。</p></>}</section>
      <div className="cooking-controls"><button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><Icon name="arrow-left" />上一步</button>{step < dish.steps.length - 1 ? <button type="button" className="is-primary" onClick={() => setStep((value) => Math.min(dish.steps.length - 1, value + 1))}>下一步 <Icon name="chevron-right" /></button> : <button type="button" className="is-primary" onClick={() => setComplete(true)}><Icon name="check" />完成做饭</button>}</div>
    </main>
  )
}
