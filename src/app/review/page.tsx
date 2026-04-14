'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/Shell'
import api from '@/lib/api'

interface Task {
  id: number
  done: boolean
}

interface DayPlan {
  id: number
  date: string
  tasks: Task[]
}

interface DayReview {
  id: number
  date: string
  score: number
  reflection: string
  energy_level: number | null
  distracted_by: string
  gratitude_note: string
  barakah_felt: boolean
  barakah_note: string
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
    .toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toLowerCase()
}

export default function ReviewPage() {
  const router = useRouter()
  const date = useMemo(() => todayIso(), [])

  const [planDone, setPlanDone] = useState(0)
  const [planTotal, setPlanTotal] = useState(0)
  const [reviewId, setReviewId] = useState<number | null>(null)
  const [reflection, setReflection] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [barakah, setBarakah] = useState(false)
  const [barakahNote, setBarakahNote] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [energyLevel, setEnergyLevel] = useState<number | null>(null)
  const [distractedBy, setDistractedBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const missed = Math.max(0, planTotal - planDone)
  const percent = planTotal > 0 ? Math.round((planDone / planTotal) * 100) : 0

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    const [planRes, reviewRes] = await Promise.all([
      api.get<DayPlan[]>('/dayplans/', { params: { date } }),
      api.get<DayReview[]>('/dayreviews/', { params: { date } }),
    ])

    const plan = planRes.data?.[0]
    if (plan) {
      const doneCount = plan.tasks.filter(t => t.done).length
      setPlanDone(doneCount)
      setPlanTotal(plan.tasks.length)
    } else {
      setPlanDone(0)
      setPlanTotal(0)
    }

    const review = reviewRes.data?.[0]
    if (review) {
      setReviewId(review.id)
      setReflection(review.reflection ?? '')
      setGratitude(review.gratitude_note ?? '')
      setBarakah(Boolean(review.barakah_felt))
      setBarakahNote(review.barakah_note ?? '')
      setScore(review.score ?? null)
      setEnergyLevel(review.energy_level ?? null)
      setDistractedBy(review.distracted_by ?? '')
      setSubmitted(true)
    }
  }

  async function submitReview() {
    if (!score) return
    setSaving(true)
    try {
      const payload = {
        date,
        score,
        reflection,
        energy_level: energyLevel,
        distracted_by: distractedBy,
        gratitude_note: gratitude,
        barakah_felt: barakah,
        barakah_note: barakah ? barakahNote : '',
      }
      if (reviewId) {
        await api.patch(`/dayreviews/${reviewId}/`, payload)
      } else {
        const created = await api.post<DayReview>('/dayreviews/', payload)
        setReviewId(created.data.id)
      }
      setSubmitted(true)
    } finally {
      setSaving(false)
    }
  }

  function scoreButton(value: number, selected: number | null, onPick: (n: number) => void) {
    const active = selected === value
    return (
      <button
        key={value}
        type="button"
        onClick={() => onPick(value)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: `1px solid ${active ? 'var(--text-primary)' : 'var(--border)'}`,
          background: active ? 'var(--text-primary)' : 'var(--bg-card)',
          color: active ? 'var(--bg)' : 'var(--text-muted)',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        {value}
      </button>
    )
  }

  return (
    <Shell>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '.3rem' }}>end of day</div>
      <div style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '1rem' }}>{prettyDate(date)}</div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ width: '100%', height: '2px', background: 'var(--border)', borderRadius: '1px', marginBottom: '.45rem' }}>
          <div
            style={{
              width: `${percent}%`,
              height: '2px',
              background: 'var(--text-primary)',
              borderRadius: '1px',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
            {planDone}/{planTotal}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {percent}%</span>
        </div>
      </div>

      {missed > 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            fontSize: '12px',
            color: '#666',
            lineHeight: 1.45,
          }}
        >
          you missed <span style={{ color: 'var(--text-primary)' }}>{missed} task{missed > 1 ? 's' : ''}</span>. your tomorrow self carries this.
        </div>
      ) : null}

      <div style={{ marginBottom: '.8rem' }}>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '.4rem',
          }}
        >
          how did today actually go?
        </div>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="be honest. no one reads this but you."
          rows={3}
          style={{
            width: '100%',
            height: '64px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '.55rem .65rem',
            color: 'var(--text-primary)',
            fontSize: '12px',
            resize: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '.8rem' }}>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '.4rem',
          }}
        >
          gratitude
        </div>
        <input
          value={gratitude}
          onChange={e => setGratitude(e.target.value)}
          placeholder="one thing you're grateful for today"
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '.55rem .65rem',
            color: 'var(--text-primary)',
            fontSize: '12px',
          }}
        />
      </div>

      <div style={{ marginBottom: '.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.45rem' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>flow today?</div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>did today feel exceptional beyond your effort?</div>
          </div>
          <button
            type="button"
            onClick={() => setBarakah(v => !v)}
            style={{
              width: '32px',
              height: '18px',
              borderRadius: '9px',
              border: 'none',
              background: barakah ? 'var(--teal)' : 'var(--border)',
              position: 'relative',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Toggle barakah"
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: barakah ? 'var(--bg)' : 'var(--text-faint)',
                position: 'absolute',
                top: '3px',
                left: barakah ? '17px' : '3px',
                transition: 'left 120ms ease',
              }}
            />
          </button>
        </div>
        {barakah ? (
          <input
            value={barakahNote}
            onChange={e => setBarakahNote(e.target.value)}
            placeholder="what conditions made today exceptional?"
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '7px',
              padding: '.55rem .65rem',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          />
        ) : null}
      </div>

      <div style={{ marginBottom: '.8rem' }}>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '.4rem',
          }}
        >
          score your commitment
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '.35rem' }}>
          {[1, 2, 3, 4, 5].map(n => scoreButton(n, score, setScore))}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>1 = completely off · 5 = fully committed</div>
      </div>

      <div style={{ marginBottom: '.8rem' }}>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '.4rem',
          }}
        >
          energy level today
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>{[1, 2, 3, 4, 5].map(n => scoreButton(n, energyLevel, setEnergyLevel))}</div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: '.4rem',
          }}
        >
          what pulled you off?
        </div>
        <input
          value={distractedBy}
          onChange={e => setDistractedBy(e.target.value)}
          placeholder="what distracted you today?"
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '.55rem .65rem',
            color: 'var(--text-primary)',
            fontSize: '12px',
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => void submitReview()}
        disabled={!score || saving}
        style={{
          width: '100%',
          background: 'var(--text-primary)',
          color: 'var(--bg)',
          border: 'none',
          borderRadius: '7px',
          padding: '.7rem',
          fontSize: '12px',
          fontWeight: 500,
          cursor: !score || saving ? 'not-allowed' : 'pointer',
          opacity: !score || saving ? 0.45 : 1,
          marginBottom: '.7rem',
        }}
      >
        {saving ? 'saving...' : reviewId ? 'update review' : 'submit review'}
      </button>

      {submitted ? (
        <button
          type="button"
          onClick={() => router.push('/plan')}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-faint)',
            fontSize: '11px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          now plan tomorrow →
        </button>
      ) : null}
    </Shell>
  )
}
