import styles from './Tag.module.css'

interface TagProps {
  children: React.ReactNode
  color?: 'accent' | 'ok' | 'warn' | 'bad' | 'info'
  className?: string
}

export default function Tag({ children, color = 'accent', className }: TagProps) {
  return (
    <span className={`${styles.tag} ${styles[color]} ${className ?? ''}`}>
      {children}
    </span>
  )
}
