'use client'

import styles from './comedie-frame.module.css'

interface ComedieFrameProps {
  playerLevel: number | null
  isHomePage?: boolean
}

export default function ComedieFrame({ isHomePage }: ComedieFrameProps) {
  const bulbs = Array.from({ length: 14 }, (_, i) => i)

  return (
    <>
      <div className={styles.curtainLeft} />
      <div className={styles.curtainRight} />
      <div className={styles.valance}>
        <div className={styles.valanceScallop} />
      </div>
      <div className={styles.fronton}>
        {bulbs.map(i => (
          <span key={`fb${i}`} className={styles.bulb} />
        ))}
        <span className={styles.frontonName}>Ciné Marathon</span>
        {bulbs.map(i => (
          <span key={`fa${i}`} className={styles.bulb} />
        ))}
      </div>
    </>
  )
}
