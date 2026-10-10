'use client'

import { usePathname } from 'next/navigation'
import styles from './western-frame.module.css'

const HORIZON_ROUTES = ['/', '/duels', '/auth']

export default function WesternFrame() {
  const pathname = usePathname()
  const showHorizon = HORIZON_ROUTES.some(r => pathname === r)

  if (showHorizon) {
    return (
      <div className={styles.horizon}>
        <div className={styles.sky}>
          <div className={styles.sun} />
          <div className={styles.mesa} />
          <div className={styles.mesa} />
        </div>
        <div className={styles.horizonLine} />
        <div className={styles.earth} />
        <div className={styles.wind} />
      </div>
    )
  }

  return <div className={styles.planches} />
}
