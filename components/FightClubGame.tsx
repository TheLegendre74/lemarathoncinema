'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'

// ── Constants ────────────────────────────────────────────────
const GW = 800, GH = 450
const GROUND = GH - 72
const GRAVITY = 0.72
const JUMP_V = -14.5
const PW = 36, PH = 54

// ── Types ─────────────────────────────────────────────────────
type CharState = 'idle' | 'walk' | 'jump' | 'punch' | 'kick' | 'combo' | 'hurt' | 'dead'

interface Char {
  x: number; y: number; vx: number; vy: number
  hp: number; maxHp: number
  onGround: boolean
  face: 1 | -1
  state: CharState; stateTimer: number
  atkCD: number; hurtInv: number
  speed: number; dmg: number
  isPlayer: boolean
  atkFrame: number   // frame when attack landed (for animation sync)
}

interface FText {
  x: number; y: number; text: string; life: number; col: string; big: boolean
}

interface GS {
  player: Char
  enemies: Char[]
  wave: number
  waveTimer: number
  cleared: boolean
  fTexts: FText[]
  over: boolean
  overTimer: number
  lastPunchFrame: number
  frame: number
  keys: Set<string>
  combo: number    // hit streak counter
  score: number
}

// ── Factory ───────────────────────────────────────────────────
function makePlayer(): Char {
  return {
    x: 80, y: GROUND - PH, vx: 0, vy: 0,
    hp: 100, maxHp: 100, onGround: true,
    face: 1, state: 'idle', stateTimer: 0,
    atkCD: 0, hurtInv: 0,
    speed: 4.5, dmg: 0, isPlayer: true, atkFrame: -1,
  }
}

function makeEnemy(x: number, wave: number): Char {
  const hp = Math.min(220, 40 + wave * 22)
  return {
    x, y: GROUND - PH, vx: 0, vy: 0,
    hp, maxHp: hp, onGround: true,
    face: -1, state: 'idle', stateTimer: 0,
    atkCD: Math.max(15, 55 - wave * 3),
    hurtInv: 0,
    speed: Math.min(3.8, 1.5 + wave * 0.38),
    dmg: Math.min(28, 8 + wave * 3),
    isPlayer: false, atkFrame: -1,
  }
}

// ── Drawing ───────────────────────────────────────────────────
function drawChar(ctx: CanvasRenderingContext2D, c: Char, frame: number) {
  if (c.hp <= 0 && c.stateTimer > 45) return

  // Invincibility flicker
  if (c.hurtInv > 0 && Math.floor(c.hurtInv / 3) % 2 === 0) return

  const { x, y, face, state, isPlayer } = c
  const hurt = state === 'hurt' || state === 'dead'
  const dead = state === 'dead'

  ctx.save()
  // Mirror for left-facing
  if (face === -1) {
    ctx.translate(x + PW, y)
    ctx.scale(-1, 1)
    ctx.translate(-x, -y)
  }

  // Colors
  const skin   = isPlayer ? '#e8c99a' : '#d4b896'
  const jacket = hurt ? '#330000' : isPlayer ? '#1d2b1d' : (c.maxHp > 100 ? '#8b1010' : '#4a4a4a')
  const pants  = isPlayer ? '#111' : '#1a1a2a'
  const hair   = isPlayer ? '#2a1810' : (c.maxHp > 100 ? '#d4a843' : '#332211')
  const shoe   = '#111'

  // Dead = lying down
  if (dead) {
    ctx.globalAlpha = Math.max(0, 1 - c.stateTimer / 45)
    ctx.fillStyle = jacket
    ctx.fillRect(x, y + 20, PW + 20, PH * 0.4)
    ctx.fillStyle = skin
    ctx.fillRect(x + PW + 10, y + 20, 14, 12)
    ctx.restore()
    return
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x + PW / 2, GROUND + 2, PW * 0.55, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Walk animation offset
  const walkT = state === 'walk' ? Math.sin(frame * 0.35) : 0

  // Legs
  ctx.fillStyle = pants
  const l1y = state === 'walk' ? Math.sin(frame * 0.35) * 4 : 0
  const l2y = state === 'walk' ? -Math.sin(frame * 0.35) * 4 : 0
  ctx.fillRect(x + 4,  y + 34 + l1y, 12, 20 - l1y)
  ctx.fillRect(x + 20, y + 34 + l2y, 12, 20 - l2y)

  // Kick leg
  if (state === 'kick' || state === 'combo') {
    ctx.fillStyle = pants
    ctx.fillRect(x + 20, y + 28, 12, 14)
    ctx.save()
    ctx.translate(x + 26, y + 42)
    ctx.rotate(0.9)
    ctx.fillRect(-6, 0, 24, 12)
    ctx.restore()
    // Shoe
    ctx.fillStyle = shoe
    ctx.save()
    ctx.translate(x + 40, y + 42)
    ctx.rotate(0.9)
    ctx.fillRect(-2, 0, 16, 8)
    ctx.restore()
  }

  // Shoes
  ctx.fillStyle = shoe
  ctx.fillRect(x + 2,  y + 50, 14, 7)
  ctx.fillRect(x + 18, y + 50, 14, 7)

  // Body
  ctx.fillStyle = jacket
  ctx.fillRect(x + 2, y + 14, 32, 22)

  // Shirt visible at chest
  ctx.fillStyle = isPlayer ? '#ddd' : '#d4c8a0'
  ctx.fillRect(x + 13, y + 15, 10, 17)

  // Punch arm (right side = forward direction)
  const punchExt = (state === 'punch') ? 16 : (state === 'combo') ? 22 : 0
  ctx.fillStyle = jacket

  // Back arm (left arm)
  ctx.fillRect(x - 4, y + 16, 9, 18)

  // Front arm
  ctx.fillRect(x + 29 + punchExt, y + 16, 9, 18)

  // Fist
  if (state === 'punch' || state === 'combo') {
    ctx.fillStyle = skin
    ctx.fillRect(x + 36 + punchExt, y + 17, 12, 9)
    // Fist lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 36 + punchExt, y + 17, 12, 9)
  }

  // Collar
  ctx.fillStyle = isPlayer ? '#aaa' : '#777'
  ctx.fillRect(x + 12, y + 14, 12, 6)

  // Head
  ctx.fillStyle = skin
  ctx.fillRect(x + 10, y + 2, 16, 14)

  // Hair
  ctx.fillStyle = hair
  ctx.fillRect(x + 9, y, 18, 6)
  ctx.fillRect(x + 9, y, 3, 10)

  // Eyes
  if (!hurt) {
    ctx.fillStyle = '#222'
    ctx.fillRect(x + 13, y + 6, 3, 3)
    ctx.fillRect(x + 20, y + 6, 3, 3)
    // Mouth
    ctx.fillStyle = '#bb8866'
    ctx.fillRect(x + 13, y + 12, 8, 2)
  } else {
    // X eyes when hurt
    ctx.fillStyle = '#ff2222'
    ctx.fillRect(x + 13, y + 6, 3, 3)
    ctx.fillRect(x + 20, y + 6, 3, 3)
  }

  ctx.restore()
}

function drawHPBar(ctx: CanvasRenderingContext2D, c: Char) {
  if (!c.isPlayer || c.hp <= 0) return
  const W = 220, H = 18, x = 14, y = 14
  // BG
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(x - 2, y - 2, W + 4, H + 4)
  // Bar
  const pct = Math.max(0, c.hp / c.maxHp)
  const barCol = pct > 0.5 ? '#22cc44' : pct > 0.25 ? '#ddaa22' : '#dd2222'
  ctx.fillStyle = '#111'
  ctx.fillRect(x, y, W, H)
  ctx.fillStyle = barCol
  ctx.fillRect(x, y, W * pct, H)
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(x, y, W * pct, H / 2)
  // Border
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, W, H)
  // Label
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`${Math.max(0, c.hp)} / ${c.maxHp}`, x + 4, y + H - 4)
}

// ── Combat ───────────────────────────────────────────────────
function doAttack(
  attacker: Char,
  targets: Char[],
  type: 'punch' | 'kick' | 'combo',
  gs: GS
) {
  const dmg   = type === 'punch' ? 15 : type === 'kick' ? 24 : 44
  const range = type === 'combo' ? 92 : type === 'kick' ? 75 : 58
  const kbX   = type === 'combo' ? 9 : type === 'kick' ? 5 : 3
  const kbY   = type === 'combo' ? -6 : -2

  for (const t of targets) {
    if (t.hp <= 0 || t.hurtInv > 0) continue
    const dx = (t.x + PW / 2) - (attacker.x + PW / 2)
    if (attacker.face === 1 ? dx < 0 : dx > 0) continue
    if (Math.abs(dx) > range) continue
    const ay1 = attacker.y + 8, ay2 = attacker.y + PH
    const ty1 = t.y + 8,       ty2 = t.y + PH
    if (ay2 < ty1 || ay1 > ty2) continue

    const actual = attacker.isPlayer ? dmg : attacker.dmg
    t.hp = Math.max(0, t.hp - actual)
    t.vx = attacker.face * kbX
    t.vy = kbY
    t.hurtInv = type === 'combo' ? 28 : 14
    t.state = t.hp <= 0 ? 'dead' : 'hurt'
    t.stateTimer = t.hp <= 0 ? 0 : 18

    if (attacker.isPlayer) {
      gs.combo++
      gs.score += actual * gs.combo
      gs.fTexts.push({ x: t.x + PW / 2, y: t.y - 8, text: `-${actual}`, life: 35, col: type === 'combo' ? '#ffcc00' : '#ff4444', big: type === 'combo' })
      if (gs.combo >= 3) gs.fTexts.push({ x: t.x + PW / 2, y: t.y - 30, text: `×${gs.combo} COMBO!`, life: 45, col: '#ff8800', big: true })
    }
  }
}

// ── Physics update ────────────────────────────────────────────
function updateChar(c: Char) {
  c.vy += GRAVITY
  if (c.vy > 20) c.vy = 20
  c.x += c.vx
  c.y += c.vy
  c.vx *= 0.82

  if (c.y + PH >= GROUND) {
    c.y = GROUND - PH
    c.vy = 0
    c.onGround = true
  } else {
    c.onGround = false
  }
  c.x = Math.max(0, Math.min(GW - PW, c.x))

  if (c.stateTimer > 0) c.stateTimer--
  if (c.atkCD > 0) c.atkCD--
  if (c.hurtInv > 0) c.hurtInv--

  if (c.stateTimer === 0 && ['punch', 'kick', 'combo', 'hurt'].includes(c.state)) {
    c.state = 'idle'
  }
}

// ── Enemy AI ─────────────────────────────────────────────────
function updateEnemyAI(e: Char, player: Char, gs: GS) {
  if (e.hp <= 0 || e.state === 'hurt' || e.atkCD > 0) return
  const dx = (player.x + PW / 2) - (e.x + PW / 2)
  const dist = Math.abs(dx)
  e.face = dx > 0 ? 1 : -1

  if (dist < 58 && e.onGround) {
    e.state = 'punch'
    e.stateTimer = 22
    e.atkCD = Math.max(15, 55 - gs.wave * 3)
    doAttack(e, [player], 'punch', gs)
  } else if (dist < 350) {
    e.vx = e.face * e.speed
    e.state = 'walk'
    if (e.onGround && Math.random() < 0.004) e.vy = JUMP_V * 0.65
  } else {
    e.state = 'idle'
  }
}

// ── Main component ────────────────────────────────────────────
export default function FightClubGame({ onDone, gameOverText }: { onDone: () => void; gameOverText?: string }) {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef<number>(0)
  const gameOverTextRef = useRef(gameOverText ?? 'Tyler est toujours plus fort que toi...')
  const [scale, setScale] = useState(1)

  // Scale canvas to fit viewport
  useEffect(() => {
    function upd() {
      setScale(Math.min(window.innerWidth / GW, window.innerHeight / GH, 1.6))
    }
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  useEffect(() => {
    discoverEgg('fightclub')
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // ── Init ─────────────────────────────────────────
    const gs: GS = {
      player: makePlayer(),
      enemies: [],
      wave: 0,
      waveTimer: 90,
      cleared: true,
      fTexts: [],
      over: false,
      overTimer: 0,
      lastPunchFrame: -999,
      frame: 0,
      keys: new Set(),
      combo: 0,
      score: 0,
    }

    function spawnWave() {
      gs.wave++
      gs.cleared = false
      gs.enemies = []
      const count = Math.min(1 + gs.wave, 5)
      for (let i = 0; i < count; i++) {
        const e = makeEnemy(GW - 60 - i * 70, gs.wave)
        gs.enemies.push(e)
      }
      gs.combo = 0
    }

    // ── Game loop ─────────────────────────────────────
    function loop() {
      const { player, keys } = gs
      gs.frame++

      // Player movement input
      if (!gs.over && player.hp > 0) {
        const canAct = !['punch', 'kick', 'combo', 'hurt'].includes(player.state)
        if (canAct) {
          const left  = keys.has('ArrowLeft') || keys.has('a')  || keys.has('A')
          const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D')
          const jump  = keys.has('ArrowUp') || keys.has('w') || keys.has('W') || keys.has(' ')
          if (left)  { player.vx = -player.speed; player.face = -1; player.state = 'walk' }
          else if (right) { player.vx = player.speed; player.face = 1; player.state = 'walk' }
          else if (player.state === 'walk') player.state = 'idle'
          if (jump && player.onGround) { player.vy = JUMP_V; player.state = 'jump' }
        }
      }

      // Update player
      if (player.hp > 0) updateChar(player)
      else { player.state = 'dead' }

      // Update enemies + AI
      for (const e of gs.enemies) {
        if (e.hp > 0) {
          updateEnemyAI(e, player, gs)
          updateChar(e)
        } else {
          e.state = 'dead'
          if (e.stateTimer < 60) e.stateTimer++
        }
      }

      // Wave management
      const allDead = gs.enemies.length > 0 && gs.enemies.every(e => e.hp <= 0)
      if (allDead && !gs.cleared) {
        gs.cleared = true
        gs.waveTimer = 130
        gs.fTexts.push({ x: GW / 2, y: GH / 2 - 30, text: `VAGUE ${gs.wave} TERMINÉE`, life: 100, col: '#ffdd00', big: true })
      }
      if (gs.cleared) {
        if (gs.waveTimer > 0) gs.waveTimer--
        else if (player.hp > 0) spawnWave()
      }

      // Game over
      if (player.hp <= 0 && !gs.over) {
        gs.over = true
        gs.overTimer = 200
      }
      if (gs.over && gs.overTimer > 0) gs.overTimer--

      // Float texts
      gs.fTexts = gs.fTexts.filter(t => t.life > 0)
      gs.fTexts.forEach(t => { t.y -= 0.7; t.life-- })

      // ── RENDER ────────────────────────────────────────

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GH)
      bgGrad.addColorStop(0, '#08080e')
      bgGrad.addColorStop(1, '#12121a')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, GW, GH)

      // Brick walls (hint)
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 1
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 17; col++) {
          const off = row % 2 === 0 ? 0 : 24
          ctx.strokeRect(col * 48 + off, row * 44, 46, 42)
        }
      }

      // Distant window light (ambiance)
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(255,200,80,${0.04 + i * 0.01})`
        ctx.fillRect(100 + i * 160, 30, 60, 40)
      }

      // Ground
      const grGrad = ctx.createLinearGradient(0, GROUND, 0, GH)
      grGrad.addColorStop(0, '#18181e')
      grGrad.addColorStop(1, '#0c0c12')
      ctx.fillStyle = grGrad
      ctx.fillRect(0, GROUND, GW, GH - GROUND)
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(GW, GROUND); ctx.stroke()

      // Ground cracks
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        ctx.moveTo(50 + i * 90, GROUND + 5)
        ctx.lineTo(80 + i * 90, GROUND + 18)
        ctx.stroke()
      }

      // Characters
      for (const e of gs.enemies) drawChar(ctx, e, gs.frame)
      drawChar(ctx, player, gs.frame)

      // Float texts
      for (const t of gs.fTexts) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, t.life / 12)
        ctx.fillStyle = t.col
        ctx.font = `${t.big ? 'bold ' : ''}${t.big ? 18 : 14}px monospace`
        ctx.textAlign = 'center'
        ctx.shadowColor = t.col
        ctx.shadowBlur = t.big ? 12 : 6
        ctx.fillText(t.text, t.x, t.y)
        ctx.restore()
      }

      // ── HUD ───────────────────────────────────────────
      drawHPBar(ctx, player)

      // Wave badge
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(GW / 2 - 65, 10, 130, 26)
      ctx.fillStyle = '#ffdd00'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`VAGUE  ${gs.wave}`, GW / 2, 28)

      // Score
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(GW - 130, 10, 120, 22)
      ctx.fillStyle = '#aaa'
      ctx.font = '11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`SCORE  ${gs.score}`, GW - 14, 26)

      // Controls hint (first 5s)
      if (gs.frame < 300) {
        const a = Math.min(0.8, (300 - gs.frame) / 60)
        ctx.fillStyle = `rgba(200,200,200,${a})`
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('← / → : Déplacer    ↑ / Espace : Sauter    Z : Poing    X : Kick    Z puis X vite : COMBO', GW / 2, GH - 14)
      }

      // "Next wave" countdown
      if (gs.cleared && gs.waveTimer > 0 && player.hp > 0) {
        const secs = Math.ceil(gs.waveTimer / 60)
        ctx.fillStyle = 'rgba(255,220,0,0.7)'
        ctx.font = '13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`Prochaine vague dans ${secs}s...`, GW / 2, GH - 35)
      }

      // ── Game over overlay ─────────────────────────────
      if (gs.over) {
        const fadeIn = Math.min(0.9, (200 - gs.overTimer) / 80)
        ctx.fillStyle = `rgba(0,0,0,${fadeIn})`
        ctx.fillRect(0, 0, GW, GH)

        if (gs.overTimer < 130) {
          const ta = Math.min(1, (130 - gs.overTimer) / 40)
          ctx.save()
          ctx.globalAlpha = ta
          ctx.textAlign = 'center'

          // "KNOCK OUT"
          ctx.fillStyle = '#cc0000'
          ctx.shadowColor = '#ff0000'
          ctx.shadowBlur = 30
          ctx.font = 'bold 52px serif'
          ctx.fillText('K·O', GW / 2, GH / 2 - 70)
          ctx.shadowBlur = 0

          // The quote
          ctx.fillStyle = '#e8e8e8'
          ctx.font = 'italic 20px serif'
          ctx.fillText(`"${gameOverTextRef.current}"`, GW / 2, GH / 2 - 10)

          // Stats
          ctx.fillStyle = 'rgba(255,255,255,0.45)'
          ctx.font = '13px monospace'
          ctx.fillText(
            `Vagues complètes : ${Math.max(0, gs.wave - 1)}   •   Score : ${gs.score}`,
            GW / 2, GH / 2 + 35
          )

          // "La première règle..."
          if (gs.overTimer < 60) {
            ctx.fillStyle = 'rgba(180,0,0,0.7)'
            ctx.font = 'italic 13px serif'
            ctx.fillText('"La première règle du Fight Club : on ne parle pas du Fight Club."', GW / 2, GH / 2 + 72)
          }

          if (gs.overTimer < 20) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)'
            ctx.font = '12px monospace'
            ctx.fillText('Échap pour fermer', GW / 2, GH / 2 + 108)
          }

          ctx.restore()
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    // ── Input ──────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      gs.keys.add(e.key)
      e.preventDefault()

      if (e.key === 'Escape') { onDone(); return }
      if (gs.over || gs.player.hp <= 0) return

      const p = gs.player
      const canAct = !['punch', 'kick', 'combo', 'hurt'].includes(p.state) && p.atkCD === 0

      if ((e.key === 'z' || e.key === 'Z') && canAct) {
        p.state = 'punch'
        p.stateTimer = 18
        p.atkCD = 15
        gs.lastPunchFrame = gs.frame
        doAttack(p, gs.enemies, 'punch', gs)
      }

      if ((e.key === 'x' || e.key === 'X') && canAct) {
        const inWindow = gs.frame - gs.lastPunchFrame < 18
        if (inWindow) {
          p.state = 'combo'
          p.stateTimer = 28
          p.atkCD = 40
          gs.fTexts.push({ x: p.x + PW / 2, y: p.y - 36, text: '💥 COMBO!', life: 55, col: '#ffaa00', big: true })
          doAttack(p, gs.enemies, 'combo', gs)
        } else {
          p.state = 'kick'
          p.stateTimer = 22
          p.atkCD = 25
          doAttack(p, gs.enemies, 'kick', gs)
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) { gs.keys.delete(e.key) }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <canvas
        ref={canvasRef}
        width={GW}
        height={GH}
        style={{
          display: 'block',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          imageRendering: 'pixelated',
        }}
      />
      {/* ESC button */}
      <button
        onClick={onDone}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.6)', borderRadius: 6,
          padding: '4px 12px', cursor: 'pointer', fontSize: '.78rem',
          fontFamily: 'monospace', letterSpacing: '1px',
        }}
      >
        ESC
      </button>
    </div>
  )
}
