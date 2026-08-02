import { getDish } from './dishes'

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner'

export interface HomeScene {
  id: string
  image: string
  imageAlt: string
  photoCredit: string
  photoUrl: string
  label: string
  position?: string
}

function dishScene(id: number, label: string, position?: string): HomeScene {
  const dish = getDish(id)
  if (!dish) throw new Error(`Missing home-scene dish ${id}`)
  return { id: `dish-${id}`, image: dish.image, imageAlt: dish.imageAlt, photoCredit: dish.photoCredit, photoUrl: dish.photoUrl, label, position }
}

function pexelsScene(period: MealPeriod, index: number, photoId: number, label: string, imageAlt: string, position = '50% 50%'): HomeScene {
  return {
    id: `${period}-${photoId}`,
    image: `/images/home/${period}/${period}-${String(index).padStart(2, '0')}-${photoId}.jpg`,
    imageAlt,
    photoCredit: `Pexels · Photo ${photoId}`,
    photoUrl: `https://www.pexels.com/photo/${photoId}/`,
    label,
    position,
  }
}

export const mealPeriodLabels: Record<MealPeriod, string> = {
  breakfast: '早餐时间',
  lunch: '午餐时间',
  dinner: '晚餐时间',
}

export const homeSceneLibrary: Record<MealPeriod, HomeScene[]> = {
  breakfast: [
    dishScene(107, '燕麦早餐', '50% 58%'),
    { id: 'breakfast-avocado-toast', image: '/images/heroes/avocado-toast.jpg', imageAlt: '牛油果水波蛋吐司与绿叶沙拉', photoCredit: 'Polina Tankilevitch · Pexels', photoUrl: 'https://www.pexels.com/photo/avocado-toast-on-a-plate-4109505/', label: '牛油果吐司', position: '50% 62%' },
    { id: 'breakfast-berry-pancakes', image: '/images/heroes/berry-pancakes.jpg', imageAlt: '蓝莓树莓松饼', photoCredit: 'Anete Lusina · Pexels', photoUrl: 'https://www.pexels.com/photo/pancakes-with-berries-on-the-plate-4790406/', label: '莓果松饼', position: '50% 65%' },
    dishScene(108, '晨间能量碗', '48% 52%'),
    pexelsScene('breakfast', 1, 18340438, '早餐与茶', '晨光中享用水波蛋吐司与热茶'),
    pexelsScene('breakfast', 2, 33852948, '英式早餐', '煎蛋、豆子、培根与咖啡组成的丰盛早餐'),
    pexelsScene('breakfast', 3, 5865690, '水波蛋吐司', '木桌上的水波蛋吐司与烤面包'),
    pexelsScene('breakfast', 4, 17612444, '晨间咖啡', '柔和晨光下的咖啡、吐司与水杯'),
    pexelsScene('breakfast', 5, 34000092, '开放三明治', '鸡蛋芝士开放三明治与香草'),
    pexelsScene('breakfast', 6, 33674448, '果汁早餐', '橙汁、水果与面包组成的明亮早餐桌'),
    pexelsScene('breakfast', 7, 16059962, '莓果甜点', '咖啡旁的莓果早餐甜点'),
    pexelsScene('breakfast', 8, 34041969, '早午餐', '水波蛋、咖啡与烤面包早午餐'),
    pexelsScene('breakfast', 9, 10313363, '烟熏三文鱼吐司', '烟熏三文鱼牛油果吐司与咖啡'),
    pexelsScene('breakfast', 10, 10806942, '班尼迪克蛋', '酱汁班尼迪克蛋与拿铁咖啡'),
    pexelsScene('breakfast', 11, 4993257, '水果早餐桌', '水果、面包与咖啡组成的户外早餐桌'),
  ],
  lunch: [
    dishScene(101, '清爽午餐', '48% 50%'),
    dishScene(102, '鸡胸意面', '50% 54%'),
    dishScene(103, '青椒牛肉', '50% 52%'),
    { id: 'lunch-colorful-salad', image: '/images/heroes/colorful-salad.jpg', imageAlt: '鸡蛋、蔬菜与土豆彩色沙拉碗', photoCredit: 'Nadin Sh · Pexels', photoUrl: 'https://www.pexels.com/photo/food-on-plate-14693797/', label: '彩色沙拉', position: '50% 58%' },
    { id: 'lunch-sushi', image: '/images/heroes/sushi-platter.jpg', imageAlt: '日式寿司拼盘与筷子', photoCredit: 'Jay Abrantes · Pexels', photoUrl: 'https://www.pexels.com/photo/plate-of-sushi-343870/', label: '寿司午餐', position: '48% 50%' },
    { id: 'lunch-dumplings', image: '/images/heroes/dumplings.jpg', imageAlt: '白瓷盘中的蒸饺与蘸酱', photoCredit: 'Valeria Boltneva · Pexels', photoUrl: 'https://www.pexels.com/photo/dumplings-and-sauce-18330956/', label: '蒸饺', position: '50% 54%' },
    pexelsScene('lunch', 1, 4223921, '亚洲拌面', '香草蔬菜拌面装在深色餐碗中'),
    pexelsScene('lunch', 2, 4869334, '海鲜拼盘', '烤鱼、鲜虾与鱿鱼组成的海鲜拼盘'),
    pexelsScene('lunch', 3, 5639351, '鲜果芝士沙拉', '鲜果、绿叶菜与芝士组成的彩色沙拉'),
    pexelsScene('lunch', 4, 5695611, '香料烤鸡', '香料烤鸡块盛放在白色餐盘中'),
    pexelsScene('lunch', 5, 30818656, '烤蔬菜', '番茄与烤蔬菜组成的午餐盘'),
    pexelsScene('lunch', 6, 10134725, '炭烤章鱼', '炭烤章鱼与新鲜蔬菜精致摆盘'),
    pexelsScene('lunch', 7, 13020723, '青菜汤面', '青菜、香草与花生点缀的亚洲汤面'),
    pexelsScene('lunch', 8, 35001777, '田园烤鸡', '烤鸡与新鲜番茄生菜组成的午餐盘'),
    pexelsScene('lunch', 9, 36771456, '香蔬炒面', '香蔬炒面从深色餐碗中夹起'),
  ],
  dinner: [
    dishScene(201, '热汤晚餐', '50% 50%'),
    dishScene(104, '菌菇豆腐煲', '50% 52%'),
    dishScene(105, '柠香鸡腿', '50% 54%'),
    dishScene(106, '麻婆豆腐', '50% 54%'),
    { id: 'dinner-ramen', image: '/images/heroes/ramen.jpg', imageAlt: '溏心蛋辣椒拉面', photoCredit: 'Muhammad Fawdy · Pexels', photoUrl: 'https://www.pexels.com/photo/ramen-18467149/', label: '暖汤拉面', position: '50% 56%' },
    pexelsScene('dinner', 1, 14747930, '酥炸龙虾', '酥炸龙虾与蔬菜组成的丰盛主菜'),
    pexelsScene('dinner', 2, 35336025, '精致晚餐', '餐厅暖光中的沙拉与精致摆盘'),
    pexelsScene('dinner', 3, 16845326, '香烤虾串', '黑色餐盘中的香烤虾串与香草'),
    pexelsScene('dinner', 4, 19106481, '香辣烤鱼', '香辣烤鱼与绿叶蔬菜近景'),
    pexelsScene('dinner', 5, 19725431, '海鲜盛宴', '鲜虾、章鱼与香草组成的海鲜主菜'),
    pexelsScene('dinner', 6, 34507149, '晚餐料理', '厨师在低照度环境中完成热菜'),
    pexelsScene('dinner', 7, 6953381, '分享餐', '暖光餐厅里的多道分享餐'),
    pexelsScene('dinner', 8, 28907751, '香草汤面', '鸡蛋、香草与柠檬点缀的汤面'),
    pexelsScene('dinner', 9, 33456881, '炭香烤鸡', '炭火烤鸡与香草蔬菜近景'),
    pexelsScene('dinner', 10, 34583972, '鲜虾沙拉', '鲜虾、番茄与绿叶菜组成的晚餐盘'),
  ],
}

export const allHomeScenes = Object.values(homeSceneLibrary).flat()

export function getMealPeriod(date = new Date()): MealPeriod {
  const hour = date.getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 17) return 'lunch'
  return 'dinner'
}
