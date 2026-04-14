import type { Goal, Task } from './types'

export function taskContextLine(task: Task, goal: Goal | null): string {
  if (!goal) {
    if (task.focusTag) return `↳ ${task.focusTag}`
    return ''
  }
  const second = task.focusTag ?? goal.trackLabel
  if (second) return `↳ ${goal.identityLine} · ${second}`
  return `↳ ${goal.identityLine}`
}

export function goalById(goals: Goal[], id: string | null): Goal | null {
  if (!id) return null
  return goals.find(g => g.id === id) ?? null
}
