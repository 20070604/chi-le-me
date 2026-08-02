import type { Dish } from '../types'

export interface DishVideo {
  title: string
  creator: string
  url: string
  platform: '哔哩哔哩'
}

const dishVideos: Record<number, DishVideo> = {
  101: {
    title: '简单低脂家常菜：西兰花炒虾仁',
    creator: '摇滚大厨',
    url: 'https://www.bilibili.com/video/BV1Ha411i7NV/',
    platform: '哔哩哔哩',
  },
  102: {
    title: '番茄鸡丁意面：茄汁浓郁的简单做法',
    creator: '相遇味蕾',
    url: 'https://www.bilibili.com/video/BV1J54y1x71U/',
    platform: '哔哩哔哩',
  },
  103: {
    title: '青椒牛肉：如何炒出嫩滑牛肉',
    creator: '小高姐的魔法调料',
    url: 'https://www.bilibili.com/video/BV1A7411a7cu/',
    platform: '哔哩哔哩',
  },
  104: {
    title: '菌菇豆腐煲：鲜香入味的家常做法',
    creator: '天天相见厨房阿鹏',
    url: 'https://www.bilibili.com/video/BV1Kw41137ZU/',
    platform: '哔哩哔哩',
  },
  105: {
    title: '三步做柠檬黑椒香煎鸡腿',
    creator: '上班族的便当',
    url: 'https://www.bilibili.com/video/BV1eW411s7cL/',
    platform: '哔哩哔哩',
  },
  106: {
    title: '低脂麻婆豆腐',
    creator: '简肥',
    url: 'https://www.bilibili.com/video/BV1Eg411g7SM/',
    platform: '哔哩哔哩',
  },
  107: {
    title: '十五天好吃的减脂食谱：南瓜燕麦粥',
    creator: 'evfredag',
    url: 'https://www.bilibili.com/video/BV1or4y1w7WV/',
    platform: '哔哩哔哩',
  },
  108: {
    title: '营养能量碗：完整食谱分享',
    creator: 'chubbyduo_',
    url: 'https://www.bilibili.com/video/BV1WT4y1R7bq/',
    platform: '哔哩哔哩',
  },
  201: {
    title: '金汤酸菜鱼保姆级教程',
    creator: '董小厨家常菜',
    url: 'https://www.bilibili.com/video/BV1kt5NzzEBy/',
    platform: '哔哩哔哩',
  },
}

export function getDishVideo(dish: Dish): DishVideo {
  return dishVideos[dish.id] || {
    title: `${dish.name}视频教程`,
    creator: '哔哩哔哩搜索',
    url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(`${dish.name} 做法`)}`,
    platform: '哔哩哔哩',
  }
}
