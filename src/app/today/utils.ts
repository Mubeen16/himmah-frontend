type GoalLike = {
  start_date: string
  target_date: string
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Sentence case: first character upper, rest unchanged (locale strings stay natural). */
export function capitalizeFirstLetter(text: string): string {
  const t = text.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function formatTimeLabelDisplay(raw: string): string {
  return raw.replace(/\s*(am|pm)\s*$/i, m => m.trim().toUpperCase())
}

export function normalizeTimeForInput(v: string | null | undefined): string {
  if (!v || typeof v !== 'string') return '09:00'
  const raw = v.replace('Z', '').trim().slice(0, 8)
  const parts = raw.split(':')
  const hh = String(Number(parts[0]) || 9).padStart(2, '0')
  const mm = String(Number(parts[1]) || 0).padStart(2, '0')
  const out = `${hh}:${mm}`
  return /^\d{2}:\d{2}$/.test(out) ? out : '09:00'
}

export function parseTimeMinutes(v: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(v)) return null
  const [h, m] = v.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

export function normDate(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).slice(0, 10)
}

export function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysIso(iso: string, delta: number): string {
  const dt = parseIsoLocal(iso)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function greetingByHour(hour: number, name: string): string {
  if (hour < 12) return `good morning, ${name}`
  if (hour < 17) return `keep going, ${name}`
  if (hour < 21) return `keep pushing, ${name}`
  return `plan tomorrow before you sleep, ${name}`
}

export function minutesToText(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (mins === 0) return `${hours}h left`
  return `${hours}h ${mins}m left`
}

export function moveTaskInList<T>(items: T[], from: number, toBefore: number): T[] {
  const n = items.length
  if (from < 0 || from >= n) return items
  const clamped = Math.max(0, Math.min(toBefore, n))
  const next = [...items]
  const [item] = next.splice(from, 1)
  let insertAt = clamped
  if (from < clamped) insertAt = clamped - 1
  insertAt = Math.max(0, Math.min(insertAt, next.length))
  next.splice(insertAt, 0, item)
  return next
}

export function calcJourney(goal: GoalLike): { weekCurrent: number; weekTotal: number; progress: number } {
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
