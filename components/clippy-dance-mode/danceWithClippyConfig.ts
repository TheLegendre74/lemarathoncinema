import type {
  DanceWithClippyDifficulty,
  DanceWithClippySelection,
  DanceWithClippyTrack,
} from './types'

export const DANCE_WITH_CLIPPY_DIFFICULTIES: DanceWithClippyDifficulty[] = [
  {
    id: 'starter',
    label: 'Starter',
    description: 'Rythme plus lisible, fenetre de timing plus large.',
    hp: 20,
    noteSpeedMultiplier: 0.85,
    noteDensityMultiplier: 0.75,
    hitWindowMultiplier: 1.2,
    scoreMultiplier: 1,
  },
  {
    id: 'club',
    label: 'Club',
    description: 'Equilibre DDR standard, pense pour les longues sessions.',
    hp: 18,
    noteSpeedMultiplier: 1,
    noteDensityMultiplier: 1,
    hitWindowMultiplier: 1,
    scoreMultiplier: 1.25,
  },
  {
    id: 'fever',
    label: 'Fever',
    description: 'Densite plus forte et marge plus courte, sans changer Fever Night.',
    hp: 16,
    noteSpeedMultiplier: 1.2,
    noteDensityMultiplier: 1.35,
    hitWindowMultiplier: 0.9,
    scoreMultiplier: 1.6,
  },
]

export const DANCE_WITH_CLIPPY_TRACKS: DanceWithClippyTrack[] = [
  {
    id: 'neon-office',
    title: 'Neon Office',
    artist: 'Clippy',
    audioSrc: '/audio/clippy/dance-with-clippy/neon-office.m4a',
    bpm: 124,
    previewStartMs: 16000,
    loopStartMs: 0,
  },
  {
    id: 'paperclip-disco',
    title: 'Paperclip Disco',
    artist: 'Clippy',
    audioSrc: '/audio/clippy/dance-with-clippy/paperclip-disco.m4a',
    bpm: 132,
    previewStartMs: 12000,
    loopStartMs: 0,
  },
  {
    id: 'midnight-fever',
    title: 'Midnight Fever',
    artist: 'Clippy',
    audioSrc: '/audio/clippy/dance-with-clippy/midnight-fever.m4a',
    bpm: 146,
    previewStartMs: 10000,
    loopStartMs: 0,
  },
]

export const DEFAULT_DANCE_WITH_CLIPPY_SELECTION: DanceWithClippySelection = {
  difficultyId: 'club',
  trackId: 'paperclip-disco',
}

export function getDanceWithClippyDifficulty(id: DanceWithClippySelection['difficultyId']) {
  return DANCE_WITH_CLIPPY_DIFFICULTIES.find((difficulty) => difficulty.id === id)
    ?? DANCE_WITH_CLIPPY_DIFFICULTIES[1]
}

export function getDanceWithClippyTrack(id: DanceWithClippySelection['trackId']) {
  return DANCE_WITH_CLIPPY_TRACKS.find((track) => track.id === id)
    ?? DANCE_WITH_CLIPPY_TRACKS[1]
}

