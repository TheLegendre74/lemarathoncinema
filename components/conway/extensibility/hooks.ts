// Conway — interfaces pour les extensions futures
// Ces types définissent les contrats des systèmes v2+.
// RIEN n'est implémenté ici : ce fichier sert de documentation vivante et de
// guide pour brancher les futures fonctionnalités sans réécrire le cœur.

import type { Grid } from '../gameOfLifeEngine'
import type { SimState } from '../simulationState'

// ─── Interaction souris / tactile ────────────────────────────────────────────

export type InteractionTool = 'paint' | 'erase' | 'impulse' | 'select'

export interface CellInteractionEvent {
  /** Coordonnées écran */
  screenX: number
  screenY: number
  /** Coordonnées grille */
  gridX: number
  gridY: number
  tool: InteractionTool
  pressure?: number // pour une future tablette
}

// ─── Clusters / groupes de cellules ─────────────────────────────────────────

export interface ClusterInfo {
  id: string
  cells: ReadonlyArray<readonly [number, number]>
  age: number         // générations depuis la première détection
  centroidX: number
  centroidY: number
  // v3+ : vitesse, direction, signature topologique
}

// ─── Entités / agents ────────────────────────────────────────────────────────

export interface ConwayAgent {
  id: string
  clusterId: string
  type: string       // 'glider' | 'block' | 'custom' | ...
  position: readonly [number, number]
  // v3+ : state machine, objectifs, mémoire
}

// ─── Extensions pluggables ───────────────────────────────────────────────────
// Pour brancher un système v2, créer un objet implémentant ConwayExtension
// et le passer à SimulationController.registerExtension() (à implémenter en v2).

export interface ConwayExtension {
  name: string

  // Appelé après chaque tick de simulation
  onTick?: (grid: Grid, generation: number) => void

  // Appelé quand un cluster est détecté / mis à jour / disparu
  onClusterDetected?: (cluster: ClusterInfo) => void
  onClusterLost?: (clusterId: string) => void

  // Appelé lors d'une interaction utilisateur sur la grille
  onCellInteraction?: (event: CellInteractionEvent) => void

  // Dessin sur un canvas overlay superposé au canvas principal
  renderOverlay?: (ctx: CanvasRenderingContext2D, state: SimState) => void
}

// ─── Obstacles / murs ────────────────────────────────────────────────────────
// v2+ : une deuxième couche de la grille stocke les murs (cellules immuables)

export interface WallLayer {
  walls: Uint8Array // même layout que Grid.cells
  width: number
  height: number
}

// ─── Règles custom ───────────────────────────────────────────────────────────
// SimulationController.setRules() est déjà câblé — suffit de passer ça :
//
//   controller.setRules({ survives: new Set([2,3,4]), births: new Set([3]) })
//
// Référence : https://www.conwaylife.com/wiki/Cellular_automaton#Well-known_rules
