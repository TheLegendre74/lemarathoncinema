'use client'

import styles from './horreur-frame.module.css'

export default function HorreurVHS() {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 16px',
        fontFamily: 'var(--f-data)',
        fontSize: 12,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: 'var(--ink3)',
      }}>
        ▶▶ Rembobinage
      </div>
    )
  }

  return (
    <div
      aria-label="Rembobinage…"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '32px 16px',
      }}
    >
      <div className={styles.vhsLine} />
      <div className={styles.vhsLine} />
      <div className={styles.vhsLine} />
      <span style={{
        fontFamily: 'var(--f-data)',
        fontSize: 10,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: 'var(--ink3)',
        marginTop: 8,
      }}>
        ▶▶ Rembobinage
      </span>
    </div>
  )
}
