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
      style={{
        minHeight: 'calc(100dvh - 56px)',
        background:
          'radial-gradient(circle at top, rgba(33,55,87,0.35) 0%, rgba(8,10,18,0.96) 42%, #030406 100%)',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1400,
          margin: '0 auto',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          overflow: 'hidden',
          background: 'rgba(5,7,13,0.92)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
        }}
      >
        <div
          ref={hostRef}
          aria-label="Life God Game viewport"
          style={{
            position: 'relative',
            minHeight: 'calc(100dvh - 120px)',
            background: 'linear-gradient(180deg, rgba(10,14,24,0.95) 0%, rgba(3,4,8,1) 100%)',
          }}
        />

        <LifeGodGameHud
          status={status}
          errorMessage={errorMessage}
          simulationState={simulationState}
          onTogglePlay={() => runtimeRef.current?.simulation.toggle()}
          onReset={() => runtimeRef.current?.simulation.reset()}
          onRandomize={() => runtimeRef.current?.simulation.randomize()}
          onDecreaseTimeScale={() => runtimeRef.current?.simulation.decreaseTimeScale()}
          onIncreaseTimeScale={() => runtimeRef.current?.simulation.increaseTimeScale()}
        />
      </div>
    </div>
  )
}
