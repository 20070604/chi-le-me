import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { Dish, SearchResult } from '../types'
import { Icon } from './Icon'

export function DishArtwork({ dish, compact = false }: { dish: Dish; compact?: boolean }) {
  const contained = dish.imageFit === 'contain'
  return (
    <figure className={`dish-art ${contained ? 'dish-art--contained' : ''} ${compact ? 'dish-art--compact' : ''}`} style={{ backgroundColor: dish.accent }}>
      {contained && <img className="dish-art__backdrop" src={dish.image} alt="" aria-hidden="true" />}
      <img className="dish-art__image" src={dish.image} alt={dish.imageAlt} loading="lazy" width="960" height="720" style={{ objectFit: contained ? 'contain' : 'cover', objectPosition: dish.imagePosition || '50% 50%' }} />
      <span className="dish-art__wash" aria-hidden="true" />
      {!compact && <figcaption>{dish.photoCredit}</figcaption>}
    </figure>
  )
}

export function DishCard({ result, onDelivery, compact = false }: { result: SearchResult; onDelivery: (dish: Dish) => void; compact?: boolean }) {
  const navigate = useNavigate()
  const { dish, score, reasons } = result
  return (
    <article className={`dish-card ${compact ? 'dish-card--compact' : ''}`}>
      <button className="dish-card__art-button" onClick={() => navigate(`/dish/${dish.id}`)} aria-label={`查看${dish.name}`}>
        <DishArtwork dish={dish} compact={compact} />
        <span className="score-pill">{Math.round(score * 100)}% 合拍</span>
      </button>
      <div className="dish-card__content">
        <div className="dish-card__heading">
          <div><span className="eyebrow">{dish.region} · {dish.time} 分钟</span><h3>{dish.name}</h3></div>
          <button className="round-link" onClick={() => navigate(`/dish/${dish.id}`)} aria-label="查看详情"><Icon name="chevron-right" /></button>
        </div>
        <p>{dish.subtitle}</p>
        <div className="tag-row">
          {reasons.slice(0, 2).map((reason) => <span className="soft-tag" key={reason}>{reason}</span>)}
          <span className="soft-tag soft-tag--green">{dish.nutrition.protein}g 蛋白质</span>
        </div>
        <div className="dish-card__actions">
          <button className="button button--quiet" onClick={() => navigate(`/dish/${dish.id}`)}><Icon name="chef" /> 看菜谱</button>
          <button className="button button--ink" onClick={() => onDelivery(dish)}><Icon name="bag" /> 点外卖</button>
        </div>
      </div>
    </article>
  )
}

export function NutritionRing({ value, target, label, unit, color, size = 'large' }: { value: number; target: number; label: string; unit: string; color: string; size?: 'large' | 'small' }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / target, 1)
  return (
    <div className={`nutrition-ring nutrition-ring--${size}`}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label} ${Math.round(value)}${unit}`}>
        <circle className="nutrition-ring__track" cx="50" cy="50" r={radius} />
        <circle className="nutrition-ring__value" cx="50" cy="50" r={radius} style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: circumference * (1 - progress) }} />
      </svg>
      <div className="nutrition-ring__text"><strong>{Math.round(value)}</strong><small>{unit}</small></div>
      <span>{label}</span>
      <em>{Math.round(progress * 100)}%</em>
    </div>
  )
}

export function Sheet({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="sheet-backdrop" aria-label="关闭" onClick={onClose} />
      <section className="sheet">
        <div className="sheet__handle" />
        <header><div><span className="eyebrow">CHI LE ME</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭弹层"><Icon name="close" /></button></header>
        {children}
      </section>
    </div>,
    document.body,
  )
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(timer)
  }, [onDone])
  return <div className="toast" role="status" aria-live="polite"><span><Icon name="check" /></span>{message}</div>
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`}><Icon name="compass" /><div><strong>吃了么</strong>{!compact && <small>CHI LE ME</small>}</div></div>
}
