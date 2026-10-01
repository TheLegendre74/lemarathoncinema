'use client'

import { useId } from 'react'
import styles from './Field.module.css'

interface FieldProps {
  label: string
  help?: string
  error?: string
  children?: React.ReactNode
  type?: 'input' | 'textarea' | 'select'
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>
  selectProps?: React.SelectHTMLAttributes<HTMLSelectElement>
  selectOptions?: { value: string; label: string }[]
}

export default function Field({ label, help, error, children, type = 'input', inputProps, textareaProps, selectProps, selectOptions }: FieldProps) {
  const id = useId()

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {children ?? (
        type === 'textarea' ? (
          <textarea id={id} className={`${styles.control} ${error ? styles.errorControl : ''}`} {...textareaProps} />
        ) : type === 'select' ? (
          <select id={id} className={`${styles.control} ${error ? styles.errorControl : ''}`} {...selectProps}>
            {selectOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input id={id} className={`${styles.control} ${error ? styles.errorControl : ''}`} {...inputProps} />
        )
      )}
      {help && !error && <p className={styles.help}>{help}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
