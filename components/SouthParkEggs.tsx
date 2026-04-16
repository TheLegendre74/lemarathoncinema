'use client'

import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { discoverEgg } from '@/lib/actions'

// ═══════════════════════════════════════════════════════════════════
//  CHARACTER DRAWING — origin (0,0) = bottom-center at ground level
//  South Park style: gigantic round heads, tiny boxy bodies, flat 2D
//  ALL 4 kids are the SAME HEIGHT. Cartman is WIDER, not taller.
//  Eyes = large white circles + tiny black dot (the SP signature look)
// ═══════════════════════════════════════════════════════════════════

type G = Phaser.GameObjects.Graphics

const SKIN = 0xF5C89A  // SP skin tone (slightly warm peach)

// ── STAN MARSH ──────────────────────────────────────────────────────
// Navy beanie + red pompom | brown jacket + buttons | red mittens | blue pants
function drawStan(g: G) {
  // Short blue pants — barely visible under jacket
  g.fillStyle(0x2A3A7A); g.fillRect(-11, -20, 22, 20)

  // Brown jacket body — flat, boxy
  g.fillStyle(0x8B5A35); g.fillRect(-19, -68, 38, 48)
  // Dark seam down center
  g.fillStyle(0x5A3518)
  for (let i = 0; i < 4; i++) g.fillCircle(0, -60 + i * 13, 2.5)

  // Red mittens
  g.fillStyle(0xCC1010)
  g.fillEllipse(-29, -46, 18, 14); g.fillEllipse(29, -46, 18, 14)

  // Big round head
  g.fillStyle(SKIN)
  g.fillCircle(0, -92, 26)
  g.fillCircle(-27, -92, 9); g.fillCircle(27, -92, 9)  // ear bumps

  // Navy blue beanie — flat-topped, snug on head
  g.fillStyle(0x303085)
  g.fillRect(-24, -122, 48, 33)     // hat body
  g.fillEllipse(0, -122, 50, 18)    // dome
  g.fillRect(-26, -94, 52, 8)       // cuff/band at base
  // Red pompom on top
  g.fillStyle(0xCC1010); g.fillCircle(0, -127, 9)

  // Eyes — SP style: big white circle, tiny black dot
  g.fillStyle(0xFFFFFF)
  g.fillCircle(-10, -95, 11); g.fillCircle(10, -95, 11)
  g.fillStyle(0x111111)
  g.fillCircle(-10, -95, 5); g.fillCircle(10, -95, 5)
  // Tiny nose dot
  g.fillStyle(0xC8946A); g.fillCircle(0, -89, 2.5)
}

// ── KYLE BROFLOVSKI ─────────────────────────────────────────────────
// Green ushanka w/ ear flaps | orange jacket + 2 pockets | green mittens
function drawKyle(g: G) {
  // Dark pants
  g.fillStyle(0x2A3344); g.fillRect(-11, -20, 22, 20)

  // Orange jacket
  g.fillStyle(0xE07828); g.fillRect(-19, -68, 38, 48)
  // Two square pockets — Kyle's signature jacket detail
  g.fillStyle(0xC06010)
  g.fillRect(-15, -56, 12, 11); g.fillRect(3, -56, 12, 11)

  // Green mittens (match hat)
  g.fillStyle(0x2EA828)
  g.fillEllipse(-29, -46, 18, 14); g.fillEllipse(29, -46, 18, 14)

  // Big round head
  g.fillStyle(SKIN)
  g.fillCircle(0, -92, 26)
  g.fillCircle(-27, -92, 9); g.fillCircle(27, -92, 9)

  // Green ushanka hat — distinctive large rounded dome, ear flaps hanging
  g.fillStyle(0x22A020)
  // Main dome (very wide, round top — bigger than Stan's hat)
  g.fillEllipse(0, -120, 62, 36)   // big rounded dome
  g.fillRect(-30, -116, 60, 30)    // hat body fill (square below dome)
  // Ear flaps — hang down on sides
  g.fillRect(-40, -112, 14, 28)    // left flap
  g.fillRect(26, -112, 14, 28)     // right flap
  // Darker trim/band at base of hat
  g.fillStyle(0x188016)
  g.fillRect(-30, -90, 60, 6)

  // Eyes
  g.fillStyle(0xFFFFFF)
  g.fillCircle(-10, -95, 11); g.fillCircle(10, -95, 11)
  g.fillStyle(0x111111)
  g.fillCircle(-10, -95, 5); g.fillCircle(10, -95, 5)
  g.fillStyle(0xC8946A); g.fillCircle(0, -89, 2.5)
}

// ── ERIC CARTMAN ────────────────────────────────────────────────────
// Light blue bonnet + yellow pompom | red jacket WIDE | yellow mittens
// SAME HEIGHT as others — just significantly WIDER (fat)
function drawCartman(g: G) {
  // Brown pants (wide)
  g.fillStyle(0x6B4830); g.fillRect(-14, -20, 28, 20)

  // Red puffer jacket — much wider than others
  g.fillStyle(0xCC1111); g.fillRect(-30, -68, 60, 48)
  // Center zipper
  g.fillStyle(0xAA0000); g.fillRect(-3, -68, 6, 48)

  // Yellow/gold mittens (bigger)
  g.fillStyle(0xFFCC00)
  g.fillEllipse(-38, -46, 20, 16); g.fillEllipse(38, -46, 20, 16)

  // Head — same height as others, slightly wider (chubby face)
  g.fillStyle(SKIN)
  g.fillCircle(0, -92, 28)         // slightly bigger radius = chubby
  g.fillCircle(-29, -92, 10); g.fillCircle(29, -92, 10)

  // Light blue hat — same shape as Stan's beanie but wider (for wider head)
  g.fillStyle(0x5AB8E8)
  g.fillRect(-26, -124, 52, 35)
  g.fillEllipse(0, -124, 56, 20)
  g.fillRect(-28, -94, 56, 8)
  // Yellow pompom
  g.fillStyle(0xFFCC00); g.fillCircle(0, -130, 10)

  // Eyes — wider apart on chubby face
  g.fillStyle(0xFFFFFF)
  g.fillCircle(-11, -95, 11); g.fillCircle(11, -95, 11)
  g.fillStyle(0x111111)
  g.fillCircle(-11, -95, 5); g.fillCircle(11, -95, 5)
  g.fillStyle(0xC8946A); g.fillCircle(0, -89, 2.5)
}

// ── KENNY MCCORMICK ─────────────────────────────────────────────────
// Full orange parka — hood tied tight, only small face oval visible
function drawKenny(g: G) {
  // Orange legs/pants
  g.fillStyle(0xCC6A15); g.fillRect(-11, -20, 22, 20)

  // Orange parka body
  g.fillStyle(0xE07820); g.fillRect(-19, -68, 38, 48)
  // Horizontal parka folds (texture detail)
  g.fillStyle(0xBE5E12)
  g.fillRect(-19, -56, 38, 4); g.fillRect(-19, -42, 38, 4)

  // Small brown mittens
  g.fillStyle(0x7A4520)
  g.fillEllipse(-26, -46, 16, 12); g.fillEllipse(26, -46, 16, 12)

  // Hood — same total height as other characters
  // Outer orange hood blob (same radius as others' heads)
  g.fillStyle(0xE07820); g.fillCircle(0, -92, 26)
  // Inner darker ring — the tied hood border
  g.fillStyle(0xBE5E12); g.fillCircle(0, -92, 22)
  // Tiny face opening — small warm oval of skin
  g.fillStyle(SKIN); g.fillEllipse(0, -92, 26, 22)
  // Hood tie strings (hang below face opening)
  g.fillStyle(0x9A4808)
  g.fillRect(-9, -76, 3, 9); g.fillRect(6, -76, 3, 9)

  // Eyes — small, visible through face hole
  g.fillStyle(0xFFFFFF)
  g.fillCircle(-8, -95, 8); g.fillCircle(8, -95, 8)
  g.fillStyle(0x111111)
  g.fillCircle(-8, -95, 4); g.fillCircle(8, -95, 4)
  // Tiny nose
  g.fillStyle(0xC8946A); g.fillCircle(0, -89, 2)
}

// ═══════════════════════════════════════════════════════════════════
//  BUS — Yellow school bus, left-facing
// ═══════════════════════════════════════════════════════════════════

function drawBus(g: G) {
  const W = 300, H = 110
  const y = -H
  // Shadow
  g.fillStyle(0x000000, 0.15); g.fillEllipse(W / 2, 6, W * 0.88, 16)
  // Main yellow body
  g.fillStyle(0xFFCC00); g.fillRect(0, y, W, H)
  // Black stripes
  g.fillStyle(0x111111)
  g.fillRect(0, y + H * 0.42, W, 5)   // lower stripe
  g.fillRect(0, y + H * 0.16, W, 3)   // upper thin stripe
  // Passenger windows (5)
  g.fillStyle(0x88CCEE)
  for (let i = 0; i < 5; i++) g.fillRect(34 + i * 50, y + 10, 38, 30)
  g.fillStyle(0x333333)
  for (let i = 0; i < 5; i++) g.strokeRect(34 + i * 50, y + 10, 38, 30)
  // Front cab (darker yellow)
  g.fillStyle(0xEEAA00); g.fillRect(0, y, 30, H)
  // Windshield
  g.fillStyle(0x88CCEE); g.fillRect(4, y + 10, 22, 26)
  // Headlight
  g.fillStyle(0xFFFF88); g.fillRect(2, y + H - 24, 16, 12)
  // Stop sign arm
  g.fillStyle(0xCC2222)
  g.fillRect(-16, y + 30, 16, 6)
  g.fillCircle(-22, y + 33, 11)
  g.fillStyle(0xFFFFFF)
  g.fillRect(-29, y + 30, 15, 6)   // STOP white stripe
  // Rear section
  g.fillStyle(0xEEAA00); g.fillRect(W - 38, y + H * 0.25, 38, H * 0.75)
  // Taillights
  g.fillStyle(0xFF4422); g.fillRect(W - 8, y + 30, 6, 14)
  // Wheels
  g.fillStyle(0x1A1A1A)
  g.fillCircle(60, 0, 20); g.fillCircle(W - 60, 0, 20)
  g.fillStyle(0x555555)
  g.fillCircle(60, 0, 9); g.fillCircle(W - 60, 0, 9)
  // Wheel bolts
  g.fillStyle(0x888888)
  g.fillCircle(60, 0, 4); g.fillCircle(W - 60, 0, 4)
}

// ═══════════════════════════════════════════════════════════════════
//  BUILDINGS — origin (0,0) = ground bottom-left
// ═══════════════════════════════════════════════════════════════════

// SoDoSoPa — modern glass gentrification building
function drawSodoSopa(g: G) {
  const w = 160, h = 200
  // Main glass tower
  g.fillStyle(0x3A7AAF); g.fillRect(0, -h, w, h)
  // Glass panels (grid)
  g.fillStyle(0x5A9AD0)
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 3; col++)
      g.fillRect(8 + col * 50, -h + 16 + row * 37, 38, 26)
  g.lineStyle(1.5, 0x2A5A8F, 1)
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 3; col++)
      g.strokeRect(8 + col * 50, -h + 16 + row * 37, 38, 26)
  // Rooftop stripe + penthouse
  g.fillStyle(0x1A3A6A); g.fillRect(0, -h, w, 10)
  g.fillRect(55, -h - 22, 50, 22)
  g.fillStyle(0x3A7AAF); g.fillRect(58, -h - 20, 44, 20)
  // Sign band "SODOSOPA"
  g.fillStyle(0x102050); g.fillRect(0, -h + h * 0.7, w, 32)
  g.lineStyle(2, 0x4A8ADE); g.strokeRect(0, -h + h * 0.7, w, 32)
  // Glass door entrance
  g.fillStyle(0x1A3A6A); g.fillRect(w / 2 - 22, -52, 44, 52)
  g.fillStyle(0x5A9AD0); g.fillRect(w / 2 - 20, -50, 40, 46)
  // Door handle
  g.fillStyle(0xFFD700); g.fillRect(w / 2 + 10, -30, 6, 3)
  // Potted trees flanking entrance
  g.fillStyle(0x1A5A1A); g.fillCircle(w / 2 - 36, -18, 11)
  g.fillStyle(0x1A5A1A); g.fillCircle(w / 2 + 36, -18, 11)
  g.fillStyle(0x7A5A30); g.fillRect(w / 2 - 39, -7, 7, 7)
  g.fillStyle(0x7A5A30); g.fillRect(w / 2 + 32, -7, 7, 7)
}

// Cartmanland — personal amusement park, Cartman's face on sign
function drawCartmanland(g: G) {
  // Roller coaster structure behind
  g.lineStyle(5, 0xAA8833, 1)
  g.beginPath()
  g.moveTo(25, -140); g.lineTo(25, -250)
  g.lineTo(90, -200); g.lineTo(150, -270); g.lineTo(190, -190); g.lineTo(190, -140)
  g.strokePath()
  g.lineStyle(3, 0x887722, 1)
  for (const sx of [55, 120, 165]) {
    g.beginPath(); g.moveTo(sx, -140); g.lineTo(sx, -220 + (sx * 0.2)); g.strokePath()
  }
  // Coaster cart
  g.fillStyle(0xFF2222); g.fillRect(90, -215, 30, 15)
  g.fillStyle(0xFFFF00); g.fillCircle(100, -215, 4); g.fillCircle(112, -215, 4)
  // Main entrance building (red)
  g.fillStyle(0xCC1111); g.fillRect(0, -140, 210, 140)
  // Top banner (gold)
  g.fillStyle(0xFFCC00); g.fillRect(0, -152, 210, 16)
  g.lineStyle(3, 0xCC8800); g.strokeRect(0, -152, 210, 16)
  // Gate pillars (left and right)
  g.fillStyle(0xFF3333)
  g.fillRect(0, -190, 32, 190); g.fillRect(178, -190, 32, 190)
  // Gold sphere on top of each pillar
  g.fillStyle(0xFFCC00)
  g.fillCircle(16, -192, 14); g.fillCircle(194, -192, 14)
  // Stars on pillars
  g.fillStyle(0xFFFFFF)
  for (let i = 0; i < 3; i++) {
    g.fillCircle(16, -140 + i * 30, 5); g.fillCircle(194, -140 + i * 30, 5)
  }
  // Big gate door (dark red, locked)
  g.fillStyle(0x880000); g.fillRect(55, -110, 100, 110)
  g.fillStyle(0xAA0000); g.fillRect(57, -108, 96, 104)
  // Big padlock — Cartmanland, you can't get in
  g.fillStyle(0xFFCC00); g.fillCircle(105, -55, 12)
  g.fillStyle(0xCC9900); g.fillRect(98, -43, 14, 12); g.fillCircle(105, -43, 7)
  g.fillStyle(0x880000); g.fillRect(100, -55, 10, 16)
  // Fence on sides
  g.fillStyle(0xFFCC00)
  for (let i = 0; i < 6; i++) g.fillRect(-46 + i * 12, -55, 8, 55)
  for (let i = 0; i < 6; i++) g.fillRect(212 + i * 12, -55, 8, 55)
  // Cartman face on banner (simple smiley — his smug face)
  g.fillStyle(SKIN); g.fillCircle(105, -144, 14)
  g.fillStyle(0x111111); g.fillCircle(100, -147, 3); g.fillCircle(110, -147, 3)
  g.fillStyle(0xCC1111)  // smug smile
  g.fillRect(98, -139, 14, 3)
}

// City Wok — Chinese restaurant, pagoda roof
function drawCityWok(g: G) {
  const w = 155, h = 125
  // Main building body (red)
  g.fillStyle(0xCC2020); g.fillRect(0, -h, w, h)
  // Gold decorative band near top
  g.fillStyle(0xFFCC00); g.fillRect(0, -h + 8, w, 10)
  // Pagoda-style roof (dark red with upturned ends)
  g.fillStyle(0x880808); g.fillRect(0, -h - 28, w, 22)
  // Upturned roof corners
  g.fillStyle(0xAA1010)
  g.fillTriangle(-18, -h - 6, 0, -h - 28, 18, -h - 6)
  g.fillTriangle(w - 18, -h - 6, w, -h - 28, w + 18, -h - 6)
  // Roof ridge gold ornaments
  g.fillStyle(0xFFCC00)
  g.fillCircle(w / 2, -h - 36, 7)
  g.fillCircle(8, -h - 32, 5); g.fillCircle(w - 8, -h - 32, 5)
  // Red lanterns hanging from roof
  g.fillStyle(0xFF3300); g.fillEllipse(32, -h - 8, 14, 20); g.fillEllipse(123, -h - 8, 14, 20)
  g.lineStyle(1, 0x880000); g.beginPath(); g.moveTo(0, -h - 8); g.lineTo(w, -h - 8); g.strokePath()
  // Windows (glowing warm yellow)
  g.fillStyle(0xFFEE88)
  g.fillRect(8, -h + 22, 32, 30); g.fillRect(58, -h + 22, 38, 30); g.fillRect(114, -h + 22, 32, 30)
  g.lineStyle(2, 0x880808)
  g.strokeRect(8, -h + 22, 32, 30); g.strokeRect(58, -h + 22, 38, 30); g.strokeRect(114, -h + 22, 32, 30)
  // Window cross-bars
  g.lineStyle(1, 0xCC6600)
  g.beginPath(); g.moveTo(24, -h + 22); g.lineTo(24, -h + 52); g.strokePath()
  g.beginPath(); g.moveTo(8, -h + 37); g.lineTo(40, -h + 37); g.strokePath()
  g.beginPath(); g.moveTo(77, -h + 37); g.lineTo(77, -h + 22); g.lineTo(77, -h + 52); g.strokePath()
  // Door
  g.fillStyle(0x660000); g.fillRect(w / 2 - 18, -52, 36, 52)
  g.fillStyle(0xFFCC00); g.fillCircle(w / 2 + 12, -30, 3)
  // "CITY WOK" awning
  g.fillStyle(0xFFAA00); g.fillRect(-5, -h - 10, w + 10, 16)
}

// South Park Elementary — red brick school with flagpole
function drawElementary(g: G) {
  const w = 210, h = 145
  // Brick body
  g.fillStyle(0xBB3A2A); g.fillRect(0, -h, w, h)
  // Brick lines (horizontal)
  g.lineStyle(1, 0x992A1A, 1)
  for (let r = 1; r < 10; r++) {
    g.beginPath(); g.moveTo(0, -h + r * 14); g.lineTo(w, -h + r * 14); g.strokePath()
  }
  // Brick lines (vertical, staggered)
  for (let c = 0; c < 14; c++) {
    g.beginPath(); g.moveTo(c * 15, -h); g.lineTo(c * 15, 0); g.strokePath()
  }
  // Windows (2 rows × 4)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      g.fillStyle(row === 0 ? 0x88CCFF : 0xFFEEAA)
      g.fillRect(10 + col * 48, -h + 18 + row * 46, 30, 24)
      g.lineStyle(2, 0xFFFFFF, 1)
      g.strokeRect(10 + col * 48, -h + 18 + row * 46, 30, 24)
      // Window pane cross
      g.lineStyle(1, 0xCCDDFF, 1)
      g.beginPath(); g.moveTo(25 + col * 48, -h + 18 + row * 46); g.lineTo(25 + col * 48, -h + 42 + row * 46); g.strokePath()
      g.beginPath(); g.moveTo(10 + col * 48, -h + 30 + row * 46); g.lineTo(40 + col * 48, -h + 30 + row * 46); g.strokePath()
    }
  }
  // Front door (arched)
  g.fillStyle(0x5A3A1A); g.fillRect(w / 2 - 20, -55, 40, 55)
  g.fillStyle(0x5A3A1A); g.fillCircle(w / 2, -55, 20)
  g.fillStyle(0x88BBFF); g.fillCircle(w / 2, -55, 16)
  g.fillStyle(0xFFEE88); g.fillCircle(w / 2 + 14, -38, 3.5)
  // Concrete steps
  g.fillStyle(0xBBBBBB); g.fillRect(w / 2 - 28, -12, 56, 12)
  g.fillRect(w / 2 - 22, -22, 44, 10)
  // Sign board
  g.fillStyle(0xFFFACC); g.fillRect(20, -h - 30, w - 40, 24)
  g.lineStyle(2, 0xCC9900); g.strokeRect(20, -h - 30, w - 40, 24)
  // Flagpole (right side)
  g.fillStyle(0x999999); g.fillRect(w - 12, -h - 70, 5, 72)
  // US flag
  g.fillStyle(0xCC2222); g.fillRect(w - 7, -h - 70, 28, 12)
  g.fillStyle(0x2244CC); g.fillRect(w - 7, -h - 70, 9, 12)
  g.fillStyle(0xFFFFFF)
  g.fillRect(w - 7, -h - 64, 28, 4); g.fillRect(w - 7, -h - 58, 28, 4)
}

// Kenny's house — tiny, run-down, depressing
function drawKennysHouse(g: G) {
  const w = 95, h = 72
  // Dirty grayish walls
  g.fillStyle(0x8A8A7A); g.fillRect(0, -h, w, h)
  // Cracks
  g.lineStyle(1, 0x666660, 0.7)
  g.beginPath(); g.moveTo(14, -h); g.lineTo(20, -h + 32); g.strokePath()
  g.beginPath(); g.moveTo(62, -h + 18); g.lineTo(67, -h + 52); g.strokePath()
  // Sagging asymmetric roof
  g.fillStyle(0x5A4A35)
  g.fillTriangle(-10, -h, w + 10, -h, w / 2 + 6, -h - 50)
  // Roof shingles (dark patches)
  g.fillStyle(0x4A3A25)
  g.fillRect(8, -h - 34, 22, 9); g.fillRect(58, -h - 28, 26, 9)
  // Broken chimney
  g.fillStyle(0x7A6050); g.fillRect(w * 0.68, -h - 54, 14, 32)
  g.fillStyle(0x5A4535); g.fillRect(w * 0.68 - 3, -h - 60, 20, 8)
  // Tiny cracked window
  g.fillStyle(0xCCCCAA); g.fillRect(7, -h + 14, 24, 20)
  g.lineStyle(1, 0x888866); g.strokeRect(7, -h + 14, 24, 20)
  // Window pane + crack
  g.lineStyle(1, 0x888866, 0.9)
  g.beginPath(); g.moveTo(7, -h + 24); g.lineTo(31, -h + 24); g.strokePath()
  g.beginPath(); g.moveTo(19, -h + 14); g.lineTo(19, -h + 34); g.strokePath()
  g.lineStyle(1, 0x444444, 0.8)
  g.beginPath(); g.moveTo(7, -h + 14); g.lineTo(27, -h + 32); g.strokePath()
  // Sad little door
  g.fillStyle(0x4A3520); g.fillRect(w / 2 - 13, -44, 26, 44)
  g.fillStyle(0x7A6040); g.fillCircle(w / 2 + 9, -24, 3)
  // Broken fence planks
  g.fillStyle(0x8A7550)
  g.fillRect(-28, -30, 8, 30); g.fillRect(-14, -34, 8, 34)
  g.fillRect(w + 2, -22, 8, 22); g.fillRect(w + 14, -32, 8, 32)
  // Garbage pile
  g.fillStyle(0x6A6A4A); g.fillEllipse(-14, -5, 22, 10)
  g.fillStyle(0x5A5A3A); g.fillRect(-22, -10, 13, 10)
}

// City Hall / Mairie
function drawCityHall(g: G) {
  const w = 165, h = 145
  g.fillStyle(0xD8D0B8); g.fillRect(0, -h, w, h)
  // Columns (5)
  g.fillStyle(0xEEE8D8)
  for (let i = 0; i < 5; i++) g.fillRect(12 + i * 28, -h + 8, 13, h - 8)
  g.fillStyle(0xD0C8A8)
  for (let i = 0; i < 5; i++) g.fillRect(10 + i * 28, -h + 8, 17, 7)
  // Dome
  g.fillStyle(0xC0B890); g.fillEllipse(w / 2, -h, w * 0.5, 58)
  // Dome lantern
  g.fillStyle(0xD8D0A8); g.fillRect(w / 2 - 9, -h - 38, 18, 22)
  g.fillStyle(0xFFCC00); g.fillCircle(w / 2, -h - 42, 7)
  // Steps
  g.fillStyle(0xBBBBAA)
  g.fillRect(-12, -26, w + 24, 10); g.fillRect(-6, -36, w + 12, 12)
  // Door
  g.fillStyle(0x5A4A30); g.fillRect(w / 2 - 20, -72, 40, 72)
  g.fillStyle(0x5A4A30); g.fillEllipse(w / 2, -72, 40, 28)
  g.fillStyle(0x88AACC); g.fillEllipse(w / 2, -72, 36, 24)
  // Arched windows
  g.fillStyle(0x88AACC)
  for (let i = 0; i < 3; i++) {
    g.fillRect(14 + i * 46, -h + 24, 26, 32)
    g.fillEllipse(27 + i * 46, -h + 24, 26, 20)
  }
  // Flag
  g.fillStyle(0x999999); g.fillRect(w + 4, -h - 58, 5, 60)
  g.fillStyle(0xCC2222); g.fillRect(w + 9, -h - 58, 26, 9)
  g.fillStyle(0x2244CC); g.fillRect(w + 9, -h - 58, 9, 9)
  g.fillStyle(0xFFFFFF)
  g.fillRect(w + 9, -h - 49, 26, 4); g.fillRect(w + 9, -h - 45, 26, 4)
}

// Pipi's Waterpark — slides, towers, pool
function drawPipisWaterpark(g: G) {
  const w = 290
  // Main pool (blue)
  g.fillStyle(0x2288CC); g.fillRect(0, -32, w, 32)
  g.fillStyle(0x1A77BB); g.fillRect(0, -32, w, 5)
  // Pool ripples
  g.fillStyle(0x44AAEE, 0.4)
  g.fillEllipse(65, -16, 64, 14); g.fillEllipse(190, -20, 44, 10)
  // Left tower
  g.fillStyle(0xEEEE44); g.fillRect(22, -225, 32, 193)
  g.fillStyle(0xCCCC00); g.fillRect(22, -225, 32, 8)
  // Right tower
  g.fillStyle(0xEE4444); g.fillRect(w - 54, -205, 32, 173)
  g.fillStyle(0xCC2222); g.fillRect(w - 54, -205, 32, 8)
  // Blue water slide (left)
  g.fillStyle(0x2266AA)
  g.fillRect(54, -185, 14, 8); g.fillRect(68, -165, 9, 32); g.fillRect(77, -133, 44, 11)
  g.fillRect(121, -122, 9, 32); g.fillRect(130, -90, 54, 11); g.fillRect(184, -80, 9, 48)
  // Orange slide (right)
  g.fillStyle(0xEE6622)
  g.fillRect(w - 84, -162, 11, 8); g.fillRect(w - 84, -157, 54, 9); g.fillRect(w - 30, -157, 9, 44)
  g.fillRect(w - 74, -113, 54, 9); g.fillRect(w - 74, -113, 9, 81)
  // Changing rooms
  g.fillStyle(0xFFFFDD); g.fillRect(w - 72, -82, 72, 50)
  g.fillStyle(0xEEEEAA)
  g.fillRect(w - 66, -76, 22, 22); g.fillRect(w - 36, -76, 22, 22)
  // Entrance booth
  g.fillStyle(0xFFAA00); g.fillRect(0, -62, 22, 62)
  g.fillStyle(0xFFDD44); g.fillRect(0, -62, 22, 9)
  // Big sign post
  g.fillStyle(0x888888); g.fillRect(w / 2 - 4, -256, 8, 52)
  g.fillStyle(0xFFAA00); g.fillRect(w / 2 - 64, -286, 128, 34)
  g.lineStyle(3, 0xCC7700); g.strokeRect(w / 2 - 64, -286, 128, 34)
  // Lifeguard stand
  g.fillStyle(0xDD2222); g.fillRect(128, -82, 32, 50)
  g.fillStyle(0xFFFFFF); g.fillRect(128, -86, 44, 6)
  g.fillStyle(SKIN); g.fillCircle(144, -96, 11)
  // Small kid slide
  g.fillStyle(0x44BB44)
  g.fillRect(0, -82, 10, 50); g.fillRect(10, -82, 36, 10); g.fillRect(46, -72, 10, 40)
}

// Decorative pine tree
function drawPineTree(g: G, scale = 1) {
  const s = scale
  // Trunk
  g.fillStyle(0x5A3A1A); g.fillRect(-5 * s, -22 * s, 10 * s, 24 * s)
  // Layers (bottom to top, getting smaller)
  const layers = [
    { y: -22 * s, w: 52 * s, h: 34 * s, col: 0x1A5A1A },
    { y: -48 * s, w: 40 * s, h: 30 * s, col: 0x226622 },
    { y: -70 * s, w: 30 * s, h: 26 * s, col: 0x2A7A2A },
    { y: -88 * s, w: 22 * s, h: 22 * s, col: 0x337733 },
  ]
  layers.forEach(l => {
    g.fillStyle(l.col)
    g.fillTriangle(-l.w / 2, l.y + l.h, 0, l.y, l.w / 2, l.y + l.h)
    // Snow on each branch
    g.fillStyle(0xEEF4FF, 0.85)
    g.fillTriangle(-l.w * 0.35, l.y + l.h * 0.35, 0, l.y + 3 * s, l.w * 0.35, l.y + l.h * 0.35)
  })
}

// Bus stop sign (yellow diamond with running children silhouette)
function drawBusStop(g: G) {
  // Brown pole
  g.fillStyle(0x7A5A20); g.fillRect(-4, -145, 8, 145)
  // Yellow diamond sign
  g.fillStyle(0xFFDD00)
  g.fillPoints([{ x: 0, y: -188 }, { x: 38, y: -145 }, { x: 0, y: -102 }, { x: -38, y: -145 }], true)
  g.lineStyle(3, 0x888800)
  g.strokePoints([{ x: 0, y: -188 }, { x: 38, y: -145 }, { x: 0, y: -102 }, { x: -38, y: -145 }], true)
  // Running children silhouettes (black)
  g.fillStyle(0x111111)
  // Kid 1 (left, running, with satchel)
  g.fillCircle(-10, -165, 7)
  g.fillRect(-14, -158, 11, 16)
  g.fillRect(-18, -150, 6, 12)
  g.fillRect(-10, -148, 5, 12)
  g.fillRect(-20, -158, 6, 7)  // satchel
  // Kid 2 (right, slightly smaller, dress shape)
  g.fillCircle(9, -162, 6)
  g.fillRect(5, -156, 9, 14)
  g.fillRect(1, -148, 5, 12)
  g.fillRect(9, -148, 5, 12)
  g.fillRect(13, -157, 6, 7)   // bag
}

// ═══════════════════════════════════════════════════════════════════
//  PHASER SCENE
// ═══════════════════════════════════════════════════════════════════

class BusStopScene extends Phaser.Scene {
  private phase: 'intro' | 'stop' | 'arriving' | 'boarding' | 'touring' | 'ending' = 'intro'
  private groundY = 0
  private bgGfx!: G
  private kidContainers: Phaser.GameObjects.Container[] = []
  private busContainer!: Phaser.GameObjects.Container
  private cityContainer!: Phaser.GameObjects.Container
  private stopSignContainer!: Phaser.GameObjects.Container
  private scrollX = 0
  private readonly SCROLL_SPEED = 4
  private musicObj!: Phaser.Sound.BaseSound
  private readonly onDoneCb: () => void

  constructor(onDone: () => void) {
    super({ key: 'BusStopScene' })
    this.onDoneCb = onDone
  }

  preload() {
    if (!this.cache.audio.exists('sp-theme')) {
      this.load.audio('sp-theme', '/sons/south-park-theme.opus')
    }
  }

  create() {
    const { width: W, height: H } = this.cameras.main
    this.groundY = Math.round(H * 0.74)
    const gY = this.groundY

    // Background (redrawn each frame in update)
    this.bgGfx = this.add.graphics()

    // City container — scrolls during tour phase
    this.cityContainer = this.add.container(0, 0)
    this.buildCity(W, gY)

    // Bus stop sign
    this.stopSignContainer = this.add.container(W * 0.60, gY)
    const signGfx = this.add.graphics()
    drawBusStop(signGfx)
    this.stopSignContainer.add(signGfx)

    // ── Characters (Stan, Kyle, Cartman, Kenny) ──────────────────
    // Order matches the show: Stan, Kyle, Cartman, Kenny
    const charFns = [drawStan, drawKyle, drawCartman, drawKenny]
    // Final waiting positions at the bus stop
    const stopXs = [W * 0.28, W * 0.37, W * 0.46, W * 0.55]

    charFns.forEach((fn, i) => {
      // Start off-screen left, staggered
      const cont = this.add.container(-100 - i * 50, gY)
      const gfx = this.add.graphics()
      fn(gfx)
      cont.add(gfx)
      this.kidContainers.push(cont)
    })

    // Kids walk to their stop positions
    const walkDuration = [700, 750, 800, 850]
    stopXs.forEach((tx, i) => {
      this.time.delayedCall(100 + i * 180, () => {
        this.tweens.add({
          targets: this.kidContainers[i],
          x: tx,
          duration: walkDuration[i],
          ease: 'Linear',
          onComplete: () => {
            // Idle bobbing once at stop
            this.tweens.add({
              targets: this.kidContainers[i],
              y: gY - 3,
              duration: 600 + i * 70,
              yoyo: true, repeat: -1,
              ease: 'Sine.InOut',
              delay: i * 100,
            })
          }
        })
      })
    })

    // ── Bus ──────────────────────────────────────────────────────
    this.busContainer = this.add.container(W + 400, gY)
    const busGfx = this.add.graphics()
    drawBus(busGfx)
    this.busContainer.add(busGfx)

    // "SOUTH PARK" text on bus side
    const busText = this.add.text(60, -78, 'SOUTH PARK', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold',
    })
    this.busContainer.add(busText)

    // Building labels
    this.addBuildingLabels(W)

    // ── Music ────────────────────────────────────────────────────
    if (this.sound.get('sp-theme')) this.sound.remove(this.sound.get('sp-theme')!)
    this.musicObj = this.sound.add('sp-theme', { volume: 0.88, loop: false })
    this.musicObj.play()
    this.musicObj.once('complete', () => this.triggerEnd())
    // Safety fallback
    this.time.delayedCall(52000, () => this.triggerEnd())

    // ── Sequence ─────────────────────────────────────────────────
    // Bus arrives 3.2s after scene starts
    this.time.delayedCall(3200, () => {
      this.phase = 'arriving'
      const busTargetX = W * 0.60 - 290
      this.tweens.add({
        targets: this.busContainer,
        x: busTargetX,
        duration: 800,
        ease: 'Quad.Out',
        onComplete: () => {
          this.phase = 'boarding'
          this.boardKids(stopXs, busTargetX)
        }
      })
    })
  }

  // ── Boarding — all 4 kids board in < 1.6 seconds ─────────────
  private boardKids(stopXs: number[], busTargetX: number) {
    this.kidContainers.forEach((cont, i) => {
      // Kill idle bobbing tween immediately
      this.tweens.killTweensOf(cont)
      cont.y = this.groundY  // snap back to ground

      this.time.delayedCall(i * 150, () => {
        this.tweens.add({
          targets: cont,
          x: busTargetX + 60 + i * 24,
          y: this.groundY - 28,
          duration: 260,
          ease: 'Linear',
          onComplete: () => {
            cont.setVisible(false)
            if (i === 3) {
              // All 4 boarded — bus departs, tour starts
              this.time.delayedCall(350, () => {
                this.phase = 'touring'
                this.stopSignContainer.setVisible(false)
              })
            }
          }
        })
      })
    })
    // Total boarding time: 3*150 + 260 = 710ms ✓ (well under 2s)
  }

  // ── City layout ───────────────────────────────────────────────
  private buildCity(W: number, gY: number) {
    const buildings: { x: number; fn: (g: G) => void }[] = [
      { x: 180,  fn: g => { drawPineTree(g, 1.1) } },
      { x: 340,  fn: drawSodoSopa },
      { x: 600,  fn: g => { drawPineTree(g, 1.0) } },
      { x: 760,  fn: g => { drawPineTree(g, 0.85) } },
      { x: 920,  fn: drawCartmanland },
      { x: 1260, fn: g => { drawPineTree(g, 1.2) } },
      { x: 1440, fn: drawCityWok },
      { x: 1700, fn: g => { drawPineTree(g, 1.0) } },
      { x: 1870, fn: drawElementary },
      { x: 2230, fn: g => { drawPineTree(g, 0.9) } },
      { x: 2380, fn: g => { drawPineTree(g, 1.1) } },
      { x: 2560, fn: drawKennysHouse },
      { x: 2770, fn: g => { drawPineTree(g, 1.0) } },
      { x: 2950, fn: drawCityHall },
      { x: 3280, fn: g => { drawPineTree(g, 1.2) } },
      { x: 3460, fn: drawPipisWaterpark },
      { x: 3900, fn: g => { drawPineTree(g, 1.0) } },
      { x: 3980, fn: g => { drawPineTree(g, 0.9) } },
    ]

    buildings.forEach(b => {
      const cont = this.add.container(W + b.x, gY)
      const gfx = this.add.graphics()
      b.fn(gfx)
      cont.add(gfx)
      this.cityContainer.add(cont)
    })
  }

  private addBuildingLabels(W: number) {
    const labels: { x: number; text: string }[] = [
      { x: W + 420,  text: 'SODOSOPA' },
      { x: W + 1020, text: 'CARTMANLAND' },
      { x: W + 1517, text: 'CITY WOK' },
      { x: W + 1975, text: 'SOUTH PARK ELEMENTARY' },
      { x: W + 2607, text: "MAISON DE KENNY" },
      { x: W + 3032, text: 'CITY HALL' },
      { x: W + 3605, text: "PIPI'S WATERPARK" },
    ]
    labels.forEach(l => {
      const t = this.add.text(l.x, this.groundY - 14, l.text, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#FFFF00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 1)
      this.cityContainer.add(t)
    })
  }

  update(_time: number, _delta: number) {
    const { width: W, height: H } = this.cameras.main
    const gY = this.groundY

    // Redraw background every frame
    this.bgGfx.clear()
    this.drawBg(W, H, gY)

    if (this.phase === 'touring') {
      this.scrollX += this.SCROLL_SPEED
      this.cityContainer.x = -this.scrollX
      // Bus stays at left portion of screen (riding along)
      this.busContainer.x = W * 0.14
      if (this.scrollX > 4600) this.triggerEnd()
    }
  }

  private drawBg(W: number, H: number, gY: number) {
    const g = this.bgGfx
    const px = this.scrollX * 0.05   // parallax factor for mountains
    const px2 = this.scrollX * 0.16  // parallax for mid trees

    // Sky — South Park pale blue
    g.fillStyle(0x7DC4E0); g.fillRect(0, 0, W, gY)

    // Distant mountains (dark green, slight parallax)
    g.fillStyle(0x1E5A1E)
    g.fillPoints([
      { x: 0 - px,       y: gY },
      { x: W * 0.05 - px, y: gY - 100 },
      { x: W * 0.16 - px, y: gY - 210 },
      { x: W * 0.28 - px, y: gY - 120 },
      { x: W * 0.42 - px, y: gY - 270 },
      { x: W * 0.55 - px, y: gY - 140 },
      { x: W * 0.68 - px, y: gY - 295 },
      { x: W * 0.80 - px, y: gY - 115 },
      { x: W * 0.92 - px, y: gY - 245 },
      { x: W + px,        y: gY - 90 },
      { x: W + px,        y: gY },
    ], true)

    // Snow caps on mountain peaks
    g.fillStyle(0xEEF4FF)
    const caps: [number, number, number][] = [
      [W * 0.16 - px, gY - 210, 34], [W * 0.42 - px, gY - 270, 42],
      [W * 0.68 - px, gY - 295, 44], [W * 0.92 - px, gY - 245, 36],
    ]
    caps.forEach(([cx, cy, r]) => g.fillTriangle(cx, cy, cx - r, cy + r * 0.7, cx + r, cy + r * 0.7))

    // Mid-distance pine trees (parallax)
    const treeXs = [W * 0.02, W * 0.12, W * 0.26, W * 0.64, W * 0.76, W * 0.90]
    treeXs.forEach(tx => {
      const x = tx - px2
      if (x < -60 || x > W + 60) return
      g.fillStyle(0x5A3A1A); g.fillRect(x - 4, gY - 22, 8, 24)
      const tl = [
        { col: 0x1A5A1A, w: 48, h: 32 },
        { col: 0x226622, w: 36, h: 28 },
        { col: 0x2A7A2A, w: 28, h: 24 },
      ]
      tl.forEach((l, li) => {
        const ly = gY - 22 - li * 26
        g.fillStyle(l.col)
        g.fillTriangle(x, ly - l.h, x - l.w / 2, ly, x + l.w / 2, ly)
        g.fillStyle(0xEEF4FF, 0.75)
        g.fillTriangle(x, ly - l.h + 2, x - l.w * 0.3, ly - l.h * 0.5, x + l.w * 0.3, ly - l.h * 0.5)
      })
    })

    // Snow ground
    g.fillStyle(0xE8EEF8); g.fillRect(0, gY, W, H - gY)
    // Asphalt road
    g.fillStyle(0x2A2A36); g.fillRect(0, gY - 8, W, 28)
    // Road center dashes (animated with scroll)
    g.fillStyle(0xFFFF44)
    const dashOff = this.scrollX % 80
    for (let i = -80; i < W + 80; i += 80) g.fillRect(i - dashOff, gY + 4, 50, 5)
    // Road shoulders (white lines)
    g.fillStyle(0xFFFFFF)
    g.fillRect(0, gY - 8, W, 3)      // top edge
    g.fillRect(0, gY + 16, W, 3)     // bottom edge
  }

  private triggerEnd() {
    if (this.phase === 'ending') return
    this.phase = 'ending'
    if (this.musicObj?.isPlaying) this.musicObj.stop()
    this.cameras.main.fadeOut(1200, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.onDoneCb())
  }
}

// ═══════════════════════════════════════════════════════════════════
//  REACT WRAPPER
// ═══════════════════════════════════════════════════════════════════

export function SouthParkBus({ onDone }: { onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    discoverEgg('southpark')
    if (!containerRef.current || gameRef.current) return

    const scene = new BusStopScene(onDone)

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#000000',
      parent: containerRef.current,
      scene: [scene],
      audio: { disableWebAudio: false },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [onDone])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', cursor: 'pointer' }}
      onClick={onDone}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', bottom: '1.5rem', left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '.75rem', fontFamily: 'monospace', letterSpacing: '1px',
      }}>
        cliquer pour fermer
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
//  KENNY DEATH (inchangé)
// ═══════════════════════════════════════════════════════════════════

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
      ctx.save(); ctx.translate(kennyX, groundY); ctx.scale(1, squishY)
      ctx.fillStyle = '#E07820'; ctx.fillRect(-17, -58, 34, 58)
      ctx.fillStyle = '#E07820'; ctx.beginPath(); ctx.arc(0, -66, 22, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#F5C99A'; ctx.beginPath(); ctx.ellipse(0, -66, 12, 9, 0, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-6, -68, 7, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(6, -68, 7, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-6, -68, 3, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(6, -68, 3, 0, Math.PI*2); ctx.fill()
      ctx.restore()

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

// ═══════════════════════════════════════════════════════════════════
//  RANDY MARSH (inchangé)
// ═══════════════════════════════════════════════════════════════════

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
    <div onClick={onDone} style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', animation: leaving ? 'ee-randy-leave 0.7s ease-in forwards' : 'ee-randy-enter 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
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
