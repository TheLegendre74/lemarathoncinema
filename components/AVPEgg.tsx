'use client'

import { useEffect, useRef } from 'react'
import { discoverEgg } from '@/lib/actions'

type Phase = 'entering' | 'clash' | 'separate' | 'pred_fires' | 'alien_acid' | 'grapple' | 'leaving' | 'done'
interface Fighter { x: number; y: number; facing: 1 | -1; state: string }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }
interface Projectile { x: number; y: number; vx: number; vy: number; life: number; type: 'plasma' | 'acid' }

export default function AVPEgg({ onDone }: { onDone: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    discoverEgg('avp')
    const W = window.innerWidth, H = window.innerHeight

    // ── Two canvas layers ──────────────────────────────────────
    // Main canvas: characters + real-time effects (cleared each frame)
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!

    // Damage canvas: persistent holes + acid (NOT cleared)
    const dmgCanvas = document.createElement('canvas')
    dmgCanvas.width = W; dmgCanvas.height = H
    dmgCanvas.style.cssText = 'position:fixed;inset:0;z-index:9997;pointer-events:none;'
    document.body.appendChild(dmgCanvas)
    const dctx = dmgCanvas.getContext('2d')!

    // ── DOM targets ───────────────────────────────────────────
    const allEls: HTMLElement[] = []
    document.querySelectorAll('p,h1,h2,h3,span,a,button,label,li').forEach(el => {
      const h = el as HTMLElement
      if (!h.closest('[data-avp-overlay]') && h.getBoundingClientRect().width > 10) allEls.push(h)
    })
    const damaged: { el: HTMLElement; orig: string }[] = []

    function damageDOMNear(x: number, y: number, type: 'fire' | 'acid') {
      let closest: HTMLElement | null = null; let minD = 250
      for (const el of allEls) {
        const r = el.getBoundingClientRect(); if (!r.width) continue
        const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y)
        if (d < minD) { minD = d; closest = el }
      }
      if (!closest || damaged.find(d => d.el === closest)) return
      damaged.push({ el: closest, orig: closest.style.cssText })
      if (type === 'fire') {
        closest.style.cssText += ';color:#ff6600!important;text-shadow:0 0 8px #ff3300,0 0 20px #ff1100!important;transition:all .3s;'
        setTimeout(() => { if (closest) closest.style.cssText += ';opacity:0.25!important;transform:skewX(6deg)!important;' }, 600)
      } else {
        closest.style.cssText += ';color:#44ff44!important;text-shadow:0 0 6px #00ff00,0 0 18px #00ff00!important;filter:saturate(4) hue-rotate(90deg)!important;transition:all .3s;'
        setTimeout(() => { if (closest) closest.style.cssText += ';filter:blur(1.5px) saturate(3) hue-rotate(100deg)!important;transform:scaleY(0.88)!important;' }, 500)
      }
    }

    // ── Persistent damage on dmgCanvas ────────────────────────
    function addBurnHole(x: number, y: number, r: number) {
      const g = dctx.createRadialGradient(x, y, 0, x, y, r + 24)
      g.addColorStop(0, 'rgba(0,0,0,0.97)'); g.addColorStop(0.35, 'rgba(15,5,0,0.88)')
      g.addColorStop(0.65, 'rgba(50,20,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r + 24, 0, Math.PI * 2); dctx.fill()
      dctx.strokeStyle = 'rgba(90,40,0,0.7)'; dctx.lineWidth = 1.5
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        dctx.beginPath(); dctx.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4)
        dctx.lineTo(x + Math.cos(a) * (r + 26 + Math.random() * 20), y + Math.sin(a) * (r + 26 + Math.random() * 20)); dctx.stroke()
      }
      damageDOMNear(x, y, 'fire')
    }

    function addAcidSplat(x: number, y: number, r: number) {
      const g = dctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(80,255,40,0.92)'); g.addColorStop(0.5, 'rgba(40,200,20,0.65)'); g.addColorStop(1, 'rgba(0,80,0,0)')
      dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill()
      dctx.strokeStyle = 'rgba(60,255,40,0.55)'; dctx.lineWidth = 2
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.3 + (Math.random() - 0.5) * 1.8
        dctx.beginPath(); dctx.moveTo(x, y); dctx.lineTo(x + Math.cos(a) * (r + 30 + Math.random() * 40), y + Math.sin(a) * (r + 15 + Math.random() * 20)); dctx.stroke()
      }
      damageDOMNear(x, y, 'acid')
    }

    // ── Particle helpers ──────────────────────────────────────
    const particles: Particle[] = []
    const projectiles: Projectile[] = []

    function spawnExplosion(x: number, y: number, n = 18) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2; const spd = 3 + Math.random() * 9
        particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2,
          life: 45 + Math.random() * 30, maxLife: 75, size: 7 + Math.random() * 10,
          color: `hsl(${15 + Math.random() * 35},100%,${50 + Math.random() * 20}%)` })
      }
      for (let i = 0; i < 6; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 14, vy: -7 - Math.random() * 8,
        life: 55 + Math.random() * 35, maxLife: 90, size: 3 + Math.random() * 5, color: '#888' })
    }

    function spawnAcidSplash(x: number, y: number) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2; const spd = 2 + Math.random() * 7
        particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1.5,
          life: 28 + Math.random() * 20, maxLife: 48, size: 5 + Math.random() * 9,
          color: `hsla(${100 + Math.random() * 50},100%,50%,0.85)` })
      }
    }

    // ── Draw Alien (faithful to H.R. Giger design) ────────────
    function drawAlien(f: Fighter, frame: number) {
      const { x, y, facing, state } = f
      ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1)
      const atk = state === 'attack'
      const run = state === 'run'
      const legOsc = run ? Math.sin(frame * 0.3) * 14 : 0

      // == TAIL (long, segmented, looping behind) ==
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0a1a0a'; ctx.lineWidth = 10
      ctx.beginPath(); ctx.moveTo(-14, -62)
      ctx.bezierCurveTo(-65, -30, -110, 25, -95, 85)
      ctx.bezierCurveTo(-80, 130, -35, 128, 5, 150); ctx.stroke()
      ctx.strokeStyle = '#142014'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(-14, -62)
      ctx.bezierCurveTo(-65, -30, -110, 25, -95, 85)
      ctx.bezierCurveTo(-80, 130, -35, 128, 5, 150); ctx.stroke()
      // Tail spines (segmentation)
      for (let i = 1; i < 9; i++) {
        const t = i / 9
        const tx = -14 + t * 19 + Math.sin(t * Math.PI) * (-81)
        const ty = -62 + t * 212
        ctx.fillStyle = '#1c361c'; ctx.beginPath(); ctx.ellipse(tx, ty, 4, 7, 0.6, 0, Math.PI * 2); ctx.fill()
      }
      // Tail blade tip
      ctx.fillStyle = '#78b878'
      ctx.beginPath(); ctx.moveTo(5, 150); ctx.lineTo(-10, 136); ctx.lineTo(18, 142); ctx.closePath(); ctx.fill()

      // == LEGS (digitigrade) ==
      ctx.fillStyle = '#0c1c0c'
      // Left
      ctx.save(); ctx.translate(-12, -55); ctx.rotate(0.08 + legOsc * 0.038)
      ctx.fillRect(-7, 0, 14, 34); ctx.restore()
      ctx.save(); ctx.translate(-12, -23 + legOsc * 0.6); ctx.rotate(-0.22)
      ctx.fillRect(-6, 0, 12, 30); ctx.restore()
      // Right
      ctx.save(); ctx.translate(12, -55); ctx.rotate(-0.08 - legOsc * 0.038)
      ctx.fillRect(-7, 0, 14, 34); ctx.restore()
      ctx.save(); ctx.translate(12, -23 - legOsc * 0.6); ctx.rotate(0.22)
      ctx.fillRect(-6, 0, 12, 30); ctx.restore()
      // Feet
      ctx.fillStyle = '#081408'
      ctx.fillRect(-20, 6 + legOsc * 0.5, 22, 8); ctx.fillRect(0, 6 - legOsc * 0.5, 22, 8)
      ctx.strokeStyle = '#5a9a5a'; ctx.lineWidth = 1.5
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-20 + i * 7, 14 + legOsc * 0.5); ctx.lineTo(-23 + i * 7, 25 + legOsc * 0.5); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0 + i * 7, 14 - legOsc * 0.5); ctx.lineTo(-3 + i * 7, 25 - legOsc * 0.5); ctx.stroke()
      }

      // == BODY (ribcage, hunched forward) ==
      ctx.fillStyle = '#0d1e0d'
      ctx.beginPath(); ctx.ellipse(2, -92, 22, 42, -0.12, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#1b381b'; ctx.lineWidth = 1.8
      for (let i = 0; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(-20, -118 + i * 11)
        ctx.quadraticCurveTo(2, -116 + i * 11, 22, -118 + i * 11); ctx.stroke()
      }
      // Dorsal tubes (key Alien feature)
      ctx.lineCap = 'round'
      for (let i = 0; i < 4; i++) {
        const tx = -6 + i * 5
        ctx.strokeStyle = '#0b1b0b'; ctx.lineWidth = 7
        ctx.beginPath(); ctx.moveTo(tx, -122); ctx.bezierCurveTo(tx - 14, -142, tx + 9, -165, tx + 1, -175); ctx.stroke()
        ctx.strokeStyle = '#182818'; ctx.lineWidth = 4
        ctx.beginPath(); ctx.moveTo(tx, -122); ctx.bezierCurveTo(tx - 14, -142, tx + 9, -165, tx + 1, -175); ctx.stroke()
        ctx.fillStyle = '#1b3a1b'; ctx.beginPath(); ctx.arc(tx + 1, -175, 5, 0, Math.PI * 2); ctx.fill()
      }

      // == ARMS ==
      ctx.fillStyle = '#0c1c0c'
      // Back arm
      ctx.save(); ctx.translate(-22, -116); ctx.rotate(-0.38)
      ctx.fillRect(-6, 0, 12, 52)
      ctx.strokeStyle = '#68a868'; ctx.lineWidth = 1.5
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 4, 52); ctx.lineTo(-8 + i * 4, 66); ctx.stroke() }
      ctx.restore()
      // Front arm (extends when attacking)
      const atkExt = atk ? 24 : 0
      ctx.save(); ctx.translate(16, -116); ctx.rotate(atk ? -0.55 : -0.14)
      ctx.fillRect(-6, 0, 12, 52 + atkExt)
      ctx.strokeStyle = '#8acc8a'; ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 4, 52 + atkExt); ctx.lineTo(-9 + i * 4, 68 + atkExt); ctx.stroke() }
      ctx.restore()

      // == NECK ==
      ctx.fillStyle = '#0e1a0e'; ctx.fillRect(-6, -136, 12, 26)
      ctx.strokeStyle = '#142014'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(-8, -136); ctx.lineTo(-13, -121); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(8, -136); ctx.lineTo(13, -121); ctx.stroke()

      // == HEAD (elongated biomechanical cranium — the Giger design) ==
      ctx.save(); ctx.translate(8, -162); ctx.rotate(0.18)
      ctx.fillStyle = '#0c1c0c'
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 42, 0.22, 0, Math.PI * 2); ctx.fill()
      // Sheen
      const hg = ctx.createLinearGradient(-18, -42, 18, 0)
      hg.addColorStop(0, 'rgba(40,80,40,0.14)'); hg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 0, 18, 42, 0.22, 0, Math.PI * 2); ctx.fill()
      // Head grooves
      ctx.strokeStyle = '#152815'; ctx.lineWidth = 1.2
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, -12 + i * 16, 14, 5, 0.22, 0, Math.PI); ctx.stroke() }
      ctx.restore()

      // == JAWS (outer + inner mouth) ==
      ctx.fillStyle = '#0e1e0e'; ctx.fillRect(-12, -126, 25, 20)
      if (atk) {
        ctx.fillStyle = '#18281a'; ctx.fillRect(-10, -126, 21, 18)
        // Outer teeth
        ctx.fillStyle = '#c0e0c0'
        for (let i = 0; i < 5; i++) {
          ctx.beginPath(); ctx.moveTo(-9 + i * 4.5, -126); ctx.lineTo(-7 + i * 4.5, -113); ctx.lineTo(-5 + i * 4.5, -126); ctx.fill()
        }
        // INNER JAW — small second mouth extending forward (key Alien feature)
        ctx.fillStyle = '#7a2200'; ctx.fillRect(-4, -122, 9, 14 + atkExt * 0.45)
        ctx.fillStyle = '#d49030'
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(-3 + i * 3.5, -108 + atkExt * 0.45)
          ctx.lineTo(-1 + i * 3.5, -101 + atkExt * 0.45)
          ctx.lineTo(1 + i * 3.5, -108 + atkExt * 0.45)
          ctx.fill()
        }
      }
      // Acid drool (animated)
      const droolSwing = Math.sin(frame * 0.11) * 3
      ctx.strokeStyle = 'rgba(90,230,55,0.65)'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(10 + droolSwing, -122); ctx.quadraticCurveTo(12, -115, 10, -108 + droolSwing); ctx.stroke()
      ctx.fillStyle = 'rgba(70,210,40,0.6)'
      ctx.beginPath(); ctx.arc(10, -106 + droolSwing, 4, 0, Math.PI * 2); ctx.fill()

      ctx.restore()
    }

    // ── Draw Predator (faithful to film design) ───────────────
    function drawPredator(f: Fighter, frame: number) {
      const { x, y, facing, state } = f
      ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1)
      const atk = state === 'attack' || state === 'fire'
      const run = state === 'run'
      const legOsc = run ? Math.sin(frame * 0.28) * 12 : 0

      // == LEGS (heavy armor) ==
      ctx.fillStyle = '#382a0a'
      ctx.fillRect(-18, -92, 16, 92); ctx.fillRect(2, -92, 16, 92)
      // Knee armor plates
      ctx.fillStyle = '#645818'
      ctx.fillRect(-21, -60, 20, 16); ctx.fillRect(1, -60, 20, 16)
      // Shin plates
      ctx.fillStyle = '#483c10'
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-19, -42 + i * 14, 15, 12); ctx.fillRect(4, -42 + i * 14, 15, 12)
      }
      // Feet
      ctx.fillStyle = '#1c1006'; ctx.fillRect(-21, -5, 24, 8); ctx.fillRect(0, -5, 24, 8)
      ctx.strokeStyle = '#7a6a28'; ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-21 + i * 9, 3); ctx.lineTo(-24 + i * 9, 14); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0 + i * 9, 3); ctx.lineTo(-3 + i * 9, 14); ctx.stroke()
      }

      // == BODY ARMOR ==
      ctx.fillStyle = '#483810'
      ctx.beginPath(); ctx.ellipse(0, -124, 28, 46, 0, 0, Math.PI * 2); ctx.fill()
      // Chest plate (raised, detailed)
      ctx.fillStyle = '#685820'
      ctx.beginPath(); ctx.ellipse(0, -130, 22, 32, 0, 0, Math.PI * 2); ctx.fill()
      const cpGrad = ctx.createLinearGradient(-22, -162, 22, -98)
      cpGrad.addColorStop(0, 'rgba(150,130,50,0.35)'); cpGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cpGrad; ctx.beginPath(); ctx.ellipse(0, -130, 22, 32, 0, 0, Math.PI * 2); ctx.fill()
      // Chest detail lines
      ctx.strokeStyle = '#8a7a2a'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.ellipse(0, -134, 15, 20, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-12, -136); ctx.lineTo(12, -136); ctx.stroke()
      // Net pattern on body
      ctx.strokeStyle = 'rgba(100,80,18,0.3)'; ctx.lineWidth = 0.8
      for (let i = 0; i < 9; i++) {
        ctx.beginPath(); ctx.moveTo(-28, -160 + i * 13); ctx.lineTo(28, -160 + i * 13); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(-28 + i * 7, -160); ctx.lineTo(-28 + i * 7, -82); ctx.stroke()
      }
      // Shoulder pads (large, rounded)
      ctx.fillStyle = '#584818'
      ctx.beginPath(); ctx.ellipse(-32, -152, 22, 14, -0.45, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(32, -152, 22, 14, 0.45, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#7a6a28'
      ctx.beginPath(); ctx.ellipse(-32, -152, 15, 9, -0.45, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(32, -152, 15, 9, 0.45, 0, Math.PI * 2); ctx.fill()

      // == SHOULDER PLASMA CANNON (right) ==
      ctx.fillStyle = '#281e06'; ctx.fillRect(22, -178, 26, 30)
      // Barrel socket
      ctx.fillStyle = '#181204'; ctx.fillRect(38, -168, 8, 14)
      // Cannon barrel (pivots toward target when firing)
      const cannonAng = state === 'fire' ? -0.35 : -0.12
      ctx.save(); ctx.translate(48, -163); ctx.rotate(cannonAng)
      ctx.fillStyle = '#181204'; ctx.fillRect(0, -5, 50, 10)
      // Barrel rings
      ctx.strokeStyle = '#3a3010'; ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) { ctx.strokeRect(i * 12, -5, 10, 10) }
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(44, -4, 8, 8)
      // Targeting laser when firing
      if (state === 'fire') {
        ctx.strokeStyle = 'rgba(255,60,0,0.75)'; ctx.lineWidth = 1.2
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(50, i * 12); ctx.lineTo(250, i * 25); ctx.stroke()
        }
        // 3 targeting dots
        ctx.fillStyle = '#ff3300'
        ctx.save(); ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 8
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.arc(250, i * 25, 4, 0, Math.PI * 2); ctx.fill()
        }
        ctx.restore()
      }
      ctx.restore()

      // == ARMS ==
      ctx.fillStyle = '#382a08'
      // Left arm (wrist blades side)
      ctx.save(); ctx.translate(-32, -152); ctx.rotate(atk ? 0.65 : 0.22)
      ctx.fillRect(-8, 0, 16, 56)
      // Wrist gauntlet
      ctx.fillStyle = '#584818'; ctx.fillRect(-11, 44, 22, 14)
      // Wrist blades
      if (atk) {
        ctx.strokeStyle = '#c8c440'; ctx.lineWidth = 2.5; ctx.lineCap = 'square'
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 7, 44); ctx.lineTo(-20 + i * 7, 2); ctx.stroke() }
      }
      ctx.restore()
      // Right arm
      ctx.save(); ctx.translate(32, -152); ctx.rotate(atk ? -0.35 : -0.12)
      ctx.fillRect(-8, 0, 16, 52)
      ctx.fillStyle = '#584818'; ctx.fillRect(-10, 40, 20, 12); ctx.restore()

      // == HEAD ==
      ctx.fillStyle = '#2c2006'
      ctx.beginPath(); ctx.ellipse(0, -188, 24, 30, 0, 0, Math.PI * 2); ctx.fill()

      // DREADLOCKS/QUILLS (characteristic feature)
      ctx.lineCap = 'round'
      const dlX = [-22, -16, -10, -4, 2, 8, 14, 20, -19, 5]
      for (let i = 0; i < dlX.length; i++) {
        const dx = dlX[i]
        const sway = run ? Math.sin(frame * 0.3 + i * 0.9) * 5 : Math.sin(frame * 0.05 + i * 0.45) * 2.5
        ctx.strokeStyle = i % 2 === 0 ? '#221804' : '#2c2208'
        ctx.lineWidth = 5 - (i % 3) * 0.7
        ctx.beginPath(); ctx.moveTo(dx, -166)
        ctx.bezierCurveTo(dx + sway, -148, dx + sway * 1.6, -132, dx + sway * 2.2, -112); ctx.stroke()
        // Banding rings on dreads
        ctx.strokeStyle = '#4a380e'; ctx.lineWidth = 1.5
        for (let j = 1; j < 3; j++) {
          const bt = j / 3
          ctx.beginPath()
          ctx.moveTo(dx + sway * bt * 2.2 - 4, -166 + bt * 54)
          ctx.lineTo(dx + sway * bt * 2.2 + 4, -166 + bt * 54); ctx.stroke()
        }
      }

      // BIO-MASK (iconic) — covers most of face
      ctx.fillStyle = '#747052'
      ctx.beginPath(); ctx.ellipse(2, -190, 20, 24, 0, 0, Math.PI * 2); ctx.fill()
      // Mask ridge details
      ctx.strokeStyle = '#5e5c3e'; ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(2, -190, 17 - i * 3, 20 - i * 4, 0, -Math.PI * 0.8, Math.PI * 0.8); ctx.stroke() }
      // Mask outer rim
      ctx.strokeStyle = '#96947a'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.ellipse(2, -190, 19, 23, 0, 0, Math.PI * 2); ctx.stroke()
      // THREE RED TARGETING DOTS on mask (iconic)
      ctx.save(); ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 10
      ctx.fillStyle = '#ff2800'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(-6 + i * 6, -198, 3.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()

      // MANDIBLES (4 claw appendages — key Predator feature)
      ctx.strokeStyle = '#4a3c12'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'
      const mang = [-0.55, -0.2, 0.2, 0.55]
      for (let i = 0; i < 4; i++) {
        const open = atk && (i === 0 || i === 3) ? 1.35 : 1
        const tip = { x: 2 + Math.cos(mang[i] * open) * 30, y: -174 + (atk ? 10 : 5) }
        ctx.beginPath(); ctx.moveTo(2 + Math.cos(mang[i]) * 18, -176); ctx.lineTo(tip.x, tip.y); ctx.stroke()
        ctx.fillStyle = '#8a7830'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2); ctx.fill()
      }

      ctx.restore()
    }

    // ── Characters ─────────────────────────────────────────────
    const alien: Fighter = { x: -150, y: H * 0.7, facing: 1, state: 'run' }
    const pred: Fighter  = { x: W + 150, y: H * 0.7, facing: -1, state: 'run' }

    let phase: Phase = 'entering'
    let phaseMs = 0
    let lastMs = performance.now()
    let frame = 0

    const PHASE_DUR: Record<string, number> = {
      entering: 2000, clash: 2800, separate: 2000,
      pred_fires: 3000, alien_acid: 2600, grapple: 2600, leaving: 2200,
    }
    const PHASES: Phase[] = ['entering', 'clash', 'separate', 'pred_fires', 'alien_acid', 'grapple', 'leaving']

    function advancePhase() {
      const idx = PHASES.indexOf(phase)
      phase = idx < PHASES.length - 1 ? PHASES[idx + 1] : 'done'
      phaseMs = 0
    }

    function loop() {
      const now = performance.now()
      const dt = now - lastMs; lastMs = now
      phaseMs += dt; frame++

      ctx.clearRect(0, 0, W, H)

      if (phase !== 'done' && phase !== 'leaving' && phaseMs > PHASE_DUR[phase]) advancePhase()

      if (phase === 'leaving' && phaseMs > PHASE_DUR.leaving) {
        phase = 'done'
        for (const { el, orig } of damaged) el.style.cssText = orig
        let a = 1
        const fadeId = setInterval(() => {
          a -= 0.04; dmgCanvas.style.opacity = String(Math.max(0, a))
          if (a <= 0) { clearInterval(fadeId); dmgCanvas.remove(); canvas.remove(); onDone() }
        }, 50)
        return
      }

      // ── Phase behaviors ────────────────────────────────────
      if (phase === 'entering') {
        const ax = W * 0.3, px = W * 0.7
        if (alien.x < ax) { alien.x += 7; alien.state = 'run' } else { alien.state = 'idle'; alien.x = ax }
        if (pred.x > px) { pred.x -= 7; pred.state = 'run' } else { pred.state = 'idle'; pred.x = px }
      }
      else if (phase === 'clash') {
        const t = phaseMs / PHASE_DUR.clash
        alien.x = W * 0.3 + Math.sin(phaseMs * 0.004) * 55 + t * 28
        pred.x  = W * 0.7 + Math.cos(phaseMs * 0.0038) * 55 - t * 28
        alien.y = H * 0.7 + Math.sin(phaseMs * 0.007) * 18
        pred.y  = H * 0.7 + Math.cos(phaseMs * 0.006) * 16
        alien.state = 'attack'; pred.state = 'attack'
        if (frame % 7 === 0) {
          spawnExplosion((alien.x + pred.x) / 2, (alien.y + pred.y) / 2 - 80, 10)
          if (frame % 21 === 0) addBurnHole((alien.x + pred.x) / 2 + (Math.random() - .5) * 120, (alien.y + pred.y) / 2 + (Math.random() - .5) * 80, 18 + Math.random() * 14)
        }
      }
      else if (phase === 'separate') {
        const ang = phaseMs * 0.0024
        alien.x = W * .5 + Math.cos(ang) * W * .2
        pred.x  = W * .5 + Math.cos(ang + Math.PI) * W * .2
        alien.y = H * .7 + Math.sin(ang * 2) * H * .06
        pred.y  = H * .7 + Math.sin(ang * 2 + Math.PI) * H * .06
        alien.state = 'idle'; pred.state = 'idle'
      }
      else if (phase === 'pred_fires') {
        alien.x = W * .28 + Math.sin(phaseMs * .006) * 90
        alien.y = H * .7 + Math.sin(phaseMs * .009) * 22
        pred.x  = W * .72; pred.y = H * .7
        alien.state = 'run'; pred.state = 'fire'
        if (phaseMs % 680 < dt + 16) {
          const ang = Math.atan2(alien.y - pred.y, alien.x - pred.x)
          projectiles.push({ x: pred.x - 55, y: pred.y - 162, vx: Math.cos(ang) * 15, vy: Math.sin(ang) * 15, life: 80, type: 'plasma' })
        }
      }
      else if (phase === 'alien_acid') {
        alien.x = W * .44 + Math.cos(phaseMs * .005) * 65
        alien.y = H * .7 + Math.sin(phaseMs * .008) * 20
        pred.x  = W * .64 + Math.sin(phaseMs * .004) * 42
        pred.y  = H * .7 + Math.cos(phaseMs * .007) * 14
        alien.state = 'attack'; pred.state = 'attack'
        if (phaseMs % 580 < dt + 16) {
          const ang = Math.atan2(pred.y - alien.y, pred.x - alien.x)
          projectiles.push({ x: alien.x + 20, y: alien.y - 112, vx: Math.cos(ang) * 11, vy: Math.sin(ang) * 11, life: 58, type: 'acid' })
        }
        if (frame % 28 === 0) spawnExplosion((alien.x + pred.x) / 2, (alien.y + pred.y) / 2 - 60, 10)
      }
      else if (phase === 'grapple') {
        const gX = W * .5, gY = H * .7
        alien.x = gX - 42 + Math.sin(phaseMs * .022) * 18
        pred.x  = gX + 42 + Math.cos(phaseMs * .02) * 18
        alien.y = gY + Math.sin(phaseMs * .018) * 24
        pred.y  = gY + Math.cos(phaseMs * .016) * 24
        alien.state = 'attack'; pred.state = 'attack'
        if (frame % 5 === 0) {
          spawnExplosion(gX + (Math.random() - .5) * 120, gY - 80 + (Math.random() - .5) * 70, 16)
          if (frame % 15 === 0) {
            addBurnHole(gX + (Math.random() - .5) * 220, gY + (Math.random() - .5) * 160, 22 + Math.random() * 22)
            addAcidSplat(gX + (Math.random() - .5) * 220, gY + (Math.random() - .5) * 160, 35 + Math.random() * 35)
          }
        }
      }
      else if (phase === 'leaving') {
        // Both charge off to the right — Alien chasing Predator
        alien.x += 9; pred.x += 11
        alien.state = 'run'; pred.state = 'run'
        alien.facing = 1; pred.facing = 1
      }

      // Update facing
      if (phase !== 'leaving') {
        alien.facing = alien.x <= pred.x ? 1 : -1
        pred.facing  = pred.x >= alien.x ? -1 : 1
      }

      // ── Projectiles ────────────────────────────────────────
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i]
        p.x += p.vx; p.y += p.vy; p.life--

        if (p.type === 'plasma') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx))
          const pg = ctx.createLinearGradient(-22, 0, 22, 0)
          pg.addColorStop(0, 'rgba(0,80,255,0)'); pg.addColorStop(.4, 'rgba(80,160,255,0.8)'); pg.addColorStop(.8, 'rgba(220,240,255,1)'); pg.addColorStop(1, 'rgba(255,255,255,.5)')
          ctx.fillStyle = pg; ctx.fillRect(-22, -6, 44, 12)
          ctx.shadowColor = '#88bbff'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff'; ctx.fillRect(-9, -3, 18, 6)
          ctx.restore()
          particles.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, life: 12, maxLife: 12, size: 7 + Math.random() * 5, color: 'rgba(130,190,255,0.7)' })
        } else {
          ctx.save(); ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 14
          ctx.fillStyle = '#55ff22'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#aaffaa'; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 5, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
          particles.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, life: 10, maxLife: 10, size: 5 + Math.random() * 5, color: 'rgba(80,255,40,0.7)' })
        }

        const hitA = p.type === 'plasma' && Math.hypot(p.x - alien.x, p.y - alien.y) < 55
        const hitP = p.type === 'acid' && Math.hypot(p.x - pred.x, p.y - pred.y) < 65
        const offScr = p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30

        if (p.life <= 0 || offScr || hitA || hitP) {
          if (p.type === 'plasma') { spawnExplosion(p.x, p.y, 20); addBurnHole(p.x, p.y, 20 + Math.random() * 16) }
          else { spawnAcidSplash(p.x, p.y); addAcidSplat(p.x, p.y, 28 + Math.random() * 28) }
          projectiles.splice(i, 1)
        }
      }

      // ── Particles ──────────────────────────────────────────
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.life--
        if (p.life <= 0) { particles.splice(i, 1); continue }
        const a = p.life / p.maxLife
        ctx.save(); ctx.globalAlpha = a * 0.9; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 5
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      }

      // ── Draw characters ────────────────────────────────────
      drawAlien(alien, frame)
      drawPredator(pred, frame)

      // ── Clash sparks ────────────────────────────────────────
      if (phase !== 'entering' && phase !== 'leaving') {
        const dist = Math.hypot(pred.x - alien.x, pred.y - alien.y)
        if (dist < 200) {
          ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(frame * 0.4) * 0.35
          ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 22; ctx.fillStyle = '#ffdd44'
          ctx.font = `bold ${22 + Math.sin(frame * 0.28) * 7}px monospace`; ctx.textAlign = 'center'
          const clashes = ['💥', '⚡', '🔥', '💢', '✨']
          ctx.fillText(clashes[Math.floor(frame * 0.14) % clashes.length], (alien.x + pred.x) / 2, Math.min(alien.y, pred.y) - 130 + Math.sin(frame * 0.2) * 25)
          ctx.restore()
        }
      }

      // ── HUD ──────────────────────────────────────────────────
      ctx.save(); ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'
      if (phase === 'entering') { ctx.fillStyle = 'rgba(0,255,60,0.55)'; ctx.fillText('⚠ ALIEN vs PREDATOR — INTRUSION DÉTECTÉE', 14, 22) }
      else if (phase !== 'leaving') { ctx.fillStyle = 'rgba(255,120,0,0.6)'; ctx.fillText('⚠ COMBAT EN COURS — DOMMAGES CRITIQUES', 14, 22) }
      else { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.fillText('Ils continuent leur combat... dehors.', W / 2, H * 0.42) }
      ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.remove(); dmgCanvas.remove()
      for (const { el, orig } of damaged) el.style.cssText = orig
    }
  }, [onDone])

  return <div data-avp-overlay ref={overlayRef} style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none' }} />
}
