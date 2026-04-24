import type { CSSProperties } from 'react'
import type { LifeGodBootstrapStatus, LifeGodSimulationState } from '../types'

interface LifeGodGameHudProps {
  status: LifeGodBootstrapStatus
  errorMessage: string | null
  simulationState: LifeGodSimulationState | null
  onTogglePlay: () => void
  onReset: () => void
  onRandomize: () => void
}

const controlButtonStyle: CSSProperties = {
  pointerEvents: 'auto',
  padding: '0.58rem 0.85rem',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(8,12,20,0.86)',
  color: 'var(--text2)',
  fontSize: 12,
  cursor: 'pointer',
  minWidth: 76,
}

export function LifeGodGameHud({
  status,
  errorMessage,
  simulationState,
  onTogglePlay,
  onReset,
  onRandomize,
}: LifeGodGameHudProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 18,
        left: 18,
        right: 18,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        alignItems: 'flex-start',
        pointerEvents: 'none',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        <div
          style={{
            padding: '0.45rem 0.7rem',
            borderRadius: 999,
            border: '1px solid rgba(168,184,219,0.18)',
            background: 'rgba(6,9,16,0.72)',
            backdropFilter: 'blur(10px)',
            color: 'rgba(216,224,242,0.88)',
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            width: 'fit-content',
          }}
        >
          Life God Game
        </div>

        <div
          style={{
            padding: '0.7rem 0.85rem',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(4,6,12,0.74)',
            color: status === 'error' ? '#fca5a5' : 'var(--text2)',
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {status === 'loading' && 'Initialisation du rendu et de la simulation...'}
          {status === 'ready' && simulationState && (
            <>
              <div>Phase actuelle : {simulationState.phase}</div>
              <div>Cellules vivantes : {simulationState.aliveCount}</div>
              <div>Generation : {simulationState.generation}</div>
              <div>Pattern fondateur : {simulationState.founderPattern ? simulationState.founderPattern.id : 'aucun'}</div>
              {simulationState.amEntity && simulationState.selectedAmId === simulationState.amEntity.id && (
                <>
                  <div>AM id : {simulationState.amEntity.id}</div>
                  <div>AM age : {simulationState.amEntity.age}</div>
                  <div>AM energie : {simulationState.amEntity.energy}</div>
                  <div>AM phase : {simulationState.phase === 'creature' ? 'Creature' : 'Cellule'}</div>
                </>
              )}
            </>
          )}
          {status === 'error' && (errorMessage ?? 'Life God Game failed to start.')}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" onClick={onTogglePlay} style={controlButtonStyle}>
            {simulationState?.status === 'playing' ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={onReset} style={controlButtonStyle}>
            Reset
          </button>
          <button type="button" onClick={onRandomize} style={controlButtonStyle}>
            Random Seed
          </button>
        </div>
        <div
          style={{
            padding: '0.55rem 0.75rem',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(4,6,12,0.7)',
            color: 'var(--text3)',
            fontSize: 12,
            maxWidth: 280,
            textAlign: 'right',
          }}
        >
          Clic gauche pour ajouter, clic droit pour effacer, maintien pour peindre.
        </div>
      </div>
    </div>
  )
}
