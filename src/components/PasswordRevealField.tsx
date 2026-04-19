'use client'

import { useState } from 'react'

function EyeOpenSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function EyeOffSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-7.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.52 21.52 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export type PasswordRevealFieldProps = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  inputStyle: React.CSSProperties
  /** Color for the SVG toggle (e.g. var(--text-muted) or #888) */
  toggleColor?: string
}

export default function PasswordRevealField({
  value,
  onChange,
  onKeyDown,
  placeholder,
  inputStyle,
  toggleColor = 'var(--text-muted)',
}: PasswordRevealFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          width: '100%',
          paddingRight: '2.65rem',
          boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: 2,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
          border: 'none',
          background: 'transparent',
          color: toggleColor,
          cursor: 'pointer',
          borderRadius: 8,
        }}
      >
        {visible ? <EyeOffSvg /> : <EyeOpenSvg />}
      </button>
    </div>
  )
}
