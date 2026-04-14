'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/', label: 'today' },
  { href: '/plan', label: 'plan' },
  { href: '/review', label: 'review' },
  { href: '/goals', label: 'goals' },
  { href: '/settings', label: 'M' },
]

export default function Nav() {
  const path = usePathname()
  const [pinned, setPinned] = useState(false)

  return (
    <>
      <aside className={pinned ? 'hm-side-nav hm-side-nav-pinned' : 'hm-side-nav'} aria-label="Primary">
        <button
          type="button"
          onClick={() => setPinned(v => !v)}
          className="hm-side-toggle"
          aria-label={pinned ? 'Collapse sidebar' : 'Expand sidebar'}
          title={pinned ? 'Collapse' : 'Expand'}
        >
          {pinned ? '←' : '→'}
        </button>
        {links.map(l => {
          const active = path === l.href
          return (
            <Link
              key={`side-${l.href}`}
              href={l.href}
              className={active ? 'hm-side-link hm-side-link-active' : 'hm-side-link'}
            >
              <span className="hm-side-dot" aria-hidden />
              <span className="hm-side-label">{l.label}</span>
            </Link>
          )
        })}
      </aside>

      <nav className="hm-bottom-nav" aria-label="Primary">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 'var(--fs-meta)',
              letterSpacing: '.03em',
              color: path === l.href ? 'var(--text-primary)' : 'var(--text-fainter)',
              fontWeight: 400,
            }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
