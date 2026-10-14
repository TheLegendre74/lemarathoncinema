'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import s from './horreur-porte.module.css'

interface WeekFilm {
  id: number
  titre: string
  realisateur?: string
  annee?: number
  poster: string | null
  synopsis?: string
}

interface DuelInfo {
  film1: string
  film2: string
  votes1: number
  votes2: number
  closesLabel: string
  totalVoters: number
}

interface ClosedDuel {
  winner: string
  closedDay: string
  v1: number
  v2: number
  expWin: number
}

interface NightRow {
  label: string
  value: string
  detail?: string
  current?: boolean
}

interface TraceItem {
  time: string
  text: string
  highlight?: string
  amount?: string
}

interface SurvivorItem {
  rank: number
  pseudo: string
  exp: number
  isSelf?: boolean
}

interface Props {
  weekFilm: WeekFilm | null
  weekLabel: string | null
  watchedBySeason: number
  seasonPlayers: number
  expFilm: number
  duel: DuelInfo | null
  closedDuel: ClosedDuel | null
  nights: NightRow[]
  traces: TraceItem[]
  survivors: SurvivorItem[]
  playerLevel: number
  playerExp: number
  playerRole: string | null
  playerNextRole: string | null
  playerExpToNext: number
  playerWatched: number
  news: { title: string; content: string; pinned?: boolean }[]
  porteSousTitre: string
  duelRegle: string
}

export default function HorreurHomeHero({
  weekFilm, weekLabel,
  watchedBySeason, seasonPlayers, expFilm,
  duel, closedDuel, nights,
  traces, survivors,
  playerLevel, playerExp, playerRole, playerNextRole, playerExpToNext, playerWatched,
  news, porteSousTitre, duelRegle,
}: Props) {
  const router = useRouter()
  const battantRef = useRef<HTMLButtonElement>(null)
  const [opening, setOpening] = useState(false)
  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleDoor = useCallback(() => {
    if (!weekFilm) return
    if (reduced) {
      router.push(`/films?fiche=${weekFilm.id}`)
      return
    }
    setOpening(true)
    setTimeout(() => {
      router.push(`/films?fiche=${weekFilm.id}`)
    }, 600)
  }, [weekFilm, reduced, router])

  const nextLevelExp = playerLevel * 100
  const pctExp = Math.min(100, Math.round((playerExp / nextLevelExp) * 100))

  return (
    <div data-ecran="accueil">
      {/* ── Hero: porte + infos ── */}
      <div className={s.hero}>
        {/* Colonne gauche */}
        <div className={s.une}>
          <div className={s.nuit}>
            {weekLabel ? (
              <span className={s.nuitLueur}>{weekLabel}</span>
            ) : (
              'LA PORTE'
            )}
          </div>

          {weekFilm ? (
            <>
              <div className={s.titre}>{weekFilm.titre}</div>
              {(weekFilm.realisateur || weekFilm.annee) && (
                <div className={s.realisateur}>
                  {[weekFilm.realisateur, weekFilm.annee].filter(Boolean).join(' · ')}
                </div>
              )}
              <div className={s.compteur}>
                {watchedBySeason} SUR {seasonPlayers} L&apos;ONT DÉJÀ RAYÉ
              </div>
              {weekFilm.synopsis && (
                <div className={s.synopsis}>{weekFilm.synopsis}</div>
              )}
              <div className={s.actions}>
                <button
                  className="btn-primary"
                  onClick={handleDoor}
                >
                  Rayer +{expFilm} EXP
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => router.push(`/films?fiche=${weekFilm.id}`)}
                >
                  Lire la jaquette
                </button>
              </div>
              <div className={s.sousTitre}>{porteSousTitre}</div>
            </>
          ) : (
            <div className={s.titre}>Personne n&apos;a frappé cette semaine.</div>
          )}
        </div>

        {/* La porte */}
        <div className={s.porche}>
          <div className={s.mur} />
          <div className={s.cone} />
          <div className={s.douille} />
          <div className={s.ampoule} />
          <div className={s.cadre} />
          {weekFilm ? (
            <button
              ref={battantRef}
              className={s.battant}
              aria-label={`Ouvrir la jaquette : ${weekFilm.titre}`}
              onClick={handleDoor}
              style={opening ? {
                transformOrigin: 'left center',
                transform: 'perspective(600px) rotateY(-12deg)',
                transition: 'transform 0.6s ease',
              } : undefined}
            >
              <div className={s.panneauA} />
              <div className={s.panneauB} />
              <div className={s.panneauC} />
              <div className={s.panneauD} />
              <div className={s.poignee} />
              <div className={s.serrure} />
            </button>
          ) : (
            <div className={s.battant} aria-hidden="true">
              <div className={s.panneauA} />
              <div className={s.panneauB} />
              <div className={s.panneauC} />
              <div className={s.panneauD} />
              <div className={s.poignee} />
              <div className={s.serrure} />
            </div>
          )}
          <div className={s.fente} />
          <div className={s.flaque} />
          <div className={s.m1} />
          <div className={s.m2} />
          <div className={s.m3} />
        </div>

        {/* Colonne droite */}
        <div className={s.cote}>
          {/* Les deux portes */}
          <div className={s.sectionLabel}>LES DEUX PORTES</div>
          {duel ? (
            <>
              <div className={s.nr}>
                <span>{duel.film1}</span>
                <b>{duel.votes1}</b>
                <i>{duel.votes1 === 1 ? 'VOIX' : 'VOIX'}</i>
              </div>
              <div className={s.nr}>
                <span>{duel.film2}</span>
                <b>{duel.votes2}</b>
                <i>{duel.closesLabel}</i>
              </div>
              <div style={{ fontFamily: 'var(--f-body)', fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic', marginTop: 4 }}>
                {duelRegle}
              </div>
            </>
          ) : closedDuel ? (
            <div style={{ fontFamily: 'var(--f-body)', fontSize: 12, color: 'var(--ink2)', marginTop: 4, lineHeight: 1.5 }}>
              {closedDuel.closedDay}, une seule porte est restée éclairée : <em style={{ color: 'var(--ink)' }}>{closedDuel.winner}</em>.
              <br />
              <span style={{ fontFamily: 'var(--f-data)', fontSize: 9.5, letterSpacing: '.14em', color: 'var(--ink3)' }}>
                {closedDuel.v1} VOIX CONTRE {closedDuel.v2} · +{closedDuel.expWin} EXP
              </span>
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--f-body)', fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
              Aucun duel en cours.
            </div>
          )}

          {/* Les sept nuits */}
          <div className={s.sectionLabel}>LES SEPT NUITS</div>
          {nights.map((n, i) => (
            <div key={i} className={`${s.nr} ${n.current ? s.nrOn : ''}`}>
              <span>{n.label}</span>
              <b>{n.value}</b>
              {n.detail && <i>{n.detail}</i>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bas : 4 colonnes ── */}
      <div className={s.bas}>
        {/* Les dernières traces */}
        <div>
          <div className={s.sectionLabel}>LES DERNIÈRES TRACES</div>
          {traces.length === 0 ? (
            <div className={s.tr}>Aucune trace récente.</div>
          ) : traces.map((t, i) => (
            <div key={i} className={s.tr}>
              <span>{t.time}</span>
              {t.highlight ? (
                <><em>{t.highlight}</em> {t.text}</>
              ) : t.text}
              {t.amount && <span style={{ float: 'right', color: 'var(--accent)' }}>{t.amount}</span>}
            </div>
          ))}
        </div>

        {/* Les survivants */}
        <div>
          <div className={s.sectionLabel}>LES SURVIVANTS</div>
          {survivors.map((sv) => (
            <div key={sv.rank} className={`${s.sv} ${sv.isSelf ? s.svMoi : ''}`}>
              <span>{sv.rank}</span>
              <b>{sv.pseudo}</b>
              <i>{sv.exp} EXP</i>
            </div>
          ))}
          <Link href="/classement" style={{ fontFamily: 'var(--f-data)', fontSize: 9, color: 'var(--ink3)', letterSpacing: '.14em', marginTop: 6, display: 'block' }}>
            VOIR TOUT LE CLASSEMENT
          </Link>
        </div>

        {/* Ta nuit */}
        <div>
          <div className={s.sectionLabel}>
            TA NUIT · {playerWatched} VICTIMES · NIVEAU {String(playerLevel).padStart(2, '0')}
          </div>
          {playerRole && (
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 'var(--disp-weight)' as any, fontSize: 15, color: 'var(--accent)', fontStyle: 'italic', marginBottom: 8 }}>
              {playerRole}
            </div>
          )}
          <div style={{ height: 4, background: 'var(--line)', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${pctExp}%`, background: 'var(--accent)', transition: 'width .6s ease' }} />
          </div>
          <div style={{ fontFamily: 'var(--f-data)', fontSize: 9.5, color: 'var(--ink3)', letterSpacing: '.14em' }}>
            {playerExp} / {nextLevelExp} EXP
          </div>
          {playerNextRole && (
            <div style={{ fontFamily: 'var(--f-data)', fontSize: 9.5, color: 'var(--ink3)', marginTop: 4 }}>
              {playerExpToNext} AVANT « {playerNextRole} »
            </div>
          )}
        </div>

        {/* Le journal */}
        <div>
          <div className={s.sectionLabel}>LE JOURNAL</div>
          {news.length === 0 ? (
            <div className={s.nw}>Aucune annonce.</div>
          ) : news.map((n, i) => (
            <div key={i} className={s.nw}>
              {n.pinned && <b style={{ color: 'var(--accent)', fontSize: 9, letterSpacing: '.14em', marginRight: 6 }}>ÉPINGLÉ</b>}
              {n.title}
              {n.content && <div style={{ marginTop: 2, fontSize: 11, color: 'var(--ink3)' }}>{n.content}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Règles ── */}
      <div className={s.regles}>
        <span>LES RÈGLES POUR SURVIVRE</span>
        <b>FILM +{expFilm} EXP</b>
        <Link href="/regles" style={{ color: 'var(--ink3)', textDecoration: 'underline' }}>
          Lire toutes les règles
        </Link>
      </div>
    </div>
  )
}
