'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { feedTamagotchi, playWithTamagotchi, healTamagotchi, reviveTamagotchi, nameTamagotchi } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'

// ── ASCII ART ────────────────────────────────────────────────────────────────
// Chaque entrée = [frameA, frameB] pour l'animation
const FRAMES: Record<string, string[][]> = {
  egg: [
    [
      '      _______    ',
      '     /       \\   ',
      '    | . ~~~ . |  ',
      '    | ~~~~~~~ |  ',
      '     \\_______/   ',
      '     _|_____|_   ',
    ],
    [
      '      _______    ',
      '     /       \\   ',
      '    | ~ ~~~ ~ |  ',
      '    | ~~~~~~~ |  ',
      '     \\_______/   ',
      '     _|_____|_   ',
    ],
  ],

  facehugger_happy: [
    [
      '   __/~~~~~\\__   ',
      '  /  0     0  \\  ',
      ' | /~~~~~~~~~\\ | ',
      ' |(  ~~~~~~~~~) | ',
      '  \\   -----   /  ',
      '  /|  ~~~~~  |\\ ',
      ' / |_________|  \\',
    ],
    [
      '   __/~~~~~\\__   ',
      '  /  0     0  \\  ',
      ' | /~~~~~~~~~\\ | ',
      ' |(  ~~~~~~~~~) | ',
      '  \\   -----   /  ',
      '  \\|  ~~~~~  |/ ',
      '   |_________|   ',
    ],
  ],
  facehugger_neutral: [
    [
      '   __/~~~~~\\__   ',
      '  /  -     -  \\  ',
      ' | /~~~~~~~~~\\ | ',
      ' |(  ~~~~~~~~~) | ',
      '  \\   -----   /  ',
      '  /|  ~~~~~  |\\ ',
      ' / |_________|  \\',
    ],
    [
      '   __/~~~~~\\__   ',
      '  /  -     -  \\  ',
      ' | /~~~~~~~~~\\ | ',
      ' |(  ~~~~~~~~~) | ',
      '  \\   -----   /  ',
      '  \\|  ~~~~~  |/ ',
      '   |_________|   ',
    ],
  ],
  facehugger_sad: [
    [
      '   __/~~~~~\\__   ',
      '  /  x     x  \\  ',
      ' | /~~~~~~~~~\\ | ',
      ' |(  _________) | ',
      '  \\   -----   /  ',
      '  /|  ~~~~~  |\\ ',
      ' / |_________|  \\',
    ],
    [
      '   __/~~~~~\\__   ',
      '  /  x     x  \\  ',
      ' | /~~~~~~~~~\\ | ',
      ' |(  _________) | ',
      '  \\   -----   /  ',
      '  \\|  ~~~~~  |/ ',
      '   |_________|   ',
    ],
  ],
  facehugger_dying: [
    [
      '   __/~~~~~\\__   ',
      '  /  X     X  \\  ',
      ' | /~~~~~~~~~\\ | ',
      ' |(  _________) | ',
      '  \\             /  ',
      '   \\.         ./ ',
      '    |_________|   ',
    ],
    [
      '   __/~~~~~\\__   ',
      '  /  X     X  \\  ',
      ' |  ~~~~~~~~~   | ',
      ' | (  _________)| ',
      '  \\             /  ',
      '   \\._______./  ',
      '    |_________|   ',
    ],
  ],

  chestburster_happy: [
    [
      '    /\\_____/\\    ',
      '   ( ^     ^ )   ',
      '   | ~~~~~~~ |   ',
      '   |  |||||  |   ',
      '    \\_______/    ',
    ],
    [
      '    /\\_____/\\    ',
      '   ( ^     ^ )   ',
      '   |~~~~~~~~~|   ',
      '   |  |||||  |   ',
      '    \\_______/    ',
    ],
  ],
  chestburster_neutral: [
    [
      '    /\\_____/\\    ',
      '   ( -     - )   ',
      '   | ~~~~~~~ |   ',
      '   |  |||||  |   ',
      '    \\_______/    ',
    ],
    [
      '    /\\_____/\\    ',
      '   ( -     - )   ',
      '   |~~~~~~~~~|   ',
      '   |  |||||  |   ',
      '    \\_______/    ',
    ],
  ],
  chestburster_sad: [
    [
      '    /\\_____/\\    ',
      '   ( u     u )   ',
      '   | _______ |   ',
      '   |  |||||  |   ',
      '    \\_______/    ',
    ],
    [
      '    /\\_____/\\    ',
      '   ( u     u )   ',
      '   |_________|   ',
      '   |  |||||  |   ',
      '    \\_______/    ',
    ],
  ],
  chestburster_dying: [
    [
      '    /\\_____/\\    ',
      '   ( X     X )   ',
      '   | _______ |   ',
      '   |         |   ',
      '    \\_______/    ',
    ],
    [
      '    /\\_____/\\    ',
      '   ( X     X )   ',
      '   |_________|   ',
      '   |         |   ',
      '    \\_______/    ',
    ],
  ],

  xenomorph_happy: [
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | o    o | | ',
      '  | |  ~~~~  | | ',
      '   \\|  |||||  |/ ',
      '    \\  _____  /  ',
      '     |_______|   ',
    ],
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | o    o | | ',
      '  | | ~~~~~~ | | ',
      '   \\|  |||||  |/ ',
      '    \\  _____  /  ',
      '     |_______|   ',
    ],
  ],
  xenomorph_neutral: [
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | -    - | | ',
      '  | |  ----  | | ',
      '   \\|  |||||  |/ ',
      '    \\  _____  /  ',
      '     |_______|   ',
    ],
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | -    - | | ',
      '  | |  ----  | | ',
      '   \\|  |||||  |/ ',
      '    \\  -----  /  ',
      '     |_______|   ',
    ],
  ],
  xenomorph_sad: [
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | x    x | | ',
      '  | |  ____  | | ',
      '   \\|  |||||  |/ ',
      '    \\         /  ',
      '     |_______|   ',
    ],
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | x    x | | ',
      '  | | ______ | | ',
      '   \\|  |||||  |/ ',
      '    \\         /  ',
      '     |_______|   ',
    ],
  ],
  xenomorph_dying: [
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | X    X | | ',
      '  | |  ____  | | ',
      '   \\|         |/ ',
      '    \\         /  ',
      '     |_______|   ',
    ],
    [
      '    __________   ',
      '   / ________ \\  ',
      '  | | X    X | | ',
      '  | | ______ | | ',
      '   \\|         |/ ',
      '    \\         /  ',
      '     |_______|   ',
    ],
  ],

  dead: [
    [
      '    __________   ',
      '   /  R.I.P.  \\  ',
      '  |   X     X  | ',
      '  |    \\   /   | ',
      '  |     \\ /    | ',
      '   \\     X    /  ',
      '    \\_________/  ',
    ],
    [
      '    __________   ',
      '   /  R.I.P.  \\  ',
      '  |   X     X  | ',
      '  |    \\   /   | ',
      '  |     X      | ',
      '   \\           /  ',
      '    \\_________/  ',
    ],
  ],
}

// ── STAGE CONFIG ────────────────────────────────────────────────────────────
const STAGE_INFO: Record<string, { label: string; desc: string; color: string }> = {
  egg: {
    label: 'Œuf',
    desc: 'Un œuf mystérieux vibrant légèrement... quelque chose se prépare à l\'intérieur.',
    color: '#a78bfa',
  },
  facehugger: {
    label: 'Facehugger',
    desc: 'Il cherche un hôte. Ses doigts griffent doucement l\'air.',
    color: '#86efac',
  },
  chestburster: {
    label: 'Chestburster',
    desc: 'Il a trouvé son chemin... depuis l\'intérieur. Bienvenue dans le monde, petit monstre.',
    color: '#f97316',
  },
  xenomorph: {
    label: 'Xénomorphe',
    desc: 'Parfait. Redoutable. La création parfaite de la nature. Il te reconnaît.',
    color: '#22d3ee',
  },
  dead: {
    label: 'Décédé',
    desc: 'Dans l\'espace, personne ne peut entendre ton alien pleurer.',
    color: '#6b7280',
  },
}

// ── MOOD ────────────────────────────────────────────────────────────────────
function getMood(pet: any): 'happy' | 'neutral' | 'sad' | 'dying' {
  if (pet.stage === 'dead') return 'dying'
  if (pet.health < 15) return 'dying'
  if (pet.hunger > 70 || pet.happiness < 30 || pet.health < 30) return 'sad'
  if (pet.hunger < 40 && pet.happiness > 60 && pet.health > 70) return 'happy'
  return 'neutral'
}

function getFrameKey(pet: any): string {
  if (pet.stage === 'dead') return 'dead'
  const mood = getMood(pet)
  const key = `${pet.stage}_${mood}`
  return FRAMES[key] ? key : `${pet.stage}_neutral`
}

function formatCooldown(ms: number): string {
  if (ms <= 0) return ''
  const min = Math.ceil(ms / 60000)
  if (min < 60) return `${min}m`
  return `${Math.ceil(min / 60)}h`
}

function formatAge(hours: number): string {
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const h = hours % 24
  return h > 0 ? `${days}j ${h}h` : `${days}j`
}

// ── STAT BAR ────────────────────────────────────────────────────────────────
function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const pct = Math.max(0, Math.min(100, value))
  const dangerColor = pct < 25 ? '#ef4444' : color
  return (
    <div style={{ marginBottom: '.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem', fontSize: '.75rem' }}>
        <span style={{ color: 'var(--text2)' }}>{icon} {label}</span>
        <span style={{ color: dangerColor, fontWeight: 600 }}>{pct}<span style={{ color: 'var(--text3)', fontWeight: 400 }}>/100</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pct < 25 ? '#ef4444' : color,
          borderRadius: 99, transition: 'width .4s ease',
        }} />
      </div>
    </div>
  )
}

// ── EVOLUTION OVERLAY ───────────────────────────────────────────────────────
function EvolveOverlay({ stage, onClose }: { stage: string; onClose: () => void }) {
  const info = STAGE_INFO[stage]
  const msgs: Record<string, string> = {
    facehugger: "L'œuf s'ouvre lentement... et quelque chose en sort.",
    chestburster: '💥 AAAGH ! Il sort de sa cage thoracique !',
    xenomorph: 'Il est adulte. Et il te regarde.',
  }
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,10,5,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    }}>
      <div style={{ textAlign: 'center', padding: '0 2rem', maxWidth: 560, animation: 'ee-rule-in .35s ease' }}>
        <div style={{ fontSize: 'clamp(3rem,10vw,6rem)', lineHeight: 1, marginBottom: '1rem', filter: `drop-shadow(0 0 30px ${info?.color ?? '#22d3ee'})` }}>
          🤍
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem,5vw,2.5rem)', color: info?.color ?? '#22d3ee', textShadow: `0 0 40px ${info?.color}88`, lineHeight: 1.2, marginBottom: '.8rem' }}>
          {info?.label ?? stage}
        </div>
        <div style={{ fontSize: 'clamp(.9rem,2.5vw,1.1rem)', color: 'rgba(255,255,255,.8)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          {msgs[stage] ?? `Ton alien a évolué vers : ${info?.label}`}
        </div>
        <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.4)' }}>Cliquer pour continuer</div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
interface Props {
  initialPet: any
  evolved: boolean
  evolvedTo: string | null
  isNew: boolean
}

export default function TamagotchiClient({ initialPet, evolved, evolvedTo, isNew }: Props) {
  const [pet, setPet]           = useState(initialPet)
  const [tick, setTick]         = useState(0)
  const [now, setNow]           = useState(Date.now())
  const [loading, setLoading]   = useState<string | null>(null)
  const [evolveStage, setEvolveStage] = useState<string | null>(evolved && evolvedTo ? evolvedTo : null)
  const [naming, setNaming]     = useState(false)
  const [nameInput, setNameInput] = useState(initialPet?.name ?? 'Xeno')
  const { addToast }            = useToast()
  const router                  = useRouter()

  // Animation
  useEffect(() => {
    const id = setInterval(() => setTick(t => 1 - t), 800)
    return () => clearInterval(id)
  }, [])

  // Cooldown timer refresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  // Show "new tamagotchi" toast
  useEffect(() => {
    if (isNew) addToast('Ton facehugger est né ! Prends-en soin. 🤍', 'success')
  }, []) // eslint-disable-line

  const feedCd  = pet?.last_fed    ? Math.max(0, 30 * 60_000 - (now - new Date(pet.last_fed).getTime()))    : 0
  const playCd  = pet?.last_played ? Math.max(0, 20 * 60_000 - (now - new Date(pet.last_played).getTime())) : 0
  const healCd  = pet?.last_healed ? Math.max(0, 60 * 60_000 - (now - new Date(pet.last_healed).getTime())) : 0

  const mood = pet ? getMood(pet) : 'neutral'
  const frameKey = pet ? getFrameKey(pet) : 'egg'
  const frames = FRAMES[frameKey] ?? FRAMES['egg']
  const currentFrame = frames[tick % frames.length]
  const stageInfo = STAGE_INFO[pet?.stage ?? 'egg']

  const handleAction = useCallback(async (
    action: () => Promise<{ data: any; error: string | null }>,
    actionName: string
  ) => {
    setLoading(actionName)
    const res = await action()
    setLoading(null)
    if (res.error) {
      addToast(res.error, 'error')
    } else if (res.data) {
      const prev = pet?.stage
      setPet(res.data)
      if (res.data.stage !== prev && res.data.stage !== 'dead') {
        setEvolveStage(res.data.stage)
      } else if (res.data.stage === 'dead' && prev !== 'dead') {
        addToast('💀 Ton alien est mort...', 'error')
      }
    }
  }, [pet, addToast])

  async function handleName() {
    const res = await nameTamagotchi(nameInput)
    if (res.error) { addToast(res.error, 'error'); return }
    setPet((p: any) => ({ ...p, name: nameInput }))
    setNaming(false)
    addToast('Nom sauvegardé !', 'success')
  }

  if (!pet) return (
    <div className="empty">Erreur lors du chargement du tamagotchi.</div>
  )

  const isDead = pet.stage === 'dead'
  const screenColor = isDead ? '#4b5563' : stageInfo?.color ?? '#22d3ee'

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', paddingBottom: '3rem' }}>

      {/* Evolution overlay */}
      {evolveStage && <EvolveOverlay stage={evolveStage} onClose={() => setEvolveStage(null)} />}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>
          Alien Tamagotchi
        </div>
        <div style={{ color: 'var(--text3)', fontSize: '.8rem', marginTop: '.3rem' }}>
          Âge : {formatAge(pet.age_hours)} · {pet.deaths > 0 ? `${pet.deaths} mort${pet.deaths > 1 ? 's' : ''}` : 'Jamais mort'}
        </div>
      </div>

      {/* Tamagotchi Screen */}
      <div style={{
        background: 'var(--bg2)',
        border: `2px solid ${screenColor}44`,
        borderRadius: 'var(--rl)',
        boxShadow: `0 0 30px ${screenColor}22, inset 0 0 20px rgba(0,0,0,.3)`,
        padding: '1.5rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}>
        {/* Pet name */}
        <div style={{ marginBottom: '.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
          {naming ? (
            <>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={20}
                autoFocus
                style={{
                  background: 'var(--bg3)', border: `1px solid ${screenColor}66`,
                  borderRadius: 6, padding: '.2rem .6rem', color: 'var(--text)',
                  fontFamily: 'var(--font-display)', fontSize: '.9rem', textAlign: 'center',
                  width: 140,
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleName(); if (e.key === 'Escape') setNaming(false) }}
              />
              <button onClick={handleName} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color: screenColor }}>✓</button>
              <button onClick={() => setNaming(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color: 'var(--text3)' }}>✕</button>
            </>
          ) : (
            <>
              <span
                style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: screenColor, cursor: 'pointer' }}
                onClick={() => setNaming(true)}
                title="Cliquer pour renommer"
              >
                {pet.name}
              </span>
              <span
                style={{ fontSize: '.65rem', color: 'var(--text3)', cursor: 'pointer' }}
                onClick={() => setNaming(true)}
              >✏️</span>
            </>
          )}
        </div>

        {/* ASCII art */}
        <div style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 'clamp(.65rem, 2vw, .8rem)',
          lineHeight: 1.45,
          color: isDead ? '#6b7280' : screenColor,
          textShadow: isDead ? 'none' : `0 0 8px ${screenColor}66`,
          margin: '0 auto',
          display: 'inline-block',
          textAlign: 'left',
        }}>
          {currentFrame.map((line, i) => (
            <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>
          ))}
        </div>

        {/* Stage label + desc */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            display: 'inline-block', fontSize: '.7rem', fontWeight: 600,
            color: screenColor, border: `1px solid ${screenColor}44`,
            borderRadius: 99, padding: '2px 10px', marginBottom: '.4rem',
          }}>
            {stageInfo?.label ?? pet.stage}
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.5, padding: '0 .5rem' }}>
            {stageInfo?.desc}
          </div>
        </div>

        {/* Mood indicator */}
        {!isDead && (
          <div style={{ marginTop: '.5rem', fontSize: '.75rem', color: 'var(--text3)' }}>
            {mood === 'happy'   && '😊 Content'}
            {mood === 'neutral' && '😐 Neutre'}
            {mood === 'sad'     && '😔 Malheureux'}
            {mood === 'dying'   && '😰 En danger !'}
          </div>
        )}
      </div>

      {/* Stats */}
      {!isDead && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem 1.2rem', marginBottom: '1.2rem' }}>
          <StatBar label="Faim"   value={100 - pet.hunger}    color="#f97316" icon="🥩" />
          <StatBar label="Humeur" value={pet.happiness}        color="#a78bfa" icon="😊" />
          <StatBar label="Santé"  value={pet.health}           color="#22d3ee" icon="❤️" />
        </div>
      )}

      {/* Actions */}
      {isDead ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text3)', fontSize: '.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            Dans l&apos;espace, personne ne peut entendre ton alien pleurer.
            <br />
            <span style={{ color: 'var(--text3)', fontSize: '.75rem' }}>Morts précédentes : {pet.deaths}</span>
          </div>
          <button
            className="btn btn-gold"
            disabled={loading === 'revive'}
            onClick={() => handleAction(reviveTamagotchi, 'revive')}
          >
            {loading === 'revive' ? '⏳' : '🔄 Réincarner'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
          {/* Nourrir */}
          <button
            className="btn btn-outline"
            disabled={loading === 'feed' || feedCd > 0}
            onClick={() => handleAction(feedTamagotchi, 'feed')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}
          >
            <span style={{ fontSize: '1.4rem' }}>🥩</span>
            <span style={{ fontSize: '.75rem' }}>Nourrir</span>
            {feedCd > 0 && <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{formatCooldown(feedCd)}</span>}
          </button>

          {/* Jouer */}
          <button
            className="btn btn-outline"
            disabled={loading === 'play' || playCd > 0}
            onClick={() => handleAction(playWithTamagotchi, 'play')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}
          >
            <span style={{ fontSize: '1.4rem' }}>🎮</span>
            <span style={{ fontSize: '.75rem' }}>Jouer</span>
            {playCd > 0 && <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{formatCooldown(playCd)}</span>}
          </button>

          {/* Soigner */}
          {pet.health < 80 && (
            <button
              className="btn btn-outline"
              disabled={loading === 'heal' || healCd > 0}
              onClick={() => handleAction(healTamagotchi, 'heal')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}
            >
              <span style={{ fontSize: '1.4rem' }}>💊</span>
              <span style={{ fontSize: '.75rem' }}>Soigner</span>
              {healCd > 0 && <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{formatCooldown(healCd)}</span>}
            </button>
          )}
        </div>
      )}

      {/* Footer info */}
      <div style={{ marginTop: '1.5rem', padding: '.75rem 1rem', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border2)', fontSize: '.72rem', color: 'var(--text3)', lineHeight: 1.7 }}>
        💡 Nourris-le toutes les ~6h, joue avec lui toutes les ~4h. S&apos;il est trop affamé ou malheureux, sa santé diminue. S&apos;il meurt, tu peux le réincarner — mais son compteur de morts augmente.
      </div>
    </div>
  )
}
