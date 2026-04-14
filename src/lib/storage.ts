import type { DayPlan, DayReview, Goal, GoalPillar, Task } from './types'

const KEYS = {
  goals: 'himmah_goals',
  plan: (date: string) => `himmah_plan_${date}`,
  review: (date: string) => `himmah_review_${date}`,
}

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Calendar "today" in the user's timezone (not UTC). */
export function today(): string {
  return localYmd(new Date())
}

export function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return localYmd(d)
}

export function normalizeGoal(raw: unknown): Goal {
  const g = raw as Partial<Goal> & { id?: string; title?: string }
  const title = g.title ?? 'goal'
  const id = g.id ?? 'unknown'
  return {
    id,
    title,
    identityLine: g.identityLine ?? title.toLowerCase(),
    trackLabel: g.trackLabel ?? null,
    pillar: (g.pillar as GoalPillar) ?? 'other',
    weekCurrent: g.weekCurrent ?? null,
    weekTotal: g.weekTotal ?? null,
    horizonLabel: g.horizonLabel ?? null,
    isJourneyFocus: Boolean(g.isJourneyFocus),
    period: g.period ?? 'half_year',
    status: g.status ?? 'active',
    parentGoalId: g.parentGoalId ?? null,
    createdAt: g.createdAt ?? new Date().toISOString(),
    targetDate: g.targetDate ?? today(),
  }
}

export function normalizeTask(raw: unknown): Task {
  const t = raw as Partial<Task> & { id?: string; title?: string; date?: string }
  return {
    id: t.id ?? '',
    title: t.title ?? '',
    date: t.date ?? today(),
    estimatedMins: t.estimatedMins ?? 30,
    actualMins: t.actualMins ?? null,
    goalId: t.goalId ?? null,
    focusTag: t.focusTag ?? null,
    done: Boolean(t.done),
    doneAt: t.doneAt ?? null,
    skipped: Boolean(t.skipped),
    skipReason: t.skipReason ?? null,
  }
}

function normalizePlan(raw: unknown): DayPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<DayPlan>
  if (!p.date || !Array.isArray(p.tasks)) return null
  return {
    date: p.date,
    tasks: p.tasks.map(normalizeTask),
    intention: p.intention ?? '',
    createdAt: p.createdAt ?? new Date().toISOString(),
  }
}

function seedGoals(): Goal[] {
  const ts = new Date().toISOString()
  const d = today()
  const id = () => generateId()
  return [
    normalizeGoal({
      id: id(),
      title: 'Backend engineer',
      identityLine: 'backend engineer',
      trackLabel: 'deep work',
      pillar: 'engineer',
      weekCurrent: 1,
      weekTotal: 26,
      horizonLabel: null,
      isJourneyFocus: true,
      period: 'half_year',
      status: 'active',
      parentGoalId: null,
      createdAt: ts,
      targetDate: d,
    }),
    normalizeGoal({
      id: id(),
      title: 'Family',
      identityLine: 'family',
      trackLabel: 'presence',
      pillar: 'family',
      weekCurrent: null,
      weekTotal: null,
      horizonLabel: null,
      isJourneyFocus: false,
      period: 'year',
      status: 'active',
      parentGoalId: null,
      createdAt: ts,
      targetDate: d,
    }),
    normalizeGoal({
      id: id(),
      title: 'Awrad & deen',
      identityLine: 'deen',
      trackLabel: 'awrad',
      pillar: 'deen',
      weekCurrent: null,
      weekTotal: null,
      horizonLabel: null,
      isJourneyFocus: false,
      period: 'year',
      status: 'active',
      parentGoalId: null,
      createdAt: ts,
      targetDate: d,
    }),
  ]
}

export function getGoals(): Goal[] {
  if (typeof window === 'undefined') return []
  const raw = read<unknown[]>(KEYS.goals)
  if (!raw || raw.length === 0) {
    const seeded = seedGoals()
    write(KEYS.goals, seeded)
    return seeded
  }
  return raw.map(g => normalizeGoal(g))
}

/** At most one journey focus goal. */
export function saveGoals(goals: Goal[]): void {
  let seen = false
  const next = goals.map(g => {
    const n = normalizeGoal(g)
    if (n.isJourneyFocus) {
      if (seen) return { ...n, isJourneyFocus: false }
      seen = true
    }
    return n
  })
  write(KEYS.goals, next)
}

export function getJourneyGoal(goals: Goal[]): Goal | null {
  return goals.find(g => g.isJourneyFocus) ?? null
}

export function getDayPlan(date: string): DayPlan | null {
  const p = read<unknown>(KEYS.plan(date))
  return normalizePlan(p)
}

export function saveDayPlan(plan: DayPlan): void {
  const normalized: DayPlan = {
    ...plan,
    tasks: plan.tasks.map(normalizeTask),
  }
  write(KEYS.plan(normalized.date), normalized)
}

export function getDayReview(date: string): DayReview | null {
  return read<DayReview>(KEYS.review(date))
}

export function saveDayReview(review: DayReview): void {
  write(KEYS.review(review.date), review)
}

/** Works on http://LAN IPs; `randomUUID` is only guaranteed in secure contexts (https / localhost). */
export function generateId(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID()
    } catch {
      /* continue */
    }
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const h = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}
