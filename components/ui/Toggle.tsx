'use client'

import { useId } from 'react'
import styles from './Toggle.module.css'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export default function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  const id = useId()
  return (
    <label htmlFor={id} className={styles.wrap}>
      <input
        id={id}
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  )
}
