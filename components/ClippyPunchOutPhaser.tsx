'use client'
import { useEffect, useRef, useState } from 'react'

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
  const [showMobileChoice, setShowMobileChoice] = useState(false)
  const gyroGrantedRef = useRef(false)
  const mobileModeRef = useRef<'gyro' | 'pointer'>('pointer')

  function startGame() {
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

      game.scene.start('Punch', {
        onWin, onLose, initialHP, initialPlayerHP, skipTutorial,
        gyroGranted: gyroGrantedRef.current,
        mobileMode: mobileModeRef.current,
      })
      gameRef.current = game
    })
  }

  useEffect(() => {
    if (isMobileDevice()) {
      setShowMobileChoice(true)
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

  const handleChooseGyro = async () => {
    mobileModeRef.current = 'gyro'
    if (needsGyroPermission()) {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission()
        gyroGrantedRef.current = perm === 'granted'
      } catch {}
    }
    setShowMobileChoice(false)
    startGame()
  }

  const handleChoosePointer = () => {
    mobileModeRef.current = 'pointer'
    setShowMobileChoice(false)
    startGame()
  }

  if (showMobileChoice) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        background: '#050510',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Impact", "Arial Black", sans-serif',
        color: '#fff', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>📎</div>
        <div style={{ fontSize: 20, color: '#ffcc44', marginBottom: 24, letterSpacing: 1 }}>
          CHOISISSEZ VOS CONTRÔLES
        </div>

        <button
          onClick={handleChooseGyro}
          style={{
            width: '85%', maxWidth: 340, padding: '18px 20px', marginBottom: 14,
            background: 'linear-gradient(135deg, #1a5c2a, #22cc55)',
            color: '#fff', border: 'none', borderRadius: 14,
            fontWeight: 'bold', cursor: 'pointer',
            fontFamily: '"Impact", "Arial Black", sans-serif',
            boxShadow: '0 4px 20px rgba(34,204,85,.3)',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <span style={{ fontSize: 32 }}>📱</span>
          <div>
            <div style={{ fontSize: 18, letterSpacing: 1 }}>GYROSCOPE</div>
            <div style={{ fontSize: 12, fontFamily: 'sans-serif', fontWeight: 'normal', opacity: 0.85, marginTop: 4 }}>
              Penchez votre téléphone pour esquiver
            </div>
          </div>
        </button>

        <button
          onClick={handleChoosePointer}
          style={{
            width: '85%', maxWidth: 340, padding: '18px 20px',
            background: 'linear-gradient(135deg, #1a3a6c, #2288cc)',
            color: '#fff', border: 'none', borderRadius: 14,
            fontWeight: 'bold', cursor: 'pointer',
            fontFamily: '"Impact", "Arial Black", sans-serif',
            boxShadow: '0 4px 20px rgba(34,136,204,.3)',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <span style={{ fontSize: 32 }}>👆</span>
          <div>
            <div style={{ fontSize: 18, letterSpacing: 1 }}>TACTILE</div>
            <div style={{ fontSize: 12, fontFamily: 'sans-serif', fontWeight: 'normal', opacity: 0.85, marginTop: 4 }}>
              Glissez votre doigt pour esquiver
            </div>
          </div>
        </button>
      </div>
    )
  }

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 99990 }} />
}
