import styles from './StatRow.module.css'

interface StatRowProps {
  label: string
  value: string | number
  color?: 'accent' | 'ok' | 'bad' | 'info'
}

export default function StatRow({ label, value, color }: StatRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${color ? styles[color] : ''}`}>{value}</span>
    </div>
  )
}
