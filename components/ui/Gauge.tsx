'use client'

import styles from './Gauge.module.css'

interface GaugeProps {
  value: number
  max: number
  label?: string
  color?: 'accent' | 'ok' | 'warn' | 'bad'
}

export default function Gauge({ value, max, label, color = 'accent' }: GaugeProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={styles.wrap}>
      {label && (
        <div className={styles.head}>
          <span className={styles.label}>{label}</span>
          <span className={styles.nums}>{value} / {max}</span>
        </div>
      )}
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${styles[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
