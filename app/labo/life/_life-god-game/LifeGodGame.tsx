'use client'

import { useEffect, useRef, useState } from 'react'
import { createLifeGodSimulation } from './simulation/createLifeGodSimulation'
import { createPixiViewport } from './rendering/createPixiViewport'
import { createLifeGodInput } from './input/createLifeGodInput'
import { LifeGodGameHud } from './ui/LifeGodGameHud'
import { PatternDrawingOverlay } from './ui/PatternDrawingOverlay'
import type { LifeGodRuntime, LifeGodSimulationState } from './types'

export default function LifeGodGame() {
  const hostRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<LifeGodRuntime | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [simulationState, setSimulationState] = useState<LifeGodSimulationState | null>(null)
  const [isMiniature, setIsMiniature] = useState(false)
  const [patternFeedback, setPatternFeedback] = useState<string | null>(null)
  const previousPatternRequestIdRef = useRef<string | null>(null)
  const wasPlayingBeforePatternRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    let rafId = 0
    let latestState: LifeGodSimulationState | null = null

    function renderLoop() {
      if (runtimeRef.current && latestState) {
        runtimeRef.current.renderer.render(latestState)
      }
      rafId = window.requestAnimationFrame(renderLoop)
    }

    async function boot() {
      const host = hostRef.current
      if (!host) return

      try {
        const simulation = createLifeGodSimulation()
        const renderer = await createPixiViewport({
          host,
          initialState: simulation.getState(),
        })
        const input = createLifeGodInput({
          target: host,
          renderer,
          simulation,
        })

        if (cancelled) {
          input.destroy()
          renderer.destroy()
          simulation.destroy()
          return
        }

        unsubscribe = simulation.subscribe((nextState) => {
          latestState = nextState
          setSimulationState(nextState)
        })

        runtimeRef.current = { simulation, renderer, input }
        latestState = simulation.getState()
        renderer.render(latestState)
        rafId = window.requestAnimationFrame(renderLoop)
        setStatus('ready')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Life God Game bootstrap failure'
        setErrorMessage(message)
        setStatus('error')
      }
    }

    boot()

    return () => {
      cancelled = true
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      unsubscribe?.()
      runtimeRef.current?.input.destroy()
      runtimeRef.current?.renderer.destroy()
      runtimeRef.current?.simulation.destroy()
      runtimeRef.current = null
    }
  }, [])

  const activePatternRequest = simulationState?.currentPatternRequest ?? null
  const isCeremonyDrawing = simulationState?.ceremonyPhase === 'drawing'

  useEffect(() => {
    const requestId = activePatternRequest?.id ?? null
    const simulation = runtimeRef.current?.simulation
    if (!simulation) return

    if (requestId && previousPatternRequestIdRef.current === null && !isCeremonyDrawing) {
      wasPlayingBeforePatternRef.current = simulationState?.status === 'playing'
      simulation.pause()
    }

    if (!requestId && previousPatternRequestIdRef.current !== null && wasPlayingBeforePatternRef.current) {
      simulation.play()
      wasPlayingBeforePatternRef.current = false
    }

    previousPatternRequestIdRef.current = requestId
  }, [activePatternRequest?.id, simulationState?.status, isCeremonyDrawing])

  const ceremonyDrawPosition = (() => {
    if (!simulationState?.ceremonyCenterPoint || simulationState.ceremonyPhase !== 'drawing') return null
    const metrics = runtimeRef.current?.renderer.getViewportMetrics()
    if (!metrics) return null
    return {
      screenX: metrics.x + simulationState.ceremonyCenterPoint.x * metrics.cellSize,
      screenY: metrics.y + simulationState.ceremonyCenterPoint.y * metrics.cellSize,
    }
  })()

  function submitPattern(pattern: Parameters<LifeGodRuntime['simulation']['submitPlayerPattern']>[0]) {
    const accepted = runtimeRef.current?.simulation.submitPlayerPattern(pattern) ?? false
    if (accepted) {
      setPatternFeedback('Pattern enregistre')
      window.setTimeout(() => setPatternFeedback(null), 1100)
    }
    return accepted
  }

  const speechBubbleElements = simulationState?.speechBubbles.map(bubble => {
    const am = simulationState.amEntities.find(a => a.id === bubble.amId)
    const metrics = runtimeRef.current?.renderer.getViewportMetrics()
    if (!am || !metrics || am.absoluteCells.length === 0) return null
    let sx = 0, sy = 0
    for (const cell of am.absoluteCells) { sx += cell.x; sy += cell.y }
    const cx = sx / am.absoluteCells.length
    const cy = sy / am.absoluteCells.length
    const age = (simulationState.generation - bubble.startTick) / bubble.durationTicks
    const opacity = age > 0.8 ? 1 - (age - 0.8) / 0.2 : Math.min(1, age / 0.15)

    return (
      <div
        key={`${bubble.amId}-${bubble.startTick}`}
        className="life-god-speech-bubble"
        style={{
          left: metrics.x + cx * metrics.cellSize,
          top: metrics.y + cy * metrics.cellSize,
          opacity,
        }}
      >
        {bubble.text}
      </div>
    )
  }) ?? []

  return (
    <div
      className="life-god-shell"
      style={{
        minHeight: 'calc(100dvh - 56px)',
        background:
          'radial-gradient(circle at top, rgba(33,55,87,0.35) 0%, rgba(8,10,18,0.96) 42%, #030406 100%)',
        padding: isMiniature ? 0 : '1.25rem',
      }}
    >
      <div
        className={isMiniature ? 'life-god-frame life-god-frame-mini' : 'life-god-frame'}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMiniature ? 'none' : 2160,
          margin: isMiniature ? 0 : '0 auto',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: isMiniature ? 14 : 24,
          overflow: 'hidden',
          background: 'rgba(5,7,13,0.92)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
          display: 'grid',
          gridTemplateColumns: isMiniature ? '1fr' : 'minmax(0, 1fr) minmax(340px, 400px)',
          minHeight: isMiniature ? 'auto' : 'calc(100dvh - 96px)',
          height: isMiniature ? '100%' : 'calc(100dvh - 96px)',
        }}
      >
        <div
          aria-label="Life God Game viewport"
          className="life-god-viewport"
          style={{
            position: 'relative',
            minWidth: 0,
            overflow: 'hidden',
            minHeight: isMiniature ? 0 : 760,
            background: 'linear-gradient(180deg, rgba(10,14,24,0.95) 0%, rgba(3,4,8,1) 100%)',
          }}
        >
          <div
            ref={hostRef}
            style={{
              position: 'absolute',
              inset: 0,
            }}
          />
          {speechBubbleElements}
          {patternFeedback && <div className="life-god-pattern-feedback">{patternFeedback}</div>}
          {activePatternRequest && (
            <PatternDrawingOverlay
              key={activePatternRequest.id}
              request={activePatternRequest}
              onSubmit={submitPattern}
              inWorldPosition={ceremonyDrawPosition}
            />
          )}
        </div>
        {isMiniature ? (
          <button
            type="button"
            aria-label="Agrandir Life God Game"
            onClick={() => setIsMiniature(false)}
            className="life-god-mini-toggle"
          >
            ⛶
          </button>
        ) : (
          <LifeGodGameHud
            status={status}
            errorMessage={errorMessage}
            simulationState={simulationState}
            onTogglePlay={() => runtimeRef.current?.simulation.toggle()}
            onReset={() => runtimeRef.current?.simulation.reset()}
            onRandomize={() => runtimeRef.current?.simulation.randomize()}
            onDecreaseTimeScale={() => runtimeRef.current?.simulation.decreaseTimeScale()}
            onIncreaseTimeScale={() => runtimeRef.current?.simulation.increaseTimeScale()}
            onToggleMiniature={() => setIsMiniature(true)}
          />
        )}
      </div>
      <style jsx>{`
        .life-god-frame-mini {
          position: fixed !important;
          right: 18px;
          bottom: 18px;
          z-index: 80;
          width: min(520px, calc(100vw - 36px)) !important;
          height: min(360px, calc(100dvh - 92px)) !important;
        }

        .life-god-viewport {
          height: 100%;
        }

        .life-god-mini-toggle {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 3;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(4, 6, 12, 0.82);
          color: rgba(236, 242, 255, 0.96);
          cursor: pointer;
          font-size: 19px;
          line-height: 1;
        }

        .life-god-speech-bubble {
          position: absolute;
          z-index: 11;
          transform: translate(-50%, calc(-100% - 12px));
          max-width: 120px;
          padding: 0.25rem 0.45rem;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 5px;
          background: rgba(235, 241, 255, 0.88);
          color: #1a2233;
          font-size: 11px;
          font-weight: 700;
          pointer-events: none;
          white-space: nowrap;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
        }

        .life-god-speech-bubble::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -5px;
          width: 8px;
          height: 8px;
          transform: translateX(-50%) rotate(45deg);
          background: rgba(235, 241, 255, 0.88);
          border-right: 1px solid rgba(255, 255, 255, 0.18);
          border-bottom: 1px solid rgba(255, 255, 255, 0.18);
        }

        .life-god-pattern-feedback {
          position: absolute;
          z-index: 13;
          left: 50%;
          top: 18px;
          transform: translateX(-50%);
          padding: 0.48rem 0.75rem;
          border: 1px solid rgba(110, 190, 142, 0.42);
          border-radius: 6px;
          background: rgba(10, 28, 20, 0.9);
          color: rgba(210, 247, 222, 0.96);
          font-size: 12px;
          font-weight: 700;
          pointer-events: none;
        }

        @media (max-width: 920px) {
          .life-god-shell {
            padding: 0.75rem !important;
          }

          .life-god-frame {
            grid-template-columns: 1fr !important;
            height: auto !important;
            min-height: calc(100dvh - 80px) !important;
          }

          .life-god-viewport {
            min-height: 68dvh !important;
          }
        }
      `}</style>
    </div>
  )
}
