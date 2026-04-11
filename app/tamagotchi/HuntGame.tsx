'use client'

import { useEffect, useRef, useCallback } from 'react'

/* ── Dimensions ──────────────────────────────────────────────────────────── */
const GW   = 700
const GH   = 300
const LANE_Y: [number, number, number] = [62, 148, 234]
const PLAYER_X = 110
const HUMAN_BASE_X = 400   // x when distance = 0 (just caught)
const HUMAN_FAR_X  = GW + 60 // x when distance = 100 (far ahead)

/* ── Types ───────────────────────────────────────────────────────────────── */
type ObType = 'block' | 'low' | 'gap'
interface Obstacle {
  x: number
  lane: number
  type: ObType
  w: number
  h: number
}

interface GameState {
  running: boolean
  over: boolean
  caught: boolean
  playerLane: number
  humanLane: number
  distance: number     // 0–100, start=70. 0 = caught
  timeLeft: number     // ms
  speed: number        // px/ms base scroll speed
  obstacles: Obstacle[]
  nextSpawn: number    // ms until next obstacle spawn
  jumping: boolean
  ducking: boolean
  jumpT: number        // 0→1 arc
  hitFlash: number     // ms remaining
  dodgeFlash: number   // ms remaining
  score: number
  bgOffset: number
  laneChangeT: number  // animation timer
  prevLane: number
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const GAME_DURATION  = 45_000   // ms
const DIST_START     = 70       // initial distance
const DIST_HIT       = +16      // distance gained on hit
const DIST_DODGE     = -5       // distance lost on perfect dodge (getting closer)
const DIST_PASSIVE   = -0.005   // distance lost per ms just by running
const SPEED_START    = 0.28     // px/ms
const SPEED_MAX      = 0.55
const JUMP_DURATION  = 480      // ms
const DUCK_DURATION  = 400      // ms

/* ── Colours ─────────────────────────────────────────────────────────────── */
const C = {
  bg:      '#0a0a14',
  lane:    '#1a1a2e',
  laneHL:  '#16213e',
  xeno:    '#a78bfa',
  xenoGlow:'#7c3aed',
  human:   '#f97316',
  humanGlow:'#ea580c',
  block:   '#ef4444',
  blockHL: '#fca5a5',
  low:     '#3b82f6',
  lowHL:   '#93c5fd',
  gap:     '#10b981',
  gapHL:   '#6ee7b7',
  hit:     '#ff0000',
  dodge:   '#00ff88',
  bar:     '#22d3ee',
  barBg:   '#1e293b',
  text:    '#e2e8f0',
  dim:     '#64748b',
  star:    '#ffffff',
}

/* ── ASCII-art frames ─────────────────────────────────────────────────────── */
const XENO_RUN = [
  ['  ◢█◣ ', ' /▓▓▓\\', ' ▌╋╋▐', '/╱  ╲\\'],
  ['  ◢█◣ ', ' /▓▓▓\\', ' ▌╋╋▐', '\\╲  ╱/'],
]
const XENO_JUMP = [
  ['  ◢█◣ ', ' /▓▓▓\\', ' ▌╋╋▐', '╱╱  ╲╲'],
]
const XENO_DUCK = [
  ['        ', '  ◢█◣  ', ' /▓▓▓\\ ', '─▌╋╋▐─'],
]
const HUMAN_RUN = [
  ['  O  ', ' /|\\ ', ' / \\ ', '      '],
  ['  O  ', ' ─┼─ ', ' |  ', ' / \\  '],
]

/* ── Stars ───────────────────────────────────────────────────────────────── */
const STARS = Array.from({ length: 60 }, () => ({
  x: Math.random() * GW,
  y: Math.random() * GH * 0.55,
  r: Math.random() * 1.4 + 0.3,
  speed: Math.random() * 0.08 + 0.02,
}))

/* ── Obstacle helpers ────────────────────────────────────────────────────── */
function spawnObstacle(lane: number): Obstacle {
  const types: ObType[] = ['block', 'low', 'gap']
  const type = types[Math.floor(Math.random() * types.length)]
  return {
    x: GW + 30,
    lane,
    type,
    w: type === 'gap' ? 60 : 38,
    h: type === 'low' ? 22 : 44,
  }
}

function obsColor(type: ObType, hl = false) {
  if (type === 'block') return hl ? C.blockHL : C.block
  if (type === 'low')   return hl ? C.lowHL   : C.low
  return hl ? C.gapHL : C.gap
}

function obsLabel(type: ObType) {
  if (type === 'block') return '▓'
  if (type === 'low')   return '─'
  return '○'
}

/* ── Component ───────────────────────────────────────────────────────────── */
interface HuntGameProps {
  onEnd: (score: number, caught: boolean) => void
}

export default function HuntGame({ onEnd }: HuntGameProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const gsRef      = useRef<GameState>(initGS())
  const rafRef     = useRef<number>(0)
  const lastTRef   = useRef<number>(0)
  const keysRef    = useRef<Set<string>>(new Set())
  const duckTimRef = useRef<number>(0)
  const frameRef   = useRef(0)   // for run animation

  function initGS(): GameState {
    return {
      running: true, over: false, caught: false,
      playerLane: 1, humanLane: 1,
      distance: DIST_START,
      timeLeft: GAME_DURATION,
      speed: SPEED_START,
      obstacles: [],
      nextSpawn: 2000,
      jumping: false, ducking: false, jumpT: 0,
      hitFlash: 0, dodgeFlash: 0,
      score: 0,
      bgOffset: 0,
      laneChangeT: 0, prevLane: 1,
    }
  }

  /* ── Input ──────────────────────────────────────────────────────── */
  const doJump = useCallback(() => {
    const gs = gsRef.current
    if (!gs.running || gs.jumping || gs.ducking) return
    gs.jumping = true
    gs.jumpT = 0
  }, [])

  const doDuck = useCallback(() => {
    const gs = gsRef.current
    if (!gs.running || gs.jumping || gs.ducking) return
    gs.ducking = true
    duckTimRef.current = DUCK_DURATION
  }, [])

  const doLaneUp = useCallback(() => {
    const gs = gsRef.current
    if (!gs.running) return
    if (gs.playerLane > 0) {
      gs.prevLane = gs.playerLane
      gs.playerLane--
      gs.laneChangeT = 1
    }
  }, [])

  const doLaneDown = useCallback(() => {
    const gs = gsRef.current
    if (!gs.running) return
    if (gs.playerLane < 2) {
      gs.prevLane = gs.playerLane
      gs.playerLane++
      gs.laneChangeT = 1
    }
  }, [])

  /* ── Main loop ──────────────────────────────────────────────────── */
  const loop = useCallback((ts: number) => {
    const dt = Math.min(ts - lastTRef.current, 80)
    lastTRef.current = ts
    const gs = gsRef.current

    if (!gs.running) return

    /* Keys */
    const keys = keysRef.current
    if (keys.has('ArrowUp')   || keys.has('KeyW')) { keys.delete('ArrowUp');   keys.delete('KeyW');   doLaneUp()   }
    if (keys.has('ArrowDown') || keys.has('KeyS')) { keys.delete('ArrowDown'); keys.delete('KeyS');   doLaneDown() }
    if (keys.has('Space') || keys.has('ArrowRight')) { keys.delete('Space'); keys.delete('ArrowRight'); doJump() }
    if (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC')) {
      keys.delete('ShiftLeft'); keys.delete('ShiftRight'); keys.delete('KeyC'); doDuck()
    }

    /* Time */
    gs.timeLeft -= dt
    if (gs.timeLeft <= 0) { gs.timeLeft = 0; endGame(false); return }

    /* Speed ramp */
    const progress = 1 - gs.timeLeft / GAME_DURATION
    gs.speed = SPEED_START + (SPEED_MAX - SPEED_START) * progress

    /* Jump arc */
    if (gs.jumping) {
      gs.jumpT += dt / JUMP_DURATION
      if (gs.jumpT >= 1) { gs.jumping = false; gs.jumpT = 1 }
    }

    /* Duck timer */
    if (gs.ducking) {
      duckTimRef.current -= dt
      if (duckTimRef.current <= 0) gs.ducking = false
    }

    /* Lane change smooth */
    if (gs.laneChangeT > 0) gs.laneChangeT = Math.max(0, gs.laneChangeT - dt / 120)

    /* Flashes */
    gs.hitFlash   = Math.max(0, gs.hitFlash   - dt)
    gs.dodgeFlash = Math.max(0, gs.dodgeFlash - dt)

    /* BG scroll */
    gs.bgOffset = (gs.bgOffset + gs.speed * dt) % GW

    /* Distance passive */
    gs.distance = Math.max(0, gs.distance + DIST_PASSIVE * dt)
    if (gs.distance <= 0) { endGame(true); return }

    /* Spawn obstacles */
    gs.nextSpawn -= dt
    if (gs.nextSpawn <= 0) {
      const lane = Math.floor(Math.random() * 3)
      gs.obstacles.push(spawnObstacle(lane))
      gs.nextSpawn = 800 + Math.random() * 1200 * (1 - progress * 0.5)
    }

    /* Move & collide obstacles */
    const toRemove: number[] = []
    gs.obstacles.forEach((ob, i) => {
      ob.x -= gs.speed * dt

      if (ob.x < -ob.w - 10) { toRemove.push(i); return }

      /* Check collision zone */
      if (ob.x > PLAYER_X - 10 && ob.x < PLAYER_X + 30 && ob.lane === gs.playerLane) {
        const passed = ob.x < PLAYER_X - 10
        if (!passed) {
          /* Determine if player evades */
          let evaded = false
          if (ob.type === 'block' && gs.jumping && gs.jumpT > 0.1 && gs.jumpT < 0.9) evaded = true
          if (ob.type === 'low'   && gs.ducking) evaded = true
          if (ob.type === 'gap'   && !gs.jumping) evaded = true // run through gap = safe (no collision)

          // gap is actually "a gap in the barrier" — player just runs through normally
          if (ob.type === 'gap') {
            /* perfect dodge: jump over gap = extra distance */
            if (gs.jumping) {
              gs.distance = Math.max(0, gs.distance + DIST_DODGE * 1.5)
              gs.dodgeFlash = 300
              gs.score += 15
            }
            toRemove.push(i)
            return
          }

          if (evaded) {
            gs.distance = Math.max(0, gs.distance + DIST_DODGE)
            gs.dodgeFlash = 300
            gs.score += 10
            toRemove.push(i)
            if (gs.distance <= 0) { endGame(true); return }
          } else {
            /* HIT */
            gs.distance = Math.min(100, gs.distance + DIST_HIT)
            gs.hitFlash = 350
            gs.score = Math.max(0, gs.score - 5)
            toRemove.push(i)
          }
        }
      }
    })
    for (let i = toRemove.length - 1; i >= 0; i--) gs.obstacles.splice(toRemove[i], 1)

    /* Human lane shifts occasionally */
    if (Math.random() < dt * 0.0003) {
      gs.humanLane = Math.floor(Math.random() * 3)
    }

    /* Run frame */
    frameRef.current = Math.floor(ts / 200) % 2

    draw(gs)

    rafRef.current = requestAnimationFrame(loop)
  }, [doJump, doDuck, doLaneUp, doLaneDown])

  function endGame(caught: boolean) {
    const gs = gsRef.current
    gs.running = false
    gs.over = true
    gs.caught = caught
    drawEnd(gs)
    setTimeout(() => onEnd(gs.score, caught), 2200)
  }

  /* ── Draw ───────────────────────────────────────────────────────── */
  function draw(gs: GameState) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, GW, GH)

    /* BG */
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, GW, GH)

    /* Stars */
    STARS.forEach(s => {
      const sx = ((s.x - gs.bgOffset * s.speed * 0.3) % GW + GW) % GW
      ctx.fillStyle = C.star
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    /* Lanes */
    LANE_Y.forEach((ly, i) => {
      ctx.fillStyle = i % 2 === 0 ? C.lane : C.laneHL
      ctx.fillRect(0, ly - 28, GW, 56)
      /* Lane border */
      ctx.strokeStyle = '#2d2d4e'
      ctx.lineWidth = 1
      ctx.setLineDash([12, 8])
      ctx.beginPath()
      ctx.moveTo(0, ly + 28)
      ctx.lineTo(GW, ly + 28)
      ctx.stroke()
      ctx.setLineDash([])
    })

    /* Ground line */
    ctx.strokeStyle = '#2a2a4e'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(0, GH - 10)
    ctx.lineTo(GW, GH - 10)
    ctx.stroke()

    /* Hit flash overlay */
    if (gs.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,0,0,${(gs.hitFlash / 350) * 0.25})`
      ctx.fillRect(0, 0, GW, GH)
    }
    if (gs.dodgeFlash > 0) {
      ctx.fillStyle = `rgba(0,255,136,${(gs.dodgeFlash / 300) * 0.18})`
      ctx.fillRect(0, 0, GW, GH)
    }

    /* Obstacles */
    gs.obstacles.forEach(ob => {
      const cy = LANE_Y[ob.lane]
      const isClose = ob.x < PLAYER_X + 80

      if (ob.type === 'gap') {
        /* Gap = glowing ring */
        ctx.strokeStyle = obsColor('gap', isClose)
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(ob.x + ob.w / 2, cy, ob.w / 2, 22, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = obsColor('gap', isClose)
        ctx.font = '18px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(obsLabel('gap'), ob.x + ob.w / 2, cy + 6)
      } else {
        const oy = cy - (ob.type === 'low' ? 11 : 22)
        ctx.fillStyle = obsColor(ob.type, isClose)
        ctx.strokeStyle = isClose ? '#fff' : 'transparent'
        ctx.lineWidth = 1
        roundRect(ctx, ob.x, oy, ob.w, ob.h, 5)
        ctx.fillStyle = isClose ? '#fff' : '#00000066'
        ctx.font = '13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(obsLabel(ob.type), ob.x + ob.w / 2, oy + ob.h / 2 + 4)
      }
    })

    /* Human */
    const hx = HUMAN_BASE_X + (gs.distance / 100) * (HUMAN_FAR_X - HUMAN_BASE_X)
    const hy = LANE_Y[gs.humanLane]
    if (hx < GW + 60) {
      const hFrames = HUMAN_RUN[frameRef.current]
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.shadowColor = C.humanGlow
      ctx.shadowBlur = 8
      hFrames.forEach((line, li) => {
        ctx.fillStyle = li === 0 ? '#fbbf24' : C.human
        ctx.fillText(line, hx, hy - 22 + li * 13)
      })
      ctx.shadowBlur = 0

      /* Panic indicator */
      if (gs.distance < 30) {
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('!', hx, hy - 42)
      }
    }

    /* Player / Xeno */
    const curLaneY  = LANE_Y[gs.playerLane]
    const prevLaneY = LANE_Y[gs.prevLane]
    const py = gs.laneChangeT > 0
      ? prevLaneY + (curLaneY - prevLaneY) * (1 - gs.laneChangeT)
      : curLaneY

    /* Jump height */
    const jumpArc = gs.jumping ? Math.sin(gs.jumpT * Math.PI) * 48 : 0

    const xFrames = gs.jumping ? XENO_JUMP[0] : gs.ducking ? XENO_DUCK[0] : XENO_RUN[frameRef.current]

    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.shadowColor = C.xenoGlow
    ctx.shadowBlur = 12
    xFrames.forEach((line, li) => {
      ctx.fillStyle = li === 0 ? '#c4b5fd' : C.xeno
      ctx.fillText(line, PLAYER_X, py - 22 - jumpArc + li * 12)
    })
    ctx.shadowBlur = 0

    /* ── HUD ──────────────────────────────────────────────────────── */

    /* Distance bar */
    const barW = 220, barH = 14
    const barX = (GW - barW) / 2, barY = 10
    ctx.fillStyle = C.barBg
    roundRect(ctx, barX, barY, barW, barH, 7)
    ctx.fillStyle = gs.distance < 20 ? C.dodge : C.bar
    const fillW = barW * Math.max(0, 1 - gs.distance / 100)
    if (fillW > 0) { roundRect(ctx, barX, barY, fillW, barH, 7) }
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barW, barH)
    ctx.fillStyle = C.text
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('DISTANCE', GW / 2, barY + barH + 11)
    ctx.fillStyle = C.dim
    ctx.font = '8px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('CIBLE', barX + fillW + 2, barY + barH + 11)

    /* Timer */
    const sec = Math.ceil(gs.timeLeft / 1000)
    ctx.fillStyle = sec < 10 ? '#ef4444' : C.text
    ctx.font = `bold ${sec < 10 ? 18 : 14}px monospace`
    ctx.textAlign = 'left'
    ctx.fillText(`${sec}s`, 8, 22)

    /* Score */
    ctx.fillStyle = C.text
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`★ ${gs.score}`, GW - 8, 22)

    /* Controls hint */
    ctx.fillStyle = C.dim
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('↑↓ changer voie · ESPACE sauter · C s\'accroupir', GW / 2, GH - 2)
  }

  function drawEnd(gs: GameState) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    draw(gs)

    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, GW, GH)

    if (gs.caught) {
      ctx.fillStyle = C.xeno
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.shadowColor = C.xenoGlow
      ctx.shadowBlur = 20
      ctx.fillText('ATTRAPÉ ! 🥚', GW / 2, GH / 2 - 20)
      ctx.shadowBlur = 0
      ctx.fillStyle = C.text
      ctx.font = '14px monospace'
      ctx.fillText("L'alien a pondu un œuf à l'intérieur.", GW / 2, GH / 2 + 14)
    } else {
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#b91c1c'
      ctx.shadowBlur = 20
      ctx.fillText("RATÉ...", GW / 2, GH / 2 - 20)
      ctx.shadowBlur = 0
      ctx.fillStyle = C.text
      ctx.font = '14px monospace'
      ctx.fillText("L'humain s'est échappé.", GW / 2, GH / 2 + 14)
    }
    ctx.fillStyle = C.dim
    ctx.font = '13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`Score : ${gs.score}`, GW / 2, GH / 2 + 40)
  }

  /* ── Lifecycle ──────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      // Prevent page scroll on Space/Arrow
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    rafRef.current = requestAnimationFrame((ts) => { lastTRef.current = ts; rafRef.current = requestAnimationFrame(loop) })
    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(rafRef.current)
    }
  }, [loop])

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        width={GW}
        height={GH}
        style={{
          width: '100%',
          maxWidth: GW,
          borderRadius: 12,
          border: '2px solid #7c3aed44',
          boxShadow: '0 0 40px #7c3aed33',
          background: C.bg,
          touchAction: 'none',
        }}
      />
      {/* Mobile controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: '▲ Haut',      action: doLaneUp,   color: '#a78bfa' },
          { label: '▼ Bas',       action: doLaneDown, color: '#a78bfa' },
          { label: '✦ Sauter',    action: doJump,     color: '#22d3ee' },
          { label: '▬ Accroupir', action: doDuck,     color: '#f97316' },
        ].map(btn => (
          <button
            key={btn.label}
            onPointerDown={(e) => { e.preventDefault(); btn.action() }}
            style={{
              padding: '10px 16px',
              background: `${btn.color}22`,
              border: `1px solid ${btn.color}66`,
              borderRadius: 8,
              color: btn.color,
              fontFamily: 'var(--font-display, monospace)',
              fontSize: '.8rem',
              cursor: 'pointer',
              touchAction: 'none',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Helper: roundRect fill ──────────────────────────────────────────────── */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}
