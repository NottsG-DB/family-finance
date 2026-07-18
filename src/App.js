import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { signInWithGoogle, signOut } from './lib/supabase'
import Overview from './pages/Overview'
import Mortgage from './pages/Mortgage'
import WhatIf from './pages/WhatIf'
import Position from './pages/Position'
import Import from './pages/Import'
import Goals from './pages/Goals'
import Tracker from './pages/Tracker'
import './App.css'

function Login() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">⬡</span>
          <h1>Family finance</h1>
        </div>
        <p className="login-sub">Gavin and Claire's household dashboard</p>
        <button className="google-btn" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="login-note">Access restricted to authorised family members</p>
      </div>
    </div>
  )
}

function Nav() {
  const { user } = useAuth()
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'FF'
  return (
    <nav className="app-nav">
      <div className="nav-brand">FF</div>
      <div className="nav-links">
        <NavLink to="/overview" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">⊞</span><span className="nav-label">Overview</span>
        </NavLink>
        <NavLink to="/mortgage" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">⌂</span><span className="nav-label">Mortgage</span>
        </NavLink>
        <NavLink to="/position" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">◈</span><span className="nav-label">Position</span>
        </NavLink>
        <NavLink to="/goals" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">◎</span><span className="nav-label">Goals</span>
        </NavLink>
        <NavLink to="/tracker" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">◔</span><span className="nav-label">Tracker</span>
        </NavLink>
        <NavLink to="/whatif" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">⇌</span><span className="nav-label">What if</span>
        </NavLink>
        <NavLink to="/import" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">↑</span><span className="nav-label">Import</span>
        </NavLink>
      </div>
      <button className="nav-avatar" onClick={signOut} title="Sign out">{initials}</button>
    </nav>
  )
}

function ProtectedApp() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user) return <Login />
  return (
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/mortgage" element={<Mortgage />} />
          <Route path="/position" element={<Position />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/whatif" element={<WhatIf />} />
          <Route path="/import" element={<Import />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </BrowserRouter>
  )
}
