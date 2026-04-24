import type { CSSProperties } from 'react'
import type { LifeGodBootstrapStatus, LifeGodSimulationState } from '../types'

interface LifeGodGameHudProps {
  status: LifeGodBootstrapStatus
  errorMessage: string | null
  simulationState: LifeGodSimulationState | null
  onTogglePlay: () => void
  onReset: () => void
  onRandomize: () => void
  onDecreaseTimeScale: () => void
  onIncreaseTimeScale: () => void
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
  onDecreaseTimeScale,
  onIncreaseTimeScale,
}: LifeGodGameHudProps) {
  const selectedAm = simulationState?.amEntities.find((am) => am.id === simulationState.selectedAmId) ?? null
  const selectedLineage = selectedAm
    ? simulationState?.amLineages.find((lineage) => lineage.id === selectedAm.lineageId) ?? null
    : null

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
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
              <div>Temps : {simulationState.timeScale}x</div>
              <div>Population stable : {simulationState.amPopulationStable ? 'oui' : 'non'}</div>
              <div>Conway : {simulationState.conwayActive ? 'actif' : 'arrete'}</div>
              <div>Matiere : {simulationState.matterFrozen ? 'figee' : 'mobile'}</div>
              <div>Candidate AM : {simulationState.firstAmCandidateExists ? 'oui' : 'non'}</div>
              <div>Premiere AM revelee : {simulationState.firstAmRevealed ? 'oui' : 'non'}</div>
              <div>Reveal restant : {simulationState.firstAmRevealRemainingCycles}</div>
              <div>Scan AM : {simulationState.scanningActive ? 'actif' : 'arrete'}</div>
              <div>AM visibles : {simulationState.visibleAmCount}</div>
              <div>AM alive : {simulationState.completeAmCount}</div>
              <div>AM en mouvement : {simulationState.movingAmCount}</div>
              <div>AM en construction : {simulationState.assemblingAmCount}</div>
              <div>Patterns actifs : {simulationState.activePatternIds.length}/{simulationState.maxActivePatternsPerSeed}</div>
              <div>Lignees actives : {simulationState.amLineages.length}/3</div>
              <div>AM completes : {simulationState.completeAmCount}/{simulationState.maxCompleteAmBeforeScanStops}</div>
              <div>AM forming : {simulationState.formingAmCount}</div>
              <div>AM adapting : {simulationState.adaptingAmCount}</div>
              <div>Matiere figee : {simulationState.frozenMatterCount}</div>
              <div>Population AM : {simulationState.amEntities.length}</div>
              {selectedAm && selectedLineage && (
                <>
                  <div>AM id : {selectedAm.id}</div>
                  <div>Lineage id : {selectedAm.lineageId}</div>
                  <div>Lignee role : {selectedLineage.role}</div>
                  <div>AM age : {selectedAm.age}</div>
                  <div>AM energie : {selectedAm.energy}</div>
                  <div>AM etat : {selectedAm.state}</div>
                  <div>AM comportement : {selectedAm.behaviorState}</div>
                  <div>AM role : {selectedAm.role}</div>
                  <div>Cooldown repro : {selectedAm.reproductionCooldown}</div>
                  <div>AM phase : {selectedAm.state}</div>
                  <div>Lignee : {selectedLineage.name}</div>
                  <div>Pattern : {selectedAm.patternId}</div>
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
          <button type="button" onClick={onDecreaseTimeScale} style={controlButtonStyle}>
            -
          </button>
          <button type="button" onClick={onIncreaseTimeScale} style={controlButtonStyle}>
            +
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
            maxWidth: 300,
            textAlign: 'right',
          }}
        >
          Au debut, aucune AM visible n'apparait. Une premiere AM se forme en secret dans Conway, puis se revele. Maintiens Shift pour attirer les AM vivantes, Alt pour les repousser. A 10 AM alive, Conway s'arrete et la matiere restante se fige.
        </div>
      </div>
    </div>
  )
}
