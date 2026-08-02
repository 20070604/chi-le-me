import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { DishArtwork, Sheet, Toast } from '../components/ui'
import { useApp } from '../context/AppContext'
import { getDish, nutritionGoals } from '../data/dishes'
import { areasForCity, citiesForProvince, loadRegionData, type RegionData, type RegionOption } from '../lib/regionData'
import type { GenderPreference, GoalId, HometownSelection, RecommendationMode } from '../types'

type ProfilePanel = 'profile' | 'gender' | 'region' | 'goal' | 'favorites' | 'report' | 'about' | 'reset' | null

const genderOptions: Array<{ value: GenderPreference; label: string }> = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'private', label: '不透露' },
]

const genderLabels: Record<GenderPreference, string> = { male: '男', female: '女', private: '不透露' }

function formatHometown(hometown: HometownSelection | null) {
  return hometown ? [...new Set([hometown.provinceName, hometown.cityName, hometown.areaName].filter((item): item is string => Boolean(item)))].join(' · ') : '未设置家乡'
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { userName, gender, hometown, recommendationMode, updateProfile, goal, setGoal, records, intake, target, favorites, resetData } = useApp()
  const [panel, setPanel] = useState<ProfilePanel>(null)
  const [nameDraft, setNameDraft] = useState(userName)
  const [genderDraft, setGenderDraft] = useState<GenderPreference | null>(gender)
  const [hometownDraft, setHometownDraft] = useState<HometownSelection | null>(hometown)
  const [recommendationModeDraft, setRecommendationModeDraft] = useState<RecommendationMode>(recommendationMode)
  const [toast, setToast] = useState('')
  const balance = Math.round(Math.min(intake.calories / target.calories, 1) * 30 + Math.min(intake.protein / target.protein, 1) * 35 + Math.min(intake.fiber / target.fiber, 1) * 35)
  const weeklyScore = balance || 68
  const weeklyScoreArc = 276.46
  const favoriteDishes = favorites.map(getDish).filter((dish): dish is NonNullable<ReturnType<typeof getDish>> => Boolean(dish))
  const profileSummary = `${gender ? genderLabels[gender] : '性别未设置'} · ${hometown ? hometown.areaName || hometown.cityName : '家乡未设置'}`

  const openProfile = () => {
    setNameDraft(userName)
    setGenderDraft(gender)
    setHometownDraft(hometown)
    setRecommendationModeDraft(recommendationMode)
    setPanel('profile')
  }

  const saveProfile = () => {
    const next = nameDraft.trim()
    if (!next) return
    updateProfile({ userName: next, gender: genderDraft, hometown: hometownDraft, recommendationMode: recommendationModeDraft })
    setPanel(null)
    setToast('档案已保存，推荐偏好已更新')
  }

  const chooseGoal = (next: GoalId) => {
    setGoal(next)
    setToast(`营养目标已切换为“${nutritionGoals[next].name}”`)
  }

  const shareReport = async () => {
    const text = `${userName}的味觉周报：记录 ${records.length + 9} 餐，均衡指数 ${balance || 68}/100，当前目标为${nutritionGoals[goal].name}。`
    try {
      const shareNavigator = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
      if (typeof shareNavigator.share === 'function') await shareNavigator.share({ title: '吃了么周报', text })
      else await navigator.clipboard.writeText(text)
      setToast('周报已分享或复制')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setToast('暂时无法分享，稍后再试')
    }
  }

  return (
    <main className="page profile-page profile-page--cool">
      <header className="profile-header">
        <button className="profile-avatar" onClick={openProfile} aria-label="编辑味觉档案">味<span><Icon name="leaf" /></span></button>
        <div><span className="eyebrow">我的味觉档案</span><button className="profile-name-edit" onClick={openProfile}><span><strong>{userName}，晚上好</strong><small>{profileSummary}</small></span><Icon name="chevron-right" /></button></div>
      </header>

      <section className="profile-score">
        <div><span>本周均衡指数</span><strong>{balance || 68}<small>/100</small></strong><p>比上周更懂得照顾自己了</p></div>
        <div className="score-orbit"><span>{balance || 68}</span><i /><i /><i /></div>
        <button className="profile-score__goal" onClick={() => setPanel('goal')} aria-label={`当前营养目标：${nutritionGoals[goal].name}，点击调整`}>
          <span><Icon name={goal === 'lose' ? 'leaf' : goal === 'maintain' ? 'compass' : 'bolt'} /></span>
          <span><small>当前营养节奏</small><b>{nutritionGoals[goal].name}<em>每日约 {target.calories} kcal</em></b></span>
          <Icon name="chevron-right" />
        </button>
      </section>

      <section className="profile-stats section-block">
        <div className="section-heading"><div><span className="eyebrow">本周记录</span><h2>每一餐都有回响</h2></div></div>
        <div className="profile-stat-grid">
          <div><span>记录</span><strong>{records.length + 9}</strong><small>餐次</small></div>
          <div><span>蔬菜</span><strong>12</strong><small>种类</small></div>
          <div><span>寻味</span><strong>18</strong><small>次数</small></div>
        </div>
      </section>

      <section className="settings-card">
        <button onClick={() => setPanel('favorites')}><span><Icon name="heart" /></span><div><strong>想吃清单</strong><small>{favorites.length ? `已收藏 ${favorites.length} 道菜` : '还没有收藏菜谱'}</small></div><Icon name="chevron-right" /></button>
        <button onClick={() => setPanel('report')}><span><Icon name="calendar" /></span><div><strong>每周报告</strong><small>查看并分享本周饮食总结</small></div><Icon name="chevron-right" /></button>
        <button onClick={() => setPanel('about')}><span><Icon name="compass" /></span><div><strong>关于吃了么</strong><small>CHI LE ME · v0.4</small></div><Icon name="chevron-right" /></button>
      </section>
      <p className="privacy-note"><Icon name="leaf" /> 数据仅保存在当前浏览器中</p>

      <Sheet open={panel === 'profile'} title="编辑味觉档案" onClose={() => setPanel(null)}>
        <div className="profile-edit-form">
          <label className="field-label" htmlFor="profile-name">昵称</label>
          <div className="name-field"><input id="profile-name" autoFocus maxLength={12} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="输入 1–12 个字符" /><span>{nameDraft.trim().length}/12</span></div>

          <div className="profile-gender-field">
            <span>性别 <small>选填</small></span>
            <button type="button" onClick={() => setPanel('gender')}>
              <span><Icon name="person" /><b>{genderDraft ? genderLabels[genderDraft] : '未设置性别'}</b></span>
              <Icon name="chevron-right" />
            </button>
          </div>

          <div className="profile-hometown-field">
            <span>成长口味地区 <small>选填</small></span>
            <button type="button" onClick={() => setPanel('region')}>
              <span><Icon name="compass" /><b>{formatHometown(hometownDraft)}</b></span>
              <Icon name="chevron-right" />
            </button>
          </div>

          <fieldset className="profile-mode-field">
            <legend>推荐版本</legend>
            <div>
              <button type="button" className={recommendationModeDraft === 'standard' ? 'is-active' : ''} onClick={() => setRecommendationModeDraft('standard')} aria-pressed={recommendationModeDraft === 'standard'}>
                <span><Icon name="compass" /></span>
                <strong>普通版</strong>
                <small>详细的菜谱与外卖推荐</small>
                <i>{recommendationModeDraft === 'standard' && <Icon name="check" />}</i>
              </button>
              <button type="button" className={recommendationModeDraft === 'healthy' ? 'is-active' : ''} onClick={() => setRecommendationModeDraft('healthy')} aria-pressed={recommendationModeDraft === 'healthy'}>
                <span><Icon name="leaf" /></span>
                <strong>健康版</strong>
                <small>更健康详细的菜谱</small>
                <i>{recommendationModeDraft === 'healthy' && <Icon name="check" />}</i>
              </button>
            </div>
          </fieldset>

          <p className="profile-data-note">完整地区保存在本机；推荐请求只使用省、市与长期口味偏好。</p>
          <button className="button button--primary button--block" disabled={!nameDraft.trim()} onClick={saveProfile}><Icon name="check" /> 保存档案</button>
        </div>
      </Sheet>

      <Sheet open={panel === 'gender'} title="选择性别" onClose={() => setPanel('profile')}>
        <div className="gender-picker">
          {genderOptions.map((item) => (
            <button type="button" className={genderDraft === item.value ? 'is-active' : ''} onClick={() => { setGenderDraft(item.value); setPanel('profile') }} aria-pressed={genderDraft === item.value} key={item.value}>
              <span>{item.label}</span>
              <i>{genderDraft === item.value && <Icon name="check" />}</i>
            </button>
          ))}
          {genderDraft && <button type="button" className="gender-picker__clear" onClick={() => { setGenderDraft(null); setPanel('profile') }}>暂不设置</button>}
        </div>
      </Sheet>

      <Sheet open={panel === 'region'} title="选择成长口味地区" onClose={() => setPanel('profile')}>
        <HometownPicker value={hometownDraft} onChange={(next) => { setHometownDraft(next); setPanel('profile') }} />
      </Sheet>

      <Sheet open={panel === 'goal'} title="调整营养节奏" onClose={() => setPanel(null)}>
        <p className="sheet-intro">目标只用于调整每日营养参考值，不会限制你的饮食选择。</p>
        <div className="goal-list goal-list--sheet">
          {(Object.entries(nutritionGoals) as [GoalId, (typeof nutritionGoals)[GoalId]][]).map(([key, item]) => (
            <button className={goal === key ? 'is-active' : ''} onClick={() => { chooseGoal(key); setPanel(null) }} key={key} aria-pressed={goal === key}>
              <span className="goal-list__icon"><Icon name={key === 'lose' ? 'leaf' : key === 'maintain' ? 'compass' : 'bolt'} /></span>
              <span><strong>{item.name}</strong><small>{item.description}</small></span>
              <em>{item.target.calories} kcal</em>
              <i>{goal === key && <Icon name="check" />}</i>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={panel === 'favorites'} title="想吃清单" onClose={() => setPanel(null)}>
        {favoriteDishes.length ? <div className="favorite-list">{favoriteDishes.map((dish) => <button key={dish.id} onClick={() => { setPanel(null); navigate(`/dish/${dish.id}`) }}><DishArtwork dish={dish} compact /><span><strong>{dish.name}</strong><small>{dish.nutrition.calories} kcal · {dish.highlights[0]}</small></span><Icon name="chevron-right" /></button>)}</div> : <div className="sheet-empty"><Icon name="heart" /><strong>还没有想吃的菜</strong><p>进入菜谱详情，点击右上角收藏即可加入。</p><button className="button button--primary" onClick={() => { setPanel(null); navigate('/taste') }}>去发现菜品</button></div>}
      </Sheet>

      <Sheet open={panel === 'report'} title="本周味觉报告" onClose={() => setPanel(null)}>
        <div className="weekly-report">
          <section className="weekly-report__cover">
            <div className="weekly-report__intro">
              <span><i />过去 7 天</span>
              <h3>你的饮食，正在变得更有节奏</h3>
            </div>
            <div className="weekly-report__score" aria-label={`本周均衡指数 ${weeklyScore} 分`}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="weekly-report__score-track" cx="60" cy="60" r="44" />
                <circle
                  className="weekly-report__score-value"
                  cx="60"
                  cy="60"
                  r="44"
                  style={{ strokeDasharray: weeklyScoreArc, strokeDashoffset: weeklyScoreArc * (1 - weeklyScore / 100) }}
                />
              </svg>
              <div><strong>{weeklyScore}</strong><small>/100</small></div>
            </div>
            <div className="weekly-report__delta">
              <span><Icon name="bolt" /></span>
              <div><strong>较上周提升 6 分</strong><small>均衡指数持续上升</small></div>
            </div>
          </section>

          <section className="weekly-report__trail" aria-label="本周记录摘要">
            <article>
              <span><Icon name="notebook" /></span>
              <div><small>记录餐次</small><p>饮食记录已形成连续节奏</p></div>
              <strong>{records.length + 9}<em>餐</em></strong>
            </article>
            <article>
              <span><Icon name="heart" /></span>
              <div><small>想吃清单</small><p>正在建立自己的口味收藏</p></div>
              <strong>{favorites.length}<em>道</em></strong>
            </article>
            <article>
              <span><Icon name={goal === 'lose' ? 'leaf' : goal === 'maintain' ? 'compass' : 'bolt'} /></span>
              <div><small>当前节奏</small><p>每日参考 {target.calories} kcal</p></div>
              <strong className="weekly-report__goal">{nutritionGoals[goal].name}</strong>
            </article>
          </section>

          <section className="weekly-report__insight">
            <span><Icon name="sparkles" /></span>
            <div><small>本周洞察</small><strong>蛋白质已经跟上了</strong><p>下一步，把早餐与膳食纤维稳下来。</p></div>
          </section>

          <button className="weekly-report__share" onClick={shareReport}><Icon name="send" /> 分享本周报告</button>
        </div>
      </Sheet>

      <Sheet open={panel === 'about'} title="关于吃了么" onClose={() => setPanel(null)}>
        <div className="about-refined">
          <section className="about-refined__hero">
            <div className="about-refined__compass"><Icon name="compass" /><i /><i /></div>
            <div><span>CHI LE ME · v0.4</span><h3>为每一次选择，找到更合适的方向</h3><p>把口味偏好、真实菜谱与营养目标，收进同一套餐饮决策系统。</p></div>
          </section>
          <div className="about-refined__principles" aria-label="产品原则">
            <span><Icon name="leaf" /><b>本机保存</b></span>
            <span><Icon name="sparkles" /><b>AI 可解释</b></span>
            <span><Icon name="check" /><b>由你确认</b></span>
          </div>
          <p className="about-refined__note">AI 负责归纳、比较与推荐；最终的饮食与健康决定始终由你确认。</p>
          <div className="about-refined__list">
            <a href="/images/home/ATTRIBUTION.md" target="_blank" rel="noreferrer"><span><Icon name="camera" /><b>真实图片来源与许可</b></span><Icon name="chevron-right" /></a>
            <button type="button" onClick={() => setPanel('reset')}><span><Icon name="refresh" /><b>重置演示数据</b></span><Icon name="chevron-right" /></button>
          </div>
        </div>
      </Sheet>

      <Sheet open={panel === 'reset'} title="重置演示数据？" onClose={() => setPanel('about')}>
        <div className="confirm-copy"><Icon name="trash" /><strong>昵称、性别、家乡、营养目标、餐次和收藏都会恢复默认</strong><p>此操作只影响当前浏览器中的演示数据，无法撤销。</p></div>
        <div className="sheet-actions"><button onClick={() => setPanel('about')}>取消</button><button className="is-danger" onClick={() => { resetData(); setPanel(null); setToast('演示数据已恢复默认') }}>确认重置</button></div>
      </Sheet>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </main>
  )
}

function HometownPicker({ value, onChange }: { value: HometownSelection | null; onChange: (value: HometownSelection | null) => void }) {
  const [data, setData] = useState<RegionData>()
  const [loadError, setLoadError] = useState(false)
  const [picker, setPicker] = useState<'province' | 'city' | 'area' | null>(null)
  const [draft, setDraft] = useState<HometownSelection | null>(value)

  useEffect(() => {
    let active = true
    loadRegionData().then((next) => {
      if (active) setData(next)
    }).catch(() => {
      if (active) setLoadError(true)
    })
    return () => { active = false }
  }, [])

  const selectedProvince = useMemo(() => data?.provinces.find((item) => item.code === draft?.provinceCode), [data, draft?.provinceCode])
  const cityOptions = useMemo(() => data && selectedProvince ? citiesForProvince(data, selectedProvince) : [], [data, selectedProvince])
  const selectedCity = useMemo(() => cityOptions.find((item) => item.code === draft?.cityCode), [cityOptions, draft?.cityCode])
  const areaOptions = useMemo(() => data && selectedProvince && selectedCity
    ? areasForCity(data, selectedProvince.province, selectedCity.city || '')
    : [], [data, selectedCity, selectedProvince])

  const chooseProvince = (province: RegionOption) => {
    setDraft({ provinceCode: province.code, provinceName: province.name, cityCode: '', cityName: '' })
    setPicker('city')
  }

  const chooseCity = (city: RegionOption) => {
    if (!selectedProvince || !data) return
    const next: HometownSelection = {
      provinceCode: selectedProvince.code,
      provinceName: selectedProvince.name,
      cityCode: city.code,
      cityName: city.name,
    }
    setDraft(next)
    const nextAreas = areasForCity(data, selectedProvince.province, city.city || '')
    setPicker(nextAreas.length ? 'area' : null)
  }

  const chooseArea = (area: RegionOption) => {
    if (!draft) return
    setDraft({ ...draft, areaCode: area.code, areaName: area.name })
    setPicker(null)
  }

  if (loadError) return <div className="region-picker__status"><Icon name="refresh" /><strong>地区数据加载失败</strong><span>请检查网络后重新打开</span></div>
  if (!data) return <div className="region-picker__status is-loading"><i /><strong>正在载入全国地区数据</strong><span>仅首次打开需要加载</span></div>

  const options = picker === 'province' ? data.provinces : picker === 'city' ? cityOptions : picker === 'area' ? areaOptions : []
  const currentCode = picker === 'province' ? draft?.provinceCode : picker === 'city' ? draft?.cityCode : draft?.areaCode
  const pickerTitle = picker === 'province' ? '选择省份' : picker === 'city' ? '选择城市' : '选择区县'

  return (
    <div className="region-picker">
      <div className="region-picker__summary">
        <Icon name="compass" />
        <div><strong>{draft?.cityName || draft?.provinceName || '选择你的成长口味地区'}</strong><span>{draft ? formatHometown(draft) : '按省、市、区依次选择'}</span></div>
      </div>

      <div className="region-picker__fields">
        <button type="button" onClick={() => setPicker('province')}>
          <span><small>省份</small><strong className={draft?.provinceName ? '' : 'is-placeholder'}>{draft?.provinceName || '请选择省份'}</strong></span>
          <Icon name="chevron-right" />
        </button>
        <button type="button" disabled={!draft?.provinceCode} onClick={() => setPicker('city')}>
          <span><small>城市</small><strong className={draft?.cityName ? '' : 'is-placeholder'}>{draft?.cityName || '请先选择省份'}</strong></span>
          <Icon name="chevron-right" />
        </button>
        <button type="button" disabled={!draft?.cityCode || !areaOptions.length} onClick={() => setPicker('area')}>
          <span><small>区县</small><strong className={draft?.areaName ? '' : 'is-placeholder'}>{draft?.areaName || (draft?.cityCode && !areaOptions.length ? '该地区无需选择区县' : '可选，推荐会更准确')}</strong></span>
          <Icon name="chevron-right" />
        </button>
      </div>

      <div className="region-picker__footer">
        <button type="button" className="region-picker__clear" onClick={() => onChange(null)}>暂不设置</button>
        <button type="button" className="region-picker__confirm" disabled={!draft?.provinceCode || !draft?.cityCode} onClick={() => draft && onChange(draft)}>确认地区</button>
      </div>

      {picker && (
        <div className="region-choice-layer" role="dialog" aria-modal="true" aria-label={pickerTitle}>
          <button type="button" className="region-choice-layer__backdrop" onClick={() => setPicker(null)} aria-label="返回地区表单" />
          <section className="region-choice-dialog">
            <div className="region-choice-dialog__handle" />
            <header>
              <div><small>{picker === 'province' ? '第一步' : picker === 'city' ? '第二步' : '第三步'}</small><h3>{pickerTitle}</h3></div>
              <button type="button" onClick={() => setPicker(null)} aria-label="关闭地区列表"><Icon name="close" /></button>
            </header>
            {picker === 'area' && draft?.cityCode && <button type="button" className="region-choice-dialog__skip" onClick={() => { setDraft({ ...draft, areaCode: undefined, areaName: undefined }); setPicker(null) }}>使用市级推荐，不选择区县 <Icon name="chevron-right" /></button>}
            <div className="region-choice-dialog__options">
              {options.map((item) => <button type="button" className={currentCode === item.code ? 'is-active' : ''} onClick={() => picker === 'province' ? chooseProvince(item) : picker === 'city' ? chooseCity(item) : chooseArea(item)} aria-pressed={currentCode === item.code} key={`${picker}-${item.code}`}><span>{item.name}</span><i>{currentCode === item.code && <Icon name="check" />}</i></button>)}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
