'use client'

import { useTheme } from '../ThemeProvider'

interface ComedieSouffleurProps {
  message?: string
}

export default function ComedieSouffleur({ message }: ComedieSouffleurProps) {
  const { key } = useTheme()

  if (key !== 'comedie') return null

  return (
    <div className="comedie-souffleur" aria-label="Le souffleur">
      <svg
        className="comedie-souffleur-head"
        width="60"
        height="40"
        viewBox="0 0 60 40"
        aria-hidden="true"
      >
        <ellipse cx="30" cy="30" rx="18" ry="20" fill="var(--ink-ghost)" />
        <ellipse cx="24" cy="24" rx="2" ry="3" fill="var(--bg)" />
        <ellipse cx="36" cy="24" rx="2" ry="3" fill="var(--bg)" />
      </svg>
      <p className="comedie-souffleur-text">
        {message || "… j’ai un trou."}
      </p>
    </div>
  )
}
