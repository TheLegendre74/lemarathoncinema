'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import GlassCracks from './GlassCracks'
import styles from './action-home.module.css'

interface Props {
  weekFilm: {
    titre: string
    annee: number
    realisateur: string
    genre: string
    poster: string | null
    id: number
  } | null
  fdlsJour: string
  fdlsHeure: string
  seanceJour: string
  seanceHeure: string
  activePlayers: number
  seasonPlayers: number
  level: number
  exp: number
  nextLevelExp: number
  duel: { film1: string; film2: string; pctLead: number; daysLeft: number } | null
  watchlistCount: number
  activity: { time: string; text: string; amount?: string }[]
}

export default function ActionHomeHero({
  weekFilm,
  fdlsJour, fdlsHeure, seanceJour, seanceHeure,
  activePlayers, seasonPlayers,
  level, exp, nextLevelExp,
  duel, watchlistCount, activity,
}: Props) {
  const [countdown, setCountdown] = useState('')
  const pad2 = (n: number) => String(n).padStart(2, '0')

  useEffect(() => {
    function updateCountdown() {
      const now = new Date()
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      const fdlsDay = days.indexOf(fdlsJour)
      if (fdlsDay < 0) { setCountdown(''); return }

      const [h, m] = fdlsHeure.replace('h', ':').split(':').map(Number)
      const target = new Date(now)
      target.setHours(h || 20, m || 0, 0, 0)
      const diff = ((fdlsDay - now.getDay() + 7) % 7)
      target.setDate(target.getDate() + diff)
      if (target <= now) target.setDate(target.getDate() + 7)

      const ms = target.getTime() - now.getTime()
      if (ms <= 0) { setCountdown('00:00:00'); return }
      const totalSec = Math.floor(ms / 1000)
      const hrs = Math.floor(totalSec / 3600)
      const mins = Math.floor((totalSec % 3600) / 60)
      const secs = totalSec % 60
      setCountdown(`${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}`)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [fdlsJour, fdlsHeure])

  if (!weekFilm) return null

  const pctFilled = Math.min(((exp % 100) / 100) * 100, 100)

  return (
    <div className={styles.hero}>
      {weekFilm.poster && (
        <div className={styles.heroBg} style={{ backgroundImage: `url(${weekFilm.poster.replace('/w92/', '/w780/').replace('/w154/', '/w780/').replace('/w342/', '/w780/').replace('/w500/', '/w780/')})` }} />
      )}
      <GlassCracks />

      <div className={styles.heroContent}>
        <div className={styles.heroMain}>
          <div className={styles.mono}>
            HEURE H — {fdlsJour.toUpperCase()} {fdlsHeure} · FACE-À-FACE {seanceJour.toUpperCase()} {seanceHeure}
          </div>

          <h1 className={styles.heroTitle}>{weekFilm.titre}</h1>

          <div className={styles.mono}>
            {weekFilm.annee} · {weekFilm.realisateur} · {weekFilm.genre} · {activePlayers} / {seasonPlayers} EN POSITION
          </div>

          <div className={styles.heroBtns}>
            <Link href={`/films`} className={styles.btnPrimary}>
              <span className={styles.skewInner}>Encaisser</span>
            </Link>
            <Link href={`/films`} className={styles.btnOutline}>
              <span className={styles.skewInner}>Voir la fiche</span>
            </Link>
          </div>

          {countdown && (
            <div className={styles.chrono}>
              <span className={styles.chronoValue}>{countdown}</span>
              <span className={styles.chronoLabel}>AVANT L'HEURE H</span>
            </div>
          )}
        </div>

        <div className={styles.heroSidebar}>
          <div className={styles.sideSection}>
            <div className={styles.sideTitle}>JOURNAL RADIO</div>
            {activity.slice(0, 5).map((ev, i) => (
              <div key={i} className={styles.actLine}>
                <span className={styles.actTime}>{ev.time}</span>
                <span className={styles.actText}>{ev.text}</span>
                {ev.amount && <span className={styles.actAmount}>{ev.amount}</span>}
              </div>
            ))}
          </div>

          <div className={styles.sideSection}>
            <div className={styles.sideTitle}>ÉTAGE {pad2(Math.min(level, 12))}</div>
            <div className={styles.gauge}>
              <div className={styles.gaugeFill} style={{ width: `${pctFilled}%` }} />
            </div>
            <div className={styles.gaugeMeta}>{exp} / {nextLevelExp} EXP</div>
          </div>

          {duel && (
            <div className={styles.sideSection}>
              <div className={styles.sideTitle}>FACE-À-FACE</div>
              <div className={styles.duelLine}>
                J-{duel.daysLeft} · {duel.film1} vs {duel.film2}
              </div>
              {duel.pctLead > 0 && (
                <div className={styles.duelPct}>{duel.pctLead}% en tête</div>
              )}
            </div>
          )}

          {watchlistCount > 0 && (
            <div className={styles.sideSection}>
              <div className={styles.sideTitle}>REPÉRAGES — {watchlistCount} EN COURS</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
