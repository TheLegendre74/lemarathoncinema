'use client'
import { useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Attack = 'left' | 'right' | 'body'
type Phase =
  | 'intro' | 'idle' | 'telegraph' | 'attack'
  | 'dodged' | 'counter' | 'countered'
  | 'miss' | 'starpunch' | 'down' | 'win' | 'lose'

interface Props {
  onWin:  () => void
  onLose: () => void
  initialHP?: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DODGE_FOR: Record<Attack, string> = {
  left:  'right',
  right: 'left',
  body:  'down',
}

const ATTACK_LABEL: Record<Attack, string> = {
  left:  '🥊 CROCHET GAUCHE',
  right: '🥊 CROCHET DROIT',
  body:  '💥 DIRECT AU CORPS',
}

const TAUNT_IDLE = [
  'Veux-tu de l\'aide pour PERDRE ?',
  'J\'ai vu ta technique. Passionnant.',
  'Depuis 1997 je bats des gens. Toi aussi.',
  'Je vais juste... ça. Regarde bien.',
  'Tu sembles déterminé. C\'est mignon.',
  'Mon jab droit a une précision de 97,4 %.',
  'Prêt ? Non. Mais c\'est sans importance.',
]

const TAUNT_HIT = [
  'Aide détectée. Origine : un poing dans ta face.',
  'Il semblerait que tu aies besoin d\'aide. AIDE ÇA.',
  'Même Word t\'a mieux traité.',
  'Erreur critique. Origine : toi.',
  'Tu veux que je reformate ta stratégie ?',
]

const TAUNT_COUNTER = [
  '... Note mentale.',
  'Bien. BIEN. Ça ne changera rien.',
  'Tu esquives ? Intéressant. Notoire.',
  'Je reconnais ta valeur. Elle est faible.',
]

const TAUNT_STARPUNCH = [
  '!!! DONNÉES CORROMPUES !!!',
  'CE N\'EST PAS DANS LE MANUEL.',
  'ERREUR FATALE — ORIGINE : L\'ÉTOILE',
  'OH. OH NON.',
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function ClippyPunchOut({ onWin, onLose, initialHP = 20 }: Props) {

  // ── Render state (only for display) ─────────────────────────────────────────
  const [phase,         setPhase]         = useState<Phase>('intro')
  const [playerHP,      setPlayerHP]      = useState(20)
  const [clippyHP,      setClippyHP]      = useState(initialHP)
  const [stars,         setStars]         = useState(0)
  const [message,       setMessage]       = useState('ROUND 1 — EN GARDE !')
  const [telPct,        setTelPct]        = useState(0)   // telegraph bar 0→1
  const [attack,        setAttack]        = useState<Attack | null>(null)
  const [screenFlash,   setScreenFlash]   = useState('')
  const [clippyShake,   setClippyShake]   = useState(false)
  const [playerShake,   setPlayerShake]   = useState(false)
  const [armLunge,      setArmLunge]      = useState<Attack | null>(null) // which arm is lunging
  const [introStep,     setIntroStep]     = useState(0)

  // ── Game refs (mutable, don't trigger renders) ───────────────────────────────
  const phaseRef      = useRef<Phase>('intro')
  const playerHPRef   = useRef(20)
  const clippyHPRef   = useRef(initialHP)
  const starsRef      = useRef(0)
  const attackRef     = useRef<Attack | null>(null)
  const hitDoneRef    = useRef(false)  // player already reacted this window
  const onWinRef      = useRef(onWin)
  const onLoseRef     = useRef(onLose)

  useEffect(() => { onWinRef.current  = onWin  }, [onWin])
  useEffect(() => { onLoseRef.current = onLose }, [onLose])

  // ── Game engine (single effect, all logic inside) ───────────────────────────
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>
    let t3: ReturnType<typeof setTimeout>
    let raf: number

    const set = (p: Phase) => { phaseRef.current = p; setPhase(p) }
    const msg = (m: string) => setMessage(m)
    const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    const dead = () => phaseRef.current === 'win' || phaseRef.current === 'lose'

    function flash(color: string, ms = 180) {
      setScreenFlash(color)
      setTimeout(() => setScreenFlash(''), ms)
    }

    function shakeClipy(ms = 400) {
      setClippyShake(true)
      setTimeout(() => setClippyShake(false), ms)
    }

    function shakePlayer(ms = 400) {
      setPlayerShake(true)
      setTimeout(() => setPlayerShake(false), ms)
    }

    // ── Win / Lose ─────────────────────────────────────────────────────────

    function doWin() {
      set('win')
      msg('K.O. !!!! CLIPPY EST À TERRE !')
      flash('#44ff88', 600)
      t1 = setTimeout(() => onWinRef.current(), 2200)
    }

    function doLose() {
      set('lose')
      msg('KNOCKOUT ! Clippy vous recommande de vous relever.')
      flash('#ff2222', 600)
      t1 = setTimeout(() => onLoseRef.current(), 2200)
    }

    // ── Idle ────────────────────────────────────────────────────────────────

    function idle() {
      if (dead()) return
      set('idle')
      msg(rand(TAUNT_IDLE))
      t1 = setTimeout(() => telegraph(), 1400 + Math.random() * 1800)
    }

    // ── Telegraph ───────────────────────────────────────────────────────────

    function telegraph() {
      if (dead()) return
      const atk: Attack = (['left','right','body'] as Attack[])[Math.floor(Math.random() * 3)]
      attackRef.current = atk
      setAttack(atk)
      set('telegraph')
      msg(ATTACK_LABEL[atk] + ' — ' + (atk === 'left' ? '→ D' : atk === 'right' ? '← A' : '↓ S'))

      const dur = 1800  // ms de preview
      let start = 0
      const animBar = (ts: number) => {
        if (!start) start = ts
        const pct = Math.min(1, (ts - start) / dur)
        setTelPct(pct)
        if (pct < 1 && phaseRef.current === 'telegraph') raf = requestAnimationFrame(animBar)
      }
      raf = requestAnimationFrame(animBar)

      t1 = setTimeout(() => doAttack(), dur)
    }

    // ── Attack window ────────────────────────────────────────────────────────

    function doAttack() {
      if (dead()) return
      cancelAnimationFrame(raf)
      hitDoneRef.current = false
      set('attack')
      msg('⚡ ESQUIVEZ !')
      setArmLunge(attackRef.current)

      // bar countdown during attack window
      const WIN_MS = 420
      let start = 0
      const animBar = (ts: number) => {
        if (!start) start = ts
        const pct = Math.min(1, (ts - start) / WIN_MS)
        setTelPct(1 - pct)
        if (pct < 1 && phaseRef.current === 'attack') raf = requestAnimationFrame(animBar)
      }
      raf = requestAnimationFrame(animBar)

      t1 = setTimeout(() => {
        setArmLunge(null)
        if (!hitDoneRef.current) onPlayerHit()
      }, WIN_MS)
    }

    // ── Player got hit (missed dodge) ────────────────────────────────────────

    function onPlayerHit() {
      if (dead()) return
      set('miss')
      flash('#ff1111')
      shakePlayer()
      msg(rand(TAUNT_HIT))
      const dmg = 4 + Math.floor(Math.random() * 3)
      playerHPRef.current = Math.max(0, playerHPRef.current - dmg)
      setPlayerHP(playerHPRef.current)
      if (playerHPRef.current <= 0) {
        t1 = setTimeout(() => doLose(), 600)
        return
      }
      t1 = setTimeout(() => idle(), 1100)
    }

    // ── Player dodged ────────────────────────────────────────────────────────

    function onDodge() {
      if (dead()) return
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      hitDoneRef.current = true
      setArmLunge(null)
      set('dodged')
      flash('#44ff88', 200)
      msg('✅ ESQUIVÉ ! Contre-attaque !')

      // earn 1 star
      const s = Math.min(3, starsRef.current + 1)
      starsRef.current = s
      setStars(s)

      // open counter window
      t2 = setTimeout(() => {
        if (dead()) return
        set('counter')
        msg('🥊 CONTRE ! (J / Espace)')
      }, 180)

      // close counter window if no input
      t3 = setTimeout(() => {
        if (phaseRef.current === 'counter') {
          msg(rand(TAUNT_COUNTER))
          setTimeout(() => idle(), 500)
        }
      }, 680)
    }

    // ── Player counter-punch ─────────────────────────────────────────────────

    function onCounter() {
      if (dead()) return
      clearTimeout(t3)
      set('countered')
      flash('#ffee22', 250)
      shakeClipy()
      msg('💥 TOUCHÉ !')
      const dmg = 3
      clippyHPRef.current = Math.max(0, clippyHPRef.current - dmg)
      setClippyHP(clippyHPRef.current)
      if (clippyHPRef.current <= 0) {
        t1 = setTimeout(() => doWin(), 500)
        return
      }
      t1 = setTimeout(() => idle(), 850)
    }

    // ── Star punch ───────────────────────────────────────────────────────────

    function onStarPunch() {
      if (starsRef.current < 3 || dead()) return
      starsRef.current = 0
      setStars(0)
      set('starpunch')
      flash('#ffffff', 350)
      shakeClipy(700)
      msg(rand(TAUNT_STARPUNCH))
      const dmg = 8
      clippyHPRef.current = Math.max(0, clippyHPRef.current - dmg)
      setClippyHP(clippyHPRef.current)
      if (clippyHPRef.current <= 0) {
        t1 = setTimeout(() => doWin(), 600)
        return
      }
      t1 = setTimeout(() => idle(), 1400)
    }

    // ── Keyboard ─────────────────────────────────────────────────────────────

    function handleKey(e: KeyboardEvent) {
      const code = e.code
      if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyA','KeyD','KeyS','KeyJ','KeyW'].includes(code)) {
        e.preventDefault()
      }

      const p = phaseRef.current
      const atk = attackRef.current

      // Star punch: Space or J during idle (when 3 stars)
      if ((code === 'Space' || code === 'KeyJ') && p === 'idle' && starsRef.current >= 3) {
        onStarPunch(); return
      }
      // Also star punch when pressed during dodged/counter state
      if ((code === 'Space' || code === 'KeyJ') && p === 'starpunch') return

      // Counter
      if ((code === 'Space' || code === 'KeyJ' || code === 'ArrowUp' || code === 'KeyW') && p === 'counter') {
        onCounter(); return
      }

      // Dodge
      if ((p === 'telegraph' || p === 'attack') && atk && !hitDoneRef.current) {
        let pressed: string | null = null
        if (code === 'ArrowLeft' || code === 'KeyA')  pressed = 'left'
        if (code === 'ArrowRight' || code === 'KeyD') pressed = 'right'
        if (code === 'ArrowDown' || code === 'KeyS')  pressed = 'down'
        if (!pressed) return

        const correct = DODGE_FOR[atk]
        if (pressed === correct && p === 'attack') {
          onDodge()
        } else if (pressed !== correct && p === 'attack') {
          // Wrong dodge
          hitDoneRef.current = true
          clearTimeout(t1); cancelAnimationFrame(raf)
          setArmLunge(null)
          onPlayerHit()
        }
        // During telegraph: early input ignored (must wait for attack phase)
      }
    }

    window.addEventListener('keydown', handleKey)

    // ── Intro sequence ───────────────────────────────────────────────────────
    const introLines = [
      'PHASE 3 — LE RING',
      'Clippy refuse de mourir dignement.',
      'Esquivez au bon moment → contre-attaquez',
      '3 esquives = ⭐⭐⭐ = UPPERCUT ÉTOILE',
    ]
    let iStep = 0
    setIntroStep(0)
    const nextIntro = () => {
      iStep++
      if (iStep < introLines.length) {
        setIntroStep(iStep)
        msg(introLines[iStep])
        t1 = setTimeout(nextIntro, 1800)
      } else {
        idle()
      }
    }
    msg(introLines[0])
    t1 = setTimeout(nextIntro, 1800)

    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      cancelAnimationFrame(raf)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived display values ───────────────────────────────────────────────────
  const playerHPPct = Math.round((playerHP / 20) * 100)
  const clippyHPPct = Math.round((clippyHP  / initialHP) * 100)

  const armLeftGlow  = (attack === 'left'  && (phase === 'telegraph' || phase === 'attack'))
  const armRightGlow = (attack === 'right' && (phase === 'telegraph' || phase === 'attack'))
  const bodyGlow     = (attack === 'body'  && (phase === 'telegraph' || phase === 'attack'))

  const controls: { label: string; key: string; active: boolean }[] = [
    { label: '← A',  key: 'Esquive gauche',  active: phase === 'attack' && attack === 'right' },
    { label: '↓ S',  key: 'Baisser tête',    active: phase === 'attack' && attack === 'body'  },
    { label: '→ D',  key: 'Esquive droite',  active: phase === 'attack' && attack === 'left'  },
    { label: '⎵ J',  key: 'Contre / Étoile', active: phase === 'counter' || (phase === 'idle' && stars >= 3) },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99990,
      background: '#060610',
      backgroundImage: 'url(/arene-clippy-03.png)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: '"Courier New", Courier, monospace',
      overflow: 'hidden', userSelect: 'none',
    }}>

      {/* Screen flash overlay */}
      {screenFlash && (
        <div style={{ position: 'absolute', inset: 0, background: screenFlash, opacity: 0.4, zIndex: 1, pointerEvents: 'none', transition: 'opacity 0.1s' }} />
      )}

      {/* ── TOP: HP bars ─────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 580, padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 10, zIndex: 2 }}>
        {/* Player HP */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#fff', marginBottom: 3, textShadow: '1px 1px 0 #000', letterSpacing: 1 }}>❤️ VOUS</div>
          <div style={{ height: 14, background: '#1a1a2e', border: '2px solid #000', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${playerHPPct}%`,
              background: playerHPPct > 50 ? '#22cc55' : playerHPPct > 25 ? '#ffaa00' : '#ff3322',
              transition: 'width .25s, background .3s',
            }} />
          </div>
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', gap: 2, padding: '0 4px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ fontSize: 16, opacity: i < stars ? 1 : 0.18, filter: i < stars ? 'drop-shadow(0 0 6px #ffcc00)' : 'none', transition: 'opacity .2s, filter .2s' }}>⭐</span>
          ))}
        </div>

        {/* Clippy HP */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#fff', marginBottom: 3, textAlign: 'right', textShadow: '1px 1px 0 #000', letterSpacing: 1 }}>📎 CLIPPY</div>
          <div style={{ height: 14, background: '#1a1a2e', border: '2px solid #000', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${clippyHPPct}%`,
              background: '#e85a5a', float: 'right',
              transition: 'width .25s',
            }} />
          </div>
        </div>
      </div>

      {/* ── Telegraph / attack timing bar ────────────────────── */}
      <div style={{ width: '100%', maxWidth: 580, height: 8, margin: '8px 16px 0', background: '#111', overflow: 'hidden', zIndex: 2 }}>
        <div style={{
          height: '100%', width: `${telPct * 100}%`,
          background: phase === 'telegraph' ? '#ffaa00'
                    : phase === 'attack'    ? '#ff4422'
                    : 'transparent',
          transition: 'background .15s',
        }} />
      </div>

      {/* ── CLIPPY CHARACTER ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', width: '100%', zIndex: 2,
      }}>
        {/* LEFT ARM */}
        <div style={{
          position: 'absolute', left: '8%',
          fontSize: 'clamp(50px, 10vw, 80px)',
          transform: armLunge === 'left' ? 'translateX(60px) rotate(-25deg) scale(1.15)' : 'rotate(0deg)',
          transition: 'transform 0.12s ease-in',
          filter: armLeftGlow
            ? 'drop-shadow(0 0 18px #ff6600) drop-shadow(0 0 8px #ff9900)'
            : armLunge === 'left' ? 'drop-shadow(0 0 12px #ff2200)' : 'none',
        }}>🥊</div>

        {/* CLIPPY BODY */}
        <div style={{
          fontSize: 'clamp(100px, 22vw, 180px)',
          transform: clippyShake
            ? `translateX(${Math.random() > .5 ? 20 : -20}px) rotate(${Math.random() > .5 ? 8 : -8}deg)`
            : phase === 'down' ? 'rotate(90deg) translateY(80px)'
            : 'none',
          transition: clippyShake ? 'none' : 'transform .4s ease-out',
          animation: phase === 'idle' ? 'clippy-bob 0.9s ease-in-out infinite' : 'none',
          filter:
            phase === 'win'    ? 'drop-shadow(0 0 40px #44ff88)' :
            bodyGlow           ? 'drop-shadow(0 0 24px #ff4400) drop-shadow(0 0 10px #ffaa00)' :
            phase === 'starpunch' ? 'drop-shadow(0 0 40px #ffffff)' :
            armLunge === 'body' ? 'drop-shadow(0 0 16px #ff2200)' :
            'drop-shadow(0 2px 8px rgba(0,0,0,.8))',
        }}>📎</div>

        {/* RIGHT ARM */}
        <div style={{
          position: 'absolute', right: '8%',
          fontSize: 'clamp(50px, 10vw, 80px)',
          transform: armLunge === 'right'
            ? 'translateX(-60px) rotate(25deg) scale(1.15) scaleX(-1)'
            : 'scaleX(-1)',
          transition: 'transform 0.12s ease-in',
          filter: armRightGlow
            ? 'drop-shadow(0 0 18px #ff6600) drop-shadow(0 0 8px #ff9900)'
            : armLunge === 'right' ? 'drop-shadow(0 0 12px #ff2200)' : 'none',
        }}>🥊</div>
      </div>

      {/* ── Message box ──────────────────────────────────────── */}
      <div style={{
        padding: '10px 20px', margin: '0 16px',
        background: 'rgba(5,5,18,.9)', border: '2px solid rgba(255,255,255,.12)',
        borderRadius: 8, color: '#fff', fontSize: 'clamp(10px, 2.5vw, 14px)',
        textAlign: 'center', maxWidth: 520, width: '90%',
        zIndex: 2, letterSpacing: 0.5,
        boxShadow: '0 4px 20px rgba(0,0,0,.6)',
      }}>
        {message}
      </div>

      {/* ── Control hints ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px', zIndex: 2 }}>
        {controls.map(c => (
          <div key={c.label} style={{
            textAlign: 'center', padding: '6px 10px',
            background: c.active ? 'rgba(255,215,0,.2)' : 'rgba(0,0,0,.65)',
            border: `2px solid ${c.active ? '#ffd700' : 'rgba(255,255,255,.12)'}`,
            borderRadius: 6, transition: 'all .15s',
            boxShadow: c.active ? '0 0 14px #ffd70066' : 'none',
          }}>
            <div style={{ fontSize: 'clamp(11px, 2.5vw, 15px)', color: c.active ? '#ffd700' : '#fff', fontWeight: 700 }}>{c.label}</div>
            <div style={{ fontSize: 8, color: c.active ? '#ffd700' : '#666', marginTop: 2 }}>{c.key}</div>
          </div>
        ))}
      </div>

      {/* ── Win / Lose overlay ────────────────────────────────── */}
      {(phase === 'win' || phase === 'lose') && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.82)', zIndex: 10,
        }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>{phase === 'win' ? '🏆' : '💀'}</div>
          <div style={{ fontSize: 'clamp(20px, 5vw, 32px)', color: phase === 'win' ? '#44ff88' : '#ff4444', textShadow: '2px 2px 0 #000', letterSpacing: 2 }}>
            {phase === 'win' ? 'K.O. !' : 'KNOCKOUT !'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes clippy-bob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%       { transform: translateY(-18px) rotate(2deg); }
        }
      `}</style>
    </div>
  )
}
