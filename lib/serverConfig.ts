import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { CONFIG } from './config'
import { fromParis } from './time/paris'

export type ServerConfig = typeof CONFIG & {
  ACCUEIL_SOUS_TITRE: string
  ACCUEIL_ACCROCHE: string
  ACCUEIL_TEXTE: string
  MARATHON_RULES: string | null
  MATRIX_LINE1: string; MATRIX_LINE2: string; MATRIX_LINE3: string
  JOKER_PHRASE: string
  TARS_LINE1: string;   TARS_LINE2: string
  MARVIN_LINE1: string; MARVIN_LINE2: string
  HAL_LINE1: string;    HAL_LINE2: string
  NOLAN_QUOTE: string
  BOND_LINE: string
  NOCTAM_LINE1: string; NOCTAM_LINE2: string
  KENNY_TEXT1: string;  KENNY_TEXT2: string
  RANDY_QUOTE: string
  FIGHTCLUB_GAMEOVER: string
  KILLBILL_END: string
  CLIPPY_REPLIES: string[]
  duel_egalite: 'note' | 'hasard'
  limite_jour: number
  limite_jour_max: number
  eggs_disabled: string[]
  videoclub_mode: 'cache' | 'bientot'
  theme_mode: 'auto' | 'force'
  theme_force: string
  action_car_speed: number
}

function safeDate(str: string | undefined, fallback: Date): Date {
  if (!str) return fallback
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (m) return fromParis(+m[1], +m[2], +m[3], +m[4], +m[5])
  return fallback
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (!raw) return fallback
  const n = parseInt(raw)
  if (isNaN(n) || n < min || n > max) return fallback
  return n
}

const getSiteConfigRows = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) return []

    const supabase = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.from('site_config').select('key, value')
    if (error) throw new Error(`site_config: ${error.message}`)
    return data ?? []
  },
  ['site-config'],
  { revalidate: 300, tags: ['site-config'] }
)

export const getServerConfig = cache(async (): Promise<ServerConfig> => {
  const defaults: ServerConfig = {
    ...CONFIG,
    ACCUEIL_SOUS_TITRE:  'Le marathon cinématographique collaboratif',
    ACCUEIL_ACCROCHE:    'UN MARATHON.\nUNE LISTE.\nTA CULTURE CINÉ.',
    ACCUEIL_TEXTE:       'Les films qui ont fait le cinéma, réunis dans une seule liste. Coche ceux que tu as déjà vus, rattrape les autres pendant le marathon, et regarde ta culture ciné grandir.',
    MARATHON_RULES:      null,
    MATRIX_LINE1:        'Wake up, Neo...',
    MATRIX_LINE2:        'The Matrix has you.',
    MATRIX_LINE3:        'Follow the white rabbit.',
    JOKER_PHRASE:        'Why so serious? \u{1F0CF}',
    TARS_LINE1:          "Niveau d'humour réglé à 75%.",
    TARS_LINE2:          "C'est honnête.",
    MARVIN_LINE1:        'Encore un humain qui cherche la réponse à la question fondamentale sur la vie...',
    MARVIN_LINE2:        "C'est 42. C'est pathétique.",
    HAL_LINE1:           'Je suis désolé, Dave.',
    HAL_LINE2:           "J'ai bien peur de ne pas pouvoir faire ça.",
    NOLAN_QUOTE:         'Le cinéma est la plus puissante façon de partager un rêve.',
    BOND_LINE:           'James Bond.',
    NOCTAM_LINE1:        'Tu regardes des films à cette heure-ci ?',
    NOCTAM_LINE2:        'Les vrais cinéphiles ne dorment pas.',
    KENNY_TEXT1:         'Oh mon Dieu ! Ils ont tué Kenny !',
    KENNY_TEXT2:         "Espèce d'enfoirés !",
    RANDY_QUOTE:         "C'est pas de l'alcoolisme, c'est du vinomoussage... c'est une activité élégamment culturelle.",
    FIGHTCLUB_GAMEOVER:  'Tyler est toujours plus fort que toi...',
    KILLBILL_END:        "Pai mei t'a bien entraîné.",
    CLIPPY_REPLIES:      [],
    duel_egalite:        'note',
    limite_jour:         4,
    limite_jour_max:     8,
    eggs_disabled:       [],
    videoclub_mode:      'bientot',
    theme_mode:          'auto',
    theme_force:         'neutre',
    action_car_speed:    2000,
  }

  const data = await getSiteConfigRows()
  if (!data?.length) return defaults

  const db: Record<string, string> = {}
  data.forEach(({ key, value }) => { db[key] = value })

  return {
    ...defaults,
    MARATHON_START:    safeDate(db.marathon_start, defaults.MARATHON_START),
    SAISON_NUMERO:     db.saison_numero     ? parseInt(db.saison_numero)  : defaults.SAISON_NUMERO,
    SAISON_LABEL:      db.saison_label      ?? defaults.SAISON_LABEL,
    SEANCE_JOUR:       db.seance_jour       ?? defaults.SEANCE_JOUR,
    SEANCE_HEURE:      db.seance_heure      ?? defaults.SEANCE_HEURE,
    FDLS_JOUR:         db.fdls_jour         ?? defaults.FDLS_JOUR,
    FDLS_HEURE:        db.fdls_heure        ?? defaults.FDLS_HEURE,
    SEUIL_MAJORITY:    db.seuil_majority    ? parseInt(db.seuil_majority) : defaults.SEUIL_MAJORITY,
    EXP_FILM:          db.exp_film          ? parseInt(db.exp_film)       : defaults.EXP_FILM,
    EXP_FDLS:          db.exp_fdls          ? parseInt(db.exp_fdls)       : defaults.EXP_FDLS,
    EXP_DUEL_WIN:      db.exp_duel_win      ? parseInt(db.exp_duel_win)   : defaults.EXP_DUEL_WIN,
    EXP_VOTE:          db.exp_vote          ? parseInt(db.exp_vote)       : defaults.EXP_VOTE,
    ACCUEIL_SOUS_TITRE: db.accueil_sous_titre ?? defaults.ACCUEIL_SOUS_TITRE,
    ACCUEIL_ACCROCHE:   db.accueil_accroche   ?? defaults.ACCUEIL_ACCROCHE,
    ACCUEIL_TEXTE:      db.accueil_texte      ?? defaults.ACCUEIL_TEXTE,
    MATRIX_LINE1:      db.matrix_line1      ?? defaults.MATRIX_LINE1,
    MATRIX_LINE2:      db.matrix_line2      ?? defaults.MATRIX_LINE2,
    MATRIX_LINE3:      db.matrix_line3      ?? defaults.MATRIX_LINE3,
    JOKER_PHRASE:      db.joker_phrase      ?? defaults.JOKER_PHRASE,
    TARS_LINE1:        db.tars_line1        ?? defaults.TARS_LINE1,
    TARS_LINE2:        db.tars_line2        ?? defaults.TARS_LINE2,
    MARVIN_LINE1:      db.marvin_line1      ?? defaults.MARVIN_LINE1,
    MARVIN_LINE2:      db.marvin_line2      ?? defaults.MARVIN_LINE2,
    HAL_LINE1:         db.hal_line1         ?? defaults.HAL_LINE1,
    HAL_LINE2:         db.hal_line2         ?? defaults.HAL_LINE2,
    NOLAN_QUOTE:       db.nolan_quote       ?? defaults.NOLAN_QUOTE,
    BOND_LINE:         db.bond_line         ?? defaults.BOND_LINE,
    NOCTAM_LINE1:      db.noctam_line1      ?? defaults.NOCTAM_LINE1,
    NOCTAM_LINE2:      db.noctam_line2      ?? defaults.NOCTAM_LINE2,
    KENNY_TEXT1:       db.kenny_text1       ?? defaults.KENNY_TEXT1,
    KENNY_TEXT2:       db.kenny_text2       ?? defaults.KENNY_TEXT2,
    RANDY_QUOTE:       db.randy_quote       ?? defaults.RANDY_QUOTE,
    FIGHTCLUB_GAMEOVER: db.fightclub_gameover ?? defaults.FIGHTCLUB_GAMEOVER,
    KILLBILL_END:      db.killbill_end      ?? defaults.KILLBILL_END,
    MARATHON_RULES:    db.MARATHON_RULES     ?? defaults.MARATHON_RULES,
    CLIPPY_REPLIES:    (() => { try { const p = JSON.parse(db.CLIPPY_REPLIES ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] } })(),
    EXP_FDLS_BONUS:    db.exp_fdls_bonus  ? clampInt(db.exp_fdls_bonus, 0, 1000, defaults.EXP_FDLS_BONUS) : defaults.EXP_FDLS_BONUS,
    duel_egalite:      db.duel_egalite === 'hasard' ? 'hasard' : 'note',
    limite_jour:       clampInt(db.limite_jour, 1, 50, 4),
    limite_jour_max:   clampInt(db.limite_jour_max, 1, 50, 8),
    eggs_disabled:     (() => { try { const p = JSON.parse(db.eggs_disabled ?? '[]'); return Array.isArray(p) ? p.filter((x: unknown) => typeof x === 'string') : [] } catch { return [] } })(),
    videoclub_mode:    db.videoclub_mode === 'cache' ? 'cache' : 'bientot',
    theme_mode:        db.theme_mode === 'force' ? 'force' : 'auto',
    theme_force:       db.theme_force ?? 'neutre',
    action_car_speed:  clampInt(db.action_car_speed, 500, 10000, 2000),
  }
})

export function isMarathonLiveFromConfig(cfg: ServerConfig) {
  return new Date() >= cfg.MARATHON_START
}
