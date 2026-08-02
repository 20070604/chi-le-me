import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { getOnlineDishById, getOnlineDishImage, loadOnlineDishLibrary, loadOnlineRecipeDetails, type OnlineDishResult } from '../lib/onlineSearch'
import { openDelivery } from '../lib/delivery'
import type { Dish } from '../types'

const nutritionLabels = {
  protein: ['蛋白质', 'g'],
  fat: ['脂肪', 'g'],
  carbs: ['碳水', 'g'],
  fiber: ['纤维', 'g'],
} as const

const fallbackNutrition = { calories: 420, protein: 24, fat: 15, carbs: 48, fiber: 6 }

export function OnlineRecipePage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  let recipeId = id
  try { recipeId = decodeURIComponent(id) } catch { /* React Router may already have decoded the id. */ }
  const cachedRecipe = getOnlineDishById(recipeId)
  const [recipe, setRecipe] = useState<OnlineDishResult | undefined>(cachedRecipe)
  const [loading, setLoading] = useState(Boolean(cachedRecipe && (!cachedRecipe.steps?.length || !cachedRecipe.nutrition)))
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [servings, setServings] = useState(1)
  const [guideMode, setGuideMode] = useState<'steps' | 'video'>('steps')
  const [tutorialExpanded, setTutorialExpanded] = useState(true)

  useEffect(() => {
    if (!cachedRecipe) return
    const controller = new AbortController()
    setRecipe(cachedRecipe)
    setLoading(true)
    setFailed(false)
    loadOnlineRecipeDetails(cachedRecipe, controller.signal).then((details) => {
      if (!controller.signal.aborted) setRecipe(details)
    }).catch((error) => {
      if (!(error instanceof DOMException && error.name === 'AbortError') && !controller.signal.aborted) setFailed(true)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cachedRecipe?.id, retry])

  const related = useMemo(() => loadOnlineDishLibrary(20).filter((item) => item.id !== recipe?.id).slice(0, 3), [recipe?.id])
  const temporaryDish = useMemo(() => recipe ? toTemporaryDish(recipe) : undefined, [recipe])

  if (!recipe) return (
    <main className="page online-recipe-page online-recipe-page--missing">
      <span><Icon name="compass" /></span>
      <small>菜谱缓存已失效</small>
      <h1>回到首页重新找一道</h1>
      <p>当前设备里没有找到这道菜，请重新搜索。</p>
      <button type="button" onClick={() => navigate('/taste')}><Icon name="arrow-left" />返回首页</button>
    </main>
  )

  const nutrition = recipe.nutrition || fallbackNutrition
  const ingredients = recipe.ingredients || []
  const steps = recipe.steps || []
  const highlights = recipe.highlights?.length ? recipe.highlights : ['真实菜谱', '好执行']

  return (
    <main className="page detail-page detail-page--refined online-detail-page">
      <section className="detail-visual online-detail-visual">
        <img src={getOnlineDishImage(recipe.name, recipe.imageUrl)} alt={`${recipe.name}成品图片`} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getOnlineDishImage(recipe.name) }} />
        <header className="detail-visual__bar"><button className="icon-button icon-button--glass" onClick={() => navigate(-1)} aria-label="返回上一页"><Icon name="arrow-left" /></button><span>菜谱详情</span><i aria-hidden="true" /></header>
        <div className="detail-visual__caption"><span>{recipe.region || '家常风味'} · 今日推荐</span></div>
      </section>

      <section className="detail-intro">
        <div className="detail-intro__title"><div><span className="eyebrow">{highlights.join(' · ')}</span><h1>{recipe.name}</h1><p>{recipe.summary}。一份刚好满足味蕾，也照顾今天的营养缺口。</p></div><div className="match-seal"><strong>94</strong><span>% 合拍</span></div></div>
        <div className="detail-facts">
          <div><Icon name="clock" /><span><strong>{recipe.timeMinutes || 30} 分钟</strong><small>烹饪时间</small></span></div>
          <div><Icon name="chef" /><span><strong>{recipe.difficulty || '适中'}</strong><small>制作难度</small></span></div>
          <div><Icon name="flame" /><span><strong>{nutrition.calories} kcal</strong><small>每人份</small></span></div>
        </div>
      </section>

      {loading && <div className="online-detail-status" role="status" aria-live="polite"><i /><span><strong>正在补全这道菜</strong><small>同步食材、营养与图文教程</small></span></div>}
      {!loading && failed && <button type="button" className="online-detail-status online-detail-status--retry" onClick={() => setRetry((value) => value + 1)}><Icon name="refresh" /><span><strong>教程暂时没有同步完成</strong><small>点击重新获取</small></span></button>}

      <section className="nutrition-card section-block">
        <div className="section-heading section-heading--compact"><h2>每份营养</h2><div className="portion-stepper"><button onClick={() => setServings(Math.max(0.5, servings - 0.5))} aria-label="减少菜谱份量"><Icon name="minus" /></button><strong aria-live="polite">{servings} 份</strong><button onClick={() => setServings(servings + 0.5)} aria-label="增加菜谱份量"><Icon name="plus" /></button></div></div>
        <div className="detail-nutrition-compact">
          {(Object.keys(nutritionLabels) as (keyof typeof nutritionLabels)[]).map((key) => <div key={key}><span>{nutritionLabels[key][0]}</span><strong>{Math.round(nutrition[key] * servings)}<small>{nutritionLabels[key][1]}</small></strong></div>)}
        </div>
      </section>

      <section className="ingredients-section section-block">
        <div className="section-heading section-heading--compact"><h2>准备食材</h2><span className="result-meta">{ingredients.length} 样 · {servings} 人份</span></div>
        <div className="ingredient-chips online-ingredient-chips">{ingredients.map((ingredient) => <span key={`${ingredient.name}-${ingredient.amount || ''}`}><strong>{ingredient.name}</strong><small>{ingredient.amount || '适量'}</small></span>)}</div>
      </section>

      <section className="steps-section section-block">
        <div className="section-heading section-heading--compact"><h2>跟着做</h2><span className="result-meta"><Icon name="clock" /> {steps.length} 步 · {recipe.timeMinutes || 30} min</span></div>
        <div className="recipe-mode-switch" role="tablist" aria-label="菜谱教程方式">
          <button type="button" role="tab" aria-selected={guideMode === 'steps'} className={guideMode === 'steps' ? 'is-active' : ''} onClick={() => setGuideMode('steps')}><Icon name="notebook" /> 图文步骤</button>
          <button type="button" role="tab" aria-selected={guideMode === 'video'} className={guideMode === 'video' ? 'is-active' : ''} onClick={() => setGuideMode('video')}><Icon name="play" /> 视频教程</button>
        </div>
        {guideMode === 'steps' ? <>
          <button type="button" className="recipe-guide-toggle" aria-expanded={tutorialExpanded} aria-controls="online-picture-tutorial" onClick={() => setTutorialExpanded((value) => !value)}>
            <span><Icon name="notebook" /></span>
            <span><strong>图文教程</strong><small>{tutorialExpanded ? '图片与步骤已展开' : '点击展开完整步骤'}</small></span>
            <span>{tutorialExpanded ? '收起' : '展开'}<Icon name="chevron-right" /></span>
          </button>
          {tutorialExpanded && <div className="recipe-tutorial-panel" id="online-picture-tutorial">
            <figure><img src={getOnlineDishImage(recipe.name, recipe.imageUrl)} alt={`${recipe.name}成品参考`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getOnlineDishImage(recipe.name) }} /><figcaption><span>成品参考</span></figcaption></figure>
            {steps.length > 0 ? <ol className="recipe-steps online-recipe-steps-list">
              {steps.map((step, index) => <li key={`${index}-${step.text}`}><span>{index + 1}</span><div>{step.imageUrl && <img src={step.imageUrl} alt={`${recipe.name}步骤${index + 1}`} loading="lazy" referrerPolicy="no-referrer" />}<small>{index === 0 ? '准备' : index === steps.length - 1 ? '完成' : '烹饪'}</small><p>{step.text}</p></div></li>)}
            </ol> : !loading && <div className="online-tutorial-empty"><Icon name="notebook" /><strong>教程还没有同步完成</strong><button type="button" onClick={() => setRetry((value) => value + 1)}>重新获取</button></div>}
          </div>}
        </> : recipe.video ? <div className="online-recipe-video"><iframe src={recipe.video.embedUrl} title={`${recipe.name}视频教程`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" /><div><small>已匹配视频教程</small><strong>{recipe.video.title}</strong></div></div> : <div className="online-tutorial-empty"><Icon name="play" /><strong>暂未匹配到合适视频</strong><span>图文教程已经可以完整跟做</span></div>}
      </section>

        <section className="chef-note"><span><Icon name="chef" /></span><div><small>吃了么小贴士</small><p>{recipe.tips || '营养数据按常见食材用量估算。实际火候与调味请根据食材状态灵活调整。'}</p></div></section>

      {related.length > 0 && <section className="related-section section-block"><div className="section-heading"><div><span className="eyebrow">换个口味</span><h2>也许你还喜欢</h2></div></div><div className="related-row online-related-row">{related.map((item) => <button key={item.id} onClick={() => navigate(`/recipe/${encodeURIComponent(item.id)}`)}><img src={getOnlineDishImage(item.name, item.imageUrl)} alt={`${item.name}菜品图片`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getOnlineDishImage(item.name) }} /><strong>{item.name}</strong><small>{item.nutrition?.calories || '—'} kcal</small></button>)}</div></section>}

      <div className="detail-actionbar"><button className="button button--quiet" onClick={() => navigate(-1)}><Icon name="arrow-left" /> 返回推荐</button><button className="button button--primary" disabled={!temporaryDish} onClick={() => temporaryDish && openDelivery(temporaryDish)}><Icon name="bag" /> 叫个外卖</button></div>
    </main>
  )
}

function toTemporaryDish(recipe: OnlineDishResult): Dish {
  const nutrition = recipe.nutrition || fallbackNutrition
  return {
    id: 900_000 + hashString(recipe.id) % 90_000,
    name: recipe.name,
    subtitle: recipe.summary,
    image: getOnlineDishImage(recipe.name, recipe.imageUrl),
    imageAlt: `${recipe.name}成品图片`,
    photoCredit: recipe.sourceSite,
    photoUrl: recipe.sourceUrl,
    emoji: '🍽️',
    colors: ['#e9ebf2', '#5e6d9c'],
    accent: '#5e6d9c',
    region: recipe.region || '家常风味',
    time: recipe.timeMinutes || 30,
    difficulty: recipe.difficulty || '适中',
    tastes: {},
    ingredients: (recipe.ingredients || []).map((item) => `${item.name}${item.amount ? ` ${item.amount}` : ''}`),
    constraints: [],
    nutrition,
    highlights: recipe.highlights || ['真实菜谱', '好执行'],
    steps: (recipe.steps || []).map((item) => item.text),
  }
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  return Math.abs(hash)
}
