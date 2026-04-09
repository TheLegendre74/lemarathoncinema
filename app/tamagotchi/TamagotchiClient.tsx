'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { feedTamagotchi, playWithTamagotchi, healTamagotchi, reviveTamagotchi, nameTamagotchi, caresserTamagotchi } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { useWidgetEnabled } from '@/components/TamagotchiWidget'
import { TAMA_FRAMES, STAGE_COLORS, getTamaFrameKey } from '@/lib/tamaFrames'
import MiniGame from './MiniGame'
import GameSelector from './GameSelector'

const STAGE_INFO: Record<string, { label: string; desc: string }> = {
  egg:          { label: 'Œuf',          desc: "Un œuf mystérieux vibrant légèrement… quelque chose se prépare à l'intérieur." },
  facehugger:   { label: 'Facehugger',   desc: "Il cherche un hôte. Ses doigts griffent doucement l'air." },
  chestburster: { label: 'Chestburster', desc: "Il a trouvé son chemin… depuis l'intérieur. Bienvenue dans le monde, petit monstre." },
  xenomorph:    { label: 'Xénomorphe',   desc: 'Parfait. Redoutable. La création parfaite de la nature. Il te reconnaît.' },
  dead:         { label: 'Décédé',       desc: "Dans l'espace, personne ne peut entendre ton alien pleurer." },
}

function fmtCooldown(ms: number): string {
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3_600_000)
  const m = Math.ceil((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`
}

function fmtAge(h: number): string {
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); const r = h % 24
  return r > 0 ? `${d}j ${r}h` : `${d}j`
}

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div style={{ marginBottom: '.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem', fontSize: '.75rem' }}>
        <span style={{ color: 'var(--text2)' }}>{icon} {label}</span>
        <span style={{ color: pct < 25 ? '#ef4444' : color, fontWeight: 600 }}>{pct}<span style={{ color: 'var(--text3)', fontWeight: 400 }}>/100</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct < 25 ? '#ef4444' : color, borderRadius: 99, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

function EvolveOverlay({ stage, onClose }: { stage: string; onClose: () => void }) {
  const info = STAGE_INFO[stage]
  const color = STAGE_COLORS[stage] ?? '#22d3ee'
  const msgs: Record<string, string> = {
    facehugger:   "L'œuf s'ouvre lentement… et quelque chose en sort.",
    chestburster: '💥 AAAGH ! Il sort de sa cage thoracique !',
    xenomorph:    'Il est adulte. Et il te regarde.',
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,10,5,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center', padding: '0 2rem', maxWidth: 560, animation: 'ee-rule-in .35s ease' }}>
        <div style={{ fontSize: 'clamp(3rem,10vw,6rem)', lineHeight: 1, marginBottom: '1rem', filter: `drop-shadow(0 0 30px ${color})` }}>🤍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem,5vw,2.5rem)', color, textShadow: `0 0 40px ${color}88`, lineHeight: 1.2, marginBottom: '.8rem' }}>
          {info?.label ?? stage}
        </div>
        <div style={{ fontSize: 'clamp(.9rem,2.5vw,1.1rem)', color: 'rgba(255,255,255,.8)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          {msgs[stage] ?? `Évolution : ${info?.label}`}
        </div>
        <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.4)' }}>Cliquer pour continuer</div>
      </div>
    </div>
  )
}

// Floating hearts animation for caresser
function FloatingHearts({ visible }: { visible: boolean }) {
  if (!visible) return null
  const hearts = ['❤️', '💜', '💙', '🤍', '❤️', '💚']
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {hearts.map((h, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${20 + (i % 5) * 15}%`,
          bottom: `${40 + Math.random() * 20}%`,
          fontSize: `${.8 + (i % 3) * .3}rem`,
          animation: `tama-heart-float ${0.8 + i * 0.15}s ease-out forwards`,
          animationDelay: `${i * 0.1}s`,
          opacity: 0,
        }}>{h}</div>
      ))}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
interface Props {
  initialPet: any
  evolved: boolean
  evolvedTo: string | null
  isNew: boolean
}

export default function TamagotchiClient({ initialPet, evolved, evolvedTo, isNew }: Props) {
  const [pet, setPet]                   = useState(initialPet)
  const [tick, setTick]                 = useState(0)
  const [now, setNow]                   = useState(Date.now())
  const [loading, setLoading]           = useState<string | null>(null)
  const [evolveStage, setEvolveStage]   = useState<string | null>(evolved && evolvedTo ? evolvedTo : null)
  const [naming, setNaming]             = useState(false)
  const [nameInput, setNameInput]       = useState(initialPet?.name ?? 'Xeno')
  const [showFeedGame, setShowFeedGame] = useState(false)
  const [showPlayGame, setShowPlayGame] = useState(false)
  const [showHearts, setShowHearts]     = useState(false)
  const [caresseAnim, setCaresseAnim]   = useState(false)
  const [widgetEnabled, setWidgetEnabled] = useWidgetEnabled()
  const { addToast }                    = useToast()
  const router                          = useRouter()

  useEffect(() => { const id = setInterval(() => setTick(t => 1 - t), 800); return () => clearInterval(id) }, [])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  useEffect(() => { if (isNew) addToast('Ton facehugger est né ! Prends-en soin. 🤍', 'success') }, []) // eslint-disable-line

  const FEED_CD = 24 * 3_600_000
  const HEAL_CD = 24 * 3_600_000

  const feedCd = pet?.last_fed    ? Math.max(0, FEED_CD - (now - new Date(pet.last_fed).getTime()))    : 0
  const healCd = pet?.last_healed ? Math.max(0, HEAL_CD - (now - new Date(pet.last_healed).getTime())) : 0

  const frameKey    = pet ? getTamaFrameKey(pet) : 'egg'
  const frames      = TAMA_FRAMES[frameKey] ?? TAMA_FRAMES['egg']
  const frame       = frames[tick % frames.length]
  const stageInfo   = STAGE_INFO[pet?.stage ?? 'egg']
  const isDead      = pet?.stage === 'dead'
  const screenColor = isDead ? '#4b5563' : (STAGE_COLORS[pet?.stage] ?? '#22d3ee')

  const moodLabel = (() => {
    if (!pet || isDead) return null
    if (pet.health < 15 || (pet.hunger > 70 && pet.happiness < 30)) return '😰 En danger !'
    if (pet.hunger > 70 || pet.happiness < 30 || pet.health < 30)   return '😔 Malheureux'
    if (pet.hunger < 40 && pet.happiness > 60 && pet.health > 70)   return '😊 Content'
    return '😐 Neutre'
  })()

  const doAction = useCallback(async (
    action: () => Promise<{ data: any; error: string | null }>,
    key: string
  ) => {
    setLoading(key)
    const res = await action()
    setLoading(null)
    if (res.error) { addToast(res.error, 'error'); return }
    if (res.data) {
      const prev = pet?.stage
      setPet(res.data)
      if (res.data.stage !== prev && res.data.stage !== 'dead') setEvolveStage(res.data.stage)
      else if (res.data.stage === 'dead' && prev !== 'dead') addToast('💀 Ton alien est mort…', 'error')
    }
  }, [pet, addToast])

  async function handleFeedFinish(score: number) {
    setShowFeedGame(false)
    await doAction(() => feedTamagotchi(score), 'feed')
  }

  async function handlePlayFinish(score: number) {
    setShowPlayGame(false)
    await doAction(() => playWithTamagotchi(score), 'play')
  }

  async function handleCaresse() {
    setCaresseAnim(true)
    setTimeout(() => {
      setShowHearts(true)
      setTimeout(() => setShowHearts(false), 1500)
      setTimeout(() => setCaresseAnim(false), 1200)
    }, 600)
    await doAction(caresserTamagotchi, 'caresse')
  }

  async function handleName() {
    const res = await nameTamagotchi(nameInput)
    if (res.error) { addToast(res.error, 'error'); return }
    setPet((p: any) => ({ ...p, name: nameInput }))
    setNaming(false)
    addToast('Nom sauvegardé !', 'success')
  }

  if (!pet) return <div className="empty">Erreur chargement.</div>

  const showingGame = showFeedGame || showPlayGame

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', paddingBottom: '3rem' }}>
      {evolveStage && <EvolveOverlay stage={evolveStage} onClose={() => setEvolveStage(null)} />}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Alien Tamagotchi</div>
        <div style={{ color: 'var(--text3)', fontSize: '.8rem', marginTop: '.3rem' }}>
          Âge : {fmtAge(pet.age_hours)} · {pet.deaths > 0 ? `${pet.deaths} mort${pet.deaths > 1 ? 's' : ''}` : 'Jamais mort'}
        </div>
      </div>

      {/* Mini-game or main screen */}
      {showFeedGame ? (
        <MiniGame stage={pet.stage} feedMode onFinish={handleFeedFinish} onClose={() => setShowFeedGame(false)} />
      ) : showPlayGame ? (
        <GameSelector stage={pet.stage} onFinish={handlePlayFinish} onClose={() => setShowPlayGame(false)} />
      ) : (
        <>
          {/* Screen */}
          <div style={{
            background: 'var(--bg2)', border: `2px solid ${screenColor}44`, borderRadius: 'var(--rl)',
            boxShadow: `0 0 30px ${screenColor}22, inset 0 0 20px rgba(0,0,0,.3)`,
            padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Name */}
            <div style={{ marginBottom: '.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
              {naming ? (
                <>
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} maxLength={20} autoFocus
                    style={{ background: 'var(--bg3)', border: `1px solid ${screenColor}66`, borderRadius: 6, padding: '.2rem .6rem', color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: '.9rem', textAlign: 'center', width: 140 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleName(); if (e.key === 'Escape') setNaming(false) }}
                  />
                  <button onClick={handleName}             style={iconBtnStyle(screenColor)}>✓</button>
                  <button onClick={() => setNaming(false)} style={iconBtnStyle('var(--text3)')}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: screenColor, cursor: 'pointer' }} onClick={() => setNaming(true)} title="Cliquer pour renommer">
                    {pet.name}
                  </span>
                  <span style={{ fontSize: '.65rem', color: 'var(--text3)', cursor: 'pointer' }} onClick={() => setNaming(true)}>✏️</span>
                </>
              )}
            </div>

            {/* ASCII + caresse overlay */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 'clamp(.65rem,2vw,.8rem)', lineHeight: 1.45, color: isDead ? '#6b7280' : screenColor, textShadow: isDead ? 'none' : `0 0 8px ${screenColor}66`, display: 'inline-block', textAlign: 'left' }}>
                {frame.map((line, i) => <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>)}
              </div>
              {/* Floating hearts */}
              <FloatingHearts visible={showHearts} />
              {/* Hand animation */}
              {caresseAnim && (
                <div style={{
                  position: 'absolute', right: '-10px', top: '30%',
                  fontSize: '1.6rem', animation: 'tama-hand-pet .6s ease-in-out',
                }}>
                  🤚
                </div>
              )}
            </div>

            {/* Stage + mood */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'inline-block', fontSize: '.7rem', fontWeight: 600, color: screenColor, border: `1px solid ${screenColor}44`, borderRadius: 99, padding: '2px 10px', marginBottom: '.4rem' }}>
                {stageInfo?.label ?? pet.stage}
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.5, padding: '0 .5rem' }}>{stageInfo?.desc}</div>
            </div>
            {moodLabel && (
              <div style={{ marginTop: '.5rem', fontSize: '.75rem', color: 'var(--text3)' }}>{moodLabel}</div>
            )}
          </div>

          {/* Stats */}
          {!isDead && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem 1.2rem', marginBottom: '1.2rem' }}>
              <StatBar label="Satiété" value={100 - pet.hunger}  color="#f97316" icon="🥩" />
              <StatBar label="Humeur"  value={pet.happiness}      color="#a78bfa" icon="😊" />
              <StatBar label="Santé"   value={pet.health}         color="#22d3ee" icon="❤️" />
            </div>
          )}

          {/* Actions */}
          {isDead ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text3)', fontSize: '.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                Dans l&apos;espace, personne ne peut entendre ton alien pleurer.<br />
                <span style={{ fontSize: '.75rem' }}>Morts : {pet.deaths}</span>
              </div>
              <button className="btn btn-gold" disabled={loading === 'revive'} onClick={() => doAction(reviveTamagotchi, 'revive')}>
                {loading === 'revive' ? '⏳' : '🔄 Réincarner'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '1.2rem' }}>
              {/* Nourrir */}
              <button className="btn btn-outline" disabled={loading === 'feed' || feedCd > 0} onClick={() => feedCd <= 0 && setShowFeedGame(true)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🥩</span>
                <span style={{ fontSize: '.75rem' }}>Nourrir</span>
                {feedCd > 0 && <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{fmtCooldown(feedCd)}</span>}
              </button>

              {/* Jouer */}
              <button className="btn btn-outline" disabled={loading === 'play'} onClick={() => setShowPlayGame(true)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎮</span>
                <span style={{ fontSize: '.75rem' }}>Jouer</span>
              </button>

              {/* Caresser */}
              <button className="btn btn-outline" disabled={loading === 'caresse'} onClick={handleCaresse}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🤚</span>
                <span style={{ fontSize: '.75rem' }}>Caresser</span>
              </button>

              {/* Soigner */}
              {pet.health < 80 && (
                <button className="btn btn-outline" disabled={loading === 'heal' || healCd > 0} onClick={() => doAction(healTamagotchi, 'heal')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>💊</span>
                  <span style={{ fontSize: '.75rem' }}>Soigner</span>
                  {healCd > 0 && <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{fmtCooldown(healCd)}</span>}
                </button>
              )}
            </div>
          )}

          {/* Widget toggle */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.8rem 1rem', marginBottom: '1.2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.7rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={widgetEnabled}
                onChange={e => setWidgetEnabled(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: screenColor }}
              />
              <div>
                <div style={{ fontSize: '.82rem', fontWeight: 500 }}>Afficher mon alien en bas à droite</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>Visible sur toutes les pages du site</div>
              </div>
            </label>
          </div>

          {/* Info */}
          <div style={{ padding: '.75rem 1rem', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border2)', fontSize: '.72rem', color: 'var(--text3)', lineHeight: 1.7 }}>
            💡 Nourris-le toutes les ~24h via le mini-jeu. Tu peux jouer avec lui et le caresser à volonté. S&apos;il est trop affamé ou malheureux, sa santé diminue.
          </div>
        </>
      )}

      <style>{`
        @keyframes tama-heart-float {
          0%   { opacity: 0; transform: translateY(0) scale(.6); }
          20%  { opacity: 1; transform: translateY(-10px) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(.8); }
        }
        @keyframes tama-hand-pet {
          0%   { transform: translateX(40px) rotate(-20deg); opacity: 0; }
          30%  { transform: translateX(0px) rotate(10deg); opacity: 1; }
          60%  { transform: translateX(-8px) rotate(-5deg); opacity: 1; }
          100% { transform: translateX(40px) rotate(-20deg); opacity: 0; }
        }
        @keyframes tama-pop-in {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function iconBtnStyle(color: string): React.CSSProperties {
  return { background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color }
}
