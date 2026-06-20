import type { FilmType } from '../types'
import { TYPE_CHART, ALL_TYPES } from './types.config'

export interface ClippyFormStyle {
  bodyColor: number
  strokeColor: number
  eyeColor: number
  browAngle: number
  mouthStyle: 'smile' | 'frown' | 'grin' | 'flat'
  badge: string
}

export const CLIPPY_FORM_STYLES: Record<FilmType, ClippyFormStyle> = {
  horreur:        { bodyColor: 0x440000, strokeColor: 0xff0000, eyeColor: 0xff0000, browAngle: 15, mouthStyle: 'grin', badge: '\u{1F480}' },
  action:         { bodyColor: 0x4a2000, strokeColor: 0xff6600, eyeColor: 0xff8800, browAngle: 10, mouthStyle: 'flat', badge: '\u{1F4A5}' },
  comedie:        { bodyColor: 0x4a4a00, strokeColor: 0xffd700, eyeColor: 0xffee00, browAngle: -5, mouthStyle: 'grin', badge: '\u{1F602}' },
  drame:          { bodyColor: 0x0a0a3e, strokeColor: 0x3344aa, eyeColor: 0x4466ff, browAngle: 5, mouthStyle: 'frown', badge: '\u{1F3AD}' },
  sciencefiction: { bodyColor: 0x003333, strokeColor: 0x00bcd4, eyeColor: 0x00ffff, browAngle: 0, mouthStyle: 'flat', badge: '\u{1F52C}' },
  fantastique:    { bodyColor: 0x2a0040, strokeColor: 0x9c27b0, eyeColor: 0xcc44ff, browAngle: 5, mouthStyle: 'smile', badge: '\u{2728}' },
  thriller:       { bodyColor: 0x1a1a1a, strokeColor: 0x666666, eyeColor: 0xaaaaaa, browAngle: 8, mouthStyle: 'flat', badge: '\u{1F52A}' },
  animation:      { bodyColor: 0x0a3a0a, strokeColor: 0x4caf50, eyeColor: 0x66ff66, browAngle: -5, mouthStyle: 'smile', badge: '\u{1F3A8}' },
  romance:        { bodyColor: 0x3a0020, strokeColor: 0xe91e63, eyeColor: 0xff4488, browAngle: -3, mouthStyle: 'smile', badge: '\u{1F496}' },
  aventure:       { bodyColor: 0x2a1a0a, strokeColor: 0x795548, eyeColor: 0xaa7744, browAngle: 5, mouthStyle: 'grin', badge: '\u{1F5FA}' },
}

export function findCounterTypes(playerType: FilmType): FilmType[] {
  const counters: FilmType[] = []
  for (const t of ALL_TYPES) {
    const eff = TYPE_CHART[t]?.[playerType]
    if (eff === 2) counters.push(t)
  }
  return counters
}

export function pickCounterForm(playerType: FilmType, randomChance: number): FilmType {
  if (Math.random() < randomChance) {
    return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)]
  }

  const counters = findCounterTypes(playerType)
  if (counters.length === 0) {
    return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)]
  }

  const resistCounters = counters.filter(c => {
    const eff = TYPE_CHART[playerType]?.[c]
    return eff !== undefined && eff < 1
  })

  const pool = resistCounters.length > 0 ? resistCounters : counters
  return pool[Math.floor(Math.random() * pool.length)]
}
