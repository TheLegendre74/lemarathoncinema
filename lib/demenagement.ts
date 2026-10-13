import { SITE_URL } from './site'

const ANCIENS_DOMAINES = (process.env.ANCIENS_DOMAINES ?? '')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean)

interface RouteInput {
  host: string
  method: string
  pathname: string
  accept: string
  cookieDemenage: boolean
}

export type RouteDecision = 'servir' | 'demenager' | 'rediriger'

export function routeAncienDomaine(input: RouteInput): RouteDecision {
  const host = input.host.replace(/:\d+$/, '').toLowerCase()

  if (!ANCIENS_DOMAINES.includes(host)) return 'servir'

  if (input.method !== 'GET') return 'servir'
  if (input.pathname.startsWith('/api/')) return 'servir'
  if (input.pathname.startsWith('/_next/')) return 'servir'
  if (input.pathname.includes('.')) return 'servir'
  if (!input.accept.includes('text/html')) return 'servir'

  if (input.cookieDemenage) return 'rediriger'
  return 'demenager'
}

export function buildRedirectUrl(pathname: string, search: string): string {
  return SITE_URL + pathname + search
}

export const STORAGE_PREFIXES = [
  'clippy_',
  'fc_',
  'trombone_highscore',
  'tama_widget_enabled',
  'tama_widget_mini',
  'joker-agent-of-chaos',
  'cinemon_sim_state',
  'cm_',
]

const STORAGE_BLOCKLIST = new Set([
  'clippy_is_admin',
  'tama_widget_cache',
])

export function filterStorageKeys(keys: string[]): string[] {
  return keys.filter(k => {
    if (STORAGE_BLOCKLIST.has(k)) return false
    return STORAGE_PREFIXES.some(p => k.startsWith(p))
  })
}
