'use client'

import type { SpeedKey } from './config'
import type { SimStatus } from './simulationState'

interface ConwayControlsProps {
  status: SimStatus
  speed: SpeedKey
  generation: number
  aliveCount: number
  onPlayPause: () => void
  onReset: () => void
  onRandom: () => void
  onSpeed: (s: SpeedKey) => void
  onClose: () => void
}

const BTN: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid rgba(74,222,128,0.25)',
  background: 'rgba(74,222,128,0.08)',
  color: '#4ade80',
  fontSize: 13,
  fontFamily: 'monospace',
  cursor: 'pointer',
  lineHeight: 1.4,
  transition: 'background 0.15s, border-color 0.15s',
}

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN,
  background: 'rgba(74,222,128,0.22)',
  borderColor: 'rgba(74,222,128,0.6)',
}

const SPEEDS: Array<{ key: SpeedKey; label: string }> = [
  { key: 'slow', label: '🐢' },
  { key: 'normal', label: '▷▷' },
  { key: 'fast', label: '⚡' },
]

export default function ConwayControls({
  status,
  speed,
  generation,
  aliveCount,
  onPlayPause,
  onReset,
  onRandom,
  onSpeed,
  onClose,
}: ConwayControlsProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      padding: '10px 16px',
      background: 'rgba(5,5,10,0.97)',
      borderTop: '1px solid rgba(74,222,128,0.12)',
    }}>
      {/* Gauche : play/pause + reset + random */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={BTN} onClick={onPlayPause} title={status === 'playing' ? 'Pause' : 'Play'}>
          {status === 'playing' ? '⏸ Pause' : '▶ Play'}
        </button>
        <button style={BTN} onClick={onReset} title="Effacer la grille">
          ↺ Reset
        </button>
        <button style={BTN} onClick={onRandom} title="Seed aléatoire">
          🎲 Aléatoire
        </button>
      </div>

      {/* Centre : compteurs */}
      <div style={{
        fontSize: 12,
        fontFamily: 'monospace',
        color: 'rgba(74,222,128,0.6)',
        display: 'flex',
        gap: 16,
        userSelect: 'none',
      }}>
        <span>Gén. <strong style={{ color: '#4ade80' }}>{generation.toLocaleString()}</strong></span>
        <span>Vivantes <strong style={{ color: '#4ade80' }}>{aliveCount.toLocaleString()}</strong></span>
      </div>

      {/* Droite : vitesse + fermer */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {SPEEDS.map(({ key, label }) => (
          <button
            key={key}
            style={speed === key ? BTN_ACTIVE : BTN}
            onClick={() => onSpeed(key)}
            title={`Vitesse : ${key}`}
          >
            {label}
          </button>
        ))}
        <button
          style={{ ...BTN, marginLeft: 8, color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}
          onClick={onClose}
          title="Fermer (Échap)"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
