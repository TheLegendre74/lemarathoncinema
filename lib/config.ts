// ══════════════════════════════════════════════════════════════
//  CONFIG CENTRALE — tout passe par les variables d'environnement
//  Modifier dans .env.local (dev) ou Vercel Dashboard (prod)
//  → Jamais besoin de toucher au code pour changer une date ou un EXP
// ══════════════════════════════════════════════════════════════

export const CONFIG = {
  MARATHON_START:  new Date(process.env.NEXT_PUBLIC_MARATHON_START ?? '2026-05-01T00:00:00'),
  SAISON_NUMERO:   parseInt(process.env.NEXT_PUBLIC_SAISON_NUMERO  ?? '1'),
  SAISON_LABEL:    process.env.NEXT_PUBLIC_SAISON_LABEL            ?? 'Saison 1 · 2026',
  SEANCE_JOUR:     process.env.NEXT_PUBLIC_SEANCE_JOUR             ?? 'Mercredi',
  SEANCE_HEURE:    process.env.NEXT_PUBLIC_SEANCE_HEURE            ?? '20h30',
  FDLS_JOUR:       process.env.NEXT_PUBLIC_FDLS_JOUR               ?? 'Vendredi',
  FDLS_HEURE:      process.env.NEXT_PUBLIC_FDLS_HEURE              ?? '20h30',
  SEUIL_MAJORITY:  parseInt(process.env.NEXT_PUBLIC_SEUIL_MAJORITY ?? '60'),
  EXP_FILM:        parseInt(process.env.NEXT_PUBLIC_EXP_FILM       ?? '5'),
  EXP_FDLS:        parseInt(process.env.NEXT_PUBLIC_EXP_FDLS       ?? '10'),
  EXP_DUEL_WIN:    parseInt(process.env.NEXT_PUBLIC_EXP_DUEL_WIN   ?? '15'),
  EXP_VOTE:        parseInt(process.env.NEXT_PUBLIC_EXP_VOTE       ?? '2'),
} as const

export function isMarathonLive(): boolean {
  return new Date() >= CONFIG.MARATHON_START
}

// ── BADGES ──────────────────────────────────────────────────
// ── BADGES SPÉCIAUX (easter eggs) ────────────────────────────
export const SPECIAL_BADGES = [
  { id: 'rageux',          label: 'Le Rageux',          icon: '😤', cls: 'badge-rage',  desc: 'Easter egg secret — réservé aux vrais rageuxs' },
  { id: 'agent-of-chaos',  label: 'Agent of Chaos',     icon: '🃏', cls: 'badge-chaos', desc: 'A trouvé le Joker dans le bonneteau — Agent du Chaos' },
  { id: 'tama_explorateur',label: 'Explorateur',         icon: '🔭', cls: 'badge-tama',  desc: 'Tamagotchi niveau 2 — Explorateur de l\'espace' },
  { id: 'tama_chasseur',   label: 'Chasseur Spatial',    icon: '🎯', cls: 'badge-tama',  desc: 'Tamagotchi niveau 5 — Chasseur Spatial redouté' },
  { id: 'tama_legende',    label: 'Légende Noire',       icon: '🌑', cls: 'badge-tama',  desc: 'Tamagotchi niveau 8 — Légende Noire de l\'univers' },
  { id: 'tama_maitre',     label: 'Maître de l\'Espace', icon: '👑', cls: 'badge-tama',   desc: 'Tamagotchi niveau 10 — Maître absolu de l\'espace' },
  { id: 'legende-vivante', label: 'Légende Vivante',    icon: '🏆', cls: 'badge-master', desc: 'A dompté la bête — Clippy lui obéit désormais' },
] as const

export type SpecialBadge = typeof SPECIAL_BADGES[number]

export function getSpecialBadge(id: string): SpecialBadge | null {
  return SPECIAL_BADGES.find(b => b.id === id) ?? null
}

// Retourne le badge à afficher (actif ou par défaut)
export function getDisplayBadge(exp: number, activeBadge: string | null, unlockedSpecials: string[]): { icon: string; label: string; cls: string } | null {
  if (activeBadge === 'none') return null
  if (activeBadge) {
    const special = getSpecialBadge(activeBadge)
    if (special && unlockedSpecials.includes(activeBadge)) return special
    const expBadge = BADGES.find(b => b.id === activeBadge)
    if (expBadge && exp >= expBadge.req) return expBadge
  }
  return getBadge(exp)
}

export const BADGES = [
  { id: 'padawan',   label: 'Padawan',          icon: '🎞️', req: 5,   cls: 'badge-gold2',  desc: '5 EXP — Le voyage commence' },
  { id: 'apprenti',  label: "L'Apprenti",        icon: '🎬', req: 50,  cls: 'badge-silver', desc: '50 EXP — Tu prends goût au cinéma' },
  { id: 'critique',  label: 'Le Critique',        icon: '📝', req: 100, cls: 'badge-bronze', desc: '100 EXP — Tu as un avis sur tout' },
  { id: 'cinephile', label: 'Cinéphile',          icon: '🎭', req: 150, cls: 'badge-blue',   desc: '150 EXP — Les salles obscures sont ta maison' },
  { id: 'auteur',    label: "L'Auteur",           icon: '🏆', req: 200, cls: 'badge-gold',   desc: '200 EXP — Tu comprends le 7e art' },
  { id: 'legende',   label: 'Légende Vivante',    icon: '👑', req: 300, cls: 'badge-gold',   desc: '300 EXP — Ton nom restera dans les annales' },
] as const

export type Badge = typeof BADGES[number]

export function getBadge(exp: number): Badge | null {
  return [...BADGES].reverse().find(b => exp >= b.req) ?? null
}

// Badge à afficher selon active_badge stocké (on fait confiance à la valeur)
export function getActiveBadge(exp: number, activeBadge: string | null | undefined): { icon: string; label: string; cls: string } | null {
  if (activeBadge === 'none') return null
  if (activeBadge) {
    const special = SPECIAL_BADGES.find(b => b.id === activeBadge)
    if (special) return special
    const expBadge = BADGES.find(b => b.id === activeBadge)
    if (expBadge && exp >= expBadge.req) return expBadge
  }
  return getBadge(exp)
}

export function getAllBadges(exp: number) {
  return BADGES.map(b => ({ ...b, unlocked: exp >= b.req }))
}

export function levelFromExp(exp: number): number {
  return Math.floor((exp ?? 0) / 100) + 1
}

// ── STREAMING PLATFORMS ────────────────────────────────────
export type StreamPlatform = {
  name: string
  url: string
  color: string
  icon: string
  type: 'svod' | 'tvod' | 'free'
}

export const STREAMING: Record<number, StreamPlatform[]> = {
  1:  [{ name: 'Mubi',             url: 'https://mubi.com/fr/films/citizen-kane',           color: '#27272f', icon: '🎥', type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/citizen-kane',    color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  2:  [{ name: 'Paramount+',       url: 'https://www.paramountplus.com/fr/',                 color: '#0064ff', icon: '⭐', type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/le-parrain',      color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  3:  [{ name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/apocalypse-now',  color: '#1a1a2e', icon: '🔍', type: 'tvod' },
       { name: 'Arte',             url: 'https://www.arte.tv/fr/',                           color: '#f28b00', icon: '🎭', type: 'free' }],
  4:  [{ name: 'Mubi',             url: 'https://mubi.com/fr/films/taxi-driver',             color: '#27272f', icon: '🎥', type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/taxi-driver',     color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  5:  [{ name: 'Prime Video',      url: 'https://www.primevideo.com/',                       color: '#00a8e1', icon: '📦', type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/blade-runner',    color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  6:  [{ name: 'Netflix',          url: 'https://www.netflix.com/',                          color: '#e50914', icon: '▶',  type: 'svod' },
       { name: 'Prime Video',      url: 'https://www.primevideo.com/',                       color: '#00a8e1', icon: '📦', type: 'svod' }],
  7:  [{ name: 'Canal+',           url: 'https://www.canalplus.com/',                        color: '#111',    icon: 'C',  type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/parasite-2019',   color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  8:  [{ name: 'Prime Video',      url: 'https://www.primevideo.com/',                       color: '#00a8e1', icon: '📦', type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/forrest-gump',    color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  9:  [{ name: 'Paramount+',       url: 'https://www.paramountplus.com/fr/',                 color: '#0064ff', icon: '⭐', type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/titanic',         color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  10: [{ name: 'Paramount+',       url: 'https://www.paramountplus.com/fr/',                 color: '#0064ff', icon: '⭐', type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://justwatch.com/fr/film/la-liste-de-schindler', color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  11: [{ name: 'Netflix',          url: 'https://www.netflix.com/',                          color: '#e50914', icon: '▶',  type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/les-evades',      color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  12: [{ name: 'Netflix',          url: 'https://www.netflix.com/',                          color: '#e50914', icon: '▶',  type: 'svod' },
       { name: 'Prime Video',      url: 'https://www.primevideo.com/',                       color: '#00a8e1', icon: '📦', type: 'svod' }],
  13: [{ name: 'Netflix',          url: 'https://www.netflix.com/',                          color: '#e50914', icon: '▶',  type: 'svod' },
       { name: 'Prime Video',      url: 'https://www.primevideo.com/',                       color: '#00a8e1', icon: '📦', type: 'svod' }],
  14: [{ name: 'Max',              url: 'https://www.max.com/fr/fr',                         color: '#002be7', icon: 'M',  type: 'svod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/the-dark-knight', color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  15: [{ name: 'Netflix',          url: 'https://www.netflix.com/',                          color: '#e50914', icon: '▶',  type: 'svod' },
       { name: 'Prime Video',      url: 'https://www.primevideo.com/',                       color: '#00a8e1', icon: '📦', type: 'svod' }],
  // Films Dupontel — Universciné
  16: [{ name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' },
       { name: 'VOD · JustWatch',  url: 'https://www.justwatch.com/fr/film/bernie-1996',     color: '#1a1a2e', icon: '🔍', type: 'tvod' }],
  17: [{ name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' }],
  18: [{ name: 'Canal+',           url: 'https://www.canalplus.com/',                        color: '#111',    icon: 'C',  type: 'svod' },
       { name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' }],
  19: [{ name: 'Canal+',           url: 'https://www.canalplus.com/',                        color: '#111',    icon: 'C',  type: 'svod' },
       { name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' }],
  20: [{ name: 'Canal+',           url: 'https://www.canalplus.com/',                        color: '#111',    icon: 'C',  type: 'svod' },
       { name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' }],
  21: [{ name: 'Canal+',           url: 'https://www.canalplus.com/',                        color: '#111',    icon: 'C',  type: 'svod' },
       { name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' }],
  22: [{ name: 'Netflix',          url: 'https://www.netflix.com/',                          color: '#e50914', icon: '▶',  type: 'svod' },
       { name: 'Canal+',           url: 'https://www.canalplus.com/',                        color: '#111',    icon: 'C',  type: 'svod' },
       { name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' }],
  23: [{ name: 'Canal+',           url: 'https://www.canalplus.com/',                        color: '#111',    icon: 'C',  type: 'svod' },
       { name: 'Universciné',      url: 'https://www.universcine.com/',                      color: '#c41e3a', icon: '🇫🇷', type: 'tvod' }],
}

// Pour tout film sans entrée spécifique → JustWatch
export function getStreamingPlatforms(filmId: number, filmTitre: string): StreamPlatform[] {
  if (STREAMING[filmId]) return STREAMING[filmId]
  return [{
    name: 'JustWatch — Toutes les plateformes',
    url: `https://www.justwatch.com/fr/rechercher?q=${encodeURIComponent(filmTitre)}`,
    color: '#1e2030',
    icon: '🔍',
    type: 'tvod',
  }]
}
