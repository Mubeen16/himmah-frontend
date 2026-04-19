'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import HimmahBrand from '@/components/HimmahBrand'
import PasswordRevealField from '@/components/PasswordRevealField'

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const uid = (params.get('uid') ?? '').trim()
  const token = (params.get('token') ?? '').trim()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid || !token) {
      setError('invalid reset link — please request a new one')
    }
  }, [uid, token])

  async function handleSubmit() {
    if (!password || !confirm) return
    if (password !== confirm) {
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
      await api.post('/auth/password-reset/confirm/', { uid, token, password })
      setDone(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error
      setError(msg ?? 'reset failed — the link may have expired')
    } finally {
      setLoading(false)
    }
  }

  const passwordFieldStyle = {
    borderRadius: 10,
    border: '1px solid #242424',
    background: '#0f0f0f',
    color: '#e8e4dc',
    padding: '.75rem .85rem',
    fontSize: 14,
    outline: 'none',
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

        {!done ? (
          <>
            <p style={{ fontSize: 13, color: '#555', marginBottom: '1.5rem' }}>
              enter your new password
            </p>

            <div style={{ marginBottom: '.65rem' }}>
              <PasswordRevealField
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="new password"
                inputStyle={passwordFieldStyle}
                toggleColor="#888"
              />
            </div>
            <div style={{ marginBottom: '.9rem' }}>
              <PasswordRevealField
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
                placeholder="confirm new password"
                inputStyle={passwordFieldStyle}
                toggleColor="#888"
              />
            </div>

            {error ? (
              <p style={{
                marginBottom: '.75rem', borderRadius: 8,
                border: '1px solid #993C1D',
                background: 'rgba(216,90,48,0.12)',
                color: '#D85A30', fontSize: 13,
                padding: '.55rem .7rem',
              }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !password || !confirm || !uid || !token}
              style={{
                width: '100%', borderRadius: 10, border: 'none',
                background: '#e8e4dc', color: '#0f0f0f',
                padding: '.8rem', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: (loading || !password || !confirm) ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'resetting...' : 'reset password'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: 32, marginBottom: '1rem' }}>✓</div>
            <p style={{ fontSize: 15, color: '#e8e4dc', fontWeight: 500, marginBottom: '.5rem' }}>
              password reset
            </p>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              your password has been updated successfully.
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                width: '100%', borderRadius: 10, border: 'none',
                background: '#e8e4dc', color: '#0f0f0f',
                padding: '.8rem', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              sign in
            </button>
          </div>
        )}

        {!done ? (
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              marginTop: '.75rem', width: '100%',
              border: 'none', background: 'transparent',
              color: '#444', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← back to sign in
          </button>
        ) : null}
      </section>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
