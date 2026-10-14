'use client'

import s from './horreur-profil.module.css'

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

interface Badge {
  id: string
  label: string
  icon: string
  unlocked: boolean
}

interface Props {
  pseudo: string
  avatarUrl: string | null
  userId: string
  exp: number
  watchedCount: number
  ratingsCount: number
  votesCount: number
  bio: string | null
  badges: Badge[]
  createdAt: string | null
  lastWatchedTitle: string | null
  lastWatchedDate: string | null
  watchedHours: { matin: number; aprem: number; soir: number; nuit: number }
  bestRating: { titre: string; note: number } | null
}

function parisHourLabel(hours: Props['watchedHours']): string {
  const max = Math.max(hours.matin, hours.aprem, hours.soir, hours.nuit)
  if (max < 5) return 'pas encore assez de traces'
  if (hours.nuit === max) return 'après 22 h'
  if (hours.soir === max) return 'le soir'
  if (hours.aprem === max) return "l'après-midi"
  return 'le matin'
}

function daysSince(iso: string | null): string {
  if (!iso) return 'AUJOURD\'HUI'
  const created = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - created.getTime()) / 86400000)
  if (diff <= 0) return 'AUJOURD\'HUI'
  return `${diff} JOUR${diff > 1 ? 'S' : ''}`
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `le ${dd}.${mm} à ${hh}:${min}`
}

export default function HorreurProfil({
  pseudo, avatarUrl, userId, exp,
  watchedCount, ratingsCount, votesCount,
  bio, badges, createdAt, lastWatchedTitle, lastWatchedDate,
  watchedHours, bestRating,
}: Props) {
  const level = Math.floor((exp ?? 0) / 100) + 1
  const role = ROLES[level - 1] ?? ROLES[ROLES.length - 1]
  const nextExp = level * 100
  const pct = Math.min(100, Math.round((exp / nextExp) * 100))
  const nextRole = level < 12 ? ROLES[level] : null
  const shortId = userId.slice(0, 6).toUpperCase()

  return (
    <div className={s.wrap} data-ecran="profil">
      <div className={s.polaroid}>
        <div className={s.polaroidFrame}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={s.polaroidImg} />
          ) : (
            <div className={s.polaroidInitial}>
              {(pseudo?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <div className={s.polaroidCaption}>
            {pseudo} — dernière trace : devant sa télé
          </div>
        </div>

        <div className={s.dossier}>
          <div className={s.dossierNum}>DOSSIER N° {shortId}</div>
          <div className={s.pseudo}>{pseudo}</div>
          <div className={s.role}>{role}</div>
          <div className={s.gauge}>EXP · NIVEAU {level} — {exp} / {nextExp}</div>
          <div className={s.gaugeBar}>
            <div className={s.gaugeFill} style={{ width: `${pct}%` }} />
          </div>
          {nextRole ? (
            <div className={s.gaugeNext}>{nextExp - exp} AVANT « {nextRole} »</div>
          ) : (
            <div className={s.gaugeNext}>{nextExp - exp} AVANT LE NIVEAU {level + 1}</div>
          )}
        </div>
      </div>

      <div className={s.stats}>
        <div className={s.stat}>
          <div className={s.statVal}>{watchedCount}</div>
          <div className={s.statLabel}>VICTIMES</div>
        </div>
        <div className={s.stat}>
          <div className={s.statVal}>{ratingsCount}</div>
          <div className={s.statLabel}>NOTES GRIFFÉES</div>
        </div>
        <div className={s.stat}>
          <div className={s.statVal}>{votesCount}</div>
          <div className={s.statLabel}>PORTES OUVERTES</div>
        </div>
      </div>

      <div className={s.filature}>
        <div className={s.filatureTitle}>CELUI QU&apos;ON TIENT SUR TOI</div>
        <div className={s.filatureLine}>
          SUIVI DEPUIS <strong>{daysSince(createdAt)}</strong>
        </div>
        <div className={s.filatureLine}>
          DERNIÈRE TRACE{' '}
          <strong>
            {lastWatchedTitle
              ? `${lastWatchedTitle}, ${formatDate(lastWatchedDate)}`
              : 'aucune, pour l’instant'}
          </strong>
        </div>
        <div className={s.filatureLine}>
          TES HEURES <strong>surtout {parisHourLabel(watchedHours)}</strong>
        </div>
        <div className={s.filatureLine}>
          CE QU&apos;IL SAIT{' '}
          <strong>
            {bestRating
              ? `ton film préféré : ${bestRating.titre} (${bestRating.note}/10)`
              : 'rien, pour l’instant'}
          </strong>
        </div>
      </div>

      {bio && <div className={s.bio}>{bio}</div>}

      <div className={s.badgesTitle}>
        PIÈCES À CONVICTION · CHOISIS CELLE QU&apos;ON VOIT À CÔTÉ DE TON NOM
      </div>
      <div className={s.badgesGrid}>
        {badges.map(b => (
          <div key={b.id} className={b.unlocked ? s.badgeItem : s.badgeLocked}>
            <span className={s.badgeIcon}>{b.icon}</span>
            {b.label}
            {!b.unlocked && ' — pas encore'}
          </div>
        ))}
      </div>

      <div className={s.rolesTitle}>LES DOUZE RÔLES</div>
      <ul className={s.roleList}>
        {ROLES.map((r, i) => {
          const lvl = i + 1
          const isCurrent = lvl === level
          return (
            <li key={i} className={isCurrent ? s.roleCurrent : s.roleItem}>
              <span className={s.roleLevel}>{lvl}</span>
              <span className={s.roleName}>{r}</span>
              <span className={s.roleExp}>{lvl * 100} EXP</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
