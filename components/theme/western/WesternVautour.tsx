'use client'

interface Props {
  message?: string
}

export default function WesternVautour({ message }: Props) {
  return (
    <div className="western-vautour">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="16" r="6" fill="var(--ink3)" opacity="0.4" />
        <ellipse cx="20" cy="28" rx="10" ry="6" fill="var(--ink3)" opacity="0.25" />
        <line x1="10" y1="18" x2="4" y2="10" stroke="var(--ink3)" strokeWidth="1.5" opacity="0.3" />
        <line x1="30" y1="18" x2="36" y2="10" stroke="var(--ink3)" strokeWidth="1.5" opacity="0.3" />
      </svg>
      <span className="western-vautour-text">
        {message ?? 'Rien à l’horizon.'}
      </span>
    </div>
  )
}
