'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from './ThemeProvider'
import { usePathname } from 'next/navigation'
import { ecranOccupe } from '@/lib/themes/ecran'

const MUTED_ROUTES = ['/videoclub', '/labo/', '/clippy-revanche', '/tamagotchi']

export default function ThemeRadio() {
  const { def, key } = useTheme()
  const pathname = usePathname()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const idxRef = useRef(0)
  const [vol, setVol] = useState(40)
  const [userMuted, setUserMuted] = useState(false)
  const [autoStarted, setAutoStarted] = useState(false)

  const tracks = def.radioTracks
  const routeBlocked = MUTED_ROUTES.some(r => pathname?.startsWith(r))

  // --- helpers ---
  function stopAudio() {
    const a = audioRef.current
    if (a) { a.onended = null; a.pause(); a.src = ''; audioRef.current = null }
  }

  function startTrack(idx: number, volume: number) {
    stopAudio()
    const t = def.radioTracks
    if (!t.length) return
    const a = new Audio(t[idx % t.length])
    a.volume = volume / 100
    audioRef.current = a
    a.onended = () => {
      const next = (idxRef.current + 1) % def.radioTracks.length
      idxRef.current = next
      startTrack(next, vol)
    }
    a.play().catch(() => {})
  }

  // --- Reset quand le theme change ---
  useEffect(() => {
    stopAudio()
    idxRef.current = 0
    setAutoStarted(false)
    setUserMuted(false)
  }, [key])

  // --- Auto-start a la premiere interaction ---
  useEffect(() => {
    if (!tracks.length || autoStarted) return
    function onInteraction() {
      startTrack(0, vol)
      setAutoStarted(true)
      off()
    }
    function off() {
      document.removeEventListener('click', onInteraction, true)
      document.removeEventListener('touchstart', onInteraction, true)
      document.removeEventListener('keydown', onInteraction, true)
    }
    document.addEventListener('click', onInteraction, true)
    document.addEventListener('touchstart', onInteraction, true)
    document.addEventListener('keydown', onInteraction, true)
    return off
  }, [key, tracks.length, autoStarted]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pause/resume quand route bloquee ou easter egg ---
  useEffect(() => {
    if (!autoStarted) return
    const id = setInterval(() => {
      const a = audioRef.current
      if (!a) return
      const eggActive = ecranOccupe({ seuilZ: 300, part: 0.3 })
      if (routeBlocked || eggActive) {
        if (!a.paused) a.pause()
      } else if (!userMuted && vol > 0) {
        if (a.paused) a.play().catch(() => {})
      }
    }, 800)
    return () => clearInterval(id)
  }, [autoStarted, routeBlocked, userMuted, vol])

  // --- Cleanup ---
  useEffect(() => () => stopAudio(), [])

  // --- Handlers ---
  function onVolumeChange(newVol: number) {
    setVol(newVol)
    const a = audioRef.current
    if (a) {
      a.volume = newVol / 100
      if (newVol > 0 && a.paused && autoStarted && !routeBlocked && !userMuted) {
        a.play().catch(() => {})
      }
    }
    if (newVol > 0 && userMuted) setUserMuted(false)
  }

  function onMuteToggle() {
    if (!autoStarted) {
      startTrack(0, vol)
      setAutoStarted(true)
      return
    }
    const a = audioRef.current
    if (!a) return
    if (userMuted) {
      setUserMuted(false)
      a.volume = vol / 100
      if (a.paused && !routeBlocked) a.play().catch(() => {})
    } else {
      setUserMuted(true)
      a.pause()
    }
  }

  if (!tracks.length) return null

  const isPlaying = autoStarted && !userMuted && vol > 0 && !routeBlocked

  return (
    <div style={{
      position: 'fixed', bottom: 72, right: 16, zIndex: 199,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: 'var(--s1)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '10px 6px',
        boxShadow: '0 2px 10px rgba(0,0,0,.35)',
      }}>
        <span style={{
          fontSize: 9, color: 'var(--ink3)',
          fontFamily: 'var(--f-data, monospace)', lineHeight: 1,
        }}>{vol}</span>
        <input
          type="range" min={0} max={100} value={vol}
          onChange={e => onVolumeChange(Number(e.target.value))}
          aria-label="Volume musique"
          style={{
            writingMode: 'vertical-lr' as const, direction: 'rtl',
            width: 20, height: 80,
            accentColor: 'var(--accent-fg, #e8c46a)',
            cursor: 'pointer', margin: 0,
          }}
        />
      </div>
      <button
        onClick={onMuteToggle}
        title={isPlaying ? 'Couper la musique' : 'Activer la musique'}
        aria-label={isPlaying ? 'Couper la musique' : 'Activer la musique'}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '1px solid var(--line)',
          background: isPlaying ? 'var(--accent-fg, #e8c46a)' : 'var(--s1)',
          color: isPlaying ? 'var(--bg, #0a0a0f)' : 'var(--ink2)',
          fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          transition: 'background .2s, color .2s',
          flexShrink: 0,
        }}
      >
        {isPlaying ? '♫' : '♪'}
      </button>
    </div>
  )
}
