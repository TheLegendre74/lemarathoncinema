import type { FilmType } from '../types'

export interface ImpactParams {
  screenShake: number
  hitStopMs: number
  flashColor: number
  flashAlpha: number
  knockbackDist: number
  scalePunchMult: number
  particleCount: number
  particleColor: number
  zoomPunch: number
}

const BASE: ImpactParams = {
  screenShake: 4,
  hitStopMs: 60,
  flashColor: 0xffffff,
  flashAlpha: 0.5,
  knockbackDist: 8,
  scalePunchMult: 1.1,
  particleCount: 6,
  particleColor: 0xffffff,
  zoomPunch: 1.0,
}

export const IMPACT_BY_TYPE: Record<FilmType, ImpactParams> = {
  horreur:        { ...BASE, flashColor: 0xff0000, particleColor: 0x8B0000, screenShake: 6, hitStopMs: 80 },
  action:         { ...BASE, flashColor: 0xff6600, particleColor: 0xff8800, screenShake: 8, knockbackDist: 12, hitStopMs: 100 },
  comedie:        { ...BASE, flashColor: 0xffd700, particleColor: 0xffee00, screenShake: 3, hitStopMs: 40 },
  drame:          { ...BASE, flashColor: 0x3344aa, particleColor: 0x4466cc, screenShake: 3 },
  sciencefiction: { ...BASE, flashColor: 0x00bcd4, particleColor: 0x00ffff, hitStopMs: 70 },
  fantastique:    { ...BASE, flashColor: 0x9c27b0, particleColor: 0xcc44ff, hitStopMs: 70 },
  thriller:       { ...BASE, flashColor: 0x888888, particleColor: 0xaaaaaa, screenShake: 5 },
  animation:      { ...BASE, flashColor: 0x4caf50, particleColor: 0x66ff66, screenShake: 3 },
  romance:        { ...BASE, flashColor: 0xe91e63, particleColor: 0xff4488, screenShake: 2, hitStopMs: 40 },
  aventure:       { ...BASE, flashColor: 0x795548, particleColor: 0xaa7744, screenShake: 5, knockbackDist: 10 },
}

export const IMPACT_SUPER_EFFECTIVE: Partial<ImpactParams> = {
  screenShake: 14,
  hitStopMs: 120,
  flashAlpha: 0.8,
  knockbackDist: 18,
  scalePunchMult: 1.25,
  particleCount: 16,
  zoomPunch: 1.08,
}

export const IMPACT_CRIT: Partial<ImpactParams> = {
  screenShake: 12,
  hitStopMs: 100,
  flashAlpha: 0.9,
  knockbackDist: 15,
  scalePunchMult: 1.2,
  particleCount: 12,
  zoomPunch: 1.06,
}
