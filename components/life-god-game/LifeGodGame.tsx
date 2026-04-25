'use client'

import { useEffect, useRef, useState } from 'react'
import { createLifeGodSimulation } from './simulation/createLifeGodSimulation'
import { createPixiViewport } from './rendering/createPixiViewport'
import { createLifeGodInput } from './input/createLifeGodInput'
import { LifeGodGameHud } from './ui/LifeGodGameHud'
import type { LifeGodRuntime, LifeGodSimulationState } from './types'

export default function LifeGodGame() {
  const hostRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<LifeGodRuntime | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [simulationState, setSimulationState] = useState<LifeGodSimulationState | null>(null)
  const [isMiniature, setIsMiniature] = useState(false)

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
          maxWidth: isMiniature ? 'none' : 1560,
          margin: isMiniature ? 0 : '0 auto',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: isMiniature ? 14 : 24,
          overflow: 'hidden',
          background: 'rgba(5,7,13,0.92)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
          display: 'grid',
          gridTemplateColumns: isMiniature ? '1fr' : 'minmax(0, 1fr) minmax(320px, 410px)',
          minHeight: isMiniature ? 'auto' : 'calc(100dvh - 96px)',
          height: isMiniature ? '100%' : 'calc(100dvh - 96px)',
        }}
      >
        <div
          ref={hostRef}
          aria-label="Life God Game viewport"
          className="life-god-viewport"
          style={{
            position: 'relative',
            minWidth: 0,
            minHeight: isMiniature ? 0 : 520,
            background: 'linear-gradient(180deg, rgba(10,14,24,0.95) 0%, rgba(3,4,8,1) 100%)',
          }}
        />
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
            min-height: 54dvh !important;
          }
        }
      `}</style>
    </div>
  )
}
