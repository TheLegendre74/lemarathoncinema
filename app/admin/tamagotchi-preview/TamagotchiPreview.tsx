'use client'

import { useState, useEffect } from 'react'
import { feedTamagotchi, healTamagotchi, reviveTamagotchi } from '@/lib/actions'
import MiniGame from '@/app/tamagotchi/MiniGame'
import GameSelector from '@/app/tamagotchi/GameSelector'
import { useToast } from '@/components/ToastProvider'
import { TAMA_FRAMES, STAGE_COLORS } from '@/lib/tamaFrames'

const STAGES = ['egg', 'facehugger', 'chestburster', 'xenomorph', 'dead']
const MOODS  = ['happy', 'neutral', 'sad', 'dying']

function AsciiScreen({ frameKey, color }: { frameKey: string; color: string }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(t => 1 - t), 800); return () => clearInterval(id) }, [])
  const frames = TAMA_FRAMES[frameKey] ?? TAMA_FRAMES['egg']
  const frame  = frames[tick % frames.length]
  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: '.72rem', lineHeight: 1.45, color, textShadow: `0 0 6px ${color}66`, textAlign: 'left', display: 'inline-block' }}>
      {frame.map((l, i) => <div key={i} style={{ whiteSpace: 'pre' }}>{l}</div>)}
    </div>
  )
}

export default function TamagotchiPreview() {
  const [activeStage, setActiveStage]   = useState('facehugger')
  const [activeMood,  setActiveMood]    = useState('happy')
  const [showFeedGame, setShowFeedGame] = useState(false)
  const [showPlayGame, setShowPlayGame] = useState(false)
  const [gameStage, setGameStage]       = useState('xenomorph')
  const { addToast } = useToast()

  const frameKey   = `${activeStage}_${activeMood}`
  const validKey   = TAMA_FRAMES[frameKey] ? frameKey : activeStage === 'dead' ? 'dead' : `${activeStage}_neutral`
  const stageColor = STAGE_COLORS[activeStage] ?? '#22d3ee'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>🔧 Tamagotchi — Preview Admin</div>
        <div style={{ color: 'var(--text3)', fontSize: '.8rem', marginTop: '.3rem' }}>Visualise tous les stades et états. Les actions ci-dessous s&apos;appliquent à TON tamagotchi (sans cooldown côté UI).</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* ─── Preview panel ─── */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
            {STAGES.map(s => {
              const c = STAGE_COLORS[s] ?? '#22d3ee'
              return (
                <button key={s} onClick={() => setActiveStage(s)}
                  style={{ background: activeStage === s ? c + '33' : 'var(--bg2)', border: `1px solid ${activeStage === s ? c : 'var(--border)'}`, borderRadius: 99, padding: '.25rem .75rem', cursor: 'pointer', color: activeStage === s ? c : 'var(--text2)', fontSize: '.78rem', fontWeight: activeStage === s ? 600 : 400 }}>
                  {s}
                </button>
              )
            })}
          </div>

          {activeStage !== 'dead' && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '.4rem' }}>
              {MOODS.map(m => {
                const key    = `${activeStage}_${m}`
                const exists = !!TAMA_FRAMES[key]
                return (
                  <button key={m} disabled={!exists} onClick={() => setActiveMood(m)}
                    style={{ background: activeMood === m && exists ? 'rgba(255,255,255,.1)' : 'var(--bg2)', border: `1px solid ${activeMood === m && exists ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 99, padding: '.2rem .6rem', cursor: exists ? 'pointer' : 'default', color: exists ? 'var(--text2)' : 'var(--text3)', fontSize: '.72rem', opacity: exists ? 1 : .4 }}>
                    {m}
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ background: 'var(--bg2)', border: `2px solid ${stageColor}44`, borderRadius: 'var(--rl)', padding: '2rem', textAlign: 'center', boxShadow: `0 0 20px ${stageColor}22` }}>
            <AsciiScreen frameKey={validKey} color={stageColor} />
            <div style={{ marginTop: '.8rem', fontSize: '.7rem', color: stageColor, opacity: .7 }}>
              {validKey}
            </div>
          </div>

          {/* All previews at once */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '.75rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Tous les stages</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              {STAGES.map(stage => {
                const key   = stage === 'dead' ? 'dead' : `${stage}_neutral`
                const color = STAGE_COLORS[stage] ?? '#22d3ee'
                return (
                  <div key={stage} style={{ background: 'var(--bg2)', border: `1px solid ${color}33`, borderRadius: 'var(--r)', padding: '.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '.65rem', color, marginBottom: '.4rem', fontWeight: 600 }}>{stage}</div>
                    <AsciiScreen frameKey={key} color={color} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── Actions panel ─── */}
        <div>
          <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '.75rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Actions (sans cooldown UI)</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-outline" onClick={() => setShowFeedGame(v => !v)}>
              🥩 {showFeedGame ? 'Fermer' : 'Lancer le jeu Nourrir'}
            </button>
            <button className="btn btn-outline" onClick={() => setShowPlayGame(v => !v)}>
              🎮 {showPlayGame ? 'Fermer' : 'Lancer le sélecteur Jouer'}
            </button>
            <button className="btn btn-outline" onClick={async () => { const r = await healTamagotchi(); addToast(r.error ?? '💊 Soigné !', r.error ? 'error' : 'success') }}>
              💊 Soigner
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'rgba(239,68,68,.4)', color: 'var(--red)' }}
              onClick={async () => { const r = await reviveTamagotchi(); addToast(r.error ?? '🔄 Réincarné !', r.error ? 'error' : 'success') }}>
              🔄 Réincarner (si mort)
            </button>
          </div>

          {showFeedGame && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: '.75rem' }}>Jeu Nourrir (stage : {gameStage})</div>
              <GameStageSelector gameStage={gameStage} setGameStage={setGameStage} />
              <MiniGame
                stage={gameStage} feedMode
                onFinish={async score => {
                  const r = await feedTamagotchi(score)
                  addToast(r.error ?? `🥩 Nourri ! -${Math.min(60, Math.max(20, 10 + Math.round(score * 3)))} faim`, r.error ? 'error' : 'success')
                  setShowFeedGame(false)
                }}
                onClose={() => setShowFeedGame(false)}
              />
            </div>
          )}

          {showPlayGame && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: '.75rem' }}>Jeux Jouer (stage : {gameStage})</div>
              <GameStageSelector gameStage={gameStage} setGameStage={setGameStage} />
              <GameSelector
                stage={gameStage}
                onFinish={score => { addToast(`Score: ${score} — +${Math.max(10, Math.min(40, Math.round(score * 4)))} humeur`, 'success'); setShowPlayGame(false) }}
                onClose={() => setShowPlayGame(false)}
              />
            </div>
          )}

          <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', fontSize: '.72rem', color: 'var(--text3)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text2)' }}>Note :</strong> Les cooldowns serveur s&apos;appliquent quand même. Pour tester sans cooldown, mets <code>last_fed = NULL</code> dans Supabase.
          </div>
        </div>
      </div>
    </div>
  )
}

function GameStageSelector({ gameStage, setGameStage }: { gameStage: string; setGameStage: (s: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
      {['egg','facehugger','chestburster','xenomorph'].map(s => (
        <button key={s} onClick={() => setGameStage(s)}
          style={{ background: gameStage === s ? 'rgba(255,255,255,.1)' : 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 99, padding: '.2rem .6rem', cursor: 'pointer', color: 'var(--text2)', fontSize: '.7rem' }}>
          {s}
        </button>
      ))}
    </div>
  )
}
