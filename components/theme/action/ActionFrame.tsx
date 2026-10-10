'use client'

import { useCallback, useRef } from 'react'
import styles from './action-frame.module.css'

interface FreqData {
  weekNum: number | null
  lastEvent: string | null
  lastEventTime: string | null
  activePlayers: number
  totalPlayers: number
}

interface ActionFrameProps {
  playerLevel: number | null
  weekNum: number | null
  freqData?: FreqData | null
}

export default function ActionFrame({ playerLevel, weekNum, freqData }: ActionFrameProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const touchCountRef = useRef(0)
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRailTouch = useCallback(() => {
    touchCountRef.current++
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    touchTimerRef.current = setTimeout(() => { touchCountRef.current = 0 }, 3000)

    if (touchCountRef.current >= 5) {
      touchCountRef.current = 0
      window.dispatchEvent(new CustomEvent('action:nakatomi-secours'))
    }
  }, [])

  const floors = []
  for (let f = 12; f >= 1; f--) {
    const isActive = playerLevel !== null && f === Math.min(playerLevel, 12)
    floors.push(
      <div
        key={f}
        className={`${styles.railFloor} ${isActive ? styles.railFloorActive : ''}`}
      >
        {isActive ? '▸' : ' '}{String(f).padStart(2, '0')}
      </div>
    )
  }

  return (
    <>
      <div className={styles.haze} />
      <div className={styles.streaks} />
      <div className={styles.grit} />

      <div
        ref={railRef}
        className={`${styles.rail} ${playerLevel !== null ? styles.railInteractive : ''}`}
        onClick={playerLevel !== null ? handleRailTouch : undefined}
      >
        {floors}
        <div className={styles.railLabel}>ÉTAGE</div>
      </div>

      {freqData && (
        <div className={styles.freqBand}>
          <span className={styles.freqLabel}>
            <span className={styles.freqDot} />
            FRÉQUENCE {String(freqData.weekNum ?? 0).padStart(2, '0')}
          </span>
          {freqData.lastEvent && (
            <span className={styles.freqEvent}>
              {freqData.lastEventTime && (
                <span className={styles.freqEventTime}>{freqData.lastEventTime} </span>
              )}
              {freqData.lastEvent}
            </span>
          )}
          <span className={styles.freqRight}>
            {freqData.activePlayers} / {freqData.totalPlayers} EN POSITION
          </span>
        </div>
      )}
    </>
  )
}
