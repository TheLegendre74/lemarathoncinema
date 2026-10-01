'use client'

import { createContext, useContext } from 'react'

export type PublicConfig = {
  SAISON_NUMERO: number
  SAISON_LABEL: string
  MARATHON_START: string
  SEANCE_JOUR: string
  SEANCE_HEURE: string
  FDLS_JOUR: string
  FDLS_HEURE: string
  EXP_FILM: number
  EXP_FDLS: number
  EXP_DUEL_WIN: number
  EXP_VOTE: number
  EXP_FDLS_BONUS: number
  SEUIL_MAJORITY: number
  limite_jour: number
  limite_jour_max: number
  duel_egalite: 'note' | 'hasard'
  eggsDisabled: string[]
}

const ConfigContext = createContext<PublicConfig | null>(null)

export function ConfigProvider({ config, children }: { config: PublicConfig; children: React.ReactNode }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig(): PublicConfig {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used inside ConfigProvider')
  return ctx
}
