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
  onToggleMiniature: () => void
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
  onToggleMiniature,
}: LifeGodGameHudProps) {
  const selectedAm = simulationState?.amEntities.find((am) => am.id === simulationState.selectedAmId) ?? null
  const selectedLineage = selectedAm
    ? simulationState?.amLineages.find((lineage) => lineage.id === selectedAm.lineageId) ?? null
    : null
  const selectedSite = selectedAm
    ? simulationState?.constructionSites.find((site) => site.builderAmId === selectedAm.id) ?? null
    : null
  const seekingAmCount = simulationState?.amEntities.filter((am) =>
    am.behaviorState === 'seekingFixedCell' || am.behaviorState === 'movingToFixedCell'
  ).length ?? 0
  const carryingAmCount = simulationState?.amEntities.filter((am) => am.behaviorState === 'carryingCellToSite').length ?? 0
  const terraformingPercent = simulationState ? Math.round(simulationState.terraformationProgress * 100) : 0

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        minWidth: 0,
        maxWidth: 420,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        padding: '14px 18px',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(4,6,11,0.6)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', minWidth: 0 }}>
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
            overflowWrap: 'anywhere',
          }}
        >
          {status === 'loading' && 'Initialisation du rendu et de la simulation...'}
          {status === 'ready' && simulationState && (
            <>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 4 }}>
                <div>Phase : <b>{simulationState.phase}</b></div>
                <div>Mission AM : <b>{simulationState.currentMission}</b></div>
                <div>Demande active : {simulationState.currentPatternRequest ? `${simulationState.currentPatternRequest.label} ${simulationState.currentPatternRequest.requestIndex}/${simulationState.currentPatternRequest.totalForType}` : 'aucune'}</div>
                <div>Mode dessin : {simulationState.currentPatternRequest ? 'oui' : 'non'}</div>
                <div>Generation : {simulationState.generation}</div>
                <div>Vitesse : {simulationState.timeScale}x</div>
              </div>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 4 }}>
                <div>Conway : {simulationState.conwayActive ? '✓ actif' : '✗ arrêté'}</div>
                <div>Matière : {simulationState.matterFrozen ? '🔒 figée' : '〜 mobile'}</div>
                <div>Première AM révélée : {simulationState.firstAmRevealed ? 'oui' : 'non'}</div>
                {simulationState.firstAmCandidateExists && (
                  <div>Révélation dans : {simulationState.firstAmRevealRemainingCycles} cycles</div>
                )}
              </div>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 4 }}>
                <div>AM vivantes : {simulationState.completeAmCount} / {simulationState.aliveAmTarget}</div>
                <div>Objectif fondatrice : {simulationState.createdAmCount} / {simulationState.targetAmCount} AM créées</div>
                <div>Entités vivantes actives : {simulationState.amEntities.length}</div>
                <div>AM forming : {simulationState.formingAmCount}</div>
                <div>AM adapting : {simulationState.adaptingAmCount}</div>
                <div>AM en recherche : {seekingAmCount}</div>
                <div>AM en transport : {carryingAmCount}</div>
                <div>AM en assemblage : {simulationState.assemblingAmCount}</div>
                <div>AM en terraformation : {simulationState.terraformingAmCount}</div>
                <div>AM en mouvement : {simulationState.movingAmCount}</div>
              </div>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 4 }}>
                <div>Matière figée : {simulationState.frozenMatterCount} cellules</div>
                <div>Soil : {simulationState.soilCount}</div>
                <div>Vegetation : {simulationState.vegetationCount}</div>
                <div>Water : {simulationState.waterCount}</div>
                <div>Rock : {simulationState.rockCount}</div>
                <div>Terraforming : {terraformingPercent}%</div>
                <div>Terraform complete : {simulationState.terraformationComplete ? 'oui' : 'non'}</div>
                <div>AM bloquées : {simulationState.criticallyBlockedAmCount}</div>
                <div>Cellules vivantes : {simulationState.aliveCount}</div>
                <div>Lignées : {simulationState.amLineages.length} / 3</div>
                <div>Patterns actifs : {simulationState.activePatternIds.length} / {simulationState.maxActivePatternsPerSeed}</div>
                <div>Arbres : {simulationState.treePatternLibrary.length} / 3</div>
                <div>Animaux : {simulationState.animalPatternLibrary.length} / 3</div>
                <div>Rochers : {simulationState.rockPatternLibrary.length} / 3</div>
                <div>Riviere : {simulationState.riverPatternLibrary.length} / 1</div>
                <div>Porte-parole : {simulationState.currentPatternSpokespersonAmId ?? 'aucun'}</div>
                <div>Collection patterns : {simulationState.playerPatternCollectionComplete ? 'complete' : 'en cours'}</div>
              </div>
              {selectedAm && selectedLineage && (
                <div>
                  <div>— AM sélectionnée —</div>
                  <div>ID : {selectedAm.id}</div>
                  <div>Lignée : {selectedLineage.name} ({selectedLineage.role})</div>
                  <div>Âge : {selectedAm.age}</div>
                  <div>Énergie : {Math.round(selectedAm.energy)}</div>
                  <div>État : {selectedAm.state}</div>
                  <div>Comportement : {selectedAm.behaviorState}</div>
                  <div>Cooldown repro : {selectedAm.reproductionCooldown}</div>
                  <div>Pattern : {selectedAm.patternId}</div>
                  <div>Target cell : {selectedAm.targetCell ? `${selectedAm.targetCell.x},${selectedAm.targetCell.y}` : 'aucune'}</div>
                  <div>Build site : {selectedAm.buildSite ? `${selectedAm.buildSite.x},${selectedAm.buildSite.y}` : 'aucun'}</div>
                  <div>Cellules rassemblées : {selectedAm.gatheredCells.length}</div>
                  <div>Wall stick ticks : {selectedAm.memory.wallStickTicks}</div>
                  <div>Overcrowded ticks : {selectedAm.memory.overcrowdedTicks}</div>
                  <div>Repeated area ticks : {selectedAm.memory.repeatedAreaTicks}</div>
                  <div>Last message : {selectedAm.memory.lastMessageSent ?? 'aucun'}</div>
                  <div>Resource hints : {selectedAm.memory.knownResourceHints.length}</div>
                  <div>Danger hints : {selectedAm.memory.knownDangerHints.length}</div>
                  <div>Independence : {selectedAm.memory.independenceScore.toFixed(2)}</div>
                  <div>Total reward : {selectedAm.memory.totalReward.toFixed(1)}</div>
                  <div>Last reward : {selectedAm.memory.lastRewardReason ?? 'aucune'}</div>
                  <div>Terraform stuck : {selectedAm.memory.terraformStuckTicks}</div>
                  <div>Terraform target : {selectedAm.targetCell ? `${selectedAm.targetCell.x},${selectedAm.targetCell.y}` : 'aucune'}</div>
                  <div>Failed terraform targets : {selectedAm.memory.failedTerraformTargets.length}</div>
                  <div>Terraform conversions : {selectedAm.memory.terraformedCells}</div>
                  <div>Last terraform action : {selectedAm.memory.lastTerraformAction ?? 'aucune'}</div>
                  <div>Recovery triggered : {selectedAm.memory.recoveryTriggered ? 'oui' : 'non'}</div>
                  <div>Stuck area ticks : {selectedAm.memory.stuckAreaTicks}</div>
                  <div>Stuck center : {selectedAm.memory.stuckAreaCenter ? `${Math.round(selectedAm.memory.stuckAreaCenter.x)},${Math.round(selectedAm.memory.stuckAreaCenter.y)}` : 'aucun'}</div>
                  <div>Escape target : {selectedAm.memory.escapeTarget ? `${selectedAm.memory.escapeTarget.x},${selectedAm.memory.escapeTarget.y}` : 'aucune'}</div>
                  <div>Escape ticks left : {selectedAm.memory.escapeTicksRemaining}</div>
                  <div>Failed areas : {selectedAm.memory.failedAreas.length}</div>
                  <div>Escaping stuck area : {selectedAm.behaviorState === 'escapingStuckArea' ? 'oui' : 'non'}</div>
                  <div>Last useful action : {selectedAm.memory.lastUsefulActionTick}</div>
                  <div>Last stuck reason : {selectedAm.memory.lastStuckReason ?? 'aucune'}</div>
                  {selectedSite && (
                    <div>Chantier : {selectedSite.depositedCells.length} / {selectedSite.requiredCellCount}</div>
                  )}
                </div>
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
          <button type="button" onClick={onToggleMiniature} style={controlButtonStyle}>
            Mini
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
