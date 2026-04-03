'use client'
import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'

const GW = 800, GH = 450
const FY1 = 255
const FY2 = 378
const PLAY_H = 390
const HUD_H = GH - PLAY_H   // 60
const GRAV = 0.68
const JUMP_VEL = -14
const PW = 34, PH = 54
const HW = PW >> 1           // 17
const ZONE_SPACING = 950     // world units between wave trigger zones

const DIFFS = {
  facile: { waves: 5,  hpM: 0.42, dmgM: 0.40, playerHp: 200, label: 'FACILE',          sub: '5 vagues · Défilement · Ennemis légers'   },
  normal: { waves: 7,  hpM: 0.85, dmgM: 0.85, playerHp: 130, label: 'NORMAL',          sub: '7 vagues · Défilement · Combat équilibré'  },
  jack:   { waves: 10, hpM: 1.5,  dmgM: 1.5,  playerHp: 80,  label: "L'OMBRE DE JACK", sub: '10 vagues · Brutal. Sans merci.'           },
} as const
type Diff = keyof typeof DIFFS

type LBEntry = { name: string; score: number }
const LB_KEYS: Record<string, string> = {
  facile: 'fc_lb_facile', normal: 'fc_lb_normal', jack: 'fc_lb_jack',
}
function getLB(d: string): LBEntry[] {
  try { return JSON.parse(localStorage.getItem(LB_KEYS[d] ?? 'fc_lb_normal') ?? '[]') } catch { return [] }
}
function addToLB(d: string, name: string, score: number): LBEntry[] {
  const all = getLB(d)
  all.push({ name, score })
  all.sort((a, b) => b.score - a.score)
  const top10 = all.slice(0, 10)
  try { localStorage.setItem(LB_KEYS[d] ?? 'fc_lb_normal', JSON.stringify(top10)) } catch {}
  return top10
}

export default function FightClubGame({ onDone }: { onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [uiScale,  setUiScale]  = useState(1)
  const [showName, setShowName] = useState(false)
  const [showLB,   setShowLB]   = useState(false)
  const [lbData,   setLbData]   = useState<LBEntry[]>([])
  const [nameVal,  setNameVal]  = useState('')
  const gameResult = useRef<{ score: number; diff: string } | null>(null)

  useEffect(() => {
    const upd = () => setUiScale(Math.min(window.innerWidth / GW, window.innerHeight / GH, 1.6))
    upd(); window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  function confirmName() {
    const res = gameResult.current; if (!res) return
    const nm = nameVal.trim().toUpperCase().slice(0, 12) || 'ANONYME'
    const entries = addToLB(res.diff, nm, res.score)
    setLbData(entries); setNameVal(''); setShowName(false); setShowLB(true)
  }

  useEffect(() => {
    discoverEgg('fightclub')
    if (!containerRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let phaserGame: any = null

    ;(async () => {
      // Chargement Phaser via CDN — évite le problème window is not defined au build Vercel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Phaser: any = await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).Phaser) { resolve((window as any).Phaser); return }
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js'
        s.onload  = () => resolve((window as any).Phaser) // eslint-disable-line @typescript-eslint/no-explicit-any
        s.onerror = reject
        document.head.appendChild(s)
      })

      const VOL = { music: 65, sfx: 70 }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentMusic: any = null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type G = any
      const r  = (g: G, c: number, x: number, y: number, w: number, h: number) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h) }
      const ra = (g: G, c: number, a: number, x: number, y: number, w: number, h: number) => { g.fillStyle(c, a); g.fillRect(x, y, w, h) }

      type CharState  = 'idle' | 'walk' | 'jump' | 'punch' | 'kick' | 'hurt' | 'dead' | 'taunt' | 'block'
      type CharType   = 'norton' | 'grunt' | 'bob' | 'toughguy' | 'tyler'
      type WeaponType = 'bat' | 'chain' | 'bottle'

      interface DroppedWeapon {
        gfx: G; x: number; y: number   // world position
        type: WeaponType; maxUses: number
      }

      interface Char {
        gfx: G
        x: number; floorY: number
        jumpH: number; jumpV: number
        vx: number; vy: number
        hp: number; maxHp: number
        face: 1 | -1
        state: CharState; stateTimer: number
        atkCD: number; hurtInv: number
        speed: number; dmg: number
        isPlayer: boolean; charType: CharType
        wave: number; deadTimer: number
        isBlocking: boolean; blockFrame: number
        stunned: boolean; stunTimer: number
      }

      interface MarlaObj {
        gfx: G; x: number; floorY: number; phase: 0|1|2; timer: number
      }

      // ══════════════════════════════════════════════════════
      // DRAW FUNCTIONS
      // ══════════════════════════════════════════════════════

      function drawNorton(g: G, state: CharState, frame: number) {
        g.clear()
        if (state === 'dead') {
          ra(g, 0xc8c4b4, 1, -HW - 10, -16, PW + 44, 14)
          r(g, 0xd4a88a, HW + 26, -21, 16, 14)
          r(g, 0x2a1810, HW + 25, -25, 18, 6)
          ra(g, 0x280040, 0.5, HW + 28, -17, 10, 5)
          return
        }
        if (state === 'block') {
          r(g, 0x1a1a2a, -HW + 2, -22, 13, 22)
          r(g, 0x1a1a2a, -HW + 19, -22, 13, 22)
          r(g, 0x111111, -HW + 1, -8, 15, 8)
          r(g, 0x111111, -HW + 18, -8, 15, 8)
          r(g, 0xc8c4b4, -HW + 2, -PH + 10, PW - 4, 24)
          r(g, 0xd4a88a, -HW - 6, -PH + 6, 9, 24)
          r(g, 0xd4a88a, HW - 4, -PH + 6, 9, 24)
          r(g, 0xd4a88a, -HW + 2, -PH - 2, PW + 2, 13)
          r(g, 0xd4a88a, -HW + 7, -PH + 1, 20, 12)
          ra(g, 0x4488ff, 0.28, -HW + 2, -PH - 2, PW + 2, 16)
          return
        }
        const bob = state === 'walk' ? Math.sin(frame * 0.36) * 2 : 0
        const hrt = state === 'hurt' ? -4 : 0
        const oy  = bob + hrt
        const l1  = state === 'walk' ? Math.sin(frame * 0.36) * 4 : 0
        const l2  = state === 'walk' ? -l1 : 0
        r(g, 0x1a1a2a, -HW + 2, -22 + l1, 13, 22)
        r(g, 0x1a1a2a, -HW + 19, -22 + l2, 13, 22)
        r(g, 0x111111, -HW + 1, -8 + l1, 15, 8)
        r(g, 0x111111, -HW + 18, -8 + l2, 15, 8)
        if (state === 'kick') {
          r(g, 0x1a1a2a, 4, -30, 13, 16)
          r(g, 0x1a1a2a, 4, -14, 28, 13)
          r(g, 0x111111, 24, -14, 16, 9)
        }
        r(g, 0xc8c4b4, -HW + 2, -PH + 10 + oy, PW - 4, 24)
        ra(g, 0x000000, 0.07, -HW + 7,  -PH + 11 + oy, 2, 22)
        ra(g, 0x000000, 0.07, -HW + 14, -PH + 11 + oy, 2, 22)
        ra(g, 0x000000, 0.07, -HW + 21, -PH + 11 + oy, 2, 22)
        r(g, 0xc8c4b4, -HW - 6, -PH + 12 + oy, 9, 19)
        const pX = state === 'punch' ? 19 : 0
        r(g, 0xc8c4b4, HW - 4 + pX, -PH + 12 + oy, 9, 19)
        if (state === 'punch') r(g, 0xd4a88a, HW + 2 + pX, -PH + 14 + oy, 13, 9)
        r(g, 0xd4a88a, -HW + 8, -PH + oy, 18, 15)
        r(g, 0x2a1810, -HW + 7, -PH - 4 + oy, 20, 7)
        r(g, 0x2a1810, -HW + 7, -PH + oy, 4, 9)
        r(g, 0x222222, -HW + 11, -PH + 6 + oy, 4, 2)
        r(g, 0x222222, -HW + 19, -PH + 6 + oy, 4, 2)
        ra(g, 0x280040, 0.5, -HW + 10, -PH + 5 + oy, 6, 5)
        r(g, 0x8a5544, -HW + 13, -PH + 12 + oy, 7, 2)
        ra(g, 0xaa0000, 0.65, -HW + 14, -PH + 14 + oy, 4, 2)
        if (state === 'hurt') ra(g, 0xffffff, 0.28, -HW, -PH, PW, PH)
      }

      function drawGrunt(g: G, state: CharState, frame: number, waveNum: number) {
        g.clear()
        if (state === 'dead') {
          ra(g, 0x1a1a22, 1, -HW - 8, -16, PW + 36, 14)
          r(g, 0xc49870, HW + 20, -21, 16, 14)
          r(g, 0x222222, HW + 19, -25, 18, 5)
          return
        }
        const bob = state === 'walk' ? Math.sin(frame * 0.40) * 2 : 0
        const hrt = state === 'hurt' ? -3 : 0
        const oy  = bob + hrt
        const l1  = state === 'walk' ? Math.sin(frame * 0.40) * 4 : 0
        const l2  = state === 'walk' ? -l1 : 0
        r(g, 0x111116, -HW + 2, -22 + l1, 13, 22)
        r(g, 0x111116, -HW + 19, -22 + l2, 13, 22)
        r(g, 0x0a0a0a, -HW + 1, -8 + l1, 15, 8)
        r(g, 0x0a0a0a, -HW + 18, -8 + l2, 15, 8)
        r(g, 0x1a1a22, -HW + 2, -PH + 10 + oy, PW - 4, 24)
        ra(g, 0x000000, 0.35, -5, -PH + 24 + oy, 10, 8)
        if (waveNum >= 3) {
          ra(g, 0xcc1111, 0.8, -HW + 9,  -PH + 13 + oy, 4, 7)
          ra(g, 0xcc1111, 0.8, -HW + 9,  -PH + 12 + oy, 9, 2)
          ra(g, 0xcc1111, 0.8, -HW + 18, -PH + 12 + oy, 5, 2)
          ra(g, 0xcc1111, 0.8, -HW + 18, -PH + 15 + oy, 4, 2)
        }
        r(g, 0x1a1a22, -HW - 6, -PH + 12 + oy, 9, 19)
        const pX = state === 'punch' ? 17 : 0
        r(g, 0x1a1a22, HW - 4 + pX, -PH + 12 + oy, 9, 19)
        if (state === 'punch') r(g, 0xc49870, HW + 2 + pX, -PH + 14 + oy, 12, 9)
        r(g, 0xc49870, -HW + 8, -PH + oy, 18, 15)
        if (waveNum >= 2) {
          ra(g, 0x1a1a22, 0.92, -HW + 6, -PH - 3 + oy, 22, 9)
          ra(g, 0x1a1a22, 0.7,  -HW + 6, -PH + 6 + oy, 5, 8)
          ra(g, 0x1a1a22, 0.7,  HW - 3,  -PH + 6 + oy, 5, 8)
        } else {
          r(g, 0x222222, -HW + 7, -PH - 3 + oy, 20, 6)
        }
        r(g, 0x111111, -HW + 11, -PH + 5 + oy, 4, 3)
        r(g, 0x111111, -HW + 19, -PH + 5 + oy, 4, 3)
        ra(g, 0x111111, 0.8, -HW + 10, -PH + 3 + oy, 6, 2)
        ra(g, 0x111111, 0.8, -HW + 18, -PH + 3 + oy, 6, 2)
        r(g, 0x6a4a3a, -HW + 12, -PH + 12 + oy, 9, 2)
        if (state === 'hurt') ra(g, 0xffffff, 0.28, -HW, -PH, PW, PH)
      }

      // Robert Paulson — Bob — Project Mayhem, bitch tits
      function drawBob(g: G, state: CharState, frame: number) {
        g.clear()
        const BW = 50, BH = 60, BHW = 25
        if (state === 'dead') {
          ra(g, 0x2a2a34, 1, -BHW - 12, -20, BW + 50, 18)
          r(g, 0xc89860, BHW + 26, -26, 24, 18)
          return
        }
        const step = state === 'walk' ? Math.sin(frame * 0.26) * 1.5 : 0
        const jig  = state === 'walk' ? Math.sin(frame * 0.26 + 0.5) * 2.5 : 0
        const hrt  = state === 'hurt' ? -3 : 0
        const oy   = step + hrt
        const l1   = state === 'walk' ? Math.sin(frame * 0.26) * 5 : 0
        const l2   = state === 'walk' ? -l1 : 0
        // Thick legs
        r(g, 0x202030, -BHW + 2, -28 + l1, 22, 28)
        r(g, 0x202030, -BHW + 28, -28 + l2, 22, 28)
        r(g, 0x111111, -BHW + 1, -10 + l1, 24, 10)
        r(g, 0x111111, -BHW + 27, -10 + l2, 24, 10)
        // Sweatshirt body
        r(g, 0x1e1e2a, -BHW + 2, -BH + 10 + oy, BW - 4, 34)
        // PM label rough
        ra(g, 0xcc1111, 0.7, -BHW + 14, -BH + 20 + oy, 5, 7)
        ra(g, 0xcc1111, 0.7, -BHW + 14, -BH + 19 + oy, 8, 2)
        ra(g, 0xcc1111, 0.7, -BHW + 24, -BH + 19 + oy, 7, 9)
        ra(g, 0xcc1111, 0.7, -BHW + 32, -BH + 19 + oy, 5, 9)
        // Open collar — chest skin visible
        r(g, 0xc89860, -BHW + 16, -BH + 12 + oy, 18, 22)
        ra(g, 0x1e1e2a, 0.8, -BHW + 2, -BH + 10 + oy, 16, 10)
        ra(g, 0x1e1e2a, 0.8, -BHW + 34, -BH + 10 + oy, 14, 10)
        // Moobs — anti-phase jiggle
        r(g, 0xc89860, -BHW + 7,  -BH + 30 + oy + jig,  20, 13)
        r(g, 0xc89860, -BHW + 25, -BH + 30 + oy - jig, 20, 13)
        ra(g, 0x000000, 0.22, -BHW + 7,  -BH + 42 + oy, 20, 4)
        ra(g, 0x000000, 0.22, -BHW + 25, -BH + 42 + oy, 20, 4)
        // Big arms
        r(g, 0x1e1e2a, -BHW - 10, -BH + 12 + oy, 13, 27)
        const pX = state === 'punch' ? 22 : 0
        r(g, 0x1e1e2a, BHW - 3 + pX, -BH + 12 + oy, 13, 27)
        if (state === 'punch') r(g, 0xc89860, BHW + 8 + pX, -BH + 16 + oy, 16, 12)
        // Big bald head
        r(g, 0xc89860, -BHW + 9, -BH + oy, 32, 20)
        ra(g, 0x555545, 0.16, -BHW + 9, -BH + 14 + oy, 32, 6)
        ra(g, 0xffffff, 0.06, -BHW + 9, -BH + oy, 32, 7)
        // Sad puppy eyes
        r(g, 0x2a2a1a, -BHW + 13, -BH + 6 + oy, 6, 4)
        r(g, 0x2a2a1a, -BHW + 24, -BH + 6 + oy, 6, 4)
        ra(g, 0x111111, 0.85, -BHW + 12, -BH + 3 + oy, 9, 2)
        ra(g, 0x111111, 0.85, -BHW + 23, -BH + 3 + oy, 9, 2)
        r(g, 0x7a5545, -BHW + 15, -BH + 14 + oy, 14, 2)
        if (state === 'hurt') ra(g, 0xffffff, 0.3, -BHW, -BH, BW, BH)
      }

      function drawToughGuy(g: G, state: CharState, frame: number) {
        g.clear()
        if (state === 'dead') {
          ra(g, 0x888877, 1, -HW - 10, -16, PW + 44, 16)
          r(g, 0xb08060, HW + 26, -22, 20, 16)
          return
        }
        const bob = state === 'walk' ? Math.sin(frame * 0.30) * 2 : 0
        const hrt = state === 'hurt' ? -3 : 0
        const oy  = bob + hrt
        const l1  = state === 'walk' ? Math.sin(frame * 0.30) * 4 : 0
        const l2  = state === 'walk' ? -l1 : 0
        r(g, 0x2a1608, -HW + 2, -22 + l1, 14, 22)
        r(g, 0x2a1608, -HW + 18, -22 + l2, 14, 22)
        r(g, 0x111111, -HW + 1, -8 + l1, 16, 9)
        r(g, 0x111111, -HW + 17, -8 + l2, 16, 9)
        r(g, 0x888877, -HW + 2, -PH + 10 + oy, PW - 4, 24)
        r(g, 0x5a3810, -HW + 2,  -PH + 10 + oy, 8, 24)
        r(g, 0x5a3810, HW - 8,   -PH + 10 + oy, 8, 24)
        ra(g, 0x442200, 0.4, -HW + 8, -PH + 12 + oy, PW - 12, 8)
        r(g, 0x888877, -HW - 8, -PH + 12 + oy, 11, 20)
        const pX = state === 'punch' ? 20 : 0
        r(g, 0x888877, HW - 4 + pX, -PH + 12 + oy, 11, 20)
        if (state === 'punch') r(g, 0xb08060, HW + 4 + pX, -PH + 14 + oy, 14, 10)
        r(g, 0xb08060, -HW + 7, -PH + oy, 20, 17)
        ra(g, 0x444444, 0.2, -HW + 7, -PH + 10 + oy, 20, 7)
        r(g, 0x111111, -HW + 9,  -PH + 5 + oy, 5, 3)
        r(g, 0x111111, -HW + 18, -PH + 5 + oy, 5, 3)
        ra(g, 0x111111, 0.9, -HW + 8,  -PH + 3 + oy, 7, 2)
        ra(g, 0x111111, 0.9, -HW + 17, -PH + 3 + oy, 7, 2)
        ra(g, 0xaa4444, 0.7, -HW + 16, -PH + 4 + oy, 1, 9)
        r(g, 0x6a4a3a, -HW + 10, -PH + 13 + oy, 12, 2)
        if (state === 'hurt') ra(g, 0xffffff, 0.3, -HW, -PH, PW, PH)
      }

      function drawTyler(g: G, state: CharState, frame: number) {
        g.clear()
        if (state === 'dead') {
          ra(g, 0xcc1111, 1, -HW - 10, -16, PW + 44, 14)
          r(g, 0xe0b090, HW + 26, -21, 16, 14)
          r(g, 0xc8a440, HW + 25, -25, 18, 7)
          return
        }
        const bob   = state === 'walk'  ? Math.sin(frame * 0.36) * 2 : 0
        const taunt = state === 'taunt' ? Math.sin(frame * 0.12) * 3 : 0
        const hrt   = state === 'hurt'  ? -4 : 0
        const oy    = bob + taunt + hrt
        const l1    = state === 'walk' ? Math.sin(frame * 0.36) * 4 : 0
        const l2    = state === 'walk' ? -l1 : 0
        r(g, 0x1a1a2a, -HW + 2,  -22 + l1, 13, 22)
        r(g, 0x1a1a2a, -HW + 19, -22 + l2, 13, 22)
        r(g, 0x111111, -HW + 1,  -8 + l1, 15, 8)
        r(g, 0x111111, -HW + 18, -8 + l2, 15, 8)
        if (state === 'kick') {
          r(g, 0x1a1a2a, 4, -32, 13, 16)
          r(g, 0x1a1a2a, 4, -16, 28, 13)
          r(g, 0x111111, 24, -16, 18, 9)
        }
        r(g, 0xe8e0d0, -HW + 11, -PH + 10 + oy, 12, 24)
        r(g, 0xcc1111, -HW + 2,  -PH + 10 + oy, 10, 24)
        r(g, 0xcc1111, -HW + 22, -PH + 10 + oy, 10, 24)
        r(g, 0x8b0000, -HW + 8,  -PH + 10 + oy, 5, 14)
        r(g, 0x8b0000, -HW + 21, -PH + 10 + oy, 5, 14)
        r(g, 0xcc1111, -HW + 11, -PH + 8 + oy, 12, 5)
        r(g, 0xcc1111, -HW - 6,  -PH + 12 + oy, 9, 19)
        const pX = state === 'punch' ? 20 : 0
        r(g, 0xcc1111, HW - 4 + pX, -PH + 12 + oy, 9, 19)
        if (state === 'punch') r(g, 0xe0b090, HW + 2 + pX, -PH + 14 + oy, 13, 9)
        r(g, 0xe0b090, -HW + 8, -PH + oy, 18, 15)
        r(g, 0xc8a440, -HW + 7, -PH - 4 + oy, 20, 7)
        r(g, 0xc8a440, -HW + 23, -PH - 4 + oy, 5, 11)
        r(g, 0xc8a440, -HW + 7,  -PH - 1 + oy, 4, 4)
        r(g, 0x222222, -HW + 11, -PH + 5 + oy, 4, 3)
        r(g, 0x222222, -HW + 19, -PH + 5 + oy, 4, 3)
        r(g, 0x9a6655, -HW + 13, -PH + 12 + oy, 10, 2)
        r(g, 0x9a6655, -HW + 21, -PH + 10 + oy, 2, 3)
        if (state === 'taunt') {
          r(g, 0xffeecc, HW + 5, -PH + 12 + oy, 12, 4)
          ra(g, 0xff8800, 0.9, HW + 17, -PH + 13 + oy, 4, 3)
          for (let i = 0; i < 4; i++) {
            const sx = HW + 18 + Math.sin(frame * 0.08 + i * 1.2) * 4
            ra(g, 0xcccccc, 0.1 + i * 0.04, sx - 3, -PH + 10 + oy - i * 5, 6 + i * 2, 6 + i * 2)
          }
        }
        if (state === 'hurt') ra(g, 0xffffff, 0.32, -HW, -PH, PW, PH)
      }

      // Marla Singer — thin, dark trench coat, cigarette, messy dark hair
      function drawMarla(g: G, state: CharState, frame: number) {
        g.clear()
        const MW = 26, MH = 52, MHW = 13
        const bob = state === 'walk' ? Math.sin(frame * 0.38) * 1.5 : 0
        const oy  = bob
        const l1  = state === 'walk' ? Math.sin(frame * 0.38) * 3.5 : 0
        const l2  = state === 'walk' ? -l1 : 0
        r(g, 0x0e0e0e, -MHW + 3, -20 + l1, 9, 20)
        r(g, 0x0e0e0e, -MHW + 14, -20 + l2, 9, 20)
        r(g, 0x080808, -MHW + 2, -7 + l1, 11, 7)
        r(g, 0x080808, -MHW + 13, -7 + l2, 11, 7)
        r(g, 0x151518, -MHW + 2, -MH + 10 + oy, MW - 4, 30)
        r(g, 0x0e0e10, -MHW + 2, -MH + 10 + oy, 5, 24)
        r(g, 0x0e0e10, -MHW + 19, -MH + 10 + oy, 5, 24)
        r(g, 0x1e1e20, -MHW + 6, -MH + 9 + oy, MW - 12, 5)
        r(g, 0x151518, -MHW - 3, -MH + 12 + oy, 6, 20)
        r(g, 0x151518, MHW - 1, -MH + 12 + oy, 6, 20)
        // Cigarette in right hand
        r(g, 0xeeeebb, MHW + 4, -MH + 22 + oy, 16, 3)
        ra(g, 0xff8800, 0.95, MHW + 20, -MH + 23 + oy, 4, 2)
        for (let i = 0; i < 4; i++) {
          const sx = MHW + 20 + Math.sin(frame * 0.09 + i * 1.6) * 3
          ra(g, 0xbbbbbb, 0.09 + i * 0.04, sx, -MH + 18 + oy - i * 6, 4 + i * 2, 4 + i * 2)
        }
        // Pale face
        r(g, 0xcdc4b8, -MHW + 4, -MH + oy, 18, 14)
        // Messy dark hair
        r(g, 0x18141a, -MHW + 2, -MH - 6 + oy, 22, 9)
        r(g, 0x18141a, -MHW + 1, -MH + oy, 5, 8)
        r(g, 0x18141a, MHW - 1, -MH + oy, 5, 6)
        r(g, 0x18141a, -MHW + 9, -MH - 9 + oy, 10, 5)
        r(g, 0x18141a, -MHW + 18, -MH - 5 + oy, 6, 7)
        // Dark eyes with heavy makeup
        r(g, 0x111111, -MHW + 6, -MH + 5 + oy, 4, 3)
        r(g, 0x111111, -MHW + 14, -MH + 5 + oy, 4, 3)
        ra(g, 0x111111, 0.8, -MHW + 5, -MH + 3 + oy, 6, 3)
        ra(g, 0x111111, 0.8, -MHW + 13, -MH + 3 + oy, 6, 3)
        r(g, 0x882233, -MHW + 7, -MH + 11 + oy, 12, 2)
      }

      // ══════════════════════════════════════════════════════
      // WEAPON DRAW FUNCTIONS
      // ══════════════════════════════════════════════════════

      // Draw weapon lying on the ground (centered at 0,0)
      function drawWeaponGround(g: G, type: WeaponType) {
        g.clear()
        if (type === 'bat') {
          r(g, 0x5a3010, -28, -4, 52, 7)     // handle + body
          r(g, 0xc8a060, -8, -5, 16, 9)      // barrel
          r(g, 0x3a1c08, -28, -2, 14, 3)     // tape grip
        } else if (type === 'chain') {
          for (let i = 0; i < 7; i++) {
            const cx = -24 + i * 8
            ra(g, 0x888888, 1, cx - 3, -3, 8, 6)
            ra(g, 0x444444, 0.8, cx - 1, -4, 4, 8)
          }
        } else {  // bottle
          r(g, 0x224411, -6, -14, 12, 14)    // body
          r(g, 0x2a5518, -4, -20, 8, 8)      // shoulder
          r(g, 0x33661e, -2, -26, 4, 8)      // neck
          ra(g, 0x88ff44, 0.15, -5, -13, 10, 12)  // glass shine
        }
      }

      // Draw weapon held by player (in hand, facing right; mirrored by gfx scale)
      function drawHeldWeapon(g: G, type: WeaponType, state: CharState) {
        g.clear()
        const swing = ['punch', 'kick'].includes(state) ? 8 : 0
        if (type === 'bat') {
          r(g, 0x3a1c08, 6, -36 - swing, 6, 18)        // grip
          r(g, 0x5a3010, 6, -48 - swing, 8, 14)         // taper
          r(g, 0xc8a060, 5, -60 - swing, 12, 16)        // barrel
          r(g, 0x3a1c08, 6, -38 - swing, 6, 6)          // tape
        } else if (type === 'chain') {
          for (let i = 0; i < 5; i++) {
            ra(g, 0x888888, 1, 6 + i * 7, -34 - swing - i * 4, 8, 6)
            ra(g, 0x444444, 0.8, 7 + i * 7, -36 - swing - i * 4, 5, 9)
          }
        } else {  // bottle
          r(g, 0x224411, 6, -46 - swing, 12, 14)
          r(g, 0x2a5518, 7, -54 - swing, 10, 10)
          r(g, 0x33661e, 8, -62 - swing, 8, 10)
          ra(g, 0x88ff44, 0.18, 7, -45 - swing, 5, 12)
        }
      }

      // ══════════════════════════════════════════════════════
      // SCENE HELPERS
      // ══════════════════════════════════════════════════════

      function drawSceneBg(g: G) {
        g.clear()
        g.fillStyle(0x0d0d13, 1); g.fillRect(0, 0, GW, GH)
        g.lineStyle(1, 0x1e1e2c, 0.55)
        for (let row = 0; row < 12; row++) {
          const off = row % 2 === 0 ? 0 : 23
          for (let col = 0; col < 20; col++) g.strokeRect(col * 44 + off - 44, row * 40, 42, 38)
        }
        g.fillStyle(0x202020, 1); g.fillRect(0, 44, GW, 10)
        g.fillStyle(0x2c2c2c, 1); g.fillRect(0, 48, GW, 4)
        const bxs = [100, 270, 440, 610, 740]
        for (const bx of bxs) {
          g.fillStyle(0xffbb44, 0.04); g.fillTriangle(bx, 50, bx + 130, GH, bx - 130, GH)
          g.fillStyle(0xffeeaa, 1); g.fillCircle(bx, 47, 5)
          g.fillStyle(0xffffff, 0.65); g.fillCircle(bx, 47, 2)
        }
        // Floor strip
        g.fillStyle(0x181820, 1); g.fillRect(0, GH - 60, GW, 60)
        g.lineStyle(2, 0xcc1111, 0.35); g.lineBetween(0, GH - 60, GW, GH - 60)
      }

      function makeBtn(
        scene: any,
        x: number, y: number, w: number,
        label: string,
        onClick: () => void,
        accent = 0xcc1111
      ): any {
        const h = 46
        const bg = scene.add.graphics()
        const paint = (hover: boolean) => {
          bg.clear()
          bg.fillStyle(hover ? accent : 0x0a0a11, 1)
          bg.fillRect(x - w / 2, y - h / 2, w, h)
          bg.lineStyle(hover ? 2 : 1, accent, hover ? 1 : 0.45)
          bg.strokeRect(x - w / 2, y - h / 2, w, h)
        }
        paint(false)
        const t = scene.add.text(x, y, label, {
          fontFamily: 'Impact, monospace', fontSize: '20px',
          letterSpacing: 4, color: '#ffffff', align: 'center',
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true })
        t.on('pointerover',  () => { paint(true);  t.setScale(1.04) })
        t.on('pointerout',   () => { paint(false); t.setScale(1) })
        t.on('pointerdown',  onClick)
        return t
      }

      // ══════════════════════════════════════════════════════
      // MENU SCENE
      // ══════════════════════════════════════════════════════
      class MenuScene extends Phaser.Scene {
        constructor() { super({ key: 'Menu' }) }
        create() {
          const bg = this.add.graphics()
          drawSceneBg(bg)
          // Center card
          bg.fillStyle(0x000000, 0.5); bg.fillRect(270, 115, 260, 205)
          bg.lineStyle(1, 0xcc1111, 0.3); bg.strokeRect(269, 114, 262, 207)

          this.add.text(GW / 2, 80, 'FIGHT CLUB', {
            fontFamily: 'Impact', fontSize: '68px', color: '#cc1111',
            stroke: '#000000', strokeThickness: 8, letterSpacing: 8,
          }).setOrigin(0.5, 0.5)
          this.add.text(GW / 2, 126, '— THE GAME —', {
            fontFamily: 'monospace', fontSize: '13px', color: '#664433', letterSpacing: 7,
          }).setOrigin(0.5, 0.5)

          makeBtn(this, GW / 2, 192, 220, 'JOUER',   () => this.scene.start('Difficulty'), 0xcc1111)
          makeBtn(this, GW / 2, 249, 220, 'OPTIONS', () => this.scene.start('Options'),    0x885522)
          makeBtn(this, GW / 2, 306, 220, 'RETOUR',  () => onDone(),                        0x2a2a3a)

          this.add.text(GW / 2, GH - 12,
            'UN PROJET MAYHEM  ·  THE FIRST RULE: YOU DO NOT TALK ABOUT FIGHT CLUB', {
            fontFamily: 'monospace', fontSize: '8px', color: 'rgba(90,60,50,0.55)', letterSpacing: 2
          }).setOrigin(0.5, 1)
        }
      }

      // ══════════════════════════════════════════════════════
      // DIFFICULTY SCENE
      // ══════════════════════════════════════════════════════
      class DifficultyScene extends Phaser.Scene {
        constructor() { super({ key: 'Difficulty' }) }
        create() {
          const bg = this.add.graphics()
          drawSceneBg(bg)

          this.add.text(GW / 2, 52, 'CHOISIR LA DIFFICULTÉ', {
            fontFamily: 'Impact', fontSize: '32px', color: '#cccccc', letterSpacing: 6,
            stroke: '#000000', strokeThickness: 4,
          }).setOrigin(0.5, 0.5)

          const diffs: Diff[] = ['facile', 'normal', 'jack']
          const cxPos = [150, 400, 650]
          const colors = [0x226633, 0xcc9922, 0xcc1111]

          diffs.forEach((d, i) => {
            const x = cxPos[i], y = 240
            const cfg = DIFFS[d]
            const col = colors[i]
            const hexCol = `#${col.toString(16).padStart(6, '0')}`

            const cg = this.add.graphics()
            const paintCard = (hover: boolean) => {
              cg.clear()
              cg.fillStyle(col, hover ? 0.3 : 0.12); cg.fillRect(x - 120, y - 128, 240, 256)
              cg.lineStyle(hover ? 2 : 1, col, hover ? 0.95 : 0.4); cg.strokeRect(x - 120, y - 128, 240, 256)
            }
            paintCard(false)

            this.add.text(x, y - 80, cfg.label, {
              fontFamily: 'Impact', fontSize: '22px', color: hexCol,
              letterSpacing: 4, stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5, 0.5)
            this.add.text(x, y - 42, cfg.sub, {
              fontFamily: 'monospace', fontSize: '10px', color: '#999999',
              align: 'center', wordWrap: { width: 210 },
            }).setOrigin(0.5, 0.5)
            this.add.text(x, y + 10, `HP joueur : ${cfg.playerHp}`, {
              fontFamily: 'monospace', fontSize: '12px', color: '#66cc88',
            }).setOrigin(0.5, 0.5)
            this.add.text(x, y + 32, `Ennemis ×${cfg.hpM.toFixed(2)}`, {
              fontFamily: 'monospace', fontSize: '11px', color: '#cc7777',
            }).setOrigin(0.5, 0.5)
            this.add.text(x, y + 56, `${cfg.waves} vague${cfg.waves > 1 ? 's' : ''}`, {
              fontFamily: 'monospace', fontSize: '11px', color: '#888888',
            }).setOrigin(0.5, 0.5)

            const zone = this.add.zone(x, y, 240, 256).setInteractive({ useHandCursor: true })
            zone.on('pointerover',  () => paintCard(true))
            zone.on('pointerout',   () => paintCard(false))
            zone.on('pointerdown',  () => this.scene.start('Game', { diff: d }))
          })

          makeBtn(this, 72, GH - 28, 110, '← RETOUR', () => this.scene.start('Menu'), 0x2a2a3a)
        }
      }

      // ══════════════════════════════════════════════════════
      // OPTIONS SCENE
      // ══════════════════════════════════════════════════════
      class OptionsScene extends Phaser.Scene {
        constructor() { super({ key: 'Options' }) }
        create() {
          const bg = this.add.graphics()
          drawSceneBg(bg)
          bg.fillStyle(0x000000, 0.5); bg.fillRect(GW / 2 - 250, 70, 500, 300)
          bg.lineStyle(1, 0x884422, 0.35); bg.strokeRect(GW / 2 - 251, 69, 502, 302)

          this.add.text(GW / 2, 106, 'OPTIONS', {
            fontFamily: 'Impact', fontSize: '36px', color: '#cc8833', letterSpacing: 8,
            stroke: '#000000', strokeThickness: 4,
          }).setOrigin(0.5, 0.5)

          const barG = this.add.graphics()
          const drawBars = () => {
            barG.clear()
            barG.fillStyle(0x111111, 1); barG.fillRect(GW / 2 - 160, 168, 320, 16)
            barG.fillStyle(0xcc6633, 1); barG.fillRect(GW / 2 - 160, 168, 320 * VOL.music / 100, 16)
            barG.lineStyle(1, 0x884422, 0.5); barG.strokeRect(GW / 2 - 160, 168, 320, 16)
            barG.fillStyle(0x111111, 1); barG.fillRect(GW / 2 - 160, 232, 320, 16)
            barG.fillStyle(0x336699, 1); barG.fillRect(GW / 2 - 160, 232, 320 * VOL.sfx / 100, 16)
            barG.lineStyle(1, 0x225577, 0.5); barG.strokeRect(GW / 2 - 160, 232, 320, 16)
          }
          drawBars()

          this.add.text(GW / 2 - 160, 148, 'MUSIQUE', {
            fontFamily: 'monospace', fontSize: '11px', color: '#cc8833', letterSpacing: 3
          })
          this.add.text(GW / 2 - 160, 212, 'EFFETS SONORES', {
            fontFamily: 'monospace', fontSize: '11px', color: '#6699cc', letterSpacing: 3
          })

          const mvT = this.add.text(GW / 2 + 178, 176, `${VOL.music}%`, {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
          }).setOrigin(0, 0.5)
          const sfxT = this.add.text(GW / 2 + 178, 240, `${VOL.sfx}%`, {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
          }).setOrigin(0, 0.5)

          const adj = (key: 'music' | 'sfx', delta: number, lbl: any) => {
            VOL[key] = Math.max(0, Math.min(100, VOL[key] + delta))
            lbl.setText(`${VOL[key]}%`)
            drawBars()
            if (key === 'music' && currentMusic) {
              try { (currentMusic as any).setVolume(VOL.music / 100) } catch (_) {}
            }
          }

          makeBtn(this, GW / 2 - 200, 176, 38, '−', () => adj('music', -5, mvT), 0xcc6633)
          makeBtn(this, GW / 2 + 160, 176, 38, '+', () => adj('music', 5, mvT),  0xcc6633)
          makeBtn(this, GW / 2 - 200, 240, 38, '−', () => adj('sfx', -5, sfxT),  0x336699)
          makeBtn(this, GW / 2 + 160, 240, 38, '+', () => adj('sfx', 5, sfxT),   0x336699)

          this.add.text(GW / 2, 282,
            'COMMANDES :   WASD / ←↑↓→  Bouger   Z Poing   X Kick   ESPACE Saut   Q Garde   C Rage', {
            fontFamily: 'monospace', fontSize: '9.5px', color: '#777777',
            align: 'center', wordWrap: { width: 460 },
          }).setOrigin(0.5, 0)

          makeBtn(this, 72, GH - 28, 110, '← RETOUR', () => this.scene.start('Menu'), 0x2a2a3a)
        }
      }

      // ══════════════════════════════════════════════════════
      // GAME SCENE  — scrolling horizontal Streets-of-Rage style
      // ══════════════════════════════════════════════════════
      class GameScene extends Phaser.Scene {
        player!: Char
        enemies: Char[] = []
        marlaCh: MarlaObj | null = null

        diff: Diff = 'normal'
        wave = 0; waveCleared = true
        gameOver = false; gameOverTimer = 0
        victory = false; isBossFight = false
        frame = 0

        // Scrolling / world
        cameraX = 0
        worldWidth = 0
        maxPlayerWorldX = 400
        waveZones: { triggerX: number; spawned: boolean }[] = []
        currentZoneIdx = 0

        score = 0; combo = 0; comboTimer = 0; maxCombo = 0
        scoreMult = 1; comboNextThresh = 10
        rage = 0; rageActive = false; rageDuration = 0
        marlaUsed = false; marlaActive = false

        bgGfx!: G; floorGfx!: G; marlaDraw!: G
        enemyHpGfx!: G; overlayGfx!: G
        hpBarGfx!: G; bossHpGfx!: G

        hpLabel!: any
        waveLabel!: any
        scoreLabel!: any
        comboLabel!: any
        rageLabel!: any
        blockLabel!: any
        quoteText!: any

        floatTexts: Array<{ obj: any; vy: number; life: number; maxLife: number }> = []
        blood: Array<{ gfx: G; x: number; y: number; vx: number; vy: number; life: number; sz: number }> = []
        droppedWeapons: DroppedWeapon[] = []
        heldWeapon: { type: WeaponType; uses: number; maxUses: number } | null = null
        weaponGfx!: G

        keys!: Record<string, any>
        music?: any

        readonly QUOTES = [
          '"La première règle du Fight Club :\nne parlez pas du Fight Club."',
          '"La deuxième règle :\nVOUS NE PARLEZ PAS DU FIGHT CLUB."',
          '"Vous n\'êtes pas votre boulot.\nVous n\'êtes pas l\'argent sur votre compte."',
          '"C\'est seulement après avoir tout perdu\nqu\'on est libre de tout faire."',
          '"Vous n\'êtes pas spécial.\nVous n\'êtes pas un beau flocon de neige unique."',
          '"Sans douleur, sans sacrifice,\nnous n\'aurions rien."',
          '"Après une nuit au Fight Club,\ntout le reste était du volume réglé trop bas."',
        ]

        constructor() { super({ key: 'Game' }) }

        init(data: Record<string, unknown>) {
          this.diff = (data.diff as Diff) || 'normal'
        }

        preload() {
          this.load.audio('theme', '/sons/where-is-my-mind.opus')
        }

        create() {
          this.bgGfx      = this.add.graphics().setDepth(0)
          this.floorGfx   = this.add.graphics().setDepth(2)
          this.weaponGfx  = this.add.graphics().setDepth(301)
          this.marlaDraw  = this.add.graphics().setDepth(299)
          this.enemyHpGfx = this.add.graphics().setDepth(400)
          this.overlayGfx = this.add.graphics().setDepth(600)
          this.hpBarGfx   = this.add.graphics().setDepth(500)
          this.bossHpGfx  = this.add.graphics().setDepth(500).setVisible(false)

          const cfg = DIFFS[this.diff]
          const totalWaves = cfg.waves

          // ── World setup ───────────────────────────────────
          this.worldWidth = (totalWaves + 1) * ZONE_SPACING + 600
          this.waveZones = []
          for (let i = 0; i < totalWaves; i++) {
            this.waveZones.push({ triggerX: 380 + i * ZONE_SPACING, spawned: false })
          }
          this.currentZoneIdx = 0
          this.cameraX = 0
          // Player can walk right up to just before the first zone trigger
          this.maxPlayerWorldX = this.waveZones[0].triggerX + 40

          const pg = this.add.graphics().setDepth(300)
          this.player = {
            gfx: pg, x: 130, floorY: (FY1 + FY2) / 2,
            jumpH: 0, jumpV: 0, vx: 0, vy: 0,
            hp: cfg.playerHp, maxHp: cfg.playerHp, face: 1,
            state: 'idle', stateTimer: 0, atkCD: 0, hurtInv: 0,
            speed: 3.8, dmg: 0, isPlayer: true,
            charType: 'norton', wave: 0, deadTimer: 0,
            isBlocking: false, blockFrame: 0, stunned: false, stunTimer: 0,
          }

          this.wave = 0; this.waveCleared = true
          this.gameOver = false; this.gameOverTimer = 0
          this.victory = false; this.isBossFight = false
          this.frame = 0
          this.score = 0; this.combo = 0; this.comboTimer = 0; this.maxCombo = 0
          this.scoreMult = 1; this.comboNextThresh = 10
          this.rage = 0; this.rageActive = false; this.rageDuration = 0
          this.marlaUsed = false; this.marlaActive = false; this.marlaCh = null
          this.enemies = []; this.floatTexts = []; this.blood = []
          this.droppedWeapons = []; this.heldWeapon = null

          const kb = this.input.keyboard!
          this.keys = {
            left:  kb.addKey('LEFT'),  right: kb.addKey('RIGHT'),
            up:    kb.addKey('UP'),    down:  kb.addKey('DOWN'),
            a: kb.addKey('A'), d: kb.addKey('D'),
            w: kb.addKey('W'), s: kb.addKey('S'),
            q: kb.addKey('Q'),
          }
          kb.on('keydown-Z',     () => this.playerAttack('punch'))
          kb.on('keydown-X',     () => this.playerAttack('kick'))
          kb.on('keydown-SPACE', () => this.playerJump())
          kb.on('keydown-C',     () => this.activateRage())
          kb.on('keydown-ESC',   () => { this.music?.stop(); this.scene.start('Menu') })

          this.createHUD()

          try {
            this.music = this.sound.add('theme', { loop: true, volume: VOL.music / 100 })
            currentMusic = this.music
            this.music.play()
          } catch (_) {}

          this.scheduleFlicker()
          this.showQuote('"La première règle du Fight Club..."')
        }

        // ── UPDATE ───────────────────────────────────────────
        update() {
          this.frame++
          if (this.gameOver) { this.tickGameOver(); return }
          if (this.victory)  return

          this.handleInput()
          this.tickChar(this.player)

          // Constrain player to camera left edge and maxPlayerWorldX
          const camLeft = this.cameraX + 36
          this.player.x = Math.max(camLeft, Math.min(this.maxPlayerWorldX, this.player.x))

          // Smooth camera — player stays around 25% from left
          const targetCam = this.player.x - 210
          this.cameraX = Math.max(0, Math.min(this.worldWidth - GW, targetCam))

          // ── Weapon pickup ─────────────────────────────────
          if (!this.heldWeapon) {
            for (let i = this.droppedWeapons.length - 1; i >= 0; i--) {
              const w = this.droppedWeapons[i]
              if (Math.abs(w.x - this.player.x) < 38 && Math.abs(w.y - this.player.floorY) < 32) {
                this.heldWeapon = { type: w.type, uses: w.maxUses, maxUses: w.maxUses }
                w.gfx.destroy()
                this.droppedWeapons.splice(i, 1)
                const label = w.type === 'bat' ? 'BATTE' : w.type === 'chain' ? 'CHAÎNE' : 'BOUTEILLE'
                this.spawnFloatText(this.player.x - this.cameraX, this.player.floorY - 80, `⚔ ${label} RAMASSÉE`, '#ffaa00', false)
                break
              }
            }
          }

          // ── Check zone triggers ───────────────────────────
          if (this.waveCleared && this.currentZoneIdx < this.waveZones.length) {
            const zone = this.waveZones[this.currentZoneIdx]
            if (!zone.spawned && this.player.x >= zone.triggerX) {
              zone.spawned = true
              this.spawnWave()
            }
          }

          for (const e of this.enemies) {
            if (e.hp > 0) {
              if (e.stunned) {
                if (e.stunTimer > 0) { e.stunTimer--; if (e.stunTimer === 0) e.stunned = false }
              } else {
                this.tickAI(e)
              }
              this.tickChar(e)
              // Keep enemies near the combat zone
              e.x = Math.max(20, Math.min(this.worldWidth - 20, e.x))
            } else {
              e.deadTimer++
            }
          }

          if (this.comboTimer > 0 && --this.comboTimer === 0) {
            this.combo = 0; this.scoreMult = 1; this.comboNextThresh = 10
            this.refreshCombo()
          }
          if (this.rageActive && --this.rageDuration <= 0) {
            this.rageActive = false
            this.cameras.main.flash(250, 255, 0, 0, false)
          }

          // Marla event
          if (!this.marlaUsed && !this.marlaActive && this.player.hp > 0 &&
              this.player.hp < this.player.maxHp * 0.15) {
            this.triggerMarla()
          }
          if (this.marlaActive && this.marlaCh) this.updateMarla()

          // Wave cleared check
          const allDead = this.enemies.length > 0 && this.enemies.every(e => e.hp <= 0)
          if (allDead && !this.waveCleared) {
            this.waveCleared = true
            if (this.isBossFight) {
              this.triggerVictory()
            } else {
              const bonus = 150 + this.wave * 50
              this.score += bonus
              this.spawnFloatText(GW / 2, PLAY_H / 2 - 10, `VAGUE ${this.wave} OK  +${bonus}`, '#ffdd00', true)
              this.time.delayedCall(600, () => this.showQuote(this.QUOTES[Math.min(this.wave, this.QUOTES.length - 1)]))

              // Unlock next zone — player can walk right again
              this.currentZoneIdx++
              if (this.currentZoneIdx < this.waveZones.length) {
                this.maxPlayerWorldX = this.waveZones[this.currentZoneIdx].triggerX + 40
              } else {
                this.maxPlayerWorldX = this.worldWidth - 40
              }
            }
          }

          if (this.player.hp <= 0 && !this.gameOver) this.triggerGameOver()

          this.tickBlood()
          this.tickFloats()
          this.renderAll()
          this.updateHUD()
        }

        // ── INPUT ────────────────────────────────────────────
        handleInput() {
          const p = this.player
          if (p.hp <= 0) return
          const qDown    = this.keys.q.isDown
          const canBlock = !['punch', 'kick', 'hurt', 'jump', 'dead'].includes(p.state) || p.isBlocking

          if (qDown && canBlock) {
            if (!p.isBlocking) { p.isBlocking = true; p.blockFrame = this.frame }
            p.state = 'block'; p.stateTimer = 0
            p.vx *= 0.35; p.vy *= 0.35
            return
          }
          if (!qDown && p.isBlocking) {
            p.isBlocking = false
            if (p.state === 'block') p.state = 'idle'
          }

          const canMove = !['punch', 'kick'].includes(p.state)
          const left  = this.keys.left.isDown  || this.keys.a.isDown
          const right = this.keys.right.isDown || this.keys.d.isDown
          const up    = this.keys.up.isDown    || this.keys.w.isDown
          const down  = this.keys.down.isDown  || this.keys.s.isDown
          const moving = left || right || up || down

          if (canMove) {
            if (left)        { p.vx = -p.speed; p.face = -1 }
            else if (right)  { p.vx =  p.speed; p.face =  1 }
            else               p.vx *= 0.72
            if (up)          p.vy = -p.speed * 0.65
            else if (down)   p.vy =  p.speed * 0.65
            else               p.vy *= 0.72
            if (moving && p.state !== 'jump')  p.state = 'walk'
            else if (!moving && p.state === 'walk') p.state = 'idle'
          }
        }

        // ── ATTACKS ──────────────────────────────────────────
        playerAttack(type: 'punch' | 'kick') {
          const p = this.player
          if (p.hp <= 0 || p.atkCD > 0 || p.isBlocking || ['punch', 'kick'].includes(p.state)) return
          p.state = type; p.stateTimer = type === 'punch' ? 18 : 24
          p.atkCD = type === 'punch' ? 14 : 22

          // Weapon overrides base damage and range
          let base:  number
          let range: number
          let isWep = false
          if (this.heldWeapon) {
            const wep = this.heldWeapon
            base  = wep.type === 'bat' ? 42 : wep.type === 'chain' ? 32 : 55
            range = wep.type === 'bat' ? 130 : wep.type === 'chain' ? 175 : 105
            isWep = true
          } else {
            base  = type === 'punch' ? 18 : 28
            range = type === 'punch' ? 90  : 112
          }

          let hit = false
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.hurtInv > 0) continue
            const dx = e.x - p.x, dy = e.floorY - p.floorY
            if (p.face === 1 ? dx < -14 : dx > 14) continue
            if (Math.abs(dx) > range || Math.abs(dy) > 58) continue

            const mult = this.rageActive ? 2.0 : 1.0
            const dmg  = Math.round(base * mult * this.scoreMult)
            e.hp = Math.max(0, e.hp - dmg)
            e.vx = p.face * (type === 'punch' ? 3 : 6)
            e.hurtInv = 16; e.state = 'hurt'; e.stateTimer = 12
            hit = true

            this.score += dmg
            this.combo++; this.comboTimer = 90
            if (this.combo > this.maxCombo) this.maxCombo = this.combo
            this.rage = Math.min(100, this.rage + 8)

            if (this.combo >= this.comboNextThresh) {
              this.scoreMult *= 2; this.comboNextThresh = this.combo + 10
              this.spawnFloatText(GW / 2, PLAY_H / 2 - 50, `×${this.scoreMult} MULTIPLICATEUR !`, '#ffdd00', true)
            }

            const esx = e.x - this.cameraX
            const dmgColor = isWep ? '#ffcc00' : type === 'kick' ? '#ffaa22' : '#ff4444'
            this.spawnFloatText(esx, e.floorY - PH - 12, `-${dmg}`, dmgColor, isWep || type === 'kick')

            if (e.hp <= 0) {
              e.state = 'dead'; e.deadTimer = 0
              this.score += 50 + this.combo * 8
              this.spawnBlood(e.x, e.floorY - PH / 2, 10)
              this.cameras.main.shake(140, 0.007)
              // Weapon drop — 35% chance, not from Tyler
              if (e.charType !== 'tyler' && Math.random() < 0.35) {
                this.dropWeapon(e.x, e.floorY)
              }
            } else {
              this.cameras.main.shake(70, 0.003)
            }
            this.refreshCombo()
            // Chain hits all in range; others stop at first hit
            if (this.heldWeapon?.type !== 'chain') break
          }

          // Consume weapon use on hit
          if (hit && this.heldWeapon) {
            this.heldWeapon.uses--
            if (this.heldWeapon.uses <= 0) {
              const label = this.heldWeapon.type === 'bat' ? 'BATTE CASSÉE' : this.heldWeapon.type === 'chain' ? 'CHAÎNE PERDUE' : 'BOUTEILLE BRISÉE'
              this.heldWeapon = null
              this.weaponGfx.clear()
              this.spawnFloatText(p.x - this.cameraX, p.floorY - 80, label, '#888888', false)
            }
          }
        }

        // Drop a random weapon at world position
        dropWeapon(x: number, y: number) {
          const types: WeaponType[] = ['bat', 'chain', 'bottle']
          const usesMap: Record<WeaponType, number> = { bat: 4, chain: 3, bottle: 2 }
          const type = types[Math.floor(Math.random() * types.length)]
          const gfx = this.add.graphics().setDepth(5)
          this.droppedWeapons.push({ gfx, x, y, type, maxUses: usesMap[type] })
        }

        playerJump() {
          const p = this.player
          if (p.hp <= 0 || p.jumpH > 0 || p.isBlocking) return
          p.jumpV = JUMP_VEL
        }

        activateRage() {
          if (this.rage < 100 || this.rageActive || this.player.hp <= 0) return
          this.rage = 0; this.rageActive = true; this.rageDuration = 60 * 8
          this.cameras.main.flash(350, 255, 60, 0, false)
          const psx = this.player.x - this.cameraX
          this.spawnFloatText(psx, this.player.floorY - PH - 30, 'RAGE MODE !', '#ff4400', true)
        }

        // ── PHYSICS ──────────────────────────────────────────
        tickChar(c: Char) {
          c.x += c.vx; c.vx *= 0.82
          c.floorY += c.vy; c.vy *= 0.78
          // Y clamped to floor band; X clamped externally per entity
          c.floorY = Math.max(FY1 + 8, Math.min(FY2, c.floorY))
          if (c.jumpV !== 0 || c.jumpH > 0) {
            c.jumpV += GRAV
            c.jumpH = Math.max(0, c.jumpH - c.jumpV)
            if (c.jumpH === 0 && c.state === 'jump') c.state = 'idle'
            if (c.jumpH > 0) c.state = 'jump'
          }
          if (c.stateTimer > 0 && --c.stateTimer === 0) {
            if (['punch', 'kick', 'hurt', 'taunt'].includes(c.state)) c.state = 'idle'
          }
          if (c.atkCD > 0) c.atkCD--
          if (c.hurtInv > 0) c.hurtInv--
          c.gfx.setDepth(10 + c.floorY)
        }

        // ── AI ───────────────────────────────────────────────
        tickAI(e: Char) {
          if (e.atkCD > 0) return
          const p = this.player
          const dx = p.x - e.x, dy = p.floorY - e.floorY
          const dist = Math.sqrt(dx * dx + dy * dy * 0.5)
          e.face = dx > 0 ? 1 : -1

          const hitRange = e.charType === 'tyler' ? 100 : e.charType === 'toughguy' ? 95 : e.charType === 'bob' ? 92 : 85

          if (dist < hitRange && Math.abs(dy) < 52) {
            const useKick = (e.charType === 'tyler' || e.charType === 'toughguy') && Math.random() < 0.3
            e.state = useKick ? 'kick' : 'punch'
            e.stateTimer = useKick ? 22 : 18
            // Difficulty-adjusted attack cooldown
            const diffSlowdown = this.diff === 'facile' ? 2.2 : this.diff === 'normal' ? 1.4 : 1.0
            e.atkCD = Math.round(Math.max(40, (95 - this.wave * 5)) * diffSlowdown)

            if (p.hp > 0 && p.hurtInv === 0) {
              const cfg    = DIFFS[this.diff]
              const rawDmg = Math.round((e.dmg + (useKick ? 6 : 0)) * cfg.dmgM)
              const isBoss = e.charType === 'tyler'

              if (p.isBlocking && !isBoss) {
                // 80% damage reduction; perfect block = stunned 2s
                const isPerfect = (this.frame - p.blockFrame) < 90
                p.hp = Math.max(0, p.hp - Math.round(rawDmg * 0.2))
                p.hurtInv = 8
                const esx = e.x - this.cameraX
                const psx = p.x - this.cameraX
                if (isPerfect) {
                  e.stunned = true; e.stunTimer = 120
                  this.cameras.main.flash(120, 0, 100, 255, false)
                  this.spawnFloatText(esx, e.floorY - PH - 22, 'PERFECT BLOCK !', '#44ddff', true)
                } else {
                  this.spawnFloatText(psx, p.floorY - PH - 16, 'BLOQUÉ', '#8888ff', false)
                }
              } else {
                p.hp = Math.max(0, p.hp - rawDmg)
                p.vx = e.face * (useKick ? 5 : 2)
                p.hurtInv = 22; p.state = 'hurt'; p.stateTimer = 14
                this.rage = Math.min(100, this.rage + 12)
                this.cameras.main.shake(90, 0.004)
              }
            }
          } else if (dist < 700) {
            e.vx = (dx / (Math.abs(dx) || 1)) * e.speed
            e.vy = (dy / (Math.abs(dy) || 1)) * e.speed * 0.6
            if (e.state !== 'hurt') e.state = 'walk'
            if (e.charType === 'tyler' && dist > 200 && e.hp > e.maxHp * 0.5 && Math.random() < 0.0008) {
              e.state = 'taunt'; e.stateTimer = 90; e.vx = 0; e.vy = 0
            }
          } else {
            e.state = 'idle'; e.vx *= 0.85
          }
        }

        // ── WAVES — zone-based, Streets-of-Rage style ────────
        spawnWave() {
          this.wave++
          this.waveCleared = false
          for (const e of this.enemies) e.gfx.destroy()
          this.enemies = []
          // Clear leftover weapons from previous wave
          for (const w of this.droppedWeapons) w.gfx.destroy()
          this.droppedWeapons = []
          this.bossHpGfx.setVisible(false)

          const totalWaves = DIFFS[this.diff].waves
          const isBoss = this.wave === totalWaves
          this.isBossFight = isBoss

          const zone = this.waveZones[this.currentZoneIdx]

          // Screen lock — player can't advance right while enemies are alive
          this.maxPlayerWorldX = zone.triggerX + 190

          if (isBoss) {
            // Tyler spawns ahead of player
            this.spawnEnemy('tyler', zone.triggerX + 480, (FY1 + FY2) / 2)
            this.showBossIntro()
          } else {
            // Wave N has N enemies; jack doubles the count
            const baseCount = this.wave
            const count = this.diff === 'jack' ? baseCount * 2 : baseCount
            const comps = this.getWaveComp(Math.min(count, 6))
            let i = 0
            for (const [type, c] of comps) {
              for (let j = 0; j < c; j++) {
                const ex = zone.triggerX + 300 + i * 100 + Math.random() * 60
                const ey = FY1 + 18 + Math.random() * (FY2 - FY1 - 25)
                this.spawnEnemy(type, ex, ey)
                i++
              }
            }
            this.showWaveAnnounce(this.wave)
          }
        }

        // Wave composition: wave number → list of [type, count]
        getWaveComp(wave: number): [CharType, number][] {
          if (wave <= 1) return [['grunt', 1]]
          if (wave === 2) return [['grunt', 2]]
          if (wave === 3) return [['grunt', 2], ['toughguy', 1]]
          if (wave === 4) return [['grunt', 2], ['toughguy', 1], ['bob', 1]]
          // waves 5+ (for normal / jack difficulties, before boss)
          return [['grunt', 2], ['toughguy', 1], ['bob', 2]]
        }

        spawnEnemy(type: CharType, x: number, floorY: number) {
          const gfx = this.add.graphics().setDepth(10 + floorY)
          const cfg  = DIFFS[this.diff]
          const hpMap:  Record<string, number> = { grunt: 42, bob: 100, toughguy: 80, tyler: 240 }
          const spdMap: Record<string, number> = { grunt: 1.6, bob: 1.2, toughguy: 1.4, tyler: 2.0 }
          const dmgMap: Record<string, number> = { grunt: 8, bob: 13, toughguy: 12, tyler: 20 }
          // HP scales mildly with wave number
          const waveScale = 1 + (this.wave - 1) * 0.14
          const hp = Math.round((hpMap[type] ?? 50) * cfg.hpM * waveScale)
          this.enemies.push({
            gfx, x, floorY, jumpH: 0, jumpV: 0, vx: 0, vy: 0,
            hp, maxHp: hp, face: -1,   // start facing left (toward player)
            state: 'idle', stateTimer: 0, atkCD: 0, hurtInv: 0,
            speed: Math.min(2.8, (spdMap[type] ?? 1.6) + this.wave * 0.10),
            dmg:   dmgMap[type] ?? 8,
            isPlayer: false, charType: type, wave: this.wave, deadTimer: 0,
            isBlocking: false, blockFrame: 0, stunned: false, stunTimer: 0,
          })
        }

        // ── MARLA ────────────────────────────────────────────
        triggerMarla() {
          this.marlaUsed = true; this.marlaActive = true
          // Marla enters from left edge of current camera view (world space)
          this.marlaCh = {
            gfx: this.marlaDraw,
            x: this.cameraX - 30,
            floorY: (FY1 + FY2) / 2,
            phase: 0, timer: 0,
          }
          for (const e of this.enemies) e.atkCD = Math.max(e.atkCD, 130)
        }

        updateMarla() {
          const m = this.marlaCh!
          m.timer++
          const targetWorldX = this.cameraX + 145   // ~145px from left of screen
          if (m.phase === 0) {
            m.x += 2.2
            if (m.x >= targetWorldX) { m.phase = 1; m.timer = 0 }
          } else if (m.phase === 1) {
            if (m.timer === 40)
              this.spawnFloatText(m.x - this.cameraX, m.floorY - 88, '"Voilà une cigarette."', '#ff99cc', true)
            if (m.timer === 100) {
              this.player.hp = this.player.maxHp
              this.spawnFloatText(this.player.x - this.cameraX, this.player.floorY - 100, '♥ HP RESTAURÉ', '#ff4488', true)
              this.cameras.main.flash(280, 255, 80, 180, false)
            }
            if (m.timer > 160) { m.phase = 2; m.timer = 0 }
          } else {
            m.x -= 2.2
            if (m.x < this.cameraX - 40) {
              this.marlaDraw.clear(); this.marlaCh = null; this.marlaActive = false
            }
          }
          if (this.marlaCh) {
            const ds = this.depthScale(m.floorY) * 1.72 * 0.88
            this.marlaDraw.setPosition(m.x - this.cameraX, m.floorY)
            this.marlaDraw.setScale(ds, ds)
            drawMarla(this.marlaDraw, m.phase === 1 ? 'idle' : 'walk', this.frame)
          }
        }

        // ── RENDER ───────────────────────────────────────────
        renderAll() {
          const cam = this.cameraX

          // Scrolling background + floor (redrawn every frame)
          this.drawBackground(cam)
          this.drawFloor(cam)

          // Render weapons on ground
          for (const w of this.droppedWeapons) {
            const sx = w.x - cam
            if (sx < -60 || sx > GW + 60) { w.gfx.clear(); continue }
            // Slight floating bob
            const bob = Math.sin(this.frame * 0.06) * 2
            w.gfx.setPosition(sx, w.y - 8 + bob)
            drawWeaponGround(w.gfx, w.type)
          }

          const p = this.player
          const showP = p.hurtInv === 0 || Math.floor(p.hurtInv / 3) % 2 === 0
          if (showP) {
            const ds = this.depthScale(p.floorY) * 1.72
            p.gfx.setPosition(p.x - cam, p.floorY - p.jumpH)
            p.gfx.setScale(p.face * ds, ds)
            drawNorton(p.gfx, p.state, this.frame)
            // Draw held weapon on player
            if (this.heldWeapon && p.state !== 'dead') {
              this.weaponGfx.setPosition(p.x - cam, p.floorY - p.jumpH)
              this.weaponGfx.setScale(p.face * ds, ds)
              drawHeldWeapon(this.weaponGfx, this.heldWeapon.type, p.state)
            } else {
              this.weaponGfx.clear()
            }
          } else { p.gfx.clear(); this.weaponGfx.clear() }

          for (const e of this.enemies) {
            const sx = e.x - cam
            if (e.deadTimer > 55) { e.gfx.clear(); continue }
            if (sx < -90 || sx > GW + 90) { e.gfx.clear(); continue }   // off-screen cull
            const showE = e.hurtInv === 0 || Math.floor(e.hurtInv / 3) % 2 === 0
            if (!showE) { e.gfx.clear(); continue }
            const sz = e.charType === 'bob' ? 1.28 : e.charType === 'toughguy' ? 1.18 : e.charType === 'tyler' ? 1.14 : 1.0
            const ds = this.depthScale(e.floorY) * 1.72 * sz
            e.gfx.setPosition(sx, e.floorY - e.jumpH)
            e.gfx.setScale(e.face * ds, ds)
            if (e.charType === 'grunt')         drawGrunt(e.gfx, e.state, this.frame, e.wave)
            else if (e.charType === 'bob')      drawBob(e.gfx, e.state, this.frame)
            else if (e.charType === 'toughguy') drawToughGuy(e.gfx, e.state, this.frame)
            else if (e.charType === 'tyler')    drawTyler(e.gfx, e.state, this.frame)
          }

          this.overlayGfx.clear()
          if (this.rageActive) {
            const a = 0.06 + Math.sin(this.frame * 0.18) * 0.025
            this.overlayGfx.fillStyle(0xff2200, a); this.overlayGfx.fillRect(0, 0, GW, PLAY_H)
          }
          for (const e of this.enemies) {
            if (e.stunned && e.hp > 0) {
              const sx = e.x - cam
              if (sx > -40 && sx < GW + 40) {
                const pulse = 0.1 + Math.sin(this.frame * 0.22) * 0.06
                this.overlayGfx.fillStyle(0x44ffff, pulse)
                this.overlayGfx.fillCircle(sx, e.floorY - PH / 2, 30)
              }
            }
          }
        }

        depthScale(fy: number): number {
          return 0.88 + 0.12 * ((fy - FY1) / (FY2 - FY1))
        }

        // Background drawn every frame with parallax scroll
        drawBackground(scrollX: number) {
          const g = this.bgGfx; g.clear()
          g.fillStyle(0x111118, 1); g.fillRect(0, 0, GW, PLAY_H)
          g.fillStyle(0x1c1c28, 1); g.fillRect(0, FY1 - 30, GW, 30)

          // Tiled brick wall — parallax at 20% of scroll speed
          const brickW = 46, brickH = 38
          const brickOff = -(scrollX * 0.20) % (brickW * 2)
          g.lineStyle(1, 0x232333, 0.6)
          for (let row = 0; row < 7; row++) {
            const off = row % 2 === 0 ? 0 : brickW / 2
            for (let col = -2; col < Math.ceil(GW / brickW) + 3; col++) {
              g.strokeRect(col * brickW + off + brickOff, row * brickH, brickW - 2, brickH - 2)
            }
          }

          // Ceiling rail
          g.fillStyle(0x252525, 1); g.fillRect(0, 44, GW, 10)
          g.fillStyle(0x303030, 1); g.fillRect(0, 48, GW, 4)

          // Vents / pipes — tiled, 50% parallax
          const ventSpacing = 180
          const ventOff = -(scrollX * 0.50) % ventSpacing
          for (let i = -1; i < Math.ceil(GW / ventSpacing) + 2; i++) {
            const vx = i * ventSpacing + ventOff + 80
            g.fillStyle(0x3a3a38, 1); g.fillRect(vx - 10, 40, 20, 18)
            g.fillStyle(0x2a2a28, 1); g.fillRect(vx - 14, 48, 28, 5)
          }

          // Pillars — 60% parallax
          const pillarSpacing = 240
          const pillarOff = -(scrollX * 0.60) % pillarSpacing
          for (let i = -1; i < Math.ceil(GW / pillarSpacing) + 2; i++) {
            const px = i * pillarSpacing + pillarOff + 100
            g.fillStyle(0x181820, 1); g.fillRect(px, 64, 24, FY1 - 64)
            g.fillStyle(0x222230, 1); g.fillRect(px + 20, 64, 4, FY1 - 64)
          }

          // Ceiling bulbs — 30% parallax
          const bulbSpacing = 160
          const bulbOff = -(scrollX * 0.30) % bulbSpacing
          for (let i = -1; i < Math.ceil(GW / bulbSpacing) + 2; i++) {
            const bx = i * bulbSpacing + bulbOff + 80
            g.fillStyle(0xffbb44, 0.07); g.fillTriangle(bx, 50, bx + 100, FY1, bx - 100, FY1)
            g.fillStyle(0xffbb44, 0.04); g.fillTriangle(bx, 50, bx + 160, PLAY_H, bx - 160, PLAY_H)
            g.fillStyle(0xffeeaa, 1);    g.fillCircle(bx, 47, 5)
            g.fillStyle(0xffffff, 0.7);  g.fillCircle(bx, 47, 2)
          }

          // FIGHT CLUB sign — 40% parallax
          const signX = 305 - scrollX * 0.40
          const wrappedSign = ((signX % (GW + 380)) + GW + 380) % (GW + 380) - 190
          if (wrappedSign > -200 && wrappedSign < GW + 10) {
            g.fillStyle(0xcc1111, 0.14); g.fillRect(wrappedSign, 80, 190, 48)
            g.lineStyle(1, 0xcc1111, 0.25); g.strokeRect(wrappedSign - 1, 79, 192, 50)
          }

          // Blood splatter on floor (decorative)
          for (let i = 0; i < 5; i++) {
            const bx = ((70 + i * 115 + Math.sin(i * 2.1) * 30) - scrollX * 0.55 + this.worldWidth * 10) % GW
            const by = FY1 + 15 + Math.cos(i * 2.6) * 25
            g.fillStyle(0x660000, 0.22); g.fillEllipse(bx, by, 22 + i * 4, 8 + i * 2)
          }
        }

        // Floor drawn every frame with scroll
        drawFloor(scrollX: number) {
          const g = this.floorGfx; g.clear()
          g.fillStyle(0x1e1e2a, 1); g.fillRect(0, FY1, GW, PLAY_H - FY1)
          g.lineStyle(3, 0x3a3a52, 0.9); g.lineBetween(0, FY1, GW, FY1)

          // Floor tiles — full parallax (1:1 with scroll, so seamless)
          const tileW = 42
          const tileOff = -(scrollX % tileW)
          g.lineStyle(1, 0x262636, 0.55)
          for (let c = -1; c <= Math.ceil(GW / tileW) + 1; c++) {
            g.lineBetween(c * tileW + tileOff, FY1, c * tileW + tileOff, PLAY_H)
          }
          for (let rw = 0; rw <= 4; rw++) g.lineBetween(0, FY1 + rw * 32, GW, FY1 + rw * 32)

          // Light cones from bulbs (30% parallax, same as ceiling)
          const bulbSpacing = 160
          const bulbOff = -(scrollX * 0.30) % bulbSpacing
          for (let i = -1; i < Math.ceil(GW / bulbSpacing) + 2; i++) {
            const bx = i * bulbSpacing + bulbOff + 80
            g.fillStyle(0xffaa33, 0.055); g.fillEllipse(bx, FY1 + 18, 180, 36)
            g.fillStyle(0xffaa33, 0.03);  g.fillEllipse(bx, FY1 + 40, 140, 28)
          }

          g.lineStyle(1, 0x141420, 0.7); g.strokeRect(GW / 2 - 24, FY2 - 20, 48, 14)
          for (let i = 0; i < 6; i++) g.lineBetween(GW / 2 - 16 + i * 8, FY2 - 18, GW / 2 - 16 + i * 8, FY2 - 8)
          g.fillStyle(0x08080e, 1); g.fillRect(0, PLAY_H, GW, HUD_H)
          g.lineStyle(2, 0xcc1111, 0.55); g.lineBetween(0, PLAY_H, GW, PLAY_H)
          g.fillStyle(0xcc1111, 0.06); g.fillRect(0, PLAY_H - 4, GW, 4)
        }

        // ── HUD ──────────────────────────────────────────────
        createHUD() {
          const D = 500, HY = PLAY_H

          this.comboLabel = this.add.text(GW / 2, HY - 62, '', {
            fontFamily: 'Impact, monospace', fontSize: '24px', color: '#ff8800',
            align: 'center', stroke: '#000000', strokeThickness: 4,
          }).setOrigin(0.5, 0.5).setDepth(D).setAlpha(0)

          this.waveLabel = this.add.text(GW / 2, HY + 10, '', {
            fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa', align: 'center', letterSpacing: 3,
          }).setOrigin(0.5, 0).setDepth(D)

          this.scoreLabel = this.add.text(GW / 2, HY + 28, '', {
            fontFamily: 'monospace', fontSize: '16px', color: '#ffdd00', align: 'center', letterSpacing: 2,
          }).setOrigin(0.5, 0).setDepth(D)

          this.hpLabel = this.add.text(18, HY + 46, '', {
            fontFamily: 'monospace', fontSize: '9px', color: '#888888',
          }).setDepth(D)

          this.rageLabel = this.add.text(18, HY + 52, '', {
            fontFamily: 'monospace', fontSize: '9px', color: '#882200', letterSpacing: 1,
          }).setDepth(D)

          this.blockLabel = this.add.text(GW / 2, HY + HUD_H - 3, '', {
            fontFamily: 'monospace', fontSize: '9px', color: '#6666cc', align: 'center', letterSpacing: 2,
          }).setOrigin(0.5, 1).setDepth(D)

          const diffCfg = DIFFS[this.diff]
          this.add.text(18, HY + 6, 'NORTON', {
            fontFamily: 'monospace', fontSize: '11px', color: '#cccccc', letterSpacing: 3,
          }).setDepth(D)
          this.add.text(GW - 18, HY + 56, diffCfg.label, {
            fontFamily: 'monospace', fontSize: '9px', color: '#554433', letterSpacing: 2,
          }).setOrigin(1, 1).setDepth(D)

          this.quoteText = this.add.text(GW / 2, PLAY_H / 2, '', {
            fontFamily: 'serif', fontSize: '20px', color: '#dddddd',
            align: 'center', stroke: '#000000', strokeThickness: 5,
            wordWrap: { width: 560 },
          }).setOrigin(0.5, 0.5).setDepth(D + 10).setAlpha(0)

          const ctrl = this.add.text(GW / 2, HY + HUD_H - 14,
            'WASD / ←↑↓→  Bouger   |   Z Poing   X Kick   ESPACE Saut   Q Garde   C Rage', {
            fontFamily: 'monospace', fontSize: '8px', color: 'rgba(200,200,200,0.32)', align: 'center',
          }).setOrigin(0.5, 1).setDepth(D)
          this.time.delayedCall(7000, () => this.tweens.add({ targets: ctrl, alpha: 0, duration: 2000 }))
        }

        updateHUD() {
          const p = this.player
          const cam = this.cameraX
          const g = this.hpBarGfx; g.clear()
          const HY = PLAY_H

          // Player HP bar
          g.fillStyle(0x000000, 0.85); g.fillRect(14, HY + 18, 202, 14)
          g.fillStyle(0x1a1a1a, 1);    g.fillRect(15, HY + 19, 200, 12)
          const pct = Math.max(0, p.hp / p.maxHp)
          const col = pct > 0.5 ? 0x22dd44 : pct > 0.25 ? 0xddaa22 : 0xee2222
          g.fillStyle(col, 1); g.fillRect(15, HY + 19, Math.round(200 * pct), 12)
          g.fillStyle(0xffffff, 0.08); g.fillRect(15, HY + 19, Math.round(200 * pct), 6)
          g.lineStyle(1, 0x444444, 0.6); g.strokeRect(14, HY + 18, 202, 14)

          this.hpLabel.setText(`${Math.max(0, p.hp)} / ${p.maxHp}`)

          // Weapon durability bar OR rage bar
          if (this.heldWeapon) {
            const wep = this.heldWeapon
            const wLabel = wep.type === 'bat' ? 'BATTE' : wep.type === 'chain' ? 'CHAINE' : 'BOUTEILLE'
            const barW = 80
            g.fillStyle(0x111111, 0.9); g.fillRect(14, HY + 34, barW + 4, 10)
            g.fillStyle(0xcc8822, 1);   g.fillRect(15, HY + 35, Math.round(barW * wep.uses / wep.maxUses), 8)
            g.lineStyle(1, 0x886622, 0.5); g.strokeRect(14, HY + 34, barW + 4, 10)
            this.rageLabel.setPosition(18, HY + 46).setText(`[Z/X] ${wLabel} (${wep.uses})`).setColor('#ffcc44')
          } else {
            // Rage bar
            g.fillStyle(0x000000, 0.7); g.fillRect(14, HY + 34, 152, 8)
            const rCol = this.rageActive ? 0xff4400 : this.rage >= 100 ? 0xff8800 : 0x661100
            g.fillStyle(rCol, 1); g.fillRect(15, HY + 35, Math.max(0, Math.round(150 * this.rage / 100)), 6)
            g.lineStyle(1, 0x333333, 0.5); g.strokeRect(14, HY + 34, 152, 8)
            this.rageLabel.setPosition(18, HY + 52)
            this.rageLabel.setText(this.rageActive ? '★ RAGE ★' : this.rage >= 100 ? '  [C] RAGE ▶' : '  RAGE')
            this.rageLabel.setColor(this.rageActive ? '#ff6600' : this.rage >= 100 ? '#ff8800' : '#553300')
          }

          // Block indicator
          if (p.isBlocking) {
            const pulse = 0.55 + Math.sin(this.frame * 0.3) * 0.45
            this.blockLabel.setText('[Q] GARDE ACTIVE — 80% réduc. dommages').setAlpha(pulse).setColor('#88aaff')
          } else {
            this.blockLabel.setText('[Q] GARDE').setAlpha(0.3).setColor('#555588')
          }

          // Wave / score
          if (this.scoreMult > 1) {
            this.waveLabel.setText(`— VAGUE ${this.wave} —   ×${this.scoreMult} COMBO MULT`).setColor('#ffdd00')
          } else {
            this.waveLabel.setText(`— VAGUE ${this.wave} —`).setColor('#aaaaaa')
          }
          this.scoreLabel.setText(`${String(this.score).padStart(7, '0')}`)

          // HUD dividers
          g.lineStyle(1, 0x333344, 0.45)
          g.lineBetween(230, HY + 4, 230, HY + HUD_H - 4)
          g.lineBetween(GW - 230, HY + 4, GW - 230, HY + HUD_H - 4)

          // Enemy HP bars (floating, screen-space)
          const eg = this.enemyHpGfx; eg.clear()
          for (const e of this.enemies) {
            if (e.hp <= 0) continue
            const esx = e.x - cam
            if (esx < -60 || esx > GW + 60) continue
            const bw = e.charType === 'bob' ? 72 : 56
            const ds = this.depthScale(e.floorY) * 1.72 * (e.charType === 'bob' ? 1.28 : 1.0)
            const by = e.floorY - PH * ds - 16
            const bx = esx - bw / 2
            eg.fillStyle(0x000000, 0.8); eg.fillRect(bx - 1, by - 1, bw + 2, 8)
            eg.fillStyle(0x1a1a1a, 1);   eg.fillRect(bx, by, bw, 6)
            const ep = Math.max(0, e.hp / e.maxHp)
            const ec = e.charType === 'tyler' ? 0xcc1111 : e.charType === 'bob' ? 0xcc7722 : ep > 0.5 ? 0xcc3333 : ep > 0.25 ? 0xff5500 : 0xff0000
            eg.fillStyle(ec, 1); eg.fillRect(bx, by, Math.round(bw * ep), 6)
            if (e.stunned && e.stunTimer > 0) {
              eg.fillStyle(0x44ffff, 1); eg.fillRect(bx, by - 4, Math.round(bw * e.stunTimer / 120), 3)
            }
          }

          // Boss HP bar
          if (this.isBossFight && this.enemies[0]) {
            const boss = this.enemies[0]
            this.bossHpGfx.setVisible(true)
            const bg2 = this.bossHpGfx; bg2.clear()
            bg2.fillStyle(0x000000, 0.85); bg2.fillRect(GW - 216, HY + 18, 202, 14)
            bg2.fillStyle(0x1a1a1a, 1);    bg2.fillRect(GW - 215, HY + 19, 200, 12)
            const bp = Math.max(0, boss.hp / boss.maxHp)
            bg2.fillStyle(0xcc1111, 1); bg2.fillRect(GW - 215, HY + 19, Math.round(200 * bp), 12)
            bg2.fillStyle(0xffffff, 0.08); bg2.fillRect(GW - 215, HY + 19, Math.round(200 * bp), 6)
            bg2.lineStyle(1, 0x444444, 0.6); bg2.strokeRect(GW - 216, HY + 18, 202, 14)
          }
        }

        refreshCombo() {
          if (this.combo >= 2) {
            this.comboLabel.setText(`${this.combo}×  COMBO`)
            this.comboLabel.setAlpha(1).setScale(1.3)
            this.tweens.add({ targets: this.comboLabel, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' })
          } else {
            this.tweens.add({ targets: this.comboLabel, alpha: 0, duration: 500 })
          }
        }

        // ── EFFECTS ──────────────────────────────────────────
        showQuote(text: string) {
          this.quoteText.setText(text).setAlpha(0)
          this.tweens.add({
            targets: this.quoteText, alpha: 1, duration: 700,
            hold: 2800, yoyo: true, onComplete: () => this.quoteText.setAlpha(0),
          })
        }

        showWaveAnnounce(wave: number) {
          const t = this.add.text(GW / 2, PLAY_H / 2 - 20, `VAGUE  ${wave}`, {
            fontFamily: 'Impact, monospace', fontSize: '56px', color: '#ffdd00',
            stroke: '#000000', strokeThickness: 7,
          }).setOrigin(0.5, 0.5).setDepth(550).setAlpha(0).setScale(1.8)
          this.tweens.add({
            targets: t, alpha: 1, scaleX: 1, scaleY: 1,
            duration: 280, ease: 'Back.Out', hold: 1100, yoyo: true,
            onComplete: () => t.destroy(),
          })
        }

        showBossIntro() {
          this.cameras.main.shake(700, 0.016)
          this.time.delayedCall(400, () => {
            const t1 = this.add.text(GW / 2, PLAY_H / 2 - 30, 'TYLER DURDEN', {
              fontFamily: 'Impact', fontSize: '52px', color: '#cc1111', stroke: '#000000', strokeThickness: 6,
            }).setOrigin(0.5, 0.5).setDepth(550).setAlpha(0)
            this.tweens.add({ targets: t1, alpha: 1, duration: 500, hold: 1800, yoyo: true, onComplete: () => t1.destroy() })
          })
          this.time.delayedCall(2400, () => {
            const t2 = this.add.text(GW / 2, PLAY_H / 2 + 10,
              '"Fight Club. You\'re the all-singing,\nall-dancing crap of the world."', {
              fontFamily: 'serif', fontSize: '18px', color: '#cccccc',
              stroke: '#000000', strokeThickness: 4, align: 'center',
            }).setOrigin(0.5, 0.5).setDepth(550).setAlpha(0)
            this.tweens.add({ targets: t2, alpha: 1, duration: 600, hold: 2000, yoyo: true, onComplete: () => t2.destroy() })
          })
          this.time.delayedCall(100, () => {
            this.add.text(GW - 18, PLAY_H + 6, 'TYLER DURDEN', {
              fontFamily: 'monospace', fontSize: '11px', color: '#cc1111', letterSpacing: 3,
            }).setOrigin(1, 0).setDepth(500)
          })
        }

        // Screen-space float text (x should be world_x - cameraX)
        spawnFloatText(x: number, y: number, text: string, color: string, big: boolean) {
          const t = this.add.text(x, y, text, {
            fontFamily: 'monospace', fontSize: big ? '18px' : '14px',
            color, stroke: '#000000', strokeThickness: big ? 3 : 2,
            fontStyle: big ? 'bold' : 'normal',
          }).setOrigin(0.5, 0.5).setDepth(450)
          this.floatTexts.push({ obj: t, vy: -1.3, life: 48, maxLife: 48 })
        }

        tickFloats() {
          for (const ft of this.floatTexts) { ft.obj.y += ft.vy; ft.life--; ft.obj.setAlpha(ft.life / ft.maxLife) }
          this.floatTexts.filter(f => f.life <= 0).forEach(f => f.obj.destroy())
          this.floatTexts = this.floatTexts.filter(f => f.life > 0)
        }

        // Blood uses world positions; render subtracts cameraX
        spawnBlood(x: number, y: number, count: number) {
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 3.5
            const pg = this.add.graphics().setDepth(395)
            this.blood.push({
              gfx: pg, x, y,
              vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1.5,
              life: 22 + Math.floor(Math.random() * 18), sz: 1.5 + Math.random() * 2.5,
            })
          }
        }

        tickBlood() {
          const cam = this.cameraX
          for (const b of this.blood) {
            b.x += b.vx; b.y += b.vy; b.vy += 0.32; b.life--
            b.gfx.clear()
            b.gfx.fillStyle(0xaa0000, b.life / 35)
            b.gfx.fillCircle(b.x - cam, b.y, b.sz)
          }
          this.blood.filter(b => b.life <= 0).forEach(b => b.gfx.destroy())
          this.blood = this.blood.filter(b => b.life > 0)
        }

        scheduleFlicker() {
          this.time.addEvent({
            delay: 4000 + Math.random() * 9000,
            callback: () => {
              if (this.gameOver || this.victory) return
              this.cameras.main.flash(60, 200, 200, 200, false)
              this.time.delayedCall(90, () => this.cameras.main.flash(40, 0, 0, 0, false))
              this.scheduleFlicker()
            },
          })
        }

        // ── GAME OVER ─────────────────────────────────────────
        triggerGameOver() {
          this.gameOver = true; this.gameOverTimer = 0
          this.player.state = 'dead'; this.music?.stop()
          this.cameras.main.shake(350, 0.014)
        }

        tickGameOver() {
          this.gameOverTimer++; this.frame++
          this.renderAll()

          if (this.gameOverTimer === 160) {
            const darken = this.add.graphics().setDepth(700)
            this.tweens.add({
              targets: { v: 0 }, v: 0.88, duration: 1000,
              onUpdate: (tw: any) => {
                darken.clear()
                darken.fillStyle(0x000000, (tw.targets[0] as { v: number }).v)
                darken.fillRect(0, 0, GW, GH)
              },
            })
          }

          if (this.gameOverTimer === 280) {
            const q = this.add.text(GW / 2, PLAY_H / 2 - 52,
              '"Je vais te couper les couilles à vif..."', {
              fontFamily: 'serif', fontSize: '23px', color: '#cc1111',
              stroke: '#000000', strokeThickness: 4, fontStyle: 'italic', align: 'center',
            }).setOrigin(0.5, 0.5).setDepth(750).setAlpha(0)
            this.tweens.add({ targets: q, alpha: 1, duration: 900 })

            const attr = this.add.text(GW / 2, PLAY_H / 2 - 4, '— Tyler Durden', {
              fontFamily: 'serif', fontSize: '15px', color: '#886644', fontStyle: 'italic',
            }).setOrigin(0.5, 0.5).setDepth(751).setAlpha(0)
            this.tweens.add({ targets: attr, alpha: 1, duration: 900, delay: 500 })

            const stats = this.add.text(GW / 2, PLAY_H / 2 + 38,
              `Score : ${this.score}   |   Combo max : ${this.maxCombo}×`, {
              fontFamily: 'monospace', fontSize: '13px', color: '#888888',
            }).setOrigin(0.5, 0.5).setDepth(750).setAlpha(0)
            this.tweens.add({ targets: stats, alpha: 1, duration: 900, delay: 800 })

            this.time.delayedCall(1600, () => {
              gameResult.current = { score: this.score, diff: this.diff }
              setShowName(true)
            })
          }
        }

        triggerVictory() {
          this.victory = true; this.music?.stop()
          this.cameras.main.shake(500, 0.022)

          this.time.delayedCall(800, () => {
            const title = this.add.text(GW / 2, PLAY_H / 2 - 52, 'YOU ARE NOT YOUR JOB.', {
              fontFamily: 'Impact', fontSize: '46px', color: '#ffdd00', stroke: '#000000', strokeThickness: 6,
            }).setOrigin(0.5, 0.5).setDepth(750).setAlpha(0)
            this.tweens.add({ targets: title, alpha: 1, duration: 1000 })
          })
          this.time.delayedCall(1800, () => {
            this.add.text(GW / 2, PLAY_H / 2 + 8,
              `Score : ${this.score}  |  Combo max : ${this.maxCombo}×  |  Mult. ×${this.scoreMult}`, {
              fontFamily: 'monospace', fontSize: '13px', color: '#888888',
            }).setOrigin(0.5, 0.5).setDepth(750)
          })
          this.time.delayedCall(2400, () => {
            gameResult.current = { score: this.score, diff: this.diff }
            setShowName(true)
          })
        }

        shutdown() { this.music?.stop(); currentMusic = null }
      }

      // ── LAUNCH ───────────────────────────────────────────────────
      phaserGame = new Phaser.Game({
        type: Phaser.CANVAS,
        width: GW, height: GH,
        parent: containerRef.current!,
        backgroundColor: '#06060c',
        scene: [MenuScene, DifficultyScene, OptionsScene, GameScene],
        input: { keyboard: true },
        audio: { disableWebAudio: false },
        banner: false,
        render: { pixelArt: false, antialias: true },
      })
    })()

    return () => { phaserGame?.destroy(true); phaserGame = null }
  }, [onDone])

  const lbDiff = (gameResult.current?.diff ?? 'normal') as Diff

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div ref={containerRef} style={{ transform: `scale(${uiScale})`, transformOrigin: 'center center' }} />

      {/* Name entry overlay */}
      {showName && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.84)', zIndex: 200,
        }}>
          <div style={{ color: '#cc1111', fontFamily: 'Impact, serif', fontSize: '30px', letterSpacing: '6px', marginBottom: '6px' }}>
            GAME OVER
          </div>
          <div style={{ color: '#888', fontFamily: 'monospace', fontSize: '13px', marginBottom: '22px' }}>
            Score : <span style={{ color: '#ffdd00', fontWeight: 'bold' }}>{gameResult.current?.score ?? 0}</span>
          </div>
          <div style={{ color: '#555', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '3px', marginBottom: '10px' }}>
            ENTREZ VOTRE NOM :
          </div>
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmName() }}
            maxLength={12}
            style={{
              background: '#111', border: '1px solid #cc1111', color: '#fff',
              fontFamily: 'monospace', fontSize: '22px', padding: '10px 22px',
              textAlign: 'center', letterSpacing: '6px', marginBottom: '20px',
              outline: 'none', width: '230px', textTransform: 'uppercase',
            }}
          />
          <button onClick={confirmName} style={{
            background: '#cc1111', border: 'none', color: '#fff',
            fontFamily: 'Impact', fontSize: '18px', letterSpacing: '4px',
            padding: '10px 40px', cursor: 'pointer',
          }}>VALIDER</button>
        </div>
      )}

      {/* Leaderboard overlay */}
      {showLB && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)', zIndex: 200,
        }}>
          <div style={{ color: '#cc1111', fontFamily: 'Impact', fontSize: '28px', letterSpacing: '6px', marginBottom: '4px' }}>
            CLASSEMENT — {DIFFS[lbDiff].label}
          </div>
          <table style={{ borderCollapse: 'collapse', marginBottom: '28px', marginTop: '12px' }}>
            <tbody>
              {lbData.map((e, i) => (
                <tr key={i} style={{ color: i === 0 ? '#ffdd00' : '#cccccc' }}>
                  <td style={{ fontFamily: 'monospace', fontSize: '14px', padding: '3px 14px', textAlign: 'right', opacity: 0.5 }}>
                    #{i + 1}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '14px', padding: '3px 14px', letterSpacing: '3px' }}>
                    {e.name}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '14px', padding: '3px 14px', color: '#ffdd00' }}>
                    {String(e.score).padStart(7, '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => { setShowLB(false); onDone() }} style={{
            background: 'transparent', border: '1px solid #554433', color: '#886644',
            fontFamily: 'monospace', fontSize: '13px', letterSpacing: '4px',
            padding: '10px 32px', cursor: 'pointer',
          }}>RETOUR AU SITE</button>
        </div>
      )}
    </div>
  )
}
