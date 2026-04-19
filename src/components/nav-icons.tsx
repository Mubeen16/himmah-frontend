import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const S = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Today — clipboard + check (daily commitments; distinct from plan calendar & theme sun icons) */
export function NavIconToday(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...S} />
      <path d="M15 2H9a1 1 0 0 0-1 1v2h8V3a1 1 0 0 0-1-1z" {...S} />
      <path d="m9 12 2 2 4-4" {...S} />
      <path d="M8 17h8" {...S} />
    </svg>
  )
}

/** Plan — calendar */
export function NavIconPlan(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" {...S} />
      <path d="M16 2v4M8 2v4M3 10h18" {...S} />
    </svg>
  )
}

/** Review — notebook */
export function NavIconReview(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" {...S} />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...S} />
      <path d="M8 7h8M8 11h6" {...S} />
    </svg>
  )
}

/** Gate — new idea, important but not now (lightbulb + later clock) */
export function NavIconGate(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden {...props}>
      <path
        d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
        {...S}
      />
      <path d="M9 18h6" {...S} />
      <path d="M10 22h4" {...S} />
      <circle cx="18.5" cy="6.5" r="2.75" {...S} />
      <path d="M18.5 8.25V6.5L20 5" {...S} />
    </svg>
  )
}

/** Goals — target */
export function NavIconGoals(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden {...props}>
      <circle cx="12" cy="12" r="10" {...S} />
      <circle cx="12" cy="12" r="6" {...S} />
      <circle cx="12" cy="12" r="2" {...S} />
    </svg>
  )
}

/** Settings — gear */
export function NavIconSettings(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden {...props}>
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        {...S}
      />
      <circle cx="12" cy="12" r="3" {...S} />
    </svg>
  )
}

export function NavIconChevronLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden {...props}>
      <path d="m15 18-6-6 6-6" {...S} />
    </svg>
  )
}

export function NavIconChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden {...props}>
      <path d="m9 18 6-6-6-6" {...S} />
    </svg>
  )
}
