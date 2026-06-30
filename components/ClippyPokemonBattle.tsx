'use client'
import { useEffect, useRef, useState } from 'react'
import type { CardData, FilmCombatant } from './clippy-pokemon/types'
import type { TeamMember } from './clippy-pokemon/TeamSelectUI'
import type { Difficulty } from './clippy-pokemon/clippyBoss'
import TeamSelectUI from './clippy-pokemon/TeamSelectUI'
import TeamPreview from './clippy-pokemon/TeamPreview'
import DifficultySelect from './clippy-pokemon/DifficultySelect'
import { loadCards, getCardsSync, loadSaison1, buildCombatant, applyClimaxToTeam } from './clippy-pokemon/cardsData'
import type { Saison1Entry } from './clippy-pokemon/cardsData'
import { loadClippyTeams, getClippyTeam } from './clippy-pokemon/clippyBoss'

interface Props {
  onVictory?: () => void
  onDefeat?: () => void
}

type Phase = 'loading' | 'difficulty' | 'team_select' | 'team_preview' | 'battle'

export default function ClippyPokemonBattle({ onVictory, onDefeat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [allCards, setAllCards] = useState<CardData[]>([])
  const [clippyTeamData, setClippyTeamData] = useState<{ team: FilmCombatant[]; archetype: string; meta: string } | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[] | null>(null)
  const [clippyTeamsRaw, setClippyTeamsRaw] = useState<any>(null)
  const [saison1Data, setSaison1Data] = useState<Map<number, Saison1Entry> | null>(null)
  const [rotationIdx, setRotationIdx] = useState(0)

  // Load cards.json + clippy_teams.json + saison1.json
  useEffect(() => {
    let mounted = true
    Promise.all([loadCards(), loadClippyTeams(), loadSaison1()])
      .then(([db, ct, s1]) => {
        if (!mounted) return
        setAllCards(Object.values(db))
        setClippyTeamsRaw(ct)
        setSaison1Data(s1)
        setRotationIdx(Math.floor(Math.random() * 100))
        setPhase('difficulty')
      })
      .catch(e => {
        if (mounted) setError(e.message ?? 'Erreur de chargement')
      })
    return () => { mounted = false }
  }, [])

  // Boot Phaser when team is confirmed
  useEffect(() => {
    if (!teamMembers || !clippyTeamData || !containerRef.current) return
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

        game.scene.start('CinemonBattle', {
          teamMembers,
          clippyTeam: clippyTeamData!.team,
          archetype: clippyTeamData!.archetype,
          saison1: saison1Data,
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
  }, [teamMembers, clippyTeamData]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDifficultySelect = (difficulty: Difficulty) => {
    if (!clippyTeamsRaw) return
    const result = getClippyTeam(clippyTeamsRaw, difficulty, rotationIdx)
    setClippyTeamData(result)
    setPhase('team_select')
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f1525', color: '#ff4444', fontFamily: 'monospace', fontSize: 18,
      }}>
        {error}
      </div>
    )
  }

  if (phase === 'difficulty' && clippyTeamsRaw) {
    // Preview Clippy's team for scouting
    const previewTeam = getClippyTeam(clippyTeamsRaw, 'moyen', rotationIdx)
    return (
      <DifficultySelect
        archetype={previewTeam.archetype}
        meta={previewTeam.meta}
        teamNames={previewTeam.team.map(m => m.name)}
        onSelect={handleDifficultySelect}
        onBack={() => {
          setRotationIdx(prev => prev + 1)
          setPhase('difficulty')
        }}
      />
    )
  }

  if (phase === 'team_select') {
    return (
      <TeamSelectUI
        allCards={allCards}
        onConfirm={(members) => {
          setTeamMembers(members)
          setPhase('team_preview')
        }}
      />
    )
  }

  if (phase === 'team_preview' && teamMembers && clippyTeamData) {
    const fullPlayerTeam: FilmCombatant[] = teamMembers.map(m => buildCombatant(m.card, m.equippedNames))
    if (saison1Data) applyClimaxToTeam(fullPlayerTeam, saison1Data)

    return (
      <TeamPreview
        playerTeam={fullPlayerTeam}
        clippyTeam={clippyTeamData.team}
        archetype={clippyTeamData.archetype}
        onConfirm={(pickedIndices) => {
          const picked = pickedIndices.map(i => teamMembers[i])
          setTeamMembers(picked)
          setPhase('battle')
        }}
      />
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, background: '#0f1525' }}>
      {phase === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', fontFamily: 'monospace', fontSize: 18,
        }}>
          Chargement des 490 films…
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
