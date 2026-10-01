import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: string
  height?: string
  rounded?: boolean
  className?: string
}

export default function Skeleton({ width = '100%', height = '16px', rounded, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{
        width,
        height,
        borderRadius: rounded ? '50%' : 'var(--radius)',
      }}
    />
  )
}
