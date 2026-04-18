'use client'

import axios from 'axios'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HimmahBrand from '@/components/HimmahBrand'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      router.push('/')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError(
            'cannot reach the API — start Django (port 8000) or check the URL in src/lib/auth.ts'
          )
        } else if (err.response.status === 401) {
          setError('invalid username or password')
        } else {
          const detail = err.response.data?.detail
          setError(
            typeof detail === 'string'
              ? detail
              : 'something went wrong — check the browser network tab'
          )
        }
      } else {
        setError('invalid username or password')
      }
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
          sign in to continue
        </p>

        <div style={{ marginBottom: '.65rem' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-faint)', marginBottom: '.35rem' }}>
            username
          </label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="your username"
            style={{
              width: '100%',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              padding: '.75rem .85rem',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '.9rem' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-faint)', marginBottom: '.35rem' }}>
            password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="your password"
            style={{
              width: '100%',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              padding: '.75rem .85rem',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {error && (
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
        )}

        <button
          type="button"
          onClick={handleLogin}
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
          {loading ? 'signing in...' : 'sign in'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/register')}
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
          don&apos;t have an account? register
        </button>

      </section>
    </main>
  )
}
