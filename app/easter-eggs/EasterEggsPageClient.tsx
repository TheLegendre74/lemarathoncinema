'use client'

import { useState } from 'react'

interface Props {
  discoveredMap: Record<string, string>
  achievements: Record<string, boolean>
  eggStats: Record<string, number>
  totalUsers: number
  clippyDefeats?: number
}

// ── Définition des easter eggs ────────────────────────────────────────────────
const EGGS = [
  {
    id: 'matrix',
    icon: '💊',
    name: 'La Pilule Rouge',
    category: 'Clavier',
    condition: 'Taper "red pill" au clavier — la pluie de code Matrix envahit l\'écran',
  },
  {
    id: 'joker',
    icon: '🃏',
    name: 'Why So Serious?',
    category: 'Clavier',
    condition: 'Entrer le code Konami : ↑↑↓↓←→←→BA',
  },
  {
    id: 'marvin',
    icon: '🤖',
    name: 'La Réponse Universelle',
    category: 'Clavier',
    condition: 'Taper "42" au clavier',
  },
  {
    id: 'hal',
    icon: '👁️',
    name: 'Je suis désolé, Dave',
    category: 'Clavier',
    condition: 'Taper "open the door" ou "ouvre la porte" au clavier',
  },
  {
    id: 'nolan',
    icon: '🌀',
    name: 'Le Maître des Rêves',
    category: 'Clavier',
    condition: 'Taper "nolan" au clavier',
  },
  {
    id: 'bond',
    icon: '🔫',
    name: 'Shaken, Not Stirred',
    category: 'Clavier',
    condition: 'Taper "bond" — gun barrel : James Bond traverse l\'écran, se retourne, tire. Le sang envahit le canon.',
  },
  {
    id: 'fightclub',
    icon: '🥊',
    name: 'La Première Règle',
    category: 'Clavier',
    condition: 'Taper "fight club" — survivre au mini-combat (4 rounds)',
  },
  {
    id: 'kenny',
    icon: '🧡',
    name: 'Oh mon Dieu !',
    category: 'Clavier',
    condition: 'Taper "kill kenny" au clavier',
  },
  {
    id: 'southpark',
    icon: '🚌',
    name: 'En route pour South Park',
    category: 'Clavier',
    condition: 'Taper "south park" au clavier',
  },
  {
    id: 'randy',
    icon: '🍷',
    name: 'Le Vinomoussage',
    category: 'Clavier',
    condition: 'Taper "randy" au clavier',
  },
  {
    id: 'killbill',
    icon: '⚔️',
    name: 'Tue Bill',
    category: 'Clavier',
    condition: 'Taper "kill bill" — trancher la tête de Bill avec le katana',
  },
  {
    id: 'predator',
    icon: '🎯',
    name: 'Le Chasseur',
    category: 'Clavier',
    condition: 'Taper "predator" — le viseur laser 3-points traque l\'alien, 5 tirs brûlent des trous dans la page, l\'alien s\'échappe',
  },
  {
    id: 'tamagotchi',
    icon: '🤍',
    name: 'Le Facehugger',
    category: 'Forum',
    condition: 'Écrire "alien" dans le forum — un facehugger s\'attache à toi. Ton tamagotchi alien t\'attend sur /tamagotchi.',
  },
  {
    id: 'tars',
    icon: '▣',
    name: 'TARS en ligne',
    category: 'Horaire',
    condition: 'Visiter le site à exactement 14h07',
  },
  {
    id: 'noctambule',
    icon: '🌙',
    name: 'Noctambule',
    category: 'Horaire',
    condition: 'Visiter le site entre minuit et 00h30',
  },
  {
    id: 'rageux',
    icon: '😤',
    name: 'Le Rageux',
    category: 'Forum',
    condition: 'Écrire un mot bien senti dans le forum — tu verras…',
  },
  {
    id: 'inception',
    icon: '🌀',
    name: 'Tu es encore en train de rêver',
    category: 'Films',
    condition: 'Cliquer 5 fois sur l\'affiche d\'Inception',
  },
  {
    id: 'godfather',
    icon: '🤌',
    name: 'Je lui ferai une offre',
    category: 'Films',
    condition: 'Rester 30 secondes sur la fiche du Parrain sans bouger',
  },
  {
    id: 'shark',
    icon: '🦈',
    name: 'Dun Dun...',
    category: 'Films',
    condition: 'Défiler rapidement jusqu\'en bas de la page Films',
  },
  {
    id: 'clippy',
    icon: '📦',
    name: 'La Boîte de Pandore',
    category: 'Clavier',
    condition: 'Taper "boîte de pandore" au clavier — un coffre mystérieux apparaît. Si tu oses l\'ouvrir, le mal le plus ancien de l\'univers en sort…',
  },
  {
    id: 'conway',
    icon: '▣',
    name: 'Life God Game',
    category: 'Clavier',
    condition: 'Taper "codex" au clavier pour ouvrir le Life God Game avec les AM autonomes.',
  },
  {
    id: 'watcher',
    icon: '🎬',
    name: 'Cinéphile Confirmé',
    category: 'Succès',
    condition: 'Marquer au moins 5 films comme vus',
  },
  {
    id: 'critic',
    icon: '⭐',
    name: 'Critique en Herbe',
    category: 'Succès',
    condition: 'Noter au moins 3 films',
  },
  {
    id: 'duelist',
    icon: '⚔️',
    name: 'Premier Duel',
    category: 'Succès',
    condition: 'Voter dans au moins 1 duel',
  },
  {
    id: 'curator',
    icon: '📽️',
    name: 'Curateur',
    category: 'Succès',
    condition: 'Ajouter au moins 1 film à la liste',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Clavier: 'rgba(100, 200, 255, 0.15)',
  Horaire: 'rgba(180, 120, 255, 0.15)',
  Films:   'rgba(255, 180, 60, 0.15)',
  Succès:  'rgba(80, 220, 120, 0.15)',
}
const CATEGORY_TEXT: Record<string, string> = {
  Clavier: '#64c8ff',
  Horaire: '#b478ff',
  Films:   '#ffb43c',
  Succès:  '#50dc78',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const CLIPPY_PHASES = [
  { phase: 1, name: 'Gladiator', icon: '⚔️', desc: 'Le premier affrontement. Combat classique contre Clippy.' },
  { phase: 2, name: 'La fièvre du samedi soir', icon: '🕺', desc: 'Dance battle DDR — Fever Night en mode survie.' },
  { phase: 3, name: 'Phase 3', icon: '🔒', desc: '???', locked: true },
  { phase: 4, name: 'Phase 4', icon: '🔒', desc: '???', locked: true },
  { phase: 5, name: 'Phase 5', icon: '🔒', desc: '???', locked: true },
]

const LOCKED_MSG = 'Désolé, Clippy travaille actuellement son plan de revanche en enfer. Il reviendra plus tard, mais il est trop occupé à réfléchir à comment te détruire. Reviens plus tard.'

export default function EasterEggsPageClient({ discoveredMap, achievements, eggStats, totalUsers, clippyDefeats = 0 }: Props) {
  const [lockedToast, setLockedToast] = useState<string | null>(null)

  const total = EGGS.length
  const found = EGGS.filter(e => {
    if (e.category === 'Succès') return achievements[e.id]
    return !!discoveredMap[e.id]
  }).length

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '.4rem' }}>
          🥚 Easter Eggs
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Des secrets sont cachés dans le site. Trouve-les tous pour les débloquer. Certains nécessitent du courage.
        </p>

        {/* Progress bar */}
        <div style={{ marginTop: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', fontSize: '.8rem', color: 'var(--text3)' }}>
            <span>{found} découvert{found > 1 ? 's' : ''}</span>
            <span>{total - found} restant{total - found > 1 ? 's' : ''}</span>
          </div>
          <div style={{ height: 6, background: 'var(--border2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(found / total) * 100}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--gold))',
              borderRadius: 99,
              transition: 'width .5s ease',
            }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '.5rem', fontSize: '.75rem', color: 'var(--gold)' }}>
            {found}/{total} {found === total ? '🏆 Collection complète !' : ''}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {EGGS.map((egg, i) => {
          const isAchievement = egg.category === 'Succès'
          const discovered = isAchievement ? achievements[egg.id] : !!discoveredMap[egg.id]
          const foundAt = !isAchievement && discoveredMap[egg.id] ? discoveredMap[egg.id] : null

          return (
            <div
              key={egg.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr auto',
                alignItems: 'center',
                gap: '1rem',
                padding: '.9rem 1.2rem',
                borderRadius: 'var(--rl)',
                background: discovered
                  ? CATEGORY_COLORS[egg.category]
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${discovered ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)'}`,
                transition: 'all .2s',
                opacity: discovered ? 1 : 0.5,
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: '1.2rem', textAlign: 'center', filter: discovered ? 'none' : 'grayscale(1)' }}>
                {discovered ? egg.icon : '❓'}
              </div>

              {/* Info */}
              <div>
                {discovered ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.15rem' }}>
                      {egg.name}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text3)', lineHeight: 1.4 }}>
                      {egg.condition}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text3)', marginBottom: '.15rem' }}>
                      ??? (#{i + 1})
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text3)', opacity: .5 }}>
                      Pas encore découvert
                    </div>
                  </>
                )}
              </div>

              {/* Right: category + date + stats */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  display: 'inline-block',
                  fontSize: '.6rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: CATEGORY_TEXT[egg.category],
                  background: CATEGORY_COLORS[egg.category],
                  border: `1px solid ${CATEGORY_TEXT[egg.category]}44`,
                  borderRadius: 99, padding: '2px 8px',
                  marginBottom: '.3rem',
                }}>
                  {egg.category}
                </div>
                {/* Nombre de joueurs qui l'ont trouvé */}
                {(() => {
                  const n = eggStats[egg.id] ?? 0
                  return (
                    <div style={{ fontSize: '.78rem', color: '#fff', fontWeight: 600 }}>
                      {n} <span style={{ fontSize: '.62rem', fontWeight: 400, color: 'var(--text3)' }}>joueur{n > 1 ? 's' : ''}</span>
                    </div>
                  )
                })()}
                {foundAt && (
                  <div style={{ fontSize: '.65rem', color: 'var(--text3)', opacity: .7 }}>
                    {formatDate(foundAt)}
                  </div>
                )}
                {isAchievement && discovered && (
                  <div style={{ fontSize: '.65rem', color: CATEGORY_TEXT['Succès'], opacity: .8 }}>
                    Débloqué ✓
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── La Revanche de Clippy ─────────────────────────────────────────── */}
      {clippyDefeats >= 1 && (
        <div style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', marginBottom: '.6rem', color: '#e85a5a' }}>
            📎 La Revanche de Clippy
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: '.82rem', lineHeight: 1.5, marginBottom: '1rem' }}>
            Tu as vaincu Clippy. Mais il n'oublie jamais. Rejoue les phases que tu as conquises.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {CLIPPY_PHASES.map(cp => {
              const unlocked = clippyDefeats >= cp.phase
              if (!unlocked) return null

              return (
                <button
                  key={cp.phase}
                  onClick={() => {
                    if (cp.locked) {
                      setLockedToast(LOCKED_MSG)
                      setTimeout(() => setLockedToast(null), 5000)
                      return
                    }
                    localStorage.setItem('clippy_god_phase', String(cp.phase))
                    localStorage.setItem('clippy_active', '1')
                    window.dispatchEvent(new CustomEvent('clippy:invoke'))
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2rem 1fr auto',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '.9rem 1.2rem',
                    borderRadius: 'var(--rl)',
                    background: cp.locked ? 'rgba(255,255,255,.02)' : 'rgba(232, 90, 90, 0.1)',
                    border: `1px solid ${cp.locked ? 'rgba(255,255,255,.05)' : 'rgba(232, 90, 90, 0.25)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all .2s',
                    opacity: cp.locked ? 0.55 : 1,
                  }}
                >
                  <div style={{ fontSize: '1.2rem', textAlign: 'center' }}>
                    {cp.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.15rem', color: cp.locked ? 'var(--text3)' : '#e85a5a' }}>
                      Phase {cp.phase} — {cp.name}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text3)', lineHeight: 1.4 }}>
                      {cp.desc}
                    </div>
                  </div>
                  <div style={{
                    display: 'inline-block',
                    fontSize: '.65rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: cp.locked ? '#888' : '#e85a5a',
                    background: cp.locked ? 'rgba(255,255,255,.04)' : 'rgba(232, 90, 90, 0.12)',
                    border: `1px solid ${cp.locked ? 'rgba(255,255,255,.08)' : 'rgba(232, 90, 90, 0.3)'}`,
                    borderRadius: 99, padding: '3px 10px',
                  }}>
                    {cp.locked ? 'Bientôt' : 'Rejouer'}
                  </div>
                </button>
              )
            })}
          </div>

          {lockedToast && (
            <div style={{
              marginTop: '.8rem', padding: '.8rem 1rem', borderRadius: 'var(--rl)',
              background: 'rgba(232, 90, 90, 0.08)', border: '1px solid rgba(232, 90, 90, 0.25)',
              fontSize: '.8rem', color: '#e85a5a', lineHeight: 1.5,
              animation: 'ee-fadein .3s ease',
            }}>
              🔥 {lockedToast}
            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div style={{ marginTop: '2rem', padding: '1rem 1.2rem', borderRadius: 'var(--rl)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border2)', fontSize: '.8rem', color: 'var(--text3)', lineHeight: 1.7 }}>
        💡 <strong style={{ color: 'var(--text2)' }}>Indice :</strong> certains easter eggs se déclenchent en tapant des mots au clavier, d'autres en interagissant avec des films spécifiques, ou en visitant le site à certaines heures. Les succès sont débloqués automatiquement selon ton activité.
      </div>
    </div>
  )
}
