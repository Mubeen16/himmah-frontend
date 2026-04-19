'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const inputStyle = {
  width: '100%',
  background: '#141414',
  border: '1px solid #1e1e1e',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: '#e8e4dc',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

export default function OnboardingStep2() {
  const router = useRouter()
  const [taskInput, setTaskInput] = useState('')
  const [tasks, setTasks] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function addTask() {
    if (!taskInput.trim() || tasks.length >= 5) return
    setTasks(prev => [...prev, taskInput.trim()])
    setTaskInput('')
  }

  async function handleSubmit() {
    if (tasks.length === 0) {
      router.push('/onboarding/step3')
      return
    }
    setSaving(true)
    try {
      const goalsRes = await api.get<Array<{ id: number; is_primary?: boolean }>>('/goals/', {
        params: { status: 'active' },
      })
      const goals = goalsRes.data ?? []
      const primary = goals.find(g => g.is_primary) ?? goals[0]
      if (!primary) {
        router.push('/onboarding/step3')
        return
      }

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`

      await Promise.all(tasks.map((title, i) =>
        api.post('/tasks/', {
          goal: primary.id,
          title,
          scheduled_date: tomorrowIso,
          order: i,
          is_all_day: true,
          estimated_mins: 60,
        })
      ))
      router.push('/onboarding/step3')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* progress */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= 1 ? '#e8e4dc' : '#1e1e1e'
          }} />
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>step 2 of 3</div>
        <div style={{ fontSize: 24, color: '#e8e4dc', fontWeight: 300, lineHeight: 1.2 }}>
          goal set.<br /><strong style={{ fontWeight: 500 }}>plan your first day</strong>
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 6, lineHeight: 1.5 }}>
          add 1–3 tasks for tomorrow. keep it honest — what will you actually do?
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          add a task
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask() }}
            placeholder="e.g. Brocamp Week 1 — DRF serializers"
            autoFocus
          />
          <button type="button" onClick={addTask}
            disabled={!taskInput.trim() || tasks.length >= 5}
            style={{
              padding: '10px 14px', background: '#1a2a1a',
              border: '1px solid #2a3d2a', borderRadius: 8,
              fontSize: 13, color: '#5DCAA5', cursor: 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
              opacity: (!taskInput.trim() || tasks.length >= 5) ? 0.4 : 1,
            }}>
            add
          </button>
        </div>
      </div>

      {tasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#141414', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
          {tasks.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderBottom: i < tasks.length - 1 ? '1px solid #1a1a1a' : 'none',
            }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #242424', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: '#888' }}>{t}</span>
              <button type="button"
                onClick={() => setTasks(prev => prev.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <button type="button"
        onClick={() => void handleSubmit()}
        disabled={saving}
        style={{
          width: '100%', padding: 14, background: '#e8e4dc',
          border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 500, color: '#0f0f0f', cursor: 'pointer',
          fontFamily: 'inherit', opacity: saving ? 0.5 : 1,
        }}>
        {saving ? 'saving...' : tasks.length > 0 ? 'looks good →' : 'skip for now →'}
      </button>

    </div>
  )
}
