'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/Shell'
import api from '@/lib/api'
import { formatLongDate } from '@/lib/formatDate'

type ViewMode = 'today' | 'week'
type Id = number | null

interface Goal {
  id: number
  title: string
  category: string
}

interface Task {
  id: number
  title: string
  estimated_mins: number
  goal: Id
}

interface DayPlan {
  id: number
  date: string
  intention: string
  niyyah_for_allah: string
  niyyah_for_self: string
  tasks: Task[]
}

interface WeekTask {
  scheduled_date: string
  estimated_mins: number
}

interface Distraction {
  verdict: string | null
  revisit_after: string | null
}

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`
}

const startOfWeek = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const diff = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - diff)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`
}

const dow = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase().slice(0, 3)

export default function PlanPage() {
  const [date, setDate] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('today')
  const [planId, setPlanId] = useState<Id>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<Id>(null)
  const [niyyahAllah, setNiyyahAllah] = useState('')
  const [niyyahSelf, setNiyyahSelf] = useState('')
  const [intention, setIntention] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [mins, setMins] = useState(60)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weekTaskCount, setWeekTaskCount] = useState(0)
  const [weekTaskMins, setWeekTaskMins] = useState(0)
  const [parkedCount, setParkedCount] = useState(0)
  const [taskDays, setTaskDays] = useState<Set<string>>(new Set())
  const [parkedDays, setParkedDays] = useState<Set<string>>(new Set())

  const weekStart = useMemo(() => (date ? startOfWeek(date) : null), [date])
  const weekDays = useMemo(
    () => (weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []),
    [weekStart]
  )
  const goalMap = useMemo(() => new Map(goals.map(g => [g.id, g.title])), [goals])

  useEffect(() => {
    setDate(addDays(todayIso(), 1))
  }, [])

  useEffect(() => {
    void (async () => {
      const res = await api.get<Goal[]>('/goals/', { params: { status: 'active' } })
      setGoals(res.data ?? [])
      if ((res.data ?? []).length > 0) setSelectedGoalId(res.data[0].id)
    })()
  }, [])

  useEffect(() => {
    if (!date) return
    void loadPlan(date)
    void loadWeek(date)
  }, [date])

  async function loadPlan(targetDate: string) {
    const res = await api.get<DayPlan[]>('/dayplans/', { params: { date: targetDate } })
    const p = res.data[0]
    if (!p) {
      setPlanId(null)
      setNiyyahAllah('')
      setNiyyahSelf('')
      setIntention('')
      setTasks([])
      return
    }
    setPlanId(p.id)
    setNiyyahAllah(p.niyyah_for_allah ?? '')
    setNiyyahSelf(p.niyyah_for_self ?? '')
    setIntention(p.intention ?? '')
    setTasks((p.tasks ?? []).map(t => ({ id: t.id, title: t.title, estimated_mins: t.estimated_mins, goal: t.goal })))
  }

  async function loadWeek(targetDate: string) {
    const start = startOfWeek(targetDate)
    const end = addDays(start, 6)
    const [taskRes, disRes] = await Promise.all([
      api.get<WeekTask[]>('/tasks/', { params: { start, end } }),
      api.get<Distraction[]>('/distractions/', { params: { verdict: 'parked' } }),
    ])
    const weekTasks = taskRes.data ?? []
    setWeekTaskCount(weekTasks.length)
    setWeekTaskMins(weekTasks.reduce((a, t) => a + t.estimated_mins, 0))
    setTaskDays(new Set(weekTasks.map(t => t.scheduled_date)))
    const parked = (disRes.data ?? []).filter(
      d => d.verdict === 'parked' && d.revisit_after && d.revisit_after >= start && d.revisit_after <= end
    )
    setParkedCount(parked.length)
    setParkedDays(new Set(parked.map(d => d.revisit_after as string)))
  }

  async function ensurePlanId(targetDate: string): Promise<number> {
    if (planId) return planId
    const created = await api.post<DayPlan>('/dayplans/', {
      date: targetDate,
      intention,
      niyyah_for_allah: niyyahAllah,
      niyyah_for_self: niyyahSelf,
    })
    setPlanId(created.data.id)
    return created.data.id
  }

  async function addTaskNow() {
    if (!date || !title.trim()) return
    const pId = await ensurePlanId(date)
    await api.post('/tasks/', {
      title: title.trim(),
      scheduled_date: date,
      estimated_mins: mins,
      goal: selectedGoalId,
      day_plan: pId,
      order: tasks.length + 1,
    })
    setTitle('')
    setMins(60)
    await loadPlan(date)
    await loadWeek(date)
  }

  async function removeTaskNow(taskId: number) {
    if (!date) return
    await api.delete(`/tasks/${taskId}/`)
    await loadPlan(date)
    await loadWeek(date)
  }

  async function commit() {
    if (!date) return
    setSaving(true)
    try {
      if (planId) {
        await api.patch(`/dayplans/${planId}/`, {
          date,
          intention,
          niyyah_for_allah: niyyahAllah,
          niyyah_for_self: niyyahSelf,
        })
      } else {
        const created = await api.post<DayPlan>('/dayplans/', {
          date,
          intention,
          niyyah_for_allah: niyyahAllah,
          niyyah_for_self: niyyahSelf,
        })
        setPlanId(created.data.id)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  if (!date) return <Shell><p style={{ fontSize: 'var(--fs-body-small)', color: 'var(--text-muted)' }}>loading...</p></Shell>

  const totalHours = (tasks.reduce((a, t) => a + t.estimated_mins, 0) / 60).toFixed(1)

  return (
    <Shell>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '1.25rem' }}>
        <button type="button" onClick={() => setView('today')} style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', fontSize: 'var(--fs-meta)', border: '1px solid var(--border)', color: view === 'today' ? 'var(--text-primary)' : 'var(--text-muted)', background: view === 'today' ? 'var(--bg-hover)' : 'var(--bg-card)' }}>today</button>
        <button type="button" onClick={() => setView('week')} style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', fontSize: 'var(--fs-meta)', border: '1px solid var(--border)', color: view === 'week' ? 'var(--text-primary)' : 'var(--text-muted)', background: view === 'week' ? 'var(--bg-hover)' : 'var(--bg-card)' }}>this week</button>
      </div>
      {view === 'week' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '6px', marginBottom: '1.25rem' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '7px', padding: '0.5rem 0.6rem', textAlign: 'center' }}><div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{weekTaskCount}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>tasks</div></div>
            <div style={{ background: 'var(--bg-card)', borderRadius: '7px', padding: '0.5rem 0.6rem', textAlign: 'center' }}><div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{(weekTaskMins / 60).toFixed(1)}h</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>committed</div></div>
            <div style={{ background: 'var(--bg-card)', borderRadius: '7px', padding: '0.5rem 0.6rem', textAlign: 'center' }}><div style={{ fontSize: '16px', color: 'var(--amber)' }}>{parkedCount}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ideas parked</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: '3px', marginBottom: '1rem' }}>
            {weekDays.map(d => (
              <button key={d} type="button" onClick={() => setDate(d)} style={{ background: 'var(--bg-card)', borderRadius: '5px', padding: '0.4rem 0.15rem', textAlign: 'center', border: `1px solid ${d === date ? 'var(--text-primary)' : 'var(--border-subtle)'}` }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>{dow(d)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '3px' }}>{d.slice(-2)}</div>
                <div style={{ minHeight: '5px', display: 'flex', justifyContent: 'center', gap: '2px' }}>
                  {taskDays.has(d) ? <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: d === todayIso() ? 'var(--teal)' : 'var(--text-primary)' }} /> : null}
                  {parkedDays.has(d) ? <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--amber)' }} /> : null}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>planning for</div>
      <div style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '1.25rem', textTransform: 'capitalize' }}>{formatLongDate(date)}</div>
      <div style={{ marginBottom: '1rem' }}><div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '.4rem', textTransform: 'uppercase' }}>why does tomorrow matter?</div><textarea value={niyyahAllah} onChange={e => setNiyyahAllah(e.target.value)} placeholder="what is the deeper purpose of tomorrow?" rows={2} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '7px', padding: '.5rem .65rem', fontSize: 'var(--fs-meta)', color: 'var(--text-primary)' }} /></div>
      <div style={{ marginBottom: '1rem' }}><div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '.4rem', textTransform: 'uppercase' }}>what are you building in yourself?</div><textarea value={niyyahSelf} onChange={e => setNiyyahSelf(e.target.value)} placeholder="what are you building in yourself?" rows={2} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '7px', padding: '.5rem .65rem', fontSize: 'var(--fs-meta)', color: 'var(--text-primary)' }} /></div>
      <div style={{ marginBottom: '1rem' }}><div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '.4rem', textTransform: 'uppercase' }}>intention</div><textarea value={intention} onChange={e => setIntention(e.target.value)} placeholder="today I go deep. no new ideas. just execute." rows={2} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '7px', padding: '.5rem .65rem', fontSize: 'var(--fs-meta)', color: 'var(--text-primary)' }} /></div>
      {goals.length > 0 ? <label style={{ display: 'block', marginBottom: '.75rem' }}><span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '.35rem', textTransform: 'uppercase' }}>goal</span><select value={selectedGoalId ?? ''} onChange={e => setSelectedGoalId(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '7px', padding: '.5rem .65rem', fontSize: 'var(--fs-meta)', color: 'var(--text-primary)' }}>{goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label> : null}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}><div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{formatLongDate(date)}</div><div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>{tasks.length} tasks · {totalHours}h</div></div>
      <div style={{ marginBottom: '.75rem' }}>{tasks.map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.5rem .65rem', borderRadius: '7px', background: 'var(--bg-card)', marginBottom: '5px' }}><div><div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-primary)' }}>{t.title}</div><div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '1px' }}>↳ {t.goal ? goalMap.get(t.goal) ?? 'general' : 'general'} · {t.estimated_mins}m</div></div><button type="button" onClick={() => void removeTaskNow(t.id)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px' }}>✕</button></div>)}</div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '.75rem', marginBottom: '.5rem' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void addTaskNow() }} placeholder="add a task" style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '7px', padding: '.5rem .65rem', fontSize: 'var(--fs-meta)', color: 'var(--text-primary)' }} disabled={goals.length === 0} />
        <input type="number" value={mins} onChange={e => setMins(Number(e.target.value))} min={5} step={5} style={{ width: '56px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '7px', padding: '.5rem', fontSize: 'var(--fs-meta)', color: 'var(--text-primary)', textAlign: 'center' }} disabled={goals.length === 0} />
        <button type="button" onClick={() => void addTaskNow()} style={{ background: 'var(--border)', border: '1px solid #2a2a2a', borderRadius: '7px', padding: '.5rem .65rem', fontSize: 'var(--fs-meta)', color: 'var(--text-secondary)' }} disabled={goals.length === 0}>add</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', marginBottom: '.5rem' }}><span>{tasks.length} tasks</span><span style={{ color: 'var(--text-primary)' }}>{totalHours}h committed</span></div>
      <button type="button" onClick={() => void commit()} style={{ width: '100%', background: 'var(--text-primary)', border: 'none', borderRadius: '7px', padding: '.75rem', fontSize: 'var(--fs-meta)', color: 'var(--bg)', fontWeight: 500, opacity: saving ? 0.45 : 1 }}>{saving ? 'saving...' : saved ? 'saved' : `commit to ${formatLongDate(date).split(',')[0]}`}</button>
      {goals.length === 0 ? <div style={{ marginTop: '.65rem', fontSize: 'var(--fs-meta)', color: 'var(--amber)' }}>add at least one goal in goals page first.</div> : null}
    </Shell>
  )
}
