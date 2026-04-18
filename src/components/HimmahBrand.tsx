function HimmahWordmarkSvg({ w = 80, h = 20, decorative }: { w?: number; h?: number; decorative?: boolean }) {
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 80 20"
      overflow="visible"
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : 'Himmah'}
      role={decorative ? undefined : 'img'}
    >
      <text
        x="0"
        y="16"
        fontSize="18"
        fontWeight="300"
        fill="currentColor"
        letterSpacing="-0.085em"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        Himmah
      </text>
      <circle cx="36" cy="3" r="3.5" fill="#5DCAA5" />
    </svg>
  )
}

export type HimmahBrandProps = {
  className?: string
  /** `rail` = wordmark only (e.g. desktop sidebar when expanded); default includes tagline */
  variant?: 'full' | 'rail'
}

/**
 * Global wordmark + tagline (Shell, gate, auth). Use `variant="rail"` for desktop rail when open.
 */
export default function HimmahBrand({ className, variant = 'full' }: HimmahBrandProps) {
  if (variant === 'rail') {
    return (
      <div className={['hm-rail-wordmark', className].filter(Boolean).join(' ')} aria-hidden="true">
        <span className="hm-shell-brand hm-shell-brandLogo">
          <HimmahWordmarkSvg w={72} h={18} decorative />
        </span>
      </div>
    )
  }

  return (
    <div className={['hm-shell-brandBlock', className].filter(Boolean).join(' ')}>
      <span className="hm-shell-brand hm-shell-brandLogo">
        <HimmahWordmarkSvg />
      </span>
      <div className="hm-shell-tagline">commitment engine</div>
    </div>
  )
}
