'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loadAllWatchedFilms, loadTeam } from './clippy-pokemon/teamLoader'
import { BALANCE } from './clippy-pokemon/config/balance.config'
import type { FilmCombatant } from './clippy-pokemon/types'
import TeamSelectUI from './clippy-pokemon/TeamSelectUI'

interface Props {
  onVictory?: () => void
  onDefeat?: () => void
}

export default function ClippyPokemonBattle({ onVictory, onDefeat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectData, setSelectData] = useState<FilmCombatant[] | null>(null)
  const [team, setTeam] = useState<FilmCombatant[] | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          const { buildDemoTeam } = await import('./clippy-pokemon/battleEngine')
          if (mounted) { setTeam(buildDemoTeam()); setIsDemo(true); setLoading(false) }
          return
        }

        if (BALANCE.MODE_EQUIPE === 'choix') {
          const res = await loadAllWatchedFilms(supabase, user.id)
          if (!mounted) return
          if (res.isDemo) { setTeam(res.allFilms); setIsDemo(true); setLoading(false) }
          else { setSelectData(res.allFilms); setLoading(false) }
        } else {
          const res = await loadTeam(supabase, user.id)
          if (mounted) { setTeam(res.team); setIsDemo(res.isDemo); setLoading(false) }
        }
      } catch (e: any) {
        if (mounted) setError(e.message ?? 'Erreur de chargement')
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!team || !containerRef.current) return
    let mounted = true

    async function boot() {
      try {
        const [{ default: Phaser }, { BattleScene }] = await Promise.all([
          import('phaser'),
          import('./clippy-pokemon/BattleScene'),
        ])
        if (!mounted || !containerRef.current) return

        const game = new Phaser.Game({
          type: Phaser.WEBGL,
          parent: containerRef.current!,
          width: 960, height: 540,
          backgroundColor: '#0f1525',
          scene: BattleScene,
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          render: { antialias: true },
          banner: false,
        })

        game.scene.start('PokemonBattle', {
          team, isDemo,
          onVictory: onVictory ?? (() => {}),
          onDefeat: onDefeat ?? (() => {}),
        })
        gameRef.current = game
      } catch (e: any) {
        if (mounted) setError(e.message ?? 'Erreur Phaser')
      }
    }

    boot()
    return () => {
      mounted = false
      const sc = gameRef.current?.scene?.scenes?.[0] as any
      try { sc?.shutdown?.() } catch {}
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [team]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1525', color: '#ff4444', fontFamily: 'monospace', fontSize: 18 }}>
        {error}
      </div>
    )
  }

  if (selectData) {
    return (
      <TeamSelectUI
        allFilms={selectData}
        onConfirm={(sel) => { setSelectData(null); setTeam(sel); setIsDemo(false) }}
      />
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, background: '#0f1525' }}>
      {loading && !team && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontFamily: 'monospace', fontSize: 18 }}>
          Chargement…
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
