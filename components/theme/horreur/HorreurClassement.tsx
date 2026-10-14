'use client'

import s from './horreur-classement.module.css'

const ROLES = [
  'La première victime',
  'Celui qui dit « je reviens tout de suite »',
  'Celui qui descend à la cave',
  'Celui qui se sépare du groupe',
  'Le sceptique',
  'Celui qui a entendu un bruit',
  'Le témoin',
  'Celui qui a lu le livre',
  'Le prêtre',
  'Celui qui est revenu de la forêt',
  'Le dernier survivant',
  'La dernière fille',
]

interface Player {
  id: string
  pseudo: string
  exp: number
  avatar_url?: string | null
}

interface Props {
  players: Player[]
  saisonNum: number
  currentUserId: string | null
}

export default function HorreurClassement({ players, saisonNum, currentUserId }: Props) {
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const levelFromExp = (exp: number) => Math.floor((exp ?? 0) / 100) + 1
  const hasLevel12 = players.some(p => levelFromExp(p.exp) >= 12)

  return (
    <div className={s.wrap} data-ecran="classement">
      <div className={s.header}>
        SAISON {saisonNum} · CLASSEMENT DES JOUEURS
      </div>

      {!hasLevel12 && (
        <div className={s.n12}>
          NIVEAU 12 · LA DERNIÈRE FILLE — <em>Personne. Pour l&apos;instant.</em>
        </div>
      )}

      {players.map((p, i) => {
        const level = levelFromExp(p.exp)
        const role = ROLES[level - 1] ?? ROLES[ROLES.length - 1]
        const nextLevelExp = level * 100
        const pct = Math.min(100, Math.round((p.exp / nextLevelExp) * 100))
        const isSelf = p.id === currentUserId

        return (
          <div key={p.id} className={isSelf ? s.self : s.row}>
            <span className={s.rank}>{i + 1}</span>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className={s.avatar} />
            ) : (
              <span className={s.initial}>{(p.pseudo?.[0] ?? '?').toUpperCase()}</span>
            )}
            <div className={s.info}>
              <span className={s.pseudo}>{p.pseudo}</span>
              <span className={s.role}>{pad2(level)} · {role}</span>
            </div>
            <div className={s.gauge}>
              <div className={s.gaugeFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={s.exp}>{p.exp} EXP</span>
          </div>
        )
      })}
    </div>
  )
}
