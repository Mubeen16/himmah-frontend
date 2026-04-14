'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import api from '@/lib/api'

type Category = 'professional' | 'spiritual' | 'family' | 'health'
type DurationUnit = 'days' | 'weeks' | 'months' | 'years'
type EffortUnit = 'hours' | 'days'

interface Goal {
  id: number
  title: string
  category: string
  status: string
  is_primary: boolean
  target_hours: number
  start_date: string
  target_date: string
  logged_hours: number
}

function monthYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function sixMonthsFromTodayIso(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function shiftDateFromToday(amount: number, unit: DurationUnit): string {
  const d = new Date()
  if (unit === 'days') d.setDate(d.getDate() + amount)
  if (unit === 'weeks') d.setDate(d.getDate() + amount * 7)
  if (unit === 'months') d.setMonth(d.getMonth() + amount)
  if (unit === 'years') d.setFullYear(d.getFullYear() + amount)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function stats(goal: Goal) {
  const target = Number(goal.target_hours || 0)
  const logged = Number(goal.logged_hours || 0)
  const progress = target > 0 ? Math.min(100, Math.round((logged / target) * 100)) : 0
  const start = new Date(goal.start_date)
  const end = new Date(goal.target_date)
  const now = new Date()
  const totalMs = Math.max(1, end.getTime() - start.getTime())
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()))
  const elapsedRatio = elapsedMs / totalMs
  const paceRatio = target > 0 ? logged / target : 0
  const onTrack = logged > 0 && paceRatio >= elapsedRatio
  return { target, logged, progress, onTrack }
}

function colorsForCategory(category: string) {
  if (category === 'spiritual') {
    return {
      badgeColor: '#7F77DD',
      badgeBg: '#1a1a2a',
      badgeBorder: '#534AB7',
      fill: '#7F77DD',
    }
  }
  if (category === 'family') {
    return {
      badgeColor: '#EF9F27',
      badgeBg: '#2a1a1a',
      badgeBorder: '#854F0B',
      fill: '#EF9F27',
    }
  }
  if (category === 'health') {
    return {
      badgeColor: '#D85A30',
      badgeBg: '#2a1a1a',
      badgeBorder: '#993C1D',
      fill: '#D85A30',
    }
  }
  return {
    badgeColor: '#5DCAA5',
    badgeBg: '#1a2a1a',
    badgeBorder: '#0F6E56',
    fill: '#5DCAA5',
  }
}

export default function GoalsPage() {
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const quickCategories: Category[] = ['professional', 'spiritual', 'family', 'health']
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState('professional')
  const [formTargetHours, setFormTargetHours] = useState(100)
  const [formEndDate, setFormEndDate] = useState(sixMonthsFromTodayIso())
  const [durationValue, setDurationValue] = useState(6)
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('months')
  const [effortValue, setEffortValue] = useState(100)
  const [effortUnit, setEffortUnit] = useState<EffortUnit>('hours')
  const [saving, setSaving] = useState(false)

  const primaryGoal = useMemo(() => goals.find(g => g.is_primary) ?? null, [goals])
  const grouped = useMemo(() => {
      const order: Category[] = ['professional', 'spiritual', 'family', 'health']
    const result: Record<Category, Goal[]> = {
      professional: [],
      spiritual: [],
      family: [],
      health: [],
    }
    goals.forEach(g => {
      if (g.is_primary) return
      const cat: Category = (order.includes(g.category as Category)
        ? (g.category as Category)
        : 'professional') as Category
      result[cat].push(g)
    })
    return result
  }, [goals])

  useEffect(() => {
    void loadGoals()
  }, [])

  useEffect(() => {
    setFormEndDate(shiftDateFromToday(Math.max(1, durationValue), durationUnit))
  }, [durationValue, durationUnit])

  useEffect(() => {
    setFormTargetHours(effortUnit === 'hours' ? Math.max(1, effortValue) : Math.max(1, effortValue) * 4)
  }, [effortValue, effortUnit])

  async function loadGoals() {
    setLoading(true)
    try {
      const res = await api.get<Goal[]>('/goals/', { params: { status: 'active' } })
      setGoals(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function addGoal() {
    if (!formTitle.trim()) return
    setSaving(true)
    try {
      await api.post('/goals/', {
        title: formTitle.trim(),
        category: formCategory,
        status: 'active',
        target_hours: formTargetHours,
        start_date: todayIso(),
        target_date: formEndDate,
        is_primary: false,
      })
      setFormTitle('')
      setFormCategory('professional')
      setFormTargetHours(100)
      setFormEndDate(sixMonthsFromTodayIso())
      setDurationValue(6)
      setDurationUnit('months')
      setEffortValue(100)
      setEffortUnit('hours')
      setShowForm(false)
      await loadGoals()
    } finally {
      setSaving(false)
    }
  }

  async function deleteGoal(id: number) {
    const ok = window.confirm('delete this goal? this cannot be undone.')
    if (!ok) return
    await api.delete(`/goals/${id}/`)
    await loadGoals()
  }

  function GoalCard({ goal, primary, onDelete }: { goal: Goal; primary: boolean; onDelete: () => void }) {
    const s = stats(goal)
    const c = colorsForCategory(goal.category)
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${primary ? '#2a2a2a' : '#1e1e1e'}`,
          borderRadius: '8px',
          padding: '.9rem 1rem',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '.5rem' }}>
          <div style={{ fontSize: 'var(--fs-body-small)', color: 'var(--text-primary)', lineHeight: 1.35, flex: 1 }}>
            {goal.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            <div
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '20px',
                color: c.badgeColor,
                background: c.badgeBg,
                border: `1px solid ${c.badgeBorder}`,
              }}
            >
              {goal.category}
            </div>
            <button
              type="button"
              onClick={onDelete}
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#D85A30'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              delete
            </button>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '.6rem' }}>
          {monthYear(goal.start_date)} → {monthYear(goal.target_date)} · {s.target}h target
        </div>
        <div style={{ width: '100%', height: '2px', background: '#1e1e1e', borderRadius: '1px', marginBottom: '.35rem' }}>
          <div
            style={{
              width: `${s.progress}%`,
              height: '2px',
              borderRadius: '1px',
              background: c.fill,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-faint)' }}>
          <span>{s.logged}h logged</span>
          <span style={{ color: 'var(--text-primary)' }}>{s.target}h target</span>
        </div>
        {s.logged > 0 ? (
          <div style={{ fontSize: '10px', color: s.onTrack ? '#5DCAA5' : '#D85A30', marginTop: '.35rem' }}>
            {s.onTrack ? 'on track' : 'behind'}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Shell>
      {isOnboarding && goals.length === 0 ? (
        <div
          style={{
            background: '#1a2a1a',
            border: '1px solid #0F6E56',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '13px',
            color: '#5DCAA5',
          }}
        >
          start here — add your first goal before planning your day
        </div>
      ) : null}
      <div style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 400, marginBottom: '.25rem' }}>
        your goals
      </div>
      <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        everything you&apos;re building toward
      </div>

      <button
        type="button"
        onClick={() => setShowForm(v => !v)}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid #222',
          borderRadius: '8px',
          padding: '.65rem',
          fontSize: 'var(--fs-meta)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '1.5rem',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '14px', color: 'var(--text-faint)' }}>+</span>
        <span>add a new goal</span>
      </button>

      {showForm ? (
        <>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.6rem' }}>
            add new goal
          </div>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid #1e1e1e',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="goal title"
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid #1e1e1e',
                borderRadius: '7px',
                padding: '.5rem .65rem',
                fontSize: 'var(--fs-meta)',
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {quickCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormCategory(cat)}
                  style={{
                    flex: 1,
                    padding: '.4rem',
                    borderRadius: '6px',
                    fontSize: '11px',
                    textAlign: 'center',
                    border: `1px solid ${formCategory === cat ? '#5DCAA5' : '#1e1e1e'}`,
                    color: formCategory === cat ? '#5DCAA5' : 'var(--text-muted)',
                    background: 'var(--bg)',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              placeholder="or type your own category"
              value={quickCategories.includes(formCategory as Category) ? '' : formCategory}
              onChange={e => setFormCategory(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: `1px solid ${quickCategories.includes(formCategory as Category) ? '#1e1e1e' : '#5DCAA5'}`,
                borderRadius: '7px',
                padding: '.5rem .65rem',
                fontSize: 'var(--fs-meta)',
                color: quickCategories.includes(formCategory as Category) ? 'var(--text-primary)' : '#5DCAA5',
                marginBottom: '8px',
              }}
            />
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  type="number"
                  min={1}
                  value={durationValue}
                  onChange={e => setDurationValue(Number(e.target.value) || 1)}
                  style={{
                    flex: 1,
                    background: 'var(--bg)',
                    border: '1px solid #1e1e1e',
                    borderRadius: '7px',
                    padding: '.5rem .65rem',
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--text-primary)',
                  }}
                />
                <div style={{ display: 'flex', gap: '4px', flex: 1.4 }}>
                  {(['days', 'weeks', 'months', 'years'] as DurationUnit[]).map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setDurationUnit(unit)}
                      style={{
                        flex: 1,
                        padding: '.4rem',
                        borderRadius: '6px',
                        fontSize: '11px',
                        border: `1px solid ${durationUnit === unit ? '#5DCAA5' : '#1e1e1e'}`,
                        color: durationUnit === unit ? '#5DCAA5' : 'var(--text-muted)',
                        background: 'var(--bg)',
                        cursor: 'pointer',
                      }}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>until {longDate(formEndDate)}</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: effortUnit === 'days' ? '6px' : '0' }}>
                <input
                  type="number"
                  min={1}
                  value={effortValue}
                  onChange={e => setEffortValue(Number(e.target.value) || 1)}
                  style={{
                    flex: 1,
                    background: 'var(--bg)',
                    border: '1px solid #1e1e1e',
                    borderRadius: '7px',
                    padding: '.5rem .65rem',
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--text-primary)',
                  }}
                />
                <div style={{ display: 'flex', gap: '4px', flex: 1.4 }}>
                  {(['hours', 'days'] as EffortUnit[]).map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setEffortUnit(unit)}
                      style={{
                        flex: 1,
                        padding: '.4rem',
                        borderRadius: '6px',
                        fontSize: '11px',
                        border: `1px solid ${effortUnit === unit ? '#5DCAA5' : '#1e1e1e'}`,
                        color: effortUnit === unit ? '#5DCAA5' : 'var(--text-muted)',
                        background: 'var(--bg)',
                        cursor: 'pointer',
                      }}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              {effortUnit === 'days' ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>= {formTargetHours}h total</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void addGoal()}
              disabled={saving}
              style={{
                width: '100%',
                background: 'var(--text-primary)',
                border: 'none',
                borderRadius: '7px',
                padding: '.7rem',
                fontSize: 'var(--fs-meta)',
                color: 'var(--bg)',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.45 : 1,
              }}
            >
              {saving ? 'saving...' : 'add goal'}
            </button>
          </div>
        </>
      ) : null}

      {loading ? (
        <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>loading...</p>
      ) : (
        <>
          {primaryGoal ? (
            <>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.6rem' }}>
                primary
              </div>
              <GoalCard goal={primaryGoal} primary onDelete={() => void deleteGoal(primaryGoal.id)} />
              <div style={{ height: '1px', background: '#1a1a1a', margin: '1.25rem 0' }} />
            </>
          ) : null}

          {(['professional', 'spiritual', 'family', 'health'] as Category[]).map((cat, i) => (
            <div key={cat}>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.6rem' }}>
                {cat}
              </div>
              {grouped[cat].map(goal => (
                <GoalCard key={goal.id} goal={goal} primary={false} onDelete={() => void deleteGoal(goal.id)} />
              ))}
              {i < 3 ? <div style={{ height: '1px', background: '#1a1a1a', margin: '1.25rem 0' }} /> : null}
            </div>
          ))}
        </>
      )}

    </Shell>
  )
}
