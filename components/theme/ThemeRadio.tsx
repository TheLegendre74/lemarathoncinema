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
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(40)
  const [started, setStarted] = useState(false)
  const [suppressed, setSuppressed] = useState(false)

  const tracksRef = useRef(def.radioTracks)
  tracksRef.current = def.radioTracks
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  const tracks = def.radioTracks
  const routeMuted = MUTED_ROUTES.some(r => pathname?.startsWith(r))

  function killAudio() {
    const a = audioRef.current
    if (a) {
      a.onended = null
      a.pause()
      a.src = ''
      audioRef.current = null
    }
  }

  function playTrack(trackIdx: number) {
    killAudio()
    const t = tracksRef.current
    if (!t.length) return
    const a = new Audio(t[trackIdx % t.length])
    a.volume = volumeRef.current / 100
    a.loop = false
    audioRef.current = a
    a.onended = () => {
      const next = (idxRef.current + 1) % tracksRef.current.length
      idxRef.current = next
      playTrack(next)
    }
    a.play().catch(() => {})
  }

  // Reset on theme change
  useEffect(() => {
    killAudio()
    idxRef.current = 0
    setStarted(false)
    setMuted(false)
  }, [key])

  // Auto-start on first user gesture
  useEffect(() => {
    if (!tracks.length || started) return

    const tryStart = () => {
      const t = tracksRef.current
      if (!t.length) return
      killAudio()
      const a = new Audio(t[0])
      a.volume = volumeRef.current / 100
      a.loop = false
      audioRef.current = a
      idxRef.current = 0
      a.onended = () => {
        const next = (idxRef.current + 1) % tracksRef.current.length
        idxRef.current = next
        playTrack(next)
      }
      a.play().then(() => {
        setStarted(true)
        remove()
      }).catch(() => {
        audioRef.current = null
      })
    }

    const remove = () => {
      document.removeEventListener('click', tryStart, true)
      document.removeEventListener('touchstart', tryStart, true)
      document.removeEventListener('keydown', tryStart, true)
    }
    document.addEventListener('click', tryStart, true)
    document.addEventListener('touchstart', tryStart, true)
    document.addEventListener('keydown', tryStart, true)
    return remove
  }, [key, tracks.length, started])

  // Volume sync on unmute only (slider onChange handles direct volume)
  useEffect(() => {
    if (muted) return
    const a = audioRef.current
    if (a) a.volume = volumeRef.current / 100
  }, [muted])

  // Pause/resume on route or egg suppression
  useEffect(() => {
    const a = audioRef.current
    if (!a || !started) return
    if (routeMuted || suppressed) {
      a.pause()
    } else if (!muted) {
      a.play().catch(() => {})
    }
  }, [routeMuted, suppressed, started, muted])

  // Poll for easter egg overlays
  useEffect(() => {
    const id = setInterval(() => {
      setSuppressed(ecranOccupe({ seuilZ: 300, part: 0.3 }))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => killAudio(), [])

  function handleToggle() {
    const t = tracksRef.current
    if (!started) {
      if (!t.length) return
      killAudio()
      const a = new Audio(t[0])
      a.volume = volumeRef.current / 100
      a.loop = false
      audioRef.current = a
      idxRef.current = 0
      a.onended = () => {
        const next = (idxRef.current + 1) % tracksRef.current.length
        idxRef.current = next
        playTrack(next)
      }
      a.play().then(() => {
        setStarted(true)
        setMuted(false)
      }).catch(() => {})
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
      if (a.paused && !routeMuted && !suppressed) {
        a.play().catch(() => {})
      }
    }
  }

  if (!tracks.length) return null

  const isAudible = started && !muted && !routeMuted && !suppressed

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
          onChange={e => {
            const v = Number(e.target.value)
            setVolume(v)
            const a = audioRef.current
            if (a) a.volume = v / 100
          }}
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
      <button
        onClick={handleToggle}
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
          opacity: routeMuted || suppressed ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        {isAudible ? '♫' : '♪'}
      </button>
    </div>
  )
}
