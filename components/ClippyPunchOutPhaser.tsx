'use client'
import { useEffect, useRef } from 'react'

interface Props {
  onWin: () => void
  onLose: () => void
  initialHP?: number
  initialPlayerHP?: number
  skipTutorial?: boolean
}

export default function ClippyPunchOutPhaser({
  onWin, onLose, initialHP, initialPlayerHP, skipTutorial = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let mounted = true

    Promise.all([
      import('phaser'),
      import('./clippy-punch-out/PunchScene'),
    ]).then(([{ default: Phaser }, { PunchScene }]) => {
      if (!mounted || !containerRef.current) return

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

    return () => {
      mounted = false
      const sc = gameRef.current?.scene?.scenes?.[0] as any
      try { sc?.shutdown?.() } catch {}
      try { sc?.bgMusic?.pause(); sc.bgMusic = null } catch {}
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 99990 }} />
}
