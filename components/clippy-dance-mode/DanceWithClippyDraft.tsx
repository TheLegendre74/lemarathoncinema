'use client'

import { useMemo, useState } from 'react'
import {
  DANCE_WITH_CLIPPY_DIFFICULTIES,
  DANCE_WITH_CLIPPY_TRACKS,
  DEFAULT_DANCE_WITH_CLIPPY_SELECTION,
  getDanceWithClippyDifficulty,
  getDanceWithClippyTrack,
} from './danceWithClippyConfig'
import type { DanceWithClippySelection } from './types'

type DanceWithClippyDraftProps = {
  unlocked: boolean
  onClose?: () => void
  onStart?: (selection: DanceWithClippySelection) => void
}

export default function DanceWithClippyDraft({
  unlocked,
  onClose,
  onStart,
}: DanceWithClippyDraftProps) {
  const [selection, setSelection] = useState<DanceWithClippySelection>(
    DEFAULT_DANCE_WITH_CLIPPY_SELECTION,
  )

  const selectedDifficulty = useMemo(
    () => getDanceWithClippyDifficulty(selection.difficultyId),
    [selection.difficultyId],
  )
  const selectedTrack = useMemo(
    () => getDanceWithClippyTrack(selection.trackId),
    [selection.trackId],
  )

  if (!unlocked) return null

  return (
    <div className="fixed inset-0 z-[9998] overflow-y-auto bg-[#090012] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-200">
              Mode debloque
            </p>
            <h1 className="text-3xl font-black uppercase sm:text-5xl">
              Dance avec Clippy
            </h1>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold uppercase text-white/80 transition hover:bg-white/10"
            >
              Fermer
            </button>
          ) : null}
        </header>

        <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-fuchsia-300/25 bg-white/[0.06] p-4 shadow-[0_0_40px_rgba(217,70,239,0.18)]">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-fuchsia-100">
              Difficulte
            </h2>
            <div className="grid gap-3">
              {DANCE_WITH_CLIPPY_DIFFICULTIES.map((difficulty) => (
                <button
                  key={difficulty.id}
                  type="button"
                  onClick={() => setSelection((current) => ({
                    ...current,
                    difficultyId: difficulty.id,
                  }))}
                  className={[
                    'rounded-lg border p-4 text-left transition',
                    selection.difficultyId === difficulty.id
                      ? 'border-cyan-200 bg-cyan-300/15 shadow-[0_0_28px_rgba(34,211,238,0.22)]'
                      : 'border-white/15 bg-black/20 hover:border-white/35',
                  ].join(' ')}
                >
                  <span className="block text-lg font-black uppercase">
                    {difficulty.label}
                  </span>
                  <span className="mt-1 block text-sm text-white/70">
                    {difficulty.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-300/25 bg-white/[0.06] p-4 shadow-[0_0_40px_rgba(34,211,238,0.16)]">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
              Musique
            </h2>
            <div className="grid gap-3">
              {DANCE_WITH_CLIPPY_TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setSelection((current) => ({
                    ...current,
                    trackId: track.id,
                  }))}
                  className={[
                    'rounded-lg border p-4 text-left transition',
                    selection.trackId === track.id
                      ? 'border-fuchsia-200 bg-fuchsia-300/15 shadow-[0_0_28px_rgba(217,70,239,0.22)]'
                      : 'border-white/15 bg-black/20 hover:border-white/35',
                  ].join(' ')}
                >
                  <span className="block text-lg font-black uppercase">
                    {track.title}
                  </span>
                  <span className="mt-1 block text-sm text-white/70">
                    {track.artist} - {track.bpm} BPM
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-black/35 p-4">
          <div className="text-sm text-white/75">
            <span className="font-bold text-white">{selectedDifficulty.label}</span>
            {' sur '}
            <span className="font-bold text-white">{selectedTrack.title}</span>
          </div>
          <button
            type="button"
            onClick={() => onStart?.(selection)}
            className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black uppercase text-[#120022] shadow-[0_0_28px_rgba(34,211,238,0.35)] transition hover:bg-white"
          >
            Lancer
          </button>
        </footer>
      </div>
    </div>
  )
}

