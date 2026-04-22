'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import api from '@/lib/api'
import styles from './review.module.css'

interface Task {
  id: number
  title: string
  done: boolean
  estimated_mins: number
  goal_detail: { id: number; title: string } | null
}

interface DayPlan {
  id: number
  date: string
  tasks: Task[]
}

interface DayIntention {
  id: number
  title: string
  focus: string
}

interface DayReview {
  id: number
  date: string
  score: number
  reflection: string
  energy_level: number
  distracted_by: string
  gratitude_note: string
  barakah_felt: boolean
  barakah_note: string
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const onboardingStep = searchParams.get('step')

  function clean(v: string | null | undefined): string {
    if (!v) return ''
    const t = v.trim()
    if (t === 'nil' || t === 'null' || t === 'undefined') return ''
    return t
  }

  const dateLabel = new Date()
    .toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toLowerCase()

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [intention, setIntention] = useState<DayIntention | null>(null)
  const [review, setReview] = useState<DayReview | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [reflection, setReflection] = useState('')
  const [distractedBy, setDistractedBy] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [barakah, setBarakah] = useState(false)
  const [barakahNote, setBarakahNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [taskExpanded, setTaskExpanded] = useState(false)
  const name =
    typeof window !== 'undefined'
      ? (localStorage.getItem('username') ?? 'there')
      : 'there'

  useEffect(() => {
    void (async () => {
      const date = todayIso()
      const [planRes, intentionRes, reviewRes] = await Promise.all([
        api.get<DayPlan[]>('/dayplans/', { params: { date } }),
        api.get<DayIntention[]>('/dayintentions/', { params: { date } }),
        api.get<DayReview[]>('/dayreviews/', { params: { date } }),
      ])
      const p = planRes.data[0] ?? null
      const i = intentionRes.data[0] ?? null
      const r = reviewRes.data[0] ?? null
      setPlan(p)
      setIntention(i)
      setReview(r)
      if (r) {
        setScore(r.score)
        setReflection(clean(r.reflection))
        setDistractedBy(clean(r.distracted_by))
        setGratitude(clean(r.gratitude_note))
        setBarakah(r.barakah_felt)
        setBarakahNote(clean(r.barakah_note))
      }
      setLoading(false)
    })()
  }, [])

  async function saveReview() {
    if (!score) return
    setSaving(true)
    try {
      const date = todayIso()
      const payload = {
        date,
        score,
        reflection,
        energy_level: score,
        distracted_by: distractedBy,
        gratitude_note: gratitude,
        barakah_felt: barakah,
        barakah_note: barakahNote,
      }
      if (review) {
        await api.patch(`/dayreviews/${review.id}/`, payload)
      } else {
        await api.post('/dayreviews/', payload)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell wide>
      <div className={styles.page} aria-busy={loading}>
        {isOnboarding && onboardingStep === 'reflect' ? (
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
            onboarding step 4/4: complete your reflect form here.
          </div>
        ) : null}
        {/* GREETING */}
        <div className={styles.hero}>
          <div className={styles.heroDate}>{dateLabel}</div>
          <div className={styles.heroTitle}>
            reflect on your day,
            <br />
            <strong>{name}</strong>
          </div>
          <div className={styles.heroSub}>honest review builds the next better day</div>
        </div>

        {/* TASK COMPLETION CARD */}
        {plan ? (
          <div className={styles.completionCard} onClick={() => setTaskExpanded(o => !o)}>
            <div className={styles.completionCollapsed}>
              <div className={styles.completionLeft}>
                <div className={styles.completionNums}>
                  <span className={styles.cCount}>{plan.tasks.filter(t => t.done).length}</span>
                  <span className={styles.cTotal}>/ {plan.tasks.length}</span>
                </div>
                <div>
                  <div className={styles.cLabel}>tasks completed</div>
                  <div className={styles.cBarWrap}>
                    <div
                      className={styles.cBarFill}
                      style={{
                        width:
                          plan.tasks.length > 0
                            ? `${Math.round(
                                (plan.tasks.filter(t => t.done).length / plan.tasks.length) * 100,
                              )}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles.cChevron} ${taskExpanded ? styles.cChevronOpen : ''}`}>▾</div>
            </div>
            {taskExpanded ? (
              <div className={styles.completionExpanded} onClick={e => e.stopPropagation()}>
                <div className={styles.taskDivider} />
                {plan.tasks.map(task => (
                  <div key={task.id} className={styles.taskItem}>
                    <div
                      className={`${styles.taskDot} ${task.done ? styles.taskDotDone : styles.taskDotUndone}`}
                    />
                    <span className={`${styles.taskName} ${task.done ? styles.taskNameDone : ''}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* INTENTION */}
        {intention ? (
          <div className={styles.intention}>
            <div className={styles.intentionLabel}>your intention was</div>
            <div className={styles.intentionText}>{intention.title}</div>
          </div>
        ) : null}

        {/* SCORE */}
        <div>
          <div className={styles.sectionLabel}>score this day</div>
          <div className={styles.scoreRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={[
                  styles.scoreBtn,
                  score === n && n >= 8
                    ? styles.scoreBtnHigh
                    : score === n
                      ? styles.scoreBtnSelected
                      : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* REFLECTION FIELDS */}
        <div className={styles.fields}>
          <div>
            <div className={styles.fieldLabel}>how was the day overall?</div>
            <textarea
              className={styles.fieldInput}
              rows={3}
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="what happened today..."
            />
          </div>
          <div>
            <div className={styles.fieldLabel}>what pulled you off track?</div>
            <textarea
              className={styles.fieldInput}
              rows={2}
              value={distractedBy}
              onChange={e => setDistractedBy(e.target.value)}
              placeholder="distractions, blockers, excuses..."
            />
          </div>
          <div>
            <div className={styles.fieldLabel}>what are you grateful for?</div>
            <textarea
              className={styles.fieldInput}
              rows={2}
              value={gratitude}
              onChange={e => setGratitude(e.target.value)}
              placeholder="one thing..."
            />
          </div>
        </div>

        {/* COHERENCE / MOMENTUM */}
        <div className={styles.barakah}>
          <div>
            <div className={styles.barakahTitle}>how much did today feel coherent?</div>
            <div className={styles.barakahSub}>did things align? did your actions match your intention?</div>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${barakah ? styles.toggleOn : ''}`}
            onClick={() => setBarakah(o => !o)}
            aria-label="Toggle coherence"
          >
            <div className={styles.toggleKnob} />
          </button>
        </div>

        {barakah ? (
          <div>
            <div className={styles.fieldLabel}>what made it feel that way?</div>
            <textarea
              className={styles.fieldInput}
              rows={2}
              value={barakahNote}
              onChange={e => setBarakahNote(e.target.value)}
              placeholder="what clicked today..."
            />
          </div>
        ) : null}

        {/* SAVE */}
        <button
          type="button"
          className={styles.saveBtn}
          onClick={() => void saveReview()}
          disabled={!score || saving}
        >
          {saving ? 'saving...' : saved ? 'saved ✓' : 'save review'}
        </button>
        {isOnboarding && onboardingStep === 'reflect' ? (
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => router.push('/')}
            style={{ marginTop: 10 }}
          >
            finish onboarding →
          </button>
        ) : null}
      </div>
    </Shell>
  )
}
