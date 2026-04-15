'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  feedTamagotchi, playWithTamagotchi, healTamagotchi, reviveTamagotchi,
  nameTamagotchi, caresserTamagotchi, nettoyerTamagotchi,
  dormirTamagotchi, reveillerTamagotchi, guerirTamagotchi,
  huntTamagotchi, checkInTamagotchi,
} from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { useWidgetEnabled } from '@/components/TamagotchiWidget'
import { TAMA_FRAMES, STAGE_COLORS, getTamaFrameKey, getTamaMood } from '@/lib/tamaFrames'
import { getOwnedAccessories, type Accessory } from '@/lib/tamaAccessories'
import {
  adminEvolveAlien, adminAgeAlien, adminKillAlien,
  adminAddPoop, adminResetCaresses,
  adminToggleSick, adminToggleSleep, adminDrainEnergy,
  adminTestHunt, adminResetCheckin,
} from '@/lib/actions'
import MiniGame from './MiniGame'
import GameSelector from './GameSelector'
import HuntGame from './HuntGame'

// ── Constantes ───────────────────────────────────────────────────────────────
const STAGE_INFO: Record<string, { label: string; desc: string }> = {
  egg:          { label: 'Œuf',          desc: "Un œuf mystérieux vibrant légèrement… quelque chose se prépare à l'intérieur." },
  facehugger:   { label: 'Facehugger',   desc: "Il cherche un hôte. Ses doigts griffent doucement l'air." },
  chestburster: { label: 'Chestburster', desc: "Il a trouvé son chemin… depuis l'intérieur. Bienvenue dans le monde, petit monstre." },
  xenomorph:    { label: 'Xénomorphe',   desc: 'Parfait. Redoutable. La création parfaite de la nature. Il te reconnaît.' },
  dead:         { label: 'Décédé',       desc: "Dans l'espace, personne ne peut entendre ton alien pleurer." },
}

const SPACE_EVENTS = [
  { icon: '☄️', text: 'Pluie de météorites !' },
  { icon: '🌑', text: 'Éclipse totale...' },
  { icon: '📡', text: 'Signal alien capté.' },
  { icon: '⚡', text: 'Tempête ionique !' },
  { icon: '🌿', text: 'Jardin spatial trouvé !' },
  { icon: '👁️', text: "L'espace vous observe..." },
  { icon: '🎆', text: 'Aurore boréale spatiale !' },
  { icon: '🌡️', text: 'Anomalie thermique.' },
  { icon: '🛸', text: 'Vaisseau non-identifié !' },
  { icon: '🌌', text: 'Nébuleuse découverte.' },
]

// ── Achievements ──────────────────────────────────────────────────────────────
const ACHIEVEMENTS: Record<string, { icon: string; label: string; desc: string }> = {
  first_feed:    { icon: '🥩', label: 'Premier repas',       desc: 'A nourri son alien pour la première fois' },
  first_hunt:    { icon: '🏹', label: 'Première chasse',     desc: 'A lancé la chasse au xénomorphe' },
  hunter:        { icon: '🎯', label: 'Chasseur',            desc: '5 chasses terminées' },
  apex_hunter:   { icon: '👑', label: 'Apex Prédateur',      desc: '20 chasses terminées' },
  perfect_hunt:  { icon: '💯', label: 'Chasse parfaite',     desc: 'Score 100+ en une seule chasse' },
  streak_week:   { icon: '🔥', label: 'Semaine de feu',      desc: '7 jours de streak consécutifs' },
  streak_month:  { icon: '🌟', label: 'Mois de dévotion',   desc: '30 jours de streak consécutifs' },
  max_level:     { icon: '⭐', label: 'Maître de l\'espace', desc: 'Niveau 10 atteint' },
}

// ── Level rewards ─────────────────────────────────────────────────────────────
type LevelReward = { icon: string; label: string; desc: string; type: 'title' | 'theme' | 'bonus' | 'action' }
const LEVEL_REWARDS: Record<number, LevelReward> = {
  2:  { icon: '🏷️', label: 'Titre "Explorateur"',       desc: 'Affiché sous ton alien',                       type: 'title'  },
  3:  { icon: '🎨', label: 'Thème Nuit Cosmique',        desc: 'Le vivarium prend une teinte violette',         type: 'theme'  },
  4:  { icon: '🌙', label: 'Repos manuel débloqué',      desc: 'Tu peux endormir ton alien toi-même',           type: 'action' },
  5:  { icon: '🏷️', label: 'Titre "Chasseur Spatial"',  desc: 'Titre intermédiaire',                           type: 'title'  },
  6:  { icon: '🤚', label: '+1 câlin / jour',            desc: '6 câlins par jour au lieu de 5',                type: 'bonus'  },
  7:  { icon: '🎨', label: 'Thème Sang & Or',            desc: 'Teintes rouges et dorées pour le vivarium',     type: 'theme'  },
  8:  { icon: '🏷️', label: 'Titre "Légende Noire"',     desc: 'Titre rare, pour les dévoués',                  type: 'title'  },
  9:  { icon: '⚡', label: 'XP ×1.5',                   desc: 'Toutes tes actions rapportent 50% de plus',     type: 'bonus'  },
  10: { icon: '👑', label: 'Titre "Maître de l\'Espace"', desc: 'Le titre légendaire ultime',                   type: 'title'  },
}

function getCurrentTitle(lvl: number): string | null {
  if (lvl >= 10) return '👑 Maître de l\'Espace'
  if (lvl >= 8)  return '🌑 Légende Noire'
  if (lvl >= 5)  return '🎯 Chasseur Spatial'
  if (lvl >= 2)  return '🔭 Explorateur'
  return null
}

function getThemeStyle(lvl: number): { border: string; bg: string } | null {
  if (lvl >= 10) return { border: 'rgba(232,196,106,.6)',  bg: 'linear-gradient(135deg,rgba(232,196,106,.14),rgba(167,139,250,.1))' }
  if (lvl >= 7)  return { border: 'rgba(239,68,68,.45)',   bg: 'linear-gradient(135deg,rgba(239,68,68,.1),rgba(232,196,106,.08))' }
  if (lvl >= 3)  return { border: 'rgba(139,92,246,.4)',   bg: 'linear-gradient(135deg,rgba(139,92,246,.1),rgba(34,211,238,.06))' }
  return null
}

// ── Personality ────────────────────────────────────────────────────────────────
function getPersonality(pet: any): { label: string; desc: string; color: string } {
  const huntCount   = pet?.hunt_count ?? 0
  const careStreak  = pet?.care_streak ?? 0
  const happiness   = pet?.happiness ?? 50
  const health      = pet?.health ?? 50
  if (huntCount >= 10) return { label: '⚔️ Prédateur',    desc: 'Sauvage, efficace, né pour chasser.', color: '#ef4444' }
  if (careStreak >= 7) return { label: '💚 Loyal',         desc: 'Attaché à son maître, profondément fidèle.', color: '#4ade80' }
  if (happiness > 75)  return { label: '🌟 Jovial',        desc: 'Toujours de bonne humeur, débordant d\'énergie.', color: '#fbbf24' }
  if (health < 30)     return { label: '🌿 Résilient',     desc: 'A survécu à l\'adversité. Marqué mais vivant.', color: '#a3e635' }
  if (huntCount >= 3)  return { label: '🎯 Chasseur',      desc: 'Instinct aiguisé, regard acéré.', color: '#f97316' }
  return               { label: '🌑 Mystérieux',           desc: 'Impénétrable. On ne sait jamais ce qu\'il pense.', color: '#a78bfa' }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtCooldown(ms: number): string {
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3_600_000)
  const m = Math.ceil((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`
}

function fmtAge(h: number): string {
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); const r = h % 24
  return r > 0 ? `${d}j ${r}h` : `${d}j`
}

function getLevel(xp: number) { return 1 + Math.floor((xp ?? 0) / 30) }

function getLevelLabel(lvl: number): string {
  if (lvl >= 10) return '👑 Maître'
  if (lvl >= 8)  return '🌑 Légende Noire'
  if (lvl >= 5)  return '🎯 Chasseur'
  if (lvl >= 2)  return '🔭 Explorateur'
  return '🌑 Recrue'
}

function getPoopPositions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: 6 + ((i * 137 + 42) % 76),
    y: 6 + ((i * 73  + 17) % 26),
  }))
}

// ── Sub-composants ────────────────────────────────────────────────────────────
function StatBar({ label, value, color, icon, pulse }: { label: string; value: number; color: string; icon: string; pulse?: boolean }) {
  const pct = Math.max(0, Math.min(100, value))
  const danger = pct < 25
  return (
    <div style={{ marginBottom: '.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem', fontSize: '.75rem' }}>
        <span style={{ color: 'var(--text2)' }}>{icon} {label}</span>
        <span style={{ color: danger ? '#ef4444' : color, fontWeight: 600, animation: pulse && danger ? 'tama-poop-warn 0.8s ease-in-out infinite' : 'none' }}>
          {pct}<span style={{ color: 'var(--text3)', fontWeight: 400 }}>/100</span>
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: danger ? '#ef4444' : color, borderRadius: 99, transition: 'width .4s', animation: pulse && danger ? 'tama-poop-warn 0.8s ease-in-out infinite' : 'none' }} />
      </div>
    </div>
  )
}

function EvolveOverlay({ stage, onClose }: { stage: string; onClose: () => void }) {
  const info = STAGE_INFO[stage]
  const color = STAGE_COLORS[stage] ?? '#22d3ee'
  const msgs: Record<string, string> = {
    facehugger:   "L'œuf s'ouvre lentement… et quelque chose en sort.",
    chestburster: '💥 AAAGH ! Il sort de sa cage thoracique !',
    xenomorph:    'Il est adulte. Et il te regarde.',
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,10,5,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center', padding: '0 2rem', maxWidth: 560, animation: 'ee-rule-in .35s ease' }}>
        <div style={{ fontSize: 'clamp(3rem,10vw,6rem)', lineHeight: 1, marginBottom: '1rem', filter: `drop-shadow(0 0 30px ${color})` }}>🤍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem,5vw,2.5rem)', color, textShadow: `0 0 40px ${color}88`, lineHeight: 1.2, marginBottom: '.8rem' }}>{info?.label ?? stage}</div>
        <div style={{ fontSize: 'clamp(.9rem,2.5vw,1.1rem)', color: 'rgba(255,255,255,.8)', lineHeight: 1.7, marginBottom: '1.5rem' }}>{msgs[stage] ?? `Évolution : ${info?.label}`}</div>
        <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.4)' }}>Cliquer pour continuer</div>
      </div>
    </div>
  )
}

function LevelUpOverlay({ level, onClose }: { level: number; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t) }, [onClose])
  const reward = LEVEL_REWARDS[level]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8999, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center', animation: 'tama-levelup-pop 0.5s cubic-bezier(.175,.885,.32,1.275)', padding: '0 2rem', maxWidth: 340 }}>
        <div style={{ fontSize: '3rem', marginBottom: '.4rem' }}>✨</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: '#fbbf24', textShadow: '0 0 30px #fbbf2488' }}>
          Niveau {level} !
        </div>
        <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)', marginTop: '.2rem', marginBottom: reward ? '.9rem' : 0 }}>
          {getLevelLabel(level)}
        </div>
        {reward && (
          <div style={{
            background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.35)',
            borderRadius: 12, padding: '.9rem 1.4rem', marginTop: '.2rem',
          }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '.3rem' }}>{reward.icon}</div>
            <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '.95rem', marginBottom: '.2rem' }}>{reward.label}</div>
            <div style={{ fontSize: '.76rem', color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>{reward.desc}</div>
          </div>
        )}
        <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.25)', marginTop: '.8rem' }}>Cliquer pour continuer</div>
      </div>
    </div>
  )
}

function FloatingHearts({ visible }: { visible: boolean }) {
  if (!visible) return null
  const hearts = ['❤️', '💜', '💙', '🤍', '❤️', '💚']
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {hearts.map((h, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${20 + (i % 5) * 15}%`, bottom: `${40 + Math.random() * 20}%`,
          fontSize: `${.8 + (i % 3) * .3}rem`, animation: `tama-heart-float ${0.8 + i * 0.15}s ease-out forwards`,
          animationDelay: `${i * 0.1}s`, opacity: 0,
        }}>{h}</div>
      ))}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
interface Props {
  initialPet: any; evolved: boolean; evolvedTo: string | null; isNew: boolean; isAdmin?: boolean
}

export default function TamagotchiClient({ initialPet, evolved, evolvedTo, isNew, isAdmin = false }: Props) {
  const [pet, setPet]                       = useState(initialPet)
  const [tick, setTick]                     = useState(0)
  const [now, setNow]                       = useState(Date.now())
  const [loading, setLoading]               = useState<string | null>(null)
  const [evolveStage, setEvolveStage]       = useState<string | null>(evolved && evolvedTo ? evolvedTo : null)
  const [levelUpShow, setLevelUpShow]       = useState<number | null>(null)
  const [naming, setNaming]                 = useState(false)
  const [nameInput, setNameInput]           = useState(initialPet?.name ?? 'Xeno')
  const [showFeedGame, setShowFeedGame]     = useState(false)
  const [showPlayGame, setShowPlayGame]     = useState(false)
  const [showHuntGame, setShowHuntGame]     = useState(false)
  const [accessories,  setAccessories]      = useState<Accessory[]>([])
  const [showHearts,   setShowHearts]       = useState(false)
  const [caresseAnim,  setCaresseAnim]      = useState(false)
  const [widgetEnabled, setWidgetEnabled]   = useWidgetEnabled()
  const { addToast }                        = useToast()

  // ── Animation / mouvement ──────────────────────────────────────────────────
  const [alienLeft,    setAlienLeft]    = useState(35)
  const [alienMoveDur, setAlienMoveDur] = useState(2)
  const [alienAnim, setAlienAnim]       = useState<'idle'|'walk'|'eat'|'wake'>('idle')
  const [showFoodAnim, setShowFoodAnim] = useState(false)
  const [moodBubble, setMoodBubble]     = useState<string|null>(null)
  const [spaceEvent, setSpaceEvent]     = useState<{ icon: string; text: string } | null>(null)
  const animTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const prevXpRef    = useRef<number>(initialPet?.xp ?? 0)

  const isDead      = pet?.stage === 'dead'
  const isSleeping  = pet?.is_sleeping === true
  const isSick      = pet?.is_sick === true
  const showingGame = showFeedGame || showPlayGame || showHuntGame

  const poopPositions = useMemo(() => getPoopPositions(pet?.poop_count ?? 0), [pet?.poop_count])
  const today         = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const caressesToday = (pet?.last_caresse_date === today) ? (pet?.caresses_today ?? 0) : 0
  const level         = getLevel(pet?.xp ?? 0)
  const caresseLimit  = level >= 6 ? 6 : 5
  const themeStyle    = getThemeStyle(level)
  const currentTitle  = getCurrentTitle(level)
  const poopCount     = pet?.poop_count ?? 0
  const needsAttention = !isDead && !isSleeping && (pet?.hunger > 70 || pet?.happiness < 20 || isSick)

  // Accessoires, tick, clock
  useEffect(() => { setAccessories(getOwnedAccessories()) }, [showPlayGame])
  useEffect(() => { const id = setInterval(() => setTick(t => 1 - t), 800); return () => clearInterval(id) }, [])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  useEffect(() => { if (isNew) addToast('Ton facehugger est né ! Prends-en soin. 🤍', 'success') }, []) // eslint-disable-line

  // ── Check-in quotidien automatique ────────────────────────────────────────
  useEffect(() => {
    if (!pet || pet.stage === 'dead') return
    const last = pet.last_checkin ? pet.last_checkin.slice(0, 10) : ''
    if (last !== today) {
      // silently do the check-in in background
      checkInTamagotchi().then(res => {
        if (res.data) {
          setPet(res.data)
          const bonus = (res as any).bonusXp ?? 15
          addToast(`✨ Check-in quotidien ! +${bonus} XP — streak ${res.data.care_streak ?? 1}j 🔥`, 'success')
        }
      })
    }
  }, []) // eslint-disable-line

  // Level-up detection
  useEffect(() => {
    const oldLevel = getLevel(prevXpRef.current)
    const newLevel = getLevel(pet?.xp ?? 0)
    if (newLevel > oldLevel && pet?.xp > 0) setLevelUpShow(newLevel)
    prevXpRef.current = pet?.xp ?? 0
  }, [pet?.xp])

  // ── Mouvement de l'alien ───────────────────────────────────────────────────
  useEffect(() => {
    if (isDead || isSleeping || showingGame) return
    let nextTimer: ReturnType<typeof setTimeout>
    const scheduleMove = () => {
      const delay = isSick ? 3000 + Math.random() * 3000 : 2500 + Math.random() * 4500
      nextTimer = setTimeout(() => {
        const newLeft = 5 + Math.random() * 52
        const dur = 1.2 + Math.random() * 1.8
        setAlienMoveDur(dur)
        setAlienLeft(newLeft)
        setAlienAnim('walk')
        if (animTimerRef.current) clearTimeout(animTimerRef.current)
        animTimerRef.current = setTimeout(() => setAlienAnim('idle'), dur * 1000 + 300)
        scheduleMove()
      }, delay)
    }
    scheduleMove()
    return () => {
      clearTimeout(nextTimer)
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
    }
  }, [isDead, isSleeping, isSick, showingGame])

  // ── Bulles d'humeur ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDead || isSleeping || !pet) return
    const BUBBLES: Record<string, string[]> = {
      poop:    ['🤢', '😤 Crotte !', '🤮', '😤'],
      sick:    ['🤒', '🥵', '😵', '🌡️'],
      tired:   ['😴', '💤', '🥱', 'Zzzz'],
      happy:   ['😊', '💚', '🎉', '✨', '🥳'],
      sad:     ['😢', '💔', '😔', '🥺'],
      dying:   ['😵', '🆘', '💀', '😱'],
      neutral: ['😐', '👀', '💤', '🌑'],
    }
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
    const getBubble = () => {
      if (isSick)                      return pick(BUBBLES.sick)
      if ((pet.energy ?? 100) < 25)    return pick(BUBBLES.tired)
      if ((pet.poop_count ?? 0) >= 2)  return pick(BUBBLES.poop)
      const mood = getTamaMood(pet)
      return pick(BUBBLES[mood] ?? BUBBLES.neutral)
    }
    const id = setInterval(() => {
      setMoodBubble(getBubble())
      setTimeout(() => setMoodBubble(null), 2400)
    }, 7000 + Math.random() * 5000)
    return () => clearInterval(id)
  }, [isDead, isSleeping, isSick, pet?.happiness, pet?.poop_count, pet?.energy, pet?.health]) // eslint-disable-line

  // ── Événements spatiaux ────────────────────────────────────────────────────
  useEffect(() => {
    const fire = () => {
      const ev = SPACE_EVENTS[Math.floor(Math.random() * SPACE_EVENTS.length)]
      setSpaceEvent(ev)
      setTimeout(() => setSpaceEvent(null), 3800)
    }
    const delay = 60_000 + Math.random() * 120_000  // 1-3 min (réduit pour test, normalement 8-15 min)
    const id = setInterval(fire, delay)
    return () => clearInterval(id)
  }, [])

  // ── Décroissance passive du bonheur ───────────────────────────────────────
  useEffect(() => {
    if (isDead || isSleeping) return
    const id = setInterval(() => {
      setPet((p: any) => {
        if (!p || p.stage === 'dead') return p
        return { ...p, happiness: Math.max(0, (p.happiness ?? 50) - 1) }
      })
    }, 120_000) // -1 toutes les 2 minutes → oblige à jouer
    return () => clearInterval(id)
  }, [isDead, isSleeping])

  const FEED_CD = 2 * 3_600_000
  const HEAL_CD = 24 * 3_600_000
  const HUNT_CD = 4 * 3_600_000
  const feedCd = pet?.last_fed     ? Math.max(0, FEED_CD - (now - new Date(pet.last_fed).getTime()))     : 0
  const healCd = pet?.last_healed  ? Math.max(0, HEAL_CD - (now - new Date(pet.last_healed).getTime()))  : 0
  const huntCd = pet?.last_hunted  ? Math.max(0, HUNT_CD - (now - new Date(pet.last_hunted).getTime()))  : 0
  const checkinDone = pet?.last_checkin ? pet.last_checkin.slice(0, 10) === today : false
  const petAchievements: string[] = Array.isArray(pet?.achievements) ? pet.achievements : []
  const personality = pet ? getPersonality(pet) : null

  const frameKey   = pet ? getTamaFrameKey(pet) : 'egg'
  const frames     = TAMA_FRAMES[frameKey] ?? TAMA_FRAMES['egg']
  const frame      = frames[tick % frames.length]
  const stageInfo  = STAGE_INFO[pet?.stage ?? 'egg']
  const screenColor = isDead ? '#4b5563' : (STAGE_COLORS[pet?.stage] ?? '#22d3ee')

  const moodLabel = (() => {
    if (!pet || isDead) return null
    if (isSick)                                                              return '🤒 Malade !'
    if (isSleeping)                                                          return '💤 En sommeil'
    if ((pet.energy ?? 100) < 25)                                           return '😴 Épuisé...'
    if (pet.health < 15 || (pet.hunger > 70 && pet.happiness < 30))        return '😰 En danger !'
    if (pet.hunger > 70 || pet.happiness < 30 || pet.health < 30)          return '😔 Malheureux'
    if (pet.hunger < 40 && pet.happiness > 60 && pet.health > 70)          return '😊 Content'
    return '😐 Neutre'
  })()

  // Animation CSS de l'alien
  const alienAnimCss = (() => {
    if (isDead)               return 'tama-dying-shake 0.5s ease-in-out infinite'
    if (isSleeping)           return 'tama-sleep-breathe 4s ease-in-out infinite'
    if (isSick)               return 'tama-sick-wobble 0.8s ease-in-out infinite'
    if (alienAnim === 'eat')  return 'tama-eat 0.45s ease-in-out 4'
    if (alienAnim === 'walk') return 'tama-walk 0.38s ease-in-out infinite'
    if (alienAnim === 'wake') return 'tama-wake-up 0.6s ease-out'
    if (caresseAnim)          return 'tama-pet-glow 0.45s ease-in-out 4'
    const mood = getTamaMood(pet)
    if (mood === 'happy')  return 'tama-happy-bounce 1.3s ease-in-out infinite'
    if (mood === 'dying')  return 'tama-dying-shake 0.35s ease-in-out infinite'
    if (mood === 'sad')    return 'tama-sad-droop 2.2s ease-in-out infinite'
    return 'tama-breathe 3.2s ease-in-out infinite'
  })()

  // CSS filter quand malade
  const alienFilter = isSick ? 'hue-rotate(80deg) saturate(2) brightness(0.85)' : 'none'

  const doAction = useCallback(async (
    action: () => Promise<{ data: any; error: string | null }>,
    key: string
  ) => {
    setLoading(key)
    const res = await action()
    setLoading(null)
    if (res.error) { addToast(res.error, 'error'); return }
    if (res.data) {
      const prev = pet?.stage
      setPet(res.data)
      if (res.data.stage !== prev && res.data.stage !== 'dead') setEvolveStage(res.data.stage)
      else if (res.data.stage === 'dead' && prev !== 'dead') addToast('💀 Ton alien est mort…', 'error')
    }
  }, [pet, addToast])

  async function handleFeedFinish(score: number, missed: number) {
    setShowFeedGame(false)
    setAlienAnim('eat')
    setShowFoodAnim(true)
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    animTimerRef.current = setTimeout(() => { setShowFoodAnim(false); setAlienAnim('idle') }, 2200)
    await doAction(() => feedTamagotchi(score, missed === 0), 'feed')
  }

  async function handlePlayFinish(score: number) {
    setShowPlayGame(false)
    await doAction(() => playWithTamagotchi(score), 'play')
  }

  async function handleCaresse() {
    if (caressesToday >= caresseLimit) { addToast(`Limite de câlins atteinte (${caresseLimit}/jour) 💔`, 'error'); return }
    setCaresseAnim(true)
    setTimeout(() => {
      setShowHearts(true)
      setTimeout(() => setShowHearts(false), 1500)
      setTimeout(() => setCaresseAnim(false), 1200)
    }, 600)
    await doAction(caresserTamagotchi, 'caresse')
  }

  async function handleNettoyer() {
    await doAction(nettoyerTamagotchi, 'nettoyer')
    if (!loading) addToast('Zone nettoyée ! 🧹', 'success')
  }

  async function handleReveiller() {
    setAlienAnim('wake')
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    animTimerRef.current = setTimeout(() => setAlienAnim('idle'), 800)
    await doAction(reveillerTamagotchi, 'reveiller')
  }

  async function handleName() {
    const res = await nameTamagotchi(nameInput)
    if (res.error) { addToast(res.error, 'error'); return }
    setPet((p: any) => ({ ...p, name: nameInput }))
    setNaming(false)
    addToast('Nom sauvegardé !', 'success')
  }

  async function handleHuntFinish(score: number, caught: boolean) {
    setShowHuntGame(false)
    const res = await huntTamagotchi(score, caught)
    if (res.error) { addToast(res.error, 'error'); return }
    if (res.data) {
      const prev = pet?.stage
      setPet(res.data)
      if (res.data.stage !== prev && res.data.stage !== 'dead') setEvolveStage(res.data.stage)
      if (caught) addToast(`🥚 Chasse réussie ! +${score >= 100 ? 'Score parfait ! ' : ''}XP`, 'success')
      else addToast(`💨 L'humain s'est échappé… +${score} pts`, 'error')
    }
  }

  if (!pet) return <div className="empty">Erreur chargement.</div>

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', paddingBottom: '3rem' }}>
      {evolveStage && <EvolveOverlay stage={evolveStage} onClose={() => setEvolveStage(null)} />}
      {levelUpShow  && <LevelUpOverlay level={levelUpShow} onClose={() => setLevelUpShow(null)} />}

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Alien Tamagotchi</div>
        {/* Meta-infos : âge · streak · level */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text3)', fontSize: '.78rem' }}>⏳ {fmtAge(pet.age_hours)}</span>
          {(pet.care_streak ?? 0) > 0 && (
            <span style={{ color: '#f97316', fontSize: '.78rem' }}>🔥 {pet.care_streak}j de suite</span>
          )}
          <span style={{ color: '#fbbf24', fontSize: '.78rem' }}>
            Nv.{level} · {pet.xp ?? 0} XP
          </span>
          {currentTitle && (
            <span style={{ color: 'var(--text3)', fontSize: '.72rem', fontStyle: 'italic' }}>{currentTitle}</span>
          )}
          {pet.deaths > 0 && <span style={{ color: 'var(--text3)', fontSize: '.72rem' }}>💀 {pet.deaths}×</span>}
          {needsAttention && (
            <span style={{ color: '#ef4444', fontSize: '.78rem', animation: 'tama-poop-warn 0.7s ease-in-out infinite' }}>
              🚨 Attention !
            </span>
          )}
        </div>
      </div>

      {/* ── Mini-jeux ── */}
      {showFeedGame ? (
        <MiniGame stage={pet.stage} feedMode onFinish={handleFeedFinish} onClose={() => setShowFeedGame(false)} />
      ) : showPlayGame ? (
        <GameSelector stage={pet.stage} onFinish={handlePlayFinish} onClose={() => setShowPlayGame(false)} />
      ) : showHuntGame ? (
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#a78bfa' }}>🏹 La Chasse</div>
            <button className="btn btn-outline" style={{ fontSize: '.72rem', padding: '.3rem .7rem' }} onClick={() => setShowHuntGame(false)}>✕ Abandonner</button>
          </div>
          <HuntGame onEnd={handleHuntFinish} />
          <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: '.5rem', textAlign: 'center', lineHeight: 1.6 }}>
            Évitez les obstacles pour vous rapprocher · Attrapez l&apos;humain avant la fin du temps
          </div>
        </div>
      ) : (
        <>
          {/* ── Écran ── */}
          <div style={{
            background: themeStyle?.bg ?? 'var(--bg2)',
            border: `2px solid ${needsAttention ? '#ef444488' : themeStyle?.border ?? screenColor + '44'}`,
            borderRadius: 'var(--rl)',
            boxShadow: needsAttention
              ? '0 0 0 1px #ef444433, 0 0 30px #ef444411, inset 0 0 20px rgba(0,0,0,.3)'
              : `0 0 30px ${screenColor}22, inset 0 0 20px rgba(0,0,0,.3)`,
            animation: needsAttention ? 'tama-attention-pulse 1.4s ease-in-out infinite' : 'none',
            padding: '1.2rem 1.2rem .8rem', marginBottom: '1.5rem',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>

            {/* Événement spatial */}
            {spaceEvent && (
              <div style={{
                position: 'absolute', top: 8, left: 0, right: 0, zIndex: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
                background: 'rgba(0,0,20,.85)', padding: '4px 10px',
                fontSize: '.75rem', color: '#a78bfa',
                animation: 'tama-bubble-in 0.3s ease-out',
              }}>
                <span>{spaceEvent.icon}</span>
                <span>{spaceEvent.text}</span>
              </div>
            )}

            {/* Nom */}
            <div style={{ marginBottom: '.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
              {naming ? (
                <>
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} maxLength={20} autoFocus
                    style={{ background: 'var(--bg3)', border: `1px solid ${screenColor}66`, borderRadius: 6, padding: '.2rem .6rem', color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: '.9rem', textAlign: 'center', width: 140 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleName(); if (e.key === 'Escape') setNaming(false) }}
                  />
                  <button onClick={handleName}             style={iconBtnStyle(screenColor)}>✓</button>
                  <button onClick={() => setNaming(false)} style={iconBtnStyle('var(--text3)')}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: screenColor, cursor: 'pointer' }} onClick={() => setNaming(true)}>
                    {pet.name}
                    {isSick && <span style={{ marginLeft: '.3rem', fontSize: '.7rem' }}>🤒</span>}
                  </span>
                  <span style={{ fontSize: '.65rem', color: 'var(--text3)', cursor: 'pointer' }} onClick={() => setNaming(true)}>✏️</span>
                </>
              )}
            </div>

            {/* Arène */}
            <div style={{ position: 'relative', height: '185px', margin: '0.4rem 0', overflow: 'hidden' }}>
              {/* Crottes */}
              {poopPositions.map((pos, i) => (
                <div key={i} style={{
                  position: 'absolute', left: `${pos.x}%`, bottom: `${pos.y}%`,
                  fontSize: '1.25rem', animation: 'tama-poop-appear 0.5s ease-out', zIndex: 1,
                  filter: poopCount >= 3 ? 'drop-shadow(0 0 4px #f59e0b)' : 'none',
                }}>💩</div>
              ))}

              {/* Nourriture en vol */}
              {showFoodAnim && (
                <div style={{
                  position: 'absolute', right: '12%', top: '25%',
                  fontSize: '1.7rem', animation: 'tama-food-fly 1.8s ease-in-out forwards',
                  zIndex: 3, pointerEvents: 'none',
                }}>🥩</div>
              )}

              {/* Bulle d'humeur */}
              {moodBubble && !isSleeping && (
                <div style={{
                  position: 'absolute', top: 6, right: 8,
                  background: 'rgba(0,0,0,0.82)', border: `1px solid ${screenColor}55`,
                  borderRadius: '10px 10px 0 10px', padding: '3px 9px',
                  fontSize: '.78rem', zIndex: 5,
                  animation: 'tama-bubble-in 0.25s ease-out', whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>{moodBubble}</div>
              )}

              {/* L'alien */}
              <div style={{
                position: 'absolute', bottom: '18px',
                left: isSleeping ? '30%' : `${alienLeft}%`,
                transition: `left ${isSleeping ? 0.5 : alienMoveDur}s ease-in-out`,
                zIndex: 2,
              }}>
                <div style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 'clamp(.65rem,2vw,.8rem)',
                  lineHeight: 1.45,
                  color: isDead ? '#6b7280' : isSick ? '#86efac' : screenColor,
                  textShadow: isDead ? 'none' : isSick ? '0 0 8px #86efac66' : `0 0 8px ${screenColor}66`,
                  display: 'inline-block', textAlign: 'left',
                  animation: alienAnimCss,
                  filter: alienFilter,
                  transformOrigin: 'center bottom',
                }}>
                  {frame.map((line, i) => <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>)}
                </div>
                <FloatingHearts visible={showHearts} />
                {caresseAnim && (
                  <div style={{ position: 'absolute', right: '-12px', top: '25%', fontSize: '1.6rem', animation: 'tama-hand-pet .6s ease-in-out', pointerEvents: 'none' }}>🤚</div>
                )}
              </div>

              {/* Overlay sommeil */}
              {isSleeping && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,30,0.72)', borderRadius: 8, zIndex: 6,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '2.2rem', animation: 'tama-zzz-float 2.5s ease-in-out infinite' }}>💤</div>
                  <div style={{ color: '#8888cc', fontSize: '.82rem', marginTop: '.3rem', fontFamily: 'var(--font-display)' }}>Zzzz...</div>
                  <div style={{ color: '#5555aa', fontSize: '.65rem', marginTop: '.15rem' }}>
                    Énergie : {pet.energy ?? 0}/100
                  </div>
                </div>
              )}
            </div>

            {/* Stage + desc */}
            <div style={{ marginTop: '.6rem' }}>
              <div style={{ display: 'inline-block', fontSize: '.7rem', fontWeight: 600, color: isSick ? '#86efac' : screenColor, border: `1px solid ${isSick ? '#86efac44' : screenColor + '44'}`, borderRadius: 99, padding: '2px 10px', marginBottom: '.4rem' }}>
                {stageInfo?.label ?? pet.stage}{isSick ? ' · 🤒 Malade' : ''}
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.5, padding: '0 .5rem' }}>{stageInfo?.desc}</div>
            </div>

            {moodLabel && <div style={{ marginTop: '.4rem', fontSize: '.75rem', color: 'var(--text3)' }}>{moodLabel}</div>}

            {/* Alerte crottes */}
            {poopCount > 0 && !isDead && (
              <div style={{
                marginTop: '.5rem', fontSize: '.72rem',
                color: poopCount >= 3 ? '#f59e0b' : '#a78bfa',
                animation: poopCount >= 3 ? 'tama-poop-warn 0.9s ease-in-out infinite' : 'none',
              }}>
                {'💩'.repeat(Math.min(poopCount, 5))}
                {poopCount >= 3 ? ' La santé diminue !' : ' À nettoyer…'}
              </div>
            )}
          </div>

          {/* ── Stats ── */}
          {!isDead && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem 1.2rem', marginBottom: '1.2rem' }}>
              <StatBar label="Satiété"  value={100 - pet.hunger}  color="#f97316" icon="🥩" pulse />
              <StatBar label="Humeur"   value={pet.happiness}      color="#a78bfa" icon="😊" pulse />
              <StatBar label="Santé"    value={pet.health}         color="#22d3ee" icon="❤️" pulse />
              <StatBar label="Énergie"  value={pet.energy ?? 100}  color="#facc15" icon="⚡"
                pulse={(pet.energy ?? 100) < 25}
              />
            </div>
          )}

          {/* ── Actions ── */}
          {isDead ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text3)', fontSize: '.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                Dans l&apos;espace, personne ne peut entendre ton alien pleurer.<br />
                <span style={{ fontSize: '.75rem' }}>Morts : {pet.deaths}</span>
              </div>
              <button className="btn btn-gold" disabled={loading === 'revive'} onClick={() => doAction(reviveTamagotchi, 'revive')}>
                {loading === 'revive' ? '⏳' : '🔄 Réincarner'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '1.2rem' }}>

              {/* ── Dormir / Réveiller ── full-width */}
              {isSleeping ? (
                <button className="btn btn-outline" disabled={loading === 'reveiller'} onClick={handleReveiller}
                  style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem', background: 'rgba(136,136,204,.08)', borderColor: '#8888cc66', color: '#aaaaee' }}>
                  <span style={{ fontSize: '1.4rem' }}>☀️</span>
                  <span style={{ fontSize: '.75rem' }}>Réveiller</span>
                  <span style={{ fontSize: '.62rem', color: '#8888aa' }}>Énergie {pet.energy ?? 0}/100</span>
                </button>
              ) : (pet.energy ?? 100) <= 30 ? (
                <button className="btn btn-outline" disabled={loading === 'dormir'} onClick={() => doAction(dormirTamagotchi, 'dormir')}
                  style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem', background: 'rgba(250,204,21,.06)', borderColor: '#facc1566', color: '#facc15', animation: 'tama-poop-warn 1.2s ease-in-out infinite' }}>
                  <span style={{ fontSize: '1.4rem' }}>💤</span>
                  <span style={{ fontSize: '.75rem' }}>Mettre au dodo — épuisé !</span>
                </button>
              ) : null}

              {/* ── Guérir ── full-width si malade */}
              {isSick && (
                <button className="btn btn-outline" disabled={loading === 'guerir'} onClick={() => doAction(guerirTamagotchi, 'guerir')}
                  style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem', background: 'rgba(134,239,172,.07)', borderColor: '#86efac66', color: '#86efac', animation: 'tama-poop-warn 1s ease-in-out infinite' }}>
                  <span style={{ fontSize: '1.4rem' }}>💉</span>
                  <span style={{ fontSize: '.75rem' }}>Soigner la maladie (+12 XP)</span>
                </button>
              )}

              {/* ── Nettoyer ── */}
              {poopCount > 0 && (
                <button className="btn btn-outline" disabled={loading === 'nettoyer' || isSleeping} onClick={handleNettoyer}
                  style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem', background: 'rgba(251,191,36,.07)', borderColor: '#fbbf2466', color: '#fbbf24', animation: poopCount >= 3 ? 'tama-poop-warn 0.9s ease-in-out infinite' : 'none' }}>
                  <span style={{ fontSize: '1.4rem' }}>🧹</span>
                  <span style={{ fontSize: '.75rem' }}>Nettoyer ({poopCount} crotte{poopCount > 1 ? 's' : ''}) · +8 XP</span>
                </button>
              )}

              {/* ── Nourrir ── */}
              <button className="btn btn-outline" disabled={loading === 'feed' || feedCd > 0 || isSleeping} onClick={() => feedCd <= 0 && !isSleeping && setShowFeedGame(true)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem', opacity: isSleeping ? 0.4 : 1 }}>
                <span style={{ fontSize: '1.4rem' }}>🥩</span>
                <span style={{ fontSize: '.75rem' }}>Nourrir · +15 XP</span>
                {feedCd > 0 && <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{fmtCooldown(feedCd)}</span>}
                {isSleeping && <span style={{ fontSize: '.6rem', color: '#8888aa' }}>dort…</span>}
              </button>

              {/* ── Jouer ── */}
              <button className="btn btn-outline" disabled={loading === 'play' || isSleeping} onClick={() => !isSleeping && setShowPlayGame(true)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem', opacity: isSleeping ? 0.4 : 1 }}>
                <span style={{ fontSize: '1.4rem' }}>🎮</span>
                <span style={{ fontSize: '.75rem' }}>Jouer · +XP</span>
                {isSleeping && <span style={{ fontSize: '.6rem', color: '#8888aa' }}>dort…</span>}
              </button>

              {/* ── Câliner ── */}
              <button className="btn btn-outline" disabled={loading === 'caresse' || caressesToday >= caresseLimit} onClick={handleCaresse}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem', opacity: caressesToday >= caresseLimit ? 0.5 : 1 }}>
                <span style={{ fontSize: '1.4rem' }}>🤚</span>
                <span style={{ fontSize: '.75rem' }}>Câliner · +3 XP</span>
                <span style={{ fontSize: '.6rem', color: caressesToday >= caresseLimit ? '#ef4444' : 'var(--text3)' }}>
                  {caressesToday}/{caresseLimit} aujourd&apos;hui
                </span>
              </button>

              {/* ── Soigner (santé) ── */}
              {pet.health < 80 && (
                <button className="btn btn-outline" disabled={loading === 'heal' || healCd > 0} onClick={() => doAction(healTamagotchi, 'heal')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>💊</span>
                  <span style={{ fontSize: '.75rem' }}>Soigner · +10 XP</span>
                  {healCd > 0 && <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{fmtCooldown(healCd)}</span>}
                </button>
              )}

              {/* ── Dormir manuellement — débloqué au niveau 4 ── */}
              {!isSleeping && level >= 4 && (pet.energy ?? 100) > 30 && (
                <button className="btn btn-outline" disabled={loading === 'dormir'} onClick={() => doAction(dormirTamagotchi, 'dormir')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.7rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>💤</span>
                  <span style={{ fontSize: '.75rem' }}>Dormir</span>
                  <span style={{ fontSize: '.6rem', color: 'var(--text3)' }}>⚡ {pet.energy ?? 100}/100</span>
                </button>
              )}

              {/* ── LA CHASSE (xenomorph uniquement) ── */}
              {pet.stage === 'xenomorph' && (
                <button className="btn btn-outline" disabled={huntCd > 0 || isSleeping || loading === 'hunt'}
                  onClick={() => !isSleeping && huntCd <= 0 && setShowHuntGame(true)}
                  style={{
                    gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '.2rem', padding: '.9rem',
                    background: 'rgba(167,139,250,.08)', borderColor: '#a78bfa66', color: '#a78bfa',
                    opacity: huntCd > 0 || isSleeping ? 0.55 : 1,
                  }}>
                  <span style={{ fontSize: '1.6rem' }}>🏹</span>
                  <span style={{ fontSize: '.8rem', fontWeight: 600 }}>La Chasse</span>
                  {huntCd > 0
                    ? <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>Disponible dans {fmtCooldown(huntCd)}</span>
                    : isSleeping
                    ? <span style={{ fontSize: '.62rem', color: '#8888aa' }}>dort…</span>
                    : <span style={{ fontSize: '.65rem', color: '#c4b5fd' }}>Course-poursuite · +XP · +Humeur</span>
                  }
                </button>
              )}
            </div>
          )}

          {/* ── Accessories shelf ── */}
          {accessories.length > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.8rem 1rem', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: '.6rem' }}>🏠 Salle des trophées</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                {accessories.map(a => (
                  <span key={a.id} title={a.name} style={{ fontSize: '1.5rem', cursor: 'default', filter: `drop-shadow(0 0 4px ${screenColor}44)` }}>{a.emoji}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── Récompenses de niveau ── */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.8rem 1rem', marginBottom: '1.2rem' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: '.65rem' }}>🎁 Récompenses de niveau</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              {Object.entries(LEVEL_REWARDS).map(([lvlStr, r]) => {
                const lvl = Number(lvlStr)
                const unlocked = level >= lvl
                return (
                  <div key={lvl} style={{
                    display: 'flex', alignItems: 'center', gap: '.6rem',
                    opacity: unlocked ? 1 : 0.38,
                    filter: unlocked ? 'none' : 'grayscale(0.6)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: unlocked ? 'rgba(251,191,36,.15)' : 'var(--bg3)',
                      border: `1px solid ${unlocked ? 'rgba(251,191,36,.4)' : 'var(--border2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.78rem', fontFamily: 'var(--font-display)', color: unlocked ? '#fbbf24' : 'var(--text3)',
                    }}>
                      {unlocked ? '✓' : lvl}
                    </div>
                    <span style={{ fontSize: '1rem' }}>{r.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.78rem', color: unlocked ? 'var(--text)' : 'var(--text3)', fontWeight: unlocked ? 500 : 400 }}>{r.label}</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--text3)' }}>{r.desc}</div>
                    </div>
                    {unlocked && <span style={{ fontSize: '.65rem', color: '#4ade80', flexShrink: 0 }}>✓</span>}
                    {!unlocked && <span style={{ fontSize: '.65rem', color: 'var(--text3)', flexShrink: 0 }}>Nv.{lvl}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Personnalité ── */}
          {personality && pet.stage !== 'egg' && (
            <div style={{ background: 'var(--bg2)', border: `1px solid ${personality.color}33`, borderRadius: 'var(--r)', padding: '.8rem 1rem', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: '.4rem' }}>🧬 Personnalité</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: personality.color }}>{personality.label}</span>
                <span style={{ fontSize: '.72rem', color: 'var(--text3)', lineHeight: 1.4 }}>{personality.desc}</span>
              </div>
            </div>
          )}

          {/* ── Achievements ── */}
          {petAchievements.length > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.8rem 1rem', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: '.6rem' }}>🏆 Succès</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                {petAchievements.map(id => {
                  const a = ACHIEVEMENTS[id]
                  if (!a) return null
                  return (
                    <div key={id} title={a.desc} style={{
                      display: 'flex', alignItems: 'center', gap: '.35rem',
                      background: 'var(--bg3)', border: '1px solid var(--border2)',
                      borderRadius: 99, padding: '3px 10px',
                      fontSize: '.72rem', color: 'var(--text2)',
                    }}>
                      <span>{a.icon}</span>
                      <span>{a.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Widget toggle ── */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.8rem 1rem', marginBottom: '1.2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.7rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={widgetEnabled} onChange={e => setWidgetEnabled(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: screenColor }} />
              <div>
                <div style={{ fontSize: '.82rem', fontWeight: 500 }}>Afficher mon alien en bas à droite</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>Visible sur toutes les pages du site</div>
              </div>
            </label>
          </div>

          {/* ── Admin panel ── */}
          {isAdmin && (
            <div style={{ padding: '.75rem 1rem', borderRadius: 'var(--r)', background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.25)', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '.68rem', color: '#ef4444', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: '.6rem' }}>⚡ Admin</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem' }}>
                {[
                  { key: 'adm_evolve', label: '🔄 Évoluer',  color: '#a78bfa', fn: adminEvolveAlien,   toast: (d: any) => `🔄 → ${d.stage}` },
                  { key: 'adm_age',    label: '⏩ Vieillir', color: '#f97316', fn: adminAgeAlien,      toast: (d: any) => `⏩ ${d.age_hours}h` },
                  { key: 'adm_kill',   label: '💀 Tuer',     color: '#ef4444', fn: adminKillAlien,     toast: () => '💀 Tué.' },
                ].map(({ key, label, color, fn, toast }) => (
                  <button key={key} className="btn btn-outline" style={{ fontSize: '.72rem', padding: '.45rem .4rem', borderColor: color + '44', color }}
                    disabled={loading === key}
                    onClick={async () => {
                      setLoading(key); const r = await fn(); setLoading(null)
                      if (r.error) { addToast(r.error, 'error'); return }
                      if (r.data) { setPet(r.data); addToast(toast(r.data), 'success') }
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* Test V2 */}
              <div style={{ marginTop: '.5rem', paddingTop: '.5rem', borderTop: '1px solid rgba(239,68,68,.15)', fontSize: '.62rem', color: 'rgba(239,68,68,.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: '.4rem' }}>
                🧪 Test V2
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                {[
                  { key: 'adm_poop',     label: '💩 +Crotte',         color: '#fbbf24', fn: adminAddPoop,       toast: (d: any) => `💩 ×${d.poop_count}` },
                  { key: 'adm_caresse',  label: '🤚 Reset câlins',     color: '#6ee7b7', fn: adminResetCaresses, toast: () => '🔄 0/5' },
                  { key: 'adm_sick',     label: '🦠 Toggle malade',    color: '#86efac', fn: adminToggleSick,    toast: (d: any) => d.is_sick ? '🤒 Malade' : '✅ Guéri' },
                  { key: 'adm_sleep',    label: '💤 Toggle sommeil',   color: '#8888cc', fn: adminToggleSleep,   toast: (d: any) => d.is_sleeping ? '💤 Dort' : '☀️ Réveillé' },
                  { key: 'adm_energy',   label: '⚡ -40 Énergie',      color: '#facc15', fn: adminDrainEnergy,   toast: (d: any) => `⚡ ${d.energy}/100` },
                ].map(({ key, label, color, fn, toast }) => (
                  <button key={key} className="btn btn-outline" style={{ fontSize: '.72rem', padding: '.45rem .4rem', borderColor: color + '44', color }}
                    disabled={loading === key}
                    onClick={async () => {
                      setLoading(key); const r = await fn(); setLoading(null)
                      if (r.error) { addToast(r.error, 'error'); return }
                      if (r.data) { setPet(r.data); addToast(toast(r.data), 'success') }
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* Test V3 */}
              <div style={{ marginTop: '.5rem', paddingTop: '.5rem', borderTop: '1px solid rgba(239,68,68,.15)', fontSize: '.62rem', color: 'rgba(239,68,68,.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: '.4rem' }}>
                🧪 Test V3
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                {[
                  { key: 'adm_hunt',      label: '🏹 Activer Chasse',    color: '#a78bfa', fn: adminTestHunt,      toast: () => '🏹 Xénomorphe + cooldown reset' },
                  { key: 'adm_checkin',   label: '✨ Reset Check-in',     color: '#22d3ee', fn: adminResetCheckin,  toast: () => '✨ Check-in réinitialisé' },
                ].map(({ key, label, color, fn, toast }) => (
                  <button key={key} className="btn btn-outline" style={{ fontSize: '.72rem', padding: '.45rem .4rem', borderColor: color + '44', color }}
                    disabled={loading === key}
                    onClick={async () => {
                      setLoading(key); const r = await fn(); setLoading(null)
                      if (r.error) { addToast(r.error, 'error'); return }
                      if (r.data) { setPet(r.data); addToast(toast(), 'success') }
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Info ── */}
          <div style={{ padding: '.75rem 1rem', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border2)', fontSize: '.72rem', color: 'var(--text3)', lineHeight: 1.7 }}>
            💡 Énergie se vide en ~14h. Laisse-le dormir 5h pour la recharger. 60% de chance de crotte après repas. Maladie si trop affamé. 3 câlins max/jour — les mini-jeux remontent l&apos;humeur sans limite.
          </div>
        </>
      )}

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes tama-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-4px) scale(1.025); }
        }
        @keyframes tama-walk {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25%       { transform: translateY(-6px) rotate(-1.5deg); }
          75%       { transform: translateY(-3px) rotate(1.5deg); }
        }
        @keyframes tama-happy-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          20%       { transform: translateY(-16px) scale(1.07); }
          40%       { transform: translateY(0) scale(0.97); }
          60%       { transform: translateY(-9px) scale(1.04); }
          80%       { transform: translateY(0) scale(1); }
        }
        @keyframes tama-sad-droop {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          30%       { transform: translateX(-4px) rotate(-1.2deg); }
          70%       { transform: translateX(4px) rotate(1.2deg); }
        }
        @keyframes tama-dying-shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-6px) rotate(-2deg); }
          75%       { transform: translateX(6px) rotate(2deg); }
        }
        @keyframes tama-eat {
          0%, 100% { transform: scale(1) translateY(0); }
          20%       { transform: scale(1.14) translateY(-4px); }
          50%       { transform: scale(0.9) translateY(3px); }
          80%       { transform: scale(1.06) translateY(-2px); }
        }
        @keyframes tama-sick-wobble {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          20%       { transform: rotate(-3deg) translateX(-3px); }
          40%       { transform: rotate(3deg) translateX(3px); }
          60%       { transform: rotate(-2deg) translateX(-2px); }
          80%       { transform: rotate(2deg) translateX(2px); }
        }
        @keyframes tama-sleep-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(3px) scale(0.97); }
        }
        @keyframes tama-wake-up {
          0%   { transform: scale(0.9) rotate(-5deg); }
          40%  { transform: scale(1.12) rotate(3deg); }
          70%  { transform: scale(0.96) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes tama-pet-glow {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 0px transparent); }
          50%       { filter: brightness(1.6) drop-shadow(0 0 12px #ff88ffaa); }
        }
        @keyframes tama-zzz-float {
          0%   { transform: translateY(0) scale(1); opacity: 0.7; }
          50%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 0.7; }
        }
        @keyframes tama-poop-appear {
          0%   { transform: scale(0) rotate(-30deg) translateY(-8px); opacity: 0; }
          65%  { transform: scale(1.25) rotate(6deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes tama-poop-warn {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes tama-attention-pulse {
          0%, 100% { box-shadow: 0 0 0 1px #ef444433, 0 0 30px #ef444411, inset 0 0 20px rgba(0,0,0,.3); }
          50%       { box-shadow: 0 0 0 2px #ef444466, 0 0 40px #ef444422, inset 0 0 20px rgba(0,0,0,.3); }
        }
        @keyframes tama-food-fly {
          0%   { transform: translateX(0) translateY(0) scale(1.2) rotate(0deg); opacity: 1; }
          70%  { transform: translateX(-110px) translateY(20px) scale(0.85) rotate(-15deg); opacity: 0.7; }
          100% { transform: translateX(-160px) translateY(35px) scale(0.5) rotate(-25deg); opacity: 0; }
        }
        @keyframes tama-bubble-in {
          0%   { transform: scale(0.6) translateY(-6px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes tama-heart-float {
          0%   { opacity: 0; transform: translateY(0) scale(.6); }
          20%  { opacity: 1; transform: translateY(-10px) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(.8); }
        }
        @keyframes tama-hand-pet {
          0%   { transform: translateX(40px) rotate(-20deg); opacity: 0; }
          30%  { transform: translateX(0px) rotate(10deg); opacity: 1; }
          60%  { transform: translateX(-8px) rotate(-5deg); opacity: 1; }
          100% { transform: translateX(40px) rotate(-20deg); opacity: 0; }
        }
        @keyframes tama-levelup-pop {
          0%   { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function iconBtnStyle(color: string): React.CSSProperties {
  return { background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', color }
}
