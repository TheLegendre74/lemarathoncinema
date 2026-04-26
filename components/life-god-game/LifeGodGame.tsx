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

  useEffect(() => {
    const requestId = activePatternRequest?.id ?? null
    const simulation = runtimeRef.current?.simulation
    if (!simulation) return

    if (requestId && previousPatternRequestIdRef.current === null) {
      wasPlayingBeforePatternRef.current = simulationState?.status === 'playing'
      simulation.pause()
    }

    if (!requestId && previousPatternRequestIdRef.current !== null && wasPlayingBeforePatternRef.current) {
      simulation.play()
      wasPlayingBeforePatternRef.current = false
    }

    previousPatternRequestIdRef.current = requestId
  }, [activePatternRequest?.id, simulationState?.status])

  const patternSpeakerBubble = (() => {
    if (!simulationState?.currentPatternRequest || !simulationState.currentPatternSpokespersonAmId) return null
    const speaker = simulationState.amEntities.find((am) => am.id === simulationState.currentPatternSpokespersonAmId)
    const metrics = runtimeRef.current?.renderer.getViewportMetrics()
    if (!speaker || !metrics || speaker.absoluteCells.length === 0) return null
    const center = speaker.absoluteCells.reduce(
      (sum, cell) => ({ x: sum.x + cell.x, y: sum.y + cell.y }),
      { x: 0, y: 0 }
    )
    center.x /= speaker.absoluteCells.length
    center.y /= speaker.absoluteCells.length
    return {
      x: metrics.x + center.x * metrics.cellSize,
      y: metrics.y + center.y * metrics.cellSize,
      text: `${simulationState.currentPatternRequest.label}!`,
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
          {patternSpeakerBubble && (
            <div
              className="life-god-pattern-bubble"
              style={{
                left: patternSpeakerBubble.x,
                top: patternSpeakerBubble.y,
              }}
            >
              {patternSpeakerBubble.text}
            </div>
          )}
          {patternFeedback && <div className="life-god-pattern-feedback">{patternFeedback}</div>}
          {activePatternRequest && (
            <PatternDrawingOverlay
              key={activePatternRequest.id}
              request={activePatternRequest}
              onSubmit={submitPattern}
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

        .life-god-pattern-bubble {
          position: absolute;
          z-index: 11;
          transform: translate(-50%, calc(-100% - 14px));
          max-width: 160px;
          padding: 0.35rem 0.58rem;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 6px;
          background: rgba(235, 241, 255, 0.94);
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          pointer-events: none;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.34);
        }

        .life-god-pattern-bubble::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -6px;
          width: 10px;
          height: 10px;
          transform: translateX(-50%) rotate(45deg);
          background: rgba(235, 241, 255, 0.94);
          border-right: 1px solid rgba(255, 255, 255, 0.22);
          border-bottom: 1px solid rgba(255, 255, 255, 0.22);
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
