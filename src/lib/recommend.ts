import { dishes } from '../data/dishes'
import { cuisineProfileFor, regionalDishAffinity } from '../data/regionalCuisine'
import type { Deficit, Dish, Nutrition, RecommendationProfile, SearchResult, TasteTag } from '../types'

const tasteSynonyms: Record<TasteTag, string[]> = {
  酸甜: ['酸甜', '酸酸甜甜', '酸', '甜', '番茄', '柠檬'],
  麻辣: ['麻辣', '麻', '川味', '重口'],
  咸鲜: ['咸鲜', '鲜', '鲜美', '海鲜'],
  清淡: ['清淡', '清爽', '轻食'],
  辣: ['辣', '微辣', '香辣', '开胃'],
  香: ['香', '浓郁', '锅气'],
}

const constraintSynonyms: Record<string, string[]> = {
  高蛋白: ['高蛋白', '蛋白质', '增肌', '健身'],
  低脂: ['低脂', '减脂', '不油', '少油', '轻盈'],
  高纤维: ['高纤维', '纤维', '蔬菜', '通便'],
  多蔬菜: ['多蔬菜', '蔬菜', '素菜'],
  快手: ['快手', '快速', '省时', '简单'],
}

const compact = (value: string) => value.toLowerCase().replace(/[\s，。！？、,.!?]/g, '')

export function parseQuery(query: string, selected: TasteTag[] = []) {
  const text = compact(query)
  const tastes = new Set<TasteTag>(selected)
  const ingredients = new Set<string>()
  const constraints = new Set<string>()

  Object.entries(tasteSynonyms).forEach(([taste, words]) => {
    if (words.some((word) => text.includes(word))) tastes.add(taste as TasteTag)
  })

  dishes.flatMap((dish) => dish.ingredients).forEach((ingredient) => {
    if (text.includes(ingredient.toLowerCase())) ingredients.add(ingredient)
  })

  if (text.includes('鱼')) ingredients.add('鱼')
  if (text.includes('鸡') && !text.includes('鸡蛋')) ingredients.add('鸡肉')
  if (text.includes('牛')) ingredients.add('牛肉')

  Object.entries(constraintSynonyms).forEach(([constraint, words]) => {
    if (words.some((word) => text.includes(word))) constraints.add(constraint)
  })

  return { tastes: [...tastes], ingredients: [...ingredients], constraints: [...constraints] }
}

const matchesIngredient = (dish: Dish, searchIngredient: string) =>
  dish.ingredients.some((ingredient) => {
    if (searchIngredient === '鸡肉') return ingredient.includes('鸡') && !ingredient.includes('鸡蛋')
    if (searchIngredient === '牛肉') return ingredient.includes('牛')
    return ingredient.includes(searchIngredient) || searchIngredient.includes(ingredient)
  })

export function searchDishes(query: string, selected: TasteTag[] = [], profile?: RecommendationProfile): SearchResult[] {
  const parsed = parseQuery(query, selected)
  const hasIntent = parsed.tastes.length + parsed.ingredients.length + parsed.constraints.length > 0
  const ingredientMatches = parsed.ingredients.length
    ? dishes.filter((dish) => parsed.ingredients.some((ingredient) => matchesIngredient(dish, ingredient)))
    : []
  const candidates = ingredientMatches.length ? ingredientMatches : dishes

  return candidates
    .map((dish, index) => {
      const explicitTasteScore = parsed.tastes.length
        ? parsed.tastes.reduce((sum, taste) => sum + (dish.tastes[taste] || 0), 0) / parsed.tastes.length
        : 0
      const dnaEntries = profile ? Object.entries(profile.tasteDna) as Array<[TasteTag, number]> : []
      const dnaWeight = dnaEntries.reduce((sum, [, value]) => sum + value, 0) || 1
      const dnaTasteScore = dnaEntries.length
        ? dnaEntries.reduce((sum, [taste, value]) => sum + (dish.tastes[taste] || .34) * value, 0) / dnaWeight
        : 0.76 - index * 0.015
      const tasteScore = parsed.tastes.length ? explicitTasteScore * .78 + dnaTasteScore * .22 : dnaTasteScore
      const ingredientHits = parsed.ingredients.filter((ingredient) => matchesIngredient(dish, ingredient)).length
      const ingredientScore = parsed.ingredients.length ? ingredientHits / parsed.ingredients.length : 1
      const constraintHits = parsed.constraints.filter((constraint) => dish.constraints.includes(constraint)).length
      const constraintScore = parsed.constraints.length ? constraintHits / parsed.constraints.length : 1
      const hometownScore = regionalDishAffinity(dish, profile?.hometown || null)
      // A small confidence floor reflects successful intent parsing; ingredient and
      // nutrition matches carry more weight than a missing explicit taste adjective.
      const score = hasIntent
        ? 0.14 + tasteScore * 0.28 + ingredientScore * 0.28 + constraintScore * 0.22 + hometownScore * 0.08
        : tasteScore * 0.72 + hometownScore * 0.18 + Math.max(.5, .82 - index * .02) * .1
      const reasons: string[] = []

      const bestTaste = parsed.tastes
        .filter((taste) => (dish.tastes[taste] || 0) >= 0.55)
        .sort((a, b) => (dish.tastes[b] || 0) - (dish.tastes[a] || 0))[0]
      if (bestTaste) reasons.push(`${bestTaste}很合拍`)
      if (ingredientHits) reasons.push(`含你想吃的${parsed.ingredients.find((item) => matchesIngredient(dish, item))}`)
      const cuisine = cuisineProfileFor(profile?.hometown || null)
      if (profile?.hometown && cuisine && hometownScore >= .72) reasons.push(`${cuisine.cuisine}风味参考`)
      if (constraintHits) reasons.push(parsed.constraints.find((item) => dish.constraints.includes(item)) || '')
      if (!reasons.length) reasons.push(dish.highlights[0])

      return { dish, score: Math.max(0.38, Math.min(0.98, score)), reasons: reasons.filter(Boolean) }
    })
    .sort((a, b) => b.score - a.score)
}

export function calculateDeficits(intake: Nutrition, target: Nutrition): Deficit[] {
  const labels: Record<keyof Nutrition, { label: string; suggestion: string }> = {
    calories: { label: '能量空间充足', suggestion: '可以安排一顿均衡正餐' },
    protein: { label: '蛋白质略低', suggestion: '优先补充鱼、虾、鸡胸或豆制品' },
    fat: { label: '优质脂肪不足', suggestion: '适量搭配坚果或牛油果' },
    carbs: { label: '主食摄入不足', suggestion: '选择全谷物与薯类主食' },
    fiber: { label: '蔬菜摄入不足', suggestion: '增加深色蔬菜、菌菇和全谷物' },
  }

  return (Object.keys(target) as (keyof Nutrition)[])
    .map((key) => ({
      key,
      ...labels[key],
      current: intake[key],
      target: target[key],
      ratio: intake[key] / target[key],
    }))
    .filter((item) => item.ratio < (item.key === 'calories' ? 0.92 : 0.82))
    .sort((a, b) => a.ratio - b.ratio)
}

export function deficitRecommendations(deficits: Deficit[], taste?: TasteTag): SearchResult[] {
  const priorityTags = new Set<string>()
  deficits.forEach((deficit) => {
    if (deficit.key === 'protein') priorityTags.add('高蛋白')
    if (deficit.key === 'fiber') {
      priorityTags.add('高纤维')
      priorityTags.add('多蔬菜')
    }
  })

  return dishes
    .map((dish) => {
      const nutritionHits = dish.constraints.filter((item) => priorityTags.has(item)).length
      const tasteScore = taste ? dish.tastes[taste] || 0 : 0.68
      const score = Math.min(0.98, 0.55 + nutritionHits * 0.13 + tasteScore * 0.18)
      const reasons = dish.highlights.filter((item) => /蛋白|纤维|蔬菜/.test(item)).slice(0, 2)
      return { dish, score, reasons: reasons.length ? reasons : [dish.highlights[0]] }
    })
    .sort((a, b) => b.score - a.score)
}
