'use client'

import type { SpeedKey, DrawTool } from './config'
import type { SimStatus } from './simulationState'

interface ConwayControlsProps {
  status: SimStatus
  speed: SpeedKey
  generation: number
  aliveCount: number
  activeTool: DrawTool
  onPlayPause: () => void
  onReset: () => void
  onRandom: () => void
  onSpeed: (s: SpeedKey) => void
  onToolChange: (t: DrawTool) => void
  onMini: () => void   // miniaturiser ou passer en mode flottant
  onClose: () => void
}

const BTN: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 6,
  border: '1px solid rgba(74,222,128,0.25)',
  background: 'rgba(74,222,128,0.07)',
  color: '#4ade80', fontSize: 12,
  fontFamily: 'monospace', cursor: 'pointer',
  lineHeight: 1.4, whiteSpace: 'nowrap' as const,
  transition: 'background 0.12s',
}

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN, background: 'rgba(74,222,128,0.22)',
  borderColor: 'rgba(74,222,128,0.65)',
}

const BTN_GHOST: React.CSSProperties = {
  ...BTN, color: 'rgba(255,255,255,0.38)',
  borderColor: 'rgba(255,255,255,0.1)',
  background: 'transparent',
}

const SEP: React.CSSProperties = {
  width: 1, height: 20, background: 'rgba(74,222,128,0.12)', flexShrink: 0,
}

const SPEEDS: Array<{ key: SpeedKey; label: string; title: string }> = [
  { key: 'slow',   label: '🐢', title: 'Lente'   },
  { key: 'normal', label: '▷▷', title: 'Normale' },
  { key: 'fast',   label: '⚡', title: 'Rapide'  },
]

const TOOLS: Array<{ key: DrawTool; label: string; title: string }> = [
  { key: 'draw',  label: '✏️', title: 'Dessiner (clic gauche / glissé)'   },
  { key: 'erase', label: '⬛', title: 'Effacer (clic droit / glissé)'     },
  { key: 'spark', label: '✨', title: 'Étincelle — injecte un burst de vie' },
]

export default function ConwayControls({
  status, speed, generation, aliveCount, activeTool,
  onPlayPause, onReset, onRandom, onSpeed, onToolChange, onMini, onClose,
}: ConwayControlsProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap',
      gap: 6, padding: '9px 14px',
      background: 'rgba(5,5,10,0.97)',
      borderTop: '1px solid rgba(74,222,128,0.12)',
    }}>
      {/* Simulation */}
      <button style={BTN} onClick={onPlayPause} title={status === 'playing' ? 'Pause' : 'Play'}>
        {status === 'playing' ? '⏸ Pause' : '▶ Play'}
      </button>
      <button style={BTN} onClick={onReset}  title="Effacer la grille">↺ Reset</button>
      <button style={BTN} onClick={onRandom} title="Seed aléatoire">🎲 Aléatoire</button>

      <div style={SEP} />

      {/* Outils */}
      {TOOLS.map(({ key, label, title }) => (
        <button
          key={key}
          style={activeTool === key ? BTN_ACTIVE : BTN}
          onClick={() => onToolChange(key)}
          title={title}
        >
          {label}
        </button>
      ))}

      <div style={SEP} />

      {/* Compteurs */}
      <span style={{
        fontSize: 11, fontFamily: 'monospace',
        color: 'rgba(74,222,128,0.55)', userSelect: 'none', whiteSpace: 'nowrap',
      }}>
        G<strong style={{ color: '#4ade80' }}>{generation.toLocaleString()}</strong>
        {' · '}
        <strong style={{ color: '#4ade80' }}>{aliveCount.toLocaleString()}</strong> ◼
      </span>

      <div style={{ flex: 1 }} />

      {/* Vitesse */}
      {SPEEDS.map(({ key, label, title }) => (
        <button
          key={key}
          style={speed === key ? BTN_ACTIVE : BTN}
          onClick={() => onSpeed(key)}
          title={`Vitesse ${title}`}
        >
          {label}
        </button>
      ))}

      <div style={SEP} />

      {/* Mini + Fermer */}
      <button style={BTN} onClick={onMini} title="Miniaturiser — continuer à naviguer">↘ Mini</button>
      <button style={BTN_GHOST} onClick={onClose} title="Fermer (Échap)">✕</button>
    </div>
  )
}
