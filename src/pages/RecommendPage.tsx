import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { OnlineDishResults } from '../components/OnlineDishResults'
import { DishCard, Sheet, Toast } from '../components/ui'
import { useApp } from '../context/AppContext'
import { tasteTags } from '../data/dishes'
import { openDelivery } from '../lib/delivery'
import { deficitRecommendations } from '../lib/recommend'
import type { TasteTag } from '../types'

export function RecommendPage() {
  const navigate = useNavigate()
  const { deficits } = useApp()
  const [taste, setTaste] = useState<TasteTag>()
  const [tunerOpen, setTunerOpen] = useState(false)
  const [toast, setToast] = useState('')
  const results = useMemo(() => deficitRecommendations(deficits, taste).slice(0, 5), [deficits, taste])
  const primary = deficits.find((item) => item.key === 'fiber' || item.key === 'protein')

  return (
    <main className="page recommend-page">
      <header className="detail-topbar">
        <button className="icon-button" onClick={() => navigate(-1)} aria-label="返回上一页"><Icon name="arrow-left" /></button>
        <span>营养缺口推荐</span>
        <button className="icon-button" onClick={() => setTunerOpen(true)} aria-label="调整推荐口味"><Icon name="sliders" /></button>
      </header>

      <section className="recommend-hero">
        <div className="recommend-hero__icon"><Icon name="target" /><span /></div>
        <span className="eyebrow">口味 × 营养双引擎</span>
        <h1>{primary ? <>今天重点补充<br /><em>{primary.key === 'fiber' ? '膳食纤维' : primary.key === 'protein' ? '优质蛋白' : primary.label}</em></> : <>今天营养不错<br /><em>继续均衡搭配</em></>}</h1>
        <p>{primary?.suggestion || '为你挑了几道口味合拍、营养互补的菜。'}</p>
        <div className="deficit-meter"><span style={{ width: `${Math.min((primary?.ratio || 0.72) * 100, 100)}%` }} /><strong>{Math.round(primary?.current || 18)} / {primary?.target || 25}{primary?.key === 'calories' ? 'kcal' : 'g'}</strong></div>
      </section>

      <section className="recommend-controls">
        <div><span>口味微调</span><strong>{taste || '保持我的常用偏好'}</strong></div>
        <button onClick={() => setTunerOpen(true)}>调整 <Icon name="sliders" /></button>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">智能补给清单</span><h2>适合你现在吃</h2></div><span className="result-meta">{results.length} 道</span></div>
        <div className="dish-list">{results.map((result) => <DishCard result={result} onDelivery={openDelivery} key={result.dish.id} />)}</div>
      </section>

      <OnlineDishResults query={`${primary?.label || '均衡营养'} ${taste || ''} 菜谱`} context="nutrition" />

      <Sheet open={tunerOpen} title="想把口味调到哪边？" onClose={() => setTunerOpen(false)}>
        <p className="sheet-intro">营养目标不变，只调整推荐菜品的味觉方向。</p>
        <div className="taste-grid">
          {tasteTags.map((item, index) => <button className={taste === item ? 'is-active' : ''} key={item} onClick={() => setTaste(item)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong><small>{item === '清淡' ? '轻盈不腻' : item === '麻辣' ? '过瘾有劲' : '刚好合拍'}</small></button>)}
        </div>
        <button className="button button--primary button--block" onClick={() => { setTunerOpen(false); setToast(taste ? `推荐已按“${taste}”重新排序` : '已保持常用口味偏好') }}><Icon name="check" /> 应用口味</button>
      </Sheet>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </main>
  )
}
