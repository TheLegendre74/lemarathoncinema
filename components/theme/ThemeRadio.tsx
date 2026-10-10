'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from './ThemeProvider'
import { usePathname } from 'next/navigation'
import { ecranOccupe } from '@/lib/themes/ecran'

const MUTED_ROUTES = ['/videoclub', '/labo/', '/clippy-revanche', '/tamagotchi']

function shouldMuteForRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return MUTED_ROUTES.some(r => pathname.startsWith(r))
}

export default function ThemeRadio() {
  const { def, key } = useTheme()
  const pathname = usePathname()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackIndexRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(40)
  const [muted, setMuted] = useState(false)
  const [eggMuted, setEggMuted] = useState(false)
  const prevKeyRef = useRef(key)
  const tracksRef = useRef(def.radioTracks)
  tracksRef.current = def.radioTracks
  const startedRef = useRef(false)
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  const tracks = def.radioTracks
  const routeMuted = shouldMuteForRoute(pathname)

  const createAudio = useCallback((src: string, vol: number) => {
    const a = new Audio(src)
    a.volume = vol / 100
    a.loop = false
    return a
  }, [])

  const playNext = useCallback(() => {
    const t = tracksRef.current
    if (!t.length) return
    const idx = (trackIndexRef.current + 1) % t.length
    trackIndexRef.current = idx
    const old = audioRef.current
    if (old) {
      old.pause()
      old.removeAttribute('src')
      old.load()
    }
    const a = createAudio(t[idx], volumeRef.current)
    audioRef.current = a
    a.addEventListener('ended', () => playNext())
    a.play().catch(() => {})
  }, [createAudio])

  const startPlayback = useCallback(() => {
    const t = tracksRef.current
    if (!t.length || startedRef.current) return
    startedRef.current = true
    const a = createAudio(t[0], volumeRef.current)
    audioRef.current = a
    a.addEventListener('ended', () => playNext())
    a.play().then(() => setPlaying(true)).catch(() => { startedRef.current = false })
  }, [createAudio, playNext])

  // Auto-start on first user interaction
  useEffect(() => {
    if (!tracks.length || startedRef.current) return
    const handler = () => {
      startPlayback()
      window.removeEventListener('click', handler, true)
      window.removeEventListener('keydown', handler, true)
      window.removeEventListener('touchstart', handler, true)
    }
    window.addEventListener('click', handler, true)
    window.addEventListener('keydown', handler, true)
    window.addEventListener('touchstart', handler, true)
    return () => {
      window.removeEventListener('click', handler, true)
      window.removeEventListener('keydown', handler, true)
      window.removeEventListener('touchstart', handler, true)
    }
  }, [tracks.length, startPlayback])

  // Theme change: reset
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      const old = audioRef.current
      if (old) {
        old.pause()
        old.removeAttribute('src')
        old.load()
        audioRef.current = null
      }
      startedRef.current = false
      setPlaying(false)
      setMuted(false)
      trackIndexRef.current = 0
    }
  }, [key])

  // Volume sync
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = muted ? 0 : volume / 100
  }, [volume, muted])

  // Route / egg mute
  useEffect(() => {
    const a = audioRef.current
    if (!a || !playing) return
    if (routeMuted || eggMuted) {
      a.pause()
    } else if (!muted) {
      a.play().catch(() => {})
    }
  }, [routeMuted, eggMuted, playing, muted])

  // Poll for egg overlays
  useEffect(() => {
    const interval = setInterval(() => {
      setEggMuted(ecranOccupe({ seuilZ: 300, part: 0.3 }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      const a = audioRef.current
      if (a) {
        a.pause()
        a.removeAttribute('src')
        a.load()
      }
    }
  }, [])

  const handleMuteToggle = useCallback(() => {
    if (!playing) {
      startPlayback()
      setMuted(false)
      return
    }
    const next = !muted
    setMuted(next)
    const a = audioRef.current
    if (!a) return
    if (next) {
      a.volume = 0
    } else {
      a.volume = volumeRef.current / 100
      if (a.paused && !shouldMuteForRoute(window.location.pathname)) {
        a.play().catch(() => {})
      }
    }
  }, [playing, muted, startPlayback])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    if (muted && v > 0) setMuted(false)
  }, [muted])

  if (!tracks.length) return null

  const suppressed = routeMuted || eggMuted
  const isAudible = playing && !muted && !suppressed

  return (
    <div style={{
      position: 'fixed',
      bottom: 72,
      right: 16,
      zIndex: 199,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {/* Slider vertical */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'var(--s1)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: '10px 6px',
        boxShadow: '0 2px 10px rgba(0,0,0,.35)',
      }}>
        <span style={{
          fontSize: 9,
          color: 'var(--ink3)',
          fontFamily: 'var(--f-data, monospace)',
          lineHeight: 1,
        }}>{volume}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={handleVolume}
          aria-label="Volume musique"
          style={{
            writingMode: 'vertical-lr' as const,
            direction: 'rtl',
            width: 20,
            height: 80,
            accentColor: 'var(--accent-fg, #e8c46a)',
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </div>

      {/* Bouton mute/unmute */}
      <button
        onClick={handleMuteToggle}
        title={isAudible ? 'Couper la musique' : 'Activer la musique'}
        aria-label={isAudible ? 'Couper la musique' : 'Activer la musique'}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid var(--line)',
          background: isAudible ? 'var(--accent-fg, #e8c46a)' : 'var(--s1)',
          color: isAudible ? 'var(--bg, #0a0a0f)' : 'var(--ink2)',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          transition: 'background .2s, color .2s',
          opacity: suppressed ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        {isAudible ? '♫' : '♪'}
      </button>
    </div>
  )
}
