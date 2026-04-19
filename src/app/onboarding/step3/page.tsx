'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function OnboardingStep3() {
  const router = useRouter()
  const [intention, setIntention] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!intention.trim()) {
      router.push('/')
      return
    }
    setSaving(true)
    try {
      const date = todayIso()
      const planRes = await api.get('/dayplans/', { params: { date } })
      let planId: number | null = planRes.data[0]?.id ?? null
      if (!planId) {
        const newPlan = await api.post('/dayplans/', { date })
        planId = newPlan.data.id
      }
      await api.post('/dayintentions/', {
        date,
        day_plan: planId,
        title: intention.trim(),
        focus: '',
        purpose: '',
        character: '',
      })
      router.push('/')
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
            background: '#e8e4dc'
          }} />
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>step 3 of 3</div>
        <div style={{ fontSize: 24, color: '#e8e4dc', fontWeight: 300, lineHeight: 1.2 }}>
          set your<br /><strong style={{ fontWeight: 500 }}>intention</strong>
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 6, lineHeight: 1.5 }}>
          one sentence. what do you want today to mean?
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          today I will
        </div>
        <input
          style={{
            width: '100%', background: '#141414', border: '1px solid #1e1e1e',
            borderRadius: 8, padding: '10px 12px', fontSize: 14,
            color: '#e8e4dc', outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box' as const,
          }}
          value={intention}
          onChange={e => setIntention(e.target.value)}
          placeholder="go deep. no distractions. just execute."
          autoFocus
        />
      </div>

      <div style={{ height: 1, background: '#1a1a1a' }} />

      <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          the daily loop
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { num: '1', label: 'plan', sub: 'the night before', color: '#5DCAA5', bg: '#1a2a1a', border: '#2a3d2a' },
            { num: '2', label: 'execute', sub: 'each morning', color: '#5DCAA5', bg: '#1a2a1a', border: '#2a3d2a' },
            { num: '3', label: 'review', sub: 'end of day', color: '#5DCAA5', bg: '#1a2a1a', border: '#2a3d2a' },
            { num: 'G', label: 'gate', sub: 'every new idea', color: '#EF9F27', bg: '#2a1800', border: '#3d2800' },
          ].map(item => (
            <div key={item.num} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#0f0f0f', borderRadius: 7 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.bg, border: `1px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: item.color, fontWeight: 600, flexShrink: 0 }}>
                {item.num}
              </div>
              <span style={{ fontSize: 12, color: '#888' }}>
                <strong style={{ color: '#e8e4dc', fontWeight: 500 }}>{item.label}</strong> {item.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button type="button"
        onClick={() => void handleSubmit()}
        disabled={saving}
        style={{
          width: '100%', padding: 14, background: '#e8e4dc',
          border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 500, color: '#0f0f0f', cursor: 'pointer',
          fontFamily: 'inherit', opacity: saving ? 0.5 : 1,
        }}>
        {saving ? 'saving...' : intention.trim() ? 'start executing →' : 'skip →'}
      </button>

    </div>
  )
}
