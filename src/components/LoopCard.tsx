  'use client'

  import { useEffect, useState } from 'react'
  import { usePathname } from 'next/navigation'
  import api from '@/lib/api'

  interface Goal {
    id: number
    title: string
    is_primary?: boolean
    start_date?: string
    target_date?: string
  }

  interface DayPlan {
    id: number
    tasks: { id: number; done: boolean }[]
  }

  type Phase = 'goals' | 'plan' | 'execute' | 'review'

  function todayIso(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function getPhase(
    hasGoals: boolean,
    hasPlan: boolean,
    tasksDone: number,
    tasksTotal: number,
    hour: number
  ): Phase {
    if (!hasGoals) return 'goals'
    if (!hasPlan) return 'plan'
    if (hour >= 20 && tasksDone > 0) return 'review'
    return 'execute'
  }

  const PHASE_LABELS: Record<Phase, string> = {
    goals: 'set goals',
    plan: 'plan',
    execute: 'execute',
    review: 'review',
  }

  const PHASE_SUBS: Record<Phase, string> = {
    goals: 'add your primary goal first',
    plan: 'plan tomorrow before you sleep',
    execute: 'work your plan',
    review: 'close the loop — reflect honestly',
  }

  const PHASE_INDEX: Record<Phase, number> = {
    goals: 0,
    plan: 1,
    execute: 2,
    review: 3,
  }

  export default function LoopCard() {
    const pathname = usePathname()
    const [hasGoals, setHasGoals] = useState(false)
    const [hasPlan, setHasPlan] = useState(false)
    const [tasksDone, setTasksDone] = useState(0)
    const [tasksTotal, setTasksTotal] = useState(0)
    const [gateCount, setGateCount] = useState(0)
    const [loaded, setLoaded] = useState(false)
    const [hovered, setHovered] = useState(false)

    const hour = new Date().getHours()

    async function loadData() {
      try {
        const [goalsRes, planRes, gateRes] = await Promise.all([
          api.get<Goal[]>('/goals/', { params: { status: 'active' } }),
          api.get<DayPlan[]>('/dayplans/', { params: { date: todayIso() } }),
          api.get<unknown[]>('/distractions/', { params: { verdict: 'none' } }),
        ])
        const goals = goalsRes.data ?? []
        const plans = planRes.data ?? []
        const plan: DayPlan | null = plans[0] ?? null
        setHasGoals(goals.length > 0)
        setHasPlan(plan !== null && (plan.tasks?.length ?? 0) > 0)
        const done = (plan?.tasks?.filter(
          (t: { done: boolean }) => t.done) ?? []).length
        setTasksDone(done)
        setTasksTotal(plan?.tasks?.length ?? 0)
        setGateCount((gateRes.data ?? []).length)
        setLoaded(true)
      } catch {
        setLoaded(true)
      }
    }

    useEffect(() => {
      void loadData()

      const handler = () => {
        void loadData()
      }
      window.addEventListener('himmah:refresh', handler)
      return () => window.removeEventListener('himmah:refresh', handler)
    }, [pathname])

    const phase = getPhase(hasGoals, hasPlan, tasksDone, tasksTotal, hour)

    const dateLabel = new Date()
      .toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      .toLowerCase()

    if (!loaded) return null

    const steps: Phase[] = ['goals', 'plan', 'execute', 'review']
    const phaseIndex = PHASE_INDEX[phase]
    const phaseColor = phase === 'goals' ? '#EF9F27' : '#e8e4dc'
    const subtitle =
      phase === 'execute' && tasksTotal > 0
        ? `work your plan — ${tasksDone} of ${tasksTotal} done`
        : PHASE_SUBS[phase]

    function segBg(i: number): string {
      if (i < phaseIndex) return '#5DCAA5'
      if (i === phaseIndex) return phase === 'goals' ? '#EF9F27' : '#e8e4dc'
      return '#1e1e1e'
    }

    function lblColor(i: number): string {
      if (i < phaseIndex) return '#3a5a3a'
      if (i === phaseIndex) return phase === 'goals' ? '#EF9F27' : '#888'
      return '#1e1e1e'
    }

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: hovered ? 160 : 52,
          background: '#141414',
          border: `1px solid ${hovered ? '#262626' : '#1e1e1e'}`,
          borderRadius: 12,
          padding: hovered ? '16px 14px' : '12px 8px',
          cursor: 'pointer',
          transition: 'width .25s ease, padding .25s ease, border-color .2s',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
          zIndex: 50,
        }}
      >
        {!hovered ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              animation: 'hm-loop-fadein .2s ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              {steps.map((s, i) => (
                <div
                  key={s}
                  style={{
                    width: 5,
                    height: 16,
                    borderRadius: 2.5,
                    background: segBg(i),
                    animation: i === phaseIndex ? 'hm-pulse 1.8s infinite' : 'none',
                  }}
                />
              ))}
            </div>
            <div
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'lowercase',
                whiteSpace: 'nowrap',
                color: phaseColor,
              }}
            >
              {PHASE_LABELS[phase]}
            </div>
            {gateCount > 0 ? (
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#EF9F27',
                  flexShrink: 0,
                  alignSelf: 'flex-end',
                  marginBottom: 2,
                }}
              />
            ) : null}
          </div>
        ) : (
          <div style={{ animation: 'hm-loop-fadein .2s ease', width: 132 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: '#2a2a2a',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {dateLabel}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: phaseColor,
                lineHeight: 1.2,
                marginBottom: 3,
                letterSpacing: '-.02em',
              }}
            >
              {PHASE_LABELS[phase]}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#666',
                lineHeight: 1.4,
                marginBottom: 12,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
              {steps.map((s, i) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 2.5,
                    background: segBg(i),
                    animation: i === phaseIndex ? 'hm-pulse 1.8s infinite' : 'none',
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 2,
                marginBottom: 12,
              }}
            >
              {steps.map((s, i) => (
                <div
                  key={s}
                  style={{
                    fontSize: 9,
                    fontWeight: i === phaseIndex ? 600 : 400,
                    textAlign: 'center',
                    color: lblColor(i),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: '#1a1a1a', marginBottom: 10 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: gateCount > 0 ? '#EF9F27' : '#333',
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: gateCount > 0 ? '#EF9F27' : '#444',
                    letterSpacing: '.04em',
                  }}
                >
                  gate
                </span>
              </div>
              {gateCount > 0 ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#EF9F27',
                    background: '#2a1800',
                    border: '1px solid #3d2800',
                    borderRadius: 10,
                    padding: '2px 8px',
                    flexShrink: 0,
                  }}
                >
                  {gateCount} idea{gateCount === 1 ? '' : 's'}
                </span>
              ) : (
                <span style={{ fontSize: 10, color: '#333' }}>clear</span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
