'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onWin: () => void
  onLose: () => void
  initialHP?: number
  initialPlayerHP?: number
  skipTutorial?: boolean
}

function needsGyroPermission(): boolean {
  return typeof DeviceOrientationEvent !== 'undefined'
    && typeof (DeviceOrientationEvent as any).requestPermission === 'function'
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export default function ClippyPunchOutPhaser({
  onWin, onLose, initialHP, initialPlayerHP, skipTutorial = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const [showGyroPrompt, setShowGyroPrompt] = useState(false)
  const [gyroGranted, setGyroGranted] = useState(false)
  const startGameRef = useRef<() => void>()

  const startGame = useCallback(() => {
    if (!containerRef.current || gameRef.current) return

    Promise.all([
      import('phaser'),
      import('./clippy-punch-out/PunchScene'),
    ]).then(([{ default: Phaser }, { PunchScene }]) => {
      if (!containerRef.current) return

      const game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: containerRef.current!,
        transparent: false,
        backgroundColor: '#050510',
        scene: PunchScene,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, antialiasGL: true, pixelArt: false },
        audio: { disableWebAudio: false },
        banner: false,
      })

      game.scene.start('Punch', { onWin, onLose, initialHP, initialPlayerHP, skipTutorial })
      gameRef.current = game
    })
  }, [onWin, onLose, initialHP, initialPlayerHP, skipTutorial])

  useEffect(() => {
    startGameRef.current = startGame
  }, [startGame])

  useEffect(() => {
    if (isMobileDevice() && needsGyroPermission()) {
      setShowGyroPrompt(true)
    } else {
      startGame()
    }

    return () => {
      const sc = gameRef.current?.scene?.scenes?.[0] as any
      try { sc?.shutdown?.() } catch {}
      try { sc?.bgMusic?.pause(); sc.bgMusic = null } catch {}
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGyroRequest = async () => {
    try {
      const perm = await (DeviceOrientationEvent as any).requestPermission()
      setGyroGranted(perm === 'granted')
    } catch {}
    setShowGyroPrompt(false)
    startGameRef.current?.()
  }

  const handleSkipGyro = () => {
    setShowGyroPrompt(false)
    startGameRef.current?.()
  }

  if (showGyroPrompt) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        background: '#050510',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Impact", "Arial Black", sans-serif',
        color: '#fff', padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>📎</div>
        <div style={{ fontSize: 22, color: '#ffcc44', marginBottom: 12 }}>
          CONTRÔLES GYROSCOPE
        </div>
        <div style={{
          fontSize: 14, color: '#aab', maxWidth: 340, lineHeight: 1.6, marginBottom: 28,
          fontFamily: 'sans-serif',
        }}>
          Penchez votre téléphone pour esquiver les coups de Clippy.
          Touchez l&apos;écran pour frapper.
        </div>
        <button
          onClick={handleGyroRequest}
          style={{
            padding: '16px 40px', fontSize: 18,
            background: '#22cc55', color: '#000', border: 'none',
            borderRadius: 12, fontWeight: 'bold', cursor: 'pointer',
            fontFamily: '"Impact", "Arial Black", sans-serif',
            boxShadow: '0 4px 20px rgba(34,204,85,.4)',
            marginBottom: 12,
          }}
        >
          ACTIVER LE GYROSCOPE
        </button>
        <button
          onClick={handleSkipGyro}
          style={{
            padding: '10px 30px', fontSize: 14,
            background: 'transparent', color: '#666', border: '1px solid #333',
            borderRadius: 8, cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          Jouer sans gyroscope
        </button>
      </div>
    )
  }

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 99990 }} />
}
