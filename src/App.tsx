import { useEffect, useRef } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Icon } from './components/Icon'
import { AppProvider } from './context/AppContext'
import { DiaryPage } from './pages/DiaryPage'
import { DishDetailPage } from './pages/DishDetailPage'
import { AdvisorPage } from './pages/AdvisorPage'
import { OnlineRecipePage } from './pages/OnlineRecipePage'
import { ProfilePage } from './pages/ProfilePage'
import { RecommendPage } from './pages/RecommendPage'
import { StudioPage } from './pages/StudioPage'
import { TastePage } from './pages/TastePage'

function AppShell() {
  const location = useLocation()
  const detail = location.pathname.startsWith('/dish/') || location.pathname.startsWith('/recipe/') || location.pathname === '/advisor'
  const previousPathRef = useRef(location.pathname)
  const advanceHomeScene = location.pathname === '/taste' && previousPathRef.current !== '/taste'

  useEffect(() => {
    previousPathRef.current = location.pathname
    window.scrollTo({ top: 0, left: 0 })
    document.querySelector('.app-shell')?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  return (
    <div className={`app-frame ${detail ? 'app-frame--detail' : ''}`}>
      <div className="app-shell">
        <Routes>
          <Route path="/taste" element={<TastePage advanceHomeScene={advanceHomeScene} />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/dish/:id" element={<DishDetailPage />} />
          <Route path="/recipe/:id" element={<OnlineRecipePage />} />
          <Route path="/advisor" element={<AdvisorPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/taste" replace />} />
        </Routes>
        {!detail && <BottomNav />}
      </div>
    </div>
  )
}

function BottomNav() {
  const current = useLocation()
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <NavLink to="/taste" className={({ isActive }) => isActive ? 'is-active' : ''}><span className="bottom-nav__icon"><Icon name="home" /></span><span>首页</span></NavLink>
      <NavLink to="/studio" className={({ isActive }) => isActive ? 'is-active' : ''}><span className="bottom-nav__icon"><Icon name="cloche" /></span><span>厨房</span></NavLink>
      <NavLink to="/diary" className={({ isActive }) => isActive || current.pathname === '/recommend' ? 'is-active' : ''}><span className="bottom-nav__icon"><Icon name="notebook" /></span><span>记录</span></NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? 'is-active' : ''}><span className="bottom-nav__icon"><Icon name="person" /></span><span>我的</span></NavLink>
    </nav>
  )
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>
}
