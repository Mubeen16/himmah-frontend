'use client'

import { useEffect, useState } from 'react'

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase()
}

export default function TimePill() {
  // Avoid SSR/client clock mismatch (server TZ ≠ browser): render only after mount.
  const [timeText, setTimeText] = useState('')

  useEffect(() => {
    const tick = () => setTimeText(formatTime(new Date()))
    tick()
    const timer = window.setInterval(tick, 1000 * 30)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <span
      style={{
        fontSize: 'var(--fs-meta)',
        color: 'var(--text-secondary)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '3px 10px',
        fontWeight: 400,
      }}
    >
      {timeText || '–:––'}
    </span>
  )
}
