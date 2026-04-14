'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

type Verdict = 'parked' | 'pivot' | 'rejected'

interface Goal {
  id: number
  title: string
  start_date: string
  target_date: string
}

function monthYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function dateAfter48HoursText(): string {
  const d = new Date()
  d.setHours(d.getHours() + 48)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function journey(goal: Goal | null) {
  if (!goal) return { weekCurrent: 1, weekTotal: 1, progress: 0, daysToCheckpoint: 7 }
  const start = new Date(goal.start_date)
  const end = new Date(goal.target_date)
  const now = new Date()
  const msPerDay = 86400000
  const daysTotal = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay))
  const weekTotal = Math.max(1, Math.floor(daysTotal / 7))
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / msPerDay))
  const weekCurrent = Math.min(weekTotal, Math.max(1, Math.floor(daysElapsed / 7) + 1))
  const progress = Math.min(100, Math.max(0, Math.round((weekCurrent / weekTotal) * 100)))
  const checkpointMod = daysElapsed % 7
  const daysToCheckpoint = checkpointMod === 0 ? 7 : 7 - checkpointMod
  return { weekCurrent, weekTotal, progress, daysToCheckpoint }
}

export default function GatePage() {
  const router = useRouter()
  const [primaryGoal, setPrimaryGoal] = useState<Goal | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const j = useMemo(() => journey(primaryGoal), [primaryGoal])

  useEffect(() => {
    void loadPrimaryGoal()
  }, [])

  async function loadPrimaryGoal() {
    const res = await api.get<Goal[]>('/goals/', { params: { status: 'active', is_primary: true } })
    setPrimaryGoal(res.data?.[0] ?? null)
  }

  async function submitIdea() {
    if (!title.trim() || !verdict) return
    setSaving(true)
    try {
      await api.post('/distractions/', {
        title: title.trim(),
        description: description.trim(),
        triggered_at: new Date().toISOString(),
        verdict,
        verdict_reason: description.trim(),
      })
      setSubmitted(true)
    } finally {
      setSaving(false)
    }
  }

  function verdictMessage() {
    if (verdict === 'parked') return `parked. revisit on ${dateAfter48HoursText()}. go back to your plan.`
    if (verdict === 'pivot') return 'noted as pivot. update your plan to reflect this.'
    if (verdict === 'rejected') return 'rejected. now close this and go back to work.'
    return ''
  }

  function verdictButton(v: Verdict, label: string, sub: string) {
    const selected = verdict === v
    const styleMap: Record<Verdict, { color: string; border: string; tint: string }> = {
      parked: { color: '#666', border: '#2a2a2a', tint: 'rgba(255,255,255,0.03)' },
      pivot: { color: '#5DCAA5', border: '#0F6E56', tint: 'rgba(93,202,165,0.08)' },
      rejected: { color: '#D85A30', border: '#993C1D', tint: 'rgba(216,90,48,0.08)' },
    }
    const c = styleMap[v]
    return (
      <button
        type="button"
        onClick={() => setVerdict(v)}
        style={{
          flex: 1,
          background: selected ? c.tint : '#1e1e1e',
          color: c.color,
          border: `1px solid ${c.border}`,
          borderRadius: '8px',
          padding: '.55rem .35rem',
          cursor: 'pointer',
          opacity: selected ? 1 : 0.9,
        }}
      >
        <div style={{ fontSize: '11px', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '9px', opacity: 0.7 }}>{sub}</div>
      </button>
    )
  }

  return (
    <main
      style={{
        maxWidth: '420px',
        margin: '0 auto',
        padding: '2rem 1.5rem 1rem',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}
      >
        <span style={{ fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '.05em' }}>هِمَّة</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>commitment gate</span>
      </header>

      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '.5rem',
          }}
        >
          before you start anything new
        </div>
        <div style={{ fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '.65rem' }}>
          you are on week {j.weekCurrent} of {j.weekTotal}.
          <br />
          {j.daysToCheckpoint} days to next checkpoint.
        </div>
        <div style={{ width: '100%', height: '2px', background: 'var(--border)', borderRadius: '1px', marginBottom: '.5rem' }}>
          <div
            style={{
              width: `${j.progress}%`,
              height: '2px',
              borderRadius: '1px',
              background: 'var(--red)',
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          skipping today costs you one week. you cannot get it back.
        </div>
      </section>

      <section style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>
          what is the idea?
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="title of the idea"
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '.55rem .65rem',
            color: 'var(--text-primary)',
            fontSize: '12px',
            marginBottom: '.45rem',
          }}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="describe it — what is it and why does it feel urgent?"
          rows={3}
          style={{
            width: '100%',
            height: '72px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '.55rem .65rem',
            color: 'var(--text-primary)',
            fontSize: '12px',
            resize: 'none',
          }}
        />
      </section>

      <section style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>
          does this serve the same destination?
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '.75rem' }}>
          your goal: {primaryGoal?.title ?? 'no primary goal set'} by {primaryGoal ? monthYear(primaryGoal.target_date) : '—'}.
          does this get you there faster — or somewhere different?
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {verdictButton('parked', 'PARK IT', 'revisit in 48hrs')}
          {verdictButton('pivot', 'PIVOT', 'restructure plan')}
          {verdictButton('rejected', 'REJECT', 'not now ever')}
        </div>
        {verdict ? <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '.75rem' }}>{verdictMessage()}</div> : null}
      </section>

      {!submitted ? (
        <button
          type="button"
          onClick={() => void submitIdea()}
          disabled={!title.trim() || !verdict || saving}
          style={{
            width: '100%',
            background: 'var(--text-primary)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: '7px',
            padding: '.7rem',
            fontSize: '12px',
            fontWeight: 500,
            cursor: !title.trim() || !verdict || saving ? 'not-allowed' : 'pointer',
            opacity: !title.trim() || !verdict || saving ? 0.45 : 1,
          }}
        >
          {saving ? 'logging...' : 'log this idea'}
        </button>
      ) : (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '.6rem' }}>
            logged. now go back.
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              width: '100%',
              background: 'var(--text-primary)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '7px',
              padding: '.7rem',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            back to today
          </button>
        </div>
      )}
    </main>
  )
}
