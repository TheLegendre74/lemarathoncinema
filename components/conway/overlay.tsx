'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SimulationController } from './simulationState'
import type { SimStatus } from './simulationState'
import { ConwayRenderer } from './renderer'
import { CONWAY_CONFIG } from './config'
import type { SpeedKey, DrawTool } from './config'
import ConwayControls from './controls'

// Dimensions de la fenêtre miniaturisée
const MINI_W = 310
const MINI_H = 230 // header 28px + canvas 182px + strip 20px

interface ConwayOverlayProps {
  onClose: () => void
  startMini?: boolean // si true, démarre directement en mode mini
}

export default function ConwayOverlay({ onClose, startMini = false }: ConwayOverlayProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const ctrlRef       = useRef<SimulationController | null>(null)
  const rendRef       = useRef<ConwayRenderer | null>(null)
  const isDrawing     = useRef(false)
  const activeToolRef = useRef<DrawTool>('draw')

  const [isMini,      setIsMini]      = useState(startMini)
  const [status,      setStatus]      = useState<SimStatus>('playing')
  const [speed,       setSpeedState]  = useState<SpeedKey>(CONWAY_CONFIG.DEFAULT_SPEED)
  const [gen,         setGen]         = useState(0)
  const [alive,       setAlive]       = useState(0)
  const [activeTool,  setActiveTool]  = useState<DrawTool>('draw')
  activeToolRef.current = activeTool

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
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

    return () => { ctrl.destroy(); rend.destroy() }
  }, [])

  // ── Resize canvas buffer quand on restaure en plein écran ────────────────
  // Nécessaire si Conway a été ouvert en mode mini (buffer initialisé en petit)
  useEffect(() => {
    if (isMini) return
    const container = containerRef.current
    const canvas    = canvasRef.current
    const ctrl      = ctrlRef.current
    const rend      = rendRef.current
    if (!container || !canvas || !ctrl || !rend) return

    // rAF : laisser le DOM se mettre à jour avant de lire les dimensions
    const raf = requestAnimationFrame(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (!w || !h) return
      canvas.width  = w
      canvas.height = h
      rend.resize(w, h)
      const newCols = Math.max(1, Math.floor(w / CONWAY_CONFIG.CELL_SIZE))
      const newRows = Math.max(1, Math.floor(h / CONWAY_CONFIG.CELL_SIZE))
      ctrl.resizeGrid(newCols, newRows)
      rend.render(ctrl.state)
    })
    return () => cancelAnimationFrame(raf)
  }, [isMini])

  // ── Échap (seulement en mode plein écran) ─────────────────────────────────
  useEffect(() => {
    if (isMini) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMini, onClose])

  // ── Interaction souris ────────────────────────────────────────────────────
  const toGrid = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const r = canvas.getBoundingClientRect()
    return {
      gx: Math.floor((cx - r.left) / CONWAY_CONFIG.CELL_SIZE),
      gy: Math.floor((cy - r.top)  / CONWAY_CONFIG.CELL_SIZE),
    }
  }, [])

  const applyAt = useCallback((cx: number, cy: number, tool: DrawTool) => {
    const c = toGrid(cx, cy)
    if (c) ctrlRef.current?.applyTool(c.gx, c.gy, tool)
  }, [toGrid])

  const onMouseDown  = useCallback((e: React.MouseEvent) => {
    if (isMini) return // pas de dessin en mode mini
    e.preventDefault(); isDrawing.current = true
    applyAt(e.clientX, e.clientY, e.button === 2 ? 'erase' : activeToolRef.current)
  }, [isMini, applyAt])
  const onMouseMove  = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current || activeToolRef.current === 'spark') return
    applyAt(e.clientX, e.clientY, e.buttons === 2 ? 'erase' : activeToolRef.current)
  }, [applyAt])
  const onMouseUp    = useCallback(() => { isDrawing.current = false }, [])
  const onCtxMenu    = useCallback((e: React.MouseEvent) => { if (!isMini) e.preventDefault() }, [isMini])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMini) return
    e.preventDefault(); isDrawing.current = true
    const t = e.touches[0]; applyAt(t.clientX, t.clientY, activeToolRef.current)
  }, [isMini, applyAt])
  const onTouchMove  = useCallback((e: React.TouchEvent) => {
    if (!isDrawing.current || activeToolRef.current === 'spark') return
    const t = e.touches[0]; applyAt(t.clientX, t.clientY, activeToolRef.current)
  }, [applyAt])
  const onTouchEnd   = useCallback(() => { isDrawing.current = false }, [])

  // ── Contrôles ────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => ctrlRef.current?.toggle(), [])
  const handleReset     = useCallback(() => ctrlRef.current?.reset(), [])
  const handleRandom    = useCallback(() => ctrlRef.current?.randomize(), [])
  const handleSpeed     = useCallback((s: SpeedKey) => { setSpeedState(s); ctrlRef.current?.setSpeed(s) }, [])

  const cursor = isMini ? 'default' : activeTool === 'erase' ? 'cell' : 'crosshair'

  // ──────────────────────────────────────────────────────────────────────────
  // RENDU — deux modes partagent le même arbre React (mêmes refs, pas de remount)
  // ──────────────────────────────────────────────────────────────────────────

  if (isMini) {
    return (
      <div
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9997,
          width: MINI_W, height: MINI_H,
          display: 'flex', flexDirection: 'column',
          borderRadius: 10, overflow: 'hidden',
          border: '1px solid rgba(74,222,128,0.35)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.5)',
          background: '#05050a',
          fontFamily: 'monospace',
          // Future v3 : ajouter draggabilité ici (onMouseDown sur le header)
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Mini header */}
        <div style={{
          height: 28, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px',
          background: 'rgba(5,5,10,0.98)',
          borderBottom: '1px solid rgba(74,222,128,0.1)',
          userSelect: 'none',
        }}>
          <span style={{ fontSize: 11, color: 'rgba(74,222,128,0.7)', letterSpacing: 1 }}>
            ◼ JEU DE LA VIE
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(74,222,128,0.4)', alignSelf: 'center', marginRight: 4 }}>
              G{gen.toLocaleString()}
            </span>
            {/* Restaurer */}
            <button
              onClick={() => setIsMini(false)}
              title="Restaurer en plein écran"
              style={miniBtn}
            >
              ↗
            </button>
            {/* Fermer */}
            <button onClick={onClose} title="Fermer" style={{ ...miniBtn, color: 'rgba(255,255,255,0.4)' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Canvas mini — même containerRef et canvasRef : la simulation continue */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block', position: 'absolute', inset: 0,
              // CSS width/height scale le buffer canvas visuellement sans re-initialiser
              width: '100%', height: '100%',
            }}
          />
        </div>

        {/* Mini strip : play/pause uniquement */}
        <div style={{
          height: 24, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'rgba(5,5,10,0.98)',
          borderTop: '1px solid rgba(74,222,128,0.08)',
        }}>
          <button style={miniBtn} onClick={handlePlayPause}>
            {status === 'playing' ? '⏸' : '▶'}
          </button>
          <button style={miniBtn} onClick={handleRandom} title="Seed aléatoire">🎲</button>
        </div>
      </div>
    )
  }

  // ── Mode plein écran ───────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', flexDirection: 'column',
        background: '#05050a', fontFamily: 'monospace',
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', flexShrink: 0,
        background: 'rgba(5,5,10,0.97)',
        borderBottom: '1px solid rgba(74,222,128,0.12)',
        userSelect: 'none',
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

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}    onMouseLeave={onMouseUp}
        onContextMenu={onCtxMenu}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', inset: 0 }} />
      </div>

      {/* Contrôles */}
      <ConwayControls
        status={status} speed={speed} generation={gen} aliveCount={alive}
        activeTool={activeTool}
        onPlayPause={handlePlayPause} onReset={handleReset} onRandom={handleRandom}
        onSpeed={handleSpeed} onToolChange={setActiveTool}
        onMini={() => setIsMini(true)}
        onClose={onClose}
      />
    </div>
  )
}

const miniBtn: React.CSSProperties = {
  padding: '2px 7px', borderRadius: 4,
  border: '1px solid rgba(74,222,128,0.2)',
  background: 'rgba(74,222,128,0.06)',
  color: '#4ade80', fontSize: 11,
  cursor: 'pointer', lineHeight: 1.4,
}
