'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import api from '@/lib/api'
import { triggerRefresh } from '@/lib/refresh'
import styles from './goals.module.css'

type Category = 'professional' | 'spiritual' | 'family' | 'health'

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

function weeksFromTodayToDate(isoDate: string): number {
  if (!isoDate) return 0
  const today = new Date()
  const end = new Date(isoDate)
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}

function normalizeGoalCategory(raw: string): string {
  const cats: Category[] = ['professional', 'spiritual', 'family', 'health']
  return cats.includes(raw as Category) ? raw : 'professional'
}

function capitalizeFirstLetter(text: string): string {
  const t = text.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
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

function GoalsPageContent() {
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const [displayName] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('username') ?? 'there') : 'there',
  )
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [freqMode, setFreqMode] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [hoursPerSession, setHoursPerSession] = useState(2)
  const [hoursPerWeek, setHoursPerWeek] = useState(10)
  const [hoursPerMonth, setHoursPerMonth] = useState(40)
  const [formIsPrimary, setFormIsPrimary] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState('professional')
  const [formEndDate, setFormEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [editGoalId, setEditGoalId] = useState<number | null>(null)

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

  const weeksToDeadline = useMemo(() => weeksFromTodayToDate(formEndDate), [formEndDate])

  const perWeekHours = useMemo(() => {
    if (freqMode === 'daily') return Math.round(daysPerWeek * hoursPerSession * 10) / 10
    if (freqMode === 'weekly') return hoursPerWeek
    return Math.round((hoursPerMonth / 4.33) * 10) / 10
  }, [freqMode, daysPerWeek, hoursPerSession, hoursPerWeek, hoursPerMonth])

  const totalHours = useMemo(() => {
    return Math.round(weeksToDeadline * perWeekHours * 10) / 10
  }, [weeksToDeadline, perWeekHours])

  const paceLabel = useMemo(() => {
    if (totalHours === 0) return { text: 'adjust your commitment', color: '#EF9F27' }
    if (perWeekHours >= 15) return { text: 'heavy commitment — stay consistent', color: '#EF9F27' }
    if (perWeekHours >= 8) return { text: 'serious pace — respect', color: '#5DCAA5' }
    if (perWeekHours >= 4) return { text: 'solid — keep it daily', color: '#5DCAA5' }
    return { text: 'light pace — consider more time', color: '#EF9F27' }
  }, [perWeekHours, totalHours])

  useEffect(() => {
    void loadGoals()
  }, [])

  const modalOpen = formOpen || editGoalId !== null

  async function loadGoals() {
    setLoading(true)
    try {
      const res = await api.get<Goal[]>('/goals/', { params: { status: 'active' } })
      setGoals(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  const resetFormFields = useCallback(() => {
    setFormTitle('')
    setFormCategory('professional')
    setFormEndDate('')
    setFormIsPrimary(false)
    setFreqMode('daily')
    setDaysPerWeek(5)
    setHoursPerSession(2)
    setHoursPerWeek(10)
    setHoursPerMonth(40)
  }, [])

  const closeModal = useCallback(() => {
    setFormOpen(false)
    setEditGoalId(null)
    resetFormFields()
  }, [resetFormFields])

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, closeModal])

  function openForm() {
    resetFormFields()
    setEditGoalId(null)
    setFormOpen(true)
  }

  function openEditForm(goal: Goal) {
    setFormOpen(false)
    setEditGoalId(goal.id)
    setFormTitle(goal.title)
    setFormCategory(normalizeGoalCategory(goal.category))
    setFormEndDate(goal.target_date.slice(0, 10))
    setFormIsPrimary(!!goal.is_primary)
    const weeks = weeksFromTodayToDate(goal.target_date.slice(0, 10))
    const th = Number(goal.target_hours)
    if (weeks > 0 && th > 0) {
      const hw = Math.min(80, Math.max(0.5, Math.round((th / weeks) * 10) / 10))
      setFreqMode('weekly')
      setHoursPerWeek(hw)
      setDaysPerWeek(5)
      setHoursPerSession(2)
      setHoursPerMonth(40)
    } else {
      setFreqMode('weekly')
      setHoursPerWeek(th > 0 ? Math.min(80, Math.max(1, Math.round(th * 10) / 10)) : 10)
      setDaysPerWeek(5)
      setHoursPerSession(2)
      setHoursPerMonth(40)
    }
  }

  async function handleAddGoal() {
    if (!formTitle.trim() || !formEndDate || totalHours === 0) return
    setSaving(true)
    try {
      const currentPrimary = goals.find(g => g.is_primary)
      if (formIsPrimary && currentPrimary) {
        await api.patch(`/goals/${currentPrimary.id}/`, { is_primary: false })
      }
      await api.post('/goals/', {
        title: formTitle.trim(),
        category: formCategory,
        status: 'active',
        target_hours: totalHours,
        start_date: todayIso(),
        target_date: formEndDate,
        is_primary: formIsPrimary,
      })
      closeModal()
      await loadGoals()
      triggerRefresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (editGoalId === null || !formTitle.trim() || !formEndDate) return
    setSaving(true)
    try {
      const currentPrimary = goals.find(g => g.is_primary && g.id !== editGoalId)
      if (formIsPrimary && currentPrimary) {
        await api.patch(`/goals/${currentPrimary.id}/`, { is_primary: false })
      }
      const payload: {
        title: string
        category: string
        target_date: string
        is_primary: boolean
        target_hours?: number
      } = {
        title: formTitle.trim(),
        category: formCategory,
        target_date: formEndDate,
        is_primary: formIsPrimary,
      }
      if (totalHours > 0) payload.target_hours = totalHours
      await api.patch(`/goals/${editGoalId}/`, payload)
      closeModal()
      await loadGoals()
    } finally {
      setSaving(false)
    }
  }

  async function setPrimaryGoal(id: number) {
    const current = goals.find(g => g.is_primary)
    if (current) {
      await api.patch(`/goals/${current.id}/`, { is_primary: false })
    }
    await api.patch(`/goals/${id}/`, { is_primary: true })
    await loadGoals()
    triggerRefresh()
  }

  async function deleteGoal(id: number) {
    const ok = window.confirm('delete this goal? this cannot be undone.')
    if (!ok) return
    await api.delete(`/goals/${id}/`)
    await loadGoals()
  }

  function GoalCard({
    goal,
    primary,
    onDelete,
    onSetPrimary,
    onOpenEdit,
  }: {
    goal: Goal
    primary: boolean
    onDelete: () => void
    onSetPrimary?: () => void
    onOpenEdit: () => void
  }) {
    const s = stats(goal)
    const c = colorsForCategory(goal.category)
    const pct =
      goal.target_hours > 0
        ? Math.min(100, Math.round((Number(goal.logged_hours) / Number(goal.target_hours)) * 100))
        : 0
    return (
      <div
        className={[styles.goalCard, primary ? styles.goalCardPrimary : '', styles.goalCardInteractive].filter(Boolean).join(' ')}
        onClick={onOpenEdit}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className={styles.goalCardTitle}>{goal.title}</div>
          <div className={styles.goalCardToolbar} onClick={e => e.stopPropagation()}>
            <div
              style={{
                fontSize: 10,
                padding: '3px 9px',
                borderRadius: 20,
                color: c.badgeColor,
                background: c.badgeBg,
                border: `1px solid ${c.badgeBorder}`,
              }}
            >
              {goal.category}
            </div>
            {!primary && onSetPrimary ? (
              <button type="button" onClick={onSetPrimary} className={styles.setPrimaryBtn}>
                set primary
              </button>
            ) : null}
            <button type="button" onClick={onDelete} className={styles.deleteBtn}>
              delete
            </button>
          </div>
        </div>
        <div className={styles.goalCardMeta}>
          {monthYear(goal.start_date)} → {monthYear(goal.target_date)} · {s.target}h target
        </div>
        <div style={{ width: '100%', height: 3, background: '#252525', borderRadius: 2, marginBottom: 6 }}>
          <div
            style={{
              width: `${s.progress}%`,
              height: 3,
              borderRadius: 2,
              background: c.fill,
            }}
          />
        </div>
        <div className={styles.goalCardStatsRow}>
          <span>{s.logged}h logged</span>
          <span className={styles.goalCardStatsTarget}>{s.target}h target</span>
        </div>
        <div
          style={{
            height: 3,
            background: '#1a1a1a',
            borderRadius: 2,
            margin: '8px 0 2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 2,
              background: goal.is_primary ? '#EF9F27' : '#5DCAA5',
              width: pct + '%',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#333' }}>
          {pct}% of {goal.target_hours}h target
        </div>
        {s.logged > 0 ? (
          <div style={{ fontSize: 11, color: s.onTrack ? '#5DCAA5' : '#D85A30', marginTop: 6, fontWeight: 500 }}>
            {s.onTrack ? 'on track' : 'behind'}
          </div>
        ) : null}
      </div>
    )
  }

  const categoryOrder: Category[] = ['professional', 'spiritual', 'family', 'health']
  const categoriesWithGoals = categoryOrder.filter(cat => grouped[cat].length > 0)

  const dateLabel = new Date()
    .toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toLowerCase()

  return (
    <Shell wide>
      <div className={styles.page}>
        {isOnboarding && goals.length === 0 ? (
          <div className={styles.onboardingBanner}>start here — add your first goal before planning your day</div>
        ) : null}
        <div className={styles.hero}>
          <div className={styles.heroDate}>{dateLabel}</div>
          <h1 className={styles.heroTitle}>
            your goals,
            <br />
            <strong>{capitalizeFirstLetter(displayName)}</strong>
          </h1>
          <div className={styles.heroSub}>everything you&apos;re building toward</div>
        </div>

        {!loading && goals.length === 0 ? (
          <div className={styles.goalsEmptyGuided}>
            <div className={styles.goalsEmptyTitle}>no goals yet</div>
            <p className={styles.goalsEmptyBody}>
              himmah is built around one primary goal. everything else — your tasks, your day, your reviews — flows
              from that one thing.
            </p>
            <p className={styles.goalsEmptyQuestion}>what are you building toward?</p>
            <button type="button" onClick={openForm} className={styles.goalsEmptyCta}>
              + add your first goal
            </button>
          </div>
        ) : null}

        {!loading && goals.length > 0 ? (
          <button type="button" onClick={openForm} className={styles.addGoalBtn}>
            + add a new goal
          </button>
        ) : null}

        {loading ? (
          <p className={styles.loadingText}>loading...</p>
        ) : (
          <>
            {primaryGoal ? (
              <>
                <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
                  primary
                </div>
                <GoalCard
                  goal={primaryGoal}
                  primary
                  onDelete={() => void deleteGoal(primaryGoal.id)}
                  onOpenEdit={() => openEditForm(primaryGoal)}
                />
                <div style={{ height: 1, background: '#2a2a2a', margin: 0 }} />
              </>
            ) : null}

            {categoriesWithGoals.map((cat, i) => (
              <div key={cat}>
                <div className={styles.sectionLabel}>{cat}</div>
                {grouped[cat].map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    primary={false}
                    onDelete={() => void deleteGoal(goal.id)}
                    onSetPrimary={() => void setPrimaryGoal(goal.id)}
                    onOpenEdit={() => openEditForm(goal)}
                  />
                ))}
                {i < categoriesWithGoals.length - 1 ? <div style={{ height: 1, background: '#2a2a2a', margin: 0 }} /> : null}
              </div>
            ))}
          </>
        )}
      </div>

      {modalOpen ? (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editGoalId !== null ? 'edit goal' : 'new goal'}</h2>

            <div>
              <div className={styles.modalLabel}>what are you building?</div>
              <input
                className={styles.modalInput}
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Brocamp, learn Spanish, run a marathon..."
                autoFocus={editGoalId === null}
              />
            </div>

            <div>
              <div className={styles.modalLabel}>category</div>
              <div className={styles.categoryRow}>
                {['professional', 'spiritual', 'family', 'health'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className={[styles.categoryPill, formCategory === cat ? styles.categoryPillActive : ''].filter(Boolean).join(' ')}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className={styles.modalLabel}>deadline</div>
              <input
                type="date"
                className={`${styles.modalInput} ${styles.modalInputDate}`}
                value={formEndDate}
                onChange={e => setFormEndDate(e.target.value)}
              />
            </div>

            <div>
              <div className={styles.modalLabel}>how do you want to commit?</div>
              <div className={styles.modalSegmentWrap}>
                {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFreqMode(mode)}
                    className={[styles.modalSegmentBtn, freqMode === mode ? styles.modalSegmentBtnActive : ''].filter(Boolean).join(' ')}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className={styles.modalInsetBox}>
                {freqMode === 'daily' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div className={styles.modalInsetLabel}>days per week</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="number"
                          min={1}
                          max={7}
                          value={daysPerWeek}
                          onChange={e => setDaysPerWeek(Number(e.target.value))}
                          className={styles.modalNumber}
                        />
                        <span className={styles.modalUnit}>days</span>
                      </div>
                    </div>
                    <div>
                      <div className={styles.modalInsetLabel}>hours per session</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="number"
                          min={0.5}
                          max={12}
                          step={0.5}
                          value={hoursPerSession}
                          onChange={e => setHoursPerSession(Number(e.target.value))}
                          className={styles.modalNumber}
                        />
                        <span className={styles.modalUnit}>hrs</span>
                      </div>
                    </div>
                  </div>
                ) : freqMode === 'weekly' ? (
                  <div>
                    <div className={styles.modalInsetLabel}>hours per week</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="number"
                        min={1}
                        max={80}
                        value={hoursPerWeek}
                        onChange={e => setHoursPerWeek(Number(e.target.value))}
                        className={`${styles.modalNumber} ${styles.modalNumberLg}`}
                      />
                      <span className={styles.modalUnit}>hours / week</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={styles.modalInsetLabel}>hours per month</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={hoursPerMonth}
                        onChange={e => setHoursPerMonth(Number(e.target.value))}
                        className={`${styles.modalNumber} ${styles.modalNumberLg}`}
                      />
                      <span className={styles.modalUnit}>hours / month</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <hr className={styles.modalDivider} />

            <div className={styles.modalCommitCard}>
              <div className={styles.modalCommitHeading}>your commitment</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className={styles.modalCommitRow}>
                  <span className={styles.modalCommitKey}>weeks to deadline</span>
                  <span className={styles.modalCommitVal}>{weeksToDeadline > 0 ? `${weeksToDeadline} weeks` : '—'}</span>
                </div>
                <div className={styles.modalCommitRow}>
                  <span className={styles.modalCommitKey}>per week</span>
                  <span className={styles.modalCommitVal}>{perWeekHours > 0 ? `${perWeekHours}h` : '—'}</span>
                </div>
                <div className={styles.modalCommitRow}>
                  <span className={styles.modalCommitKey}>total hours</span>
                  <span className={styles.modalCommitValAccent}>{totalHours > 0 ? `${totalHours}h` : '—'}</span>
                </div>
                <div className={styles.modalCommitRow}>
                  <span className={styles.modalCommitKey}>pace</span>
                  <span className={styles.modalCommitVal} style={{ color: weeksToDeadline > 0 ? paceLabel.color : '#8a8680' }}>
                    {weeksToDeadline > 0 ? paceLabel.text : 'set a deadline first'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div className={styles.modalPrimaryRowTitle}>set as primary goal</div>
                <div className={styles.modalPrimaryRowHint}>shown on Today and Plan pages</div>
              </div>
              <button
                type="button"
                aria-pressed={formIsPrimary}
                onClick={() => setFormIsPrimary(o => !o)}
                className={[styles.modalToggle, formIsPrimary ? styles.modalToggleOn : ''].filter(Boolean).join(' ')}
              >
                <span
                  className={[styles.modalToggleKnob, formIsPrimary ? styles.modalToggleKnobOn : ''].filter(Boolean).join(' ')}
                  aria-hidden
                />
              </button>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={closeModal} className={styles.modalBtnCancel}>
                cancel
              </button>
              <button
                type="button"
                onClick={() => void (editGoalId !== null ? handleSaveEdit() : handleAddGoal())}
                disabled={
                  saving ||
                  !formTitle.trim() ||
                  !formEndDate ||
                  (editGoalId === null && totalHours === 0)
                }
                className={styles.modalBtnSubmit}
              >
                {saving ? 'saving...' : editGoalId !== null ? 'save changes' : 'add goal'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  )
}

export default function GoalsPage() {
  return (
    <Suspense
      fallback={
        <Shell wide>
          <div className={styles.page}>
            <p className={styles.loadingText}>loading...</p>
          </div>
        </Shell>
      }
    >
      <GoalsPageContent />
    </Suspense>
  )
}
