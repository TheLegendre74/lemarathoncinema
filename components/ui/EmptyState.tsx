import styles from './EmptyState.module.css'

interface EmptyStateProps {
  text: string
  icon?: string
}

export default function EmptyState({ text, icon }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <p className={styles.text}>{text}</p>
    </div>
  )
}
