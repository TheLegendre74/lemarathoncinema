'use client'

import { useTheme } from '../ThemeProvider'
import styles from './action-frame.module.css'

export default function PosterGrade() {
  const { key } = useTheme()
  if (key !== 'action') return null
  return <div className={styles.posterGrade} />
}
