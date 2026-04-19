'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import HimmahBrand from '@/components/HimmahBrand'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/password-reset/', { email: email.trim() })
      setSent(true)
    } catch {
      setError('something went wrong — try again')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    borderRadius: 10,
    border: '1px solid #242424',
    background: '#0f0f0f',
    color: '#e8e4dc',
    padding: '.75rem .85rem',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  const btnStyle = {
    width: '100%',
    borderRadius: 10,
    border: 'none',
    background: '#e8e4dc',
    color: '#0f0f0f',
    padding: '.8rem',
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    fontFamily: 'inherit',
  }

  return (
    <main style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', background: '#0f0f0f',
    }}>
      <section style={{
        width: '100%', maxWidth: 420,
        borderRadius: 16, border: '1px solid #1e1e1e',
        background: '#141414', padding: '1.5rem',
      }}>
        <div style={{ marginBottom: '.75rem' }}>
          <HimmahBrand />
        </div>

        {!sent ? (
          <>
            <p style={{ fontSize: 13, color: '#555', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              enter the email address on your account and we will send you a reset link
            </p>

            <div style={{ marginBottom: '.65rem' }}>
              <label style={{ display: 'block', fontSize: 10, color: '#444', marginBottom: '.35rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
                placeholder="your@email.com"
                style={inputStyle}
              />
            </div>

            {error ? (
              <p style={{
                marginBottom: '.75rem', borderRadius: 8,
                border: '1px solid #993C1D', background: 'rgba(216,90,48,0.12)',
                color: '#D85A30', fontSize: 13, padding: '.55rem .7rem',
              }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !email.trim()}
              style={btnStyle}
            >
              {loading ? 'sending...' : 'send reset link'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: 32, marginBottom: '1rem' }}>✉️</div>
            <p style={{ fontSize: 15, color: '#e8e4dc', fontWeight: 500, marginBottom: '.5rem' }}>
              check your email
            </p>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              if an account exists for <strong style={{ color: '#888' }}>{email}</strong>,
              a reset link has been sent. check your inbox.
            </p>
            <p style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>
              did not get it? check your spam folder or try again with a different email.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push('/login')}
          style={{
            marginTop: '.75rem', width: '100%',
            border: 'none', background: 'transparent',
            color: '#444', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ← back to sign in
        </button>
      </section>
    </main>
  )
}
