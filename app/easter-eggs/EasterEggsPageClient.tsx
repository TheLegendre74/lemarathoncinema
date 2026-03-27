'use client'

interface Props {
  discoveredMap: Record<string, string>
  achievements: Record<string, boolean>
}

// ── Définition des 15 easter eggs ─────────────────────────────────────────────
const EGGS = [
  {
    id: 'matrix',
    icon: '💊',
    name: 'La Pilule Rouge',
    category: 'Clavier',
    condition: 'Taper "red pill" au clavier sur n\'importe quelle page',
  },
  {
    id: 'joker',
    icon: '🃏',
    name: 'Why So Serious?',
    category: 'Clavier',
    condition: 'Entrer le code Konami (↑↑↓↓←→←→BA)',
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
    condition: 'Taper "hal" au clavier',
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
    condition: 'Taper "bond" au clavier',
  },
  {
    id: 'fightclub',
    icon: '🥊',
    name: 'La Première Règle',
    category: 'Clavier',
    condition: 'Taper "tyler" au clavier — et survivre',
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

export default function EasterEggsPageClient({ discoveredMap, achievements }: Props) {
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

              {/* Right: category + date */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  display: 'inline-block',
                  fontSize: '.6rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: CATEGORY_TEXT[egg.category],
                  background: CATEGORY_COLORS[egg.category],
                  border: `1px solid ${CATEGORY_TEXT[egg.category]}44`,
                  borderRadius: 99, padding: '2px 8px',
                  marginBottom: foundAt ? '.3rem' : 0,
                }}>
                  {egg.category}
                </div>
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

      {/* Footer hint */}
      <div style={{ marginTop: '2rem', padding: '1rem 1.2rem', borderRadius: 'var(--rl)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border2)', fontSize: '.8rem', color: 'var(--text3)', lineHeight: 1.7 }}>
        💡 <strong style={{ color: 'var(--text2)' }}>Indice :</strong> certains easter eggs se déclenchent en tapant des mots au clavier, d'autres en interagissant avec des films spécifiques, ou en visitant le site à certaines heures. Les succès sont débloqués automatiquement selon ton activité.
      </div>
    </div>
  )
}
