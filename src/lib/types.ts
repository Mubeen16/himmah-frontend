export type Period = 'day' | 'week' | 'month' | 'quarter' | 'half_year' | 'year'

export type GoalStatus = 'active' | 'completed' | 'paused' | 'pivoted'

export type GoalPillar = 'engineer' | 'family' | 'deen' | 'other'

export interface Goal {
  id: string
  title: string
  /** Shown in task line: ↳ {identityLine} · … */
  identityLine: string
  /** Default second segment after · when task has no focusTag */
  trackLabel: string | null
  pillar: GoalPillar
  /** When isJourneyFocus, home shows week X of Y */
  weekCurrent: number | null
  weekTotal: number | null
  horizonLabel: string | null
  isJourneyFocus: boolean
  period: Period
  status: GoalStatus
  parentGoalId: string | null
  createdAt: string
  targetDate: string
}

export interface Task {
  id: string
  title: string
  date: string
  estimatedMins: number
  actualMins: number | null
  goalId: string | null
  /** Overrides goal.trackLabel for the · line */
  focusTag: string | null
  done: boolean
  doneAt: string | null
  skipped: boolean
  skipReason: string | null
}

export interface DayPlan {
  date: string
  tasks: Task[]
  intention: string
  createdAt: string
}

export interface DayReview {
  date: string
  completedCount: number
  totalCount: number
  reflection: string
  score: 1 | 2 | 3 | 4 | 5
  createdAt: string
}
