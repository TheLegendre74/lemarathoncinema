'use client'

import s from './horreur-marathoniens.module.css'

const ROLES = [
  'La première victime',
  'Celui qui dit « je reviens »',
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
}

export default function HorreurMarathoniens({ players, saisonNum }: Props) {
  const now = new Date()
  const mois = now.toLocaleDateString('fr-FR', { month: 'long' })
  const annee = now.getFullYear()

  return (
    <div className={s.wrap} data-ecran="marathoniens">
      <div className={s.header}>
        SAISON {saisonNum} · {players.length} INSCRITS · PHOTO DE GROUPE, {mois.toUpperCase()} {annee}
      </div>

      <div className={s.grid}>
        {players.map((p) => {
          const level = Math.floor((p.exp ?? 0) / 100) + 1
          const role = ROLES[level - 1] ?? ROLES[ROLES.length - 1]
          return (
            <div key={p.id} className={s.portrait}>
              {p.avatar_url ? (
                <div className={s.oval}>
                  <img src={p.avatar_url} alt="" loading="lazy" decoding="async" />
                </div>
              ) : (
                <div className={s.ovalInitial}>
                  {(p.pseudo?.[0] ?? '?').toUpperCase()}
                </div>
              )}
              <div className={s.name}>{p.pseudo}</div>
              <div className={s.role}>{role}</div>
              <div className={s.expLabel}>{p.exp} EXP</div>
            </div>
          )
        })}

        {/* La place vide — une de plus que de joueurs */}
        <div className={s.empty} aria-hidden="true">
          <div className={s.emptyOval} />
        </div>
      </div>

      <div className={s.pied}>
        On a compté {players.length}. Sur la photo, il y a {players.length + 1} places.
      </div>
    </div>
  )
}
