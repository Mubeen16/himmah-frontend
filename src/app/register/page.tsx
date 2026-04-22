'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import HimmahBrand from '@/components/HimmahBrand'
import PasswordRevealField from '@/components/PasswordRevealField'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!username || !email || !password || !confirmPassword) {
      setError('all fields required')
      return
    }
    if (password !== confirmPassword) {
      setError('passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/register/', { username, email, password })
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      localStorage.setItem('username', res.data.username)
      document.cookie = `access_token=${res.data.access}; path=/; max-age=86400`
      router.push('/goals?onboarding=true&step=goal')
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data
        : undefined
      setError(typeof data?.error === 'string' ? data.error : 'registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'var(--bg)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          padding: '1.5rem',
        }}
      >
        <div style={{ marginBottom: '.75rem', color: 'var(--text-primary)' }}>
          <HimmahBrand />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
          create your account
        </p>

        <div style={{ marginBottom: '.65rem' }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="username"
            style={{
              width: '100%',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-primary)',
              padding: '.75rem .85rem',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '.65rem' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email"
            style={{
              width: '100%',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-primary)',
              padding: '.75rem .85rem',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '.65rem' }}>
          <PasswordRevealField
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="password"
            inputStyle={{
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-primary)',
              padding: '.75rem .85rem',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '.9rem' }}>
          <PasswordRevealField
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
            placeholder="confirm password"
            inputStyle={{
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-primary)',
              padding: '.75rem .85rem',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {error ? (
          <p
            style={{
              marginBottom: '.75rem',
              borderRadius: '8px',
              border: '1px solid #993C1D',
              background: 'rgba(216,90,48,0.12)',
              color: '#D85A30',
              fontSize: '13px',
              padding: '.55rem .7rem',
            }}
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          style={{
            width: '100%',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--text-primary)',
            color: 'var(--bg)',
            padding: '.8rem',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'creating...' : 'create account'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/login')}
          style={{
            marginTop: '.75rem',
            width: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          already have an account? sign in
        </button>
      </section>
    </main>
  )
}
