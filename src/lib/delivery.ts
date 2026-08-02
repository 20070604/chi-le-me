import type { Dish } from '../types'

export type DeliveryPlatform = 'android' | 'ios' | 'desktop'

export interface DeliveryLaunchPlan {
  platform: DeliveryPlatform
  primaryUrl: string
  webUrl: string
}

function detectPlatform(userAgent: string): DeliveryPlatform {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  return 'desktop'
}

/** Build one direct Meituan launch URL with the current dish as the query. */
export function buildDeliveryLaunchPlan(
  dishName: string,
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): DeliveryLaunchPlan {
  const platform = detectPlatform(userAgent)
  const keyword = encodeURIComponent(dishName.trim())
  const webUrl = `https://h5.waimai.meituan.com/waimai/mindex/searchresults?query=${keyword}`
  const nativePath = `www.meituan.com/search/result?q=${keyword}`

  if (platform === 'android') {
    return {
      platform,
      primaryUrl: `intent://${nativePath}#Intent;scheme=imeituan;package=com.sankuai.meituan;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`,
      webUrl,
    }
  }

  if (platform === 'ios') {
    return {
      platform,
      primaryUrl: `imeituan://${nativePath}`,
      webUrl,
    }
  }

  return { platform, primaryUrl: webUrl, webUrl }
}

export function openDelivery(dish: Dish) {
  const plan = buildDeliveryLaunchPlan(dish.name)

  if (plan.platform === 'desktop') {
    window.open(plan.webUrl, '_blank', 'noopener,noreferrer')
    return
  }

  window.location.assign(plan.primaryUrl)
}
