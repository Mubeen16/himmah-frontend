'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import HimmahBrand from './HimmahBrand'
import {
  NavIconGate,
  NavIconGoals,
  NavIconPlan,
  NavIconReview,
  NavIconSettings,
  NavIconToday,
} from './nav-icons'

/** Sidebar-layout glyph: click-only expand/collapse (no hover) */
function SideRailLayoutIcon() {
  return (
    <svg
      className="hm-side-rail-iconSvg"
      width="22"
      height="22"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect x="7" y="9" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <line x1="12.5" y1="9" x2="12.5" y2="23" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

function ThemeIcon({ light }: { light: boolean }) {
  return light ? (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.7 5.7l1.8 1.8M16.5 16.5l1.8 1.8M5.7 18.3l1.8-1.8M16.5 7.5l1.8-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const links = [
  { href: '/', label: 'today', Icon: NavIconToday },
  { href: '/plan', label: 'plan', Icon: NavIconPlan },
  { href: '/goals', label: 'goals', Icon: NavIconGoals },
  { href: '/review', label: 'reflect', Icon: NavIconReview },
  { href: '/gate', label: 'ideas', Icon: NavIconGate },
  { href: '/settings', label: 'settings', Icon: NavIconSettings },
] as const

/**
 * Wide rail on/off, persisted across routes (each page mounts its own `<Shell>`).
 * Storage key kept as `hm-side-rail-pinned` for existing sessions.
 */
const RAIL_OPEN_STORAGE_KEY = 'hm-side-rail-pinned'
const THEME_STORAGE_KEY = 'hm-theme'

const railOpenListeners = new Set<() => void>()
const themeListeners = new Set<() => void>()

function readRailOpenFromStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(RAIL_OPEN_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function onRailOpenStorage(e: StorageEvent) {
  if (e.key === RAIL_OPEN_STORAGE_KEY || e.key === null) railOpenListeners.forEach(l => l())
}

function subscribeRailOpen(listener: () => void) {
  railOpenListeners.add(listener)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onRailOpenStorage)
  }
  return () => {
    railOpenListeners.delete(listener)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onRailOpenStorage)
    }
  }
}

function getRailOpenSnapshot() {
  return readRailOpenFromStorage()
}

function getRailOpenServerSnapshot() {
  return false
}

function persistRailOpen(next: boolean) {
  try {
    if (next) window.localStorage.setItem(RAIL_OPEN_STORAGE_KEY, '1')
    else window.localStorage.removeItem(RAIL_OPEN_STORAGE_KEY)
  } catch {
    /* private mode / quota */
  }
  railOpenListeners.forEach(l => l())
}

function toggleRailOpen() {
  persistRailOpen(!readRailOpenFromStorage())
}

function readThemeFromStorage(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

function onThemeStorage(e: StorageEvent) {
  if (e.key === THEME_STORAGE_KEY || e.key === null) {
    const next = readThemeFromStorage()
    applyTheme(next)
    themeListeners.forEach(l => l())
  }
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onThemeStorage)
  }
  return () => {
    themeListeners.delete(listener)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onThemeStorage)
    }
  }
}

function getThemeSnapshot(): 'dark' | 'light' {
  const current = readThemeFromStorage()
  applyTheme(current)
  return current
}

function getThemeServerSnapshot(): 'dark' | 'light' {
  return 'dark'
}

function toggleTheme() {
  const next: 'dark' | 'light' = readThemeFromStorage() === 'dark' ? 'light' : 'dark'
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* private mode / quota */
  }
  applyTheme(next)
  themeListeners.forEach(l => l())
}

export default function Nav() {
  const path = usePathname()
  const railOpen = useSyncExternalStore(subscribeRailOpen, getRailOpenSnapshot, getRailOpenServerSnapshot)
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)
  const isLight = theme === 'light'

  return (
    <>
      <aside
        className={['hm-side-nav', railOpen ? 'hm-side-nav--expanded' : ''].filter(Boolean).join(' ')}
        aria-label="Primary"
      >
        <div className="hm-side-rail-brand">
          <div className="hm-side-rail-brandCollapsed" inert={railOpen || undefined}>
            <button
              type="button"
              className="hm-side-rail-pinBtn hm-side-rail-pinBtn--collapsed"
              onClick={() => toggleRailOpen()}
              aria-label="Open sidebar"
              aria-expanded={railOpen}
            >
              <SideRailLayoutIcon />
            </button>
          </div>
          <div className="hm-side-rail-brandExpanded" inert={!railOpen || undefined}>
            <div className="hm-side-rail-expandedInner">
              <div className="hm-side-rail-expandedLead" aria-hidden="true" />
              <HimmahBrand variant="rail" />
              <button
                type="button"
                className="hm-side-rail-pinBtn hm-side-rail-pinBtn--collapsed"
                aria-expanded={railOpen}
                aria-label="Close sidebar"
                onClick={e => {
                  e.stopPropagation()
                  toggleRailOpen()
                }}
              >
                <SideRailLayoutIcon />
              </button>
            </div>
          </div>
        </div>
        {links.map(l => {
          const active = path === l.href
          const Icon = l.Icon
          return (
            <Link
              key={`side-${l.href}`}
              href={l.href}
              className={active ? 'hm-side-link hm-side-link-active' : 'hm-side-link'}
            >
              <span className="hm-side-icon-wrap">
                <Icon />
              </span>
              <span className="hm-side-label">{l.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          className="hm-side-theme-toggle"
          onClick={() => toggleTheme()}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <span className="hm-side-icon-wrap">
            <ThemeIcon light={isLight} />
          </span>
          <span className="hm-side-label">{isLight ? 'dark mode' : 'light mode'}</span>
        </button>
      </aside>

      <nav className="hm-bottom-nav" aria-label="Primary">
        {links.map(l => {
          const active = path === l.href
          const Icon = l.Icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className={active ? 'hm-bottom-nav-link hm-bottom-nav-link-active' : 'hm-bottom-nav-link'}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="hm-bottom-nav-icon" />
              <span className="hm-bottom-nav-label">{l.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
