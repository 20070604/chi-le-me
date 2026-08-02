export interface RegionOption {
  code: string
  name: string
  province: string
  city?: string
  area?: string
}

export interface RegionData {
  provinces: RegionOption[]
  cities: RegionOption[]
  areas: RegionOption[]
}

let regionDataPromise: Promise<RegionData> | undefined

const unwrap = <T,>(module: { default?: T } | T): T =>
  (typeof module === 'object' && module !== null && 'default' in module ? module.default : module) as T

export function loadRegionData() {
  if (!regionDataPromise) {
    regionDataPromise = Promise.all([
      import('@province-city-china/province/province.json'),
      import('@province-city-china/city/city.json'),
      import('@province-city-china/area/area.json'),
    ]).then(([provinceModule, cityModule, areaModule]) => ({
      provinces: unwrap<RegionOption[]>(provinceModule),
      cities: unwrap<RegionOption[]>(cityModule),
      areas: unwrap<RegionOption[]>(areaModule).filter((item) => item.name !== '市辖区'),
    })).catch((error) => {
      regionDataPromise = undefined
      throw error
    })
  }
  return regionDataPromise
}

const directMunicipalities = new Set(['11', '12', '31', '50'])

export function citiesForProvince(data: RegionData, province: RegionOption) {
  const regular = data.cities.filter((item) => item.province === province.province)
  const provinceAreas = data.areas.filter((item) => item.province === province.province)

  if (directMunicipalities.has(province.province) || (!regular.length && !provinceAreas.length)) {
    return [{ code: `${province.province}0000`, name: province.name, province: province.province, city: '*' }]
  }

  const regularCodes = new Set(regular.map((item) => item.city))
  const orphanCodes = [...new Set(provinceAreas.map((item) => item.city).filter((code): code is string => Boolean(code) && !regularCodes.has(code)))]
  const suffix = province.name.includes('自治区') ? '自治区直辖县级行政区划' : '省直辖县级行政区划'
  const virtual = orphanCodes.map((city) => ({
    code: `${province.province}${city}00`,
    name: suffix,
    province: province.province,
    city,
  }))
  return [...regular, ...virtual]
}

export function areasForCity(data: RegionData, provinceCode: string, cityCode: string) {
  return data.areas.filter((item) => item.province === provinceCode && (cityCode === '*' || item.city === cityCode))
}
