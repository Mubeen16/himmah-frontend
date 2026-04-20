'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/Shell'
import api from '@/lib/api'
import { triggerRefresh } from '@/lib/refresh'
import { formatLongDate } from '@/lib/formatDate'
import styles from './plan.module.css'

type Id = number | null

interface Goal {
  id: number
  title: string
  category: string
  is_primary?: boolean
  target_hours?: string | number
  target_date?: string | null
}

interface GoalDetail {
  id: number
  title: string
  category: string
}

interface PlanTask {
  id: number
  title: string
  description?: string
  estimated_mins: number
  planned_start_time?: string | null
  planned_end_time?: string | null
  is_all_day?: boolean
  due_date?: string | null
  goal: Id
  order: number
  done: boolean
  goal_detail: GoalDetail | null
  scheduled_date?: string
}

type TaskDetailEdit = {
  title: string
  description: string
  taskDate: string
  taskStartTime: string
  taskEndTime: string
  taskAllDay: boolean
  goalId: Id
}

interface DayIntention {
  id: number
  day_plan: number | null
  date: string
  title: string
  focus: string
  purpose: string
  character: string
}

interface DayPlan {
  id: number
  date: string
  intention: string
  niyyah_for_allah: string
  niyyah_for_self: string
  day_start_time?: string | null
  tasks: PlanTask[]
}

interface WeekTask {
  scheduled_date: string
  estimated_mins: number
  goal?: number
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

function normDate(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).slice(0, 10)
}

function cleanPlanString(v: string | null | undefined): string {
  if (v === null || v === undefined) return ''
  if (typeof v !== 'string') return ''
  const t = v.trim()
  if (t === '' || t === 'nil' || t === 'null') return ''
  return v
}

function normalizeTimeForInput(v: string | null | undefined): string {
  if (!v || typeof v !== 'string') return '09:00'
  const raw = v.replace('Z', '').trim().slice(0, 8)
  const parts = raw.split(':')
  const hh = String(Number(parts[0]) || 9).padStart(2, '0')
  const mm = String(Number(parts[1]) || 0).padStart(2, '0')
  const out = `${hh}:${mm}`
  return /^\d{2}:\d{2}$/.test(out) ? out : '09:00'
}

function parseTimeMinutes(v: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(v)) return null
  const [h, m] = v.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function formatDayTimelineHeader(iso: string): { dowShort: string; dayNum: string } {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return { dowShort: '', dayNum: '' }
  const dt = new Date(y, m - 1, d)
  return {
    dowShort: dt.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    dayNum: String(d),
  }
}

function formatGcModalLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function GcIconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3 2.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function GcIconLines() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function GcIconList() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M8 7h11M8 12h11M8 17h11M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function hourLabelFromMins(minsFromMidnight: number): string {
  const h = Math.floor(minsFromMidnight / 60) % 24
  const d = new Date(2000, 0, 1, h, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

function parseDayStartToMins(hhmm: string): number {
  const parts = hhmm.split(':').map(Number)
  const H = parts[0]
  const M = parts[1]
  if (!Number.isFinite(H) || !Number.isFinite(M)) return 9 * 60
  return (H % 24) * 60 + (M % 60)
}

function formatDurationShort(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const r = mins % 60
  if (r === 0) return `${h}h`
  return `${h}h ${r}m`
}

function isoFromYMD(y: number, month1: number, day: number): string {
  return `${y}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildMonthCells(year: number, month1: number): { iso: string; inMonth: boolean }[] {
  const first = new Date(year, month1 - 1, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month1, 0).getDate()
  const prevMonth = month1 === 1 ? 12 : month1 - 1
  const prevYear = month1 === 1 ? year - 1 : year
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate()
  const cells: { iso: string; inMonth: boolean }[] = []
  for (let i = 0; i < startWeekday; i++) {
    const d = daysInPrevMonth - startWeekday + 1 + i
    cells.push({ iso: isoFromYMD(prevYear, prevMonth, d), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: isoFromYMD(year, month1, d), inMonth: true })
  }
  const nextMonth = month1 === 12 ? 1 : month1 + 1
  const nextYear = month1 === 12 ? year + 1 : year
  let dNext = 1
  while (cells.length < 42) {
    cells.push({ iso: isoFromYMD(nextYear, nextMonth, dNext), inMonth: false })
    dNext += 1
  }
  return cells
}

function formatMonthYearLabel(year: number, month1: number): string {
  const dt = new Date(year, month1 - 1, 1)
  return dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const HOUR_HEIGHT_PX = 64
/** Time labels column; 1px separator sits at its right edge (Google-style gutter). */
const DAY_TIME_COLUMN_W = 48
const DAY_GRID_LINE = 'rgba(255, 255, 255, 0.06)'
const DAY_GRID_SEP = 'rgba(255, 255, 255, 0.08)'
const DAY_BLOCKS_LEFT = DAY_TIME_COLUMN_W + 1 + 6
/** Top/bottom inset so first hour label (centered on line) is not clipped. */
const DAY_GRID_PAD_Y = 8
/** When the day has no tasks, still show this many hours from day start (Google-style scrollable day). */
const EMPTY_DAY_VISIBLE_HOURS = 12

export default function PlanPage() {
  const router = useRouter()
  const [date, setDate] = useState<string | null>(null)
  const [planId, setPlanId] = useState<Id>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<Id>(null)
  const [niyyahAllah, setNiyyahAllah] = useState('')
  const [niyyahSelf, setNiyyahSelf] = useState('')
  const [intention, setIntention] = useState('')
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [dayStartTime, setDayStartTime] = useState('09:00')
  const [taskDate, setTaskDate] = useState('')
  const [taskStartTime, setTaskStartTime] = useState('09:30')
  const [taskEndTime, setTaskEndTime] = useState('10:30')
  const [taskAllDay, setTaskAllDay] = useState(false)
  const [title, setTitle] = useState('')
  const [mins, setMins] = useState(60)
  const [taskDescription, setTaskDescription] = useState('')
  const [, setWeekTaskCount] = useState(0)
  const [, setWeekTaskMins] = useState(0)
  const [, setParkedCount] = useState(0)
  const [taskDays, setTaskDays] = useState<Set<string>>(new Set())
  const [, setParkedDays] = useState<Set<string>>(new Set())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayIso()))
  const [primaryGoalWeekMins, setPrimaryGoalWeekMins] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<PlanTask | null>(null)
  const [detailEdit, setDetailEdit] = useState<TaskDetailEdit | null>(null)
  const [detailSaving, setDetailSaving] = useState(false)
  const [dayIntention, setDayIntention] = useState<DayIntention | null>(null)
  const [intentionModalOpen, setIntentionModalOpen] = useState(false)
  const [intentionTitle, setIntentionTitle] = useState('')
  const [intentionFocus, setIntentionFocus] = useState('')
  const [intentionPurpose, setIntentionPurpose] = useState('')
  const [intentionCharacter, setIntentionCharacter] = useState('')
  const [intentionDeeperOpen, setIntentionDeeperOpen] = useState(false)
  const [intentionSaving, setIntentionSaving] = useState(false)
  const [nowTick, setNowTick] = useState(0)
  const lastCreateDefaults = useRef<{ goalId: Id; mins: number }>({ goalId: null, mins: 60 })
  const createTitleInputRef = useRef<HTMLInputElement>(null)
  const intentionTitleRef = useRef<HTMLInputElement>(null)
  const headerDateWrapRef = useRef<HTMLDivElement>(null)
  const [headerCalendarOpen, setHeaderCalendarOpen] = useState(false)
  const [headerCalendarMonth, setHeaderCalendarMonth] = useState<{ y: number; m: number }>(() => {
    const t = new Date()
    return { y: t.getFullYear(), m: t.getMonth() + 1 }
  })

  const closeTaskDetail = useCallback(() => {
    setDetailTask(null)
    setDetailEdit(null)
  }, [])

  const openTaskDetail = useCallback(
    (t: PlanTask) => {
      setDetailTask(t)
      setDetailEdit({
        title: t.title,
        description: typeof t.description === 'string' ? t.description : '',
        taskDate: t.scheduled_date || date || '',
        taskStartTime: t.planned_start_time ? normalizeTimeForInput(t.planned_start_time) : '09:00',
        taskEndTime: t.planned_end_time ? normalizeTimeForInput(t.planned_end_time) : '10:00',
        taskAllDay: Boolean(t.is_all_day),
        goalId: t.goal ?? goals[0]?.id ?? null,
      })
    },
    [date, goals]
  )

  const dayTimelineModel = useMemo(() => {
    const gridStartMins = parseDayStartToMins(dayStartTime)
    const ordered = [...tasks].sort((a, b) => a.order - b.order)

    type TimedEntry = { task: PlanTask; startMins: number; endMins: number }
    const timed: TimedEntry[] = []
    const stacked: PlanTask[] = []

    for (const t of ordered) {
      if (!t.is_all_day && t.planned_start_time && t.planned_end_time) {
        const s = parseTimeMinutes(normalizeTimeForInput(t.planned_start_time))
        const e = parseTimeMinutes(normalizeTimeForInput(t.planned_end_time))
        if (s != null && e != null && e > s) {
          timed.push({ task: t, startMins: s, endMins: e })
          continue
        }
      }
      stacked.push(t)
    }

    const timelineBaseMins =
      timed.length > 0 ? Math.min(gridStartMins, ...timed.map(x => x.startMins)) : gridStartMins

    const timedBlocks = timed.map(({ task, startMins, endMins }) => ({
      task,
      topPx: DAY_GRID_PAD_Y + ((startMins - timelineBaseMins) / 60) * HOUR_HEIGHT_PX,
      heightPx: Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT_PX, 28),
    }))

    const maxTimedEndMins = timed.length > 0 ? Math.max(...timed.map(x => x.endMins)) : gridStartMins
    let stackCursorMins = Math.max(gridStartMins, maxTimedEndMins)
    const stackedBlocks = stacked.map(t => {
      const topPx = DAY_GRID_PAD_Y + ((stackCursorMins - timelineBaseMins) / 60) * HOUR_HEIGHT_PX
      const heightPx = Math.max((t.estimated_mins / 60) * HOUR_HEIGHT_PX, 28)
      stackCursorMins += t.estimated_mins
      return { task: t, topPx, heightPx }
    })

    const blocks = [...timedBlocks, ...stackedBlocks].sort(
      (a, b) => a.topPx - b.topPx || a.task.id - b.task.id
    )

    const totalPlanMins = tasks.reduce((s, t) => s + t.estimated_mins, 0)
    const emptyEndMins = gridStartMins + EMPTY_DAY_VISIBLE_HOURS * 60
    const gridEndMins = Math.max(emptyEndMins, stackCursorMins, timed.length ? maxTimedEndMins : timelineBaseMins)
    const spanMins = Math.max(gridEndMins - timelineBaseMins, 60)
    const containerHeightPx = DAY_GRID_PAD_Y * 2 + (spanMins / 60) * HOUR_HEIGHT_PX

    const hourMarkers: number[] = []
    for (let m = Math.ceil(timelineBaseMins / 60) * 60; m <= gridEndMins; m += 60) {
      hourMarkers.push(m)
    }

    return {
      gridStartMins,
      timelineBaseMins,
      gridEndMins,
      containerHeightPx,
      blocks,
      hourMarkers,
      totalPlanMins,
    }
  }, [tasks, dayStartTime])

  const nowLineTopPx = useMemo(() => {
    if (!date || date !== todayIso()) return null
    void nowTick
    const n = new Date()
    const nowM = n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60
    return DAY_GRID_PAD_Y + ((nowM - dayTimelineModel.timelineBaseMins) / 60) * HOUR_HEIGHT_PX
  }, [date, nowTick, dayTimelineModel.timelineBaseMins])

  useEffect(() => {
    setDate(todayIso())
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
    void loadIntention(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPlan/loadWeek/loadIntention intentionally omitted (recreated each render)
  }, [date])

  useEffect(() => {
    if (!date) return
    setWeekStart(startOfWeek(date))
  }, [date])

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(t => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!createOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCreateOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createOpen])

  useEffect(() => {
    if (!intentionModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIntentionModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intentionModalOpen])

  useEffect(() => {
    if (!detailTask) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTaskDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailTask, closeTaskDetail])

  useEffect(() => {
    if (!createOpen) return
    const id = window.requestAnimationFrame(() => {
      createTitleInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [createOpen])

  useEffect(() => {
    if (!headerCalendarOpen) return
    const onDoc = (e: Event) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (headerDateWrapRef.current?.contains(t)) return
      setHeaderCalendarOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHeaderCalendarOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [headerCalendarOpen])

  const headerCalCells = useMemo(
    () => buildMonthCells(headerCalendarMonth.y, headerCalendarMonth.m),
    [headerCalendarMonth.y, headerCalendarMonth.m]
  )

  function shiftHeaderCalendarMonth(delta: -1 | 1): void {
    setHeaderCalendarMonth(({ y, m }) => {
      if (delta === -1) return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
      return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
    })
  }

  useEffect(() => {
    if (!date) return
    void loadWeek(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh week aggregates when goals list updates; date read from closure
  }, [goals])

  async function loadPlan(targetDate: string) {
    const res = await api.get<DayPlan[]>('/dayplans/', { params: { date: targetDate } })
    const p = res.data[0]
    if (!p) {
      setPlanId(null)
      setNiyyahAllah('')
      setNiyyahSelf('')
      setIntention('')
      setTasks([])
      setDayStartTime('09:00')
      return
    }
    setPlanId(p.id)
    const na = cleanPlanString(p.niyyah_for_allah)
    const ns = cleanPlanString(p.niyyah_for_self)
    setNiyyahAllah(na)
    setNiyyahSelf(ns)
    setIntention(cleanPlanString(p.intention))
    setDayStartTime(normalizeTimeForInput(p.day_start_time))
    type ApiTask = {
      id: number
      title: string
      description?: string
      estimated_mins: number
      planned_start_time?: string | null
      planned_end_time?: string | null
      is_all_day?: boolean
      due_date?: string | null
      goal: Id
      order?: number
      done?: boolean
      goal_detail?: GoalDetail | null
    }
    setTasks(
      (p.tasks ?? [])
        .map((t: ApiTask) => ({
          id: t.id,
          title: t.title,
          description: typeof t.description === 'string' ? t.description : '',
          estimated_mins: t.estimated_mins,
          planned_start_time: t.planned_start_time ?? null,
          planned_end_time: t.planned_end_time ?? null,
          is_all_day: Boolean(t.is_all_day),
          due_date: t.due_date ?? null,
          goal: t.goal,
          order: t.order ?? 0,
          done: Boolean(t.done),
          goal_detail: t.goal_detail ?? null,
          scheduled_date: normDate(targetDate),
        }))
        .sort((a, b) => a.order - b.order)
    )
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
    const primaryGoal = goals.find(g => g.is_primary) ?? goals[0] ?? null
    const primaryMins = weekTasks
      .filter(t => primaryGoal != null && t.goal != null && t.goal === primaryGoal.id)
      .reduce((a, t) => a + t.estimated_mins, 0)
    setPrimaryGoalWeekMins(primaryMins)
    const dayKeys = new Set<string>()
    for (const t of weekTasks) {
      const dk = normDate(t.scheduled_date)
      if (!dk) continue
      dayKeys.add(dk)
    }
    setTaskDays(dayKeys)
    const parked = (disRes.data ?? []).filter(d => {
      const ra = normDate(d.revisit_after)
      return d.verdict === 'parked' && ra && ra >= start && ra <= end
    })
    setParkedCount(parked.length)
    setParkedDays(new Set(parked.map(d => normDate(d.revisit_after as string))))
  }

  async function loadIntention(targetDate: string) {
    const res = await api.get<DayIntention[]>('/dayintentions/', { params: { date: targetDate } })
    const entry = res.data[0] ?? null
    setDayIntention(entry)
    setIntentionTitle(entry?.title ?? '')
    setIntentionFocus(entry?.focus ?? '')
    setIntentionPurpose(entry?.purpose ?? '')
    setIntentionCharacter(entry?.character ?? '')
  }

  function openIntentionModal() {
    setIntentionDeeperOpen(false)
    setIntentionModalOpen(true)
    window.requestAnimationFrame(() => {
      intentionTitleRef.current?.focus()
    })
  }

  async function saveIntention() {
    if (!date || !intentionTitle.trim()) return
    setIntentionSaving(true)
    try {
      const pId = planId ?? null
      if (dayIntention) {
        const res = await api.patch<DayIntention>(`/dayintentions/${dayIntention.id}/`, {
          title: intentionTitle.trim(),
          focus: intentionFocus.trim(),
          purpose: intentionPurpose.trim(),
          character: intentionCharacter.trim(),
          day_plan: pId,
        })
        setDayIntention(res.data)
      } else {
        const res = await api.post<DayIntention>('/dayintentions/', {
          date,
          title: intentionTitle.trim(),
          focus: intentionFocus.trim(),
          purpose: intentionPurpose.trim(),
          character: intentionCharacter.trim(),
          day_plan: pId,
        })
        setDayIntention(res.data)
      }
      setIntentionModalOpen(false)
    } finally {
      setIntentionSaving(false)
    }
  }

  /** Day plan id for `scheduleDate` (may differ from the day currently on screen). */
  async function resolveDayPlanId(scheduleDate: string): Promise<number> {
    const target = normDate(scheduleDate)
    if (!target) throw new Error('invalid schedule date')
    if (date && normDate(date) === target && planId != null) return planId

    const res = await api.get<DayPlan[]>('/dayplans/', { params: { date: target } })
    const existing = res.data[0]
    if (existing) {
      if (date && normDate(date) === target) setPlanId(existing.id)
      return existing.id
    }
    const sameScreenDay = date && normDate(date) === target
    const created = await api.post<DayPlan>('/dayplans/', {
      date: target,
      intention: sameScreenDay ? intention : '',
      niyyah_for_allah: sameScreenDay ? niyyahAllah : '',
      niyyah_for_self: sameScreenDay ? niyyahSelf : '',
      day_start_time: sameScreenDay ? dayStartTime : '09:00',
    })
    const newId = created.data.id
    if (sameScreenDay) setPlanId(newId)
    return newId
  }

  async function addTaskNow() {
    if (!date || !title.trim()) return
    if (!selectedGoalId) return
    const scheduleDate = taskDate || date
    const pId = await resolveDayPlanId(scheduleDate)
    const startMins = parseTimeMinutes(taskStartTime)
    const endMins = parseTimeMinutes(taskEndTime)
    const computedMins =
      !taskAllDay && startMins != null && endMins != null && endMins > startMins
        ? endMins - startMins
        : mins
    const safeMins = Math.max(5, Math.round(Number.isFinite(computedMins) ? computedMins : 60))
    await api.post('/tasks/', {
      title: title.trim(),
      description: taskDescription.trim() || '',
      scheduled_date: scheduleDate,
      estimated_mins: safeMins,
      goal: selectedGoalId,
      day_plan: pId,
      is_all_day: taskAllDay,
      planned_start_time: taskAllDay ? null : taskStartTime,
      planned_end_time: taskAllDay ? null : taskEndTime,
      due_date: null,
      order: tasks.length + 1,
    })
    lastCreateDefaults.current = {
      goalId: selectedGoalId,
      mins: safeMins,
    }
    setTitle('')
    setTaskDescription('')
    setCreateOpen(false)
    await loadPlan(scheduleDate)
    await loadWeek(scheduleDate)
    triggerRefresh()
  }

  function openCreateSheet() {
    if (goals.length === 0) return
    const { goalId, mins: lastMins } = lastCreateDefaults.current
    const fromLast = goalId != null && goals.some(g => g.id === goalId)
    const fallbackId = goals.some(g => g.id === selectedGoalId) ? selectedGoalId! : goals[0].id
    setSelectedGoalId(fromLast ? goalId! : fallbackId)
    setMins(lastMins >= 5 ? lastMins : 60)
    setTaskDate(date ?? todayIso())
    setTaskStartTime('09:30')
    setTaskEndTime('10:30')
    setTaskAllDay(false)
    setTitle('')
    setTaskDescription('')
    closeTaskDetail()
    setCreateOpen(true)
  }

  function openCreateSheetFromCalendarSurface(e: MouseEvent<HTMLDivElement>) {
    if (goals.length === 0) return
    const el = e.target
    if (!(el instanceof HTMLElement)) return
    if (el.closest('[data-plan-task-block]')) return
    openCreateSheet()
  }

  async function removeTaskNow(taskId: number) {
    if (!date) return
    await api.delete(`/tasks/${taskId}/`)
    await loadPlan(date)
    await loadWeek(date)
  }

  async function saveTaskDetail() {
    if (!date || !detailTask || !detailEdit) return
    if (!detailEdit.title.trim() || detailEdit.goalId == null) return
    const scheduleDate = normDate(detailEdit.taskDate || date)
    if (!scheduleDate) return
    const startMins = parseTimeMinutes(detailEdit.taskStartTime)
    const endMins = parseTimeMinutes(detailEdit.taskEndTime)
    const computedMins =
      !detailEdit.taskAllDay && startMins != null && endMins != null && endMins > startMins
        ? endMins - startMins
        : detailTask.estimated_mins
    const safeMins = Math.max(
      5,
      Math.round(Number.isFinite(computedMins) ? computedMins : detailTask.estimated_mins)
    )
    setDetailSaving(true)
    try {
      const pId = await resolveDayPlanId(scheduleDate)
      await api.patch(`/tasks/${detailTask.id}/`, {
        title: detailEdit.title.trim(),
        description: detailEdit.description.trim(),
        scheduled_date: scheduleDate,
        goal: detailEdit.goalId,
        day_plan: pId,
        is_all_day: detailEdit.taskAllDay,
        planned_start_time: detailEdit.taskAllDay
          ? null
          : normalizeTimeForInput(detailEdit.taskStartTime),
        planned_end_time: detailEdit.taskAllDay
          ? null
          : normalizeTimeForInput(detailEdit.taskEndTime),
        due_date: null,
        estimated_mins: safeMins,
        order: detailTask.order,
      })
      closeTaskDetail()
      await loadPlan(date)
      await loadWeek(date)
    } finally {
      setDetailSaving(false)
    }
  }

  async function patchDayStartTime(next: string) {
    setDayStartTime(next)
    if (!planId) return
    try {
      await api.patch(`/dayplans/${planId}/`, { day_start_time: next })
    } catch {
      if (date) void loadPlan(date)
    }
  }

  const plannedMinsTotal = tasks.reduce((a, t) => a + t.estimated_mins, 0)
  const dayHeader = date ? formatDayTimelineHeader(date) : { dowShort: '', dayNum: '' }

  const primaryGoal = useMemo(() => goals.find(g => g.is_primary) ?? goals[0] ?? null, [goals])

  const { weeklyTargetHours, primaryGoalPct, primaryGoalWeekHours } = useMemo(() => {
    const today = new Date()
    const targetDate = primaryGoal?.target_date
    const weeksRemaining = targetDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(`${targetDate}T12:00:00`).getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)
          )
        )
      : 1
    const weeklyTargetHours = primaryGoal
      ? Math.round((Number(primaryGoal.target_hours) / weeksRemaining) * 10) / 10
      : 0
    const primaryGoalWeekHours = (primaryGoalWeekMins / 60).toFixed(1)
    const primaryGoalPct =
      weeklyTargetHours > 0
        ? Math.min(100, Math.round((primaryGoalWeekMins / 60) / weeklyTargetHours * 100))
        : 0
    return { weeklyTargetHours, primaryGoalPct, primaryGoalWeekHours }
  }, [primaryGoal, primaryGoalWeekMins])

  const showNowLine =
    Boolean(date) &&
    nowLineTopPx != null &&
    nowLineTopPx >= -2 &&
    nowLineTopPx <= dayTimelineModel.containerHeightPx + 2

  function hasTimeConflict(
    newStart: string,
    newEnd: string,
    scheduleDate: string,
    excludeTaskId?: number
  ): boolean {
    if (!newStart || !newEnd) return false
    const newStartM = parseTimeMinutes(newStart)
    const newEndM = parseTimeMinutes(newEnd)
    if (newStartM == null || newEndM == null || newEndM <= newStartM) return false

    return tasks
      .filter(
        t =>
          t.scheduled_date === scheduleDate &&
          !t.is_all_day &&
          t.planned_start_time &&
          t.planned_end_time &&
          t.id !== excludeTaskId
      )
      .some(t => {
        const existStart = parseTimeMinutes(t.planned_start_time!.slice(0, 5))
        const existEnd = parseTimeMinutes(t.planned_end_time!.slice(0, 5))
        if (existStart == null || existEnd == null) return false
        return newStartM < existEnd && newEndM > existStart
      })
  }

  if (!date) {
    return (
      <Shell wide>
        <p style={{ fontSize: 'var(--fs-body-small)', color: 'var(--text-muted)' }}>loading...</p>
      </Shell>
    )
  }

  return (
    <Shell wide>
      {createOpen ? (
        (() => {
          const conflict = !taskAllDay && hasTimeConflict(taskStartTime, taskEndTime, taskDate || date || '')
          return (
        <div
          className={styles.createOverlay}
          role="presentation"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className={styles.gcAddTaskModal}
            role="dialog"
            aria-labelledby="gc-task-title"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.gcAddTaskHeader}>
              <button
                type="button"
                className={styles.gcAddTaskClose}
                aria-label="Close"
                onClick={() => setCreateOpen(false)}
              >
                ×
              </button>
            </div>
            <input
              id="gc-task-title"
              ref={createTitleInputRef}
              className={styles.gcAddTaskTitleInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && title.trim()) void addTaskNow()
              }}
              placeholder="Add title"
              disabled={goals.length === 0}
            />
            <div className={`${styles.gcAddTaskRow} ${styles.gcAddTaskRowDatetime}`}>
              <div className={styles.gcAddTaskRowIcon}>
                <GcIconClock />
              </div>
              <div className={styles.gcAddTaskRowBody}>
                <div className={styles.gcDatetimeRow}>
                  <label className={styles.gcDatePill}>
                    <span className={styles.gcDatePillLabel}>
                      {formatGcModalLongDate((taskDate || date) ?? '')}
                    </span>
                    <input
                      type="date"
                      value={taskDate}
                      onChange={e => setTaskDate(e.target.value)}
                      disabled={goals.length === 0}
                      className={styles.gcDatePillInput}
                      aria-label="Task date"
                    />
                  </label>
                  {!taskAllDay ? (
                    <>
                      <input
                        type="time"
                        value={taskStartTime}
                        onChange={e => setTaskStartTime(e.target.value)}
                        disabled={goals.length === 0}
                        className={styles.gcTimePill}
                        aria-label="Start time"
                        style={{ borderColor: conflict ? '#D85A30' : '#333' }}
                      />
                      <span className={styles.gcDatetimeSep} aria-hidden>
                        –
                      </span>
                      <input
                        type="time"
                        value={taskEndTime}
                        onChange={e => setTaskEndTime(e.target.value)}
                        disabled={goals.length === 0}
                        className={styles.gcTimePill}
                        aria-label="End time"
                        style={{ borderColor: conflict ? '#D85A30' : '#333' }}
                      />
                    </>
                  ) : (
                    <span className={styles.gcAllDayBadge}>All day</span>
                  )}
                </div>
                {!taskAllDay && conflict ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#D85A30',
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>⚠</span>
                    This time overlaps with an existing task
                  </div>
                ) : null}
                <label className={styles.gcAllDayRow}>
                  <input
                    type="checkbox"
                    checked={taskAllDay}
                    onChange={e => setTaskAllDay(e.target.checked)}
                    disabled={goals.length === 0}
                  />
                  <span>All day</span>
                </label>
              </div>
            </div>
            <div className={styles.gcAddTaskRow}>
              <div className={styles.gcAddTaskRowIcon}>
                <GcIconLines />
              </div>
              <div className={styles.gcAddTaskRowBody}>
                <textarea
                  className={styles.gcAddTaskDesc}
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="Add description"
                  rows={3}
                  disabled={goals.length === 0}
                />
              </div>
            </div>
            <div className={styles.gcAddTaskRow}>
              <div className={styles.gcAddTaskRowIcon}>
                <GcIconList />
              </div>
              <div className={styles.gcAddTaskRowBody}>
                <select
                  className={styles.gcAddTaskGoalSelect}
                  value={selectedGoalId ?? ''}
                  onChange={e => setSelectedGoalId(e.target.value ? Number(e.target.value) : null)}
                  disabled={goals.length === 0}
                  aria-label="Task goal"
                >
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.gcAddTaskFooter}>
              <button
                type="button"
                className={styles.gcAddTaskSave}
                onClick={() => void addTaskNow()}
                disabled={!title.trim() || goals.length === 0 || conflict}
              >
                Save
              </button>
            </div>
          </div>
        </div>
          )
        })()
      ) : null}

      {detailTask && detailEdit
        ? (() => {
            const detailConflict =
              !detailEdit.taskAllDay &&
              hasTimeConflict(
                detailEdit.taskStartTime,
                detailEdit.taskEndTime,
                detailEdit.taskDate || date || '',
                detailTask.id
              )
            const previewStartM = parseTimeMinutes(detailEdit.taskStartTime)
            const previewEndM = parseTimeMinutes(detailEdit.taskEndTime)
            const previewMins =
              !detailEdit.taskAllDay &&
              previewStartM != null &&
              previewEndM != null &&
              previewEndM > previewStartM
                ? previewEndM - previewStartM
                : detailTask.estimated_mins
            return (
              <div
                className={styles.createOverlay}
                role="presentation"
                onClick={() => closeTaskDetail()}
              >
                <div
                  className={styles.gcAddTaskModal}
                  role="dialog"
                  aria-labelledby="plan-task-detail-title"
                  aria-modal="true"
                  onClick={e => e.stopPropagation()}
                >
                  <div className={styles.gcAddTaskHeader}>
                    <button
                      type="button"
                      className={styles.gcAddTaskClose}
                      aria-label="Close"
                      onClick={() => closeTaskDetail()}
                    >
                      ×
                    </button>
                  </div>
                  <input
                    id="plan-task-detail-title"
                    className={styles.gcAddTaskTitleInput}
                    value={detailEdit.title}
                    onChange={e => setDetailEdit(d => (d ? { ...d, title: e.target.value } : d))}
                    placeholder="Task title"
                    disabled={goals.length === 0 || detailSaving}
                  />
                  <div className={`${styles.gcAddTaskRow} ${styles.gcAddTaskRowDatetime}`}>
                    <div className={styles.gcAddTaskRowIcon}>
                      <GcIconClock />
                    </div>
                    <div className={styles.gcAddTaskRowBody}>
                      <div className={styles.gcDatetimeRow}>
                        <label className={styles.gcDatePill}>
                          <span className={styles.gcDatePillLabel}>
                            {formatGcModalLongDate((detailEdit.taskDate || date) ?? '')}
                          </span>
                          <input
                            type="date"
                            value={detailEdit.taskDate}
                            onChange={e =>
                              setDetailEdit(d => (d ? { ...d, taskDate: e.target.value } : d))
                            }
                            disabled={goals.length === 0 || detailSaving}
                            className={styles.gcDatePillInput}
                            aria-label="Task date"
                          />
                        </label>
                        {!detailEdit.taskAllDay ? (
                          <>
                            <input
                              type="time"
                              value={detailEdit.taskStartTime}
                              onChange={e =>
                                setDetailEdit(d => (d ? { ...d, taskStartTime: e.target.value } : d))
                              }
                              disabled={goals.length === 0 || detailSaving}
                              className={styles.gcTimePill}
                              aria-label="Start time"
                              style={{ borderColor: detailConflict ? '#D85A30' : '#333' }}
                            />
                            <span className={styles.gcDatetimeSep} aria-hidden>
                              –
                            </span>
                            <input
                              type="time"
                              value={detailEdit.taskEndTime}
                              onChange={e =>
                                setDetailEdit(d => (d ? { ...d, taskEndTime: e.target.value } : d))
                              }
                              disabled={goals.length === 0 || detailSaving}
                              className={styles.gcTimePill}
                              aria-label="End time"
                              style={{ borderColor: detailConflict ? '#D85A30' : '#333' }}
                            />
                          </>
                        ) : (
                          <span className={styles.gcAllDayBadge}>All day</span>
                        )}
                      </div>
                      {!detailEdit.taskAllDay && detailConflict ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#D85A30',
                            marginTop: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>⚠</span>
                          This time overlaps with an existing task
                        </div>
                      ) : null}
                      <label className={styles.gcAllDayRow}>
                        <input
                          type="checkbox"
                          checked={detailEdit.taskAllDay}
                          onChange={e =>
                            setDetailEdit(d => (d ? { ...d, taskAllDay: e.target.checked } : d))
                          }
                          disabled={goals.length === 0 || detailSaving}
                        />
                        <span>All day</span>
                      </label>
                      <div className={styles.gcAddTaskTimeMeta}>
                        Duration · {formatDurationShort(previewMins)}
                        {detailTask.done ? ' · Done' : ''}
                      </div>
                    </div>
                  </div>
                  <div className={styles.gcAddTaskRow}>
                    <div className={styles.gcAddTaskRowIcon}>
                      <GcIconLines />
                    </div>
                    <div className={styles.gcAddTaskRowBody}>
                      <textarea
                        className={styles.gcAddTaskDesc}
                        value={detailEdit.description}
                        onChange={e =>
                          setDetailEdit(d => (d ? { ...d, description: e.target.value } : d))
                        }
                        placeholder="Description"
                        rows={3}
                        disabled={goals.length === 0 || detailSaving}
                      />
                    </div>
                  </div>
                  <div className={styles.gcAddTaskRow}>
                    <div className={styles.gcAddTaskRowIcon}>
                      <GcIconList />
                    </div>
                    <div className={styles.gcAddTaskRowBody}>
                      <select
                        className={styles.gcAddTaskGoalSelect}
                        value={detailEdit.goalId ?? ''}
                        onChange={e =>
                          setDetailEdit(d =>
                            d
                              ? { ...d, goalId: e.target.value ? Number(e.target.value) : null }
                              : d
                          )
                        }
                        disabled={goals.length === 0 || detailSaving}
                        aria-label="Task goal"
                      >
                        {goals.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    className={styles.gcAddTaskFooter}
                    style={{
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className={styles.gcTaskDetailDelete}
                      disabled={detailSaving}
                      onClick={() => {
                        const id = detailTask.id
                        closeTaskDetail()
                        void removeTaskNow(id)
                      }}
                    >
                      Delete task
                    </button>
                    <button
                      type="button"
                      className={styles.gcAddTaskSave}
                      disabled={
                        !detailEdit.title.trim() ||
                        goals.length === 0 ||
                        detailEdit.goalId == null ||
                        detailConflict ||
                        detailSaving
                      }
                      onClick={() => void saveTaskDetail()}
                    >
                      {detailSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })()
        : null}

      {intentionModalOpen ? (
        <div
          className={styles.createOverlay}
          role="presentation"
          onClick={() => setIntentionModalOpen(false)}
        >
          <div
            className={styles.gcAddTaskModal}
            role="dialog"
            aria-label="Set day intention"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 540 }}
          >
            <div className={styles.gcAddTaskHeader}>
              <button
                type="button"
                className={styles.gcAddTaskClose}
                aria-label="Close"
                onClick={() => setIntentionModalOpen(false)}
              >
                ×
              </button>
            </div>

            <input
              ref={intentionTitleRef}
              className={styles.gcAddTaskTitleInput}
              value={intentionTitle}
              onChange={e => setIntentionTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && intentionTitle.trim()) void saveIntention()
              }}
              placeholder="name this day"
              style={{ fontSize: 20 }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#555',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    marginBottom: 6,
                  }}
                >
                  what are you protecting today?
                </div>
                <textarea
                  className={styles.gcAddTaskDesc}
                  value={intentionFocus}
                  onChange={e => setIntentionFocus(e.target.value)}
                  placeholder="my attention, my time, my energy — for what?"
                  rows={2}
                  style={{ minHeight: 'unset' }}
                />
              </div>

              <button
                type="button"
                onClick={() => setIntentionDeeperOpen(o => !o)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: '#555',
                  cursor: 'pointer',
                  padding: '2px 0',
                  textAlign: 'left',
                }}
              >
                {intentionDeeperOpen ? '− less' : '+ go deeper (optional)'}
              </button>

              {intentionDeeperOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#555',
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                        marginBottom: 6,
                      }}
                    >
                      why does this day matter?
                    </div>
                    <textarea
                      className={styles.gcAddTaskDesc}
                      value={intentionPurpose}
                      onChange={e => setIntentionPurpose(e.target.value)}
                      placeholder="what is the bigger reason behind today's work?"
                      rows={2}
                      style={{ minHeight: 'unset' }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#555',
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                        marginBottom: 6,
                      }}
                    >
                      what are you building in yourself?
                    </div>
                    <textarea
                      className={styles.gcAddTaskDesc}
                      value={intentionCharacter}
                      onChange={e => setIntentionCharacter(e.target.value)}
                      placeholder="discipline, consistency, mastery..."
                      rows={2}
                      style={{ minHeight: 'unset' }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.gcAddTaskFooter}>
              <button
                type="button"
                className={styles.gcAddTaskSave}
                onClick={() => void saveIntention()}
                disabled={!intentionTitle.trim() || intentionSaving}
              >
                {intentionSaving ? 'saving...' : 'save intention'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.planContentWrap}>
        <div className={styles.planPageColumn}>
        <div className={styles.weekBar}>
          <button
            type="button"
            className={styles.weekNavBtn}
            aria-label="Previous week"
            onClick={() => {
              setWeekStart(s => addDays(s, -7))
              setDate(d => (d ? addDays(d, -7) : d))
            }}
          >
            ‹
          </button>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              minWidth: 0,
            }}
          >
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map(iso => {
              const isSelected = iso === date
              const isToday = iso === todayIso()
              const hasTask = taskDays.has(iso)
              const [y, mo, da] = iso.split('-').map(Number)
              const dow =
                y && mo && da
                  ? new Date(y, mo - 1, da).toLocaleDateString('en-GB', { weekday: 'short' })
                  : ''
              const dayNum = da ? String(Number(da)) : ''
              return (
                <button
                  key={iso}
                  type="button"
                  className={[styles.weekDayBox, isSelected ? styles.weekDayBoxSelected : ''].filter(Boolean).join(' ')}
                  onClick={() => setDate(iso)}
                  aria-label={`Select ${iso}`}
                  aria-pressed={isSelected}
                >
                  <span className={styles.weekDayDow}>{dow}</span>
                  <span
                    className={[styles.weekDayNum, isToday ? styles.weekDayNumToday : ''].filter(Boolean).join(' ')}
                  >
                    {dayNum}
                  </span>
                  {hasTask ? <span className={styles.weekDayDot} aria-hidden /> : null}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={styles.weekNavBtn}
            aria-label="Next week"
            onClick={() => {
              setWeekStart(s => addDays(s, 7))
              setDate(d => (d ? addDays(d, 7) : d))
            }}
          >
            ›
          </button>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNum}>{tasks.length}</div>
              <div className={styles.statLabel}>tasks planned today</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNum}>{(plannedMinsTotal / 60).toFixed(1)}h</div>
              <div className={styles.statLabel}>hours committed</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNum}>
                {primaryGoalWeekHours}h
              </div>
              <div className={styles.statLabel}>{(primaryGoal?.title ?? 'primary goal') + ' this week'}</div>
              <div className={styles.statBar}>
                <div className={styles.statBarFill} style={{ width: `${primaryGoalPct}%` }} />
              </div>
              <div className={styles.statSub}>
                {weeklyTargetHours}h target · {primaryGoalPct}%
              </div>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className={styles.planEmptyGuided}>
            <div className={styles.planEmptyTitle}>
              {date === todayIso() ? 'nothing planned for today' : 'nothing planned for this day'}
            </div>
            {goals.length === 0 ? (
              <>
                <p className={styles.planEmptyBody}>set your goals first — planning needs something to schedule toward.</p>
                <button type="button" className={styles.planEmptyCta} onClick={() => router.push('/goals')}>
                  go to goals →
                </button>
              </>
            ) : (
              <>
                <p className={styles.planEmptyBody}>
                  add your first task for this day
                  <br />
                  and set your intention for the day
                </p>
                <div className={styles.planEmptyActions}>
                  <button
                    type="button"
                    className={styles.planEmptyCta}
                    onClick={() => openCreateSheet()}
                  >
                    + add a task
                  </button>
                  <button type="button" className={styles.planEmptySecondary} onClick={() => openIntentionModal()}>
                    set intention
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <div
          style={{
            padding: '0 16px',
            marginBottom: 4,
          }}
        >
          <button
            type="button"
            onClick={openIntentionModal}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 14px',
              background: '#141414',
              border: '1px solid',
              borderColor: dayIntention ? '#2a3d2a' : '#1e1e1e',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: dayIntention ? '#5DCAA5' : '#2a2a2a',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: dayIntention ? '#aaa' : '#444',
                fontStyle: dayIntention ? 'italic' : 'normal',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {dayIntention
                ? `"${dayIntention.title}"`
                : 'set your intention for this day'}
            </span>
            <span style={{ fontSize: 11, color: '#333', flexShrink: 0 }}>
              {dayIntention ? 'edit' : '+'}
            </span>
          </button>
        </div>

        <main className={styles.planMain} aria-label="Day schedule">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px 8px',
              flexWrap: 'wrap',
            }}
          >
            <div ref={headerDateWrapRef} className={styles.dayHeaderDateWrap}>
              <button
                type="button"
                className={styles.dayHeaderDateTrigger}
                aria-expanded={headerCalendarOpen}
                aria-haspopup="dialog"
                aria-label="Open calendar"
                onClick={() => {
                  if (date) {
                    const [y, m] = date.split('-').map(Number)
                    if (y && m) setHeaderCalendarMonth({ y, m })
                  }
                  setHeaderCalendarOpen(o => !o)
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#5DCAA5',
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                    }}
                  >
                    {dayHeader.dowShort}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#1a2e20',
                      border: '1px solid #3a5a40',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#e8e4dc',
                      lineHeight: 1,
                    }}
                  >
                    {dayHeader.dayNum}
                  </div>
                </div>
                <div style={{ fontSize: 20, color: '#e8e4dc' }}>{formatLongDate(date)}</div>
              </button>
              {headerCalendarOpen ? (
                <div
                  className={styles.headerCalendarDropdown}
                  role="dialog"
                  aria-label="Choose a date"
                  onMouseDown={e => e.stopPropagation()}
                >
                  <div className={styles.headerCalendarNav}>
                    <button
                      type="button"
                      className={styles.headerCalendarNavBtn}
                      aria-label="Previous month"
                      onClick={() => shiftHeaderCalendarMonth(-1)}
                    >
                      ‹
                    </button>
                    <span className={styles.headerCalendarTitle}>
                      {formatMonthYearLabel(headerCalendarMonth.y, headerCalendarMonth.m)}
                    </span>
                    <button
                      type="button"
                      className={styles.headerCalendarNavBtn}
                      aria-label="Next month"
                      onClick={() => shiftHeaderCalendarMonth(1)}
                    >
                      ›
                    </button>
                  </div>
                  <div className={styles.headerCalendarDow} aria-hidden>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((c, i) => (
                      <div key={`hdow-${i}`}>{c}</div>
                    ))}
                  </div>
                  <div className={styles.headerCalendarGrid}>
                    {headerCalCells.map(({ iso, inMonth }) => {
                      const dom = Number(iso.slice(-2))
                      const isSelected = iso === date
                      const isToday = iso === todayIso()
                      const hasTask = taskDays.has(iso)
                      const cellClass = [
                        styles.headerCalCell,
                        !inMonth ? styles.headerCalCellMuted : '',
                        isSelected ? styles.headerCalCellSelected : '',
                        isToday && !isSelected ? styles.headerCalCellToday : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <button
                          key={iso + String(inMonth)}
                          type="button"
                          className={cellClass}
                          onClick={() => {
                            setDate(iso)
                            setHeaderCalendarOpen(false)
                          }}
                          aria-label={`Select ${iso}`}
                          aria-pressed={isSelected}
                        >
                          {dom}
                          {hasTask ? <span className={styles.headerCalDot} aria-hidden /> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className={styles.planCreateBtnCompact}
                onClick={() => openCreateSheet()}
                disabled={goals.length === 0}
              >
                <span className={styles.planCreatePlus}>+</span>
                <span>Create</span>
                <span className={styles.planCreateCaret} aria-hidden>
                  ▾
                </span>
              </button>
              <button type="button" className={styles.planTodayBtn} onClick={() => setDate(todayIso())}>
                Today
              </button>
              <div className={styles.planNavArrows}>
                <button
                  type="button"
                  className={styles.planNavArrow}
                  aria-label="Previous day"
                  onClick={() => setDate(d => (d ? addDays(d, -1) : d))}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.planNavArrow}
                  aria-label="Next day"
                  onClick={() => setDate(d => (d ? addDays(d, 1) : d))}
                >
                  ›
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '10px', color: '#666' }}>starts at</span>
                <input
                  type="time"
                  value={dayStartTime}
                  onChange={e => void patchDayStartTime(e.target.value)}
                  style={{
                    background: '#181818',
                    border: '1px solid #242424',
                    color: '#e8e4dc',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                  }}
                />
              </label>
            </div>
          </div>

          <div className={styles.dayTimeline}>
            <div className={styles.planCalendarScroll}>
              <div
                className={styles.dayTimelineCalendar}
                style={{
                  minHeight: `${dayTimelineModel.containerHeightPx}px`,
                  cursor: goals.length > 0 ? 'pointer' : undefined,
                }}
                onClick={goals.length > 0 ? openCreateSheetFromCalendarSurface : undefined}
              >
                {dayTimelineModel.hourMarkers.map(m => {
                  const topPx =
                    DAY_GRID_PAD_Y + ((m - dayTimelineModel.timelineBaseMins) / 60) * HOUR_HEIGHT_PX
                  return (
                    <div
                      key={m}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: topPx,
                        height: 1,
                        background: DAY_GRID_LINE,
                        pointerEvents: 'none',
                        zIndex: 0,
                      }}
                    />
                  )
                })}
                <div
                  style={{
                    position: 'absolute',
                    left: DAY_TIME_COLUMN_W,
                    top: 0,
                    width: 1,
                    height: dayTimelineModel.containerHeightPx,
                    background: DAY_GRID_SEP,
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                  aria-hidden
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: DAY_TIME_COLUMN_W,
                    top: 0,
                    height: dayTimelineModel.containerHeightPx,
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  {dayTimelineModel.hourMarkers.map(m => {
                    const topPx =
                      DAY_GRID_PAD_Y + ((m - dayTimelineModel.timelineBaseMins) / 60) * HOUR_HEIGHT_PX
                    return (
                      <div
                        key={`lbl-${m}`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          width: DAY_TIME_COLUMN_W - 2,
                          paddingRight: 6,
                          top: topPx,
                          transform: 'translateY(-50%)',
                          fontSize: '10px',
                          color: '#666',
                          lineHeight: 1.2,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {hourLabelFromMins(m)}
                      </div>
                    )
                  })}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: DAY_BLOCKS_LEFT,
                    right: 6,
                    top: 0,
                    height: dayTimelineModel.containerHeightPx,
                    zIndex: 3,
                  }}
                >
                  {dayTimelineModel.blocks.length === 0 ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: DAY_GRID_PAD_Y + 10,
                        fontSize: '11px',
                        color: '#555',
                        textAlign: 'center',
                        lineHeight: 1.4,
                        pointerEvents: 'none',
                      }}
                    >
                      No tasks yet — click here or{' '}
                      <span style={{ color: '#6a8a78', fontWeight: 500 }}>Create</span>
                    </div>
                  ) : null}
                  {dayTimelineModel.blocks.map(({ task: t, topPx, heightPx }) => (
                    <div
                      key={t.id}
                      className={styles.taskBlock}
                      data-plan-task-block=""
                      onClick={e => {
                        e.stopPropagation()
                        openTaskDetail(t)
                      }}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: topPx,
                        height: heightPx,
                        background: '#1a2a1a',
                        borderLeft: `3px solid ${t.done ? '#444' : '#5DCAA5'}`,
                        borderRadius: '6px',
                        padding: '6px 8px',
                        opacity: t.done ? 0.4 : 1,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                      }}
                    >
                      <button
                        type="button"
                        className={styles.taskBlockRemove}
                        aria-label={`Remove ${t.title}`}
                        onClick={e => {
                          e.stopPropagation()
                          if (detailTask?.id === t.id) closeTaskDetail()
                          void removeTaskNow(t.id)
                        }}
                      >
                        ×
                      </button>
                      <div style={{ fontSize: '12px', color: '#e8e4dc', fontWeight: 500, lineHeight: 1.25 }}>
                        {t.title}
                      </div>
                      {t.goal_detail?.title ? (
                        <div style={{ fontSize: '10px', color: '#5DCAA5', marginTop: '4px', lineHeight: 1.2 }}>
                          {t.goal_detail.title}
                        </div>
                      ) : null}
                      <div
                        style={{
                          position: 'absolute',
                          right: 8,
                          bottom: 6,
                          fontSize: '10px',
                          color: '#666',
                        }}
                      >
                        {formatDurationShort(t.estimated_mins)}
                      </div>
                    </div>
                  ))}
                </div>
                {showNowLine ? (
                  <>
                    <div className={styles.nowLine} style={{ top: nowLineTopPx ?? 0 }} />
                    <div
                      style={{
                        position: 'absolute',
                        left: DAY_TIME_COLUMN_W - 5,
                        top: nowLineTopPx ?? 0,
                        transform: 'translateY(-50%)',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#ea4335',
                        border: '2px solid #0f0f0f',
                        zIndex: 6,
                        pointerEvents: 'none',
                      }}
                      aria-hidden
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>
    </Shell>
  )
}
