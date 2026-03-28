'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'

// ── CHARACTER DRAWING ─────────────────────────────────────────────────────────

function drawKenny(ctx: CanvasRenderingContext2D, cx: number, bottom: number, sqY = 1) {
  ctx.save(); ctx.translate(cx, bottom); ctx.scale(1, sqY)
  ctx.fillStyle = '#ee8800'; ctx.fillRect(-14, -40, 28, 40)
  ctx.beginPath(); ctx.arc(0, -44, 17, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f2d5a8'; ctx.beginPath(); ctx.ellipse(0, -44, 9, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#222'; ctx.fillRect(-5, -47, 4, 4); ctx.fillRect(1, -47, 4, 4)
  ctx.fillStyle = '#cc7700'; ctx.fillRect(-12, 0, 10, 18); ctx.fillRect(2, 0, 10, 18)
  ctx.fillStyle = '#111'; ctx.fillRect(-14, 16, 13, 5); ctx.fillRect(0, 16, 13, 5)
  ctx.restore()
}

function drawCartman(ctx: CanvasRenderingContext2D, cx: number, bottom: number) {
  ctx.save(); ctx.translate(cx, bottom)
  ctx.fillStyle = '#223366'; ctx.fillRect(-16, -30, 14, 30); ctx.fillRect(2, -30, 14, 30)
  ctx.fillStyle = '#111'; ctx.fillRect(-18, -4, 16, 5); ctx.fillRect(2, -4, 16, 5)
  ctx.fillStyle = '#cc1111'; ctx.fillRect(-20, -70, 40, 42)
  ctx.fillStyle = '#eee'; ctx.fillRect(-6, -68, 12, 28)
  ctx.fillStyle = '#ffcc55'; ctx.fillRect(-26, -58, 10, 14); ctx.fillRect(16, -58, 10, 14)
  ctx.fillStyle = '#f2d5a8'; ctx.fillRect(-6, -74, 12, 6)
  ctx.beginPath(); ctx.ellipse(0, -88, 20, 18, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#3355cc'; ctx.fillRect(-18, -106, 36, 20)
  ctx.fillStyle = '#ffcc00'; ctx.fillRect(-20, -88, 40, 5)
  ctx.fillStyle = '#222'; ctx.fillRect(-8, -92, 5, 5); ctx.fillRect(3, -92, 5, 5)
  ctx.fillStyle = '#cc8866'; ctx.fillRect(-5, -81, 10, 3)
  ctx.restore()
}

function drawKyle(ctx: CanvasRenderingContext2D, cx: number, bottom: number) {
  ctx.save(); ctx.translate(cx, bottom)
  ctx.fillStyle = '#553311'; ctx.fillRect(-10, -26, 9, 26); ctx.fillRect(1, -26, 9, 26)
  ctx.fillStyle = '#111'; ctx.fillRect(-12, -4, 12, 5); ctx.fillRect(0, -4, 12, 5)
  ctx.fillStyle = '#ee7700'; ctx.fillRect(-14, -60, 28, 36)
  ctx.fillRect(-20, -58, 8, 22); ctx.fillRect(12, -58, 8, 22)
  ctx.fillStyle = '#f2d5a8'; ctx.beginPath(); ctx.ellipse(0, -72, 14, 14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#228822'; ctx.fillRect(-16, -86, 32, 16); ctx.fillRect(-20, -74, 8, 10); ctx.fillRect(12, -74, 8, 10)
  ctx.fillStyle = '#cc2222'; ctx.beginPath(); ctx.arc(0, -82, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#222'; ctx.fillRect(-5, -75, 4, 4); ctx.fillRect(1, -75, 4, 4)
  ctx.restore()
}

function drawStan(ctx: CanvasRenderingContext2D, cx: number, bottom: number) {
  ctx.save(); ctx.translate(cx, bottom)
  ctx.fillStyle = '#444'; ctx.fillRect(-10, -26, 9, 26); ctx.fillRect(1, -26, 9, 26)
  ctx.fillStyle = '#111'; ctx.fillRect(-12, -4, 12, 5); ctx.fillRect(0, -4, 12, 5)
  ctx.fillStyle = '#7a3a1a'; ctx.fillRect(-14, -60, 28, 36)
  ctx.fillRect(-20, -58, 8, 22); ctx.fillRect(12, -58, 8, 22)
  ctx.fillStyle = '#f2d5a8'; ctx.beginPath(); ctx.ellipse(0, -72, 14, 14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#3366aa'; ctx.fillRect(-15, -86, 30, 16)
  ctx.fillStyle = '#cc2222'; ctx.fillRect(-15, -72, 30, 4)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -88, 7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#222'; ctx.fillRect(-5, -75, 4, 4); ctx.fillRect(1, -75, 4, 4)
  ctx.restore()
}

function drawBus(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const W = 240, H = 90, y = groundY - H
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath(); ctx.ellipse(x + W / 2, groundY + 4, W * 0.48, 8, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffcc00'; ctx.fillRect(x, y, W, H)
  ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 3; ctx.strokeRect(x, y, W, H)
  ctx.fillStyle = '#aaddff'
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 20 + i * 52, y + 10, 40, 30)
    ctx.strokeStyle = '#99bbdd'; ctx.lineWidth = 1
    ctx.strokeRect(x + 20 + i * 52, y + 10, 40, 30)
  }
  ctx.fillStyle = '#ee9900'; ctx.fillRect(x, y, 14, H)
  ctx.fillStyle = '#ffeeaa'; ctx.fillRect(x + 2, y + H - 22, 10, 10)
  ctx.fillStyle = '#cc2222'; ctx.fillRect(x - 6, y + 30, 6, 22)
  ctx.beginPath(); ctx.arc(x - 9, y + 41, 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'
  ctx.fillText('STOP', x - 9, y + 44)
  ctx.fillStyle = '#cc9900'; ctx.fillRect(x + W - 44, y + 22, 40, H - 22)
  ctx.strokeStyle = '#aa7700'; ctx.lineWidth = 2
  ctx.strokeRect(x + W - 44, y + 22, 40, H - 22)
  ctx.fillStyle = '#222'
  ctx.beginPath(); ctx.arc(x + 45, groundY - 2, 18, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + W - 45, groundY - 2, 18, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#666'
  ctx.beginPath(); ctx.arc(x + 45, groundY - 2, 8, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + W - 45, groundY - 2, 8, 0, Math.PI * 2); ctx.fill()
  // "SOUTH PARK ELEMENTARY" on side
  ctx.fillStyle = '#aa7700'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'
  ctx.fillText('SOUTH PARK ELEMENTARY', x + W / 2, y + 52)
}

// ── SCENE HELPERS ─────────────────────────────────────────────────────────────

function drawSky(ctx: CanvasRenderingContext2D, GW: number, GH: number, groundY: number, frame: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, GH)
  sky.addColorStop(0, '#04091f'); sky.addColorStop(0.6, '#0a1840'); sky.addColorStop(1, '#1a2a60')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, GW, GH)
  for (let i = 0; i < 120; i++) {
    const sx = (i * 173 + 31) % GW
    const sy = (i * 89 + 13) % (groundY * 0.62)
    const blink = Math.sin(frame * 0.04 + i * 0.7) > 0.3 ? 0.9 : 0.3
    ctx.globalAlpha = blink; ctx.fillStyle = i % 7 === 0 ? '#aaddff' : '#ffffff'
    ctx.fillRect(sx, sy, i % 9 === 0 ? 3 : 2, i % 9 === 0 ? 3 : 2)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#fffce0'; ctx.beginPath(); ctx.arc(GW * 0.82, GH * 0.1, 38, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#e8e080'
  ctx.beginPath(); ctx.arc(GW * 0.82 - 9, GH * 0.1 - 7, 7, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(GW * 0.82 + 11, GH * 0.1 + 9, 5, 0, Math.PI * 2); ctx.fill()
}

function drawMountains(ctx: CanvasRenderingContext2D, GW: number, groundY: number, scrollX = 0) {
  // Back range (slow parallax)
  ctx.fillStyle = '#dde8f4'
  ctx.beginPath(); ctx.moveTo(0, groundY)
  const bg: [number, number][] = [
    [0.04, 140], [0.14, 220], [0.26, 90], [0.38, 260], [0.52, 110],
    [0.63, 240], [0.75, 80], [0.87, 210], [0.96, 130], [1, 0]
  ]
  for (const [px, ph] of bg) ctx.lineTo(px * GW - scrollX * 0.12, groundY - ph)
  ctx.lineTo(GW, groundY); ctx.closePath(); ctx.fill()
  // Snow caps on back peaks
  ctx.fillStyle = '#f5faff'
  const caps: [number, number][] = [[0.14, 220], [0.38, 260], [0.63, 240], [0.87, 210]]
  for (const [px, ph] of caps) {
    ctx.beginPath()
    ctx.moveTo(px * GW - scrollX * 0.12, groundY - ph)
    ctx.lineTo(px * GW - 25 - scrollX * 0.12, groundY - ph + 55)
    ctx.lineTo(px * GW + 25 - scrollX * 0.12, groundY - ph + 55)
    ctx.closePath(); ctx.fill()
  }
  // Front range (medium parallax)
  ctx.fillStyle = '#b8cce0'
  ctx.beginPath(); ctx.moveTo(0, groundY)
  const fg: [number, number][] = [
    [0.06, 90], [0.18, 170], [0.30, 50], [0.44, 180], [0.57, 70],
    [0.69, 160], [0.80, 45], [0.91, 150], [1, 0]
  ]
  for (const [px, ph] of fg) ctx.lineTo(px * GW - scrollX * 0.25, groundY - ph)
  ctx.lineTo(GW, groundY); ctx.closePath(); ctx.fill()
}

function drawGround(ctx: CanvasRenderingContext2D, GW: number, GH: number, groundY: number, frame: number) {
  const snow = ctx.createLinearGradient(0, groundY, 0, GH)
  snow.addColorStop(0, '#ddeaf8'); snow.addColorStop(1, '#b0c4dc')
  ctx.fillStyle = snow; ctx.fillRect(0, groundY, GW, GH - groundY)
  ctx.fillStyle = '#1e1e28'; ctx.fillRect(0, groundY - 6, GW, 26)
  ctx.strokeStyle = '#ffff55'; ctx.setLineDash([50, 50]); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo((frame * 3) % 100 - 100, groundY + 7)
  ctx.lineTo(GW + 100, groundY + 7); ctx.stroke(); ctx.setLineDash([])
}

function drawPineTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, h = 85, w = 42) {
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 5, groundY - 22, 10, 24)
  const layers = [
    { frac: 0, col: '#1a4a1a', wm: 1.0 },
    { frac: 0.32, col: '#215221', wm: 0.78 },
    { frac: 0.57, col: '#2a6a2a', wm: 0.58 },
  ]
  for (const lay of layers) {
    const ly = groundY - 22 - h * lay.frac - h * 0.28
    const lh = h * 0.38
    const lw = w * lay.wm
    ctx.fillStyle = lay.col
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x - lw / 2, ly + lh); ctx.lineTo(x + lw / 2, ly + lh); ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(240,250,255,0.55)'
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x - lw * 0.22, ly + lh * 0.28); ctx.lineTo(x + lw * 0.22, ly + lh * 0.28); ctx.closePath(); ctx.fill()
  }
}

function drawSchool(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const w = 180, h = 130, y = groundY - h
  ctx.fillStyle = '#bb3a2a'; ctx.fillRect(x, y, w, h)
  // Brick pattern lines
  ctx.strokeStyle = '#993020'; ctx.lineWidth = 1
  for (let row = 0; row < 8; row++) {
    ctx.beginPath(); ctx.moveTo(x, y + row * 16); ctx.lineTo(x + w, y + row * 16); ctx.stroke()
  }
  // Windows (2 rows)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = row === 0 ? '#88ccff' : '#ffeeaa'  // top lit, bottom dim
      ctx.fillRect(x + 14 + col * 42, y + 16 + row * 42, 26, 22)
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1
      ctx.strokeRect(x + 14 + col * 42, y + 16 + row * 42, 26, 22)
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(x + 27 + col * 42, y + 16 + row * 42); ctx.lineTo(x + 27 + col * 42, y + 38 + row * 42); ctx.stroke()
    }
  }
  // Door
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + w / 2 - 18, groundY - 50, 36, 50)
  ctx.fillStyle = '#4a2a10'; ctx.fillRect(x + w / 2 - 18, groundY - 50, 36, 4)
  ctx.fillStyle = '#ffeeaa'; ctx.beginPath(); ctx.arc(x + w / 2 + 10, groundY - 26, 3, 0, Math.PI * 2); ctx.fill()
  // Steps
  ctx.fillStyle = '#bbb'; ctx.fillRect(x + w / 2 - 24, groundY - 8, 48, 8)
  // Sign above door
  ctx.fillStyle = '#fff8cc'; ctx.fillRect(x + 18, y - 26, w - 36, 20)
  ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 2; ctx.strokeRect(x + 18, y - 26, w - 36, 20)
  ctx.fillStyle = '#333'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'
  ctx.fillText('SOUTH PARK ELEMENTARY', x + w / 2, y - 11)
  // Flag pole + US flag
  ctx.fillStyle = '#999'; ctx.fillRect(x + w - 12, y - 55, 4, 58)
  ctx.fillStyle = '#cc2222'; ctx.fillRect(x + w - 8, y - 55, 24, 8)
  ctx.fillStyle = '#2244cc'; ctx.fillRect(x + w - 8, y - 55, 8, 8)
}

function drawTownHall(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const w = 120, h = 115, y = groundY - h
  ctx.fillStyle = '#886622'; ctx.fillRect(x, y, w, h)
  // Pillars
  ctx.fillStyle = '#aa8833'
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 12 + i * 28, y + h - 55, 10, 55)
  // Dome
  ctx.fillStyle = '#6a5010'; ctx.beginPath(); ctx.arc(x + w / 2, y + 5, w * 0.32, Math.PI, 0, false); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(x + w / 2, y, 8, 0, Math.PI * 2); ctx.fill()
  // Windows
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#88ccff'; ctx.fillRect(x + 16 + i * 34, y + 20, 20, 28)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x + 16 + i * 34, y + 20, 20, 28)
    ctx.beginPath(); ctx.arc(x + 26 + i * 34, y + 20, 10, Math.PI, 0); ctx.strokeStyle = '#fff'; ctx.stroke()
  }
  // Door
  ctx.fillStyle = '#5a3a10'; ctx.fillRect(x + w / 2 - 13, groundY - 42, 26, 42)
  ctx.beginPath(); ctx.arc(x + w / 2, groundY - 42, 13, Math.PI, 0); ctx.fill()
  // Label
  ctx.fillStyle = '#fff8cc'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'
  ctx.fillText('TOWN HALL', x + w / 2, y - 8)
  // Clock face
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.22, 16, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.22, 16, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.22); ctx.lineTo(x + w / 2, y + h * 0.22 - 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.22); ctx.lineTo(x + w / 2 + 7, y + h * 0.22 + 4); ctx.stroke()
}

function drawWelcomeSign(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const y = groundY - 105
  ctx.fillStyle = '#7a5210'; ctx.fillRect(x, y + 10, 6, 95); ctx.fillRect(x + 114, y + 10, 6, 95)
  ctx.fillStyle = '#4a7a28'; ctx.fillRect(x - 8, y - 40, 136, 54)
  ctx.strokeStyle = '#2a5a18'; ctx.lineWidth = 3; ctx.strokeRect(x - 8, y - 40, 136, 54)
  ctx.fillStyle = '#2a5a18'
  ctx.fillRect(x - 8, y - 40, 136, 8); ctx.fillRect(x - 8, y + 6, 136, 8)
  ctx.fillStyle = '#ffee88'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
  ctx.fillText('WELCOME TO', x + 60, y - 20)
  ctx.font = 'bold 15px monospace'; ctx.fillText('SOUTH PARK', x + 60, y - 4)
  ctx.fillStyle = '#aaffaa'; ctx.font = '8px monospace'; ctx.fillText('A Nice Place', x + 60, y + 14)
}

function drawCoffeeShop(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const w = 90, h = 95, y = groundY - h
  ctx.fillStyle = '#8B5A2B'; ctx.fillRect(x, y, w, h)
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#88ccff'; ctx.fillRect(x + 8 + i * 38, y + 14, 30, 26)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x + 8 + i * 38, y + 14, 30, 26)
  }
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + w / 2 - 14, groundY - 36, 28, 36)
  // Awning
  ctx.fillStyle = '#cc3311'
  ctx.beginPath(); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x + w + 4, y + 2); ctx.lineTo(x + w, y + 16); ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + i * 20, y + 2); ctx.lineTo(x + i * 20, y + 16); ctx.stroke() }
  // Sign
  ctx.fillStyle = '#ffffaa'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'
  ctx.fillText("TWEEK'S", x + w / 2, y - 10)
  ctx.fillText('COFFEE', x + w / 2, y - 0)
  // Steam from coffee
  ctx.strokeStyle = 'rgba(200,200,200,0.6)'; ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + 20 + i * 25, y - 8)
    ctx.quadraticCurveTo(x + 25 + i * 25, y - 20, x + 20 + i * 25, y - 32); ctx.stroke()
  }
}

function drawBusStop(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  ctx.fillStyle = '#999'; ctx.fillRect(x - 4, groundY - 128, 8, 128)
  // Hexagon sign
  ctx.fillStyle = '#ee8800'
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    const sr = 28
    if (i === 0) ctx.moveTo(x + sr * Math.cos(a), groundY - 156 + sr * Math.sin(a))
    else ctx.lineTo(x + sr * Math.cos(a), groundY - 156 + sr * Math.sin(a))
  }
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#cc6600'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
  ctx.fillText('BUS', x, groundY - 160)
  ctx.fillText('STOP', x, groundY - 146)
  // Bench
  ctx.fillStyle = '#8B6914'; ctx.fillRect(x - 38, groundY - 28, 76, 6)
  ctx.fillRect(x - 36, groundY - 28, 8, 20); ctx.fillRect(x + 28, groundY - 28, 8, 20)
}

function drawSnowflakes(ctx: CanvasRenderingContext2D, GW: number, GH: number, frame: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137 + frame * (0.4 + (i % 4) * 0.15)) % (GW + 20)) - 10
    const sy = (i * 73 + frame * (0.8 + (i % 3) * 0.3)) % (GH + 20)
    const size = i % 3 === 0 ? 3 : 2
    ctx.fillRect(sx, sy, size, size)
  }
}

// ── SOUTH PARK BUS — OPENING SEQUENCE ────────────────────────────────────────

export function SouthParkBus({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    discoverEgg('southpark')
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!
    const GW = canvas.width, GH = canvas.height
    const groundY = GH * 0.73

    // Audio
    const audio = new Audio('/sons/south-park-theme.opus')
    audio.volume = 0.85
    audio.play().catch(() => {})

    // Bus stop sign X
    const STOP_X = GW * 0.60

    // Kids: each walks in from the left one by one
    const kids = [
      { fn: drawStan,    x: -80,  stopX: STOP_X - 170, speed: 3.5, startT: 3.0,  onBus: false },
      { fn: drawKyle,    x: -80,  stopX: STOP_X - 120, speed: 3.2, startT: 5.0,  onBus: false },
      { fn: drawCartman, x: -80,  stopX: STOP_X - 65,  speed: 2.0, startT: 7.0,  onBus: false },
      { fn: (c: CanvasRenderingContext2D, x: number, b: number) => drawKenny(c, x, b, 1), x: -80, stopX: STOP_X - 15, speed: 4.5, startT: 9.0,  onBus: false },
    ]

    let busX = GW + 80
    let busArrived = false
    let busLeaving = false
    let scrollX = 0
    let frame = 0
    let titleAlpha = 0
    let sceneAlpha = 0
    let endTitleAlpha = 0

    // Town elements (x = offset from right edge when bus starts driving)
    const TOWN = [
      { type: 'tree', x: 40 }, { type: 'tree', x: 90 },
      { type: 'school', x: 160 },
      { type: 'tree', x: 380 }, { type: 'tree', x: 435 },
      { type: 'townhall', x: 495 },
      { type: 'tree', x: 660 },
      { type: 'sign', x: 720 },
      { type: 'tree', x: 870 }, { type: 'tree', x: 930 }, { type: 'tree', x: 985 },
      { type: 'coffee', x: 1060 },
      { type: 'tree', x: 1190 },
      { type: 'school', x: 1260 },
      { type: 'tree', x: 1470 }, { type: 'tree', x: 1530 },
    ]

    function drawTown(offX: number) {
      for (const el of TOWN) {
        const ex = GW - offX + el.x
        if (ex < GW + 320 && ex > -320) {
          ctx.save()
          if (el.type === 'tree')     drawPineTree(ctx, ex, groundY)
          if (el.type === 'school')   drawSchool(ctx, ex, groundY)
          if (el.type === 'townhall') drawTownHall(ctx, ex, groundY)
          if (el.type === 'sign')     drawWelcomeSign(ctx, ex, groundY)
          if (el.type === 'coffee')   drawCoffeeShop(ctx, ex, groundY)
          ctx.restore()
        }
      }
    }

    const startMs = performance.now()
    const fallback = setTimeout(() => { cancelAnimationFrame(rafRef.current); onDone() }, 50000)

    function loop() {
      frame++
      const t = (performance.now() - startMs) / 1000
      ctx.clearRect(0, 0, GW, GH)

      // ── INTRO: 0-2s ─────────────────────────────────────────
      if (t < 2) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, GW, GH)
        drawSnowflakes(ctx, GW, GH, frame)
        titleAlpha = Math.min(1, t / 1.4)
        ctx.globalAlpha = titleAlpha
        ctx.fillStyle = '#ffcc00'
        ctx.font = `bold ${Math.min(90, GW * 0.11)}px monospace`
        ctx.textAlign = 'center'
        ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 28
        ctx.fillText('SOUTH PARK', GW / 2, GH * 0.44)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffff'; ctx.font = `${Math.min(22, GW * 0.028)}px monospace`
        ctx.fillText('❄  COLORADO  ❄', GW / 2, GH * 0.55)
        ctx.globalAlpha = 1
        rafRef.current = requestAnimationFrame(loop); return
      }

      // ── MAIN SCENE ───────────────────────────────────────────
      const st = t - 2  // scene time

      sceneAlpha = Math.min(1, st / 0.8)

      // Sky, mountains, ground
      ctx.globalAlpha = sceneAlpha
      drawSky(ctx, GW, GH, groundY, frame)
      drawMountains(ctx, GW, groundY, busLeaving ? scrollX : 0)
      drawGround(ctx, GW, GH, groundY, frame)
      ctx.globalAlpha = 1

      // Bus stop sign (disappears when bus drives away)
      if (!busLeaving) {
        ctx.globalAlpha = Math.min(1, sceneAlpha)
        drawBusStop(ctx, STOP_X, groundY)
        ctx.globalAlpha = 1
      }

      // Snow
      drawSnowflakes(ctx, GW, GH, frame)

      // ── KIDS WALK IN ─────────────────────────────────────────
      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i]
        if (st < kid.startT || kid.onBus) continue
        const atStop = kid.x >= kid.stopX
        if (!atStop) kid.x = Math.min(kid.stopX, kid.x + kid.speed)
        const walking = !atStop
        const bob = walking ? Math.sin(t * 14 + i) * 3 : Math.sin(t * 1.8 + i * 1.2) * 1
        ctx.save(); ctx.translate(0, bob)
        kid.fn(ctx, kid.x, groundY - 8)
        ctx.restore()
      }

      // ── BUS ARRIVES (st >= 12) ────────────────────────────────
      if (st >= 12) {
        const targetX = STOP_X - 230
        if (busX > targetX) {
          const speed = Math.max(3, (busX - targetX) * 0.09 + 2)
          busX = Math.max(targetX, busX - speed)
          if (busX <= targetX) busArrived = true
        }
      }

      // ── KIDS BOARD (st >= 16) ─────────────────────────────────
      if (busArrived && st >= 16) {
        for (let i = kids.length - 1; i >= 0; i--) {
          const kid = kids[i]
          if (kid.onBus) continue
          const bt = 16 + (kids.length - 1 - i) * 1.1
          if (st >= bt) {
            kid.x += 7
            if (kid.x > busX + 200) kid.onBus = true
          }
        }
      }

      // ── BUS DRIVES (st >= 20) ─────────────────────────────────
      if (busArrived && st >= 20) {
        if (!busLeaving) busLeaving = true
        busX -= 5; scrollX += 5
        drawTown(scrollX)
      }

      // Draw bus
      if (st >= 11) {
        ctx.globalAlpha = Math.min(1, (st - 11) * 2)
        drawBus(ctx, busX, groundY - 8)
        ctx.globalAlpha = 1
      }

      // "SOUTH PARK — COLORADO" watermark
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.font = `${Math.min(15, GW * 0.02)}px monospace`
      ctx.textAlign = 'left'
      ctx.fillText('SOUTH PARK — COLORADO', 18, 28)

      // ── END TITLE ────────────────────────────────────────────
      const dur = audio.duration || 35
      if (t >= dur - 3.5) {
        endTitleAlpha = Math.min(1, (t - (dur - 3.5)) / 2)
        ctx.fillStyle = `rgba(0,0,0,${endTitleAlpha * 0.88})`
        ctx.fillRect(0, 0, GW, GH)
        ctx.globalAlpha = endTitleAlpha
        ctx.fillStyle = '#ffcc00'
        ctx.font = `bold ${Math.min(96, GW * 0.12)}px monospace`
        ctx.textAlign = 'center'
        ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 34
        ctx.fillText('SOUTH PARK', GW / 2, GH * 0.47)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffff'; ctx.font = `${Math.min(22, GW * 0.028)}px monospace`
        ctx.fillText('Created by Trey Parker & Matt Stone', GW / 2, GH * 0.58)
        ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    audio.addEventListener('ended', () => {
      setTimeout(() => { cancelAnimationFrame(rafRef.current); clearTimeout(fallback); onDone() }, 800)
    })

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(fallback)
      audio.pause()
    }
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', cursor: 'pointer' }} onClick={onDone}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '.75rem', fontFamily: 'monospace', letterSpacing: '1px' }}>
        cliquer pour fermer
      </div>
    </div>
  )
}

// ── KENNY DEATH ───────────────────────────────────────────────────────────────

export function KennyDeath({ onDone, text1, text2 }: { onDone: () => void; text1?: string; text2?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    discoverEgg('kenny')
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!
    const GW = canvas.width, GH = canvas.height
    const groundY = GH * 0.72
    const kennyTargetX = GW * 0.44
    let frame = 0, phase = 0, kennyX = -50
    let pianoY = -130, squishY = 1, text1Alpha = 0, text2Alpha = 0
    const pianoFinalY = groundY - 70

    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => { phase = 1 }, 1400))
    timers.push(setTimeout(() => { phase = 2 }, 1900))
    timers.push(setTimeout(() => { phase = 3 }, 2500))
    timers.push(setTimeout(() => { phase = 4 }, 3600))
    timers.push(setTimeout(onDone, 5800))

    function loop() {
      frame++
      ctx.clearRect(0, 0, GW, GH)
      const sky = ctx.createLinearGradient(0, 0, 0, GH)
      sky.addColorStop(0, '#1a2a5e'); sky.addColorStop(1, '#3a5a9e')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, GW, GH)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137 + 23) % GW), sy = ((i * 89 + 7) % (groundY * 0.8))
        const blink = Math.sin(frame * 0.05 + i) > 0.5 ? 1 : 0.5
        ctx.globalAlpha = blink * 0.7; ctx.fillRect(sx, sy, 2, 2)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      const mtns: [number, number][] = [[GW*0.1,groundY],[GW*0.22,groundY-140],[GW*0.35,groundY],[GW*0.5,groundY-100],[GW*0.62,groundY],[GW*0.78,groundY-160],[GW*0.9,groundY],[GW,groundY]]
      ctx.beginPath(); ctx.moveTo(0, groundY)
      mtns.forEach(([mx,my]) => ctx.lineTo(mx, my))
      ctx.lineTo(GW, groundY); ctx.fill()
      const snow = ctx.createLinearGradient(0, groundY, 0, GH)
      snow.addColorStop(0, '#e8eef8'); snow.addColorStop(1, '#c8d4e8')
      ctx.fillStyle = snow; ctx.fillRect(0, groundY, GW, GH - groundY)
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, groundY - 2, GW, 20)
      if (phase === 0) kennyX = Math.min(kennyTargetX, kennyX + 5)
      if (phase === 2) squishY = Math.max(0.08, squishY - 0.08)
      if (phase === 1) pianoY = Math.min(pianoFinalY, pianoY + (pianoFinalY - pianoY) * 0.18 + 6)
      if (phase >= 1) {
        const px = kennyX - 24, py = pianoY
        ctx.fillStyle = '#111'; ctx.fillRect(px, py - 28, 54, 28)
        for (let k = 0; k < 6; k++) { ctx.fillStyle = '#eee'; ctx.fillRect(px + 2 + k * 8, py - 26, 6, 20) }
        ctx.fillStyle = '#000'
        for (const bk of [1, 2, 4, 5]) ctx.fillRect(px + 4 + bk * 8, py - 26, 5, 13)
        ctx.fillStyle = '#333'; ctx.fillRect(px + 4, py, 8, 20); ctx.fillRect(px + 42, py, 8, 20)
      }
      drawKenny(ctx, kennyX, groundY, squishY)
      if (phase >= 2) {
        ctx.save(); ctx.globalAlpha = Math.min(1, (frame - 60) * 0.1)
        ctx.font = '2rem sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(['💀', '⭐', '💥'][(frame >> 3) % 3], kennyX, groundY - 20)
        ctx.restore()
      }
      if (phase >= 3) {
        text1Alpha = Math.min(1, text1Alpha + 0.07)
        ctx.save(); ctx.globalAlpha = text1Alpha; ctx.textAlign = 'center'
        ctx.font = 'bold 38px Georgia, serif'; ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5
        ctx.strokeText(text1 ?? 'Oh mon Dieu ! Ils ont tué Kenny !', GW / 2, GH * 0.32)
        ctx.fillText(text1 ?? 'Oh mon Dieu ! Ils ont tué Kenny !', GW / 2, GH * 0.32)
        ctx.restore()
      }
      if (phase >= 4) {
        text2Alpha = Math.min(1, text2Alpha + 0.07)
        ctx.save(); ctx.globalAlpha = text2Alpha; ctx.textAlign = 'center'
        ctx.font = 'bold 28px Georgia, serif'; ctx.fillStyle = '#ffdd00'
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4
        ctx.strokeText(text2 ?? "Espèce d'enfoirés !", GW / 2, GH * 0.46)
        ctx.fillText(text2 ?? "Espèce d'enfoirés !", GW / 2, GH * 0.46)
        ctx.restore()
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current); timers.forEach(clearTimeout) }
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'pointer' }} onClick={onDone}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '.75rem', fontFamily: 'monospace' }}>cliquer pour fermer</div>
    </div>
  )
}

// ── RANDY MARSH ───────────────────────────────────────────────────────────────

export function RandyMarsh({ onDone, quote }: { onDone: () => void; quote?: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    discoverEgg('randy')
    const t1 = setTimeout(() => setLeaving(true), 6500)
    const t2 = setTimeout(onDone, 7300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  const RandyPixel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
      <div style={{ width: 50, height: 12, background: '#6b3a1f', borderRadius: '6px 6px 0 0' }} />
      <div style={{ width: 50, height: 44, borderRadius: '46% 46% 42% 42%', background: '#f2c888', position: 'relative', overflow: 'visible' }}>
        <div style={{ position: 'absolute', left: -7, top: 10, width: 8, height: 12, background: '#f2c888', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: -7, top: 10, width: 8, height: 12, background: '#f2c888', borderRadius: '50%' }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 8, height: 8, background: '#2a2a2a', borderRadius: '50%' }} />
          <div style={{ width: 8, height: 8, background: '#2a2a2a', borderRadius: '50%' }} />
        </div>
        <div style={{ width: 30, height: 6, background: '#8B4513', borderRadius: 3, margin: '4px auto 0', border: '1px solid #6a3310' }} />
        <div style={{ width: 18, height: 4, background: '#e8967a', borderRadius: 2, margin: '3px auto 0' }} />
      </div>
      <div style={{ width: 58, height: 48, background: '#5b9bd5', borderRadius: '4px 4px 0 0', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 6px 0' }}>
        <div style={{ width: 4, height: 3, background: '#4a8ac4', borderRadius: 1, marginTop: 2 }} />
        <div style={{ width: 16, height: 20, background: '#4a8ac4', borderRadius: '1px 1px 0 0', marginTop: 6 }} />
        <div style={{ width: 4, height: 3, background: '#4a8ac4', borderRadius: 1, marginTop: 2 }} />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ width: 26, height: 28, background: '#7a7a8a', borderRadius: '0 0 3px 3px' }} />
        <div style={{ width: 26, height: 28, background: '#7a7a8a', borderRadius: '0 0 3px 3px' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 20, height: 8, background: '#5a4030', borderRadius: '0 0 4px 4px' }} />
        <div style={{ width: 20, height: 8, background: '#5a4030', borderRadius: '0 0 4px 4px' }} />
      </div>
    </div>
  )

  return (
    <div
      onClick={onDone}
      style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        animation: leaving ? 'ee-randy-leave 0.7s ease-in forwards' : 'ee-randy-enter 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
      <style>{`
        @keyframes ee-randy-enter { from { transform:translateY(120%) } to { transform:translateY(0) } }
        @keyframes ee-randy-leave { from { transform:translateY(0) } to { transform:translateY(130%) } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <RandyPixel />
        <div style={{ background: 'rgba(0,0,0,0.75)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 'var(--r)', padding: '.8rem 1.4rem', maxWidth: 320, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#fff', marginBottom: '.4rem' }}>Randy Marsh</div>
          <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{quote ?? "Je suis tellement fier de moi."}"
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '.7rem' }}>cliquer pour fermer</div>
      </div>
    </div>
  )
}
