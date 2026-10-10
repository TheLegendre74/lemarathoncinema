'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Poster from '@/components/Poster'
import { comedieTheme } from '@/lib/themes/comedie'
import s from './comedie-home.module.css'

interface ComedieHomeHeroProps {
  weekFilm: {
    id: number
    titre: string
    realisateur: string
    annee: number
    genre: string
    poster: string | null
    synopsis: string | null
  }
  fdlsJour: string
  fdlsHeure: string
  seanceJour: string
  seanceHeure: string
  activePlayers: number
  seasonPlayers: number
  level: number
  exp: number
  nextLevelExp: number
  duel: { film1: string; film2: string; closes: string } | null
  watchlistCount: number
  activity: Array<{ time: string; text: string; amount?: string }>
  citation: string
  expFilm: number
}

const EMPLOIS = comedieTheme.levels ?? []

export default function ComedieHomeHero({
  weekFilm,
  fdlsJour,
  fdlsHeure,
  seanceJour,
  seanceHeure,
  activePlayers,
  seasonPlayers,
  level,
  exp,
  nextLevelExp,
  activity,
  citation,
  expFilm,
}: ComedieHomeHeroProps) {
  const emploi = useMemo(() => {
    return EMPLOIS[level - 1] ?? EMPLOIS[EMPLOIS.length - 1]
  }, [level])

  const nextEmploi = useMemo(() => {
    return EMPLOIS[level] ?? EMPLOIS[EMPLOIS.length - 1]
  }, [level])

  const gaugePct = nextLevelExp > 0 ? Math.min(100, (exp / nextLevelExp) * 100) : 100

  return (
    <div className={s.hero}>
      <div className={s.heroContent}>
        <div className={s.heroMain}>
          {weekFilm.poster && (
            <div className={s.posterWrap}>
              <Poster film={{ id: weekFilm.id, titre: weekFilm.titre, poster: weekFilm.poster }} width={200} height={300} />
              <div className={s.posterRibbon}>{`À l’affiche`}</div>
            </div>
          )}
          <p className={s.citation}>{citation}</p>

          <div className={s.seanceLine}>
            {`CE ${fdlsJour.toUpperCase()}, ${fdlsHeure} — NE SOYEZ PAS EN RETARD`}
          </div>
          <h1 className={s.heroTitle}>{weekFilm.titre}</h1>
          <div className={s.heroMeta}>
            {`DE ${weekFilm.realisateur} · ${weekFilm.annee}`}
          </div>
          <div className={s.heroCount}>
            {`${activePlayers} COMÉDIENS SUR ${seasonPlayers} ONT DÉJÀ APPLAUDI`}
          </div>
          {weekFilm.synopsis && (
            <p className={s.synopsis}>{weekFilm.synopsis}</p>
          )}

          <div className={s.heroBtns}>
            <button className={s.btnTicket} type="button">
              APPLAUDIR
              <span className={s.btnStub}>+{expFilm}</span>
            </button>
            <Link href={`/films?fiche=${weekFilm.id}`} className={s.btnOutline}>
              LIRE LE PROGRAMME
            </Link>
          </div>
        </div>

        <div className={s.heroSidebar}>
          <div className={s.sideSection}>
            <div className={s.sideTitle}>{`Les représentations`}</div>
            <div className={s.actLine}>
              <span className={s.actText}>{`VEN. ${fdlsHeure} — À l’affiche`}</span>
            </div>
            <div className={s.actLine}>
              <span className={s.actText}>{`MER. ${seanceHeure} — L’applaudimètre`}</span>
            </div>
            <div className={s.actLine}>
              <span className={s.actText}>{`MATINÉE → Le répertoire`}</span>
            </div>
          </div>

          <div className={s.sideSection}>
            <div className={s.sideTitle}>
              {`Rappels — Emploi ${String(level).padStart(2, '0')}`}
            </div>
            <div className={s.gauge}>
              <div className={s.gaugeFill} style={{ width: `${gaugePct}%` }} />
            </div>
            <div className={s.gaugeMeta}>
              {`${emploi} → ${nextEmploi}`}
            </div>
          </div>

          <div className={s.sideSection}>
            <div className={s.sideTitle}>{`Le cahier de régie`}</div>
            {activity.slice(0, 5).map((a, i) => (
              <div key={i} className={s.actLine}>
                <span className={s.actTime}>{a.time}</span>
                <span className={s.actText}>{a.text}</span>
                {a.amount && <span className={s.actAmount}>{a.amount}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
