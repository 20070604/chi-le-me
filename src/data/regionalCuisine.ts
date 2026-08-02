import type { Dish, HometownSelection, TasteTag } from '../types'

export interface RegionalCuisineProfile {
  cuisine: string
  tasteBias: Partial<Record<TasteTag, number>>
  dishRegions: string[]
  signatureDishes: string[]
  sourceUrl: string
}

const nationalGuide = 'https://www.nia.gov.cn/2022cn/files/basic-html/page29.html'
const eightCuisines = 'https://english.scio.gov.cn/m/featured/chinakeywords/2024-08/30/content_117397262.htm'

export const regionalCuisineProfiles: Record<string, RegionalCuisineProfile> = {
  '11': { cuisine: '京菜', tasteBias: { 咸鲜: .9, 香: .82 }, dishRegions: ['家常'], signatureDishes: ['北京烤鸭', '炸酱面', '涮羊肉'], sourceUrl: nationalGuide },
  '12': { cuisine: '津菜', tasteBias: { 咸鲜: .86, 香: .8 }, dishRegions: ['家常'], signatureDishes: ['罾蹦鲤鱼', '煎饼馃子', '贴饽饽熬小鱼'], sourceUrl: nationalGuide },
  '13': { cuisine: '冀菜', tasteBias: { 咸鲜: .88, 香: .78 }, dishRegions: ['家常'], signatureDishes: ['金毛狮子鱼', '驴肉火烧', '莜面窝窝'], sourceUrl: nationalGuide },
  '14': { cuisine: '晋菜', tasteBias: { 咸鲜: .84, 酸甜: .72, 香: .8 }, dishRegions: ['家常'], signatureDishes: ['过油肉', '刀削面', '平遥牛肉'], sourceUrl: nationalGuide },
  '15': { cuisine: '蒙餐', tasteBias: { 咸鲜: .9, 香: .92 }, dishRegions: ['家常'], signatureDishes: ['手把肉', '烤羊腿', '奶豆腐'], sourceUrl: nationalGuide },
  '21': { cuisine: '辽菜', tasteBias: { 咸鲜: .9, 香: .82 }, dishRegions: ['家常'], signatureDishes: ['锅包肉', '小鸡炖蘑菇', '沟帮子熏鸡'], sourceUrl: nationalGuide },
  '22': { cuisine: '吉菜', tasteBias: { 咸鲜: .88, 香: .84 }, dishRegions: ['家常'], signatureDishes: ['白肉血肠', '人参鸡', '朝鲜族冷面'], sourceUrl: nationalGuide },
  '23': { cuisine: '龙江菜', tasteBias: { 咸鲜: .9, 香: .86 }, dishRegions: ['家常'], signatureDishes: ['得莫利炖鱼', '锅包肉', '地三鲜'], sourceUrl: nationalGuide },
  '31': { cuisine: '本帮菜', tasteBias: { 酸甜: .84, 咸鲜: .82 }, dishRegions: ['家常'], signatureDishes: ['红烧肉', '腌笃鲜', '八宝鸭'], sourceUrl: nationalGuide },
  '32': { cuisine: '苏菜', tasteBias: { 咸鲜: .86, 清淡: .82 }, dishRegions: ['家常'], signatureDishes: ['清炖蟹粉狮子头', '盐水鸭', '松鼠鳜鱼'], sourceUrl: eightCuisines },
  '33': { cuisine: '浙菜', tasteBias: { 清淡: .9, 咸鲜: .82 }, dishRegions: ['家常'], signatureDishes: ['西湖醋鱼', '龙井虾仁', '东坡肉'], sourceUrl: eightCuisines },
  '34': { cuisine: '徽菜', tasteBias: { 咸鲜: .9, 香: .82 }, dishRegions: ['家常'], signatureDishes: ['臭鳜鱼', '毛豆腐', '问政山笋'], sourceUrl: eightCuisines },
  '35': { cuisine: '闽菜', tasteBias: { 咸鲜: .9, 清淡: .8, 酸甜: .7 }, dishRegions: ['粤味', '家常'], signatureDishes: ['佛跳墙', '荔枝肉', '沙县拌面'], sourceUrl: eightCuisines },
  '36': { cuisine: '赣菜', tasteBias: { 辣: .88, 咸鲜: .84, 香: .86 }, dishRegions: ['湘味', '家常'], signatureDishes: ['三杯鸡', '藜蒿炒腊肉', '瓦罐汤'], sourceUrl: nationalGuide },
  '37': { cuisine: '鲁菜', tasteBias: { 咸鲜: .94, 香: .82 }, dishRegions: ['家常'], signatureDishes: ['糖醋鲤鱼', '葱烧海参', '九转大肠'], sourceUrl: eightCuisines },
  '41': { cuisine: '豫菜', tasteBias: { 咸鲜: .9, 香: .82 }, dishRegions: ['家常'], signatureDishes: ['烩面', '鲤鱼焙面', '胡辣汤'], sourceUrl: nationalGuide },
  '42': { cuisine: '鄂菜', tasteBias: { 咸鲜: .88, 香: .84, 辣: .7 }, dishRegions: ['家常', '湘味'], signatureDishes: ['清蒸武昌鱼', '排骨藕汤', '沔阳三蒸'], sourceUrl: nationalGuide },
  '43': { cuisine: '湘菜', tasteBias: { 辣: .96, 香: .94, 咸鲜: .84 }, dishRegions: ['湘味'], signatureDishes: ['剁椒鱼头', '辣椒炒肉', '腊味合蒸'], sourceUrl: eightCuisines },
  '44': { cuisine: '粤菜', tasteBias: { 清淡: .9, 咸鲜: .92, 香: .74 }, dishRegions: ['粤味'], signatureDishes: ['白切鸡', '烧鹅', '清蒸鱼'], sourceUrl: eightCuisines },
  '45': { cuisine: '桂菜', tasteBias: { 酸甜: .82, 辣: .82, 香: .88 }, dishRegions: ['湘味', '家常'], signatureDishes: ['螺蛳粉', '柠檬鸭', '啤酒鱼'], sourceUrl: nationalGuide },
  '46': { cuisine: '琼菜', tasteBias: { 清淡: .88, 咸鲜: .9 }, dishRegions: ['粤味'], signatureDishes: ['文昌鸡', '和乐蟹', '东山羊'], sourceUrl: nationalGuide },
  '50': { cuisine: '渝菜', tasteBias: { 麻辣: .98, 辣: .94, 香: .94 }, dishRegions: ['川味'], signatureDishes: ['重庆火锅', '辣子鸡', '小面'], sourceUrl: nationalGuide },
  '51': { cuisine: '川菜', tasteBias: { 麻辣: .98, 辣: .9, 香: .94 }, dishRegions: ['川味'], signatureDishes: ['麻婆豆腐', '宫保鸡丁', '回锅肉'], sourceUrl: eightCuisines },
  '52': { cuisine: '黔菜', tasteBias: { 酸甜: .8, 辣: .94, 香: .88 }, dishRegions: ['川味', '湘味'], signatureDishes: ['酸汤鱼', '辣子鸡', '丝娃娃'], sourceUrl: nationalGuide },
  '53': { cuisine: '滇菜', tasteBias: { 香: .94, 辣: .78, 咸鲜: .8 }, dishRegions: ['家常'], signatureDishes: ['汽锅鸡', '过桥米线', '野生菌火锅'], sourceUrl: nationalGuide },
  '54': { cuisine: '藏餐', tasteBias: { 咸鲜: .88, 香: .9 }, dishRegions: ['家常'], signatureDishes: ['牦牛肉', '藏面', '糌粑'], sourceUrl: nationalGuide },
  '61': { cuisine: '陕菜', tasteBias: { 咸鲜: .9, 香: .9, 辣: .72 }, dishRegions: ['家常'], signatureDishes: ['羊肉泡馍', '肉夹馍', '葫芦鸡'], sourceUrl: nationalGuide },
  '62': { cuisine: '陇菜', tasteBias: { 咸鲜: .88, 香: .9 }, dishRegions: ['家常'], signatureDishes: ['兰州牛肉面', '手抓羊肉', '酿皮'], sourceUrl: nationalGuide },
  '63': { cuisine: '青海风味', tasteBias: { 咸鲜: .9, 香: .9 }, dishRegions: ['家常'], signatureDishes: ['手抓羊肉', '青海土火锅', '酿皮'], sourceUrl: nationalGuide },
  '64': { cuisine: '宁夏风味', tasteBias: { 咸鲜: .9, 香: .88 }, dishRegions: ['家常'], signatureDishes: ['手抓羊肉', '羊杂碎', '烩小吃'], sourceUrl: nationalGuide },
  '65': { cuisine: '新疆菜', tasteBias: { 香: .98, 咸鲜: .9, 辣: .76 }, dishRegions: ['家常'], signatureDishes: ['大盘鸡', '烤羊肉串', '抓饭'], sourceUrl: nationalGuide },
  '71': { cuisine: '台湾风味', tasteBias: { 酸甜: .78, 咸鲜: .84, 香: .82 }, dishRegions: ['家常'], signatureDishes: ['三杯鸡', '卤肉饭', '蚵仔煎'], sourceUrl: nationalGuide },
  '81': { cuisine: '港式粤菜', tasteBias: { 清淡: .84, 咸鲜: .9, 香: .8 }, dishRegions: ['粤味'], signatureDishes: ['烧味', '云吞面', '避风塘炒蟹'], sourceUrl: nationalGuide },
  '82': { cuisine: '澳门土生菜', tasteBias: { 香: .9, 酸甜: .78, 咸鲜: .8 }, dishRegions: ['粤味', '融合'], signatureDishes: ['非洲鸡', '葡国鸡', '马介休'], sourceUrl: nationalGuide },
}

export function cuisineProfileFor(hometown: HometownSelection | null) {
  return hometown ? regionalCuisineProfiles[hometown.provinceCode.slice(0, 2)] : undefined
}

export function regionalDishAffinity(dish: Dish, hometown: HometownSelection | null) {
  const profile = cuisineProfileFor(hometown)
  if (!profile) return .62
  const tastes = Object.entries(profile.tasteBias) as Array<[TasteTag, number]>
  const weight = tastes.reduce((sum, [, value]) => sum + value, 0) || 1
  const tasteAffinity = tastes.reduce((sum, [taste, value]) => sum + (dish.tastes[taste] || .36) * value, 0) / weight
  const regionAffinity = profile.dishRegions.some((region) => dish.region.includes(region)) ? 1 : .58
  return tasteAffinity * .72 + regionAffinity * .28
}

export function regionalRecommendationPayload(hometown: HometownSelection | null) {
  const profile = cuisineProfileFor(hometown)
  if (!hometown || !profile) return null
  return {
    provinceCode: hometown.provinceCode,
    province: hometown.provinceName,
    cityCode: hometown.cityCode,
    city: hometown.cityName,
    cuisine: profile.cuisine,
    flavorTags: Object.entries(profile.tasteBias).sort((a, b) => b[1] - a[1]).map(([taste]) => taste),
    referenceDishes: profile.signatureDishes,
  }
}
