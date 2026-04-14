'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/Shell'
import api from '@/lib/api'

interface Goal {
  id: number
  title: string
  status: string
  start_date: string
  target_date: string
  parent_goal: number | null
  is_primary?: boolean
}

interface Task {
  id: number
  goal: number | null
  goal_detail: { id: number; title: string; category: string } | null
  title: string
  estimated_mins: number
  done: boolean
  done_at: string | null
}

interface DayPlan {
  id: number
  date: string
  intention: string
  morning_energy: number | null
  morning_clarity: number | null
  sleep_quality: number | null
  tasks: Task[]
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(d: Date): string {
  return d
    .toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toLowerCase()
}

function greetingByHour(hour: number, name: string): string {
  if (hour < 12) return `good morning, ${name}`
  if (hour < 17) return `keep going, ${name}`
  if (hour < 21) return `time to reflect, ${name}`
  return `plan tomorrow before you sleep, ${name}`
}

function minutesToText(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (mins === 0) return `${hours}h left`
  return `${hours}h ${mins}m left`
}

function calcJourney(goal: Goal): { weekCurrent: number; weekTotal: number; progress: number } {
  const start = new Date(goal.start_date)
  const end = new Date(goal.target_date)
  const now = new Date()
  const daysTotal = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
  const weekTotal = Math.max(1, Math.floor(daysTotal / 7))
  const daysElapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000))
  const weekCurrent = Math.min(weekTotal, Math.max(1, Math.floor(daysElapsed / 7) + 1))
  const progress = Math.min(100, Math.max(0, Math.round((weekCurrent / weekTotal) * 100)))
  return { weekCurrent, weekTotal, progress }
}

export default function TodayPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [energy, setEnergy] = useState<number | null>(null)
  const [clarity, setClarity] = useState<number | null>(null)
  const [sleep, setSleep] = useState<number | null>(null)
  const [hour, setHour] = useState(new Date().getHours())
  const [name, setName] = useState('Mubeen')
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null)

  const loadToday = useCallback(async () => {
    const date = todayIso()
    const [planRes, goalsRes] = await Promise.all([
      api.get<DayPlan[]>('/dayplans/', { params: { date } }),
      api.get<Goal[]>('/goals/', { params: { status: 'active' } }),
    ])

    const todaysPlan = planRes.data[0] ?? null
    const goalData = goalsRes.data ?? []

    setPlan(todaysPlan)
    setGoals(goalData.filter(g => g.status === 'active'))
    setEnergy(todaysPlan?.morning_energy ?? null)
    setClarity(todaysPlan?.morning_clarity ?? null)
    setSleep(todaysPlan?.sleep_quality ?? null)
    setLoading(false)
    return goalData
  }, [])

  useEffect(() => {
    const username = localStorage.getItem('username')
    if (username) setName(username)
    ;(async () => {
      try {
        const goalData = await loadToday()
        if (goalData.length === 0) {
          router.push('/goals?onboarding=true')
          return
        }
      } catch {
        setLoading(false)
      }
    })()
  }, [loadToday])

  useEffect(() => {
    const timer = window.setInterval(() => setHour(new Date().getHours()), 1000 * 30)
    return () => window.clearInterval(timer)
  }, [])

  const primaryGoal = useMemo(() => {
    const byFlag = goals.find(g => g.is_primary === true)
    if (byFlag) return byFlag
    return goals.find(g => g.parent_goal === null) ?? null
  }, [goals])

  const journey = primaryGoal ? calcJourney(primaryGoal) : null
  const dateLabel = formatDateLabel(new Date())
  const greeting = greetingByHour(hour, name)
  const showMorning = hour < 12 && plan !== null

  const doneCount = plan?.tasks.filter(t => t.done).length ?? 0
  const totalCount = plan?.tasks.length ?? 0
  const remainingMinutes =
    plan?.tasks.filter(t => !t.done).reduce((sum, t) => sum + t.estimated_mins, 0) ?? 0
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  async function patchMorning(next: {
    morning_energy: number | null
    morning_clarity: number | null
    sleep_quality: number | null
  }) {
    if (!plan) return
    await api.patch(`/dayplans/${plan.id}/`, next)
    setEnergy(next.morning_energy)
    setClarity(next.morning_clarity)
    setSleep(next.sleep_quality)
  }

  async function toggleTask(task: Task) {
    if (!plan || busyTaskId === task.id) return
    setBusyTaskId(task.id)
    try {
      if (task.done) {
        await api.patch(`/tasks/${task.id}/`, { done: false, done_at: null })
      } else {
        await api.post(`/tasks/${task.id}/mark_done/`)
      }
      await loadToday()
    } finally {
      setBusyTaskId(null)
    }
  }

  if (loading) {
    return (
      <Shell>
        <p style={{ fontSize: 'var(--fs-body-small)', color: 'var(--text-muted)' }}>loading...</p>
      </Shell>
    )
  }

  if (!plan) {
    return (
      <Shell>
        <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
          {dateLabel}
        </div>
        <div
          style={{
            fontSize: 'var(--fs-hero)',
            color: 'var(--text-primary)',
            fontWeight: 400,
            marginBottom: '0.4rem',
            lineHeight: 1.2,
            fontFamily: greeting.startsWith('السلام') ? 'var(--font-arabic)' : undefined,
          }}
        >
          {greeting}
        </div>
        <div
          style={{
            fontSize: 'var(--fs-meta)',
            color: 'var(--text-muted)',
            marginBottom: '1.25rem',
            lineHeight: 1.5,
          }}
        >
          you didn&apos;t plan last night. that is already a miss.
        </div>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              fontSize: 'var(--fs-body-small)',
              color: 'var(--text-primary)',
              marginBottom: '0.4rem',
              fontWeight: 500,
            }}
          >
            no plan for today
          </div>
          <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            a day without a plan is a day you hand to distraction. do it now.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/plan')}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '7px',
            background: 'var(--text-primary)',
            color: 'var(--bg)',
            padding: '0.75rem',
            fontSize: 'var(--fs-meta)',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '0.5rem',
          }}
        >
          plan today now
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      {journey && primaryGoal ? (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '7px',
            padding: '0.65rem 0.75rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>your journey</div>
            <div
              style={{
                fontSize: 'var(--fs-body-small)',
                color: 'var(--text-primary)',
                marginTop: '1px',
                fontWeight: 500,
              }}
            >
              week {journey.weekCurrent} of {journey.weekTotal}
            </div>
            <div
              style={{
                width: '70px',
                height: '2px',
                background: 'var(--border)',
                borderRadius: '1px',
                marginTop: '3px',
              }}
            >
              <div
                style={{
                  height: '2px',
                  borderRadius: '1px',
                  background: 'var(--teal)',
                  width: `${journey.progress}%`,
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-faint)', textAlign: 'right' }}>
            {new Date(primaryGoal.target_date).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
            <br />
            {primaryGoal.title}
          </div>
        </div>
      ) : null}

      {showMorning ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              fontSize: 'var(--fs-micro)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginBottom: '0.6rem',
            }}
          >
            how are you this morning?
          </div>
          {[
            { key: 'energy', label: 'energy', value: energy },
            { key: 'clarity', label: 'clarity', value: clarity },
            { key: 'sleep', label: 'sleep', value: sleep },
          ].map(row => (
            <div
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: row.key === 'sleep' ? 0 : '0.4rem',
              }}
            >
              <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-secondary)' }}>
                {row.label}
              </span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[1, 2, 3, 4, 5].map(dot => (
                  <button
                    key={dot}
                    type="button"
                    onClick={() => {
                      const next = {
                        morning_energy: row.key === 'energy' ? dot : energy,
                        morning_clarity: row.key === 'clarity' ? dot : clarity,
                        sleep_quality: row.key === 'sleep' ? dot : sleep,
                      }
                      void patchMorning(next)
                    }}
                    style={{
                      width: '18px',
                      height: '3px',
                      borderRadius: '2px',
                      border: 'none',
                      background: (row.value ?? 0) >= dot ? 'var(--teal)' : 'var(--border)',
                      cursor: 'pointer',
                    }}
                    aria-label={`${row.label} ${dot}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
        {dateLabel}
      </div>
      <div
        style={{
          fontSize: 'var(--fs-hero)',
          color: 'var(--text-primary)',
          fontWeight: 400,
          marginBottom: '0.4rem',
          lineHeight: 1.2,
          fontFamily: greeting.startsWith('السلام') ? 'var(--font-arabic)' : undefined,
        }}
      >
        {greeting}
      </div>

      {plan.intention ? (
        <div
          style={{
            fontSize: 'var(--fs-meta)',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            lineHeight: 1.5,
            paddingLeft: '0.6rem',
            borderLeft: '1px solid #2a2a2a',
            marginBottom: '1.25rem',
          }}
        >
          &quot;{plan.intention}&quot;
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, height: '2px', background: 'var(--border)', borderRadius: '1px' }}>
          <div
            style={{
              height: '2px',
              background: 'var(--accent)',
              borderRadius: '1px',
              width: `${progressPct}%`,
            }}
          />
        </div>
        <span style={{ fontSize: 'var(--fs-body-small)', color: 'var(--text-primary)' }}>
          {doneCount}/{totalCount}
        </span>
        <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
          · {minutesToText(remainingMinutes)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '1.25rem' }}>
        {plan.tasks.map(task => {
          const goalName = task.goal_detail?.title ?? null
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => void toggleTask(task)}
              disabled={busyTaskId === task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                padding: '0.6rem',
                borderRadius: '7px',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                opacity: task.done ? 0.3 : 1,
              }}
            >
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  border: task.done ? '1px solid var(--accent)' : '1px solid #333',
                  background: task.done ? 'var(--accent)' : 'transparent',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {task.done ? (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path
                      d="M2 5l2.5 2.5L8 3"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 'var(--fs-body-small)',
                    color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
                    textDecoration: task.done ? 'line-through' : 'none',
                    display: 'block',
                    lineHeight: 1.35,
                  }}
                >
                  {task.title}
                </span>
                <span
                  style={{
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--text-fainter)',
                    marginTop: '1px',
                    display: 'block',
                  }}
                >
                  ↳ {goalName ?? 'general'}
                </span>
              </span>
              <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-faint)', flexShrink: 0 }}>
                {task.estimated_mins}m
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => router.push('/gate')}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid #2a2a2a',
          borderRadius: '7px',
          padding: '0.55rem',
          fontSize: 'var(--fs-meta)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          marginBottom: '1.25rem',
        }}
      >
        <span
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: '1px solid #333',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--fs-meta)',
            color: 'var(--text-faint)',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          +
        </span>
        <span>new idea? log it here first</span>
      </button>
    </Shell>
  )
}
