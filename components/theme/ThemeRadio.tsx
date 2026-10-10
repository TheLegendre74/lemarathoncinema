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
  const [showVolume, setShowVolume] = useState(false)
  const [eggMuted, setEggMuted] = useState(false)
  const userPausedRef = useRef(false)
  const prevKeyRef = useRef(key)
  const tracksRef = useRef(def.radioTracks)
  tracksRef.current = def.radioTracks

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
    const a = createAudio(t[idx], volume)
    audioRef.current = a
    a.addEventListener('ended', () => playNext())
    a.play().catch(() => {})
  }, [volume, createAudio])

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
      setPlaying(false)
      userPausedRef.current = false
      trackIndexRef.current = 0
    }
  }, [key])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = volume / 100
  }, [volume])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (routeMuted || eggMuted) {
      a.pause()
    } else if (playing && !userPausedRef.current) {
      a.play().catch(() => {})
    }
  }, [routeMuted, eggMuted, playing])

  useEffect(() => {
    const interval = setInterval(() => {
      const occupied = ecranOccupe({ seuilZ: 300, part: 0.3 })
      setEggMuted(occupied)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

  const handleToggle = useCallback(() => {
    const t = tracksRef.current
    if (!t.length) return
    if (playing) {
      userPausedRef.current = true
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      userPausedRef.current = false
      if (!audioRef.current) {
        const a = createAudio(t[trackIndexRef.current], volume)
        audioRef.current = a
        a.addEventListener('ended', () => playNext())
      }
      audioRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }, [playing, volume, createAudio, playNext])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value))
  }, [])

  if (!tracks.length) return null

  const isMuted = routeMuted || eggMuted

  return (
    <div style={{
      position: 'fixed',
      bottom: 72,
      right: 16,
      zIndex: 199,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 6,
    }}>
      {showVolume && (
        <div style={{
          background: 'var(--s1)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,.4)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--f-data, monospace)', minWidth: 28, textAlign: 'right' }}>{volume}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={handleVolume}
            style={{ width: 100, accentColor: 'var(--accent-fg, #e8c46a)' }}
          />
        </div>
      )}
      <button
        onClick={handleToggle}
        onContextMenu={e => { e.preventDefault(); setShowVolume(v => !v) }}
        title={playing ? 'Couper la musique (clic droit: volume)' : 'Jouer la musique du theme (clic droit: volume)'}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid var(--line)',
          background: playing && !isMuted ? 'var(--accent-fg, #e8c46a)' : 'var(--s1)',
          color: playing && !isMuted ? 'var(--bg, #0a0a0f)' : 'var(--ink2)',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          transition: 'background .2s, color .2s',
          opacity: isMuted ? 0.4 : 1,
        }}
      >
        {playing && !isMuted ? '♫' : '♪'}
      </button>
    </div>
  )
}
