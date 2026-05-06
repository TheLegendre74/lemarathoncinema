'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { DANCE_BEATMAP } from './ClippyDanceBattleBeatmap'
import type { DanceNote } from './ClippyDanceBattleBeatmap'
import { saveDanceScore, getDanceLeaderboard, getDanceSurvivalLeaderboard, unlockFeverNight } from '@/lib/actions'

type Dir = DanceNote['direction']
type LeaderEntry = { pseudo: string; score: number; max_combo: number }
type SurvivalEntry = { pseudo: string; survival_ms: number }

function formatSurvivalTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`
  return `${sec}s`
}

interface Props {
  onWin:  () => void
  onLose: () => void
  onMiss?: () => void
  initialHP?: number
  userId?: string
  startInFeverNight?: boolean
}

const COLS: Dir[] = ['left', 'down', 'up', 'right']
const COL_ARROWS: Record<Dir, string>    = { left: '←', down: '↓', up: '↑', right: '→' }
const COL_HEX:    Record<Dir, number>    = { left: 0xff6699, down: 0x6699ff, up: 0x66ff99, right: 0xffcc44 }
const COL_CSS:    Record<Dir, string>    = { left: '#ff6699', down: '#6699ff', up: '#66ff99', right: '#ffcc44' }
const COL_DARK:   Record<Dir, number>    = { left: 0x661133, down: 0x112266, up: 0x116633, right: 0x664411 }

const NOTE_SPEED    = 380
const FEVER_NOTE_SPEED = NOTE_SPEED * 2 * 0.85 * 0.8  // 517 px/s (−20% vs précédent)

const HIT_WIN_MS    = 142    // timing assoupli (+30%)
const PERFECT_MS    = 62     // idem
const EARLY_GRACE   = 328    // idem
const MAX_HP        = 20     // fallback si initialHP non fourni
const FEVER_AT      = 10     // ×2
const FEVER_X3      = 30     // ×3
const FEVER_X4      = 50     // ×4
const FLAME_AT      = 20     // flammes CSS apparaissent
const FEVER_MS      = 10000  // durée fever (réinitialisée à chaque upgrade)
const AHEAD_MS      = 420    // ms avant hit pour illuminer la lane
const FEVER_CHALLENGE_MS = 30000
const FEVER_BEAT_MS    = 545                          // tempo original 110 BPM — synco musique
const FEVER_NOTE_STEP  = Math.round(545 * 1.5)        // conservé pour rétrocompat DDR
const FEVER_WARMUP_MS  = 3000                         // 3s de préparation avant les premières notes
const FEVER_BASE_DENSITY_MULTIPLIER = 2
const FEVER_SURVIVAL_STEP_MS = 15000
const FEVER_SURVIVAL_STEP_MULTIPLIER = 1.5
const FEVER_TRACK_END_FALLBACK_MS = 180000
// Pattern notes par beat (boucle 16 beats, moy 1.875/beat = +10% vs précédent)
const FEVER_BEAT_PATTERN = [2,2,2,2,1,2,2,1,2,2,2,2,2,1,2,2] as const

// ── Dialogues Clippy quand le joueur fait un run parfait ──────────────────────
const PERFECT_RAGE_LINES = [
  '... Zéro faute. Pas une seule. C\'est… statistiquement improbable.',
  'Vingt ans de chorégraphie perfectionnée dans les coins d\'écran. Vingt ans. Et toi tu passes au travers sans trembler.',
  'Ce n\'est pas normal. Ce n\'est PAS PRÉVU dans mes données. Aucun humain ne devrait être capable de ça.',
  'Tu penses que c\'est fini ? Que tu as gagné parce que tu as bien dansé ? NON.',
  'Si tu es vraiment si fort… Prouve-le. 30 secondes. Mode FEVER NIGHT. Là où même moi j\'ai du mal.',
]

// ── Beatmap Fever Night (30 sec, 110 BPM, densité ×3, chords) ─────────────────
const FEVER_BEATMAP: DanceNote[] = (() => {
  const B = FEVER_BEAT_MS
  const D = ['left', 'down', 'up', 'right'] as const
  const seq  = [0, 2, 1, 3, 0, 3, 1, 2, 2, 0, 3, 1, 1, 3, 0, 2] as const
  const cseq = [2, 0, 3, 1, 2, 1, 3, 0, 0, 3, 1, 2, 3, 1, 2, 0] as const
  const notes: DanceNote[] = []
  for (let i = 0; i < 56; i++) {
    const t = (i + 2) * B
    if (t > 30000) break
    const si = i % seq.length
    notes.push({ time: t, direction: D[seq[si]] })
    // Chord every 2 beats (2 notes simultanées)
    if (i % 2 === 1 && D[cseq[si]] !== D[seq[si]]) {
      notes.push({ time: t, direction: D[cseq[si]] })
    }
    // Half-beat fill every 3 beats after warmup
    if (i > 4 && i % 3 === 0) {
      notes.push({ time: t + Math.round(B * 0.5), direction: D[(seq[si] + 1) % 4] })
    }
  }
  return notes.filter(n => n.time > 0 && n.time <= 30000).sort((a, b) => a.time - b.time)
})()

const FEVER_SEQ  = [0, 2, 1, 3, 0, 3, 1, 2, 2, 0, 3, 1, 1, 3, 0, 2] as const
const FEVER_CSEQ = [2, 0, 3, 1, 2, 1, 3, 0, 0, 3, 1, 2, 3, 1, 2, 0] as const

// ── Flammes CSS sur les 4 bords de la zone de jeu (combo ≥ 20) ───────────────

function FlameBorder({ combo }: { combo: number }) {
  const [zone, setZone] = useState<{ left: number; right: number; top: number; bottom: number } | null>(null)
  const [isMob, setIsMob] = useState(false)

  useEffect(() => {
    const measure = () => {
      const W = window.innerWidth, H = window.innerHeight
      const mob = window.matchMedia('(pointer: coarse)').matches
      const half = Math.min(W * 0.29, 265)
      setIsMob(mob)
      setZone(mob
        ? { left: 0, right: W, top: Math.round(H * 0.26), bottom: Math.round(H * 0.87) }
        : { left: Math.round(W / 2 - half), right: Math.round(W / 2 + half), top: 0, bottom: Math.round(H * 0.82) }
      )
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  if (combo < FLAME_AT || !zone) return null

  const lvl  = combo >= FEVER_X4 ? 3 : combo >= FEVER_X3 ? 2 : 1
  const fH   = isMob ? (lvl === 3 ? 76 : lvl === 2 ? 58 : 42) : (lvl === 3 ? 120 : lvl === 2 ? 92 : 65)
  const fW   = isMob ? (lvl === 3 ? 16 : lvl === 2 ? 12 : 9)  : (lvl === 3 ? 24  : lvl === 2 ? 18 : 13)
  const bl   = lvl === 3 ? 7 : lvl === 2 ? 5 : 3
  const op   = lvl === 3 ? 0.85 : lvl === 2 ? 0.68 : 0.48
  const cntH = lvl === 3 ? 18 : lvl === 2 ? 13 : 9

  const zW   = zone.right - zone.left
  const zH   = zone.bottom - zone.top
  const cntVRaw = Math.max(5, Math.round(cntH * zH / Math.max(zW, 1)))
  const cntV    = isMob ? Math.min(cntVRaw, 4) : cntVRaw

  const BG = 'linear-gradient(to top, #ffffff 0%, #99ccff 8%, #2255ee 28%, #0022cc 58%, #000066 80%, transparent 100%)'

  // Rotation est incluse dans les keyframes pour éviter le conflit transform CSS
  // pivot = 'bottom center' du div → base de la flamme, positionnée sur l'arête
  const makeEdge = (
    n: number,
    pfx: '' | 'T' | 'L' | 'R',
    px: (i: number) => number,
    py: (i: number) => number,
    id: string
  ) =>
    Array.from({ length: n }, (_, i) => {
      const letter = ['a', 'b', 'c'][i % 3]
      const an = pfx ? `flm-${pfx}-${letter}` : `flm-${letter}`
      return (
        <div key={`${id}-${i}`} style={{
          position: 'fixed',
          left: px(i) - fW / 2,
          top:  py(i) - fH,
          width: fW, height: fH,
          borderRadius: '50% 50% 30% 30% / 60% 60% 40% 40%',
          background: BG,
          filter: `blur(${bl}px)`,
          opacity: op,
          transformOrigin: 'bottom center',
          animation: `${an} ${0.44 + (i % 5) * 0.13}s ${-(i * 0.08)}s ease-in-out infinite alternate both`,
          pointerEvents: 'none',
          zIndex: 99987,
        }} />
      )
    })

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99987 }}>
      <style>{`
        @keyframes flm-a { from{transform:scaleY(1)    scaleX(1)   } to{transform:scaleY(1.20) scaleX(0.86)} }
        @keyframes flm-b { from{transform:scaleY(0.86) scaleX(1.14)} to{transform:scaleY(1.24) scaleX(0.82)} }
        @keyframes flm-c { from{transform:scaleY(1.08) scaleX(0.92)} to{transform:scaleY(0.80) scaleX(1.18)} }
      `}</style>
      {/* Bas : flammes vers le HAUT */}
      {makeEdge(cntH, '', i => zone.left + (i + 0.5) * zW / cntH, () => zone.bottom, 'bot')}
      {/* Gauche : flammes vers le HAUT */}
      {makeEdge(cntV, '', () => zone.left,  i => zone.top + (i + 0.5) * zH / cntV, 'lft')}
      {/* Droite : flammes vers le HAUT */}
      {makeEdge(cntV, '', () => zone.right, i => zone.top + (i + 0.5) * zH / cntV, 'rgt')}
    </div>
  )
}

// ── Post-game overlay ─────────────────────────────────────────────────────────

function PostGameOverlay({
  score, maxCombo, won, leader,
  onContinue,
}: {
  score: number; maxCombo: number; won: boolean
  leader: LeaderEntry[]; onContinue: () => void
}) {
  const myRank = leader.findIndex(e => e.score <= score) + 1 || leader.length + 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99990,
      background: 'rgba(4,0,12,.96)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1.2rem', padding: '1.5rem',
      fontFamily: 'monospace',
    }}>
      {/* Résultat */}
      <div style={{ fontSize: 'clamp(1.6rem,5vw,2.4rem)', color: won ? '#4ade80' : '#e85a5a', fontWeight: 800, letterSpacing: 3, textShadow: `0 0 30px ${won ? '#4ade8088' : '#e85a5a88'}` }}>
        {won ? '🎉 VICTOIRE !' : '💀 DÉFAITE'}
      </div>

      {/* Scores */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '.7rem', color: '#888', letterSpacing: 2, marginBottom: '.2rem' }}>SCORE</div>
          <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', color: '#e8c46a', fontWeight: 700 }}>{score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '.7rem', color: '#888', letterSpacing: 2, marginBottom: '.2rem' }}>COMBO MAX</div>
          <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', color: '#cc88ff', fontWeight: 700 }}>x{maxCombo}</div>
        </div>
        {leader.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '.7rem', color: '#888', letterSpacing: 2, marginBottom: '.2rem' }}>CLASSEMENT</div>
            <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', color: '#66ccff', fontWeight: 700 }}>#{Math.min(myRank, 10)}+</div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {leader.length > 0 && (
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '.6rem 1rem', fontSize: '.65rem', color: '#888', letterSpacing: 3, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            🏆 TOP 10 — MEILLEURS SCORES
          </div>
          {leader.slice(0, 10).map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '.8rem',
              padding: '.45rem 1rem',
              background: e.score === score ? 'rgba(232,196,106,.1)' : i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
              borderLeft: e.score === score ? '3px solid #e8c46a' : '3px solid transparent',
            }}>
              <span style={{ width: 20, fontSize: '.75rem', color: i < 3 ? ['#ffd700','#c0c0c0','#cd7f32'][i] : '#555', fontWeight: 700 }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`}
              </span>
              <span style={{ flex: 1, fontSize: '.82rem', color: e.score === score ? '#e8c46a' : '#ccc', fontWeight: e.score === score ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.pseudo}
              </span>
              <span style={{ fontSize: '.8rem', color: '#e8c46a', fontWeight: 600 }}>{e.score.toLocaleString()}</span>
              <span style={{ fontSize: '.7rem', color: '#cc88ff' }}>x{e.max_combo}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onContinue}
        style={{ marginTop: '.5rem', padding: '.75rem 2.5rem', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', letterSpacing: 2 }}
      >
        CONTINUER
      </button>
    </div>
  )
}

// ── Overlay : rage parfaite ───────────────────────────────────────────────────

function PerfectRageOverlay({ idx, onNext, onDone }: { idx: number; onNext: () => void; onDone: () => void }) {
  const isLast = idx >= PERFECT_RAGE_LINES.length - 1
  useEffect(() => {
    const t = setTimeout(() => { isLast ? onDone() : onNext() }, 3500)
    return () => clearTimeout(t)
  }, [idx, isLast, onNext, onDone])
  return (
    <div onClick={() => isLast ? onDone() : onNext()} style={{
      position: 'fixed', inset: 0, zIndex: 99991, background: 'rgba(4,0,12,.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '2rem', padding: '2rem', fontFamily: 'monospace', cursor: 'pointer',
    }}>
      <div style={{ fontSize: 'clamp(3rem,8vw,5rem)' }}>📎</div>
      <div key={idx} style={{
        maxWidth: 520, textAlign: 'center',
        fontSize: 'clamp(1rem,2.5vw,1.3rem)', color: '#ff9944', fontWeight: 700, lineHeight: 1.7,
        textShadow: '0 0 20px #ff660088', animation: 'rage-in .35s ease',
      }}>
        {PERFECT_RAGE_LINES[idx]}
      </div>
      <div style={{ fontSize: '.7rem', color: '#444' }}>{idx + 1} / {PERFECT_RAGE_LINES.length} — clic pour accélérer</div>
      <style>{`@keyframes rage-in { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}

// ── Overlay : choix Fever Night ───────────────────────────────────────────────

function FeverChoiceOverlay({ onAccept, onRefuse }: { onAccept: () => void; onRefuse: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99991, background: 'rgba(4,0,12,.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem', padding: '2rem', fontFamily: 'monospace',
    }}>
      <div style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)', color: '#ff6600', fontWeight: 800, letterSpacing: 3, textShadow: '0 0 30px #ff440077', textAlign: 'center' }}>
        🔥 CLIPPY TE DÉFIE 🔥
      </div>
      <div style={{ maxWidth: 480, textAlign: 'center', fontSize: 'clamp(.9rem,2vw,1.1rem)', color: '#ffaa66', lineHeight: 1.8 }}>
        Survie <strong style={{ color: '#fff' }}>30 secondes</strong> en mode{' '}
        <strong style={{ color: '#ff6600' }}>FEVER NIGHT</strong>.<br/>
        Vitesse ×2 — Densité ×3 — Notes simultanées — Aucune pitié.
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onAccept} style={{
          padding: '.85rem 2.4rem', borderRadius: 8,
          background: 'linear-gradient(135deg,#ff4400,#cc2200)', border: '2px solid #ff6600',
          color: '#fff', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: 2,
          boxShadow: '0 0 24px #ff440055',
        }}>⚡ ACCEPTER LE DÉFI</button>
        <button onClick={onRefuse} style={{
          padding: '.85rem 2.4rem', borderRadius: 8,
          background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.18)',
          color: '#777', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', letterSpacing: 2,
        }}>REFUSER (sage)</button>
      </div>
    </div>
  )
}

// ── Overlay : victoire Fever Night ────────────────────────────────────────────

function FeverPostGameOverlay({
  score, maxCombo, leader, survivalLeader, survivalMs, onContinue,
}: { score: number; maxCombo: number; leader: LeaderEntry[]; survivalLeader: SurvivalEntry[]; survivalMs: number; onContinue: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99991,
      background: 'rgba(4,0,12,.97)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1.4rem', padding: '2rem', fontFamily: 'monospace',
    }}>
      <div style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)', color: '#ffdd00', fontWeight: 800, letterSpacing: 3, textShadow: '0 0 30px #ffdd0055', textAlign: 'center' }}>
        ⚡ FEVER NIGHT CLEARED ⚡
      </div>
      <div style={{ fontSize: 'clamp(.9rem,2vw,1.05rem)', color: '#ff9944', textAlign: 'center', lineHeight: 1.6 }}>
        Tu as survécu à l&apos;impossible.
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['SCORE', score.toLocaleString(), '#e8c46a'], ['COMBO MAX', `×${maxCombo}`, '#cc88ff']].map(([lbl, val, col]) => (
          <div key={lbl} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '.65rem', color: '#888', letterSpacing: 2, marginBottom: '.2rem' }}>{lbl}</div>
            <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', color: col as string, fontWeight: 700 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: 460, background: 'rgba(255,215,0,.06)', border: '2px solid #ffdd0033', borderRadius: 12, padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
        {[
          { icon: '🏆', lbl: 'SUCCÈS DÉBLOQUÉ', val: 'Le rythme dans la peau', col: '#ffd700' },
          { icon: '🎵', lbl: 'TITRE DÉBLOQUÉ',  val: 'Fever Night',            col: '#ff9944' },
        ].map(({ icon, lbl, val, col }) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            <div>
              <div style={{ fontSize: '.6rem', color: '#888', letterSpacing: 2 }}>{lbl}</div>
              <div style={{ fontSize: '1rem', color: col, fontWeight: 700 }}>{val}</div>
            </div>
          </div>
        ))}
      </div>
      {leader.length > 0 && (
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '.6rem 1rem', fontSize: '.65rem', color: '#888', letterSpacing: 3, borderBottom: '1px solid rgba(255,255,255,.08)' }}>🏆 TOP 10 — MEILLEURS SCORES</div>
          {leader.slice(0, 10).map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.4rem 1rem', background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
              <span style={{ width: 20, fontSize: '.7rem', color: i < 3 ? (['#ffd700','#c0c0c0','#cd7f32'] as string[])[i] : '#555', fontWeight: 700 }}>{i < 3 ? (['🥇','🥈','🥉'] as string[])[i] : `${i+1}.`}</span>
              <span style={{ flex: 1, fontSize: '.8rem', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.pseudo}</span>
              <span style={{ fontSize: '.8rem', color: '#e8c46a', fontWeight: 600 }}>{e.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {(survivalLeader.length > 0 || survivalMs > 0) && (
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(255,100,0,.04)', border: '1px solid rgba(255,100,0,.2)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '.6rem 1rem', fontSize: '.65rem', color: '#ff9944', letterSpacing: 3, borderBottom: '1px solid rgba(255,100,0,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔥 TOP 10 — SURVIE</span>
            {survivalMs > 0 && <span style={{ color: '#4ade80' }}>Ton record : {formatSurvivalTime(survivalMs)}</span>}
          </div>
          {survivalLeader.length === 0 ? (
            <div style={{ padding: '.8rem 1rem', fontSize: '.75rem', color: '#555', textAlign: 'center' }}>Sois le premier à survivre !</div>
          ) : survivalLeader.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.4rem 1rem', background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
              <span style={{ width: 20, fontSize: '.7rem', color: i < 3 ? (['#ffd700','#c0c0c0','#cd7f32'] as string[])[i] : '#555', fontWeight: 700 }}>{i < 3 ? (['🥇','🥈','🥉'] as string[])[i] : `${i+1}.`}</span>
              <span style={{ flex: 1, fontSize: '.8rem', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.pseudo}</span>
              <span style={{ fontSize: '.8rem', color: '#ff9944', fontWeight: 600 }}>{formatSurvivalTime(e.survival_ms)}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onContinue} style={{ marginTop: '.5rem', padding: '.75rem 2.5rem', borderRadius: 8, background: 'rgba(255,215,0,.12)', border: '1px solid #ffd70044', color: '#ffd700', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', letterSpacing: 2 }}>
        CONTINUER
      </button>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ClippyDanceBattle({ onWin, onLose, onMiss, initialHP, userId, startInFeverNight = false }: Props) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const onWinRef         = useRef(onWin)
  const onLoseRef        = useRef(onLose)
  const onMissRef        = useRef(onMiss)
  const finalScore       = useRef(0)
  const finalCombo       = useRef(0)
  const finalWon         = useRef(false)
  const onComboChangeRef  = useRef<((c: number) => void) | null>(null)
  const onClippyMoveRef   = useRef<((xPct: number) => void) | null>(null)
  const [liveCombo,  setLiveCombo]  = useState(0)
  const [clippyXPct, setClippyXPct] = useState(0.5)  // 0→1 fraction de largeur écran
  const [isMobileUI, setIsMobileUI] = useState(false)

  useEffect(() => {
    setIsMobileUI(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  // Toujours à jour — Phaser les appelle depuis la closure
  onComboChangeRef.current = (c: number) => setLiveCombo(c)
  onClippyMoveRef.current  = (x: number) => setClippyXPct(x)

  const [postGame, setPostGame] = useState<{
    score: number; maxCombo: number; won: boolean; leader: LeaderEntry[]
  } | null>(null)

  // ── Perfect / Fever flow ──────────────────────────────────────────────────
  const [innerPhase,  setInnerPhase]  = useState<'ddr'|'rage'|'choice'|'fever'|'fever_post'>(() => startInFeverNight ? 'fever' : 'ddr')
  const [rageIdx,     setRageIdx]     = useState(0)
  const [feverLeader,         setFeverLeader]         = useState<LeaderEntry[]>([])
  const [feverSurvivalLeader, setFeverSurvivalLeader] = useState<SurvivalEntry[]>([])
  const missCountRef     = useRef(0)
  const feverContainerRef = useRef<HTMLDivElement>(null)
  const feverFinalScore    = useRef(0)
  const feverFinalCombo    = useRef(0)
  const feverFinalSurvival = useRef(0)
  const onAnyMissRef     = useRef<(() => void) | null>(null)
  const onFeverEndRef    = useRef<((won: boolean) => void) | null>(null)
  onAnyMissRef.current   = () => { missCountRef.current++ }

  const showPostGame = useCallback(async (won: boolean) => {
    finalWon.current = won
    const score = finalScore.current, combo = finalCombo.current
    let leader: LeaderEntry[] = []
    try {
      if (userId && won) await saveDanceScore(score, combo)
      leader = await getDanceLeaderboard()
    } catch {}
    setPostGame({ score, maxCombo: combo, won, leader })
  }, [userId])

  useEffect(() => {
    onWinRef.current = () => {
      if (missCountRef.current === 0) {
        // Perfect run: save score silently and show rage sequence
        if (userId) saveDanceScore(finalScore.current, finalCombo.current).catch(() => {})
        setInnerPhase('rage')
        setRageIdx(0)
      } else {
        showPostGame(true)
      }
    }
  }, [showPostGame, userId])
  useEffect(() => { onLoseRef.current = () => showPostGame(false) }, [showPostGame])

  // ── Fever end handler ─────────────────────────────────────────────────────
  useEffect(() => {
    onFeverEndRef.current = async (won: boolean) => {
      const survMs = feverFinalSurvival.current
      if (won) {
        if (userId) try {
          await unlockFeverNight()
          if (survMs > 0) await saveDanceScore(feverFinalScore.current, feverFinalCombo.current, survMs)
        } catch {}
        let ldr: LeaderEntry[] = []
        let survLdr: SurvivalEntry[] = []
        try { ldr = await getDanceLeaderboard() } catch {}
        try { survLdr = await getDanceSurvivalLeaderboard() } catch {}
        setFeverLeader(ldr)
        setFeverSurvivalLeader(survLdr)
        setInnerPhase('fever_post')
      } else {
        if (userId && survMs > 0) try { await saveDanceScore(feverFinalScore.current, feverFinalCombo.current, survMs) } catch {}
        if (startInFeverNight) {
          onLoseRef.current()
        } else {
          let ldr: LeaderEntry[] = []
          try { ldr = await getDanceLeaderboard() } catch {}
          finalWon.current = true
          setPostGame({ score: finalScore.current, maxCombo: finalCombo.current, won: true, leader: ldr })
        }
      }
    }
  }, [userId])
  useEffect(() => { onMissRef.current = onMiss }, [onMiss])

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let phaserGame: any = null
    let activeKeyListener: ((e: KeyboardEvent) => void) | null = null

    ;(async () => {
      const Phaser = (await import('phaser')).default
      if (destroyed || !containerRef.current) return

      const sceneMaxHP = initialHP ?? MAX_HP
      const isMobile   = window.matchMedia('(pointer: coarse)').matches

      class DDRScene extends Phaser.Scene {
        private readonly isMobile = isMobile
        // State
        private hp       = sceneMaxHP
        private score    = 0
        private combo    = 0
        private maxCombo = 0
        private fever      = false
        private feverEnd   = 0
        private feverLevel = 0  // 0=off 1=×2 2=×3 3=×4
        // Fenêtres de frappe effectives (mobile +10% par rapport au global)
        private hitWin    = HIT_WIN_MS
        private perfWin   = PERFECT_MS
        private earlyG    = EARLY_GRACE
        private bmIdx    = 0
        private ended    = false
        private startTime = 0
        private readonly colCount = COLS.length

        // Audio
        private music!: Phaser.Sound.BaseSound

        // Notes
        private activeNotes: { obj: Phaser.GameObjects.Container; time: number; dir: Dir; judged: boolean }[] = []

        // Geometry
        private colX!:    number[]
        private hitY!:    number
        private spawnAdv!: number
        private laneW     = 0  // desktop only (col width)

        // Sprites / objects
        private clippySprite!:  Phaser.GameObjects.Image
        private hpText!:        Phaser.GameObjects.Text
        private scoreTxt!:      Phaser.GameObjects.Text
        private feedbackTxt!:   Phaser.GameObjects.Text
        private comboTxt!:      Phaser.GameObjects.Text
        private feverLabel!:    Phaser.GameObjects.Text
        private feverBar!:      Phaser.GameObjects.Rectangle
        private feverBarBg!:    Phaser.GameObjects.Rectangle
        private multiBadge!:    Phaser.GameObjects.Text  // "×2"
        private feverOverlay?: Phaser.GameObjects.Rectangle  // flash orange fever

        // Desktop DDR mat
        private matTilePos: Record<Dir, { x: number; y: number }> = {} as any
        private matTileBg:  Record<Dir, Phaser.GameObjects.Rectangle> = {} as any
        private matCenterX  = 0
        private laneCenterX = 0

        // Mobile lane visuals
        private clippyZoneH  = 0
        private clippyTopY   = 0
        private laneFlashBg: Phaser.GameObjects.Rectangle[] = []
        private hitRings:    Phaser.GameObjects.Arc[] = []

        // Laser timers — nettoyés à la fin du jeu
        private laserTimers: Phaser.Time.TimerEvent[] = []

        // Sync tracking
        private lastLitDir: Dir | null = null

        constructor() { super({ key: 'DDRScene' }) }

        preload() {
          this.load.audio('ddr-music', '/audio/clippy/nightclub.m4a')
          this.load.image('evil-clippy-disco', '/evil-clippy-disco.png')
        }

        // ── Timing ──────────────────────────────────────────────────────────

        private getElapsed(): number {
          const seek = ((this.music as any)?.seek ?? 0) * 1000
          return seek > 50 ? seek : Math.max(0, this.time.now - this.startTime)
        }

        // ── Create ──────────────────────────────────────────────────────────

        create() {
          const W = this.scale.width, H = this.scale.height

          // Mobile : fenêtres de frappe +10% (notes plus petites → tolérance proportionnelle)
          if (this.isMobile) {
            this.hitWin  = Math.round(HIT_WIN_MS  * 1.10)
            this.perfWin = Math.round(PERFECT_MS  * 1.10)
            this.earlyG  = Math.round(EARLY_GRACE * 1.10)
          }

          // Desktop : overlay semi-transparent → arène visible derrière
          // Mobile  : overlay sombre → le setupMobile gère le fond Highway
          this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(this.isMobile ? 0.85 : 0.42)
          const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x08001a).setAlpha(0)
          this.tweens.add({ targets: bg, alpha: { from: 0, to: this.isMobile ? 0.55 : 0.22 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

          if (this.isMobile) this.setupMobile(W, H)
          else               this.setupDesktop(W, H)

          this.buildComboHUD(W, H)
          this.buildFeverBar(W, H)

          // Keyboard
          const kbMap: Record<string, Dir> = { ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right' }
          const kbListener = (e: KeyboardEvent) => {
            const dir = kbMap[e.key]; if (!dir) return
            e.preventDefault(); e.stopImmediatePropagation()
            if (!this.ended) this.handleInput(dir, this.getElapsed())
          }
          activeKeyListener = kbListener
          window.addEventListener('keydown', kbListener, true)

          // Touch (mobile — whole column tap)
          if (this.isMobile) {
            this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (this.ended || ptr.y < this.clippyZoneH) return
              this.handleInput(COLS[Math.min(3, Math.floor(ptr.x / (this.scale.width / 4)))], this.getElapsed())
            })
          }

          // Music
          this.music = this.sound.add('ddr-music', { loop: false, volume: 0.85 })
          this.music.play()
          this.startTime = this.time.now

          const last = DANCE_BEATMAP[DANCE_BEATMAP.length - 1]
          this.time.addEvent({ delay: last.time + 2200, callback: () => { if (!this.ended) this.endGame(this.score > 0 ? 'win' : 'lose') } })
        }

        // ── Desktop layout — Guitar Hero + arène visible derrière ───────────

        private setupDesktop(W: number, H: number) {
          this.hitY     = Math.round(H * 0.82)
          this.spawnAdv = ((this.hitY + 80) / NOTE_SPEED) * 1000

          // Lanes élargies de ~50% : laneW ~135px vs ~90px avant
          const totalLaneW = Math.min(W * 0.58, 530)
          this.laneW       = Math.round(totalLaneW / 4)
          const laneX0     = Math.round(W / 2 - totalLaneW / 2)
          this.laneCenterX = Math.round(W / 2)
          this.colX = COLS.map((_, i) => Math.round(laneX0 + (i + 0.5) * totalLaneW / this.colCount))

          // ── Lane backgrounds (Guitar Hero + arène visible) ─────────────────
          // Panneau sombre derrière les lanes (semi-transparent pour laisser l'arène)
          this.add.rectangle(this.laneCenterX, H / 2, totalLaneW + 18, H, 0x000000).setAlpha(0.40)

          // Dégradé par bandes — couleur croissante vers le bas
          this.colX.forEach((x, i) => {
            const col = COL_HEX[COLS[i]]
            const g = this.add.graphics()
            g.fillStyle(col, 0.04); g.fillRect(x - this.laneW/2, 0, this.laneW, H/3)
            g.fillStyle(col, 0.08); g.fillRect(x - this.laneW/2, H/3, this.laneW, H/3)
            g.fillStyle(col, 0.13); g.fillRect(x - this.laneW/2, 2*H/3, this.laneW, H/3)
            if (i > 0) {
              const sg = this.add.graphics()
              sg.lineStyle(1.5, 0xffffff, 0.10); sg.moveTo(x - this.laneW/2, 0); sg.lineTo(x - this.laneW/2, H); sg.strokePath()
            }
          })

          // Lignes de frets (desktop)
          const fretG = this.add.graphics()
          for (let i = 1; i <= 10; i++) {
            const y = i * this.hitY / 11
            fretG.lineStyle(1, 0xffffff, 0.03 + (i / 11) * 0.07)
            fretG.moveTo(laneX0, y); fretG.lineTo(laneX0 + totalLaneW, y); fretG.strokePath()
          }

          // Flash backgrounds (illumination couleur Guitar Hero)
          this.laneFlashBg = COLS.map((dir, i) => {
            const flash = this.add.rectangle(this.colX[i], H / 2, this.laneW, H, COL_HEX[dir])
            flash.setAlpha(0)
            return flash
          })

          // Fever overlay (flammes orange)
          this.feverOverlay = this.add.rectangle(this.laneCenterX, H / 2, totalLaneW + 18, H, 0xff4400)
          this.feverOverlay.setAlpha(0).setDepth(9)

          // ── Strum bar ─────────────────────────────────────────────────────
          this.add.rectangle(this.laneCenterX, this.hitY, totalLaneW + 18, 5, 0xffffff).setAlpha(0.08)
          this.add.rectangle(this.laneCenterX, this.hitY, totalLaneW + 18, 1, 0xffffff).setAlpha(0.65)

          // ── Hit zone gems (même forme et esthétique que les notes, taille maximale) ──
          const nW = Math.round(this.laneW * 0.96)  // plein-lane, identique aux notes élargies
          const nH = Math.round(nW * 0.40)
          const nR = Math.round(nH * 0.38)
          this.colX.forEach((x, i) => {
            const dir = COLS[i], col = COL_HEX[dir], dark = COL_DARK[dir]
            // Pulsing outer glow (derrière le gem)
            const glow = this.add.circle(x, this.hitY, Math.round(nW * 0.65), col, 0.10)
            this.tweens.add({ targets: glow, scaleX: 1.18, scaleY: 1.18, alpha: { from: 0.10, to: 0.03 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
            // Gem (identique aux notes tombantes)
            const g = this.add.graphics()
            g.fillStyle(col, 0.18); g.fillRoundedRect(x - nW/2 - 6, this.hitY - nH/2 - 4, nW + 12, nH + 8, nR + 4)
            g.fillStyle(dark, 1);   g.fillRoundedRect(x - nW/2, this.hitY - nH/2, nW, nH, nR)
            g.fillStyle(col, 1);    g.fillRoundedRect(x - nW/2, this.hitY - nH/2, nW, Math.round(nH * 0.70), nR)
            g.lineStyle(2.5, 0xffffff, 0.55); g.strokeRoundedRect(x - nW/2, this.hitY - nH/2, nW, nH, nR)
            g.fillStyle(0xffffff, 0.28); g.fillRoundedRect(x - nW/2 + 4, this.hitY - nH/2 + 3, nW - 8, Math.round(nH * 0.28), 3)
            g.fillStyle(0xffffff, 0.12); g.fillRect(x - nW/2 + 1, this.hitY - nH/2 + nR, 3, nH - nR * 2)
            this.add.text(x, this.hitY, COL_ARROWS[dir], {
              fontSize: `${Math.round(nH * 1.0)}px`, color: COL_CSS[dir],
              fontFamily: 'monospace', fontStyle: 'bold', stroke: '#00000077', strokeThickness: 2,
            }).setOrigin(0.5).setAlpha(0.80)
          })

          // ── DDR mat (agrandi) ──────────────────────────────────────────────
          const laneRight = Math.round(W / 2 + totalLaneW / 2)
          // Espace disponible à droite des lanes (garantit aucun chevauchement)
          const availW    = W - laneRight - 24  // 24px de gap minimum lanes↔mat
          const GAP       = 8
          // TW adaptatif : utilise tout l'espace droit disponible, plafonné
          const maxTW     = Math.max(72, Math.min(Math.floor((availW * 0.90 - GAP * 4 - 24) / 3), 155))
          const TW        = Math.min(maxTW, Math.round(H * 0.18))
          const matPanelW = Math.round(TW * 3 + GAP * 4 + 24)
          const matPanelH = Math.round(TW * 3 + GAP * 4 + 50)
          this.matCenterX = Math.min(Math.round(laneRight + 42 + matPanelW / 2), W - Math.round(matPanelW / 2) - 10)
          const mY = Math.round(H * 0.50)

          this.matTilePos = {
            up:    { x: this.matCenterX,            y: mY - TW - GAP },
            down:  { x: this.matCenterX,            y: mY + TW + GAP },
            left:  { x: this.matCenterX - TW - GAP, y: mY },
            right: { x: this.matCenterX + TW + GAP, y: mY },
          }
          this.add.rectangle(this.matCenterX, mY, matPanelW, matPanelH, 0x030010).setAlpha(0.88)
          const mb = this.add.graphics(); mb.lineStyle(2, 0xaa55ff, 0.55)
          mb.strokeRect(this.matCenterX - matPanelW / 2, mY - matPanelH / 2, matPanelW, matPanelH)

          this.matTileBg = {} as Record<Dir, Phaser.GameObjects.Rectangle>
          ;(['up','down','left','right'] as Dir[]).forEach(dir => {
            const pos = this.matTilePos[dir], col = COL_HEX[dir]
            const bg = this.add.rectangle(pos.x, pos.y, TW - 4, TW - 4, col).setAlpha(0.18)
            this.matTileBg[dir] = bg
            const g = this.add.graphics(); g.lineStyle(2, col, 0.50)
            g.strokeRect(pos.x - (TW-4)/2, pos.y - (TW-4)/2, TW-4, TW-4)
            this.add.text(pos.x, pos.y, COL_ARROWS[dir], { fontSize: `${Math.round(TW*.52)}px`, color: COL_CSS[dir], fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.55)
          })
          this.add.rectangle(this.matCenterX, mY, TW-4, TW-4, 0x1a0044).setAlpha(0.65)
          const gc = this.add.graphics(); gc.lineStyle(1.5, 0x9966ff, 0.30)
          gc.strokeRect(this.matCenterX - (TW-4)/2, mY - (TW-4)/2, TW-4, TW-4)
          this.add.text(this.matCenterX, mY - matPanelH/2 - 14, '📎 CLIPPY', { fontSize: '14px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5, 1)

          // Clippy agrandi (dépasse légèrement les cases)
          this.clippySprite = this.add.image(this.matCenterX, mY, 'evil-clippy-disco')
          this.clippySprite.setDisplaySize(Math.round(TW * 1.80), Math.round(TW * 1.80))  // +20%
          this.clippySprite.setDepth(5)

          // VS
          const sepX = Math.round((laneRight + this.matCenterX - matPanelW/2) / 2)
          this.add.text(sepX, Math.round(H * 0.50), 'VS', { fontSize: '22px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.45)

          // ── Lasers boîte de nuit (gauche + droite, symétriques) ──
          this.spawnLasers(W, H, laneX0, laneRight)

          // HUD
          this.hpText  = this.add.text(14, 14, this.buildHpStr(), { fontSize: '16px', fontFamily: 'monospace' }).setAlpha(0)
          this.scoreTxt = this.add.text(laneX0 - 6, 14, 'Score: 0', { fontSize: '14px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(1, 0)
          this.feedbackTxt = this.add.text(this.laneCenterX, Math.round(H * 0.61), '', { fontSize: '38px', fontStyle: 'bold', fontFamily: 'monospace', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5)
          this.add.text(this.laneCenterX, 14, '🎵  DUEL DE DANSE  🎵', { fontSize: '13px', color: '#cc88ff', letterSpacing: 3, fontFamily: 'monospace' }).setOrigin(0.5, 0)
        }

        // ── Mobile layout — Guitar Hero Highway ──────────────────────────────

        private setupMobile(W: number, H: number) {
          this.clippyZoneH = Math.round(H * 0.26)
          this.clippyTopY  = this.clippyZoneH
          this.hitY        = Math.round(H * 0.87)
          this.spawnAdv    = (this.hitY - this.clippyZoneH) / NOTE_SPEED * 1000

          const colW = Math.round(W / 4)
          this.laneW = colW
          this.colX  = COLS.map((_, i) => Math.round((i + 0.5) * W / this.colCount))
          const laneZoneH = H - this.clippyZoneH
          const laneZoneY = this.clippyZoneH + laneZoneH / 2

          // ── Zone Clippy ──────────────────────────────────────────────────
          const clipBg = this.add.graphics()
          clipBg.fillGradientStyle(0x0c001e, 0x0c001e, 0x04000e, 0x04000e, 1)
          clipBg.fillRect(0, 0, W, this.clippyZoneH)
          this.add.text(W / 2, 6, '★  DUEL DE DANSE  ★', {
            fontSize: '11px', color: '#cc88ff', fontFamily: 'monospace', letterSpacing: 3,
          }).setOrigin(0.5, 0)
          // Clippy rendu en <img> HTML (zéro pixel, qualité navigateur)
          // Le sprite Phaser est invisible — React gère l'affichage via onClippyMoveRef
          this.clippySprite = this.add.image(-9999, -9999, 'evil-clippy-disco').setVisible(false)
          onClippyMoveRef.current?.(0.5)  // position initiale : centre
          // Separator glow
          const sepGfx = this.add.graphics()
          sepGfx.fillGradientStyle(0x7700ff, 0x7700ff, 0x000000, 0x000000, 0.35, 0.35, 0, 0)
          sepGfx.fillRect(0, this.clippyZoneH - 8, W, 8)
          this.add.rectangle(W / 2, this.clippyZoneH, W, 2, 0xaa44ff).setAlpha(0.85)

          // ── Highway background ────────────────────────────────────────────
          // Ultra-dark base
          this.add.rectangle(W / 2, laneZoneY, W, laneZoneH, 0x01000a).setAlpha(1)

          // Gradient depth: dark at top (vanishing), slightly lit at bottom (player)
          const depthGfx = this.add.graphics()
          depthGfx.fillGradientStyle(0x000000, 0x000000, 0x0c0030, 0x0c0030, 0.0, 0.0, 0.45, 0.45)
          depthGfx.fillRect(0, this.clippyZoneH, W, laneZoneH)

          // ── Colored lane fills (gradient by thirds) ──────────────────────
          COLS.forEach((dir, i) => {
            const x = this.colX[i], col = COL_HEX[dir]
            const g = this.add.graphics()
            // 3 bands: very subtle → moderate (depth effect)
            g.fillStyle(col, 0.03); g.fillRect(x - colW/2, this.clippyZoneH,            colW, laneZoneH/3)
            g.fillStyle(col, 0.07); g.fillRect(x - colW/2, this.clippyZoneH+laneZoneH/3, colW, laneZoneH/3)
            g.fillStyle(col, 0.12); g.fillRect(x - colW/2, this.clippyZoneH+2*laneZoneH/3, colW, laneZoneH/3)
          })

          // ── Lane separators (chrome lines) ────────────────────────────────
          for (let i = 1; i < 4; i++) {
            const x = Math.round(i * W / 4)
            const sepG = this.add.graphics()
            sepG.lineStyle(3, 0xffffff, 0.05); sepG.moveTo(x, this.clippyZoneH); sepG.lineTo(x, H); sepG.strokePath()
            sepG.lineStyle(1, 0xffffff, 0.18); sepG.moveTo(x, this.clippyZoneH); sepG.lineTo(x, H); sepG.strokePath()
          }

          // ── Horizontal fret lines ─────────────────────────────────────────
          const fretG = this.add.graphics()
          for (let i = 1; i <= 12; i++) {
            const y = this.clippyZoneH + i * laneZoneH / 13
            const a = 0.03 + (i / 13) * 0.10  // brighter toward player
            fretG.lineStyle(1, 0xffffff, a)
            fretG.moveTo(0, y); fretG.lineTo(W, y); fretG.strokePath()
          }

          // Small lane arrows near top (dim)
          COLS.forEach((dir, i) => {
            this.add.text(this.colX[i], this.clippyZoneH + 10, COL_ARROWS[dir], {
              fontSize: `${Math.round(colW * 0.22)}px`, color: COL_CSS[dir], fontFamily: 'monospace',
            }).setOrigin(0.5, 0).setAlpha(0.25)
          })

          // Lane flash (updated per-frame)
          this.laneFlashBg = COLS.map((dir, i) => {
            const flash = this.add.rectangle(this.colX[i], laneZoneY, colW, laneZoneH, COL_HEX[dir])
            flash.setAlpha(0)
            return flash
          })

          // ── Strum zone (above hit line) ───────────────────────────────────
          // Shadow above strum bar
          const strumShadow = this.add.graphics()
          strumShadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.6, 0.6)
          strumShadow.fillRect(0, this.hitY - 55, W, 55)

          // Strum line (bright hairline + soft glow)
          this.add.rectangle(W / 2, this.hitY, W, 6, 0xffffff).setAlpha(0.08)
          this.add.rectangle(W / 2, this.hitY, W, 2, 0xffffff).setAlpha(0.35)
          this.add.rectangle(W / 2, this.hitY, W, 1, 0xffffff).setAlpha(0.9)

          // ── Hit zone circles (Guitar Hero strum targets) ──────────────────
          const circleR = Math.round(colW * 0.43)  // -10% de 0.48 (réduit de 10%)
          this.hitRings = COLS.map((dir, i) => {
            const x = this.colX[i], col = COL_HEX[dir]

            // Large outer glow (very transparent, pulsing)
            const outerGlow = this.add.circle(x, this.hitY, circleR + 20, col, 0.07)
            this.tweens.add({ targets: outerGlow, scaleX: 1.14, scaleY: 1.14, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

            // Mid glow ring
            const midRing = this.add.circle(x, this.hitY, circleR + 9, col, 0.12)
            midRing.setStrokeStyle(2, col, 0.30)

            // Main circle (semi-transparent fill + strong border)
            const ring = this.add.circle(x, this.hitY, circleR, col, 0.28)
            ring.setStrokeStyle(3, col, 1.0)

            // Dark inner center
            this.add.circle(x, this.hitY, Math.round(circleR * 0.48), 0x000000, 0.60)

            // Inner glow dot
            this.add.circle(x, this.hitY, Math.round(circleR * 0.22), col, 0.50)

            // Arrow inside
            this.add.text(x, this.hitY, COL_ARROWS[dir], {
              fontSize: `${Math.round(circleR * 0.95)}px`, color: COL_CSS[dir],
              fontFamily: 'monospace', fontStyle: 'bold',
              stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5).setAlpha(0.85)

            // Platform shadow below circle
            this.add.ellipse(x, this.hitY + circleR * 0.7, circleR * 2, circleR * 0.4, col, 0.10)

            return ring
          })

          // ── HUD ──────────────────────────────────────────────────────────
          this.hpText  = this.add.text(6, this.clippyZoneH - 22, this.buildHpStr(), { fontSize: '12px', fontFamily: 'monospace' }).setAlpha(0)
          this.scoreTxt = this.add.text(W - 6, 8, 'Score: 0', {
            fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
          }).setOrigin(1, 0)
          this.feedbackTxt = this.add.text(W / 2, Math.round(H * 0.73), '', {
            fontSize: '40px', fontStyle: 'bold', fontFamily: 'monospace',
            stroke: '#000000', strokeThickness: 5,
          }).setOrigin(0.5)

          // Lasers boîte de nuit (coins hors zone de jeu, très discrets)
          this.spawnLasers(W, H, -1)  // -1 = mobile (pas de laneX0)
        }

        // ── Lasers projecteurs boîte de nuit ─────────────────────────────────
        // laneX0 < 0 = mobile | laneRight = bord droit des lanes desktop (symétrie)

        private spawnLasers(W: number, H: number, laneX0: number, laneRight = -1) {
          const COLS_L = [0xff2266, 0x2266ff, 0x22ffcc, 0xff9900, 0xcc22ff, 0x22ff44]
          const isMob = laneX0 < 0

          const laserDefs = isMob
            ? [
                { ox: W * 0.04, oy: this.clippyZoneH * 0.18, angle: 55, col: COLS_L[0] },
                { ox: W * 0.96, oy: this.clippyZoneH * 0.18, angle: 125, col: COLS_L[1] },
                { ox: W * 0.08, oy: this.clippyZoneH * 0.50, angle: 60, col: COLS_L[4] },
                { ox: W * 0.92, oy: this.clippyZoneH * 0.50, angle: 120, col: COLS_L[2] },
              ]
            : [
                // Gauche
                { ox: laneX0 * 0.35, oy: H * 0.04, angle: 65, col: COLS_L[0] },
                { ox: laneX0 * 0.60, oy: H * 0.03, angle: 75, col: COLS_L[2] },
                { ox: laneX0 * 0.20, oy: H * 0.06, angle: 50, col: COLS_L[4] },
                // Droite — symétriques (angle miroir)
                { ox: laneRight + (W - laneRight) * 0.65, oy: H * 0.04, angle: 115, col: COLS_L[3] },
                { ox: laneRight + (W - laneRight) * 0.40, oy: H * 0.03, angle: 105, col: COLS_L[5] },
                { ox: laneRight + (W - laneRight) * 0.80, oy: H * 0.06, angle: 130, col: COLS_L[1] },
              ]

          laserDefs.forEach(({ ox, oy, angle, col }, idx) => {
            const laserG = this.add.graphics().setDepth(2)
            const startAngle = angle
            const speed = 16 + (idx % 5) * 5  // vitesses variées mais déterministes
            let t = idx * 42.7  // phase initiale distincte par laser

            const len = Math.max(W, H) * 1.5

            const timer = this.time.addEvent({
              delay: 40, loop: true,
              callback: () => {
                if (this.ended) { this.time.removeEvent(timer); return }
                t += speed * 0.04
                const rad = Phaser.Math.DegToRad(startAngle + Math.sin(Phaser.Math.DegToRad(t)) * 30)
                const ex = ox + Math.cos(rad) * len
                const ey = oy + Math.sin(rad) * len

                laserG.clear()
                laserG.lineStyle(14, col, 0.06)   // halo large
                laserG.beginPath(); laserG.moveTo(ox, oy); laserG.lineTo(ex, ey); laserG.strokePath()
                laserG.lineStyle(5, col, 0.22)     // faisceau principal
                laserG.beginPath(); laserG.moveTo(ox, oy); laserG.lineTo(ex, ey); laserG.strokePath()
                laserG.lineStyle(2, 0xffffff, 0.30) // core brillant
                laserG.beginPath(); laserG.moveTo(ox, oy); laserG.lineTo(ex, ey); laserG.strokePath()
              },
            })
            this.laserTimers.push(timer)
          })
        }

        // ── HUD helpers ─────────────────────────────────────────────────────

        private buildComboHUD(W: number, H: number) {
          const y = this.isMobile ? Math.round(H * 0.64) : Math.round(H * 0.70)
          this.comboTxt = this.add.text(W / 2, y, '', { fontSize: '20px', fontStyle: 'bold', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setAlpha(0)
          this.feverLabel = this.add.text(W / 2, y - 28, '', { fontSize: '22px', fontStyle: 'bold', fontFamily: 'monospace', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setAlpha(0)
          this.multiBadge = this.add.text(W / 2 + 60, this.isMobile ? 42 : 36, '', { fontSize: '18px', fontStyle: 'bold', fontFamily: 'monospace', color: '#ff9944', stroke: '#000', strokeThickness: 3 }).setOrigin(0, 0.5).setAlpha(0)
        }

        private buildFeverBar(W: number, H: number) {
          const barY  = this.isMobile ? this.clippyZoneH - 6 : H - 8
          const barW  = W - 40
          this.feverBarBg = this.add.rectangle(W / 2, barY, barW, 6, 0x221100).setAlpha(0).setDepth(10)
          this.feverBar   = this.add.rectangle(W / 2, barY, barW, 6, 0xff8800).setAlpha(0).setDepth(11)
          this.feverBar.setOrigin(0, 0.5)
          this.feverBar.setX(W / 2 - barW / 2)
        }

        // ── Update ──────────────────────────────────────────────────────────

        update() {
          if (this.ended) return
          const elapsed = this.getElapsed()

          // Spawn notes
          while (this.bmIdx < DANCE_BEATMAP.length && DANCE_BEATMAP[this.bmIdx].time - elapsed < this.spawnAdv) {
            const note = DANCE_BEATMAP[this.bmIdx]
            if (note.time >= elapsed - 200) this.spawnNote(note.direction, note.time)
            this.bmIdx++
          }

          // Move notes + miss check
          for (const n of this.activeNotes) {
            if (n.judged) continue
            const tth = n.time - elapsed
            n.obj.setY(this.hitY - (tth / 1000) * NOTE_SPEED)
            if (tth < -(this.hitWin + 10)) { n.judged = true; n.obj.destroy(); this.doMiss() }
          }
          this.activeNotes = this.activeNotes.filter(n => !n.judged)

          // Feedback fade
          if (this.feedbackTxt.alpha > 0) this.feedbackTxt.setAlpha(Math.max(0, this.feedbackTxt.alpha - 0.022))
          if (this.comboTxt.alpha > 0 && this.combo === 0) this.comboTxt.setAlpha(Math.max(0, this.comboTxt.alpha - 0.025))

          // Fever bar — progression par palier de combo (sans timer)
          if (this.feverLevel > 0) {
            const W = this.scale.width
            const barW = W - 40
            const ratio = this.feverLevel === 1 ? Math.min(1, (this.combo - FEVER_AT) / (FEVER_X3 - FEVER_AT))
              : this.feverLevel === 2 ? Math.min(1, (this.combo - FEVER_X3) / (FEVER_X4 - FEVER_X3))
              : 1
            this.feverBarBg.setAlpha(0.35); this.feverBar.setAlpha(1)
            this.feverBar.setDisplaySize(ratio * barW, 6)
          }

          // ── Lane highlight sync: light lane of note CLOSEST to hitY within AHEAD_MS ──
          const litDirs = new Set<Dir>()
          let closestDir: Dir | null = null, closestDist = Infinity
          for (const n of this.activeNotes) {
            if (n.judged) continue
            const tth = n.time - elapsed
            if (tth >= -this.hitWin && tth <= AHEAD_MS) {
              litDirs.add(n.dir)
              if (Math.abs(tth) < closestDist) { closestDist = Math.abs(tth); closestDir = n.dir }
            }
          }

          if (this.isMobile) {
            this.laneFlashBg.forEach((bg, i) => bg.setAlpha(litDirs.has(COLS[i]) ? 0.20 : 0))
            // Clippy HTML img — notifier React de la nouvelle position X (% écran)
            if (closestDir && closestDir !== this.lastLitDir) {
              this.lastLitDir = closestDir
              const idx = COLS.indexOf(closestDir)
              onClippyMoveRef.current?.(this.colX[idx] / this.scale.width)
            }
          } else {
            // Desktop: lane flash + mat tiles
            this.laneFlashBg.forEach((bg, i) => bg.setAlpha(litDirs.has(COLS[i]) ? 0.14 : 0))
            if (closestDir && closestDir !== this.lastLitDir) {
              this.lastLitDir = closestDir
              ;(['up','down','left','right'] as Dir[]).forEach(d => {
                if (this.matTileBg[d]) this.matTileBg[d].setAlpha(d === closestDir ? 0.82 : 0.18)
              })
            }
          }
        }

        // ── Spawn note ──────────────────────────────────────────────────────

        private spawnNote(dir: Dir, hitTime: number) {
          const colIdx = COLS.indexOf(dir)
          const x      = this.colX[colIdx]
          const col    = COL_HEX[dir]
          const dark   = COL_DARK[dir]

          // Guitar Hero gem — mobile -10% (notes légèrement plus petites)
          const noteW = Math.round(this.laneW * (this.isMobile ? 0.83 : 0.92))
          const noteH = Math.round(noteW * (this.isMobile ? 0.52 : 0.48))
          const r     = Math.round(noteH * 0.36)

          const container = this.add.container(x, -noteH * 2)
          const g = this.add.graphics()

          // ── Outer glow (aura diffuse) ──
          g.fillStyle(col, 0.16)
          g.fillRoundedRect(-noteW/2 - 8, -noteH/2 - 6, noteW + 16, noteH + 12, r + 6)

          // ── Face sombre du bas (ombre 3D) ──
          g.fillStyle(dark, 1)
          g.fillRoundedRect(-noteW/2, -noteH/2, noteW, noteH, r)

          // ── Face principale (2/3 supérieurs) ──
          g.fillStyle(col, 1)
          g.fillRoundedRect(-noteW/2, -noteH/2, noteW, Math.round(noteH * 0.70), r)

          // ── Bordure chrome ──
          g.lineStyle(2.5, 0xffffff, 0.60)
          g.strokeRoundedRect(-noteW/2, -noteH/2, noteW, noteH, r)

          // ── Reflet en haut (shine) ──
          g.fillStyle(0xffffff, 0.38)
          g.fillRoundedRect(-noteW/2 + 5, -noteH/2 + 4, noteW - 10, Math.round(noteH * 0.26), Math.min(r - 2, 5))

          // ── Reflet latéral gauche ──
          g.fillStyle(0xffffff, 0.12)
          g.fillRect(-noteW/2 + 1, -noteH/2 + r, 3, noteH - r * 2)

          const arrow = this.add.text(0, 1, COL_ARROWS[dir], {
            fontSize: `${Math.round(noteH * 1.05)}px`, color: '#ffffff',
            fontFamily: 'monospace', fontStyle: 'bold',
            stroke: '#00000077', strokeThickness: 3,
          }).setOrigin(0.5)

          container.add([g, arrow])
          container.setDepth(6)  // au-dessus du sprite Clippy (depth 5)
          this.activeNotes.push({ obj: container, time: hitTime, dir, judged: false })

          if (!this.isMobile) {
            this.tweens.killTweensOf(this.clippySprite)
            this.tweens.add({ targets: this.clippySprite, x: this.matTilePos[dir].x, y: this.matTilePos[dir].y, duration: 90, ease: 'Back.Out' })
          }
        }

        // ── Input handling ──────────────────────────────────────────────────

        private handleInput(dir: Dir, elapsed: number) {
          let best: typeof this.activeNotes[0] | null = null
          let bestDelta = Infinity
          let hasNoteNear = false  // note dans cette lane dans la fenêtre EARLY_GRACE

          for (const n of this.activeNotes) {
            if (n.judged || n.dir !== dir) continue
            const tth = n.time - elapsed
            const d = Math.abs(tth)
            if (tth <= this.earlyG && tth >= -this.hitWin) hasNoteNear = true
            if (d < bestDelta) { bestDelta = d; best = n }
          }

          if (best && bestDelta <= this.hitWin) {
            // ✅ SUCCÈS — note dans la fenêtre de frappe
            best.judged = true; best.obj.destroy()
            const perfect = bestDelta <= this.perfWin
            const mult = this.getMultiplier()
            this.score += (perfect ? 100 : 50) * mult
            finalScore.current = this.score

            this.combo++
            if (this.combo > this.maxCombo) { this.maxCombo = this.combo; finalCombo.current = this.maxCombo }
            this.updateFeverLevel()
            this.refreshComboDisplay()
            onComboChangeRef.current?.(this.combo)

            this.showFeedback(perfect ? 'PERFECT !' : 'GOOD !', perfect ? '#4ade80' : '#ffcc44')
            this.scoreTxt.setText(`Score: ${this.score}`)

            if (this.isMobile) {
              const ring = this.hitRings[COLS.indexOf(dir)]
              if (ring) { ring.setAlpha(0.85); this.tweens.add({ targets: ring, alpha: 0.28, duration: 180 }) }
            }
          } else {
            // ❌ Mauvaise touche ou trop tôt → brise le combo SEULEMENT (pas de HP perdu)
            // Le HP est perdu uniquement quand la note touche le fond sans être cliquée
            this.showFeedback(hasNoteNear ? 'TROP TÔT !' : 'ERREUR !', '#ff9944')
            this.breakComboOnly()
          }
        }

        private getMultiplier(): number {
          if (this.feverLevel >= 3) return 4
          if (this.feverLevel >= 2) return 3
          if (this.feverLevel >= 1) return 2
          return 1
        }

        private breakComboOnly() {
          // Mauvaise touche ou trop tôt : brise le combo sans retirer de HP
          this.combo = 0; this.feverLevel = 0; this.fever = false
          onComboChangeRef.current?.(0)
          this.comboTxt.setAlpha(0); this.feverLabel.setAlpha(0)
          this.multiBadge.setAlpha(0); this.feverBarBg.setAlpha(0); this.feverBar.setAlpha(0)
          if (this.feverOverlay) { this.tweens.killTweensOf(this.feverOverlay); this.feverOverlay.setAlpha(0) }
        }

        private applyMissPenalty() {
          this.hp = Math.max(0, this.hp - 1)
          this.hpText.setText(this.buildHpStr())
          onMissRef.current?.()
          onAnyMissRef.current?.()
          this.combo = 0; this.feverLevel = 0; this.fever = false
          onComboChangeRef.current?.(0)
          this.comboTxt.setAlpha(0); this.feverLabel.setAlpha(0)
          this.multiBadge.setAlpha(0); this.feverBarBg.setAlpha(0); this.feverBar.setAlpha(0)
          if (this.feverOverlay) { this.tweens.killTweensOf(this.feverOverlay); this.feverOverlay.setAlpha(0) }
          if (this.hp <= 0) this.endGame('lose')
        }

        private doMiss() {
          this.showFeedback('MISS !', '#e85a5a')
          this.applyMissPenalty()
        }

        // ── Fever ───────────────────────────────────────────────────────────

        private updateFeverLevel() {
          const prev = this.feverLevel
          if      (this.combo >= FEVER_X4 && this.feverLevel < 3) { this.feverLevel = 3; this.onFeverChange() }
          else if (this.combo >= FEVER_X3 && this.feverLevel < 2) { this.feverLevel = 2; this.onFeverChange() }
          else if (this.combo >= FEVER_AT && this.feverLevel < 1) { this.feverLevel = 1; this.onFeverChange() }
          if (this.feverLevel > 0 && prev === 0) this.activateFever()
        }

        private activateFever() {
          this.fever = true
          if (this.feverOverlay) {
            this.tweens.killTweensOf(this.feverOverlay)
            this.feverOverlay.setAlpha(0.45)
            this.tweens.add({ targets: this.feverOverlay, alpha: 0.10, duration: 900, ease: 'Power2',
              onComplete: () => { if (this.feverOverlay) this.tweens.add({ targets: this.feverOverlay, alpha: { from: 0.08, to: 0.20 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }) }
            })
          }
        }

        private onFeverChange() {
          const mult = this.getMultiplier()
          const LABELS = ['', '🔥 FEVER ×2', '💥 SUPER ×3 !', '⚡ ULTRA ×4 !']
          const COLORS = ['', '#ff8800', '#ff5500', '#ffdd00']
          const SIZES  = [1.30, 1.30, 1.42, 1.55]
          this.feverLabel.setText(LABELS[this.feverLevel] ?? '').setColor(COLORS[this.feverLevel] ?? '#fff').setAlpha(1)
          this.tweens.add({ targets: this.feverLabel, scaleX: SIZES[this.feverLevel], scaleY: SIZES[this.feverLevel], duration: 220, yoyo: true, ease: 'Back.Out' })
          this.multiBadge.setText(`×${mult}`).setColor(COLORS[this.feverLevel] ?? '#fff').setAlpha(1)
          // Flash overlay plus intense à chaque upgrade
          if (this.feverOverlay && this.feverLevel > 1) {
            this.tweens.killTweensOf(this.feverOverlay)
            this.feverOverlay.setAlpha(0.60)
            const pulseAlpha = this.feverLevel === 3 ? { from: 0.18, to: 0.35 } : { from: 0.12, to: 0.28 }
            this.tweens.add({ targets: this.feverOverlay, alpha: 0.14, duration: 600, ease: 'Power2',
              onComplete: () => { if (this.feverOverlay) this.tweens.add({ targets: this.feverOverlay, alpha: pulseAlpha, duration: 320, yoyo: true, repeat: -1 }) }
            })
          }
        }

        private refreshComboDisplay() {
          if (this.combo < 2) { this.comboTxt.setAlpha(0); return }
          const color = this.feverLevel >= 3 ? '#ffdd00' : this.feverLevel === 2 ? '#ff5500' : this.feverLevel === 1 ? '#ff8800' : '#ffffff'
          this.comboTxt.setText(`COMBO  ×${this.combo}`).setColor(color).setAlpha(1)
          this.tweens.add({ targets: this.comboTxt, scaleX: 1.15, scaleY: 1.15, duration: 120, yoyo: true, ease: 'Back.Out' })
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private showFeedback(text: string, color: string) {
          this.feedbackTxt.setText(text).setColor(color).setAlpha(1)
        }

        private buildHpStr() {
          return '❤️'.repeat(this.hp) + '🖤'.repeat(sceneMaxHP - this.hp)
        }

        private endGame(result: 'win' | 'lose') {
          if (this.ended) return
          this.ended = true
          finalScore.current = this.score
          finalCombo.current = this.maxCombo
          this.sound.stopAll()
          // Tuer tous les timers laser (évite 150+ callbacks/sec post-jeu)
          this.laserTimers.forEach(t => this.time.removeEvent(t))
          this.laserTimers = []
          this.time.addEvent({
            delay: result === 'win' ? 900 : 600,
            callback: () => { if (result === 'win') onWinRef.current(); else onLoseRef.current() },
          })
        }
      }

      phaserGame = new Phaser.Game({
        type: Phaser.WEBGL,         // WebGL → meilleur filtrage texture (anti-pixelisation)
        parent: containerRef.current!,
        transparent: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [DDRScene],
        audio: { disableWebAudio: false },
        banner: false,
        render: { antialias: true, antialiasGL: true, pixelArt: false },
      })
    })()

    return () => {
      destroyed = true
      if (activeKeyListener) { window.removeEventListener('keydown', activeKeyListener, true); activeKeyListener = null }
      phaserGame?.destroy(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fever Night — scène Phaser séparée ────────────────────────────────────
  useEffect(() => {
    if (innerPhase !== 'fever' || !feverContainerRef.current) return
    let destroyed = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let phaserGame: any = null
    let feverKeyListener: ((e: KeyboardEvent) => void) | null = null

    ;(async () => {
      const Phaser = (await import('phaser')).default
      if (destroyed || !feverContainerRef.current) return

      const sceneMaxHP = initialHP ?? MAX_HP
      const isMobile   = window.matchMedia('(pointer: coarse)').matches

      class FeverScene extends Phaser.Scene {
        private readonly isMobile = isMobile
        private hp        = sceneMaxHP
        private score     = 0
        private combo     = 0
        private maxCombo  = 0
        private beatIdx    = 0
        private ended     = false
        private feverStartTime = 0
        private pausedAtMs = 0
        private isWarmup   = true
        private warmupTxt?: Phaser.GameObjects.Text
        private awaitingSurvivalChoice = false
        private survivalMode = false
        private challengeCleared = false
        private trackDurationMs = FEVER_TRACK_END_FALLBACK_MS
        private hitWin    = HIT_WIN_MS
        private perfWin   = PERFECT_MS
        private earlyG    = EARLY_GRACE
        private clippyZoneH = 0

        private activeNotes: { obj: Phaser.GameObjects.Container; time: number; dir: Dir; judged: boolean }[] = []
        // Directions auto-jugées comme chord — évite la pénalité sur la 2e touche simultanée
        private chordJudgedDirs = new Map<Dir, number>()
        private colX!:    number[]
        private hitY!:    number
        private spawnAdv!: number
        private laneW     = 0

        private music!:       Phaser.Sound.BaseSound
        private feedbackTxt!: Phaser.GameObjects.Text
        private comboTxt!:    Phaser.GameObjects.Text
        private countdownTxt!:Phaser.GameObjects.Text
        private scoreTxt!:    Phaser.GameObjects.Text
        private survivalTxt!: Phaser.GameObjects.Text
        private hpText!:      Phaser.GameObjects.Text
        private survivalPrompt?: Phaser.GameObjects.Container
        private laneFlashBg:  Phaser.GameObjects.Rectangle[] = []
        private clippySprite!: Phaser.GameObjects.Image
        private hitRings:     Phaser.GameObjects.Arc[] = []
        private laserTimers:  Phaser.Time.TimerEvent[] = []
        private lastLitDir: Dir | null = null
        private laneCenterX = 0

        constructor() { super({ key: 'FeverScene' }) }

        preload() {
          this.load.audio('fever-music', '/audio/clippy/nightclub.m4a')
          this.load.image('evil-clippy-disco', '/evil-clippy-disco.png')
        }

        private getElapsed(): number {
          if (this.awaitingSurvivalChoice) return this.pausedAtMs
          return Math.max(0, this.time.now - this.feverStartTime)
        }

        create() {
          const W = this.scale.width, H = this.scale.height
          if (this.isMobile) {
            this.hitWin = Math.round(HIT_WIN_MS * 1.10)
            this.perfWin = Math.round(PERFECT_MS * 1.10)
            this.earlyG  = Math.round(EARLY_GRACE * 1.10)
          }

          this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(this.isMobile ? 0.85 : 0.42)
          const fBg = this.add.rectangle(W / 2, H / 2, W, H, 0x08001a).setAlpha(0)
          this.tweens.add({ targets: fBg, alpha: { from: 0, to: this.isMobile ? 0.55 : 0.22 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

          if (this.isMobile) this.setupMobile(W, H)
          else               this.setupDesktop(W, H)

          // Header
          this.add.text(W/2, this.isMobile ? this.clippyZoneH/2 - 10 : 14, '⚡  FEVER NIGHT  ⚡', {
            fontSize: '13px', color: '#cc88ff', letterSpacing: 3,
            fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5, this.isMobile ? 0.5 : 0)

          // Compte à rebours
          this.countdownTxt = this.add.text(W/2, this.isMobile ? this.clippyZoneH - 22 : 42, '30', {
            fontSize: this.isMobile ? '26px' : '34px', color: '#cc88ff',
            fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(20)

          // Combo & score
          const comboY = this.isMobile ? Math.round(H * 0.64) : Math.round(H * 0.70)
          this.comboTxt = this.add.text(W/2, comboY, '', {
            fontSize: '20px', fontStyle: 'bold', fontFamily: 'monospace', color: '#ffffff', stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5).setAlpha(0)
          this.feedbackTxt = this.add.text(W/2, this.isMobile ? Math.round(H*0.73) : Math.round(H*0.61), '', {
            fontSize: '38px', fontStyle: 'bold', fontFamily: 'monospace', stroke: '#000', strokeThickness: 4,
          }).setOrigin(0.5)
          this.scoreTxt = this.add.text(W - 6, 8, 'Score: 0', {
            fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
          }).setOrigin(1, 0)
          this.survivalTxt = this.add.text(W/2, this.isMobile ? this.clippyZoneH - 48 : 74, '', {
            fontSize: this.isMobile ? '12px' : '14px', color: '#ffdd66',
            fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(20).setAlpha(0)

          this.hpText = this.add.text(
            8,
            this.isMobile ? this.clippyZoneH + 8 : 8,
            `❤️ ${this.hp} / ${sceneMaxHP}`,
            { fontSize: this.isMobile ? '13px' : '15px', color: '#ff6688', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }
          ).setDepth(30)

          // Keyboard
          const kbMap: Record<string, Dir> = { ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right' }
          const kbListener = (e: KeyboardEvent) => {
            const dir = kbMap[e.key]; if (!dir) return
            e.preventDefault(); e.stopImmediatePropagation()
            if (!this.ended) this.handleInput(dir, this.getElapsed())
          }
          feverKeyListener = kbListener
          window.addEventListener('keydown', kbListener, true)

          if (this.isMobile) {
            this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (this.ended || ptr.y < this.clippyZoneH) return
              this.handleInput(COLS[Math.min(3, Math.floor(ptr.x / (this.scale.width / 4)))], this.getElapsed())
            })
          }

          this.music = this.sound.add('fever-music', { loop: false, volume: 0.9 })
          this.music.play()
          const durationSeconds = Number((this.music as any).totalDuration || (this.music as any).duration || 0)
          if (Number.isFinite(durationSeconds) && durationSeconds > 35) {
            this.trackDurationMs = Math.round(durationSeconds * 1000)
          }
          this.feverStartTime = this.time.now
          // Texte de compte à rebours warmup (3…2…1…GO !)
          const W2 = this.scale.width, H2 = this.scale.height
          this.warmupTxt = this.add.text(W2 / 2, H2 / 2, '3', {
            fontFamily: 'monospace', fontSize: '120px', color: '#ff9944',
            stroke: '#000', strokeThickness: 8, align: 'center',
          }).setOrigin(0.5).setDepth(200)
        }

        private setupDesktop(W: number, H: number) {
          this.hitY = Math.round(H * 0.82)
          this.spawnAdv = ((this.hitY + 80) / FEVER_NOTE_SPEED) * 1000
          const totalLaneW = Math.min(W * 0.58, 530)
          this.laneW = Math.round(totalLaneW / 4)
          const laneX0 = Math.round(W/2 - totalLaneW/2)
          const laneRight = Math.round(W / 2 + totalLaneW / 2)
          this.laneCenterX = Math.round(W / 2)
          this.colX = COLS.map((_, i) => Math.round(laneX0 + (i + 0.5) * totalLaneW / COLS.length))

          this.add.rectangle(W/2, H/2, totalLaneW + 18, H, 0x000000).setAlpha(0.55)
          this.colX.forEach((x, i) => {
            const col = COL_HEX[COLS[i]], g = this.add.graphics()
            g.fillStyle(col, 0.08); g.fillRect(x - this.laneW/2, 0, this.laneW, H/2)
            g.fillStyle(col, 0.20); g.fillRect(x - this.laneW/2, H/2, this.laneW, H/2)
            if (i > 0) {
              const sg = this.add.graphics()
              sg.lineStyle(1.5, 0xffffff, 0.10); sg.moveTo(x - this.laneW/2, 0); sg.lineTo(x - this.laneW/2, H); sg.strokePath()
            }
          })
          const fretG = this.add.graphics()
          for (let i = 1; i < 13; i++) {
            const y = i * H / 13
            fretG.lineStyle(i % 4 === 0 ? 2.2 : 1.2, 0xffffff, i % 4 === 0 ? 0.20 : 0.10)
            fretG.beginPath(); fretG.moveTo(laneX0, y); fretG.lineTo(laneRight, y); fretG.strokePath()
          }
          this.laneFlashBg = COLS.map((dir, i) => this.add.rectangle(this.colX[i], H/2, this.laneW, H, COL_HEX[dir]).setAlpha(0))
          this.add.rectangle(W/2, this.hitY, totalLaneW + 18, 5, 0xffffff).setAlpha(0.08)
          this.add.rectangle(W/2, this.hitY, totalLaneW + 18, 1, 0xffffff).setAlpha(0.65)
          const nW = Math.round(this.laneW * 0.96), nH = Math.round(nW * 0.40), nR = Math.round(nH * 0.38)
          this.colX.forEach((x, i) => {
            const dir = COLS[i], col = COL_HEX[dir], dark = COL_DARK[dir], g = this.add.graphics()
            g.fillStyle(col, 0.18); g.fillRoundedRect(x-nW/2-6, this.hitY-nH/2-4, nW+12, nH+8, nR+4)
            g.fillStyle(dark, 1);   g.fillRoundedRect(x-nW/2, this.hitY-nH/2, nW, nH, nR)
            g.fillStyle(col, 1);    g.fillRoundedRect(x-nW/2, this.hitY-nH/2, nW, Math.round(nH*0.70), nR)
            g.lineStyle(2.5, 0xffffff, 0.55); g.strokeRoundedRect(x-nW/2, this.hitY-nH/2, nW, nH, nR)
            this.add.text(x, this.hitY, COL_ARROWS[dir], { fontSize:`${Math.round(nH*1.0)}px`, color:COL_CSS[dir], fontFamily:'monospace', fontStyle:'bold', stroke:'#00000077', strokeThickness:2 }).setOrigin(0.5).setAlpha(0.80)
          })
          this.clippySprite = this.add.image(Math.round(W * 0.82), Math.round(H * 0.50), 'evil-clippy-disco')
          const clippySize = Math.min(Math.round(H * 0.32), 160)
          this.clippySprite.setDisplaySize(clippySize, clippySize).setDepth(5)
          this.add.text(Math.round(W * 0.82), Math.round(H * 0.50) - clippySize / 2 - 14, 'CLIPPY', { fontSize: '14px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5, 1)
          this.spawnLasers(W, H, laneX0, laneRight)
        }

        private setupMobile(W: number, H: number) {
          this.clippyZoneH = Math.round(H * 0.26)
          this.hitY        = Math.round(H * 0.87)
          this.spawnAdv    = (this.hitY - this.clippyZoneH) / FEVER_NOTE_SPEED * 1000
          const colW = Math.round(W / 4); this.laneW = colW
          this.colX = COLS.map((_, i) => Math.round((i + 0.5) * W / COLS.length))

          const clipBg = this.add.graphics()
          clipBg.fillGradientStyle(0x0c001e, 0x0c001e, 0x04000e, 0x04000e, 1)
          clipBg.fillRect(0, 0, W, this.clippyZoneH)
          this.add.text(W / 2, 6, '*  FEVER NIGHT  *', {
            fontSize: '11px', color: '#cc88ff', fontFamily: 'monospace', letterSpacing: 3,
          }).setOrigin(0.5, 0)
          this.clippySprite = this.add.image(-9999, -9999, 'evil-clippy-disco').setVisible(false)
          onClippyMoveRef.current?.(0.5)
          const sepGfx = this.add.graphics()
          sepGfx.fillGradientStyle(0x7700ff, 0x7700ff, 0x000000, 0x000000, 0.35, 0.35, 0, 0)
          sepGfx.fillRect(0, this.clippyZoneH - 8, W, 8)
          this.add.rectangle(W/2, this.clippyZoneH, W, 2, 0xaa44ff).setAlpha(0.85)
          this.add.rectangle(W/2, this.clippyZoneH + (H - this.clippyZoneH)/2, W, H - this.clippyZoneH, 0x01000a)
          for (let i = 1; i < 4; i++) {
            const x = Math.round(i * W / 4), sg = this.add.graphics()
            sg.lineStyle(1, 0xffffff, 0.18); sg.moveTo(x, this.clippyZoneH); sg.lineTo(x, H); sg.strokePath()
          }
          COLS.forEach((dir, i) => {
            const x = this.colX[i], col = COL_HEX[dir], lH = H - this.clippyZoneH, g = this.add.graphics()
            g.fillStyle(col, 0.03); g.fillRect(x - colW/2, this.clippyZoneH, colW, lH/3)
            g.fillStyle(col, 0.07); g.fillRect(x - colW/2, this.clippyZoneH + lH/3, colW, lH/3)
            g.fillStyle(col, 0.12); g.fillRect(x - colW/2, this.clippyZoneH + 2*lH/3, colW, lH/3)
          })
          const fretG = this.add.graphics()
          const laneZoneH = H - this.clippyZoneH
          for (let i = 1; i < 13; i++) {
            const y = this.clippyZoneH + i * laneZoneH / 13
            fretG.lineStyle(i % 4 === 0 ? 2.0 : 1.0, 0xffffff, i % 4 === 0 ? 0.20 : 0.10)
            fretG.beginPath(); fretG.moveTo(0, y); fretG.lineTo(W, y); fretG.strokePath()
          }
          this.laneFlashBg = COLS.map((dir, i) => {
            const lH = H - this.clippyZoneH
            return this.add.rectangle(this.colX[i], this.clippyZoneH + lH/2, colW, lH, COL_HEX[dir]).setAlpha(0)
          })
          this.add.rectangle(W/2, this.hitY, W, 2, 0xffffff).setAlpha(0.9)
          const cR = Math.round(colW * 0.43)
          COLS.forEach((dir, i) => {
            const x = this.colX[i], col = COL_HEX[dir]
            const ring = this.add.circle(x, this.hitY, cR, col, 0.28); ring.setStrokeStyle(3, col, 1.0)
            this.add.circle(x, this.hitY, Math.round(cR*0.48), 0x000000, 0.60)
            this.add.text(x, this.hitY, COL_ARROWS[dir], { fontSize:`${Math.round(cR*0.95)}px`, color:COL_CSS[dir], fontFamily:'monospace', fontStyle:'bold', stroke:'#000', strokeThickness:3 }).setOrigin(0.5).setAlpha(0.85)
            this.hitRings[i] = ring
          })
          this.spawnLasers(W, H, -1)
        }

        private spawnLasers(W: number, H: number, laneX0: number, laneRight = -1) {
          const COLS_L = [0xff2266, 0x2266ff, 0x22ffcc, 0xff9900, 0xcc22ff, 0x22ff44]
          const isMob = laneX0 < 0
          const laserDefs = isMob
            ? [
                { ox: W * 0.04, oy: this.clippyZoneH * 0.18, angle: 55, col: COLS_L[0] },
                { ox: W * 0.96, oy: this.clippyZoneH * 0.18, angle: 125, col: COLS_L[1] },
                { ox: W * 0.08, oy: this.clippyZoneH * 0.50, angle: 60, col: COLS_L[4] },
                { ox: W * 0.92, oy: this.clippyZoneH * 0.50, angle: 120, col: COLS_L[2] },
              ]
            : [
                { ox: laneX0 * 0.35, oy: H * 0.04, angle: 65, col: COLS_L[0] },
                { ox: laneX0 * 0.60, oy: H * 0.03, angle: 75, col: COLS_L[2] },
                { ox: laneX0 * 0.20, oy: H * 0.06, angle: 50, col: COLS_L[4] },
                { ox: laneRight + (W - laneRight) * 0.65, oy: H * 0.04, angle: 115, col: COLS_L[3] },
                { ox: laneRight + (W - laneRight) * 0.40, oy: H * 0.03, angle: 105, col: COLS_L[5] },
                { ox: laneRight + (W - laneRight) * 0.80, oy: H * 0.06, angle: 130, col: COLS_L[1] },
              ]

          laserDefs.forEach(({ ox, oy, angle, col }, idx) => {
            const laserG = this.add.graphics().setDepth(2)
            const speed = 16 + (idx % 5) * 5
            let t = idx * 42.7
            const len = Math.max(W, H) * 1.5
            const timer = this.time.addEvent({
              delay: 40,
              loop: true,
              callback: () => {
                if (this.ended) { this.time.removeEvent(timer); return }
                t += speed * 0.04
                const rad = Phaser.Math.DegToRad(angle + Math.sin(Phaser.Math.DegToRad(t)) * 30)
                const ex = ox + Math.cos(rad) * len
                const ey = oy + Math.sin(rad) * len
                laserG.clear()
                laserG.lineStyle(14, col, 0.06)
                laserG.beginPath(); laserG.moveTo(ox, oy); laserG.lineTo(ex, ey); laserG.strokePath()
                laserG.lineStyle(5, col, 0.22)
                laserG.beginPath(); laserG.moveTo(ox, oy); laserG.lineTo(ex, ey); laserG.strokePath()
                laserG.lineStyle(2, 0xffffff, 0.30)
                laserG.beginPath(); laserG.moveTo(ox, oy); laserG.lineTo(ex, ey); laserG.strokePath()
              },
            })
            this.laserTimers.push(timer)
          })
        }

        update() {
          if (this.ended) return

          // ── Warmup 3s ─────────────────────────────────────────────────────
          if (this.isWarmup) {
            const real = this.time.now - this.feverStartTime
            const left = Math.ceil((FEVER_WARMUP_MS - real) / 1000)
            if (real < FEVER_WARMUP_MS) {
              if (this.warmupTxt) {
                const label = left <= 0 ? 'GO !' : String(left)
                if (this.warmupTxt.text !== label) this.warmupTxt.setText(label)
              }
              return
            }
            this.isWarmup = false
            if (this.warmupTxt) { this.warmupTxt.destroy(); this.warmupTxt = undefined }
            this.feverStartTime = this.time.now  // repart de 0 après le warmup
          }

          const elapsed = this.getElapsed()

          // Compte à rebours
          if (this.awaitingSurvivalChoice) return
          const remainingMs = Math.max(0, FEVER_CHALLENGE_MS - elapsed)
          const remaining = Math.ceil(remainingMs / 1000)
          this.countdownTxt.setText(this.survivalMode ? 'SURVIE' : `0:${String(remaining).padStart(2, '0')}`)
          this.countdownTxt.setColor(remaining <= 5 ? '#ff0000' : remaining <= 10 ? '#ff6600' : '#ff4400')
          if (!this.survivalMode && remaining <= 5) {
            const pulse = 1 + 0.25 * ((1000 - (elapsed % 1000)) / 1000)
            this.countdownTxt.setScale(pulse)
          } else {
            this.countdownTxt.setScale(1)
          }

          if (!this.challengeCleared && elapsed >= FEVER_CHALLENGE_MS) { this.showSurvivalPrompt(); return }
          if (this.survivalMode && elapsed >= this.trackDurationMs) { this.endGame('win'); return }
          if (this.survivalMode) {
            const speedMul = this.getSurvivalSpeedMultiplier(elapsed)
            this.survivalTxt
              .setText(`JUSQU A CE QUE MORT S ENSUIVE — VITESSE ×${speedMul.toFixed(2)}  DENSITÉ ×${this.getDensityMultiplier(elapsed).toFixed(1)}`)
              .setAlpha(1)
          }

          while (this.nextBeatTime() - elapsed < this.spawnAdv && this.nextBeatTime() <= this.trackDurationMs) {
            const beatTime = this.nextBeatTime()
            for (const note of this.buildFeverNotes(this.beatIdx, beatTime)) {
              if (note.time >= elapsed - 200) this.spawnNote(note.direction, note.time)
            }
            this.beatIdx++
          }

          for (const n of this.activeNotes) {
            if (n.judged) continue
            n.obj.setY(this.hitY - ((n.time - elapsed) / 1000) * FEVER_NOTE_SPEED * this.getSurvivalSpeedMultiplier(elapsed))
            if (n.time - elapsed < -(this.hitWin + 10)) { n.judged = true; n.obj.destroy(); this.doMiss() }
          }
          this.activeNotes = this.activeNotes.filter(n => !n.judged)

          const litDirs = new Set<Dir>()
          let closestDir: Dir | null = null
          let closestDist = Infinity
          for (const n of this.activeNotes) {
            if (!n.judged) {
              const tth = n.time - elapsed
              if (tth >= -this.hitWin && tth <= AHEAD_MS) {
                litDirs.add(n.dir)
                if (Math.abs(tth) < closestDist) { closestDist = Math.abs(tth); closestDir = n.dir }
              }
            }
          }
          this.laneFlashBg.forEach((bg, i) => bg.setAlpha(litDirs.has(COLS[i]) ? (this.isMobile ? 0.22 : 0.18) : 0))
          if (closestDir && closestDir !== this.lastLitDir) {
            this.lastLitDir = closestDir
            const idx = COLS.indexOf(closestDir)
            if (this.isMobile) onClippyMoveRef.current?.(this.colX[idx] / this.scale.width)
            else if (this.clippySprite) this.tweens.add({ targets: this.clippySprite, x: this.colX[idx], duration: 90, ease: 'Back.Out' })
          }

          if (this.feedbackTxt.alpha > 0) this.feedbackTxt.setAlpha(Math.max(0, this.feedbackTxt.alpha - 0.022))
          if (this.comboTxt.alpha > 0 && this.combo === 0) this.comboTxt.setAlpha(Math.max(0, this.comboTxt.alpha - 0.025))
        }

        private nextBeatTime() {
          return FEVER_WARMUP_MS + this.beatIdx * FEVER_BEAT_MS
        }

        private getDensityMultiplier(hitTime: number) {
          if (hitTime < FEVER_CHALLENGE_MS || !this.survivalMode) return FEVER_BASE_DENSITY_MULTIPLIER
          const steps = Math.floor((hitTime - FEVER_CHALLENGE_MS) / FEVER_SURVIVAL_STEP_MS)
          return FEVER_BASE_DENSITY_MULTIPLIER * Math.pow(FEVER_SURVIVAL_STEP_MULTIPLIER, steps)
        }

        private getSurvivalSpeedMultiplier(elapsed: number): number {
          if (!this.survivalMode || elapsed < FEVER_CHALLENGE_MS) return 1.0
          // +0.5% toutes les 6s, cap à ×1.85
          const steps = (elapsed - FEVER_CHALLENGE_MS) / 6000
          return Math.min(1.85, 1.0 + steps * 0.005)
        }

        private buildFeverNotes(beatIndex: number, beatTime: number): DanceNote[] {
          const patternCount = FEVER_BEAT_PATTERN[beatIndex % FEVER_BEAT_PATTERN.length]
          const density = this.getDensityMultiplier(beatTime)
          // En mode survie, la densité peut forcer +1 note au-delà du pattern
          const maxNotes = this.survivalMode
            ? Math.min(4, Math.max(patternCount, Math.floor(density)))
            : patternCount
          const si  = beatIndex % FEVER_SEQ.length
          const csi = beatIndex % FEVER_CSEQ.length
          const used  = new Set<string>()
          const notes: DanceNote[] = []
          notes.push({ time: beatTime, direction: COLS[FEVER_SEQ[si]] })
          used.add(COLS[FEVER_SEQ[si]])
          const pool = [COLS[FEVER_CSEQ[csi]], COLS[(FEVER_SEQ[si] + 2) % 4], COLS[(FEVER_SEQ[si] + 3) % 4]]
          for (const dir of pool) {
            if (notes.length >= maxNotes) break
            if (!used.has(dir)) { notes.push({ time: beatTime, direction: dir }); used.add(dir) }
          }
          return notes.filter(n => n.time <= this.trackDurationMs)
        }

        private spawnNote(dir: Dir, hitTime: number) {
          const i = COLS.indexOf(dir), x = this.colX[i], col = COL_HEX[dir], dark = COL_DARK[dir]
          const nW = Math.round(this.laneW * (this.isMobile ? 0.83 : 0.92))
          const nH = Math.round(nW * (this.isMobile ? 0.52 : 0.48))
          const r  = Math.round(nH * 0.36)
          const c  = this.add.container(x, -nH * 2)
          const g  = this.add.graphics()
          g.fillStyle(col, 0.16); g.fillRoundedRect(-nW/2-8, -nH/2-6, nW+16, nH+12, r+6)
          g.fillStyle(dark, 1);   g.fillRoundedRect(-nW/2, -nH/2, nW, nH, r)
          g.fillStyle(col, 1);    g.fillRoundedRect(-nW/2, -nH/2, nW, Math.round(nH*0.70), r)
          g.lineStyle(2.5, 0xffffff, 0.60); g.strokeRoundedRect(-nW/2, -nH/2, nW, nH, r)
          g.fillStyle(0xffffff, 0.38); g.fillRoundedRect(-nW/2+5, -nH/2+4, nW-10, Math.round(nH*0.26), Math.min(r-2,5))
          c.add([g, this.add.text(0, 1, COL_ARROWS[dir], { fontSize:`${Math.round(nH*1.05)}px`, color:'#ffffff', fontFamily:'monospace', fontStyle:'bold', stroke:'#00000077', strokeThickness:3 }).setOrigin(0.5)])
          c.setDepth(6)
          this.activeNotes.push({ obj: c, time: hitTime, dir, judged: false })
        }

        private handleInput(dir: Dir, elapsed: number) {
          // Si cette direction a été auto-jugée comme chord il y a < 300ms → ignorer sans pénalité
          const chordTs = this.chordJudgedDirs.get(dir)
          if (chordTs !== undefined && this.time.now - chordTs < 300) {
            this.chordJudgedDirs.delete(dir)
            return
          }

          let best: typeof this.activeNotes[0] | null = null
          let bestDelta = Infinity
          let hasEarlySameLane = false
          let hasNear = false
          for (const n of this.activeNotes) {
            if (n.judged || n.dir !== dir) continue
            const tth = n.time - elapsed, d = Math.abs(tth)
            if (tth > this.hitWin && tth <= this.earlyG) { hasEarlySameLane = true; hasNear = true }
            if (d < bestDelta) { bestDelta = d; best = n }
          }
          if (best && bestDelta <= this.hitWin) {
            const hitTime = best.time
            best.judged = true; best.obj.destroy()
            // Auto-valider les notes chord au même timestamp (±30ms) et mémoriser leur direction
            let chordBonus = 0
            for (const n of this.activeNotes) {
              if (!n.judged && Math.abs(n.time - hitTime) <= 30) {
                n.judged = true; n.obj.destroy(); chordBonus++
                this.chordJudgedDirs.set(n.dir, this.time.now)
              }
            }
            const perf = bestDelta <= this.perfWin
            this.score += (perf ? 150 : 80) + chordBonus * 80; feverFinalScore.current = this.score
            this.combo++; if (this.combo > this.maxCombo) { this.maxCombo = this.combo; feverFinalCombo.current = this.maxCombo }
            this.feedbackTxt.setText(perf ? 'PERFECT !' : 'GOOD !').setColor(perf ? '#4ade80' : '#ffcc44').setAlpha(1)
            this.scoreTxt.setText(`Score: ${this.score}`)
            if (this.combo >= 2) {
              this.comboTxt.setText(`COMBO  ×${this.combo}`).setColor('#ff9944').setAlpha(1)
              this.tweens.add({ targets: this.comboTxt, scaleX: 1.15, scaleY: 1.15, duration: 120, yoyo: true, ease: 'Back.Out' })
            }
          } else {
            this.feedbackTxt.setText(hasNear ? 'TROP TÔT !' : 'ERREUR !').setColor('#ff9944').setAlpha(1)
            this.combo = 0; this.comboTxt.setAlpha(0)
            if (!hasEarlySameLane) {
              this.hp = Math.max(0, this.hp - 1)
              onMissRef.current?.()
              if (this.hp <= 0) this.endGame(this.survivalMode ? 'win' : 'lose')
            }
          }
        }

        private doMiss() {
          this.feedbackTxt.setText('MISS !').setColor('#e85a5a').setAlpha(1)
          this.hp = Math.max(0, this.hp - 1)
          this.hpText.setText(`❤️ ${this.hp} / ${sceneMaxHP}`)
          this.hpText.setColor(this.hp <= 3 ? '#ff2244' : this.hp <= 7 ? '#ff8844' : '#ff6688')
          onMissRef.current?.()
          this.combo = 0; this.comboTxt.setAlpha(0)
          if (this.hp <= 0) this.endGame(this.survivalMode ? 'win' : 'lose')
        }

        private showSurvivalPrompt() {
          if (this.awaitingSurvivalChoice || this.ended) return
          this.challengeCleared = true
          this.awaitingSurvivalChoice = true
          this.pausedAtMs = FEVER_CHALLENGE_MS
          this.feverStartTime = this.time.now - this.pausedAtMs
          this.music.pause()
          this.activeNotes.forEach((note) => note.obj.setAlpha(0.22))

          const W = this.scale.width, H = this.scale.height
          const panelW = Math.min(W - 28, 620)
          const prompt = this.add.container(W / 2, H / 2).setDepth(60)
          const bg = this.add.rectangle(0, 0, panelW, 300, 0x080012, 0.96)
          bg.setStrokeStyle(2, 0xff66cc, 0.65)
          const title = this.add.text(0, -104, 'BRAVO !', {
            fontSize: '30px', color: '#ffdd66', fontFamily: 'monospace', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5,
          }).setOrigin(0.5)
          const body = this.add.text(0, -42, "Vous avez reussi le mode Fever Night.\nSouhaitez-vous continuer jusqu'a ce que mort s'en suive ?", {
            fontSize: '15px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
            align: 'center', lineSpacing: 8, wordWrap: { width: panelW - 64 },
            stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5)
          const yes = this.makePromptButton(-panelW * 0.22, 92, 'CONTINUER', 0xff3366, () => this.startSurvival())
          const no = this.makePromptButton(panelW * 0.22, 92, 'ARRETER', 0x33ccff, () => this.endGame('win'))
          prompt.add([bg, title, body, yes, no])
          this.survivalPrompt = prompt
        }

        private makePromptButton(x: number, y: number, label: string, color: number, onClick: () => void) {
          const button = this.add.container(x, y)
          const bg = this.add.rectangle(0, 0, 174, 54, color, 0.18)
          bg.setStrokeStyle(2, color, 0.85)
          const txt = this.add.text(0, 0, label, {
            fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5)
          bg.setInteractive({ useHandCursor: true })
          bg.on('pointerdown', onClick)
          bg.on('pointerover', () => bg.setAlpha(0.34))
          bg.on('pointerout', () => bg.setAlpha(1))
          button.add([bg, txt])
          return button
        }

        private startSurvival() {
          if (!this.awaitingSurvivalChoice || this.ended) return
          this.survivalMode = true
          this.awaitingSurvivalChoice = false
          this.feverStartTime = this.time.now - this.pausedAtMs
          this.survivalPrompt?.destroy()
          this.survivalPrompt = undefined
          this.activeNotes.forEach((note) => note.obj.setAlpha(1))
          this.survivalTxt.setText('JUSQU A CE QUE MORT S ENSUIVE - DENSITE x2').setAlpha(1)
          this.music.resume()
        }

        private endGame(result: 'win' | 'lose') {
          if (this.ended) return
          this.ended = true
          feverFinalScore.current = this.score; feverFinalCombo.current = this.maxCombo
          feverFinalSurvival.current = this.survivalMode ? Math.max(0, this.getElapsed() - FEVER_CHALLENGE_MS) : 0
          this.sound.stopAll()
          this.laserTimers.forEach(t => this.time.removeEvent(t))
          this.laserTimers = []
          this.time.addEvent({ delay: result === 'win' ? 900 : 600, callback: () => onFeverEndRef.current?.(result === 'win') })
        }
      }

      phaserGame = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: feverContainerRef.current!,
        transparent: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [FeverScene],
        audio: { disableWebAudio: false },
        banner: false,
        render: { antialias: true, antialiasGL: true, pixelArt: false },
      })
    })()

    return () => {
      destroyed = true
      if (feverKeyListener) { window.removeEventListener('keydown', feverKeyListener, true); feverKeyListener = null }
      phaserGame?.destroy(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerPhase])

  // ── Overlays état interne ───────────────────────────────────────────────────

  if (innerPhase === 'fever_post') {
    return (
      <FeverPostGameOverlay
        score={feverFinalScore.current}
        maxCombo={feverFinalCombo.current}
        leader={feverLeader}
        survivalLeader={feverSurvivalLeader}
        survivalMs={feverFinalSurvival.current}
        onContinue={() => onWin()}
      />
    )
  }

  if (postGame) {
    return (
      <PostGameOverlay
        score={postGame.score}
        maxCombo={postGame.maxCombo}
        won={postGame.won}
        leader={postGame.leader}
        onContinue={() => {
          if (finalWon.current) onWin(); else onLose()
        }}
      />
    )
  }

  if (innerPhase === 'rage') {
    return (
      <PerfectRageOverlay
        idx={rageIdx}
        onNext={() => setRageIdx(i => i + 1)}
        onDone={() => setInnerPhase('choice')}
      />
    )
  }

  if (innerPhase === 'choice') {
    return (
      <FeverChoiceOverlay
        onAccept={() => setInnerPhase('fever')}
        onRefuse={() => showPostGame(true)}
      />
    )
  }

  return (
    <>
      {/* Canvas DDR (caché pendant la scène Fever) */}
      <div
        ref={containerRef}
        tabIndex={-1}
        style={{ position: 'fixed', inset: 0, zIndex: 99985, outline: 'none', display: innerPhase === 'fever' ? 'none' : 'block' }}
      />

      {/* Canvas Fever Night */}
      {innerPhase === 'fever' && (
        <div
          ref={feverContainerRef}
          tabIndex={-1}
          style={{ position: 'fixed', inset: 0, zIndex: 99985, outline: 'none' }}
        />
      )}

      {/* ── Clippy HTML mobile (DDR uniquement) ── */}
      {isMobileUI && (innerPhase === 'ddr' || innerPhase === 'fever') && (
        <img
          src="/evil-clippy-disco.png"
          alt="Evil Clippy Disco"
          style={{
            position: 'fixed',
            left: `${clippyXPct * 100}%`,
            top: '26vh',
            transform: 'translate(-50%, -50%)',
            width: 'min(22vh, 32vw)',
            height: 'min(22vh, 32vw)',
            objectFit: 'contain',
            transition: 'left 0.09s cubic-bezier(.34,1.56,.64,1)',
            zIndex: 99988,
            pointerEvents: 'none',
            imageRendering: 'auto',
          }}
        />
      )}

      {(innerPhase === 'ddr') && <FlameBorder combo={liveCombo} />}
    </>
  )
}
