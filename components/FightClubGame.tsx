'use client'
import React, { useEffect, useRef, useState } from 'react'
import { discoverEgg, saveFightClubScore, getFightClubLeaderboard } from '@/lib/actions'

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
  normal: { waves: 7,  hpM: 0.62, dmgM: 0.60, playerHp: 160, label: 'NORMAL',          sub: '7 vagues · Défilement · Combat équilibré'  },
  jack:   { waves: 10, hpM: 1.1,  dmgM: 1.1,  playerHp: 105, label: "L'OMBRE DE JACK", sub: '10 vagues · Brutal. Sans merci.'           },
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
  const top100 = all.slice(0, 100)
  try { localStorage.setItem(LB_KEYS[d] ?? 'fc_lb_normal', JSON.stringify(top100)) } catch {}
  return top100
}

export default function FightClubGame({ onDone }: { onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [uiScale,          setUiScale]          = useState(1)
  const [showName,         setShowName]         = useState(false)
  const [showLB,           setShowLB]           = useState(false)
  const [showEndlessChoice,setShowEndlessChoice] = useState(false)
  const [showDoorPrompt,   setShowDoorPrompt]   = useState(false)
  const [mobileCtrlsOn,    setMobileCtrlsOn]    = useState(false)
  const [gameReady,        setGameReady]        = useState(false)
  const [isMobile,         setIsMobile]         = useState(false)
  const [isPortrait,       setIsPortrait]       = useState(false)
  const [lbData,           setLbData]           = useState<LBEntry[]>([])
  const [existingLB,       setExistingLB]       = useState<LBEntry[]>([])
  const [nameVal,          setNameVal]          = useState('')
  const gameResult = useRef<{ score: number; diff: string } | null>(null)
  const startEndlessRef = useRef<(() => void) | null>(null)
  const confirmDoorRef  = useRef<(() => void) | null>(null)
  const cancelDoorRef   = useRef<(() => void) | null>(null)

  useEffect(() => {
    const upd = () => setUiScale(Math.min(window.innerWidth / GW, window.innerHeight / GH, 1.6))
    upd(); window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  useEffect(() => {
    const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsMobile(mobile)
    if (!mobile) return
    // Essaye de verrouiller l'orientation en paysage (Android Chrome)
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        ;(screen.orientation as any).lock('landscape').catch(() => {})
      }
    } catch (_) {}
    // Détecte mode portrait pour afficher l'overlay "tournez votre appareil"
    const mq = window.matchMedia('(orientation: portrait)')
    const upd = (e: MediaQueryListEvent | MediaQueryList) => setIsPortrait(e.matches)
    upd(mq); mq.addEventListener('change', upd)
    return () => {
      mq.removeEventListener('change', upd)
      try { if (screen.orientation && (screen.orientation as any).unlock) (screen.orientation as any).unlock() } catch (_) {}
    }
  }, [])

  async function confirmName() {
    const res = gameResult.current; if (!res) return
    const nm = nameVal.trim().toUpperCase().slice(0, 12) || 'ANONYME'
    // Sauvegarde localStorage (backup offline) + Supabase (global)
    addToLB(res.diff, nm, res.score)
    await saveFightClubScore(nm, res.score, res.diff)
    // Recharge le leaderboard depuis le serveur
    const serverData = await getFightClubLeaderboard(res.diff)
    const entries: LBEntry[] = serverData.length
      ? serverData.map(e => ({ name: e.pseudo, score: e.score }))
      : getLB(res.diff)
    setLbData(entries); setNameVal(''); setShowName(false); setShowLB(true)
  }

  // Précharge le LB existant dès l'affichage de l'écran de saisie du nom
  useEffect(() => {
    if (!showName || !gameResult.current) return
    getFightClubLeaderboard(gameResult.current.diff).then(data => {
      setExistingLB(data.map(e => ({ name: e.pseudo, score: e.score })))
    })
  }, [showName])

  useEffect(() => {
    discoverEgg('fightclub')
    if (!containerRef.current) return
    // Steal focus from any page element (e.g. forum input) so game keys don't go there
    const prevFocused = document.activeElement as HTMLElement | null
    if (prevFocused && prevFocused !== document.body && !(prevFocused instanceof HTMLCanvasElement)) {
      prevFocused.blur()
    }
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
      // Remappable key bindings — stored as ev.code (physical key, layout-independent)
      // codeLabel maps physical ev.code → AZERTY display label
      const codeLabel: Record<string, string> = {
        KeyQ:'A', KeyW:'Z', KeyE:'E', KeyR:'R', KeyT:'T', KeyY:'Y', KeyU:'U', KeyI:'I', KeyO:'O', KeyP:'P',
        KeyA:'Q', KeyS:'S', KeyD:'D', KeyF:'F', KeyG:'G', KeyH:'H', KeyJ:'J', KeyK:'K', KeyL:'L',
        KeyZ:'W', KeyX:'X', KeyC:'C', KeyV:'V', KeyB:'B', KeyN:'N', KeyM:'M',
        Space:'ESPACE', ArrowLeft:'←', ArrowRight:'→', ArrowUp:'↑', ArrowDown:'↓', Enter:'ENTRÉE',
      }
      // v3: keys stored as ev.code strings (e.g. 'KeyA', 'Space') — layout-independent
      const defaultKeys = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', punch: 'KeyQ', kick: 'KeyE', throw: 'KeyZ', block: 'KeyB', jump: 'Space', rage: 'KeyC' }
      const savedKeys = (() => {
        try {
          const s = JSON.parse(localStorage.getItem('fc_keys_v3') ?? 'null')
          if (!s) return null
          // Validate: values must be ev.code format (length >= 3, e.g. 'KeyA')
          const vals = Object.values(s) as string[]
          if (vals.some(v => typeof v !== 'string' || v.length < 3)) return null
          return s
        } catch { return null }
      })()
      const KEYS = Object.assign({}, defaultKeys, savedKeys ?? {})
      // kd() converts ev.code to AZERTY display label
      const kd = (code: string) => codeLabel[code] ?? code
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentMusic: any = null

      function playSfx(type: 'punch' | 'kick' | 'hurt_player' | 'hurt_enemy' | 'weapon_hit' | 'marla' | 'gun_cock' | 'gun_bang') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          const vol = VOL.sfx / 100
          if (type === 'punch') {
            osc.type = 'square'; osc.frequency.setValueAtTime(180, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08)
            gain.gain.setValueAtTime(0.25 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
            osc.start(); osc.stop(ctx.currentTime + 0.09)
          } else if (type === 'kick') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12)
            gain.gain.setValueAtTime(0.30 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
            osc.start(); osc.stop(ctx.currentTime + 0.12)
          } else if (type === 'hurt_player') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15)
            gain.gain.setValueAtTime(0.35 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
            osc.start(); osc.stop(ctx.currentTime + 0.15)
          } else if (type === 'hurt_enemy') {
            osc.type = 'square'; osc.frequency.setValueAtTime(260, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.07)
            gain.gain.setValueAtTime(0.18 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
            osc.start(); osc.stop(ctx.currentTime + 0.07)
          } else if (type === 'weapon_hit') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.10)
            gain.gain.setValueAtTime(0.28 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10)
            osc.start(); osc.stop(ctx.currentTime + 0.10)
          } else if (type === 'marla') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(660, ctx.currentTime)
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.05)
            gain.gain.setValueAtTime(0.22 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
            osc.start(); osc.stop(ctx.currentTime + 0.6)
          } else if (type === 'gun_cock') {
            // Cliquetis mécanique du pistolet
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(900, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04)
            gain.gain.setValueAtTime(0.40 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
            osc.start(); osc.stop(ctx.currentTime + 0.05)
          } else if (type === 'gun_bang') {
            // Coup de feu — double oscillateur : corps grave + crack aigu
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(140, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(16, ctx.currentTime + 0.40)
            gain.gain.setValueAtTime(1.0 * vol, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
            osc.start(); osc.stop(ctx.currentTime + 0.45)
            // Crack aigu superposé
            const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain()
            osc2.connect(gain2); gain2.connect(ctx.destination)
            osc2.type = 'square'; osc2.frequency.setValueAtTime(1800, ctx.currentTime)
            osc2.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.06)
            gain2.gain.setValueAtTime(0.55 * vol, ctx.currentTime)
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
            osc2.start(); osc2.stop(ctx.currentTime + 0.08)
          }
        } catch (_) {}
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type G = any
      const r  = (g: G, c: number, x: number, y: number, w: number, h: number) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h) }
      const ra = (g: G, c: number, a: number, x: number, y: number, w: number, h: number) => { g.fillStyle(c, a); g.fillRect(x, y, w, h) }

      type CharState  = 'idle' | 'walk' | 'jump' | 'punch' | 'kick' | 'hurt' | 'dead' | 'taunt' | 'block'
      type CharType   = 'norton' | 'grunt' | 'bob' | 'toughguy' | 'tyler'
      type WeaponType = 'bat' | 'chain' | 'bottle' | 'gun'
      type BossPtrnState = 'approach' | 'wind' | 'attack' | 'recover' | 'vulnerable' | 'invincible'

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

      // Marla Singer — fidèle au film : robe sombre, fourrure, cigarette, teint pâle, cheveux courts/ébouriffés
      function drawMarla(g: G, state: CharState, frame: number) {
        g.clear()
        const MW = 26, MH = 52, MHW = 13
        const bob = state === 'walk' ? Math.sin(frame * 0.38) * 1.5 : 0
        const oy  = bob
        const l1  = state === 'walk' ? Math.sin(frame * 0.38) * 3.5 : 0
        const l2  = state === 'walk' ? -l1 : 0
        // Jambes — bas sombres / bottines
        r(g, 0x111113, -MHW + 4, -20 + l1, 8, 22)
        r(g, 0x111113, -MHW + 14, -20 + l2, 8, 22)
        // Bottines légèrement plus claires
        r(g, 0x1c1418, -MHW + 4, -4 + l1, 8, 6)
        r(g, 0x1c1418, -MHW + 14, -4 + l2, 8, 6)
        // Ourlet de robe (légèrement évasé)
        r(g, 0x1a0e18, -MHW + 1, -MH + 30 + oy, MW - 2, 12)
        // Corps — robe ajustée sombre
        r(g, 0x1c1020, -MHW + 3, -MH + 10 + oy, MW - 6, 22)
        // Étole en fourrure autour des épaules (teinte gris-brun)
        r(g, 0x4a4438, -MHW - 2, -MH + 9 + oy, MW + 4, 7)
        ra(g, 0x7a7060, 0.65, -MHW, -MH + 8 + oy, MW, 5)
        ra(g, 0x9a9080, 0.30, -MHW + 2, -MH + 7 + oy, MW - 4, 3)
        // Bras (couverts par la fourrure/manches)
        r(g, 0x1c1020, -MHW - 2, -MH + 14 + oy, 6, 15)
        r(g, 0x1c1020, MHW - 4, -MH + 14 + oy, 6, 15)
        // Cigarette dans la main droite
        r(g, 0xeeeebb, MHW + 3, -MH + 22 + oy, 14, 2)
        ra(g, 0xff8800, 0.95, MHW + 17, -MH + 23 + oy, 4, 2)
        for (let i = 0; i < 4; i++) {
          const sx = MHW + 17 + Math.sin(frame * 0.09 + i * 1.6) * 3
          ra(g, 0xcccccc, 0.08 + i * 0.04, sx, -MH + 18 + oy - i * 5, 3 + i * 2, 3 + i * 2)
        }
        // Visage — teint pâle
        r(g, 0xcdc4b8, -MHW + 5, -MH + oy, 16, 13)
        // Cheveux sombres courts, style années 90 (Helena Bonham Carter)
        r(g, 0x1e1420, -MHW + 3, -MH - 8 + oy, 20, 11)  // masse principale
        r(g, 0x1e1420, -MHW + 2, -MH + oy, 5, 9)         // côté gauche (hauteur menton)
        r(g, 0x1e1420, MHW - 7, -MH + oy, 5, 7)          // côté droit
        r(g, 0x241828, -MHW + 8, -MH - 11 + oy, 10, 5)   // volume du dessus
        ra(g, 0x1a1020, 0.7, -MHW + 6, -MH - 5 + oy, 14, 4) // frange effilée
        // Yeux sombres — maquillage subtil (pas de clown)
        r(g, 0x111111, -MHW + 7, -MH + 5 + oy, 4, 2)
        r(g, 0x111111, -MHW + 15, -MH + 5 + oy, 4, 2)
        ra(g, 0x111111, 0.55, -MHW + 6, -MH + 4 + oy, 5, 2)  // ombre légère
        ra(g, 0x111111, 0.55, -MHW + 14, -MH + 4 + oy, 5, 2)
        // Lèvres — rose pâle naturel (pas rouge vif)
        ra(g, 0xc09090, 0.55, -MHW + 8, -MH + 10 + oy, 10, 2)
        if (state === 'hurt') ra(g, 0xffffff, 0.28, -MHW, -MH, MW, MH)
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
        } else if (type === 'bottle') {
          r(g, 0x224411, -6, -14, 12, 14)
          r(g, 0x2a5518, -4, -20, 8, 8)
          r(g, 0x33661e, -2, -26, 4, 8)
          ra(g, 0x88ff44, 0.15, -5, -13, 10, 12)
        } else {  // gun
          r(g, 0x222222, -16, -6, 32, 8)    // barrel
          r(g, 0x333333, -4, -12, 12, 18)   // grip
          r(g, 0x444444, 8, -6, 10, 4)      // slide
          r(g, 0x111111, -2, 2, 8, 8)       // trigger guard
        }
      }

      // Draw weapon held by player (in hand, facing right; mirrored by gfx scale)
      function drawHeldWeapon(g: G, type: WeaponType, state: CharState) {
        g.clear()
        const swing = ['punch', 'kick'].includes(state) ? 18 : 0  // increased for visible weapon swing
        if (type === 'gun') {
          // Gun pointed forward (or upward in taunt = at mouth)
          const isFinale = state === 'taunt'
          if (isFinale) {
            r(g, 0x222222, -4, -PH - swing, 8, 26)   // barrel pointing up
            r(g, 0x333333, -6, -PH + 14 - swing, 12, 14)
          } else {
            r(g, 0x222222, 6, -40 - swing, 28, 8)
            r(g, 0x333333, 6, -48 - swing, 12, 14)
            r(g, 0x444444, 18, -40 - swing, 10, 4)
          }
          return
        }
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

      // Draw gun pickup glow
      function drawGunPickup(g: G, frame: number) {
        g.clear()
        const pulse = 0.6 + Math.sin(frame * 0.08) * 0.4
        ra(g, 0xffcc00, pulse * 0.4, -22, -18, 44, 28)
        r(g, 0x222222, -16, -6, 32, 8)
        r(g, 0x333333, -4, -12, 12, 18)
        r(g, 0x444444, 8, -6, 10, 4)
        r(g, 0x111111, -2, 2, 8, 8)
      }

      function drawSecretDoor(g: G, frame: number) {
        g.clear()
        const pulse = 0.6 + Math.sin(frame * 0.05) * 0.4
        ra(g, 0xcc1111, pulse * 0.3, -14, -44, 28, 44)   // glow
        r(g, 0x4a1a1a, -12, -42, 24, 42)   // door frame
        r(g, 0xcc2222, -10, -40, 20, 38)   // door panel
        r(g, 0x8b0000, -10, -40, 9, 38)    // left half
        r(g, 0x991111, 1, -40, 9, 38)      // right half
        r(g, 0xffcc00, 7, -28, 3, 3)       // doorknob
        // "?" label
        g.fillStyle(0xffcc00, pulse)
        g.fillRect(-3, -36, 6, 10)
        g.fillRect(-3, -22, 6, 4)
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
        preload() { this.load.audio('theme', '/sons/where-is-my-mind.opus') }
        create() {
          // Menu music — restart if stopped (e.g. coming back from game over)
          try {
            if (!currentMusic || !currentMusic.isPlaying) {
              if (currentMusic) { try { currentMusic.destroy() } catch(_) {} }
              const m = this.sound.add('theme', { loop: true, volume: VOL.music / 100 })
              currentMusic = m; m.play()
            }
          } catch(_) {}
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

          // ── Mobile D-pad menu navigation ──────────────────────
          let menuSel = 0
          const menuActions = [
            () => this.scene.start('Difficulty'),
            () => this.scene.start('Options'),
            () => onDone(),
          ]
          const menuYs = [192, 249, 306]
          const menuCursor = this.add.graphics()
          const drawMenuCursor = (idx: number) => {
            menuCursor.clear()
            menuCursor.lineStyle(2, 0xcc1111, 0.9)
            menuCursor.strokeRect(GW / 2 - 116, menuYs[idx] - 24, 232, 48)
          }
          drawMenuCursor(0)
          const onMenuNav = (e: Event) => {
            const dir = (e as CustomEvent).detail
            if (dir === 'up')        { menuSel = (menuSel - 1 + 3) % 3; drawMenuCursor(menuSel) }
            else if (dir === 'down') { menuSel = (menuSel + 1) % 3;     drawMenuCursor(menuSel) }
            else if (dir === 'confirm') menuActions[menuSel]()
          }
          window.addEventListener('fc:menu-nav', onMenuNav)
          this.events.on('shutdown', () => window.removeEventListener('fc:menu-nav', onMenuNav))

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

          // ── Mobile D-pad difficulty navigation ───────────────
          const diffKeys2: Diff[] = ['facile', 'normal', 'jack']
          const diffXs = [150, 400, 650]
          let diffSel = 1  // démarre sur NORMAL
          const diffCursor = this.add.graphics()
          const drawDiffCursor = (idx: number) => {
            diffCursor.clear()
            diffCursor.lineStyle(2, 0xcc1111, 0.9)
            if (idx < 3) {
              diffCursor.strokeRect(diffXs[idx] - 126, 112, 252, 256)
            } else {
              // Back button
              diffCursor.strokeRect(17, GH - 44, 110, 32)
            }
          }
          drawDiffCursor(1)
          const onDiffNav = (e: Event) => {
            const dir = (e as CustomEvent).detail
            if (dir === 'left' || dir === 'up')   diffSel = (diffSel - 1 + 4) % 4
            else if (dir === 'right' || dir === 'down') diffSel = (diffSel + 1) % 4
            else if (dir === 'confirm') {
              if (diffSel < 3) this.scene.start('Game', { diff: diffKeys2[diffSel] })
              else this.scene.start('Menu')
              return
            }
            drawDiffCursor(diffSel)
          }
          window.addEventListener('fc:menu-nav', onDiffNav)
          this.events.on('shutdown', () => window.removeEventListener('fc:menu-nav', onDiffNav))
        }
      }

      // ══════════════════════════════════════════════════════
      // OPTIONS SCENE  — volume + key remapping
      // ══════════════════════════════════════════════════════
      class OptionsScene extends Phaser.Scene {
        constructor() { super({ key: 'Options' }) }
        create() {
          const bg = this.add.graphics()
          drawSceneBg(bg)
          bg.fillStyle(0x000000, 0.55); bg.fillRect(GW / 2 - 270, 40, 540, 370)
          bg.lineStyle(1, 0x884422, 0.35); bg.strokeRect(GW / 2 - 271, 39, 542, 372)

          this.add.text(GW / 2, 72, 'OPTIONS', {
            fontFamily: 'Impact', fontSize: '32px', color: '#cc8833', letterSpacing: 8,
            stroke: '#000000', strokeThickness: 4,
          }).setOrigin(0.5, 0.5)

          // ── Volume bars ──────────────────────────────────────
          const barG = this.add.graphics()
          const drawBars = () => {
            barG.clear()
            barG.fillStyle(0x111111, 1); barG.fillRect(GW / 2 - 140, 108, 280, 12)
            barG.fillStyle(0xcc6633, 1); barG.fillRect(GW / 2 - 140, 108, 280 * VOL.music / 100, 12)
            barG.lineStyle(1, 0x884422, 0.5); barG.strokeRect(GW / 2 - 140, 108, 280, 12)
            barG.fillStyle(0x111111, 1); barG.fillRect(GW / 2 - 140, 148, 280, 12)
            barG.fillStyle(0x336699, 1); barG.fillRect(GW / 2 - 140, 148, 280 * VOL.sfx / 100, 12)
            barG.lineStyle(1, 0x225577, 0.5); barG.strokeRect(GW / 2 - 140, 148, 280, 12)
          }
          drawBars()

          this.add.text(GW / 2 - 140, 93, 'MUSIQUE', { fontFamily: 'monospace', fontSize: '10px', color: '#cc8833', letterSpacing: 3 })
          this.add.text(GW / 2 - 140, 133, 'EFFETS SONORES', { fontFamily: 'monospace', fontSize: '10px', color: '#6699cc', letterSpacing: 3 })

          const mvT  = this.add.text(GW / 2 + 148, 114, `${VOL.music}%`, { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' }).setOrigin(0, 0.5)
          const sfxT = this.add.text(GW / 2 + 148, 154, `${VOL.sfx}%`,   { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' }).setOrigin(0, 0.5)

          const adj = (key: 'music' | 'sfx', delta: number, lbl: any) => {
            VOL[key] = Math.max(0, Math.min(100, VOL[key] + delta))
            lbl.setText(`${VOL[key]}%`); drawBars()
            if (key === 'music') {
              const vol = VOL.music / 100
              // Itère sur tous les sons actifs pour trouver et mettre à jour la musique
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sounds = (this.sound as any).sounds as any[]
                sounds.forEach((s: any) => {
                  if (s && s.key === 'theme' && !s.destroyed) { try { s.setVolume(vol) } catch (_) {} }
                })
              } catch (_) {}
              // Fallback sur la référence directe
              if (currentMusic) { try { currentMusic.setVolume(vol) } catch (_) {} }
            }
          }
          makeBtn(this, GW / 2 - 175, 114, 32, '−', () => adj('music', -5, mvT),  0xcc6633)
          makeBtn(this, GW / 2 + 140, 114, 32, '+', () => adj('music',  5, mvT),  0xcc6633)
          makeBtn(this, GW / 2 - 175, 154, 32, '−', () => adj('sfx',  -5, sfxT), 0x336699)
          makeBtn(this, GW / 2 + 140, 154, 32, '+', () => adj('sfx',    5, sfxT), 0x336699)

          // ── Separator ────────────────────────────────────────
          bg.lineStyle(1, 0x553322, 0.4); bg.lineBetween(GW / 2 - 240, 178, GW / 2 + 240, 178)
          this.add.text(GW / 2, 190, 'CONTRÔLES — cliquez une touche pour la rebind', {
            fontFamily: 'monospace', fontSize: '10px', color: '#886644', letterSpacing: 2,
          }).setOrigin(0.5, 0.5)

          // ── Key bindings grid ────────────────────────────────
          type KeyId = keyof typeof defaultKeys
          const actions: Array<{ id: KeyId; label: string; col: 0 | 1; row: number }> = [
            { id: 'left',  label: 'Aller à gauche', col: 0, row: 0 },
            { id: 'right', label: 'Aller à droite', col: 0, row: 1 },
            { id: 'up',    label: 'Aller en haut',  col: 0, row: 2 },
            { id: 'down',  label: 'Aller en bas',   col: 0, row: 3 },
            { id: 'jump',  label: 'Sauter',          col: 0, row: 4 },
            { id: 'punch', label: 'Poing',           col: 1, row: 0 },
            { id: 'kick',  label: 'Kick',            col: 1, row: 1 },
            { id: 'throw', label: 'Lancer arme',     col: 1, row: 2 },
            { id: 'block', label: 'Garde',           col: 1, row: 3 },
            { id: 'rage',  label: 'Rage',            col: 1, row: 4 },
          ]
          const colX = [GW / 2 - 220, GW / 2 + 30]
          const rowY0 = 218; const rowH = 28

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const keyBtns: Record<string, any> = {}
          let waitingFor: string | null = null

          const refreshBtns = () => {
            for (const [id, btn] of Object.entries(keyBtns)) {
              const isWaiting = id === waitingFor
              btn.setText(isWaiting ? ' ? ' : ` ${kd(KEYS[id as KeyId])} `)
              btn.setColor(isWaiting ? '#ffcc44' : '#ffffff')
              btn.setBackgroundColor(isWaiting ? '#662200' : '#1a1a1a')
            }
          }

          for (const { id, label, col, row } of actions) {
            const x = colX[col], y = rowY0 + row * rowH
            this.add.text(x, y, label, {
              fontFamily: 'monospace', fontSize: '11px', color: '#888888',
            }).setOrigin(0, 0.5)

            const btn = this.add.text(x + 130, y, ` ${kd(KEYS[id])} `, {
              fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
              backgroundColor: '#1a1a1a', padding: { x: 6, y: 3 },
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })

            btn.on('pointerover', () => { if (waitingFor !== id) btn.setColor('#ffdd88') })
            btn.on('pointerout',  () => { if (waitingFor !== id) btn.setColor('#ffffff') })
            btn.on('pointerdown', () => { waitingFor = id; refreshBtns() })
            keyBtns[id] = btn
          }

          // Capture keypress for remapping — ev.code = physical key position, layout-independent
          const nativeKeyCapture = (e: KeyboardEvent) => {
            if (!waitingFor) return
            e.preventDefault(); e.stopPropagation()
            if (e.code === 'Escape') { waitingFor = null; refreshBtns(); return }
            KEYS[waitingFor as KeyId] = e.code
            try { localStorage.setItem('fc_keys_v3', JSON.stringify(KEYS)) } catch (_) {}
            waitingFor = null; refreshBtns()
          }
          window.addEventListener('keydown', nativeKeyCapture)
          this.events.on('shutdown', () => window.removeEventListener('keydown', nativeKeyCapture))

          this.add.text(GW / 2, rowY0 + 5 * rowH + 6, '← flèches toujours disponibles en parallèle', {
            fontFamily: 'monospace', fontSize: '9px', color: '#444444', align: 'center',
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
        projectiles: Array<{ gfx: G; x: number; y: number; vx: number; dmg: number; face: 1|-1 }> = []

        secretDoor: { x: number; y: number; gfx: G } | null = null
        secretDoorUsed = false
        secretDoorPromptShown = false
        secretDoorRefused = false
        healItems: { gfx: G; x: number; y: number }[] = []
        bobTributeDone = false
        bobCorpses: Array<{ gfx: any; x: number; floorY: number; face: number }> = []
        victoryTitle: any = null
        victoryStats: any = null

        bobTributeActive = false
        bobTributeTimer = 0
        pendingBobTribute = false   // Bob mort, attend que tous les autres ennemis meurent
        tributeEnemy: Char | null = null
        tributeBobX = 0
        tributeBobY = 0
        tributeTextObj: G = null

        // Marla arrival pause
        marlaPauseActive = false
        marlaPauseTimer = 0
        marlaText: G = null

        // Gun pickup animation (boss phase 2)
        gunPickupAnim = false
        gunPickupAnimTimer = 0
        gunReadyToFire = false
        gunReadyText: G = null

        // Tyler boss pattern system
        bossPtrnState: BossPtrnState = 'approach'
        bossPtrnIdx = 0       // 0=combo, 1=charge, 2=grab
        bossPtrnTimer = 0
        bossPtrnsDone = 0
        bossVulnerable = false
        bossInvincible = false
        bossPhase2 = false    // at 10% HP — gun phase
        bossCinematic = false
        bossCinemaTimer = 0

        // Endless mode
        endlessMode = false
        endlessWave = 0
        endlessHpMult = 1.0
        endlessTriggerX = 0
        endlessNextX = 999999

        gameKeys: Record<string, boolean> = {}
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
          this.droppedWeapons = []; this.heldWeapon = null; this.projectiles = []
          this.bossPtrnState = 'approach'; this.bossPtrnIdx = 0
          this.bossPtrnTimer = 0; this.bossPtrnsDone = 0
          this.bossVulnerable = false; this.bossInvincible = false
          this.bossPhase2 = false; this.bossCinematic = false; this.bossCinemaTimer = 0
          this.endlessMode = false; this.endlessWave = 0; this.endlessHpMult = 1.0
          this.endlessTriggerX = 0; this.endlessNextX = 999999
          this.secretDoor = null; this.secretDoorUsed = false; this.secretDoorKeyWasDown = false; this.secretDoorRefused = false; this.secretDoorPromptShown = false
          this.bobTributeActive = false; this.bobTributeTimer = 0; this.pendingBobTribute = false
          this.tributeEnemy = null; this.tributeBobX = 0; this.tributeBobY = 0; this.tributeTextObj = null
          this.marlaPauseActive = false; this.marlaPauseTimer = 0; this.marlaText = null
          this.gunPickupAnim = false; this.gunPickupAnimTimer = 0; this.gunReadyToFire = false; this.gunReadyText = null
          this.bobCorpses = []

          // Place secret door at a random world X between zone 1 and second-to-last zone
          const minDoorZone = 1
          const maxDoorZone = Math.max(1, this.waveZones.length - 2)
          const doorZoneIdx = minDoorZone + Math.floor(Math.random() * (maxDoorZone - minDoorZone + 1))
          const doorX = this.waveZones[doorZoneIdx].triggerX + 200 + Math.random() * 300
          const doorGfx = this.add.graphics().setDepth(6)
          this.secretDoor = { x: doorX, y: FY1, gfx: doorGfx }

          // Expose door confirm/cancel to React
          confirmDoorRef.current = () => {
            ;(window as any).__fcMobileKeys = {}
            setShowDoorPrompt(false)
            this.secretDoorUsed = true
            this.secretDoorPromptShown = false
            this.music?.stop()
            this.scene.start('Cinematic')
          }
          cancelDoorRef.current = () => {
            ;(window as any).__fcMobileKeys = {}
            setShowDoorPrompt(false)
            this.secretDoorPromptShown = false
            this.secretDoorRefused = true
          }

          // Expose endless start to React
          startEndlessRef.current = () => {
            this.endlessMode = true
            this.victory = false
            this.waveCleared = true
            this.isBossFight = false
            this.bossHpGfx.setVisible(false)
            this.currentZoneIdx = this.waveZones.length  // past all zones
            // Remove scroll limit — player can go anywhere (world grows dynamically)
            this.maxPlayerWorldX = Number.MAX_SAFE_INTEGER
            // Set endless trigger position — first wave spawns when player walks past boss zone
            this.endlessTriggerX = this.waveZones[this.waveZones.length - 1]?.triggerX ?? 400
            this.endlessNextX = this.endlessTriggerX + 400  // player needs to reach here for first endless wave
            // Reset boss state — crucial pour éviter le bug pistolet en mode infini
            this.bossPhase2 = false
            this.bossInvincible = false
            this.bossVulnerable = false
            this.bossCinematic = false
            this.bossCinemaTimer = 0
            this.heldWeapon = null   // retire le pistolet
            this.weaponGfx.clear()
            this.gunPickupAnim = false; this.gunPickupAnimTimer = 0; this.gunReadyToFire = false
            if (this.gunReadyText)  { try { this.gunReadyText.destroy()  } catch (_) {} this.gunReadyText  = null }
            if (this.victoryTitle)  { try { this.victoryTitle.destroy()  } catch (_) {} this.victoryTitle  = null }
            if (this.victoryStats)  { try { this.victoryStats.destroy()  } catch (_) {} this.victoryStats  = null }
            // Réinitialiser l'état du joueur
            this.player.state = 'idle'; this.player.stateTimer = 0
            if (this.music && !this.music.isPlaying) try { this.music.play() } catch (_) {}
          }

          // Native window keyboard listeners — ev.code is physical position, truly layout-independent
          this.gameKeys = {}
          const prevKeys: Record<string, boolean> = {}
          const onKeyDown = (e: KeyboardEvent) => {
            this.gameKeys[e.code] = true
            if (!prevKeys[e.code]) {
              if (e.code === KEYS.punch)       { if (!this.bossCinematic && !this.gunPickupAnim) this.playerAttack('punch') }
              else if (e.code === KEYS.kick)   { if (!this.bossCinematic && !this.gunPickupAnim) this.playerAttack('kick') }
              else if (e.code === KEYS.throw)  this.throwWeapon()
              else if (e.code === KEYS.jump)   this.playerJump()
              else if (e.code === KEYS.rage)   this.activateRage()
              else if (e.code === 'Escape')    { this.music?.stop(); this.scene.start('Menu') }
            }
            prevKeys[e.code] = true
          }
          const onKeyUp = (e: KeyboardEvent) => { this.gameKeys[e.code] = false; prevKeys[e.code] = false }
          // Mobile virtual controls — one-shot actions dispatched via custom event
          const onMobileAction = (e: Event) => {
            const action = (e as CustomEvent).detail?.action
            if (!action || this.gameOver || this.victory || this.bossCinematic || this.gunPickupAnim) return
            if (action === 'punch') this.playerAttack('punch')
            else if (action === 'kick') this.playerAttack('kick')
            else if (action === 'jump') this.playerJump()
            else if (action === 'throw') this.throwWeapon()
          }
          window.addEventListener('keydown', onKeyDown)
          window.addEventListener('keyup', onKeyUp)
          window.addEventListener('fc:action', onMobileAction)
          // Init mobile keys store
          ;(window as any).__fcMobileKeys = {}
          // Signal React to show mobile controls
          setMobileCtrlsOn(true)
          this.events.on('shutdown', () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
            window.removeEventListener('fc:action', onMobileAction)
            ;(window as any).__fcMobileKeys = {}
            setMobileCtrlsOn(false)
          })

          this.createHUD()

          // Continue menu music seamlessly, or start fresh
          try {
            if (currentMusic && currentMusic.isPlaying) {
              this.music = currentMusic  // reuse menu music
            } else {
              if (currentMusic) { try { currentMusic.destroy() } catch(_) {} }
              this.music = this.sound.add('theme', { loop: true, volume: VOL.music / 100 })
              currentMusic = this.music
              this.music.play()
            }
          } catch (_) {}

          this.scheduleFlicker()
          this.showTutorial()
        }

        // ── UPDATE ───────────────────────────────────────────
        update() {
          this.frame++
          if (this.gameOver) { this.tickGameOver(); return }
          if (this.victory)  return

          if (!this.bobTributeActive && !this.gunPickupAnim) this.handleInput()
          this.tickChar(this.player)
          if (this.bobTributeActive || this.gunPickupAnim) { this.player.vx = 0; this.player.vy = 0 }

          // ── Animation ramassage pistolet (boss phase 2) ──────
          if (this.gunPickupAnim) {
            this.gunPickupAnimTimer++
            const p = this.player
            // Maintenir le joueur en état taunt (pistolet levé vers la bouche) chaque frame
            p.state = 'taunt'; p.stateTimer = 0; p.vx = 0; p.vy = 0
            // Légères secousses de caméra qui s'intensifient — tension
            if (this.gunPickupAnimTimer === 20) this.cameras.main.shake(120, 0.003)
            if (this.gunPickupAnimTimer === 45) this.cameras.main.shake(180, 0.005)
            // Frame 75 : animation terminée — afficher "Tirer ?"
            if (this.gunPickupAnimTimer === 75) {
              this.gunPickupAnim = false
              this.gunReadyToFire = true
              if (this.gunReadyText) { try { this.gunReadyText.destroy() } catch (_) {} }
              this.gunReadyText = this.add.text(
                GW / 2, PLAY_H / 2 + 10,
                `Tirer ?  [ ${kd(KEYS.punch)} ]`,
                { fontFamily: 'Impact', fontSize: '30px', color: '#cc1111',
                  stroke: '#000000', strokeThickness: 5 }
              ).setOrigin(0.5, 0.5).setDepth(510)
              this.tweens.add({
                targets: this.gunReadyText,
                alpha: { from: 1, to: 0.25 },
                duration: 420, yoyo: true, repeat: -1,
              })
            }
          }

          // Constrain player to camera left edge and maxPlayerWorldX
          const camLeft = this.cameraX + 36
          if (this.isBossFight) {
            this.player.x = Math.max(camLeft, this.player.x)  // only constrain left during boss fight
          } else {
            this.player.x = Math.max(camLeft, Math.min(this.maxPlayerWorldX, this.player.x))
          }

          // In endless mode, grow the world as the player advances so scroll never stops
          if (this.endlessMode) {
            this.worldWidth = Math.max(this.worldWidth, this.player.x + 4000)
          }

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
                // Pistolet du boss phase 2 → animation de mise en bouche
                if (w.type === 'gun' && this.bossPhase2) {
                  this.gunPickupAnim = true
                  this.gunPickupAnimTimer = 0
                  this.gunReadyToFire = false
                  this.player.state = 'taunt'; this.player.stateTimer = 0
                  this.player.vx = 0; this.player.vy = 0
                } else {
                  const label = w.type === 'bat' ? 'BATTE' : w.type === 'chain' ? 'CHAÎNE' : w.type === 'gun' ? 'PISTOLET' : 'BOUTEILLE'
                  const labelCol = w.type === 'gun' ? '#ffdd44' : '#ffaa00'
                  this.spawnFloatText(this.player.x - this.cameraX, this.player.floorY - 80, `⚔ ${label} RAMASSÉ(E)`, labelCol, false)
                }
                break
              }
            }
          }

          // ── Heal item pickup ──────────────────────────────
          for (let i = this.healItems.length - 1; i >= 0; i--) {
            const h = this.healItems[i]
            if (Math.abs(h.x - this.player.x) < 30 && Math.abs(h.y - this.player.floorY) < 28) {
              const heal = 25
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal)
              h.gfx.destroy(); this.healItems.splice(i, 1)
              this.spawnFloatText(this.player.x - this.cameraX, this.player.floorY - 80, `+${heal} HP`, '#44ff88', true)
              break
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

          // Boss cinematic tick — Norton met le pistolet dans la bouche
          if (this.bossCinematic) {
            this.bossCinemaTimer++
            const p = this.player
            const tyler = this.enemies.find(e => e.charType === 'tyler')

            // Maintenir le joueur en état taunt avec le pistolet levé vers la bouche
            p.state = 'taunt'; p.stateTimer = 0; p.vx = 0

            // Phase 1 (0-55): tension progressive — petites secousses
            if (this.bossCinemaTimer < 55) {
              if (this.bossCinemaTimer % 22 === 0) {
                this.cameras.main.shake(30, 0.002)
              }
            }
            // Frame 10 : texte d'intro cinématique
            if (this.bossCinemaTimer === 10) {
              this.spawnFloatText(GW / 2, PLAY_H / 2 - 50, 'Tu avais raison, Tyler...', '#cccccc', false)
            }
            // Frame 50 : son du chien armé (CLIC)
            if (this.bossCinemaTimer === 50) {
              playSfx('gun_cock')
              this.spawnFloatText(GW / 2, PLAY_H / 2 - 30, 'CLIC', '#888888', false)
            }
            // Frame 65 : BANG — coup de feu
            if (this.bossCinemaTimer === 65) {
              playSfx('gun_bang')
              this.cameras.main.flash(700, 255, 255, 255, false)
              this.cameras.main.shake(700, 0.035)
              // Sang qui jaillit de la bouche de Norton
              this.spawnBlood(p.x, p.floorY - PH + 10, 25)
              this.spawnBlood(p.x + p.face * 12, p.floorY - PH + 6, 14)
              this.spawnBlood(p.x + p.face * 18, p.floorY - PH + 12, 8)
              this.spawnFloatText(p.x - this.cameraX, p.floorY - PH - 45, 'PAN!', '#cc0000', true)
            }
            // Frame 80 : giclée de sang du crâne de Tyler, puis il s'écrase au sol
            if (this.bossCinemaTimer === 80) {
              if (tyler) {
                // Sang spectaculaire jaillit du crâne AVANT qu'il tombe
                this.spawnBlood(tyler.x,      tyler.floorY - PH + 2,  40)
                this.spawnBlood(tyler.x + 12, tyler.floorY - PH,      25)
                this.spawnBlood(tyler.x - 8,  tyler.floorY - PH + 6,  20)
                this.spawnBlood(tyler.x + 4,  tyler.floorY - PH - 4,  15)
                this.cameras.main.shake(500, 0.025)
                // Tyler s'effondre après la giclée (léger délai visuel)
                this.time.delayedCall(80, () => {
                  tyler.hp = 0; tyler.state = 'dead'; tyler.deadTimer = 0
                })
              }
            }
            // Frame 110 : texte final
            if (this.bossCinemaTimer === 110) {
              this.spawnFloatText(GW / 2, PLAY_H / 2 - 20, 'NORTON...', '#ffffff', true)
            }
            // Frame 380 : fin de cinématique — nettoyer le pistolet et déclencher victoire
            if (this.bossCinemaTimer === 380) {
              this.bossCinematic = false
              this.heldWeapon = null     // enlève le pistolet pour ne pas bloquer le mode infini
              this.weaponGfx.clear()
              this.triggerVictory()
            }
          }

          // Bob tribute timer — 6 secondes exactes (360 frames)
          if (this.bobTributeActive) {
            this.bobTributeTimer++
            const te = this.tributeEnemy

            // Phase 1 (0-110): l'ennemi marche vers le corps de Bob
            if (this.bobTributeTimer <= 110 && te && te.hp > 0) {
              const dx = this.tributeBobX - te.x
              te.stateTimer = 0
              if (Math.abs(dx) > 16) {
                te.vx = (dx > 0 ? 1 : -1) * 1.8
                te.face = dx > 0 ? 1 : -1
                te.state = 'walk'
              } else {
                te.vx = 0; te.stateTimer = 0; te.state = 'taunt'
                te.face = te.x > this.tributeBobX ? -1 : 1
              }
            }

            // Phase 2 (111-340): penché sur le corps, pleure
            if (this.bobTributeTimer > 110 && this.bobTributeTimer <= 340 && te && te.hp > 0) {
              te.vx = 0; te.stateTimer = 0; te.state = 'taunt'
              te.face = te.x > this.tributeBobX ? -1 : 1
              // Larmes — petits points bleus qui remontent
              if (this.bobTributeTimer % 14 === 0) {
                this.spawnFloatText(
                  te.x - this.cameraX + (te.face > 0 ? 5 : -5),
                  te.floorY - PH - 4,
                  '·', '#99bbff', false
                )
              }
            }

            // Frame 130: "Il s'appelait Robert Paulson !" — texte grand, centré (5 sec)
            if (this.bobTributeTimer === 130) {
              if (this.tributeTextObj) { try { this.tributeTextObj.destroy() } catch (_) {} }
              this.tributeTextObj = this.add.text(
                GW / 2, PLAY_H / 2 - 30,
                '"Il s\'appelait Robert Paulson !"',
                { fontFamily: 'Impact', fontSize: '28px', color: '#ffee44',
                  stroke: '#000000', strokeThickness: 5, align: 'center' }
              ).setOrigin(0.5, 0.5).setDepth(610)
              this.cameras.main.shake(600, 0.018)
              this.cameras.main.flash(180, 255, 230, 80, false)
            }

            // Frame 430: supprimer le texte (5 sec après frame 130)
            if (this.bobTributeTimer === 430) {
              if (this.tributeTextObj) { try { this.tributeTextObj.destroy() } catch (_) {} this.tributeTextObj = null }
            }

            // Frame 500: fin — l'ennemi tribute attaque, joueur libéré
            if (this.bobTributeTimer >= 500) {
              this.bobTributeActive = false; this.bobTributeTimer = 0
              if (this.tributeTextObj) { try { this.tributeTextObj.destroy() } catch (_) {} this.tributeTextObj = null }
              // Libérer tous les ennemis gelés
              for (const e of this.enemies) {
                if (e.hp > 0) { e.atkCD = 0; e.state = 'idle' }
              }
              // L'ennemi tribute fonce sur le joueur — enragé
              if (te && te.hp > 0) {
                te.speed = Math.min(te.speed * 2.0, 5.5)
                te.atkCD = 0; te.state = 'idle'
              }
              this.tributeEnemy = null
            }
          }
          // Marla arrival pause
          if (this.marlaPauseActive) {
            this.marlaPauseTimer++
            if (this.marlaPauseTimer >= 120) { this.marlaPauseActive = false }
          }

          for (const e of this.enemies) {
            if (e.hp > 0) {
              if (e.stunned) {
                if (e.stunTimer > 0) { e.stunTimer--; if (e.stunTimer === 0) e.stunned = false }
              } else if (e.charType === 'tyler' && this.isBossFight) {
                if (!this.bossCinematic) this.tickTylerAI(e)
              } else if (!this.bobTributeActive && !this.marlaPauseActive) {
                this.tickAI(e)
              }
              this.tickChar(e)
              e.x = Math.max(20, Math.min(this.worldWidth - 20, e.x))
            } else {
              e.deadTimer++
            }
          }

          this.tickProjectiles()

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
          if (allDead && !this.waveCleared && !this.bossCinematic) {
            // Tribute Bob — uniquement la première fois
            if (this.pendingBobTribute && !this.bobTributeActive && !this.bobTributeDone) {
              this.pendingBobTribute = false
              this.bobTributeDone = true
              this.triggerBobTribute(this.tributeBobX, this.tributeBobY)
              return
            }
            this.pendingBobTribute = false  // reset même si tribute déjà fait
            this.waveCleared = true
            if (this.isBossFight && !this.endlessMode) {
              // handled by cinematic / triggerVictory inside boss AI
            } else if (this.endlessMode) {
              // Endless wave cleared — unlock scroll, player walks right to trigger next wave
              this.endlessNextX = this.player.x + 400
              this.maxPlayerWorldX = Number.MAX_SAFE_INTEGER
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

          // Endless mode: trigger new wave when player walks far enough right
          if (this.endlessMode && this.waveCleared && !this.gameOver && !this.victory) {
            if (this.player.x >= this.endlessNextX) {
              this.endlessWave++
              this.endlessHpMult = 1 + this.endlessWave * 0.25
              const bonus = 200 + this.endlessWave * 100
              this.score += bonus
              this.spawnFloatText(GW / 2, PLAY_H / 2 - 10, `VAGUE INFINIE ${this.endlessWave}  +${bonus}`, '#ff4444', true)
              this.spawnEndlessWave()
              // Next wave triggers 600px further right
              this.endlessNextX = this.player.x + 600
            }
          }

          if (this.player.hp <= 0 && !this.gameOver) this.triggerGameOver()

          // Secret door proximity prompt
          if (this.secretDoor && !this.secretDoorUsed) {
            const dist = Math.abs(this.player.x - this.secretDoor.x)
            const close = dist < 80 && Math.abs(this.player.floorY - this.secretDoor.y) < 80
            if (close && !this.secretDoorPromptShown && !this.secretDoorRefused) {
              this.secretDoorPromptShown = true
              ;(window as any).__fcMobileKeys = {}
              setShowDoorPrompt(true)
            } else if (!close && this.secretDoorPromptShown) {
              this.secretDoorPromptShown = false
              setShowDoorPrompt(false)
            } else if (!close) {
              this.secretDoorRefused = false
            }
          }

          this.tickBlood()
          this.tickFloats()
          this.renderAll()
          this.updateHUD()
        }

        // ── INPUT ────────────────────────────────────────────
        handleInput() {
          const p = this.player
          if (p.hp <= 0 || this.bossCinematic) return
          const mob = (window as any).__fcMobileKeys ?? {}
          const bDown    = this.gameKeys[KEYS.block] || !!mob['block']
          const canBlock = !['punch', 'kick', 'hurt', 'jump', 'dead'].includes(p.state) || p.isBlocking

          if (bDown && canBlock) {
            if (!p.isBlocking) { p.isBlocking = true; p.blockFrame = this.frame }
            p.state = 'block'; p.stateTimer = 0
            p.vx *= 0.35; p.vy *= 0.35
            return
          }
          if (!bDown && p.isBlocking) {
            p.isBlocking = false
            if (p.state === 'block') p.state = 'idle'
          }

          const canMove = !['punch', 'kick'].includes(p.state)
          const left  = this.gameKeys[KEYS.left]  || this.gameKeys['ArrowLeft']  || !!mob['left']
          const right = this.gameKeys[KEYS.right] || this.gameKeys['ArrowRight'] || !!mob['right']
          const up    = this.gameKeys[KEYS.up]    || this.gameKeys['ArrowUp']    || !!mob['up']
          const down  = this.gameKeys[KEYS.down]  || this.gameKeys['ArrowDown']  || !!mob['down']
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

        // ── THROW WEAPON ─────────────────────────────────────
        throwWeapon() {
          if (!this.heldWeapon || this.heldWeapon.type === 'gun') return
          const p = this.player
          if (p.hp <= 0 || p.isBlocking) return
          const wep = this.heldWeapon
          const dmgMap: Record<string, number> = { bat: 30, chain: 22, bottle: 40 }
          const pg = this.add.graphics().setDepth(300)
          this.projectiles.push({ gfx: pg, x: p.x, y: p.floorY - PH * 0.6, vx: p.face * 14, dmg: dmgMap[wep.type] ?? 25, face: p.face })
          this.heldWeapon = null
          this.weaponGfx.clear()
          this.spawnFloatText(p.x - this.cameraX, p.floorY - 80, 'LANCÉ !', '#ffaa00', false)
        }

        // ── ATTACKS ──────────────────────────────────────────
        playerAttack(type: 'punch' | 'kick') {
          const p = this.player
          if (this.bossCinematic || this.gunPickupAnim) return
          // Pistolet boss : déclencher la cinématique seulement quand gunReadyToFire
          if (this.heldWeapon?.type === 'gun' && this.bossPhase2 && this.bossInvincible) {
            if (!this.gunReadyToFire) return  // anim en cours, pas encore prêt
            const tyler = this.enemies.find(e => e.charType === 'tyler')
            if (tyler) {
              this.gunReadyToFire = false
              if (this.gunReadyText) { try { this.gunReadyText.destroy() } catch (_) {} this.gunReadyText = null }
              this.bossCinematic = true; this.bossCinemaTimer = 0
              p.state = 'taunt'; p.face = tyler.x > p.x ? 1 : -1
              p.vx = 0; p.vy = 0
            }
            return
          }
          if (p.hp <= 0 || p.atkCD > 0 || p.isBlocking || ['punch', 'kick'].includes(p.state)) return
          p.state = type; p.stateTimer = type === 'punch' ? 18 : 24
          p.atkCD = type === 'punch' ? 14 : 22

          // Weapon overrides base damage and range
          let base:  number
          let range: number
          let isWep = false
          if (this.heldWeapon) {
            const wep = this.heldWeapon
            base  = wep.type === 'bat' ? 55 : wep.type === 'chain' ? 42 : 68
            range = wep.type === 'bat' ? 140 : wep.type === 'chain' ? 195 : 115
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

            // Tyler invincible unless vulnerable
            if (e.charType === 'tyler' && this.bossInvincible && !this.bossVulnerable) continue
            const mult = this.rageActive ? 2.0 : 1.0
            const dmg  = Math.round(base * mult * this.scoreMult)
            e.hp = Math.max(0, e.hp - dmg)
            e.vx = p.face * (type === 'punch' ? 3 : 6)
            e.hurtInv = 16; e.state = 'hurt'; e.stateTimer = 12
            hit = true
            playSfx(isWep ? 'weapon_hit' : type === 'kick' ? 'kick' : 'punch')

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

            // Boss phase 2 check — triggered AS SOON as HP drops to ≤10%
            if (e.charType === 'tyler' && !this.bossPhase2 && e.hp <= e.maxHp * 0.10) {
              this.triggerBossPhase2(e)
              break
            }

            if (e.hp <= 0) {
              e.state = 'dead'; e.deadTimer = 0
              this.score += 50 + this.combo * 8
              this.spawnBlood(e.x, e.floorY - PH / 2, 10)
              this.cameras.main.shake(140, 0.007)
              // Bob mort : créer un corpse gfx dédié (indépendant du loop enemies)
              if (e.charType === 'bob') {
                const cg = this.add.graphics().setDepth(9 + e.floorY)
                this.bobCorpses.push({ gfx: cg, x: e.x, floorY: e.floorY, face: e.face })
                e.gfx.clear(); e.deadTimer = 9999  // cacher l'enemy gfx immédiatement
                this.pendingBobTribute = true
                this.tributeBobX = e.x
                this.tributeBobY = e.floorY
              }
              // Weapon drop — 14% chance, not from Tyler
              if (e.charType !== 'tyler' && Math.random() < 0.14) {
                this.dropWeapon(e.x, e.floorY)
              }
              // Heal drop in endless mode — 3% chance
              if (this.endlessMode && e.charType !== 'tyler' && Math.random() < 0.03) {
                this.dropHealItem(e.x, e.floorY)
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

        // Drop a heal item at world position
        dropHealItem(x: number, y: number) {
          const gfx = this.add.graphics().setDepth(5)
          this.healItems.push({ gfx, x, y })
        }

        // Drop a random weapon at world position
        dropWeapon(x: number, y: number, forced?: WeaponType) {
          const types: WeaponType[] = ['bat', 'chain', 'bottle']
          const usesMap: Record<string, number> = { bat: 4, chain: 3, bottle: 2, gun: 1 }
          const type = forced ?? types[Math.floor(Math.random() * types.length)]
          const gfx = this.add.graphics().setDepth(5)
          this.droppedWeapons.push({ gfx, x, y, type, maxUses: usesMap[type] ?? 1 })
        }

        // Tick thrown projectiles
        tickProjectiles() {
          const cam = this.cameraX
          for (const proj of this.projectiles) {
            proj.x += proj.vx
            const sx = proj.x - cam
            proj.gfx.clear()
            if (sx < -80 || sx > GW + 80) { proj.gfx.destroy(); continue }
            // Draw as spinning object
            const angle = this.frame * 0.35 * proj.face
            proj.gfx.fillStyle(0x886633, 1)
            proj.gfx.fillRect(sx - 14, proj.y - 3, 28, 6)
            proj.gfx.fillStyle(0xccaa44, 0.7)
            proj.gfx.fillRect(sx - 14 + Math.cos(angle) * 10, proj.y + Math.sin(angle) * 4, 10, 4)

            // Hit check
            for (const e of this.enemies) {
              if (e.hp <= 0 || e.hurtInv > 0) continue
              const dist = Math.abs(e.x - proj.x)
              if (dist < 40 && Math.abs(e.floorY - proj.y) < 50) {
                e.hp = Math.max(0, e.hp - proj.dmg)
                e.hurtInv = 14; e.state = 'hurt'; e.stateTimer = 12
                e.vx = proj.face * 4
                this.spawnFloatText(e.x - cam, e.floorY - PH - 10, `-${proj.dmg}`, '#ffcc00', true)
                this.spawnBlood(e.x, e.floorY - PH / 2, 4)
                if (e.hp <= 0) {
                  e.state = 'dead'; e.deadTimer = 0
                  if (e.charType === 'bob') {
                    const cg = this.add.graphics().setDepth(9 + e.floorY)
                    this.bobCorpses.push({ gfx: cg, x: e.x, floorY: e.floorY, face: e.face })
                    e.gfx.clear(); e.deadTimer = 9999
                  }
                }
                proj.gfx.destroy()
                this.projectiles = this.projectiles.filter(p => p !== proj)
                break
              }
            }
          }
          this.projectiles = this.projectiles.filter(p => {
            const sx = p.x - this.cameraX
            if (sx < -80 || sx > GW + 80) { p.gfx.destroy(); return false }
            return true
          })
        }

        // ── TYLER BOSS PATTERN AI ────────────────────────────
        tickTylerAI(tyler: Char) {
          const p = this.player
          const dx = p.x - tyler.x
          tyler.face = dx > 0 ? 1 : -1

          // Phase 2: gun dropped, Tyler is invincible — just idle
          if (this.bossPhase2) {
            tyler.state = 'idle'; tyler.vx *= 0.9; tyler.vy *= 0.9
            return
          }

          // Check 10% HP threshold (safety net — primary check is in playerAttack)
          if (!this.bossPhase2 && tyler.hp <= tyler.maxHp * 0.10) {
            this.triggerBossPhase2(tyler); return
          }

          // Stunned (by perfect block) = vulnerable
          if (tyler.stunned) {
            this.bossVulnerable = true
            return
          }
          if (!tyler.stunned && this.bossVulnerable && tyler.hurtInv === 0 && this.bossPtrnState !== 'vulnerable') {
            this.bossVulnerable = false
          }

          this.bossPtrnTimer++

          switch (this.bossPtrnState) {
            case 'approach': {
              // Walk toward player, decide next pattern
              if (Math.abs(dx) > 200) {
                tyler.vx = (dx / Math.abs(dx)) * 2.2
                tyler.state = 'walk'
              } else {
                tyler.vx *= 0.8
                if (this.bossPtrnTimer > 60) {
                  this.bossPtrnTimer = 0
                  this.bossPtrnState = 'wind'
                }
              }
              break
            }
            case 'wind': {
              // Telegraphing: back up slightly and pause
              tyler.vx = -tyler.face * 1.5
              tyler.state = 'idle'
              if (this.bossPtrnTimer > 55) {
                this.bossPtrnTimer = 0
                this.bossPtrnState = 'attack'
              }
              break
            }
            case 'attack': {
              const ptn = this.bossPtrnIdx % 3
              if (ptn === 0) {
                // Pattern 1 — Combo: 3 rapid punches
                if (this.bossPtrnTimer % 18 === 0 && this.bossPtrnTimer <= 54) {
                  tyler.state = 'punch'; tyler.stateTimer = 14
                  tyler.atkCD = 10
                  if (p.hp > 0 && p.hurtInv === 0 && Math.abs(p.x - tyler.x) < 100 && Math.abs(p.floorY - tyler.floorY) < 52) {
                    this.dealBossHit(tyler, p, 'punch')
                  }
                }
                if (this.bossPtrnTimer > 65) {
                  this.bossPtrnTimer = 0; this.bossPtrnState = 'recover'
                }
              } else if (ptn === 1) {
                // Pattern 2 — Charge kick: rush + powerful kick
                if (this.bossPtrnTimer < 30) {
                  tyler.vx = tyler.face * 5.5
                  tyler.state = 'walk'
                } else if (this.bossPtrnTimer === 30) {
                  tyler.state = 'kick'; tyler.stateTimer = 24; tyler.atkCD = 20
                  if (p.hp > 0 && p.hurtInv === 0 && Math.abs(p.x - tyler.x) < 120 && Math.abs(p.floorY - tyler.floorY) < 52) {
                    this.dealBossHit(tyler, p, 'kick')
                  }
                }
                if (this.bossPtrnTimer > 60) {
                  this.bossPtrnTimer = 0; this.bossPtrnState = 'recover'
                }
              } else {
                // Pattern 3 — Grab: slow approach, unavoidable grab
                if (this.bossPtrnTimer < 70) {
                  tyler.vx = tyler.face * 1.2
                  tyler.state = 'walk'
                } else if (this.bossPtrnTimer === 70) {
                  tyler.state = 'punch'; tyler.stateTimer = 30; tyler.atkCD = 20
                  if (p.hp > 0 && p.hurtInv === 0 && Math.abs(p.x - tyler.x) < 80 && Math.abs(p.floorY - tyler.floorY) < 40) {
                    this.dealBossHit(tyler, p, 'grab')
                  }
                }
                if (this.bossPtrnTimer > 90) {
                  this.bossPtrnTimer = 0; this.bossPtrnState = 'recover'
                }
              }
              break
            }
            case 'recover': {
              tyler.vx *= 0.85; tyler.state = 'idle'
              if (this.bossPtrnTimer > 45) {
                this.bossPtrnsDone++
                this.bossPtrnIdx++
                this.bossPtrnTimer = 0
                if (this.bossPtrnsDone >= 3) {
                  // After 3 patterns → vulnerable window
                  this.bossPtrnsDone = 0
                  this.bossPtrnState = 'vulnerable'
                  this.bossVulnerable = true
                  tyler.stunned = true; tyler.stunTimer = 150
                  this.cameras.main.flash(200, 255, 200, 0, false)
                  this.spawnFloatText(tyler.x - this.cameraX, tyler.floorY - PH - 30, 'FRAPPEZ !', '#ffdd00', true)
                } else {
                  this.bossPtrnState = 'approach'
                }
              }
              break
            }
            case 'vulnerable': {
              tyler.vx *= 0.8; tyler.state = 'idle'
              if (this.bossPtrnTimer > 150) {
                this.bossVulnerable = false
                tyler.stunned = false
                this.bossPtrnTimer = 0
                this.bossPtrnState = 'approach'
                this.spawnFloatText(GW / 2, PLAY_H / 2, 'TYLER REPREND LE DESSUS...', '#cc1111', false)
              }
              break
            }
            case 'invincible': break
          }

          // Enforce invincibility — Tyler can never die outside a vulnerable window
          if (!this.bossVulnerable) {
            const floor = this.bossPhase2
              ? Math.round(tyler.maxHp * 0.10)   // post-phase2: lock at 10%
              : Math.round(tyler.maxHp * 0.11)   // pre-phase2: keep above trigger threshold
            tyler.hp = Math.max(floor, tyler.hp)
          }
        }

        // Deal boss hit to player (respects block)
        dealBossHit(tyler: Char, p: Char, hitType: 'punch' | 'kick' | 'grab') {
          const cfg  = DIFFS[this.diff]
          const base = hitType === 'grab' ? 35 : hitType === 'kick' ? 28 : 20
          const rawDmg = Math.round(base * cfg.dmgM)

          if (p.isBlocking && hitType !== 'grab') {
            // Perfect block check (< 1s = 60 frames since block started)
            const isPerfect = (this.frame - p.blockFrame) < 65
            p.hp = Math.max(0, p.hp - Math.round(rawDmg * 0.2))
            p.hurtInv = 8
            if (isPerfect) {
              tyler.stunned = true; tyler.stunTimer = 140
              this.bossVulnerable = true
              tyler.state = 'idle'; tyler.vx = 0
              this.bossPtrnState = 'vulnerable'; this.bossPtrnTimer = 0
              this.cameras.main.flash(150, 0, 100, 255, false)
              this.spawnFloatText(tyler.x - this.cameraX, tyler.floorY - PH - 26, 'PERFECT BLOCK → STUNNÉ !', '#44ddff', true)
            } else {
              this.spawnFloatText(p.x - this.cameraX, p.floorY - PH - 16, 'BLOQUÉ', '#8888ff', false)
            }
          } else {
            p.hp = Math.max(0, p.hp - rawDmg)
            p.vx = tyler.face * (hitType === 'kick' ? 6 : 3)
            p.hurtInv = 25; p.state = 'hurt'; p.stateTimer = 16
            this.rage = Math.min(100, this.rage + 15)
            this.cameras.main.shake(110, 0.005)
            playSfx('hurt_player')
          }
        }

        // ── BOSS PHASE 2 TRIGGER ────────────────────────────
        triggerBossPhase2(tyler: Char) {
          if (this.bossPhase2) return   // guard against double-trigger
          this.bossPhase2 = true
          this.bossInvincible = true
          this.bossVulnerable = false
          tyler.hp = Math.round(tyler.maxHp * 0.10)
          tyler.stunned = false; tyler.stunTimer = 0
          tyler.state = 'taunt'; tyler.vx = 0; tyler.vy = 0
          this.bossPtrnState = 'invincible'
          this.cameras.main.shake(300, 0.014)
          this.cameras.main.flash(200, 255, 50, 0, false)
          this.time.delayedCall(700, () => {
            const tx = tyler.x + tyler.face * 60
            this.dropWeapon(tx, tyler.floorY, 'gun')
            this.cameras.main.shake(400, 0.018)
            this.spawnFloatText(GW / 2, PLAY_H / 2 - 44,
              '"Si tu tires sur moi... tu te tires dessus."', '#cc1111', true)
            this.spawnFloatText(GW / 2, PLAY_H / 2 + 12,
              `[Ramasse le pistolet → ${kd(KEYS.punch)} pour finir]`, '#ffcc44', false)
          })
        }

        // ── BOB DEATH TRIBUTE ────────────────────────────────
        triggerBobTribute(bobX: number, bobY: number) {
          if (this.bobTributeActive) return  // déjà actif
          this.bobTributeActive = true
          this.bobTributeTimer = 0
          this.tributeBobX = bobX
          this.tributeBobY = bobY

          // Freeze joueur immédiatement
          this.player.vx = 0; this.player.vy = 0

          // Freeze tous les ennemis vivants
          for (const e of this.enemies) {
            if (e.hp > 0) { e.atkCD = 9999; e.vx = 0; e.vy = 0; e.state = 'idle'; e.stateTimer = 0 }
          }

          // Spawner un NOUVEL ennemi — le "frère de Fight Club" qui vient rendre hommage
          const spawnX = bobX + 280 + Math.random() * 80
          const spawnY = bobY
          const gfx = this.add.graphics().setDepth(10 + spawnY)
          const cfg = DIFFS[this.diff]
          const hp = Math.round(70 * cfg.hpM)
          const tributeChar: Char = {
            gfx, x: spawnX, floorY: spawnY,
            jumpH: 0, jumpV: 0, vx: 0, vy: 0,
            hp, maxHp: hp, face: -1,
            state: 'walk', stateTimer: 0,
            atkCD: 9999, hurtInv: 0,
            speed: 2.0,
            dmg: Math.round(14 * cfg.dmgM),
            isPlayer: false, charType: 'toughguy',
            wave: this.wave, deadTimer: 0,
            isBlocking: false, blockFrame: 0,
            stunned: false, stunTimer: 0,
          }
          this.enemies.push(tributeChar)
          this.tributeEnemy = tributeChar

          // Freeze bref de l'écran
          this.cameras.main.flash(300, 8, 8, 8, false)
          this.cameras.main.shake(120, 0.005)
        }

        // ── ENDLESS WAVES ────────────────────────────────────
        spawnEndlessWave() {
          this.waveCleared = false
          for (const e of this.enemies) e.gfx.destroy()
          this.enemies = []
          for (const w of this.droppedWeapons) w.gfx.destroy()
          this.droppedWeapons = []
          for (const h of this.healItems) h.gfx.destroy()
          this.healItems = []

          // Max 4 enemies at once; difficulty increases via hp/dmg mults
          const count = Math.min(4, 1 + Math.floor(this.endlessWave * 0.5))
          const comps = this.getWaveComp(count)
          let i = 0
          for (const [type, c] of comps) {
            for (let j = 0; j < c; j++) {
              const ex = this.player.x + 300 + i * 120 + Math.random() * 80
              const ey = FY1 + 18 + Math.random() * (FY2 - FY1 - 25)
              const gfx = this.add.graphics().setDepth(10 + ey)
              const hpBase = ({ grunt: 42, bob: 100, toughguy: 80, tyler: 240 } as Record<string, number>)[type] ?? 50
              const hp = Math.round(hpBase * this.endlessHpMult)
              const spdBase = ({ grunt: 1.6, bob: 1.2, toughguy: 1.4, tyler: 2.0 } as Record<string, number>)[type] ?? 1.6
              const dmgBase = ({ grunt: 8, bob: 13, toughguy: 12, tyler: 20 } as Record<string, number>)[type] ?? 8
              this.enemies.push({
                gfx, x: ex, floorY: ey,
                jumpH: 0, jumpV: 0, vx: 0, vy: 0,
                hp, maxHp: hp, face: -1,
                state: 'idle', stateTimer: 0, atkCD: 0, hurtInv: 0,
                speed: Math.min(5.5, spdBase + this.endlessWave * 0.14),
                dmg: Math.round(dmgBase * this.endlessHpMult),
                isPlayer: false, charType: type as CharType, wave: this.endlessWave, deadTimer: 0,
                isBlocking: false, blockFrame: 0, stunned: false, stunTimer: 0,
              })
              i++
            }
          }
          this.maxPlayerWorldX = this.player.x + 600  // lock player during combat
          this.showWaveAnnounce(this.endlessWave)
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

          if (dist < hitRange && Math.abs(dy) < 52 && this.player.jumpH < 20) {
            const useKick = (e.charType === 'tyler' || e.charType === 'toughguy') && Math.random() < 0.3
            e.state = useKick ? 'kick' : 'punch'
            e.stateTimer = useKick ? 22 : 18
            // Difficulty-adjusted attack cooldown
            const diffSlowdown = this.diff === 'facile' ? 2.2 : this.diff === 'normal' ? 1.9 : 1.3
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
                playSfx('hurt_player')
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
            // Boss fight: allow player to reach Tyler and the gun
            this.maxPlayerWorldX = this.worldWidth - 40
            // Tyler is invincible from the start — only vulnerable during special windows
            this.bossInvincible = true
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
            if (m.x >= targetWorldX) {
              m.phase = 1; m.timer = 0
              playSfx('marla')
              // Pause ennemis 2 secondes
              this.marlaPauseActive = true; this.marlaPauseTimer = 0
              for (const e of this.enemies) { if (e.hp > 0) { e.vx = 0; e.vy = 0 } }
              // Texte "Marla ?!" persistant au-dessus du joueur
              if (this.marlaText) { try { this.marlaText.destroy() } catch (_) {} }
              this.marlaText = this.add.text(
                this.player.x - this.cameraX, this.player.floorY - 118,
                'Marla ?!',
                { fontFamily: 'monospace', fontSize: '22px', color: '#ff99cc',
                  stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' }
              ).setOrigin(0.5, 0.5).setDepth(460)
            }
          } else if (m.phase === 1) {
            if (m.timer === 50)
              this.spawnFloatText(m.x - this.cameraX, m.floorY - 88, '"Voilà une cigarette."', '#ff99cc', true)
            if (m.timer === 120) {
              this.player.hp = this.player.maxHp
              this.spawnFloatText(this.player.x - this.cameraX, this.player.floorY - 100, '♥ HP RESTAURÉ', '#ff4488', true)
              this.cameras.main.flash(280, 255, 80, 180, false)
            }
            if (m.timer > 200) {
              // Destroy persistent Marla text
              if (this.marlaText) { try { this.marlaText.destroy() } catch (_) {} this.marlaText = null }
              m.phase = 2; m.timer = 0
            }
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

          // Render secret door
          if (this.secretDoor && !this.secretDoorUsed) {
            const sx = this.secretDoor.x - cam
            if (sx > -60 && sx < GW + 60) {
              this.secretDoor.gfx.setPosition(sx, this.secretDoor.y)
              drawSecretDoor(this.secretDoor.gfx, this.frame)
            } else {
              this.secretDoor.gfx.clear()
            }
          }

          // Render weapons on ground
          for (const w of this.droppedWeapons) {
            const sx = w.x - cam
            if (sx < -60 || sx > GW + 60) { w.gfx.clear(); continue }
            const bob = Math.sin(this.frame * 0.06) * 2
            w.gfx.setPosition(sx, w.y - 8 + bob)
            if (w.type === 'gun') drawGunPickup(w.gfx, this.frame)
            else drawWeaponGround(w.gfx, w.type)
          }

          // Render heal items (green cross, floating)
          for (const h of this.healItems) {
            const sx = h.x - cam
            if (sx < -60 || sx > GW + 60) { h.gfx.clear(); continue }
            const bob = Math.sin(this.frame * 0.08) * 2
            h.gfx.clear()
            h.gfx.setPosition(sx, h.y - 14 + bob)
            h.gfx.fillStyle(0x00cc55, 0.9)
            h.gfx.fillRect(-3, -7, 6, 14)
            h.gfx.fillRect(-7, -3, 14, 6)
            h.gfx.fillStyle(0x00ff66, 0.15)
            h.gfx.fillCircle(0, 0, 11)
          }

          const p = this.player
          const showP = p.hurtInv === 0 || Math.floor(p.hurtInv / 3) % 2 === 0
          if (showP) {
            const ds = this.depthScale(p.floorY) * 1.72
            p.gfx.setPosition(p.x - cam, p.floorY - p.jumpH)
            p.gfx.setScale(p.face * ds, ds)
            // When holding a weapon, don't show the bare fist punch — weapon handles the swing
            const bodyState = (this.heldWeapon && (p.state === 'punch' || p.state === 'kick')) ? 'idle' : p.state
            drawNorton(p.gfx, bodyState, this.frame)
            // Draw held weapon on player
            if (this.heldWeapon && p.state !== 'dead') {
              this.weaponGfx.setPosition(p.x - cam, p.floorY - p.jumpH)
              this.weaponGfx.setScale(p.face * ds, ds)
              this.weaponGfx.setDepth(p.gfx.depth + 1)
              drawHeldWeapon(this.weaponGfx, this.heldWeapon.type, p.state)
            } else {
              this.weaponGfx.clear()
            }
          } else { p.gfx.clear(); this.weaponGfx.clear() }

          // Bob corpses — gfx dédié, indépendant du loop enemies, toujours visible
          for (const c of this.bobCorpses) {
            const sx = c.x - cam
            if (sx < -90 || sx > GW + 90) { c.gfx.clear(); continue }
            const ds = this.depthScale(c.floorY) * 1.72 * 1.28
            c.gfx.setPosition(sx, c.floorY)
            c.gfx.setScale(c.face * ds, ds)
            drawBob(c.gfx, 'dead', 0)
          }

          for (const e of this.enemies) {
            const sx = e.x - cam
            if (e.deadTimer > 55) { e.gfx.clear(); continue }
            if (sx < -90 || sx > GW + 90) { e.gfx.clear(); continue }
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

          // ── Cinématique pistolet : flash canon + sang bouche ──
          if (this.bossCinematic) {
            const p = this.player
            const psx = p.x - cam
            const mouthY = p.floorY - PH + 8   // hauteur bouche du joueur
            // Flash de bouche de canon (frames 63-72)
            if (this.bossCinemaTimer >= 63 && this.bossCinemaTimer <= 72) {
              const age = this.bossCinemaTimer - 63
              const intensity = Math.max(0, 1 - age / 9)
              // Lueur jaune-blanc au bout du pistolet (vers la bouche)
              this.overlayGfx.fillStyle(0xffffff, intensity * 0.9)
              this.overlayGfx.fillCircle(psx, mouthY - 4, 18 * intensity)
              this.overlayGfx.fillStyle(0xffdd44, intensity * 0.7)
              this.overlayGfx.fillCircle(psx, mouthY - 4, 28 * intensity)
              this.overlayGfx.fillStyle(0xff8800, intensity * 0.4)
              this.overlayGfx.fillCircle(psx, mouthY - 4, 38 * intensity)
            }
            // Sang qui coule de la bouche (frames 65 → fin cinématique)
            if (this.bossCinemaTimer >= 65) {
              const elapsed = this.bossCinemaTimer - 65
              // Filet de sang qui descend progressivement
              const drip1 = Math.min(elapsed * 1.2, 28)
              const drip2 = Math.min(Math.max(0, (elapsed - 8) * 1.0), 22)
              const drip3 = Math.min(Math.max(0, (elapsed - 16) * 0.8), 18)
              this.overlayGfx.fillStyle(0xcc0000, 0.92)
              this.overlayGfx.fillRect(psx - 2, mouthY, 4, drip1)        // filet central
              this.overlayGfx.fillStyle(0xaa0000, 0.80)
              this.overlayGfx.fillRect(psx - 5, mouthY + 4, 3, drip2)   // filet gauche
              this.overlayGfx.fillRect(psx + 3, mouthY + 2, 3, drip3)   // filet droit
              // Goutte qui tombe au bout
              if (drip1 >= 20) {
                const dropY = mouthY + drip1 + Math.sin(elapsed * 0.3) * 3
                this.overlayGfx.fillStyle(0xcc0000, 0.85)
                this.overlayGfx.fillCircle(psx - 1, dropY, 3)
              }
            }
          }
          for (const e of this.enemies) {
            if (e.hp <= 0) continue
            const sx = e.x - cam
            if (sx < -60 || sx > GW + 60) continue

            // Stun shimmer (cyan)
            if (e.stunned) {
              const pulse = 0.1 + Math.sin(this.frame * 0.22) * 0.06
              this.overlayGfx.fillStyle(0x44ffff, pulse)
              this.overlayGfx.fillCircle(sx, e.floorY - PH / 2, 30)
            }

            // Attack wind-up shimmer — yellow/orange flash when enemy is about to strike
            if (!e.stunned && (e.state === 'punch' || e.state === 'kick') && e.stateTimer > 5) {
              const shimA = 0.22 + Math.sin(this.frame * 0.9) * 0.14
              const sz = e.charType === 'bob' ? 1.28 : e.charType === 'toughguy' ? 1.18 : 1.0
              this.overlayGfx.fillStyle(0xffcc00, shimA)
              this.overlayGfx.fillRect(sx - 26 * sz, e.floorY - PH * 1.15 * sz, 52 * sz, PH * 1.15 * sz)
            }

            // Tyler boss wind-up telegraph (stronger, red) during 'wind' pattern phase
            if (e.charType === 'tyler' && this.bossPtrnState === 'wind') {
              const shimA = 0.25 + Math.sin(this.frame * 1.1) * 0.18
              this.overlayGfx.fillStyle(0xff3300, shimA)
              this.overlayGfx.fillRect(sx - 32, e.floorY - PH * 1.3, 64, PH * 1.3)
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

          // Permanent controls display (dynamic — reflects remapped keys)
          this.add.text(GW / 2, HY + 5,
            `${kd(KEYS.up)}${kd(KEYS.left)}${kd(KEYS.down)}${kd(KEYS.right)}/←↑↓→ Déplacer  ·  ${kd(KEYS.punch)} Poing  ·  ${kd(KEYS.kick)} Kick  ·  ${kd(KEYS.throw)} Lancer  ·  ${kd(KEYS.block)} Garde  ·  ${kd(KEYS.jump)} Saut  ·  ${kd(KEYS.rage)} Rage`, {
            fontFamily: 'monospace', fontSize: '9.5px', color: 'rgba(220,220,220,0.55)', align: 'center',
          }).setOrigin(0.5, 0).setDepth(D)
          // Block reminder
          this.add.text(GW / 2, HY + 52,
            `${kd(KEYS.block)}  ─  GARDE (parfait < 1s avant le coup = STUN ennemi)`, {
            fontFamily: 'monospace', fontSize: '8px', color: 'rgba(100,120,200,0.60)', align: 'center',
          }).setOrigin(0.5, 0.5).setDepth(D)
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
            this.blockLabel.setText('[B] GARDE ACTIVE — 80% réduc. dommages').setAlpha(pulse).setColor('#88aaff')
          } else {
            this.blockLabel.setText('[B] GARDE').setAlpha(0.3).setColor('#555588')
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

        // ── MINI TUTORIAL ─────────────────────────────────────
        showTutorial() {
          const panW = 560, panH = 164, panX = GW / 2 - panW / 2, panY = PLAY_H / 2 - panH / 2 - 20
          const panel = this.add.graphics().setDepth(700)
          panel.fillStyle(0x000000, 0.88); panel.fillRect(panX, panY, panW, panH)
          panel.lineStyle(1, 0xcc9944, 0.5); panel.strokeRect(panX, panY, panW, panH)
          panel.lineStyle(1, 0xcc9944, 0.2); panel.strokeRect(panX + 4, panY + 4, panW - 8, panH - 8)

          const title = this.add.text(GW / 2, panY + 16, '— COMMENT JOUER —', {
            fontFamily: 'monospace', fontSize: '10px', color: '#cc9944', letterSpacing: 4,
          }).setOrigin(0.5, 0).setDepth(701)

          const lines = [
            `${kd(KEYS.up)} ${kd(KEYS.left)} ${kd(KEYS.down)} ${kd(KEYS.right)}  /  ←↑↓→   Déplacer        ${kd(KEYS.jump)}  Sauter        ${kd(KEYS.rage)}  Rage (jauge pleine)`,
            `${kd(KEYS.punch)}  Poing          ${kd(KEYS.kick)}  Kick          ${kd(KEYS.throw)}  Lancer l'arme tenue`,
            `${kd(KEYS.block)}  Garde  —  BLOQUER AU MOMENT du coup = STUN ennemi (surtout contre le boss !)`,
            `Les ennemis drop des armes · ramasse-les · elles ont une durée limitée`,
          ]
          const txt = this.add.text(GW / 2, panY + 36, lines.join('\n'), {
            fontFamily: 'monospace', fontSize: '11.5px', color: '#dddddd',
            align: 'center', lineSpacing: 8,
          }).setOrigin(0.5, 0).setDepth(701)

          const skip = this.add.text(GW / 2, panY + panH - 14, '[ appuie sur n\'importe quelle touche pour fermer · fermeture auto dans 14s ]', {
            fontFamily: 'monospace', fontSize: '8.5px', color: '#555555',
          }).setOrigin(0.5, 1).setDepth(701)

          // Bouton ✕ cliquable (desktop + mobile)
          const closeBtn = this.add.text(panX + panW - 10, panY + 10, '✕', {
            fontFamily: 'monospace', fontSize: '13px', color: '#886644',
          }).setOrigin(1, 0).setDepth(702).setInteractive({ useHandCursor: true })
          closeBtn.on('pointerover', () => closeBtn.setColor('#ffcc66'))
          closeBtn.on('pointerout',  () => closeBtn.setColor('#886644'))

          let closed = false
          const close = () => {
            if (closed) return; closed = true
            const objs = [panel, title, txt, skip, closeBtn]
            this.tweens.add({
              targets: objs, alpha: 0, duration: 350,
              onComplete: () => objs.forEach(o => o.destroy()),
            })
            // Show opening quote after tutorial closes
            this.time.delayedCall(200, () => this.showQuote('"La première règle du Fight Club..."'))
          }
          closeBtn.on('pointerdown', close)
          this.time.delayedCall(14000, close)
          this.input.keyboard!.once('keydown', close)
          this.input.once('pointerdown', close)  // clic n'importe où ferme le tuto
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
            this.victoryTitle = this.add.text(GW / 2, PLAY_H / 2 - 52, 'YOU ARE NOT YOUR JOB.', {
              fontFamily: 'Impact', fontSize: '46px', color: '#ffdd00', stroke: '#000000', strokeThickness: 6,
            }).setOrigin(0.5, 0.5).setDepth(750).setAlpha(0)
            this.tweens.add({ targets: this.victoryTitle, alpha: 1, duration: 1000 })
          })
          this.time.delayedCall(1800, () => {
            this.victoryStats = this.add.text(GW / 2, PLAY_H / 2 + 8,
              `Score : ${this.score}  |  Combo max : ${this.maxCombo}×`, {
              fontFamily: 'monospace', fontSize: '13px', color: '#888888',
            }).setOrigin(0.5, 0.5).setDepth(750)
          })
          this.time.delayedCall(3200, () => {
            // Show endless choice overlay
            setShowEndlessChoice(true)
          })
        }

        shutdown() { this.music?.stop(); currentMusic = null }
      }

      // ══════════════════════════════════════════════════════
      // CINEMATIC SCENE — secret door ending
      // ══════════════════════════════════════════════════════
      class CinematicScene extends Phaser.Scene {
        cinFrame = 0
        // collapseProgress 0→1 : immeuble intact→ détruit
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildings: Array<{ x: number; fullH: number; curH: number; w: number; col: number; collapseStart: number; collapsing: boolean; done: boolean }> = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; col: number; sz: number }> = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        overlayG!: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        textObjs: any[] = []

        constructor() { super({ key: 'Cinematic' }) }

        create() {
          this.cinFrame = 0
          this.buildings = []
          this.particles = []

          // 12 immeubles répartis — chacun s'effondre à un moment différent
          const positions = [25, 85, 148, 210, 270, 332, 395, 458, 518, 578, 635, 700]
          for (let i = 0; i < positions.length; i++) {
            const bx = positions[i] + Math.random() * 14
            const fullH = 95 + Math.random() * 130
            const bw = 34 + Math.random() * 34
            const cols = [0x1a1a22, 0x141420, 0x1e1e28, 0x18182a, 0x12121e]
            const col = cols[Math.floor(Math.random() * cols.length)]
            // Chaque bâtiment commence à s'effondrer à un frame différent
            const collapseStart = 50 + i * 30 + Math.floor(Math.random() * 22)
            this.buildings.push({ x: bx, fullH, curH: fullH, w: bw, col, collapseStart, collapsing: false, done: false })
          }

          this.overlayG = this.add.graphics().setDepth(10)

          // Textes
          this.time.delayedCall(600, () => {
            const t1 = this.add.text(GW / 2, PLAY_H / 2 - 80, 'LE PROJET CHAOS A RÉUSSI.', {
              fontFamily: 'Impact', fontSize: '32px', color: '#ffdd00',
              stroke: '#000000', strokeThickness: 5,
            }).setOrigin(0.5, 0.5).setDepth(20).setAlpha(0)
            this.tweens.add({ targets: t1, alpha: 1, duration: 800 })
            this.textObjs.push(t1)
          })
          this.time.delayedCall(3200, () => {
            const t2 = this.add.text(GW / 2, PLAY_H / 2 - 44,
              'Tu m\'entends maintenant ?', {
              fontFamily: 'serif', fontSize: '18px', color: '#cccccc',
              stroke: '#000000', strokeThickness: 3, fontStyle: 'italic',
            }).setOrigin(0.5, 0.5).setDepth(20).setAlpha(0)
            this.tweens.add({ targets: t2, alpha: 1, duration: 900 })
            this.textObjs.push(t2)
          })
          this.time.delayedCall(6500, () => {
            const tExit = this.add.text(GW / 2, PLAY_H - 52, '[ appuyez sur une touche pour continuer ]', {
              fontFamily: 'monospace', fontSize: '10px', color: '#555555',
            }).setOrigin(0.5, 1).setDepth(20)
            this.textObjs.push(tExit)
            this.input.keyboard!.once('keydown', () => { this.scene.start('Menu') })
            this.input.once('pointerdown', () => { this.scene.start('Menu') })
            makeBtn(this, GW / 2 - 130, PLAY_H - 30, 220, '🏠 MENU PRINCIPAL', () => this.scene.start('Menu'), 0x2a2a3a)
            makeBtn(this, GW / 2 + 130, PLAY_H - 30, 180, '✕ QUITTER', () => onDone(), 0x441111)
          })
        }

        spawnExplosion(x: number, y: number, count: number) {
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const spd = 1.5 + Math.random() * 5
            const flameCols = [0xff4400, 0xff8800, 0xffcc00, 0xff2200, 0xffaa00]
            const dustCols  = [0x888880, 0x666660, 0xaaaaaa, 0x999990]
            const isFlame = i < count * 0.6
            const col = isFlame
              ? flameCols[Math.floor(Math.random() * flameCols.length)]
              : dustCols[Math.floor(Math.random() * dustCols.length)]
            const life = isFlame ? 18 + Math.floor(Math.random() * 20) : 30 + Math.floor(Math.random() * 30)
            this.particles.push({
              x, y,
              vx: Math.cos(angle) * spd * (isFlame ? 1 : 0.55),
              vy: Math.sin(angle) * spd - (isFlame ? 2 : 0.5),
              life, maxLife: life,
              col, sz: isFlame ? 3 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 5),
            })
          }
        }

        update() {
          this.cinFrame++
          const g = this.overlayG
          g.clear()

          // Ciel nuit
          g.fillStyle(0x04040a, 1); g.fillRect(0, 0, GW, GH)

          // Lueur orangée au sol qui grossit avec les explosions
          const glowIntensity = Math.min(0.35, this.cinFrame * 0.0008)
          ra(g, 0xff4400, glowIntensity, 0, PLAY_H - 80, GW, 80)
          ra(g, 0xff8800, glowIntensity * 0.5, 0, PLAY_H - 140, GW, 60)

          // Étoiles
          for (let i = 0; i < 45; i++) {
            const sx = (i * 193 + 7) % GW
            const sy = (i * 97 + 13) % (PLAY_H * 0.5)
            const bright = 0.25 + Math.sin(this.cinFrame * 0.04 + i) * 0.18
            g.fillStyle(0xffffff, bright); g.fillRect(sx, sy, 1, 1)
          }

          // ── Immeubles — s'écroulent sur eux-mêmes ──
          for (const b of this.buildings) {
            if (!b.done && this.cinFrame >= b.collapseStart) {
              if (!b.collapsing) {
                // Début de l'effondrement : EXPLOSION au sommet
                b.collapsing = true
                this.spawnExplosion(b.x, PLAY_H - b.fullH, 28)
                // Flash bref
                this.cameras.main.flash(120, 255, 140, 40, false)
                this.cameras.main.shake(140, 0.010)
              }
              // L'immeuble s'écrase vers le bas — hauteur diminue rapidement
              const collapseSpeed = 1.8 + (b.fullH / 120)  // les grands s'écroulent plus vite
              b.curH = Math.max(0, b.curH - collapseSpeed)
              // Débris continus pendant la chute
              if (b.curH > 0 && Math.random() < 0.5) {
                this.spawnExplosion(
                  b.x + (Math.random() - 0.5) * b.w,
                  PLAY_H - b.curH,
                  6
                )
              }
              if (b.curH <= 0) { b.done = true }
            }

            const drawH = b.curH
            if (drawH > 0) {
              // Corps du bâtiment — tremble légèrement pendant l'effondrement
              const jx = b.collapsing ? (Math.random() - 0.5) * 3 : 0
              g.fillStyle(b.col, 1)
              g.fillRect(b.x - b.w / 2 + jx, PLAY_H - drawH, b.w, drawH)
              // Fenêtres qui s'éteignent au fur et à mesure
              const visiblePct = drawH / b.fullH
              for (let wy = 0; wy < 5; wy++) {
                for (let wx = 0; wx < 3; wx++) {
                  const winY = PLAY_H - drawH + 8 + wy * 14
                  if (winY < PLAY_H - 4) {
                    const lit = Math.sin(this.cinFrame * 0.06 + wy * 2.1 + wx * 1.3 + b.x) > 0.55
                    const alpha = lit ? Math.min(0.55, visiblePct * 0.8) : 0
                    if (alpha > 0) {
                      g.fillStyle(0xffeeaa, alpha)
                      g.fillRect(b.x - b.w / 2 + jx + 4 + wx * 9, winY, 5, 7)
                    }
                  }
                }
              }
            } else if (b.done) {
              // Tas de décombres (rectangle court et large)
              g.fillStyle(0x2a2020, 1)
              g.fillRect(b.x - b.w / 2 - 4, PLAY_H - 14, b.w + 8, 14)
              g.fillStyle(0x3a2820, 0.8)
              g.fillRect(b.x - b.w / 2 - 2, PLAY_H - 20, b.w + 4, 8)
            }
          }

          // ── Particules (flammes + poussière) ──
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i]
            pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.10; pt.life--
            if (pt.life <= 0) { this.particles.splice(i, 1); continue }
            const alpha = pt.life / pt.maxLife
            g.fillStyle(pt.col, alpha)
            g.fillRect(pt.x - pt.sz / 2, pt.y - pt.sz / 2, pt.sz, pt.sz)
          }

          // ── Plan avant : toit + Norton & Marla qui s'embrassent ──
          const roofY = PLAY_H - 55

          // Ombre portée du toit (profondeur)
          ra(g, 0x000000, 0.55, 220, roofY, 360, 55)
          // Toit
          g.fillStyle(0x0a0a12, 1); g.fillRect(222, roofY, 356, 55)
          g.fillStyle(0x14141e, 1); g.fillRect(220, roofY - 5, 360, 8)
          // Détails toit (tuyaux, boites techniques)
          g.fillStyle(0x1a1a26, 1); g.fillRect(235, roofY - 14, 18, 12)
          g.fillStyle(0x1a1a26, 1); g.fillRect(545, roofY - 18, 22, 16)

          // Norton face à Marla — légèrement penché vers elle
          const norX = GW / 2 - 24
          const norY = roofY
          g.fillStyle(0x1a1a2a, 1)
          g.fillRect(norX - 9, norY - 37, 18, 29)      // torse
          g.fillRect(norX - 8, norY - 9, 9, 20)        // jambe g
          g.fillRect(norX + 2, norY - 9, 9, 20)        // jambe d
          // Bras gauche de Norton derrière Marla (enlaçant)
          g.fillStyle(0x1a1a2a, 1)
          g.fillRect(norX + 7, norY - 35, 14, 6)       // bras d vers Marla
          g.fillRect(norX - 15, norY - 35, 9, 18)      // bras g (derrière)
          // Tête Norton penchée — touches avec Marla
          g.fillStyle(0xd4a88a, 1); g.fillRect(norX - 4, norY - 53, 13, 14)
          g.fillStyle(0x221a10, 1); g.fillRect(norX - 5, norY - 59, 15, 8)
          // Cicatrice sur la joue (detail fidèle au film)
          g.fillStyle(0xb07860, 0.8); g.fillRect(norX + 3, norY - 47, 4, 2)

          // Marla — penchée vers Norton, bras autour de lui
          const marX = GW / 2 + 20
          const marY = roofY
          g.fillStyle(0x1c1020, 1)
          g.fillRect(marX - 7, marY - 39, 14, 29)      // robe
          g.fillRect(marX - 5, marY - 11, 7, 20)       // jambe g
          g.fillRect(marX + 2, marY - 11, 7, 20)       // jambe d
          // Étole fourrure
          g.fillStyle(0x4a4438, 1); g.fillRect(marX - 11, marY - 41, 22, 8)
          ra(g, 0x7a7060, 0.55, marX - 10, marY - 40, 20, 5)
          // Bras Marla autour du cou/épaules de Norton
          g.fillStyle(0x1c1020, 1)
          g.fillRect(marX - 20, marY - 36, 14, 6)      // bras g vers Norton
          g.fillRect(marX + 7, marY - 36, 6, 16)       // bras d
          // Tête Marla — touchant celle de Norton
          g.fillStyle(0xcdc4b8, 1); g.fillRect(marX - 3, marY - 53, 12, 12)
          g.fillStyle(0x1e1420, 1); g.fillRect(marX - 4, marY - 59, 15, 8)
          // Cigarette allumée (tient entre ses doigts derrière elle)
          g.fillStyle(0xeeeebb, 1); g.fillRect(marX + 13, marY - 28, 12, 2)
          ra(g, 0xff8800, 0.92, marX + 25, marY - 29, 4, 2)
          // Fumée cigarette
          for (let i = 0; i < 4; i++) {
            const sy = -3 - i * 6
            ra(g, 0xcccccc, 0.06 + i * 0.02, marX + 26 + Math.sin(this.cinFrame * 0.09 + i) * 3, marY - 29 + sy, 4 + i * 2, 4 + i * 2)
          }

          // Lueur tendre entre eux
          const glow = 0.07 + Math.sin(this.cinFrame * 0.035) * 0.04
          ra(g, 0xff88cc, glow, GW / 2 - 18, roofY - 62, 38, 38)

          // Vignette latérale + haut/bas
          ra(g, 0x000000, 0.40, 0, 0, GW, GH / 5)
          ra(g, 0x000000, 0.35, 0, GH * 0.78, GW, GH * 0.22)
          ra(g, 0x000000, 0.20, 0, 0, 80, GH)
          ra(g, 0x000000, 0.20, GW - 80, 0, 80, GH)
        }
      }

      // ── LAUNCH ───────────────────────────────────────────────────
      phaserGame = new Phaser.Game({
        type: Phaser.CANVAS,
        width: GW, height: GH,
        parent: containerRef.current!,
        backgroundColor: '#06060c',
        scene: [MenuScene, DifficultyScene, OptionsScene, GameScene, CinematicScene],
        input: { keyboard: true },
        audio: { disableWebAudio: false },
        banner: false,
        render: { pixelArt: false, antialias: true },
      })
      setGameReady(true)
    })()

    return () => { phaserGame?.destroy(true); phaserGame = null; setGameReady(false) }
  }, [onDone])

  const lbDiff = (gameResult.current?.diff ?? 'normal') as Diff

  const dpadBtn: React.CSSProperties = {
    position: 'absolute', width: 38, height: 38,
    background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 8, color: 'rgba(255,255,255,0.7)', fontSize: '1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', userSelect: 'none', touchAction: 'none',
    backdropFilter: 'blur(2px)',
  }
  const actionBtn: React.CSSProperties = {
    width: 72, height: 44,
    border: '1px solid', borderRadius: 10,
    fontSize: '0.65rem', fontFamily: 'Impact, serif', letterSpacing: '1px',
    cursor: 'pointer', userSelect: 'none', touchAction: 'none',
    backdropFilter: 'blur(2px)',
  }

  // Overlay portrait mobile
  if (isMobile && isPortrait) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999, background: '#06060c',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '1.4rem', color: '#cc8833', fontFamily: 'Impact, serif',
      }}>
        <div style={{ fontSize: 72, animation: 'fc-rotate 2s ease-in-out infinite' }}>↻</div>
        <div style={{ fontSize: 'clamp(1.2rem,5vw,1.8rem)', letterSpacing: 4, textAlign: 'center', padding: '0 2rem' }}>
          TOURNEZ VOTRE APPAREIL
        </div>
        <div style={{ fontSize: '.85rem', color: '#664422', letterSpacing: 2, fontFamily: 'monospace' }}>
          Fight Club nécessite le mode paysage
        </div>
        <style>{`@keyframes fc-rotate { 0%{transform:rotate(0deg)} 40%{transform:rotate(90deg)} 60%{transform:rotate(90deg)} 100%{transform:rotate(0deg)} }`}</style>
      </div>
    )
  }

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
            onKeyDown={e => {
              e.stopPropagation()
              e.nativeEvent.stopImmediatePropagation()
              if (e.key === 'Enter') confirmName()
            }}
            onKeyUp={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation() }}
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

          {/* Leaderboard existant visible pendant la saisie */}
          {existingLB.length > 0 && (
            <div style={{ marginTop: '28px', width: '280px' }}>
              <div style={{ color: '#444', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '3px', marginBottom: '8px', textAlign: 'center' }}>
                — TOP SCORES —
              </div>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  {existingLB.map((e, i) => (
                    <tr key={i} style={{ color: i === 0 ? '#ffdd00' : '#555' }}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', padding: '2px 8px', textAlign: 'right', opacity: .6 }}>
                        #{i + 1}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', padding: '2px 8px', letterSpacing: '2px' }}>
                        {e.name}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', padding: '2px 8px', color: '#ffdd00', opacity: i === 0 ? 1 : .7 }}>
                        {String(e.score).padStart(7, '0')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Secret door prompt */}
      {showDoorPrompt && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.95)', border: '1px solid #554433',
          padding: '20px 32px', borderRadius: '8px', zIndex: 300, textAlign: 'center',
          minWidth: 240,
        }}>
          <div style={{ color: '#ffcc00', fontFamily: 'Impact', fontSize: '20px', letterSpacing: '4px', marginBottom: '16px' }}>
            OUVRIR LA PORTE ?
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onPointerDown={e => { e.preventDefault(); confirmDoorRef.current?.() }}
              style={{
                background: '#cc1111', border: 'none', color: '#fff',
                fontFamily: 'Impact', fontSize: '16px', letterSpacing: '3px',
                padding: '12px 32px', cursor: 'pointer', borderRadius: '4px',
                touchAction: 'none', minWidth: 80,
              }}>OUI</button>
            <button
              onPointerDown={e => { e.preventDefault(); cancelDoorRef.current?.() }}
              style={{
                background: 'rgba(80,60,40,0.6)', border: '1px solid #554433', color: '#ccaa77',
                fontFamily: 'Impact', fontSize: '16px', letterSpacing: '3px',
                padding: '12px 32px', cursor: 'pointer', borderRadius: '4px',
                touchAction: 'none', minWidth: 80,
              }}>NON</button>
          </div>
        </div>
      )}

      {/* Endless mode choice overlay */}
      {showEndlessChoice && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.92)', zIndex: 200,
        }}>
          <div style={{ color: '#ffdd00', fontFamily: 'Impact', fontSize: '38px', letterSpacing: '6px', marginBottom: '10px' }}>
            TYLER EST VAINCU.
          </div>
          <div style={{ color: '#888', fontFamily: 'serif', fontSize: '18px', fontStyle: 'italic', marginBottom: '32px', textAlign: 'center', maxWidth: '500px' }}>
            "Jusqu'à ce que mort s'en suive..."<br/>
            <span style={{ color: '#555', fontSize: '14px' }}>Vagues infinies — difficulté croissante</span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <button onClick={() => {
              setShowEndlessChoice(false)
              startEndlessRef.current?.()
            }} style={{
              background: '#cc1111', border: 'none', color: '#fff',
              fontFamily: 'Impact', fontSize: '20px', letterSpacing: '4px',
              padding: '14px 40px', cursor: 'pointer',
            }}>CONTINUER</button>
            <button onClick={() => {
              setShowEndlessChoice(false)
              gameResult.current = { score: gameResult.current?.score ?? 0, diff: gameResult.current?.diff ?? 'normal' }
              setShowName(true)
            }} style={{
              background: 'transparent', border: '1px solid #554433', color: '#886644',
              fontFamily: 'monospace', fontSize: '14px', letterSpacing: '3px',
              padding: '14px 30px', cursor: 'pointer',
            }}>QUITTER</button>
          </div>
        </div>
      )}

      {/* Menu D-pad — mobile only, visible during menu screens */}
      {isMobile && gameReady && !mobileCtrlsOn && !showName && !showLB && !showEndlessChoice && !showDoorPrompt && (
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          padding: '0 16px', pointerEvents: 'none', zIndex: 160,
        }}>
          {/* D-pad gauche : haut/bas/gauche/droite */}
          <div style={{ position: 'relative', width: 118, height: 118, pointerEvents: 'auto', flexShrink: 0 }}>
            {/* haut */}
            <button onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:menu-nav', { detail: 'up' })) }}
              style={{ ...dpadBtn, top: 0, left: '50%', transform: 'translateX(-50%)' }}>▲</button>
            {/* bas */}
            <button onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:menu-nav', { detail: 'down' })) }}
              style={{ ...dpadBtn, bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>▼</button>
            {/* gauche */}
            <button onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:menu-nav', { detail: 'left' })) }}
              style={{ ...dpadBtn, top: '50%', left: 0, transform: 'translateY(-50%)' }}>◀</button>
            {/* droite */}
            <button onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:menu-nav', { detail: 'right' })) }}
              style={{ ...dpadBtn, top: '50%', right: 0, transform: 'translateY(-50%)' }}>▶</button>
            {/* centre */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 28, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
          </div>
          {/* Bouton confirmer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'auto', flexShrink: 0, marginBottom: 8 }}>
            <button
              onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:menu-nav', { detail: 'confirm' })) }}
              style={{ width: 56, height: 56, background: 'rgba(204,17,17,0.25)', border: '2px solid rgba(204,17,17,0.7)', borderRadius: '50%', color: '#fff', fontSize: '1rem', fontFamily: 'Impact', letterSpacing: 1, cursor: 'pointer', userSelect: 'none', touchAction: 'none', backdropFilter: 'blur(2px)' }}
            >OK</button>
            <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.45)', letterSpacing: 2, textTransform: 'uppercase' }}>Confirmer</span>
          </div>
        </div>
      )}

      {/* Bouton Sortir — hors du panneau de contrôles */}
      {mobileCtrlsOn && !showName && !showLB && !showEndlessChoice && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 200, pointerEvents: 'auto' }}>
          <button
            onPointerDown={e => { e.preventDefault(); onDone() }}
            onTouchStart={e => { e.preventDefault(); onDone() }}
            style={{
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6, color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem',
              fontFamily: 'monospace', letterSpacing: 2, padding: '5px 12px',
              cursor: 'pointer', touchAction: 'none',
            }}
          >SORTIR</button>
        </div>
      )}

      {/* Mobile virtual controls */}
      {mobileCtrlsOn && !showName && !showLB && !showEndlessChoice && !showDoorPrompt && (
        <div
          className="fc-mobile-controls"
          style={{
            position: 'absolute', bottom: 75, left: 0, right: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            padding: '0 12px 10px',
            pointerEvents: 'none',
            zIndex: 150,
          }}
        >
          {/* D-pad gauche */}
          <div style={{ position: 'relative', width: 120, height: 120, pointerEvents: 'auto', flexShrink: 0 }}>
            {/* Haut */}
            <button
              onPointerDown={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, up: true } }}
              onPointerUp={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, up: false } }}
              onPointerLeave={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, up: false } }}
              style={{ ...dpadBtn, top: 0, left: '50%', transform: 'translateX(-50%)' }}
            >▲</button>
            {/* Bas */}
            <button
              onPointerDown={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, down: true } }}
              onPointerUp={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, down: false } }}
              onPointerLeave={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, down: false } }}
              style={{ ...dpadBtn, bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
            >▼</button>
            {/* Gauche */}
            <button
              onPointerDown={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, left: true } }}
              onPointerUp={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, left: false } }}
              onPointerLeave={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, left: false } }}
              style={{ ...dpadBtn, top: '50%', left: 0, transform: 'translateY(-50%)' }}
            >◀</button>
            {/* Droite */}
            <button
              onPointerDown={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, right: true } }}
              onPointerUp={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, right: false } }}
              onPointerLeave={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, right: false } }}
              style={{ ...dpadBtn, top: '50%', right: 0, transform: 'translateY(-50%)' }}
            >▶</button>
            {/* Centre */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 28, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
          </div>

          {/* Boutons action droite */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'auto', flexShrink: 0 }}>
            {/* Ligne haute : SAUT + BLOQUER */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'jump' } })) }}
                onTouchStart={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'jump' } })) }}
                style={{ ...actionBtn, background: 'rgba(80,180,255,0.22)', borderColor: 'rgba(80,180,255,0.55)', color: '#88ccff' }}
              >SAUT</button>
              <button
                onPointerDown={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, block: true } }}
                onPointerUp={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, block: false } }}
                onPointerLeave={e => { e.preventDefault(); (window as any).__fcMobileKeys = { ...(window as any).__fcMobileKeys, block: false } }}
                style={{ ...actionBtn, background: 'rgba(180,120,255,0.22)', borderColor: 'rgba(180,120,255,0.55)', color: '#cc99ff' }}
              >BLOQUER</button>
            </div>
            {/* Ligne milieu : LANCER */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'throw' } })) }}
                onTouchStart={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'throw' } })) }}
                style={{ ...actionBtn, background: 'rgba(255,220,50,0.22)', borderColor: 'rgba(255,220,50,0.55)', color: '#ffdd66', fontSize: '0.62rem', width: 104 }}
              >🗡 LANCER</button>
            </div>
            {/* Ligne basse : COUP DE POING + COUP DE PIED */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'punch' } })) }}
                onTouchStart={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'punch' } })) }}
                style={{ ...actionBtn, background: 'rgba(255,80,80,0.22)', borderColor: 'rgba(255,80,80,0.55)', color: '#ff8888', fontSize: '0.62rem' }}
              >POING</button>
              <button
                onPointerDown={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'kick' } })) }}
                onTouchStart={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('fc:action', { detail: { action: 'kick' } })) }}
                style={{ ...actionBtn, background: 'rgba(255,160,40,0.22)', borderColor: 'rgba(255,160,40,0.55)', color: '#ffbb66', fontSize: '0.62rem' }}
              >PIED</button>
            </div>
          </div>
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
          <table style={{ borderCollapse: 'collapse', marginBottom: '28px', marginTop: '12px', maxHeight: '60vh', display: 'block', overflowY: 'auto' }}>
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
