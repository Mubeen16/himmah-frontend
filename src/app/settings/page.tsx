'use client'

import { useState } from 'react'
import Shell from '@/components/Shell'
import { logout } from '@/lib/auth'

export default function SettingsPage() {
  const [username] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('username') ?? 'member') : 'member',
  )

  function handleSignOut() {
    const ok = window.confirm('sign out of Himmah?')
    if (!ok) return
    logout()
  }

  return (
    <Shell>
      <h1
        style={{
          fontSize: '22px',
          color: 'var(--text-primary)',
          fontWeight: 400,
          marginBottom: '1rem',
        }}
      >
        settings
      </h1>

      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '0.9rem',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '0.6rem',
          }}
        >
          account
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {username}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>member since today</div>
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.75rem',
          fontSize: '14px',
          color: 'var(--red)',
          cursor: 'pointer',
          marginBottom: '0.95rem',
        }}
      >
        sign out
      </button>

      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid #993C1D',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: 'var(--red)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '0.5rem',
          }}
        >
          danger zone
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
          delete account and all data
        </div>
        <button
          type="button"
          disabled
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-muted)',
            borderRadius: '7px',
            padding: '0.5rem 0.75rem',
            fontSize: '13px',
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          delete account
        </button>
        <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '0.5rem' }}>
          coming in a future update
        </div>
      </section>
    </Shell>
  )
}
