'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SimulationController } from './simulationState'
import type { SimStatus } from './simulationState'
import { ConwayRenderer } from './renderer'
import { CONWAY_CONFIG } from './config'
import type { SpeedKey, DrawTool } from './config'
import ConwayControls from './controls'

interface ConwayOverlayProps {
  onClose: () => void
}

export default function ConwayOverlay({ onClose }: ConwayOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const ctrlRef      = useRef<SimulationController | null>(null)
  const rendRef      = useRef<ConwayRenderer | null>(null)

  const [status, setStatus]      = useState<SimStatus>('playing')
  const [speed, setSpeedState]   = useState<SpeedKey>(CONWAY_CONFIG.DEFAULT_SPEED)
  const [gen, setGen]            = useState(0)
  const [alive, setAlive]        = useState(0)
  const [activeTool, setActiveTool] = useState<DrawTool>('draw')

  // Dessin souris
  const isDrawing   = useRef(false)
  const activeToolRef = useRef<DrawTool>('draw')
  activeToolRef.current = activeTool

  // ── Initialisation ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width  = w
    canvas.height = h

    const cols = Math.max(1, Math.floor(w / CONWAY_CONFIG.CELL_SIZE))
    const rows = Math.max(1, Math.floor(h / CONWAY_CONFIG.CELL_SIZE))

    const ctrl = new SimulationController(cols, rows)
    const rend = new ConwayRenderer(canvas)

    ctrlRef.current = ctrl
    rendRef.current = rend

    ctrl.onTick = (state) => {
      rend.render(state)
      setStatus(state.status)
      setGen(state.generation)
      setAlive(state.aliveCount)
    }

    rend.render(ctrl.state)
    setGen(ctrl.state.generation)
    setAlive(ctrl.state.aliveCount)
    ctrl.play()

    return () => {
      ctrl.destroy()
      rend.destroy()
    }
  }, [])

  // ── Touche Échap ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Utilitaire : canvas coords → grid coords ─────────────────────────────
  const toGridCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const gx = Math.floor((clientX - rect.left) / CONWAY_CONFIG.CELL_SIZE)
    const gy = Math.floor((clientY - rect.top)  / CONWAY_CONFIG.CELL_SIZE)
    return { gx, gy }
  }, [])

  // ── Handlers souris ───────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDrawing.current = true
    const coords = toGridCoords(e.clientX, e.clientY)
    if (!coords) return
    // Clic droit → toujours effacer
    const tool: DrawTool = e.button === 2 ? 'erase' : activeToolRef.current
    ctrlRef.current?.applyTool(coords.gx, coords.gy, tool)
  }, [toGridCoords])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current) return
    const coords = toGridCoords(e.clientX, e.clientY)
    if (!coords) return
    const tool: DrawTool = e.buttons === 2 ? 'erase' : activeToolRef.current
    // Spark ne se propage pas en glissant (trop de chaos)
    if (tool === 'spark') return
    ctrlRef.current?.applyTool(coords.gx, coords.gy, tool)
  }, [toGridCoords])

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault() // empêche le menu contextuel sur clic droit
  }, [])

  // ── Handlers touch ────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    isDrawing.current = true
    const t = e.touches[0]
    const coords = toGridCoords(t.clientX, t.clientY)
    if (!coords) return
    ctrlRef.current?.applyTool(coords.gx, coords.gy, activeToolRef.current)
  }, [toGridCoords])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawing.current) return
    const t = e.touches[0]
    const coords = toGridCoords(t.clientX, t.clientY)
    if (!coords) return
    if (activeToolRef.current === 'spark') return
    ctrlRef.current?.applyTool(coords.gx, coords.gy, activeToolRef.current)
  }, [toGridCoords])

  const handleTouchEnd = useCallback(() => {
    isDrawing.current = false
  }, [])

  // ── Contrôles ─────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => { ctrlRef.current?.toggle() }, [])
  const handleReset     = useCallback(() => { ctrlRef.current?.reset() }, [])
  const handleRandom    = useCallback(() => { ctrlRef.current?.randomize() }, [])
  const handleSpeed     = useCallback((s: SpeedKey) => {
    setSpeedState(s)
    ctrlRef.current?.setSpeed(s)
  }, [])

  // Curseur selon l'outil actif
  const cursor = activeTool === 'erase' ? 'cell' : activeTool === 'spark' ? 'crosshair' : 'crosshair'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', flexDirection: 'column',
        background: '#05050a', fontFamily: 'monospace',
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(5,5,10,0.97)',
        borderBottom: '1px solid rgba(74,222,128,0.12)',
        flexShrink: 0, userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#4ade80', fontSize: 15, letterSpacing: 2 }}>◼◻◼◻◼</span>
          <span style={{ color: '#4ade80', fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>
            JEU DE LA VIE
          </span>
          <span style={{
            fontSize: 10, color: 'rgba(74,222,128,0.4)',
            border: '1px solid rgba(74,222,128,0.2)', borderRadius: 4,
            padding: '1px 6px', letterSpacing: 1,
          }}>
            Conway 1970
          </span>
        </div>
        <button
          onClick={onClose}
          title="Fermer (Échap)"
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, color: 'rgba(255,255,255,0.45)',
            fontSize: 14, padding: '4px 10px', cursor: 'pointer',
          }}
        >
          ✕ Fermer
        </button>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', position: 'absolute', inset: 0 }}
        />
      </div>

      {/* ── Barre de contrôles ──────────────────────────────────────────── */}
      <ConwayControls
        status={status}
        speed={speed}
        generation={gen}
        aliveCount={alive}
        activeTool={activeTool}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onRandom={handleRandom}
        onSpeed={handleSpeed}
        onToolChange={setActiveTool}
        onClose={onClose}
      />
    </div>
  )
}
