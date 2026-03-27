import { cache } from 'react'
import { createClient } from './supabase/server'
import { CONFIG } from './config'

export type ServerConfig = typeof CONFIG & {
  ACCUEIL_SOUS_TITRE: string
  MATRIX_LINE1: string
  MATRIX_LINE2: string
  MATRIX_LINE3: string
  JOKER_PHRASE: string
  TARS_LINE1: string
  TARS_LINE2: string
  MARVIN_LINE1: string
  MARVIN_LINE2: string
}

// React cache() déduplique les appels dans la même requête
export const getServerConfig = cache(async (): Promise<ServerConfig> => {
  const defaults: ServerConfig = {
    ...CONFIG,
    ACCUEIL_SOUS_TITRE: 'Le marathon cinématographique collaboratif',
    MATRIX_LINE1: 'Wake up, Neo...',
    MATRIX_LINE2: 'The Matrix has you.',
    MATRIX_LINE3: 'Follow the white rabbit.',
    JOKER_PHRASE: 'Why so serious? 🃏',
    TARS_LINE1: "Niveau d'humour réglé à 75%.",
    TARS_LINE2: "C'est honnête.",
    MARVIN_LINE1: 'Encore un humain qui cherche la réponse à la question fondamentale sur la vie...',
    MARVIN_LINE2: "C'est 42. C'est pathétique.",
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_config').select('key, value')
    if (!data?.length) return defaults

    const db: Record<string, string> = {}
    data.forEach(({ key, value }) => { db[key] = value })

    return {
      ...defaults,
      MARATHON_START:    db.marathon_start    ? new Date(db.marathon_start)          : defaults.MARATHON_START,
      SAISON_NUMERO:     db.saison_numero     ? parseInt(db.saison_numero)            : defaults.SAISON_NUMERO,
      SAISON_LABEL:      db.saison_label                                              ?? defaults.SAISON_LABEL,
      SEANCE_JOUR:       db.seance_jour                                               ?? defaults.SEANCE_JOUR,
      SEANCE_HEURE:      db.seance_heure                                              ?? defaults.SEANCE_HEURE,
      FDLS_JOUR:         db.fdls_jour                                                 ?? defaults.FDLS_JOUR,
      FDLS_HEURE:        db.fdls_heure                                                ?? defaults.FDLS_HEURE,
      SEUIL_MAJORITY:    db.seuil_majority    ? parseInt(db.seuil_majority)           : defaults.SEUIL_MAJORITY,
      EXP_FILM:          db.exp_film          ? parseInt(db.exp_film)                 : defaults.EXP_FILM,
      EXP_FDLS:          db.exp_fdls          ? parseInt(db.exp_fdls)                 : defaults.EXP_FDLS,
      EXP_DUEL_WIN:      db.exp_duel_win      ? parseInt(db.exp_duel_win)             : defaults.EXP_DUEL_WIN,
      EXP_VOTE:          db.exp_vote          ? parseInt(db.exp_vote)                 : defaults.EXP_VOTE,
      ACCUEIL_SOUS_TITRE: db.accueil_sous_titre                                       ?? defaults.ACCUEIL_SOUS_TITRE,
      MATRIX_LINE1:      db.matrix_line1                                              ?? defaults.MATRIX_LINE1,
      MATRIX_LINE2:      db.matrix_line2                                              ?? defaults.MATRIX_LINE2,
      MATRIX_LINE3:      db.matrix_line3                                              ?? defaults.MATRIX_LINE3,
      JOKER_PHRASE:      db.joker_phrase                                              ?? defaults.JOKER_PHRASE,
      TARS_LINE1:        db.tars_line1                                                ?? defaults.TARS_LINE1,
      TARS_LINE2:        db.tars_line2                                                ?? defaults.TARS_LINE2,
      MARVIN_LINE1:      db.marvin_line1                                              ?? defaults.MARVIN_LINE1,
      MARVIN_LINE2:      db.marvin_line2                                              ?? defaults.MARVIN_LINE2,
    }
  } catch {
    return defaults
  }
})

export function isMarathonLiveFromConfig(cfg: ServerConfig) {
  return new Date() >= cfg.MARATHON_START
}
