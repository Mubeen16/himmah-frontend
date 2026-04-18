'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import HimmahBrand from '@/components/HimmahBrand'
import api from '@/lib/api'
import styles from './gate.module.css'

type Verdict = 'parked' | 'pivot' | 'rejected'

interface Goal {
  id: number
  title: string
  start_date: string
  target_date: string
}

type ParkedIdea = {
  id: number
  title: string
  description: string
  triggered_at: string
  revisit_after: string
}

type GoalOption = { id: number; title: string }

function monthYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function dateAfter48HoursText(): string {
  const d = new Date()
  d.setHours(d.getHours() + 48)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
}

function isPast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().slice(0, 10)
}

function formatRevisitLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

const verdictStyle: Record<Verdict, { color: string; border: string; tint: string }> = {
  parked: { color: '#888', border: '#2a2a2a', tint: 'rgba(255,255,255,0.04)' },
  pivot: { color: '#5DCAA5', border: '#0F6E56', tint: 'rgba(93,202,165,0.1)' },
  rejected: { color: '#D85A30', border: '#993C1D', tint: 'rgba(216,90,48,0.1)' },
}

export default function GatePage() {
  const router = useRouter()
  const [primaryGoal, setPrimaryGoal] = useState<Goal | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedPivot, setSubmittedPivot] = useState(false)
  const [parkedIdeas, setParkedIdeas] = useState<ParkedIdea[]>([])
  const [goals, setGoals] = useState<GoalOption[]>([])
  const [pivotGoalId, setPivotGoalId] = useState<number | null>(null)

  const j = useMemo(() => journey(primaryGoal), [primaryGoal])

  useEffect(() => {
    void (async () => {
      await loadPrimaryGoal()
      const [parkedRes, goalsRes] = await Promise.all([
        api.get<ParkedIdea[]>('/distractions/', { params: { verdict: 'parked' } }),
        api.get<GoalOption[]>('/goals/', { params: { status: 'active' } }),
      ])
      setParkedIdeas(parkedRes.data ?? [])
      setGoals(goalsRes.data ?? [])
    })()
  }, [])

  async function loadPrimaryGoal() {
    const res = await api.get<Goal[]>('/goals/', { params: { status: 'active', is_primary: true } })
    setPrimaryGoal(res.data?.[0] ?? null)
  }

  async function updateVerdict(id: number, newVerdict: 'pivot' | 'rejected') {
    await api.patch(`/distractions/${id}/`, { verdict: newVerdict })
    setParkedIdeas(prev => prev.filter(d => d.id !== id))
  }

  async function submitIdea() {
    if (!title.trim() || !verdict) return
    setSaving(true)
    try {
      const body: {
        title: string
        description: string
        triggered_at: string
        verdict: Verdict
        verdict_reason: string
        goal?: number
      } = {
        title: title.trim(),
        description: description.trim(),
        triggered_at: new Date().toISOString(),
        verdict,
        verdict_reason: description.trim(),
      }
      if (verdict === 'pivot' && pivotGoalId != null) {
        body.goal = pivotGoalId
      }
      await api.post('/distractions/', body)
      setSubmittedPivot(verdict === 'pivot')
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
    const c = verdictStyle[v]
    return (
      <button
        type="button"
        className={styles.verdictBtn}
        onClick={() => setVerdict(v)}
        style={{
          background: selected ? c.tint : '#1a1a1a',
          color: c.color,
          borderColor: selected ? c.border : '#2a2a2a',
        }}
      >
        <div className={styles.verdictBtnInner}>{label}</div>
        <div className={styles.verdictBtnSub}>{sub}</div>
      </button>
    )
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.push('/')} aria-label="Back to today">
          ← back
        </button>
        <div className={styles.headerBrand}>
          <HimmahBrand />
        </div>
        <div className={styles.headerRight}>
          <div className={styles.kicker}>pause</div>
          <div className={styles.pageTitle}>commitment gate</div>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="gate-context">
        <div id="gate-context" className={styles.cardLabel}>
          before you start anything new
        </div>
        <div className={styles.statBlock}>
          you are on week <span className={styles.statNum}>{j.weekCurrent}</span> of {j.weekTotal}.
          <br />
          <span className={styles.statNum}>{j.daysToCheckpoint}</span> days to next checkpoint.
        </div>
        <div className={styles.progressTrack} role="progressbar" aria-valuenow={j.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.progressFill} style={{ width: `${j.progress}%` }} />
        </div>
        <p className={styles.cardFootnote}>
          skipping today costs you one week. you cannot get it back.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>what is the idea?</div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="title of the idea"
          className={styles.input}
          autoComplete="off"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="describe it — what is it and why does it feel urgent?"
          className={styles.textarea}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>does this serve the same destination?</div>
        <p className={styles.goalLine}>
          your goal:{' '}
          <span className={styles.goalTitle}>{primaryGoal?.title ?? 'no primary goal set'}</span> by{' '}
          {primaryGoal ? monthYear(primaryGoal.target_date) : '—'}. does this get you there faster — or somewhere
          different?
        </p>
        <div className={styles.verdictRow}>
          {verdictButton('parked', 'PARK IT', 'revisit in 48hrs')}
          {verdictButton('pivot', 'PIVOT', 'restructure plan')}
          {verdictButton('rejected', 'REJECT', 'not now ever')}
        </div>
        {verdict === 'pivot' ? (
          <div>
            <div
              style={{
                fontSize: '10px',
                color: '#444',
                textTransform: 'uppercase',
                marginTop: '0.75rem',
                marginBottom: '0.4rem',
              }}
            >
              which goal does this connect to?
            </div>
            <select
              value={pivotGoalId ?? ''}
              onChange={e => {
                const v = e.target.value
                setPivotGoalId(v === '' ? null : Number(v))
              }}
              style={{
                width: '100%',
                background: '#181818',
                border: '1px solid #242424',
                borderRadius: '7px',
                padding: '0.5rem 0.65rem',
                fontSize: '13px',
                color: '#e8e4dc',
              }}
            >
              <option value="">select a goal</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '0.35rem' }}>
              after logging this pivot go to /plan and restructure tomorrow
            </div>
          </div>
        ) : null}
        {verdict ? <div className={styles.verdictHint}>{verdictMessage()}</div> : null}
      </section>

      {!submitted ? (
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => void submitIdea()}
          disabled={!title.trim() || !verdict || saving}
        >
          {saving ? 'logging...' : 'log this idea'}
        </button>
      ) : submittedPivot ? (
        <div className={styles.successWrap}>
          <div className={styles.successIcon} aria-hidden>
            ✓
          </div>
          <p className={styles.successText}>pivot logged. now go to plan and restructure tomorrow.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button type="button" className={styles.primaryBtn} onClick={() => router.push('/plan')}>
              go to plan
            </button>
            <button type="button" className={styles.primaryBtn} onClick={() => router.push('/')}>
              back to today
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.successWrap}>
          <div className={styles.successIcon} aria-hidden>
            ✓
          </div>
          <p className={styles.successText}>logged. now go back to today.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => router.push('/')}>
            back to today
          </button>
        </div>
      )}

      {parkedIdeas.length > 0 ? (
        <section className={styles.parkedSection} aria-label="Parked ideas">
          <div className={styles.parkedLabel}>parked ideas</div>
          {parkedIdeas.map(idea => {
            const ra = idea.revisit_after?.slice(0, 10) ?? ''
            const metaClass = isToday(ra) ? styles.metaToday : isPast(ra) ? styles.metaPast : styles.metaFuture
            return (
              <div key={idea.id} className={styles.parkedCard}>
                <div className={styles.parkedTitle}>{idea.title}</div>
                <div className={`${styles.parkedMeta} ${metaClass}`}>
                  {isToday(ra)
                    ? 'revisit today'
                    : isPast(ra)
                      ? `overdue since ${formatRevisitLabel(ra)}`
                      : `revisit on ${formatRevisitLabel(ra)}`}
                </div>
                <div className={styles.parkedActions}>
                  <button
                    type="button"
                    className={`${styles.parkedBtn} ${styles.parkedBtnPivot}`}
                    onClick={() => void updateVerdict(idea.id, 'pivot')}
                  >
                    still relevant → pivot
                  </button>
                  <button
                    type="button"
                    className={`${styles.parkedBtn} ${styles.parkedBtnReject}`}
                    onClick={() => void updateVerdict(idea.id, 'rejected')}
                  >
                    no longer relevant → reject
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      ) : null}
    </main>
  )
}
