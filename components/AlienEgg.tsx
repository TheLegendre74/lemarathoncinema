'use client'

import { useEffect, useRef } from 'react'
import { discoverEgg } from '@/lib/actions'

// ── Web Audio helpers ─────────────────────────────────────────────────────────
function makeAC() { return new (window.AudioContext || (window as any).webkitAudioContext)() }

function noise(ac: AudioContext, dur: number, freq: number, q: number, vol: number, at: number) {
  const len = Math.ceil(ac.sampleRate * dur)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  const bpf = ac.createBiquadFilter()
  const g   = ac.createGain()
  src.buffer = buf; bpf.type = 'bandpass'; bpf.frequency.value = freq; bpf.Q.value = q
  src.connect(bpf); bpf.connect(g); g.connect(ac.destination)
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.start(at); src.stop(at + dur + 0.05)
}

function tone(ac: AudioContext, type: OscillatorType, freqStart: number, freqEnd: number, dur: number, vol: number, at: number) {
  const osc = ac.createOscillator(); const g = ac.createGain()
  osc.connect(g); g.connect(ac.destination)
  osc.type = type; osc.frequency.setValueAtTime(freqStart, at)
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), at + dur)
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.start(at); osc.stop(at + dur + 0.05)
}

// ── Alien horror audio ────────────────────────────────────────────────────────
function createAlienAudio() {
  let ac: AudioContext | null = null
  let droneOsc: OscillatorNode | null = null
  let droneLFO:  OscillatorNode | null = null
  let loopTimer: ReturnType<typeof setTimeout> | null = null

  function start() {
    try {
      ac = makeAC()
      // Low horror drone (35 Hz)
      droneOsc = ac.createOscillator()
      const droneGain = ac.createGain()
      droneOsc.connect(droneGain); droneGain.connect(ac.destination)
      droneOsc.type = 'sine'; droneOsc.frequency.value = 35
      droneGain.gain.value = 0.10

      // Slow tremolo LFO (0.3 Hz)
      droneLFO = ac.createOscillator()
      const lfoGain = ac.createGain()
      droneLFO.connect(lfoGain); lfoGain.connect(droneGain.gain)
      droneLFO.type = 'sine'; droneLFO.frequency.value = 0.28
      lfoGain.gain.value = 0.05
      droneOsc.start(); droneLFO.start()

      // Ventilation hum (filtered noise loop)
      scheduleVentilation()

      // Occasional dissonant tones (horror stab)
      scheduleHorrorStabs()
    } catch {}
  }

  function scheduleVentilation() {
    if (!ac) return
    const t = ac.currentTime
    // Low ventilation noise
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5
    const src = ac.createBufferSource()
    const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 200
    const g = ac.createGain(); g.gain.value = 0.04
    src.buffer = buf; src.loop = true
    src.connect(lpf); lpf.connect(g); g.connect(ac.destination)
    src.start(t)
    // Keep reference for stop
    ;(ac as any)._ventSrc = src
  }

  function scheduleHorrorStabs() {
    if (!ac) return
    const stab = () => {
      if (!ac) return
      const t = ac.currentTime
      // Dissonant pair (tritone interval — classic horror)
      tone(ac, 'sawtooth', 110,  90,  1.2, 0.06, t)
      tone(ac, 'sawtooth', 155, 130,  1.2, 0.04, t + 0.05)
      // Sub thud
      tone(ac, 'sine',     50,  28,  0.6, 0.12, t)
      loopTimer = setTimeout(stab, 4500 + Math.random() * 3500)
    }
    loopTimer = setTimeout(stab, 2000 + Math.random() * 2000)
  }

  function killSFX() {
    if (!ac) return
    const t = ac.currentTime
    // Alien hiss
    noise(ac, 0.35, 2200, 8, 0.22, t)
    noise(ac, 0.20, 800,  5, 0.15, t + 0.05)
    // Victim thud
    tone(ac, 'sine', 80, 30, 0.4, 0.20, t + 0.1)
  }

  function heartbeatSFX() {
    if (!ac) return
    const t = ac.currentTime
    tone(ac, 'sine', 68, 55, 0.08, 0.28, t)
    tone(ac, 'sine', 75, 58, 0.10, 0.22, t + 0.12)
  }

  function chestbursterSFX() {
    if (!ac) return
    const t = ac.currentTime
    // Wet impact
    noise(ac, 0.5, 400,  3, 0.45, t)
    noise(ac, 0.3, 1200, 6, 0.30, t + 0.05)
    // Creature squeal
    tone(ac, 'sawtooth', 600, 1800, 0.4, 0.18, t + 0.2)
    tone(ac, 'sine',     800, 300,  0.5, 0.12, t + 0.4)
    // Sub boom
    tone(ac, 'sine', 60, 20, 0.6, 0.35, t)
  }

  function stop() {
    try {
      droneOsc?.stop(); droneLFO?.stop()
      if (ac) (ac as any)._ventSrc?.stop()
      if (loopTimer) clearTimeout(loopTimer)
      ac?.close()
    } catch {}
    ac = null
  }

  return { start, killSFX, heartbeatSFX, chestbursterSFX, stop }
}

export default function AlienEgg({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    discoverEgg('alien')

    const sfx = createAlienAudio()
    sfx.start()

    let done = false
    const startTime = performance.now()

    // ── TIMING (ms) ──────────────────────────────────────────────────────────
    const T = {
      kill1:       2800,   // Lambert
      kill2:       5600,   // Brett
      kill3:       8400,   // Dallas
      approachR:  10800,   // alien s'approche de Ripley (visible)
      ripleyFalls: 13000,  // Ripley tombe au sol
      bulge:       14500,  // ventre distend
      burst:       16800,  // chestburster
      flee:        18500,  // chestburster se sauve
      fadeStart:   20200,
      end:         22500,
    }

    // ── CREW ──────────────────────────────────────────────────────────────────
    const CREW_Y = H * 0.72
    const crew = [
      { id: 0, x: W * 0.13, y: CREW_Y, alpha: 1.0, dead: false, flash: 0, isRipley: false },
      { id: 1, x: W * 0.33, y: CREW_Y, alpha: 1.0, dead: false, flash: 0, isRipley: false },
      { id: 2, x: W * 0.56, y: CREW_Y, alpha: 1.0, dead: false, flash: 0, isRipley: false },
      { id: 3, x: W * 0.75, y: CREW_Y, alpha: 1.0, dead: false, flash: 0, isRipley: true  },
    ]

    // ── ALIEN STATE ───────────────────────────────────────────────────────────
    const alienState = {
      x: W * 0.94,
      y: H * 0.28,        // plafond au début
      walkPhase: 0,
      visibility: 0.0,
      targetX: W * 0.94,
      targetY: H * 0.28,
      onCeiling: true,
    }

    // ── RIPLEY STATE ──────────────────────────────────────────────────────────
    let ripleyFallAngle = 0   // 0 = debout, PI/2 = allongée
    let bellyBulge      = 0
    let fadeAlpha       = 0

    // ── CHESTBURSTER STATE ────────────────────────────────────────────────────
    const cb = { x: 0, y: 0, emerge: 0, fleeing: false, fleeX: 0, fleeAlpha: 1 }

    // ── HEARTBEAT ─────────────────────────────────────────────────────────────
    let lastHeartbeat = 0

    // ── LIGHT FLICKER ─────────────────────────────────────────────────────────
    let lightFlicker = 1.0, flickerTimer = 0

    // ── STEAM PARTICLES ───────────────────────────────────────────────────────
    const steam: { x: number; y: number; vy: number; alpha: number; r: number }[] = []
    function spawnSteam() {
      if (steam.length < 30) steam.push({
        x: Math.random() * W, y: H * 0.8 + Math.random() * H * 0.1,
        vy: -0.4 - Math.random() * 0.3, alpha: 0.12 + Math.random() * 0.08,
        r: 12 + Math.random() * 20,
      })
    }

    // ── CORRIDOR ─────────────────────────────────────────────────────────────
    function drawCorridor(fl: number) {
      // Base dark metal
      ctx.fillStyle = `rgba(7,7,13,${fl})`
      ctx.fillRect(0, 0, W, H)

      // Vanishing-point perspective lines
      const vx = W * 0.5, vy = H * 0.50
      ctx.strokeStyle = `rgba(35,38,55,${fl * 0.65})`; ctx.lineWidth = 1
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath(); ctx.moveTo((i / 8) * W, 0);   ctx.lineTo(vx, vy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo((i / 8) * W, H);   ctx.lineTo(vx, vy); ctx.stroke()
      }

      // Metal wall panels
      ctx.strokeStyle = `rgba(28,32,48,${fl * 0.75})`; ctx.lineWidth = 1.5
      for (let row = 0; row < 6; row++) {
        const py = row * H * 0.18
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W * 0.15, vy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(W, py); ctx.lineTo(W * 0.85, vy); ctx.stroke()
      }

      // Ceiling pipes
      ctx.strokeStyle = `rgba(25,28,40,${fl * 0.9})`
      for (let p = 0; p < 7; p++) {
        ctx.lineWidth = 2 + (p % 3) * 3
        ctx.beginPath(); ctx.moveTo(0, 5 + p * 16); ctx.lineTo(W, 5 + p * 16); ctx.stroke()
      }
      // Pipe rivets
      ctx.fillStyle = `rgba(20,22,34,${fl * 0.8})`
      for (let p = 0; p < 7; p++) {
        for (let r = 0; r < 12; r++) {
          ctx.beginPath(); ctx.arc((r / 11) * W, 5 + p * 16, 2, 0, Math.PI * 2); ctx.fill()
        }
      }

      // Emergency red strip lights (side walls)
      const redAlpha = 0.14 * fl
      ctx.fillStyle = `rgba(160,25,18,${redAlpha})`
      ctx.fillRect(0,   H * 0.38, 14, H * 0.25)
      ctx.fillRect(W-14, H * 0.38, 14, H * 0.25)
      const rg1 = ctx.createRadialGradient(10, H * 0.5, 0, 10, H * 0.5, 110)
      rg1.addColorStop(0, `rgba(160,20,16,${0.16 * fl})`); rg1.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rg1; ctx.fillRect(0, H * 0.3, 130, H * 0.4)
      const rg2 = ctx.createRadialGradient(W - 10, H * 0.5, 0, W - 10, H * 0.5, 110)
      rg2.addColorStop(0, `rgba(160,20,16,${0.16 * fl})`); rg2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rg2; ctx.fillRect(W - 130, H * 0.3, 130, H * 0.4)

      // Floor
      const floorG = ctx.createLinearGradient(0, H * 0.82, 0, H)
      floorG.addColorStop(0, `rgba(16,15,12,${fl})`); floorG.addColorStop(1, `rgba(5,4,3,${fl})`)
      ctx.fillStyle = floorG; ctx.fillRect(0, H * 0.82, W, H * 0.18)
      ctx.strokeStyle = `rgba(28,26,22,${fl * 0.5})`; ctx.lineWidth = 0.8
      for (let gx = 0; gx < W; gx += 55) {
        ctx.beginPath(); ctx.moveTo(gx, H * 0.82); ctx.lineTo(gx + 18, H); ctx.stroke()
      }
    }

    // ── ALIEN (large, elongated, terrifying) ──────────────────────────────────
    function drawAlienFull(x: number, y: number, walkPhase: number, visibility: number, flip: boolean) {
      if (visibility <= 0) return
      ctx.save()
      ctx.globalAlpha = visibility
      ctx.translate(x, y)
      if (flip) ctx.scale(-1, 1)
      // Scale up — alien is imposing (1.55x)
      ctx.scale(1.55, 1.55)

      const bob = Math.sin(walkPhase * 2) * 3

      // ── Ground shadow ─────────────────────────────────────────────────────
      ctx.beginPath(); ctx.ellipse(10, 40 + bob, 80, 12, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill()

      // ── Body (very elongated, 3:1 ratio) ──────────────────────────────────
      ctx.beginPath(); ctx.ellipse(0, 3 + bob, 52, 14, -0.04, 0, Math.PI * 2)
      ctx.fillStyle = '#0c0c14'; ctx.fill()
      // Biomechanical ribbing
      ctx.strokeStyle = '#060610'; ctx.lineWidth = 1.8
      for (let r = 0; r < 6; r++) {
        ctx.beginPath(); ctx.moveTo(-38 + r * 14, bob - 6); ctx.lineTo(-40 + r * 14, bob + 12); ctx.stroke()
      }
      // Dark blue-green sheen on back
      ctx.beginPath(); ctx.ellipse(0, bob - 8, 44, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(20,40,60,0.18)'; ctx.fill()

      // ── Dorsal tubes (6 spines, prominent) ───────────────────────────────
      for (let d = 0; d < 6; d++) {
        const dx = -30 + d * 12
        const th = 18 + Math.sin(d * 1.6) * 5
        ctx.beginPath(); ctx.moveTo(dx, bob - 13); ctx.lineTo(dx + 1, bob - 13 - th)
        ctx.strokeStyle = '#18182a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke()
        ctx.beginPath(); ctx.arc(dx + 1, bob - 13 - th, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#18182a'; ctx.fill()
        // Tube highlight
        ctx.beginPath(); ctx.arc(dx, bob - 14 - th * 0.6, 1.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(40,60,90,0.3)'; ctx.fill()
      }

      // ── Elongated head (massive dome) ─────────────────────────────────────
      ctx.beginPath(); ctx.ellipse(-56, bob - 3, 28, 11, -0.14, 0, Math.PI * 2)
      ctx.fillStyle = '#08081a'; ctx.fill()
      // Dome ridge
      ctx.beginPath(); ctx.moveTo(-80, bob - 5)
      ctx.quadraticCurveTo(-72, bob - 28, -36, bob - 11)
      ctx.strokeStyle = '#050510'; ctx.lineWidth = 3; ctx.stroke()
      // Second ridge line
      ctx.beginPath(); ctx.moveTo(-78, bob - 12)
      ctx.quadraticCurveTo(-68, bob - 26, -38, bob - 14)
      ctx.strokeStyle = '#0c0c20'; ctx.lineWidth = 1.8; ctx.stroke()
      // Glossy sheen
      ctx.beginPath(); ctx.moveTo(-76, bob - 15)
      ctx.quadraticCurveTo(-64, bob - 26, -42, bob - 15)
      ctx.strokeStyle = 'rgba(40,65,110,0.28)'; ctx.lineWidth = 2; ctx.stroke()

      // Neck ridges connecting head to body
      ctx.strokeStyle = '#0a0a18'; ctx.lineWidth = 2.5
      for (let n = 0; n < 3; n++) {
        ctx.beginPath(); ctx.moveTo(-30 + n * 4, bob - 8); ctx.lineTo(-34 + n * 3, bob + 6); ctx.stroke()
      }

      // Inner jaw (2nd mouth extending)
      ctx.beginPath(); ctx.ellipse(-76, bob, 7, 3, -0.2, 0, Math.PI)
      ctx.fillStyle = '#c02020'; ctx.fill()
      // Inner jaw teeth
      ctx.fillStyle = '#dcd8c4'
      for (let t = 0; t < 5; t++) {
        ctx.beginPath(); ctx.moveTo(-82 + t * 3.5, bob - 0.5)
        ctx.lineTo(-81 + t * 3.5, bob + 5.5); ctx.lineTo(-79 + t * 3.5, bob - 0.5); ctx.fill()
      }
      // Acid drool (longer, more menacing)
      ctx.strokeStyle = 'rgba(140,255,30,0.65)'; ctx.lineWidth = 1.8
      ctx.beginPath(); ctx.moveTo(-78, bob + 2); ctx.lineTo(-78, bob + 12); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-72, bob + 1.5); ctx.lineTo(-72, bob + 8); ctx.stroke()

      // ── 4 legs (longer, more articulated) ────────────────────────────────
      const swing = Math.sin(walkPhase) * 25
      const fl2 = (swing * Math.PI) / 180, fr2 = -fl2

      ctx.strokeStyle = '#0c0c14'; ctx.lineWidth = 6.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      // Front-left (3 segments)
      ctx.beginPath(); ctx.moveTo(-32, bob + 10)
      ctx.lineTo(-32 + Math.sin(fl2) * 20, bob + 26)
      ctx.lineTo(-32 + Math.sin(fl2) * 30, bob + 38)
      ctx.lineTo(-32 + Math.sin(fl2) * 26, bob + 46)
      ctx.stroke()
      // Front-right
      ctx.beginPath(); ctx.moveTo(-18, bob + 11)
      ctx.lineTo(-18 + Math.sin(fr2) * 20, bob + 26)
      ctx.lineTo(-18 + Math.sin(fr2) * 30, bob + 38)
      ctx.lineTo(-18 + Math.sin(fr2) * 26, bob + 46)
      ctx.stroke()
      // Rear-left
      ctx.beginPath(); ctx.moveTo(22, bob + 10)
      ctx.lineTo(22 + Math.sin(fr2) * 18, bob + 25)
      ctx.lineTo(22 + Math.sin(fr2) * 28, bob + 36)
      ctx.lineTo(22 + Math.sin(fr2) * 24, bob + 44)
      ctx.stroke()
      // Rear-right
      ctx.beginPath(); ctx.moveTo(34, bob + 11)
      ctx.lineTo(34 + Math.sin(fl2) * 18, bob + 25)
      ctx.lineTo(34 + Math.sin(fl2) * 28, bob + 36)
      ctx.lineTo(34 + Math.sin(fl2) * 24, bob + 44)
      ctx.stroke()
      // Claws (feet)
      ctx.strokeStyle = '#161622'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
      for (let cl = -1; cl <= 1; cl++) {
        ctx.beginPath()
        ctx.moveTo(-32 + Math.sin(fl2) * 26, bob + 46)
        ctx.lineTo(-32 + Math.sin(fl2) * 26 + cl * 5, bob + 52)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-18 + Math.sin(fr2) * 26, bob + 46)
        ctx.lineTo(-18 + Math.sin(fr2) * 26 + cl * 5, bob + 52)
        ctx.stroke()
      }

      // ── Long tail (S-curve, 160px+) ───────────────────────────────────────
      const tailWag = Math.sin(walkPhase * 1.6) * 12
      ctx.beginPath(); ctx.moveTo(48, bob + 4)
      ctx.bezierCurveTo(70, bob + 16 + tailWag, 95, bob - 14 + tailWag * 0.8, 115, bob - 4)
      ctx.bezierCurveTo(135, bob + 8,  158, bob - 18 + tailWag * 0.5, 172, bob - 6)
      ctx.bezierCurveTo(185, bob + 2, 192, bob - 12, 200, bob - 8)
      ctx.strokeStyle = '#0c0c14'; ctx.lineWidth = 5; ctx.stroke()
      // Tail gets thinner toward tip
      ctx.beginPath(); ctx.moveTo(155, bob - 14 + tailWag * 0.5)
      ctx.bezierCurveTo(168, bob - 2, 185, bob - 14, 200, bob - 8)
      ctx.strokeStyle = '#0c0c14'; ctx.lineWidth = 3; ctx.stroke()
      // Blade tip (large, crescent)
      ctx.beginPath(); ctx.moveTo(198, bob - 8)
      ctx.lineTo(210, bob - 22); ctx.lineTo(205, bob - 6); ctx.lineTo(215, bob - 14)
      ctx.lineTo(202, bob - 4)
      ctx.fillStyle = '#1a1a28'; ctx.fill()

      ctx.restore()
    }

    // ── MARINE ────────────────────────────────────────────────────────────────
    function drawMarine(m: { x: number; y: number; alpha: number; flash: number; isRipley: boolean }, lying = false, fallAngle = 0) {
      if (m.alpha <= 0) return
      ctx.save()
      ctx.globalAlpha = m.alpha

      if (lying) {
        // Ripley allongée au sol (rotation 90°)
        ctx.translate(m.x, m.y + 20)
        ctx.rotate(Math.PI / 2 * fallAngle)
      } else {
        ctx.translate(m.x, m.y)
      }

      if (m.flash > 0) {
        ctx.fillStyle = `rgba(0,0,0,${m.flash})`
        ctx.fillRect(-30, -90, 60, 110)
      }

      const suit = m.isRipley ? '#3a3038' : '#2c3028'
      const light = m.isRipley ? '#4a4050' : '#3a3c30'

      // Body
      ctx.fillStyle = suit
      ctx.beginPath(); ctx.ellipse(0, -28, 16, 30, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = light
      ctx.beginPath(); ctx.ellipse(0, -30, 10, 20, 0, 0, Math.PI * 2); ctx.fill()
      // Belt
      ctx.fillStyle = '#1a1c16'; ctx.beginPath(); ctx.rect(-15, -14, 30, 6); ctx.fill()

      // Legs
      ctx.fillStyle = suit
      ctx.beginPath(); ctx.ellipse(-8, 10, 8, 18, -0.08, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(8, 10, 8, 18, 0.08, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#14140e'
      ctx.beginPath(); ctx.ellipse(-10, 25, 10, 5, -0.2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(10, 25, 10, 5, 0.2, 0, Math.PI * 2); ctx.fill()

      // Head
      if (!m.isRipley) {
        ctx.fillStyle = '#303530'
        ctx.beginPath(); ctx.arc(0, -57, 15, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(170,200,220,0.2)'
        ctx.beginPath(); ctx.ellipse(0, -57, 10, 9, 0, 0, Math.PI * 2); ctx.fill()
      } else {
        ctx.fillStyle = '#e0a878'; ctx.beginPath(); ctx.arc(0, -58, 13, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#3a2010'
        ctx.beginPath(); ctx.ellipse(0, -64, 14, 9, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(-8, -62, 7, 6, -0.4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#111'
        ctx.beginPath(); ctx.arc(-4, -58, 2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(4, -58, 2, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#aa7050'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(-4, -53); ctx.lineTo(4, -53); ctx.stroke()
        ctx.fillStyle = '#888070'; ctx.beginPath(); ctx.rect(-8, -48, 16, 8); ctx.fill()
      }

      // Arms
      ctx.fillStyle = suit
      ctx.beginPath(); ctx.ellipse(-18, -28, 7, 16, -0.2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(18, -28, 7, 16, 0.2, 0, Math.PI * 2); ctx.fill()

      // Weapon
      if (m.isRipley) {
        ctx.fillStyle = '#302c20'; ctx.beginPath(); ctx.rect(-42, -38, 30, 10); ctx.fill()
        ctx.fillStyle = '#3a3828'; ctx.beginPath(); ctx.arc(-28, -32, 8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#1a1810'; ctx.beginPath(); ctx.rect(-46, -35, 6, 6); ctx.fill()
      } else {
        ctx.fillStyle = '#282c24'; ctx.beginPath(); ctx.rect(16, -40, 26, 8); ctx.fill()
        ctx.fillStyle = '#1e2218'; ctx.beginPath(); ctx.rect(28, -46, 12, 8); ctx.fill()
      }

      ctx.restore()
    }

    // ── CHESTBURSTER ─────────────────────────────────────────────────────────
    function drawChestburster(x: number, y: number, emerge: number, alpha: number) {
      if (alpha <= 0 || emerge <= 0) return
      ctx.save(); ctx.globalAlpha = alpha

      const visibleLen = emerge * 60  // émerge progressivement (60px total)
      // Masque : seulement la partie émergente visible
      ctx.beginPath(); ctx.rect(x - 20, y - visibleLen - 5, 40, visibleLen + 10); ctx.clip()

      ctx.translate(x, y)
      // Wriggle animation
      const wriggle = Math.sin(Date.now() * 0.012) * 6 * emerge

      // Corps (serpentin, fin)
      ctx.strokeStyle = '#c04020'; ctx.lineWidth = 8; ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(wriggle, -14, -wriggle * 0.8, -30, wriggle * 0.5, -46)
      ctx.bezierCurveTo(-wriggle * 0.6, -52, wriggle * 0.4, -56, 0, -62)
      ctx.stroke()
      // Ventre plus clair
      ctx.strokeStyle = '#d87050'; ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, -2)
      ctx.bezierCurveTo(wriggle * 0.5, -14, -wriggle * 0.4, -30, wriggle * 0.25, -46)
      ctx.stroke()

      // Tête (allongée, petite mâchoire)
      ctx.fillStyle = '#901818'
      ctx.beginPath(); ctx.ellipse(wriggle * 0.5, -64, 8, 12, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#b02020'
      ctx.beginPath(); ctx.ellipse(wriggle * 0.5, -68, 6, 7, 0, 0, Math.PI * 2); ctx.fill()
      // Dents
      ctx.fillStyle = '#e0d8c0'
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath(); ctx.moveTo(wriggle * 0.5 + t * 3, -62); ctx.lineTo(wriggle * 0.5 + t * 3, -68); ctx.lineTo(wriggle * 0.5 + t * 3 + 2, -62); ctx.fill()
      }
      // Yeux (petits, noirs)
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.arc(wriggle * 0.5 - 3, -70, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(wriggle * 0.5 + 3, -70, 2, 0, Math.PI * 2); ctx.fill()
      // Petits bras rudimentaires
      if (emerge > 0.5) {
        ctx.strokeStyle = '#a03020'; ctx.lineWidth = 3; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(wriggle * 0.4 - 6, -48); ctx.lineTo(wriggle * 0.4 - 14, -44); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(wriggle * 0.4 + 6, -48); ctx.lineTo(wriggle * 0.4 + 14, -44); ctx.stroke()
      }

      // Sang (flaque sous l'alien)
      const bloodG = ctx.createRadialGradient(0, 0, 0, 0, 0, 20 * emerge)
      bloodG.addColorStop(0, `rgba(160,0,0,${0.85 * emerge})`)
      bloodG.addColorStop(1, 'rgba(80,0,0,0)')
      ctx.fillStyle = bloodG
      ctx.beginPath(); ctx.ellipse(0, 0, 22 * emerge, 8 * emerge, 0, 0, Math.PI * 2); ctx.fill()

      ctx.restore()
    }

    // ── RENDER LOOP ───────────────────────────────────────────────────────────
    let raf: number

    function render(now: number) {
      if (done) return
      const elapsed = now - startTime

      // Flicker
      flickerTimer -= 16
      if (flickerTimer <= 0) {
        flickerTimer = 100 + Math.random() * 500
        if (Math.random() < 0.28) {
          lightFlicker = 0.15 + Math.random() * 0.55
          setTimeout(() => { lightFlicker = 0.75 + Math.random() * 0.25 }, 70 + Math.random() * 130)
        }
      }

      // Steam
      if (Math.random() < 0.15) spawnSteam()
      for (const s of steam) { s.y += s.vy; s.alpha -= 0.0015 }
      steam.splice(0, steam.filter(s => s.alpha <= 0).length)

      ctx.clearRect(0, 0, W, H)
      drawCorridor(lightFlicker)

      // Steam particles
      for (const s of steam) {
        ctx.save(); ctx.globalAlpha = s.alpha
        const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r)
        sg.addColorStop(0, 'rgba(200,200,200,0.15)'); sg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      // ── Kills ────────────────────────────────────────────────────────────
      if (elapsed >= T.kill1 && !crew[0].dead) {
        crew[0].dead = true; crew[0].flash = 1; sfx.killSFX()
        setTimeout(() => { crew[0].alpha = 0 }, 300)
      }
      if (elapsed >= T.kill2 && !crew[1].dead) {
        crew[1].dead = true; crew[1].flash = 1; sfx.killSFX()
        setTimeout(() => { crew[1].alpha = 0 }, 300)
      }
      if (elapsed >= T.kill3 && !crew[2].dead) {
        crew[2].dead = true; crew[2].flash = 1; sfx.killSFX()
        setTimeout(() => { crew[2].alpha = 0 }, 300)
      }
      for (const m of crew) { if (m.flash > 0) m.flash = Math.max(0, m.flash - 0.05) }

      // ── Alien movement ────────────────────────────────────────────────────
      if (elapsed < T.kill3) {
        // Se déplace en plafond vers chaque cible
        const targetIdx = elapsed < T.kill1 ? 0 : elapsed < T.kill2 ? 1 : 2
        alienState.targetX = crew[targetIdx].x + 40
        alienState.targetY = H * 0.28
        alienState.onCeiling = true
        alienState.visibility = Math.min(0.28, alienState.visibility + 0.003)
      } else if (elapsed >= T.approachR) {
        // Descend et s'approche de Ripley
        alienState.targetX = crew[3].x + 50
        alienState.targetY = crew[3].y - 80
        alienState.onCeiling = false
        alienState.visibility = Math.min(0.95, alienState.visibility + 0.01)
      }

      alienState.x += (alienState.targetX - alienState.x) * 0.022
      alienState.y += (alienState.targetY - alienState.y) * 0.022
      alienState.walkPhase += alienState.visibility > 0.5 ? 0.12 : 0.06

      // ── Ripley tombe (13s) ────────────────────────────────────────────────
      if (elapsed >= T.ripleyFalls) {
        ripleyFallAngle = Math.min(1, ripleyFallAngle + 0.025)
      }

      // ── Ventre distend (14.5s) ────────────────────────────────────────────
      if (elapsed >= T.bulge) {
        bellyBulge = Math.min(1, bellyBulge + 0.012)
        // Heartbeat sound
        if (elapsed - lastHeartbeat > 850) {
          lastHeartbeat = elapsed; sfx.heartbeatSFX()
        }
      }

      // ── Chestburster (16.8s) ──────────────────────────────────────────────
      if (elapsed >= T.burst) {
        if (cb.emerge === 0) {
          sfx.chestbursterSFX()
          cb.x = crew[3].x + 5
          cb.y = crew[3].y - 15 + ripleyFallAngle * 20
        }
        cb.emerge = Math.min(1, cb.emerge + 0.01)
      }

      if (elapsed >= T.flee && !cb.fleeing) {
        cb.fleeing = true; cb.fleeX = 4
      }
      if (cb.fleeing) {
        cb.x += cb.fleeX; cb.fleeAlpha = Math.max(0, cb.fleeAlpha - 0.012)
      }

      // ── Fade ──────────────────────────────────────────────────────────────
      if (elapsed >= T.fadeStart) {
        fadeAlpha = (elapsed - T.fadeStart) / (T.end - T.fadeStart)
        if (fadeAlpha >= 1 && !done) { done = true; sfx.stop(); onDone(); return }
      }

      // ── Draw alien ────────────────────────────────────────────────────────
      const alFlip = alienState.x > W * 0.5
      if (alienState.onCeiling) {
        ctx.save()
        ctx.translate(alienState.x, alienState.y)
        ctx.scale(1, -1)  // retourné au plafond
        ctx.translate(-alienState.x, -alienState.y)
        drawAlienFull(alienState.x, alienState.y + 20, alienState.walkPhase, alienState.visibility, !alFlip)
        ctx.restore()
      } else {
        drawAlienFull(alienState.x, alienState.y, alienState.walkPhase, alienState.visibility, alFlip)
      }

      // ── Draw crew (Ripley avec angle de chute) ────────────────────────────
      drawMarine(crew[0])
      drawMarine(crew[1])
      drawMarine(crew[2])
      drawMarine(crew[3], ripleyFallAngle > 0.1, ripleyFallAngle)

      // Belly bulge overlay sur Ripley
      if (bellyBulge > 0 && ripleyFallAngle > 0.5) {
        const bx = crew[3].x + ripleyFallAngle * 18
        const by = crew[3].y + 10
        const pulse = Math.sin(Date.now() * 0.01) * 4 * bellyBulge
        ctx.save(); ctx.globalAlpha = crew[3].alpha
        ctx.fillStyle = `rgba(195,115,75,${bellyBulge * 0.9})`
        ctx.beginPath(); ctx.ellipse(bx, by + pulse, 12 + bellyBulge * 22, 9 + bellyBulge * 14, 0, 0, Math.PI * 2); ctx.fill()
        if (bellyBulge > 0.6) {
          ctx.strokeStyle = `rgba(230,140,100,${(bellyBulge - 0.6) * 0.8})`
          ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx, by + pulse, 16 + bellyBulge * 22, 11 + bellyBulge * 14, 0, 0, Math.PI * 2); ctx.stroke()
        }
        ctx.restore()
      }

      // Chestburster
      drawChestburster(cb.x, cb.y, cb.emerge, cb.fleeAlpha)

      // Vignette sides
      const lFog = ctx.createLinearGradient(0, 0, W * 0.22, 0)
      lFog.addColorStop(0, 'rgba(3,3,7,0.65)'); lFog.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = lFog; ctx.fillRect(0, 0, W * 0.22, H)
      const rFog = ctx.createLinearGradient(W, 0, W * 0.78, 0)
      rFog.addColorStop(0, 'rgba(3,3,7,0.65)'); rFog.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rFog; ctx.fillRect(W * 0.78, 0, W * 0.22, H)

      if (fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAlpha)})`
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); sfx.stop() }
  }, [onDone])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 9999, width: '100%', height: '100%' }} />
}
