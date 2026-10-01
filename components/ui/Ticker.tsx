import styles from './Ticker.module.css'

interface TickerProps {
  label: string
  value: string | number
}

export default function Ticker({ label, value }: TickerProps) {
  return (
    <div className={styles.ticker}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
