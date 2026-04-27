import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LifeGodPatternRequest, LifeGodPlayerPattern, LifeGodPlayerPatternType, LifeGodRelativeCell } from '../types'

const DRAWING_SIZE = 16
const MIN_CELLS_BY_TYPE: Record<LifeGodPlayerPatternType, number> = {
  tree: 4,
  animal: 3,
  rock: 3,
  river: 3,
}
const COLOR_BY_TYPE: Record<LifeGodPlayerPatternType, string> = {
  tree: '#48b86b',
  animal: '#8a5d3b',
  rock: '#9aa1aa',
  river: '#3d8ed8',
}

interface PatternDrawingOverlayProps {
  request: LifeGodPatternRequest
  onSubmit: (pattern: Omit<LifeGodPlayerPattern, 'id' | 'createdAt'>) => boolean
}

function cellKey(cell: LifeGodRelativeCell) {
  return `${cell.x}:${cell.y}`
}

export function PatternDrawingOverlay({ request, onSubmit }: PatternDrawingOverlayProps) {
  const [cells, setCells] = useState<Set<string>>(() => new Set())
  const [paintMode, setPaintMode] = useState<'draw' | 'erase'>('draw')
  const [message, setMessage] = useState('Simulation en pause')
  const activeColor = COLOR_BY_TYPE[request.type]
  const cellsArray = useMemo(() => {
    return [...cells].map((entry) => {
      const [x, y] = entry.split(':').map(Number)
      return { x, y }
    })
  }, [cells])

  function paintCell(index: number, mode: 'draw' | 'erase') {
    const x = index % DRAWING_SIZE
    const y = Math.floor(index / DRAWING_SIZE)
    const key = `${x}:${y}`
    setCells((previous) => {
      const next = new Set(previous)
      if (mode === 'draw') {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  function handlePointerDown(index: number, button: number) {
    const mode = button === 2 ? 'erase' : 'draw'
    setPaintMode(mode)
    paintCell(index, mode)
  }

  function validate() {
    const minCells = MIN_CELLS_BY_TYPE[request.type]
    if (cellsArray.length < minCells) {
      setMessage(`Minimum ${minCells} cellules`)
      return
    }

    const accepted = onSubmit({
      type: request.type,
      width: DRAWING_SIZE,
      height: DRAWING_SIZE,
      cells: cellsArray.sort((a, b) => a.y - b.y || a.x - b.x),
      requestIndex: request.requestIndex,
      colorHint: activeColor,
    })

    if (!accepted) {
      setMessage('Pattern refuse')
      return
    }

    setCells(new Set())
    setMessage('Pattern enregistre')
  }

  return (
    <div className="life-god-pattern-overlay" role="dialog" aria-modal="true" aria-label="Dessin de pattern">
      <div className="life-god-pattern-panel" onContextMenu={(event) => event.preventDefault()}>
        <div className="life-god-pattern-header">
          <div>
            <div className="life-god-pattern-kicker">Mode dessin</div>
            <div className="life-god-pattern-title">
              Dessinez un {request.label.toLowerCase()} ({request.requestIndex}/{request.totalForType})
            </div>
          </div>
          <div className="life-god-pattern-count" style={{ borderColor: activeColor, color: activeColor }}>
            {cellsArray.length}
          </div>
        </div>

        <div className="life-god-pattern-grid" style={{ '--pattern-color': activeColor } as CSSProperties}>
          {Array.from({ length: DRAWING_SIZE * DRAWING_SIZE }, (_, index) => {
            const x = index % DRAWING_SIZE
            const y = Math.floor(index / DRAWING_SIZE)
            const isActive = cells.has(cellKey({ x, y }))
            return (
              <button
                key={`${x}:${y}`}
                type="button"
                aria-label={`cellule ${x},${y}`}
                className={isActive ? 'life-god-pattern-cell active' : 'life-god-pattern-cell'}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  handlePointerDown(index, event.button)
                }}
                onPointerEnter={(event) => {
                  if (event.buttons === 0) return
                  paintCell(index, event.buttons === 2 ? 'erase' : paintMode)
                }}
              />
            )
          })}
        </div>

        <div className="life-god-pattern-actions">
          <span>{message}</span>
          <button type="button" onClick={() => setCells(new Set())}>
            Effacer
          </button>
          <button type="button" className="primary" onClick={validate}>
            Valider
          </button>
        </div>
      </div>

      <style jsx>{`
        .life-god-pattern-overlay {
          position: absolute;
          inset: 0;
          z-index: 12;
          display: grid;
          place-items: center;
          background: rgba(3, 5, 10, 0.56);
          backdrop-filter: blur(3px);
          pointer-events: auto;
        }

        .life-god-pattern-panel {
          width: min(92vw, 520px);
          padding: 16px;
          border: 1px solid rgba(232, 238, 252, 0.18);
          border-radius: 8px;
          background: rgba(8, 11, 18, 0.96);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
          color: rgba(235, 241, 255, 0.96);
        }

        .life-god-pattern-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }

        .life-god-pattern-kicker {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: rgba(180, 192, 216, 0.72);
        }

        .life-god-pattern-title {
          font-size: 18px;
          line-height: 1.2;
          font-weight: 700;
        }

        .life-god-pattern-count {
          min-width: 44px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid;
          border-radius: 6px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.04);
        }

        .life-god-pattern-grid {
          display: grid;
          grid-template-columns: repeat(16, 1fr);
          aspect-ratio: 1;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.24);
          user-select: none;
          touch-action: none;
        }

        .life-god-pattern-cell {
          min-width: 0;
          min-height: 0;
          aspect-ratio: 1;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          cursor: crosshair;
          padding: 0;
        }

        .life-god-pattern-cell.active {
          background: var(--pattern-color);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.24);
        }

        .life-god-pattern-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 12px;
          color: rgba(191, 202, 224, 0.82);
          font-size: 12px;
        }

        .life-god-pattern-actions span {
          margin-right: auto;
        }

        .life-god-pattern-actions button {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(236, 242, 255, 0.94);
          padding: 0.55rem 0.8rem;
          cursor: pointer;
        }

        .life-god-pattern-actions button.primary {
          background: rgba(87, 143, 212, 0.28);
          border-color: rgba(112, 172, 240, 0.44);
        }
      `}</style>
    </div>
  )
}
