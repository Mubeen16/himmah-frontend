'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { triggerRefresh } from '@/lib/refresh'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getRevisitDate(daysPerWeek: number, hoursPerSession: number, deadlineStr: string): number {
  if (!deadlineStr) return 0
  const today = new Date()
  const end = new Date(deadlineStr)
  const weeks = Math.max(0, Math.round((end.getTime()-today.getTime())/(7*24*60*60*1000)))
  return Math.round(weeks * daysPerWeek * hoursPerSession * 10) / 10
}

const inputStyle = {
  width: '100%',
  background: '#141414',
  border: '1px solid #1e1e1e',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: '#e8e4dc',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

export default function OnboardingStep1() {
  const router = useRouter()
  const name = typeof window !== 'undefined'
    ? (localStorage.getItem('username') ?? 'there') : 'there'

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('professional')
  const [deadline, setDeadline] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [hoursPerSession, setHoursPerSession] = useState(2)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalHours = useMemo(() =>
    getRevisitDate(daysPerWeek, hoursPerSession, deadline),
    [daysPerWeek, hoursPerSession, deadline]
  )

  const perWeek = daysPerWeek * hoursPerSession

  async function handleSubmit() {
    if (!title.trim() || !deadline) return
    setSaving(true)
    setError('')
    try {
      await api.post('/goals/', {
        title: title.trim(),
        category,
        status: 'active',
        target_hours: totalHours || 100,
        start_date: todayIso(),
        target_date: deadline,
        is_primary: true,
      })
      triggerRefresh()
      router.push('/onboarding/step2')
    } catch {
      setError('something went wrong — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* progress */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i === 0 ? '#e8e4dc' : '#1e1e1e'
          }} />
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>step 1 of 3</div>
        <div style={{ fontSize: 24, color: '#e8e4dc', fontWeight: 300, lineHeight: 1.2 }}>
          welcome, <strong style={{ fontWeight: 500 }}>{name}</strong>
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 6, lineHeight: 1.5 }}>
          himmah is built around one primary goal. what are you building toward?
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          what is your goal?
        </div>
        <input
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. become a backend engineer"
          autoFocus
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          category
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['professional','spiritual','family','health'].map(cat => (
            <button key={cat} type="button"
              onClick={() => setCategory(cat)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12,
                border: '1px solid',
                borderColor: category === cat ? '#2a3d2a' : '#1e1e1e',
                background: category === cat ? '#1a2a1a' : '#0f0f0f',
                color: category === cat ? '#5DCAA5' : '#444',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          deadline
        </div>
        <input
          type="date"
          style={{ ...inputStyle, colorScheme: 'dark' }}
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
          commitment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>days / week</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" min={1} max={7} value={daysPerWeek}
                onChange={e => setDaysPerWeek(Number(e.target.value))}
                style={{ width: 48, background: 'transparent', border: 'none', fontSize: 22, fontWeight: 500, color: '#e8e4dc', outline: 'none', fontFamily: 'inherit' }} />
              <span style={{ fontSize: 12, color: '#444' }}>days</span>
            </div>
          </div>
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>hours / session</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" min={0.5} max={12} step={0.5} value={hoursPerSession}
                onChange={e => setHoursPerSession(Number(e.target.value))}
                style={{ width: 48, background: 'transparent', border: 'none', fontSize: 22, fontWeight: 500, color: '#e8e4dc', outline: 'none', fontFamily: 'inherit' }} />
              <span style={{ fontSize: 12, color: '#444' }}>hrs</span>
            </div>
          </div>
        </div>
      </div>

      {deadline ? (
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#555' }}>per week</span>
            <span style={{ fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>{perWeek}h</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#555' }}>total committed</span>
            <span style={{ fontSize: 14, color: '#5DCAA5', fontWeight: 500 }}>{totalHours}h</span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div style={{ fontSize: 13, color: '#D85A30', background: 'rgba(216,90,48,0.1)', border: '1px solid #993C1D', borderRadius: 8, padding: '8px 12px' }}>
          {error}
        </div>
      ) : null}

      <button type="button"
        onClick={() => void handleSubmit()}
        disabled={!title.trim() || !deadline || saving}
        style={{
          width: '100%', padding: 14, background: '#e8e4dc',
          border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 500, color: '#0f0f0f', cursor: 'pointer',
          opacity: (!title.trim() || !deadline || saving) ? 0.4 : 1,
          fontFamily: 'inherit',
        }}>
        {saving ? 'saving...' : 'this is my primary goal →'}
      </button>

    </div>
  )
}
