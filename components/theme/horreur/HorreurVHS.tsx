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
        fontSize: 14,
        color: 'var(--ink3)',
      }}>
        Rembobinage…
      </div>
    )
  }

  return (
    <>
      <div className={styles.vhsLine} />
      <div className={styles.vhsLine} />
      <div className={styles.vhsLine} />
    </>
  )
}
