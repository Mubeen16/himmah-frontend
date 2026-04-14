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
  const [timeText, setTimeText] = useState<string>(() => formatTime(new Date()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeText(formatTime(new Date()))
    }, 1000 * 30)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <span
      style={{
        fontSize: 'var(--fs-meta)',
        color: 'var(--text-muted)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '3px 10px',
        fontWeight: 400,
      }}
    >
      {timeText}
    </span>
  )
}
