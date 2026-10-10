'use client'

interface Props {
  discoveredMap: Record<string, string>
  achievements: Record<string, boolean>
  eggStats: Record<string, number>
  totalUsers: number
  visibleFamilies: string[]
  currentTheme: string
  isAdmin: boolean
}

// ── Définition des easter eggs ────────────────────────────────────────────────
const EGGS = [
  {
    id: 'matrix', num: 1,
    icon: '💊',
    name: 'La Pilule Rouge',
    category: 'Clavier',
    condition: 'Taper "red pill" au clavier — la pluie de code Matrix envahit l\'écran',
  },
  {
    id: 'joker', num: 2,
    icon: '🃏',
    name: 'Why So Serious?',
    category: 'Clavier',
    condition: 'Entrer le code Konami : ↑↑↓↓←→←→BA',
  },
  {
    id: 'marvin', num: 3,
    icon: '🤖',
    name: 'La Réponse Universelle',
    category: 'Clavier',
    condition: 'Taper "42" au clavier',
  },
  {
    id: 'hal', num: 4,
    icon: '👁️',
    name: 'Je suis désolé, Dave',
    category: 'Clavier',
    condition: 'Taper "open the door" ou "ouvre la porte" au clavier',
  },
  {
    id: 'nolan', num: 5,
    icon: '🌀',
    name: 'Le Maître des Rêves',
    category: 'Clavier',
    condition: 'Taper "nolan" au clavier',
  },
  {
    id: 'bond', num: 6,
    icon: '🔫',
    name: 'Shaken, Not Stirred',
    category: 'Clavier',
    condition: 'Taper "bond" — gun barrel : James Bond traverse l\'écran, se retourne, tire. Le sang envahit le canon.',
  },
  {
    id: 'fightclub', num: 7,
    icon: '🥊',
    name: 'La Première Règle',
    category: 'Clavier',
    condition: 'Taper "fight club" — survivre au mini-combat (4 rounds)',
  },
  {
    id: 'kenny', num: 8,
    icon: '🧡',
    name: 'Oh mon Dieu !',
    category: 'Clavier',
    condition: 'Taper "kill kenny" au clavier',
  },
  {
    id: 'southpark', num: 9,
    icon: '🚌',
    name: 'En route pour South Park',
    category: 'Clavier',
    condition: 'Taper "south park" au clavier',
  },
  {
    id: 'randy', num: 10,
    icon: '🍷',
    name: 'Le Vinomoussage',
    category: 'Clavier',
    condition: 'Taper "randy" au clavier',
  },
  {
    id: 'killbill', num: 11,
    icon: '⚔️',
    name: 'Tue Bill',
    category: 'Clavier',
    condition: 'Taper "kill bill" — trancher la tête de Bill avec le katana',
  },
  {
    id: 'predator', num: 12,
    icon: '🎯',
    name: 'Le Chasseur',
    category: 'Clavier',
    condition: 'Taper "predator" — le viseur laser 3-points traque l\'alien, 5 tirs brûlent des trous dans la page, l\'alien s\'échappe',
  },
  {
    id: 'tamagotchi', num: 13,
    icon: '🤍',
    name: 'Le Facehugger',
    category: 'Forum',
    condition: 'Écrire "alien" dans le forum — un facehugger s\'attache à toi. Ton tamagotchi alien t\'attend sur /tamagotchi.',
  },
  {
    id: 'tars', num: 14,
    icon: '▣',
    name: 'TARS en ligne',
    category: 'Horaire',
    condition: 'Visiter le site à exactement 14h07',
  },
  {
    id: 'noctambule', num: 15,
    icon: '🌙',
    name: 'Noctambule',
    category: 'Horaire',
    condition: 'Visiter le site entre minuit et 00h30',
  },
  {
    id: 'rageux', num: 16,
    icon: '😤',
    name: 'Le Rageux',
    category: 'Forum',
    condition: 'Écrire un mot bien senti dans le forum — tu verras…',
  },
  {
    id: 'inception', num: 17,
    icon: '🌀',
    name: 'Tu es encore en train de rêver',
    category: 'Films',
    condition: 'Cliquer 5 fois sur l\'affiche d\'Inception',
  },
  {
    id: 'godfather', num: 18,
    icon: '🤌',
    name: 'Je lui ferai une offre',
    category: 'Films',
    condition: 'Rester 30 secondes sur la fiche du Parrain sans bouger',
  },
  {
    id: 'shark', num: 19,
    icon: '🦈',
    name: 'Dun Dun...',
    category: 'Films',
    condition: 'Défiler rapidement jusqu\'en bas de la page Films',
  },
  {
    id: 'clippy', num: 20,
    icon: '📦',
    name: 'La Boîte de Pandore',
    category: 'Clavier',
    condition: 'Taper "boîte de pandore" au clavier — un coffre mystérieux apparaît. Si tu oses l\'ouvrir, le mal le plus ancien de l\'univers en sort…',
  },
  {
    id: 'conway', num: 21,
    icon: '▣',
    name: 'Life God Game',
    category: 'Clavier',
    condition: 'Taper "codex" au clavier pour ouvrir le Life God Game avec les AM autonomes.',
  },
  {
    id: 'watcher', num: 22,
    icon: '🎬',
    name: 'Cinéphile Confirmé',
    category: 'Succès',
    condition: 'Marquer au moins 5 films comme vus',
  },
  {
    id: 'critic', num: 23,
    icon: '⭐',
    name: 'Critique en Herbe',
    category: 'Succès',
    condition: 'Noter au moins 3 films',
  },
  {
    id: 'duelist', num: 24,
    icon: '⚔️',
    name: 'Premier Duel',
    category: 'Succès',
    condition: 'Voter dans au moins 1 duel',
  },
  {
    id: 'curator', num: 25,
    icon: '📽️',
    name: 'Curateur',
    category: 'Succès',
    condition: 'Ajouter au moins 1 film à la liste',
  },
  {
    id: 'theme-action-voiture', num: 26,
    icon: '🏎️',
    name: 'La voiture',
    category: 'Theme — Action',
    condition: 'Lancer le curseur-voiture tres vite contre un bord ou le titre',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-action-nakatomi', num: 27,
    icon: '🏢',
    name: 'Nakatomi Plaza',
    category: 'Theme — Action',
    condition: 'Taper "nakatomi" au clavier',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-comedie-vert', num: 28,
    icon: '💡',
    name: 'Le vert interdit',
    category: 'Theme — Comedie',
    condition: "Cliquer l'ampoule verte de la rampe",
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-comedie-blanquette', num: 29,
    icon: '🍲',
    name: 'La blanquette',
    category: 'Theme — Comedie',
    condition: 'Chercher "blanquette" deux fois dans le repertoire',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-comedie-hyene', num: 30,
    icon: '🎭',
    name: 'La hyene',
    category: 'Theme — Comedie',
    condition: 'Applaudir 3 films le meme jour',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-western-mouche', num: 31,
    icon: '🪰',
    name: 'La mouche',
    category: 'Theme — Western',
    condition: 'Cliquer trois fois la mouche posee',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-western-404', num: 32,
    icon: '🏚️',
    name: 'La ville fantome',
    category: 'Theme — Western',
    condition: 'Tomber sur une page introuvable pendant la semaine Western',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-western-duel', num: 33,
    icon: '🤠',
    name: "L'heure du duel",
    category: 'Theme — Western',
    condition: 'Etre sur le duel quand il se cloture',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-horreur-ballon', num: 34,
    icon: '🎈',
    name: 'Le ballon rouge',
    category: 'Theme — Horreur',
    condition: 'Cliquer le ballon rouge quand il monte',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-horreur-possession', num: 35,
    icon: '👻',
    name: 'La possession',
    category: 'Theme — Horreur',
    condition: 'Taper "exorciste" au clavier',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-horreur-cercle', num: 36,
    icon: '🔄',
    name: 'Tourner en rond',
    category: 'Theme — Horreur',
    condition: 'Trois pages dans le meme ordre, deux fois de suite',
    limit: 'Sur ordinateur',
  },
  {
    id: 'theme-horreur-apparition', num: 37,
    icon: '👤',
    name: "L'apparition",
    category: 'Theme — Horreur',
    condition: 'Cliquer la forme dans les 6 secondes',
    limit: 'Sur ordinateur',
  },
] as const

const CATEGORY_COLORS: Record<string, string> = {
  Clavier: 'rgba(100, 200, 255, 0.15)',
  Horaire: 'rgba(180, 120, 255, 0.15)',
  Films:   'rgba(255, 180, 60, 0.15)',
  Forum:   'rgba(255, 100, 130, 0.15)',
  'Succès':  'rgba(80, 220, 120, 0.15)',
  'Theme — Action': 'rgba(255, 107, 43, 0.15)',
  'Theme — Comedie': 'rgba(220, 50, 50, 0.15)',
  'Theme — Western': 'rgba(204, 85, 0, 0.15)',
  'Theme — Horreur': 'rgba(160, 80, 80, 0.15)',
}
const CATEGORY_TEXT: Record<string, string> = {
  Clavier: '#64c8ff',
  Horaire: '#b478ff',
  Films:   '#ffb43c',
  Forum:   '#ff6482',
  'Succès':  '#50dc78',
  'Theme — Action': '#ff6b2b',
  'Theme — Comedie': '#dc3232',
  'Theme — Western': '#cc5500',
  'Theme — Horreur': '#a05050',
}

const FAMILY_TO_THEME: Record<string, string> = {
  'Theme — Action': 'action',
  'Theme — Comedie': 'comedie',
  'Theme — Western': 'western',
  'Theme — Horreur': 'horreur',
}

const THEME_LABELS: Record<string, string> = {
  action: 'Action',
  comedie: 'Comedie',
  western: 'Western',
  horreur: 'Horreur',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type EggDef = typeof EGGS[number]

export default function EasterEggsPageClient({ discoveredMap, achievements, eggStats, totalUsers, visibleFamilies, currentTheme, isAdmin }: Props) {
  const visibleEggs = EGGS.filter((e: EggDef) => {
    const familyTheme = FAMILY_TO_THEME[e.category]
    if (!familyTheme) return true
    return visibleFamilies.includes(familyTheme)
  })

  const total = visibleEggs.length
  const found = visibleEggs.filter((e: EggDef) => {
    if (e.category === 'Succès') return achievements[e.id]
    return !!discoveredMap[e.id]
  }).length

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '.4rem' }}>
          🥚 Easter Eggs
        </h1>
        <p style={{ color: 'var(--ink3)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Des secrets sont cachés dans le site. Trouve-les tous pour les débloquer. Certains nécessitent du courage.
        </p>

        {/* Progress bar */}
        <div style={{ marginTop: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', fontSize: '.8rem', color: 'var(--ink3)' }}>
            <span>{found} découvert{found > 1 ? 's' : ''}</span>
            <span>{total - found} restant{total - found > 1 ? 's' : ''}</span>
          </div>
          <div style={{ height: 6, background: 'var(--line2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(found / total) * 100}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-fg))',
              borderRadius: 99,
              transition: 'width .5s ease',
            }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '.5rem', fontSize: '.75rem', color: 'var(--accent-fg)' }}>
            {found}/{total} {found === total ? '🏆 Collection complète !' : ''}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {visibleEggs.map((egg: EggDef, i: number) => {
          const isAchievement = egg.category === 'Succès'
          const discovered = isAchievement ? achievements[egg.id] : !!discoveredMap[egg.id]
          const foundAt = !isAchievement && discoveredMap[egg.id] ? discoveredMap[egg.id] : null
          const familyTheme = FAMILY_TO_THEME[egg.category]
          const isFindableNow = familyTheme ? currentTheme === familyTheme : true

          return (
            <div
              key={egg.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr auto',
                alignItems: 'center',
                gap: '1rem',
                padding: '.9rem 1.2rem',
                borderRadius: 'var(--radius)',
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
                    <div style={{ fontSize: '.75rem', color: 'var(--ink3)', lineHeight: 1.4 }}>
                      {egg.condition}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--ink3)', marginBottom: '.15rem' }}>
                      ??? (#{egg.num})
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--ink3)', opacity: .5 }}>
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
                      {n} <span style={{ fontSize: '.62rem', fontWeight: 400, color: 'var(--ink3)' }}>joueur{n > 1 ? 's' : ''}</span>
                    </div>
                  )
                })()}
                {foundAt && (
                  <div style={{ fontSize: '.65rem', color: 'var(--ink3)', opacity: .7 }}>
                    {formatDate(foundAt)}
                  </div>
                )}
                {isAchievement && discovered && (
                  <div style={{ fontSize: '.65rem', color: CATEGORY_TEXT['Succès'], opacity: .8 }}>
                    Débloqué
                  </div>
                )}
                {familyTheme && (
                  <div style={{ fontSize: '.62rem', color: isFindableNow ? 'var(--ok, #50dc78)' : 'var(--ink3)', marginTop: '.15rem' }}>
                    {isFindableNow ? 'Trouvable cette semaine' : `Revient avec la semaine ${THEME_LABELS[familyTheme] ?? familyTheme}`}
                  </div>
                )}
                {'limit' in egg && egg.limit && (
                  <div style={{ fontSize: '.58rem', color: 'var(--ink3)', opacity: .6 }}>
                    {egg.limit}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div style={{ marginTop: '2rem', padding: '1rem 1.2rem', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--line2)', fontSize: '.8rem', color: 'var(--ink3)', lineHeight: 1.7 }}>
        💡 <strong style={{ color: 'var(--ink2)' }}>Indice :</strong> certains easter eggs se déclenchent en tapant des mots au clavier, d'autres en interagissant avec des films spécifiques, ou en visitant le site à certaines heures. Les succès sont débloqués automatiquement selon ton activité.
      </div>
    </div>
  )
}
