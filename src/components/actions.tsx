import { useEffect, useState } from 'react'
import { mealLabels } from '../data/dishes'
import { useApp } from '../context/AppContext'
import type { Dish, MealType } from '../types'
import { Icon } from './Icon'
import { DishArtwork, Sheet } from './ui'

export function AddMealSheet({ dish, onClose, onAdded, recordDate }: { dish?: Dish; onClose: () => void; onAdded: (message: string) => void; recordDate?: string }) {
  const { addRecord } = useApp()
  const [mealType, setMealType] = useState<MealType>(() => {
    const hour = new Date().getHours()
    if (hour < 10) return 'breakfast'
    if (hour < 15) return 'lunch'
    if (hour < 21) return 'dinner'
    return 'snack'
  })
  const [servings, setServings] = useState(1)
  useEffect(() => {
    const hour = new Date().getHours()
    setMealType(hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 21 ? 'dinner' : 'snack')
    setServings(1)
  }, [dish?.id])
  if (!dish) return null

  const submit = () => {
    addRecord(dish.id, mealType, servings, recordDate)
    const dateLabel = recordDate ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(`${recordDate}T12:00:00`)) : '今日'
    onAdded(`${dish.name}已加入${dateLabel}${mealLabels[mealType]}`)
    onClose()
  }

  return (
    <Sheet open title="记下这一餐" onClose={onClose}>
      <div className="add-meal-summary">
        <DishArtwork dish={dish} compact />
        <div><strong>{dish.name}</strong><p>每份约 {dish.nutrition.calories} kcal · 蛋白质 {dish.nutrition.protein}g</p></div>
      </div>
      <label className="field-label">餐次</label>
      <div className="segmented">
        {(Object.entries(mealLabels) as [MealType, string][]).map(([key, label]) => (
          <button className={mealType === key ? 'is-active' : ''} onClick={() => setMealType(key)} key={key}>{label}</button>
        ))}
      </div>
      <div className="serving-control">
        <div><label>份量</label><span>按一人份估算</span></div>
        <div><button onClick={() => setServings(Math.max(0.5, servings - 0.5))} aria-label="减少份量"><Icon name="minus" /></button><strong>{servings} 份</strong><button onClick={() => setServings(servings + 0.5)} aria-label="增加份量"><Icon name="plus" /></button></div>
      </div>
      <button className="button button--primary button--block" onClick={submit}><Icon name="plus" /> {recordDate ? '加入所选日期' : '加入今日膳食'}</button>
    </Sheet>
  )
}
