export const DANCE_WITH_CLIPPY_UNLOCK_EGG_ID = 'rythme-dans-la-peau' as const

export type DanceWithClippyUnlockEggId = typeof DANCE_WITH_CLIPPY_UNLOCK_EGG_ID

export type DanceWithClippyDifficultyId = 'starter' | 'club' | 'fever'

export type DanceWithClippyTrackId =
  | 'neon-office'
  | 'paperclip-disco'
  | 'midnight-fever'

export type DanceWithClippyDifficulty = {
  id: DanceWithClippyDifficultyId
  label: string
  description: string
  hp: number
  noteSpeedMultiplier: number
  noteDensityMultiplier: number
  hitWindowMultiplier: number
  scoreMultiplier: number
}

export type DanceWithClippyTrack = {
  id: DanceWithClippyTrackId
  title: string
  artist: string
  audioSrc: string
  bpm: number
  previewStartMs: number
  loopStartMs?: number
  loopEndMs?: number
}

export type DanceWithClippySelection = {
  difficultyId: DanceWithClippyDifficultyId
  trackId: DanceWithClippyTrackId
}

export type DanceWithClippyUnlockState = {
  unlocked: boolean
  unlockedByEggId: DanceWithClippyUnlockEggId
}

