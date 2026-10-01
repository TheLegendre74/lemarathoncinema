'use client'

import { useState, useEffect } from 'react'
import styles from './CountdownDisplay.module.css'

interface CountdownDisplayProps {
  target: Date | string
  label?: string
  onComplete?: () => void
}

export default function CountdownDisplay({ target, label, onComplete }: CountdownDisplayProps) {
  const targetDate = typeof target === 'string' ? new Date(target) : target

  const calc = () => {
    const diff = Math.max(0, targetDate.getTime() - Date.now())
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: diff <= 0,
    }
  }

  const [time, setTime] = useState(calc)

  useEffect(() => {
    const id = setInterval(() => {
      const t = calc()
      setTime(t)
      if (t.done) {
        clearInterval(id)
        onComplete?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [targetDate.getTime()])

  if (time.done) return null

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.units}>
        {time.days > 0 && <Unit value={time.days} label="j" />}
        <Unit value={time.hours} label="h" />
        <Unit value={time.minutes} label="min" />
        <Unit value={time.seconds} label="s" />
      </div>
    </div>
  )
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span className={styles.unit}>
      <span className={styles.num}>{String(value).padStart(2, '0')}</span>
      <span className={styles.unitLabel}>{label}</span>
    </span>
  )
}
