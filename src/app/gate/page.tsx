'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Shell from '@/components/Shell'
import api from '@/lib/api'
import styles from './gate.module.css'

interface Distraction {
  id: number
  goal: number | null
  title: string
  description: string
  triggered_at: string
  verdict: 'parked' | 'pivot' | 'rejected' | null
  verdict_reason: string
  reviewed_at: string | null
  revisit_after: string | null
  is_ready: boolean
  created_at: string
  updated_at: string
}

interface Goal {
  id: number
  title: string
  is_primary?: boolean
  target_date?: string
  start_date?: string
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getRevisitDate(mode: string, val: number, unit: string): string {
  const hours: Record<string, number> = {
    '12h': 12,
    '48h': 48,
    '1w': 168,
    '1m': 720,
    '3m': 2160,
  }
  const unitH: Record<string, number> = { hours: 1, days: 24, weeks: 168, months: 720 }
  const h = mode === 'custom' ? val * (unitH[unit] ?? 24) : hours[mode] ?? 48
  const d = new Date()
  d.setHours(d.getHours() + h)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatCountdown(revisitAfter: string): string {
  const diff = new Date(`${revisitAfter}T00:00:00`).getTime() - Date.now()
  if (diff <= 0) return 'ready to decide'
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  const rh = h % 24
  if (d === 0) return `${h}h left`
  if (rh === 0) return `${d}d left`
  return `${d}d ${rh}h left`
}

function calcJourneyWeek(goal: Goal): { current: number; total: number } {
  const start = new Date(goal.start_date ?? '')
  const end = new Date(goal.target_date ?? '')
  const now = new Date()
  const total = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
  const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
  return { current: Math.min(total, elapsed + 1), total }
}

export default function GatePage() {
  const [loading, setLoading] = useState(true)
  const [ideas, setIdeas] = useState<Distraction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [tab, setTab] = useState<'waiting' | 'decide' | 'decided'>('waiting')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [revisitMode, setRevisitMode] = useState('48h')
  const [customValue, setCustomValue] = useState(3)
  const [customUnit, setCustomUnit] = useState('days')
  const [capturing, setCapturing] = useState(false)

  const [verdictId, setVerdictId] = useState<number | null>(null)
  const [verdictType, setVerdictType] = useState<'parked' | 'pivot' | 'rejected' | null>(null)
  const [verdictReason, setVerdictReason] = useState('')
  const [verdictGoalId, setVerdictGoalId] = useState<number | null>(null)
  const [parkRevisit, setParkRevisit] = useState('1w')
  const [verdictSaving, setVerdictSaving] = useState(false)

  const primaryGoal = useMemo(() => goals.find(g => g.is_primary) ?? goals[0] ?? null, [goals])
  const journey = useMemo(() => (primaryGoal ? calcJourneyWeek(primaryGoal) : null), [primaryGoal])
  const waiting = useMemo(() => ideas.filter(d => !d.verdict && !d.is_ready), [ideas])
  const ready = useMemo(() => ideas.filter(d => !d.verdict && d.is_ready), [ideas])
  const decided = useMemo(() => ideas.filter(d => d.verdict !== null), [ideas])

  useEffect(() => {
    void (async () => {
      const [disRes, goalsRes] = await Promise.all([
        api.get<Distraction[]>('/distractions/'),
        api.get<Goal[]>('/goals/', { params: { status: 'active' } }),
      ])
      setIdeas(disRes.data ?? [])
      setGoals(goalsRes.data ?? [])
      if ((disRes.data ?? []).some((d: Distraction) => !d.verdict && d.is_ready)) {
        setTab('decide')
      }
      setLoading(false)
    })()
  }, [])

  async function captureIdea() {
    if (!title.trim() || capturing) return
    setCapturing(true)
    try {
      const revisit = getRevisitDate(revisitMode, customValue, customUnit)
      const res = await api.post<Distraction>('/distractions/', {
        title: title.trim(),
        description: description.trim(),
        triggered_at: new Date().toISOString(),
        revisit_after: revisit,
      })
      setIdeas(prev => [res.data, ...prev])
      setTitle('')
      setDescription('')
      setRevisitMode('48h')
      setTab('waiting')
    } finally {
      setCapturing(false)
    }
  }

  function openVerdict(id: number, type: 'parked' | 'pivot' | 'rejected') {
    setVerdictId(id)
    setVerdictType(type)
    setVerdictReason('')
    setVerdictGoalId(goals[0]?.id ?? null)
    setParkRevisit('1w')
  }

  const closeVerdict = useCallback(() => {
    setVerdictId(null)
    setVerdictType(null)
    setVerdictReason('')
  }, [])

  useEffect(() => {
    if (!verdictId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVerdict()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [verdictId, closeVerdict])

  async function submitVerdict() {
    if (!verdictId || !verdictType || verdictSaving) return
    setVerdictSaving(true)
    try {
      const payload: Record<string, unknown> = {
        verdict: verdictType,
        verdict_reason: verdictReason.trim(),
        reviewed_at: new Date().toISOString(),
      }
      if (verdictType === 'parked') {
        payload.revisit_after = getRevisitDate(parkRevisit, customValue, customUnit)
      }
      if (verdictType === 'pivot' && verdictGoalId) {
        payload.goal = verdictGoalId
      }
      const res = await api.patch<Distraction>(`/distractions/${verdictId}/`, payload)
      setIdeas(prev => prev.map(d => (d.id === verdictId ? res.data : d)))
      closeVerdict()
      setTab('decided')
    } finally {
      setVerdictSaving(false)
    }
  }

  return (
    <Shell>
      <div className={styles.page}>
        {loading ? (
          <div className={styles.empty}>loading…</div>
        ) : (
          <>
            <div className={styles.hero}>
              <div className={styles.heroDate} title={todayIso()}>
                {new Date()
                  .toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                  .toLowerCase()}
              </div>
              <div className={styles.heroTitle}>the gate</div>
              <div className={styles.heroSub}>capture every idea. decide when you are ready.</div>
            </div>

            {ideas.length === 0 ? (
              <div className={styles.gateZeroCaptured}>
                <div className={styles.gateZeroTitle}>nothing captured yet</div>
                <p className={styles.gateZeroBody}>
                  when a new idea hits you during work, log it here instead of acting on it.
                </p>
                <p className={styles.gateZeroBody}>come back when you&apos;re ready to decide.</p>
              </div>
            ) : null}

            {journey && primaryGoal ? (
              <div className={styles.context}>
                <div className={styles.contextLeft}>
                  <div className={styles.contextLabel}>before you log anything</div>
                  <div className={styles.contextText}>
                    you are on{' '}
                    <strong>
                      week {journey.current} of {journey.total}
                    </strong>
                    .
                  </div>
                  <div className={styles.contextSub}>
                    does this idea serve <strong>{primaryGoal.title}</strong> — or take you away from it?
                  </div>
                </div>
                <div className={styles.contextBar}>
                  <div
                    className={styles.contextBarFill}
                    style={{ width: `${Math.round((journey.current / journey.total) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className={styles.capture}>
              <div className={styles.captureLabel}>new idea</div>
              <input
                className={styles.captureInput}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && title.trim()) void captureIdea()
                }}
                placeholder="what just hit you?"
              />
              <textarea
                className={styles.captureNote}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="optional — why does this feel important?"
                rows={2}
              />
              <div>
                <div className={styles.revisitLabel}>when should you revisit this?</div>
                <div className={styles.revisitChips}>
                  {(['12h', '48h', '1w', '1m', 'custom'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.revisitChip} ${revisitMode === m ? styles.revisitChipSel : ''}`}
                      onClick={() => setRevisitMode(m)}
                    >
                      {m === '12h'
                        ? '12 hours'
                        : m === '48h'
                          ? '48 hours'
                          : m === '1w'
                            ? '1 week'
                            : m === '1m'
                              ? '1 month'
                              : 'custom'}
                    </button>
                  ))}
                </div>
                {revisitMode === 'custom' ? (
                  <div className={styles.customRow}>
                    <input
                      type="number"
                      value={customValue}
                      min={1}
                      max={365}
                      onChange={e => setCustomValue(Number(e.target.value))}
                      className={styles.customNum}
                    />
                    <select
                      value={customUnit}
                      onChange={e => setCustomUnit(e.target.value)}
                      className={styles.customSel}
                    >
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                    <span className={styles.customHint}>from now</span>
                  </div>
                ) : null}
                <div className={styles.revisitHint}>
                  locked until <strong>{getRevisitDate(revisitMode, customValue, customUnit)}</strong>
                </div>
              </div>
              <div className={styles.captureFooter}>
                <span className={styles.captureLock}>you cannot verdict until the window passes</span>
                <button
                  type="button"
                  className={styles.captureBtn}
                  onClick={() => void captureIdea()}
                  disabled={!title.trim() || capturing}
                >
                  {capturing ? 'capturing...' : 'capture'}
                </button>
              </div>
            </div>

            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'waiting' ? styles.tabActive : ''}`}
                onClick={() => setTab('waiting')}
              >
                waiting · {waiting.length}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'decide' ? styles.tabActive : ''}`}
                onClick={() => setTab('decide')}
              >
                {ready.length > 0 ? `decide · ${ready.length}` : 'decide · 0'}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'decided' ? styles.tabActive : ''}`}
                onClick={() => setTab('decided')}
              >
                decided · {decided.length}
              </button>
            </div>

            {tab === 'waiting' ? (
              <div className={styles.ideas}>
                {waiting.length === 0 ? (
                  <div className={styles.empty}>no ideas waiting — capture something</div>
                ) : (
                  waiting.map(d => (
                    <div key={d.id} className={styles.ideaCard}>
                      <div className={styles.ideaTop}>
                        <div className={styles.ideaTitle}>{d.title}</div>
                        <span className={styles.badgeWaiting}>waiting</span>
                      </div>
                      {d.description ? <div className={styles.ideaNote}>{d.description}</div> : null}
                      <div className={styles.ideaMeta}>
                        <span className={styles.ideaTime}>
                          {new Date(d.triggered_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {d.revisit_after ? (
                          <span className={styles.ideaCountdown}>· {formatCountdown(d.revisit_after)}</span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {tab === 'decide' ? (
              <div className={styles.ideas}>
                {ready.length === 0 ? (
                  <div className={styles.empty}>nothing to decide right now</div>
                ) : (
                  ready.map(d => (
                    <div key={d.id} className={styles.ideaCardReady}>
                      <div className={styles.ideaTop}>
                        <div className={styles.ideaTitle}>{d.title}</div>
                        <span className={styles.badgeReady}>decide now</span>
                      </div>
                      {d.description ? <div className={styles.ideaNote}>{d.description}</div> : null}
                      <div className={styles.ideaMeta}>
                        <span className={styles.ideaTime}>
                          {new Date(d.triggered_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className={styles.ideaCountdownReady}>· window passed</span>
                      </div>
                      <div className={styles.verdictRow}>
                        <button type="button" className={styles.btnPark} onClick={() => openVerdict(d.id, 'parked')}>
                          park it
                        </button>
                        <button type="button" className={styles.btnPivot} onClick={() => openVerdict(d.id, 'pivot')}>
                          pivot
                        </button>
                        <button type="button" className={styles.btnReject} onClick={() => openVerdict(d.id, 'rejected')}>
                          reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {tab === 'decided' ? (
              <div className={styles.ideas}>
                {decided.length === 0 ? (
                  <div className={styles.empty}>no decisions yet</div>
                ) : (
                  decided.map(d => (
                    <div
                      key={d.id}
                      className={
                        d.verdict === 'pivot'
                          ? styles.ideaCardPivot
                          : d.verdict === 'rejected'
                            ? styles.ideaCardRejected
                            : styles.ideaCardParked
                      }
                    >
                      <div className={styles.ideaTop}>
                        <div className={d.verdict === 'rejected' ? styles.ideaTitleRejected : styles.ideaTitle}>
                          {d.title}
                        </div>
                        <span
                          className={
                            d.verdict === 'pivot'
                              ? styles.badgePivot
                              : d.verdict === 'rejected'
                                ? styles.badgeRejected
                                : styles.badgeParked
                          }
                        >
                          {d.verdict === 'pivot' ? 'pivoting' : d.verdict === 'rejected' ? 'rejected' : 'parked'}
                        </span>
                      </div>
                      {d.verdict_reason ? <div className={styles.ideaNote}>{d.verdict_reason}</div> : null}
                      <div className={styles.ideaMeta}>
                        <span className={styles.ideaTime}>
                          {d.reviewed_at
                            ? new Date(d.reviewed_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : '—'}
                        </span>
                        {d.verdict === 'parked' && d.revisit_after ? (
                          <span className={styles.ideaCountdown}>· revisit {d.revisit_after}</span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            <div className={styles.insight}>
              <div className={styles.insightTitle}>focus discipline</div>
              <div className={styles.insightRow}>
                <div className={styles.insightStat}>
                  <div className={styles.insightNum}>{ideas.length}</div>
                  <div className={styles.insightLabel}>captured</div>
                </div>
                <div className={styles.insightStat}>
                  <div className={`${styles.insightNum} ${styles.insightTeal}`}>
                    {ideas.filter(d => d.verdict === 'pivot').length}
                  </div>
                  <div className={styles.insightLabel}>pivoting</div>
                </div>
                <div className={styles.insightStat}>
                  <div className={`${styles.insightNum} ${styles.insightAmber}`}>
                    {ideas.filter(d => d.verdict === 'parked').length}
                  </div>
                  <div className={styles.insightLabel}>parked</div>
                </div>
                <div className={styles.insightStat}>
                  <div className={`${styles.insightNum} ${styles.insightMuted}`}>
                    {ideas.filter(d => d.verdict === 'rejected').length}
                  </div>
                  <div className={styles.insightLabel}>rejected</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {verdictId && verdictType ? (
        <div className={styles.modalBackdrop} onClick={closeVerdict}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />

            <div className={styles.modalTitle}>
              {verdictType === 'parked' ? 'park this idea' : verdictType === 'pivot' ? 'pivot to this' : 'reject this idea'}
            </div>

            {verdictType === 'parked' ? (
              <div>
                <div className={styles.modalFieldLabel}>revisit in</div>
                <div className={styles.modalChipRow}>
                  {(['1w', '1m', '3m'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setParkRevisit(m)}
                      className={`${styles.modalChip} ${parkRevisit === m ? styles.modalChipActive : ''}`}
                    >
                      {m === '1w' ? '1 week' : m === '1m' ? '1 month' : '3 months'}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {verdictType === 'pivot' ? (
              <div>
                <div className={styles.modalFieldLabel}>which goal does this serve?</div>
                <select
                  value={verdictGoalId ?? ''}
                  onChange={e => setVerdictGoalId(Number(e.target.value))}
                  className={styles.modalSelect}
                >
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <div className={styles.modalFieldLabel}>
                {verdictType === 'rejected' ? 'why are you rejecting this?' : 'notes (optional)'}
              </div>
              <textarea
                value={verdictReason}
                onChange={e => setVerdictReason(e.target.value)}
                placeholder={verdictType === 'rejected' ? 'helps you reflect later' : 'optional'}
                rows={2}
                className={styles.modalTextarea}
              />
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={closeVerdict} className={styles.modalCancel}>
                cancel
              </button>
              <button
                type="button"
                onClick={() => void submitVerdict()}
                disabled={verdictSaving}
                className={[
                  styles.modalSubmit,
                  verdictType === 'pivot'
                    ? styles.modalSubmitPivot
                    : verdictType === 'rejected'
                      ? styles.modalSubmitReject
                      : styles.modalSubmitPark,
                ].join(' ')}
              >
                {verdictSaving
                  ? 'saving...'
                  : verdictType === 'parked'
                    ? 'park it — come back later'
                    : verdictType === 'pivot'
                      ? 'pivot to this'
                      : 'reject it'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  )
}
