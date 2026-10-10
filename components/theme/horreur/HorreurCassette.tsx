'use client'

interface Props {
  message?: string
}

export default function HorreurCassette({ message }: Props) {
  return (
    <div className="horreur-cassette">
      <svg width="56" height="36" viewBox="0 0 56 36" aria-hidden="true">
        <rect x="0" y="0" width="56" height="36" rx="2" fill="var(--s2)" stroke="var(--line2)" strokeWidth="1" />
        <rect x="4" y="4" width="20" height="20" rx="10" fill="none" stroke="var(--ink3)" strokeWidth="0.8" />
        <rect x="32" y="4" width="20" height="20" rx="10" fill="none" stroke="var(--ink3)" strokeWidth="0.8" />
        <circle cx="14" cy="14" r="3" fill="var(--ink3)" opacity="0.4" />
        <circle cx="42" cy="14" r="3" fill="var(--ink3)" opacity="0.4" />
        <rect x="8" y="28" width="40" height="5" rx="1" fill="var(--s3)" />
      </svg>
      <span className="horreur-cassette-text">
        {message ?? 'Personne. Pour l’instant.'}
      </span>
    </div>
  )
}
