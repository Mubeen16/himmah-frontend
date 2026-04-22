'use client'

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import AddTaskModal from '@/components/today/AddTaskModal'
import ReflectionModal from '@/components/today/ReflectionModal'
import api from '@/lib/api'
import { triggerRefresh } from '@/lib/refresh'
import {
  addDaysIso,
  calcJourney,
  capitalizeFirstLetter,
  formatDateLabel,
  formatTimeLabelDisplay,
  greetingByHour,
  minutesToText,
  moveTaskInList,
  normDate,
  normalizeTimeForInput,
  parseIsoLocal,
  parseTimeMinutes,
  todayIso,
} from './today/utils'
import styles from './today.module.css'

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
  goal_detail: { id: number; title: string; category: string; is_primary?: boolean } | null
  title: string
  description?: string
  estimated_mins: number
  order: number
  done: boolean
  done_at: string | null
  planned_start_time?: string | null
  planned_end_time?: string | null
  is_all_day?: boolean
  task_reflection?: {
    id: number
    note: string
    what_went_well: string
    what_missed: string
    actual_mins: number | null
  } | null
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
  morning_energy: number | null
  morning_clarity: number | null
  sleep_quality: number | null
  tasks: Task[]
}

function goalBadgeForTask(
  goal: Task['goal_detail'],
  primaryGoalId: number | null
): { label: string; className: string } | null {
  if (!goal) return null
  const isPrimary = goal.is_primary === true || (primaryGoalId != null && goal.id === primaryGoalId)
  if (isPrimary) return { label: 'primary', className: styles.goalBadgePrimary }
  const cat = (goal.category || 'professional').toLowerCase()
  const map: Record<string, string> = {
    professional: styles.goalBadgeProfessional,
    engineering: styles.goalBadgeProfessional,
    spiritual: styles.goalBadgeSpiritual,
    family: styles.goalBadgeFamily,
    health: styles.goalBadgeHealth,
  }
  return {
    label: cat,
    className: map[cat] ?? styles.goalBadgeProfessional,
  }
}

function useEscapeToClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, onClose])
}

function LoadingFallback() {
  return (
    <Shell wide>
      <div className={styles.page}>
        <p style={{ fontSize: 'var(--fs-body-small)', color: 'var(--text-secondary)' }}>loading...</p>
      </div>
    </Shell>
  )
}

function TodayPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const onboardingStep = searchParams.get('step')
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [energy, setEnergy] = useState<number | null>(null)
  const [clarity, setClarity] = useState<number | null>(null)
  const [sleep, setSleep] = useState<number | null>(null)
  const [viewDate, setViewDate] = useState(() => todayIso())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const datePopoverRef = useRef<HTMLDivElement>(null)
  const [hour, setHour] = useState(new Date().getHours())
  const [timeLabel, setTimeLabel] = useState(() =>
    new Date().toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  )
  const [name] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('username') ?? 'there') : 'there',
  )
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null)
  const [parkedTodayCount, setParkedTodayCount] = useState(0)
  const [dayIntention, setDayIntention] = useState<DayIntention | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dropBeforeIndex, setDropBeforeIndex] = useState<number | null>(null)
  const [orderSaving, setOrderSaving] = useState(false)
  const sortedTasksRef = useRef<Task[]>([])
  const dropBeforeRef = useRef<number | null>(null)
  const [reflectionTask, setReflectionTask] = useState<Task | null>(null)
  const [reflNote, setReflNote] = useState('')
  const [reflWentWell, setReflWentWell] = useState('')
  const [reflMissed, setReflMissed] = useState('')
  const [reflActualMins, setReflActualMins] = useState<number | string>('')
  const [reflSaving, setReflSaving] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDate, setTaskDate] = useState(viewDate)
  const [taskStartTime, setTaskStartTime] = useState('09:30')
  const [taskEndTime, setTaskEndTime] = useState('10:30')
  const [taskAllDay, setTaskAllDay] = useState(false)
  const [taskGoalId, setTaskGoalId] = useState<number | null>(null)
  const [taskSaving, setTaskSaving] = useState(false)
  const firstPlanFetch = useRef(true)

  const loadForDate = useCallback(async (date: string) => {
    const [planRes, goalsRes, intentionRes] = await Promise.all([
      api.get<DayPlan[]>('/dayplans/', { params: { date } }),
      api.get<Goal[]>('/goals/', { params: { status: 'active' } }),
      api.get<DayIntention[]>('/dayintentions/', { params: { date } }),
    ])

    const todaysPlan = planRes.data[0] ?? null
    const goalData = goalsRes.data ?? []

    setDayIntention(intentionRes.data[0] ?? null)
    setPlan(todaysPlan)
    setGoals(goalData.filter(g => g.status === 'active'))
    setEnergy(todaysPlan?.morning_energy ?? null)
    setClarity(todaysPlan?.morning_clarity ?? null)
    setSleep(todaysPlan?.sleep_quality ?? null)

    const disRes = await api.get('/distractions/', {
      params: { verdict: 'parked' },
    })
    const parkedToday = (disRes.data ?? []).filter(
      (d: { revisit_after: string | null }) => d.revisit_after?.slice(0, 10) === date
    )
    setParkedTodayCount(parkedToday.length)

    setLoading(false)
    return goalData
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (firstPlanFetch.current) setLoading(true)
        const goalData = await loadForDate(viewDate)
        if (cancelled) return
        if (goalData.length === 0) {
          router.push('/goals?onboarding=true')
          return
        }
      } catch {
        if (!cancelled) setLoading(false)
      } finally {
        if (!cancelled) setLoading(false)
        firstPlanFetch.current = false
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viewDate, loadForDate, router])

  useEffect(() => {
    if (!calendarOpen) return
    const onDocDown = (e: MouseEvent) => {
      const el = datePopoverRef.current
      if (el && !el.contains(e.target as Node)) setCalendarOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [calendarOpen])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHour(new Date().getHours())
      setTimeLabel(
        new Date().toLocaleTimeString('en-GB', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      )
    }, 1000 * 30)
    return () => window.clearInterval(timer)
  }, [])

  useEscapeToClose(Boolean(reflectionTask), () => setReflectionTask(null))
  useEscapeToClose(addTaskOpen, () => setAddTaskOpen(false))

  const primaryGoal = useMemo(() => {
    const byFlag = goals.find(g => g.is_primary === true)
    if (byFlag) return byFlag
    return goals.find(g => g.parent_goal === null) ?? null
  }, [goals])

  const sortedTasks = useMemo(() => {
    if (!plan?.tasks) return []
    return [...plan.tasks].sort((a, b) => {
      const o = (a.order ?? 0) - (b.order ?? 0)
      return o !== 0 ? o : a.id - b.id
    })
  }, [plan?.tasks])

  sortedTasksRef.current = sortedTasks

  const journey = primaryGoal ? calcJourney(primaryGoal) : null
  const viewDateObj = useMemo(() => parseIsoLocal(viewDate), [viewDate])
  const dateLabel = formatDateLabel(viewDateObj)
  const isViewingToday = viewDate === todayIso()
  const greeting = greetingByHour(hour, name)
  const showMorning = plan !== null

  const doneCount = plan?.tasks.filter(t => t.done).length ?? 0
  const totalCount = sortedTasks.length
  const remainingMinutes =
    sortedTasks.filter(t => !t.done).reduce((sum, t) => sum + t.estimated_mins, 0)
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  function openAddTaskModal() {
    const fallbackGoalId = primaryGoal?.id ?? goals[0]?.id ?? null
    setTaskGoalId(fallbackGoalId)
    setTaskTitle('')
    setTaskDescription('')
    setTaskDate(viewDate)
    setTaskStartTime('09:30')
    setTaskEndTime('10:30')
    setTaskAllDay(false)
    setAddTaskOpen(true)
  }

  async function resolveDayPlanId(scheduleDate: string): Promise<number> {
    const target = normDate(scheduleDate)
    if (!target) throw new Error('invalid schedule date')
    const existingRes = await api.get<DayPlan[]>('/dayplans/', { params: { date: target } })
    const existing = existingRes.data[0]
    if (existing) return existing.id
    const created = await api.post<DayPlan>('/dayplans/', { date: target })
    return created.data.id
  }

  async function addTaskFromToday() {
    if (!taskTitle.trim() || taskGoalId == null || taskSaving) return
    setTaskSaving(true)
    try {
      const scheduleDate = normDate(taskDate || viewDate)
      if (!scheduleDate) return
      const pId = await resolveDayPlanId(scheduleDate)
      const startMins = parseTimeMinutes(taskStartTime)
      const endMins = parseTimeMinutes(taskEndTime)
      const computedMins =
        !taskAllDay && startMins != null && endMins != null && endMins > startMins
          ? endMins - startMins
          : 60
      const safeMins = Math.max(5, Math.round(computedMins))
      await api.post('/tasks/', {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        scheduled_date: scheduleDate,
        estimated_mins: safeMins,
        goal: taskGoalId,
        day_plan: pId,
        is_all_day: taskAllDay,
        planned_start_time: taskAllDay ? null : normalizeTimeForInput(taskStartTime),
        planned_end_time: taskAllDay ? null : normalizeTimeForInput(taskEndTime),
        due_date: null,
        order: sortedTasks.length + 1,
      })
      await loadForDate(scheduleDate)
      triggerRefresh()
      setAddTaskOpen(false)
    } finally {
      setTaskSaving(false)
    }
  }

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
      await loadForDate(viewDate)
      triggerRefresh()
    } finally {
      setBusyTaskId(null)
    }
  }

  function openReflection(task: Task) {
    setReflectionTask(task)
    setReflNote(task.task_reflection?.note ?? '')
    setReflWentWell(task.task_reflection?.what_went_well ?? '')
    setReflMissed(task.task_reflection?.what_missed ?? '')
    setReflActualMins(task.task_reflection?.actual_mins ?? '')
  }

  async function saveTaskReflection(task: Task) {
    const payload = {
      note: reflNote,
      what_went_well: reflWentWell,
      what_missed: reflMissed,
      actual_mins: reflActualMins !== '' ? Number(reflActualMins) : null,
    }
    if (task.task_reflection) {
      await api.patch(`/taskreflections/${task.task_reflection.id}/`, payload)
      return
    }
    await api.post('/taskreflections/', {
      task: task.id,
      ...payload,
    })
  }

  async function markDoneWithReflection() {
    if (!reflectionTask) return
    setReflSaving(true)
    try {
      await saveTaskReflection(reflectionTask)
      if (!reflectionTask.done) {
        await api.post(`/tasks/${reflectionTask.id}/mark_done/`)
      }
      setReflectionTask(null)
      await loadForDate(viewDate)
      triggerRefresh()
    } finally {
      setReflSaving(false)
    }
  }

  async function saveReflectionOnly() {
    if (!reflectionTask) return
    setReflSaving(true)
    try {
      await saveTaskReflection(reflectionTask)
      setReflectionTask(null)
      await loadForDate(viewDate)
      triggerRefresh()
    } finally {
      setReflSaving(false)
    }
  }

  const clearDragState = useCallback(() => {
    setDraggingIndex(null)
    setDropBeforeIndex(null)
    dropBeforeRef.current = null
  }, [])

  const handleTaskDragStart =
    (index: number) => (e: React.DragEvent) => {
      if (orderSaving) return
      e.dataTransfer.setData('text/plain', String(index))
      e.dataTransfer.effectAllowed = 'move'
      setDraggingIndex(index)
      setDropBeforeIndex(null)
      dropBeforeRef.current = null
    }

  const handleTaskRowDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (draggingIndex === null) return
      const el = e.currentTarget as HTMLElement
      const rect = el.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const before = e.clientY < mid ? index : index + 1
      dropBeforeRef.current = before
      setDropBeforeIndex(before)
    },
    [draggingIndex]
  )

  const handleTasksAreaDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const persistTaskReorder = useCallback(
    async (from: number, toBefore: number) => {
      const current = sortedTasksRef.current
      if (!plan || orderSaving || current.length === 0) return
      const next = moveTaskInList(current, from, toBefore)
      const unchanged = next.every((t, i) => t.id === current[i].id)
      if (unchanged) return
      const withOrder = next.map((t, i) => ({ ...t, order: i }))
      setPlan({ ...plan, tasks: withOrder })
      setOrderSaving(true)
      try {
        await Promise.all(withOrder.map((t, i) => api.patch(`/tasks/${t.id}/`, { order: i })))
      } catch {
        await loadForDate(viewDate)
      } finally {
        setOrderSaving(false)
      }
    },
    [plan, orderSaving, loadForDate, viewDate]
  )

  const handleTaskDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('text/plain')
      const from = raw === '' ? NaN : Number(raw)
      const toBefore = dropBeforeRef.current
      if (Number.isNaN(from) || toBefore === null) {
        clearDragState()
        return
      }
      void persistTaskReorder(from, toBefore)
      clearDragState()
    },
    [clearDragState, persistTaskReorder]
  )

  const handleTaskDragEnd = useCallback(() => {
    clearDragState()
  }, [clearDragState])

  const renderHeroDateBar = () => (
    <div className={styles.heroDateWrap} ref={datePopoverRef}>
      <button
        type="button"
        className={styles.heroDateTrigger}
        onClick={() => setCalendarOpen(o => !o)}
        aria-expanded={calendarOpen}
        aria-haspopup="dialog"
        aria-label="Choose day to view"
      >
        <span className={styles.heroDateText}>{dateLabel}</span>
        <span className={styles.heroDateSep}>·</span>
        <span className={styles.heroDateText}>{formatTimeLabelDisplay(timeLabel)}</span>
      </button>
      {calendarOpen ? (
        <div className={styles.heroDatePopover} role="dialog" aria-label="Pick a day">
          <div className={styles.heroDateNav}>
            <button
              type="button"
              className={styles.heroDateNavBtn}
              onClick={() => setViewDate(d => addDaysIso(d, -1))}
            >
              ← prev
            </button>
            {!isViewingToday ? (
              <button
                type="button"
                className={styles.heroDateNavBtn}
                onClick={() => setViewDate(todayIso())}
              >
                today
              </button>
            ) : null}
            <button
              type="button"
              className={styles.heroDateNavBtn}
              onClick={() => setViewDate(d => addDaysIso(d, 1))}
            >
              next →
            </button>
          </div>
          <label className={styles.heroDatePickRow}>
            <span className={styles.heroDatePickLabel}>jump to</span>
            <input
              type="date"
              className={styles.heroDateInput}
              value={viewDate}
              onChange={e => setViewDate(e.target.value)}
            />
          </label>
          <p className={styles.heroDateHint}>Load that day&apos;s plan and tasks here.</p>
        </div>
      ) : null}
    </div>
  )

  if (loading) {
    return <LoadingFallback />
  }

  if (!plan) {
    return (
      <Shell wide>
        <div className={styles.page}>
          <div className={styles.hero}>
            {renderHeroDateBar()}
            <div
              className={styles.heroGreeting}
              style={greeting.startsWith('السلام') ? { fontFamily: 'var(--font-arabic)' } : undefined}
            >
              {capitalizeFirstLetter(greeting.split(',')[0])},{' '}
              <span className={styles.heroGreetingName}>{capitalizeFirstLetter(name)}</span>
            </div>
          </div>
          <div className={styles.noPlanCard}>
            <div className={styles.noPlanTitle}>
              {isViewingToday ? 'no plan for today' : 'no plan for this day'}
            </div>
            <p className={styles.noPlanLead}>himmah works like this:</p>
            <ol className={styles.guidedLoopList}>
              <li>
                <button type="button" className={styles.guidedLoopLink} onClick={() => router.push('/goals')}>
                  set your goals →
                </button>
              </li>
              <li>
                <button type="button" className={styles.guidedLoopLink} onClick={() => router.push('/plan')}>
                  plan your day the night before →
                </button>
              </li>
              <li>
                <span className={styles.guidedLoopMuted}>execute here each morning</span>
              </li>
            </ol>
          </div>
          <button type="button" className={styles.noPlanBtn} onClick={() => router.push('/goals')}>
            start with your goals →
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell wide>
      <div className={styles.page}>
        {isOnboarding && onboardingStep === 'task' ? (
          <div
            style={{
              marginBottom: 12,
              fontSize: 12,
              color: '#b8b8b8',
              border: '1px solid #2a2a2a',
              background: '#141414',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            onboarding step 2/4: add your tasks here (same real app form).
          </div>
        ) : null}
        <div className={styles.hero}>
          {renderHeroDateBar()}
          <div
            className={styles.heroGreeting}
            style={greeting.startsWith('السلام') ? { fontFamily: 'var(--font-arabic)' } : undefined}
          >
            {capitalizeFirstLetter(greeting.split(',')[0])},{' '}
            <span className={styles.heroGreetingName}>{capitalizeFirstLetter(name)}</span>
          </div>
        </div>

        {(journey && primaryGoal) || showMorning ? (
        <div className={styles.contextRow}>
          {journey && primaryGoal ? (
            <div className={styles.journey}>
              <div
                className={styles.journeyBgText}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingLeft: 16,
                  paddingRight: 16,
                  maxWidth: '100%',
                }}
              >
                {primaryGoal.title}
              </div>
              <div className={styles.journeyTop}>
                <div className={styles.journeyLabel}>primary goal</div>
                <div className={styles.journeyDate}>
                  {new Date(primaryGoal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className={styles.journeyBottom}>
                <div className={styles.journeyWeek}>
                  week {journey.weekCurrent}{' '}
                  <span className={styles.journeyWeekSub}>/ {journey.weekTotal}</span>
                </div>
                <div className={styles.journeyBarWrap}>
                  <div className={styles.journeyBarFill} style={{ width: `${journey.progress}%` }} />
                </div>
              </div>
            </div>
          ) : null}

          {showMorning ? (
            <div className={styles.checkin}>
              <div className={styles.checkinLabel}>today</div>
              {[
                { key: 'energy', label: 'energy', value: energy },
                { key: 'clarity', label: 'clarity', value: clarity },
                { key: 'sleep', label: 'sleep', value: sleep },
              ].map(row => (
                <div key={row.key} className={styles.checkinRow}>
                  <span className={styles.checkinName}>{row.label}</span>
                  <div className={styles.checkinDots}>
                    {[1, 2, 3, 4, 5].map(dot => (
                      <button
                        key={dot}
                        type="button"
                        className={`${styles.checkinDot} ${
                          typeof row.value === 'number' && row.value >= dot ? styles.checkinDotOn : ''
                        }`}
                        onClick={() => {
                          const next = {
                            morning_energy: row.key === 'energy' ? dot : energy,
                            morning_clarity: row.key === 'clarity' ? dot : clarity,
                            sleep_quality: row.key === 'sleep' ? dot : sleep,
                          }
                          void patchMorning(next)
                        }}
                        aria-label={`${row.label} ${dot}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        ) : null}

        {dayIntention ? <div className={styles.intention}>{dayIntention.title}</div> : null}

        <div>
          <div className={styles.tasksHeader}>
            <div className={styles.tasksTitle}>execute</div>
            <div className={styles.tasksStats}>
              <span className={styles.tasksCount}>{doneCount}</span>
              <span className={styles.tasksTotal}>/ {totalCount}</span>
              <span className={styles.tasksTime}>· {minutesToText(remainingMinutes)}</span>
            </div>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          {sortedTasks.length === 0 ? (
            <div className={styles.executeEmpty}>
              <div className={styles.executeEmptyTitle}>nothing to execute yet</div>
              <p className={styles.executeEmptyText}>
                add tasks on plan — they show up here each morning. set your intention on plan too.
              </p>
              <button type="button" className={styles.executeEmptyBtn} onClick={() => router.push('/plan')}>
                open plan →
              </button>
            </div>
          ) : null}
          <div
            className={styles.tasks}
            onDragOver={handleTasksAreaDragOver}
            onDrop={e => {
              e.preventDefault()
              handleTaskDrop(e)
            }}
          >
            {sortedTasks.map((task, index) => {
              const goalName = task.goal_detail?.title ?? null
              const timeLabel = task.is_all_day
                ? 'all day'
                : task.planned_start_time && task.planned_end_time
                  ? `${task.planned_start_time.slice(0, 5)} – ${task.planned_end_time.slice(0, 5)}`
                  : null
              const badge = goalBadgeForTask(task.goal_detail, primaryGoal?.id ?? null)
              const showInsert =
                draggingIndex !== null && dropBeforeIndex !== null && dropBeforeIndex === index
              return (
                <Fragment key={task.id}>
                  {showInsert ? <div className={styles.taskInsertLine} aria-hidden /> : null}
                  <div
                    className={`${styles.taskRow} ${task.done ? styles.taskRowDone : ''} ${
                      draggingIndex === index ? styles.taskRowDragging : ''
                    }`}
                    onDragOverCapture={handleTaskRowDragOver(index)}
                    onDrop={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTaskDrop(e)
                    }}
                  >
                    <button
                      type="button"
                      className={styles.taskHandle}
                      draggable={!orderSaving}
                      onDragStart={handleTaskDragStart(index)}
                      onDragEnd={handleTaskDragEnd}
                      aria-label="Drag to reorder"
                      title="Drag ≡ to reorder"
                    >
                      ≡
                    </button>
                    <button
                      type="button"
                      className={`${styles.taskCheckbox} ${task.done ? styles.taskCheckboxDone : ''}`}
                      disabled={busyTaskId === task.id}
                      onClick={e => {
                        e.stopPropagation()
                        void toggleTask(task)
                      }}
                      aria-label={task.done ? 'Mark not done' : 'Mark done'}
                    >
                      {task.done ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="#0f0f0f"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className={styles.taskMain}
                      disabled={busyTaskId === task.id}
                      onClick={() => openReflection(task)}
                    >
                      <div className={styles.taskBody}>
                        <span className={`${styles.taskTitle} ${task.done ? styles.taskTitleDone : ''}`}>
                          {task.title}
                        </span>
                        <div className={styles.taskMeta}>
                          {badge ? (
                            <span className={`${styles.goalBadge} ${badge.className}`}>
                              {badge.label.toLowerCase()}
                            </span>
                          ) : null}
                          {goalName ? <span className={styles.taskGoal}>{goalName}</span> : null}
                          {timeLabel ? <span className={styles.taskTime}>{timeLabel}</span> : null}
                        </div>
                      </div>
                      <span className={styles.taskDuration}>{task.estimated_mins}m</span>
                    </button>
                  </div>
                </Fragment>
              )
            })}
            {draggingIndex !== null &&
            dropBeforeIndex !== null &&
            dropBeforeIndex === sortedTasks.length ? (
              <div className={styles.taskInsertLine} aria-hidden />
            ) : null}
          </div>
        </div>

        {parkedTodayCount > 0 ? (
          <div className={styles.parkedBanner}>
            <span className={styles.parkedText}>
              {parkedTodayCount} parked idea{parkedTodayCount === 1 ? '' : 's'} to review today
            </span>
            <button type="button" className={styles.parkedBtn} onClick={() => router.push('/gate')}>
              review →
            </button>
          </div>
        ) : null}

        <button type="button" className={styles.planFooterBtn} onClick={() => openAddTaskModal()}>
          add tasks on plan →
        </button>
        {isOnboarding && onboardingStep === 'task' && sortedTasks.length > 0 ? (
          <button
            type="button"
            className={styles.planFooterBtn}
            onClick={() => router.push('/plan?onboarding=true&step=today')}
          >
            continue to today intention →
          </button>
        ) : null}
      </div>

      <AddTaskModal
        open={addTaskOpen}
        title={taskTitle}
        description={taskDescription}
        date={taskDate}
        startTime={taskStartTime}
        endTime={taskEndTime}
        allDay={taskAllDay}
        goalId={taskGoalId}
        goals={goals}
        saving={taskSaving}
        onClose={() => setAddTaskOpen(false)}
        onTitleChange={setTaskTitle}
        onDescriptionChange={setTaskDescription}
        onDateChange={setTaskDate}
        onStartTimeChange={setTaskStartTime}
        onEndTimeChange={setTaskEndTime}
        onAllDayChange={setTaskAllDay}
        onGoalChange={setTaskGoalId}
        onSave={() => void addTaskFromToday()}
      />

      <ReflectionModal
        task={reflectionTask}
        note={reflNote}
        wentWell={reflWentWell}
        missed={reflMissed}
        actualMins={reflActualMins}
        saving={reflSaving}
        onClose={() => setReflectionTask(null)}
        onNoteChange={setReflNote}
        onWentWellChange={setReflWentWell}
        onMissedChange={setReflMissed}
        onActualMinsChange={setReflActualMins}
        onSaveOnly={() => void saveReflectionOnly()}
        onMarkDone={() => void markDoneWithReflection()}
      />
    </Shell>
  )
}

export default function TodayPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TodayPageContent />
    </Suspense>
  )
}
