'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SimulationController } from '@/components/conway/simulationState'
import type { SimStatus } from '@/components/conway/simulationState'
import { ConwayRenderer } from '@/components/conway/renderer'
import { CONWAY_CONFIG } from '@/components/conway/config'
import type { SpeedKey, DrawTool } from '@/components/conway/config'
import ConwayControls from '@/components/conway/controls'

// ─── Page principale ─────────────────────────────────────────────────────────
export default function ConwayPageClient() {
  const router = useRouter()

  const containerRef  = useRef<HTMLDivElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const ctrlRef       = useRef<SimulationController | null>(null)
  const rendRef       = useRef<ConwayRenderer | null>(null)
  const isDrawing     = useRef(false)
  const activeToolRef = useRef<DrawTool>('draw')

  const [status,      setStatus]      = useState<SimStatus>('playing')
  const [speed,       setSpeedState]  = useState<SpeedKey>(CONWAY_CONFIG.DEFAULT_SPEED)
  const [gen,         setGen]         = useState(0)
  const [alive,       setAlive]       = useState(0)
  const [activeTool,  setActiveTool]  = useState<DrawTool>('draw')
  activeToolRef.current = activeTool

  // ── Init canvas ──────────────────────────────────────────────────────────
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

  // ── Souris ──────────────────────────────────────────────────────────────
  const toGrid = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const r = canvas.getBoundingClientRect()
    return { gx: Math.floor((cx - r.left) / CONWAY_CONFIG.CELL_SIZE), gy: Math.floor((cy - r.top) / CONWAY_CONFIG.CELL_SIZE) }
  }, [])

  const applyAt = useCallback((cx: number, cy: number, tool: DrawTool) => {
    const c = toGrid(cx, cy)
    if (c) ctrlRef.current?.applyTool(c.gx, c.gy, tool)
  }, [toGrid])

  const onMouseDown  = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); isDrawing.current = true
    applyAt(e.clientX, e.clientY, e.button === 2 ? 'erase' : activeToolRef.current)
  }, [applyAt])
  const onMouseMove  = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current || activeToolRef.current === 'spark') return
    applyAt(e.clientX, e.clientY, e.buttons === 2 ? 'erase' : activeToolRef.current)
  }, [applyAt])
  const onMouseUp    = useCallback(() => { isDrawing.current = false }, [])
  const onCtxMenu    = useCallback((e: React.MouseEvent) => e.preventDefault(), [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); isDrawing.current = true
    const t = e.touches[0]; applyAt(t.clientX, t.clientY, activeToolRef.current)
  }, [applyAt])
  const onTouchMove  = useCallback((e: React.TouchEvent) => {
    if (!isDrawing.current || activeToolRef.current === 'spark') return
    const t = e.touches[0]; applyAt(t.clientX, t.clientY, activeToolRef.current)
  }, [applyAt])
  const onTouchEnd   = useCallback(() => { isDrawing.current = false }, [])

  // ── Contrôles ─────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => ctrlRef.current?.toggle(), [])
  const handleReset     = useCallback(() => ctrlRef.current?.reset(), [])
  const handleRandom    = useCallback(() => ctrlRef.current?.randomize(), [])
  const handleSpeed     = useCallback((s: SpeedKey) => { setSpeedState(s); ctrlRef.current?.setSpeed(s) }, [])

  // Mode flottant : ouvre l'overlay en mini et revient en arrière
  const handleFloat = useCallback(() => {
    window.dispatchEvent(new CustomEvent('conway:invoke', { detail: { mini: true } }))
    router.back()
  }, [router])

  // ── Rendu ────────────────────────────────────────────────────────────
  const cursor = activeTool === 'erase' ? 'cell' : 'crosshair'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100dvh - 56px)', // 56px = bottom-nav mobile
      background: '#05050a', fontFamily: 'monospace',
      minHeight: 400,
    }}>
      {/* Header page */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', flexShrink: 0,
        background: 'rgba(5,5,10,0.97)',
        borderBottom: '1px solid rgba(74,222,128,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#4ade80', fontSize: 14, letterSpacing: 2 }}>◼◻◼◻◼</span>
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
          onClick={handleFloat}
          title="Continuer en mode flottant pendant la navigation"
          style={{
            padding: '5px 12px', borderRadius: 6,
            border: '1px solid rgba(74,222,128,0.25)',
            background: 'rgba(74,222,128,0.07)',
            color: '#4ade80', fontSize: 12, cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          ↗ Flottant
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
        <canvas
          ref={canvasRef}
          style={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>

      {/* Contrôles */}
      <ConwayControls
        status={status} speed={speed} generation={gen} aliveCount={alive}
        activeTool={activeTool}
        onPlayPause={handlePlayPause} onReset={handleReset} onRandom={handleRandom}
        onSpeed={handleSpeed} onToolChange={setActiveTool}
        onMini={handleFloat}
        onClose={() => router.back()}
      />
    </div>
  )
}
