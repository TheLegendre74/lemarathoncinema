'use client'

import s from './horreur-duels.module.css'

interface Duel {
  film1: { titre: string; realisateur?: string; annee?: number }
  film2: { titre: string; realisateur?: string; annee?: number }
  votes1: number
  votes2: number
  closesAt: string | null
  closed: boolean
  winnerTitle: string | null
  closedDay: string | null
  expWin: number
}

interface Props {
  duel: Duel | null
  seasonPlayers: number
  hasVoted: boolean
  onVote?: (filmChoice: 1 | 2) => void
  expVote: number
}

export default function HorreurDuelsHero({ duel, seasonPlayers, hasVoted, onVote, expVote }: Props) {
  if (!duel) {
    return <div className={s.noDuel}>Aucun duel en cours. Les portes sont fermées.</div>
  }

  const total = duel.votes1 + duel.votes2
  const pct1 = total > 0 ? duel.votes1 / total : 0.5
  const pct2 = total > 0 ? duel.votes2 / total : 0.5

  const lightIntensity = (pct: number) => {
    const base = 0.15
    const intensity = base + pct * 0.7
    return {
      background: `rgba(255,227,174,${intensity})`,
      boxShadow: `0 0 ${12 + pct * 40}px ${3 + pct * 15}px rgba(255,210,140,${intensity * 0.8})`,
      width: `${40 + pct * 60}%`,
      margin: '0 auto',
    }
  }

  if (duel.closed && duel.winnerTitle) {
    return (
      <div data-ecran="duels">
        <div className={s.header}>
          {duel.votes1 + duel.votes2} VOIX SUR {seasonPlayers}
        </div>
        <div className={s.couloir}>
          <div className={s.dp}>
            <div className={s.porteLabel}>
              <b>{duel.film1.titre}</b>
              <span>{duel.votes1} VOIX</span>
            </div>
            <div className={s.frame}>
              <div className={s.door}>
                <div className={s.pnA} />
                <div className={s.pnB} />
                <div className={s.pnC} />
                <div className={s.pnD} />
              </div>
              <div className={s.doorLight} style={
                duel.winnerTitle === duel.film1.titre ? lightIntensity(1) : { background: 'transparent' }
              } />
            </div>
          </div>
          <div className={s.vs}>VS</div>
          <div className={s.dp}>
            <div className={s.porteLabel}>
              <b>{duel.film2.titre}</b>
              <span>{duel.votes2} VOIX</span>
            </div>
            <div className={s.frame}>
              <div className={s.door}>
                <div className={s.pnA} />
                <div className={s.pnB} />
                <div className={s.pnC} />
                <div className={s.pnD} />
              </div>
              <div className={s.doorLight} style={
                duel.winnerTitle === duel.film2.titre ? lightIntensity(1) : { background: 'transparent' }
              } />
            </div>
          </div>
        </div>
        <div className={s.result}>
          {duel.closedDay}, une seule porte est restée éclairée : <em>{duel.winnerTitle}</em>.
          <div className={s.expLine}>
            {duel.votes1} VOIX CONTRE {duel.votes2} · +{duel.expWin} EXP
          </div>
        </div>
      </div>
    )
  }

  const closesLabel = duel.closesAt
    ? (() => {
        const d = new Date(duel.closesAt)
        const day = d.toLocaleDateString('fr-FR', { weekday: 'long' })
        const hour = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        const ms = d.getTime() - Date.now()
        if (ms <= 0) return `CLÔTURE TERMINÉE`
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        return `CLÔTURE ${day.toUpperCase()} À ${hour} · DANS ${h} H ${String(m).padStart(2, '0')}`
      })()
    : ''

  return (
    <div data-ecran="duels">
      <div className={s.header}>
        {closesLabel} · {total} VOIX SUR {seasonPlayers}
      </div>
      <div className={s.regle}>Deux portes. Une seule restera éclairée.</div>

      <div className={s.couloir}>
        <div className={s.dp}>
          <div className={s.porteLabel}>
            <b>{duel.film1.titre}</b>
            <span>
              {[duel.film1.realisateur, duel.film1.annee].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className={s.frame}>
            <div className={s.door}>
              <div className={{s.pnA}} />
              <div className={{s.pnB}} />
              <div className={{s.pnC}} />
              <div className={{s.pnD}} />
            </div>
            <div className={s.doorLight} style={lightIntensity(pct1)} />
          </div>
          <div className={s.votes}>{duel.votes1} VOIX</div>
          {!hasVoted && onVote ? (
            <button className={s.voteBtn} onClick={() => onVote(1)}>
              Ouvrir cette porte +{expVote} EXP
            </button>
          ) : hasVoted ? (
            <div className={s.voteBtnDone}>Porte choisie</div>
          ) : null}
        </div>

        <div className={s.vs}>VS</div>

        <div className={s.dp}>
          <div className={s.porteLabel}>
            <b>{duel.film2.titre}</b>
            <span>
              {[duel.film2.realisateur, duel.film2.annee].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className={s.frame}>
            <div className={s.door}>
              <div className={{s.pnA}} />
              <div className={{s.pnB}} />
              <div className={{s.pnC}} />
              <div className={{s.pnD}} />
            </div>
            <div className={s.doorLight} style={lightIntensity(pct2)} />
          </div>
          <div className={s.votes}>{duel.votes2} VOIX</div>
          {!hasVoted && onVote ? (
            <button className={s.voteBtn} onClick={() => onVote(2)}>
              Ouvrir cette porte +{expVote} EXP
            </button>
          ) : hasVoted ? (
            <div className={s.voteBtnDone}>Porte choisie</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
