import { useMemo, useState, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { LifeGodPatternRequest, LifeGodPlayerPattern, LifeGodPlayerPatternType, LifeGodRelativeCell } from '../types'

const DRAWING_SIZE = 16
const MIN_CELLS_BY_TYPE: Record<LifeGodPlayerPatternType, number> = {
  house: 5,
  tree: 4,
  animal: 3,
  tool: 3,
  rock: 3,
  river: 3,
}

const PALETTE = [
  '#c9a86c', '#48b86b', '#3d8ed8', '#9aa1aa',
  '#8a5d3b', '#7a8fb0', '#e74c3c', '#f39c12',
  '#9b59b6', '#1abc9c', '#ecf0f1', '#2c3e50',
]

const DEFAULT_COLOR_BY_TYPE: Record<LifeGodPlayerPatternType, string> = {
  house: '#c9a86c',
  tree: '#48b86b',
  animal: '#8a5d3b',
  tool: '#7a8fb0',
  rock: '#9aa1aa',
  river: '#3d8ed8',
}

interface CompletedCounts {
  house: number
  tree: number
  animal: number
  tool: number
  rock: number
  river: number
}

const LIBRARY_LIMITS: Record<LifeGodPlayerPatternType, number> = {
  house: 2, tree: 3, animal: 3, tool: 2, rock: 2, river: 1,
}

const TYPE_LABELS: Record<LifeGodPlayerPatternType, string> = {
  house: 'Maison', tree: 'Arbre', animal: 'Animal',
  tool: 'Outil', rock: 'Rocher', river: 'Riviere',
}

interface PatternDrawingOverlayProps {
  request: LifeGodPatternRequest
  onSubmit: (pattern: Omit<LifeGodPlayerPattern, 'id' | 'createdAt'>) => boolean
  inWorldPosition?: { screenX: number; screenY: number } | null
  completedCounts?: CompletedCounts
}

export function PatternDrawingOverlay({ request, onSubmit, inWorldPosition, completedCounts }: PatternDrawingOverlayProps) {
  const [cellColors, setCellColors] = useState<Map<string, string>>(() => new Map())
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR_BY_TYPE[request.type])
  const [paintMode, setPaintMode] = useState<'draw' | 'erase'>('draw')
  const [message, setMessage] = useState('')
  const paintingRef = useRef(false)
  const isInWorld = !!inWorldPosition

  const cellsArray = useMemo(() => {
    return [...cellColors.keys()].map((key) => {
      const [x, y] = key.split(':').map(Number)
      return { x, y }
    })
  }, [cellColors])

  const cellColorsRecord = useMemo(() => {
    const rec: Record<string, string> = {}
    for (const [key, color] of cellColors) rec[key] = color
    return rec
  }, [cellColors])

  function paintCell(x: number, y: number, mode: 'draw' | 'erase') {
    if (x < 0 || x >= DRAWING_SIZE || y < 0 || y >= DRAWING_SIZE) return
    const key = `${x}:${y}`
    setCellColors((prev) => {
      const next = new Map(prev)
      if (mode === 'draw') {
        next.set(key, activeColor)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  function handlePointerDown(x: number, y: number, button: number) {
    const mode = button === 2 ? 'erase' : 'draw'
    setPaintMode(mode)
    paintingRef.current = true
    paintCell(x, y, mode)
  }

  function handlePointerMove(x: number, y: number, buttons: number) {
    if (!paintingRef.current || buttons === 0) {
      paintingRef.current = false
      return
    }
    paintCell(x, y, buttons === 2 ? 'erase' : paintMode)
  }

  function handlePointerUp() {
    paintingRef.current = false
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
      cellColors: cellColorsRecord,
    })

    if (!accepted) {
      setMessage('Pattern refuse')
      return
    }

    setCellColors(new Map())
    setMessage('OK!')
  }

  const overlayStyle: CSSProperties = isInWorld
    ? {
        position: 'absolute',
        zIndex: 12,
        left: inWorldPosition!.screenX,
        top: inWorldPosition!.screenY,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
      }
    : {}

  return (
    <div
      className={isInWorld ? 'life-god-pattern-overlay-inworld' : 'life-god-pattern-overlay'}
      role="dialog"
      aria-modal={!isInWorld}
      aria-label="Dessin de pattern"
      style={isInWorld ? overlayStyle : undefined}
    >
      <div
        className={isInWorld ? 'life-god-pattern-panel life-god-pattern-panel-compact' : 'life-god-pattern-panel'}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="life-god-pattern-header">
          <div>
            <div className="life-god-pattern-kicker">
              {isInWorld ? 'Priere des AMs' : 'Mode dessin'}
            </div>
            <div className="life-god-pattern-title">
              {request.label} ({request.requestIndex}/{request.totalForType})
            </div>
          </div>
          <div className="life-god-pattern-count" style={{ borderColor: activeColor, color: activeColor }}>
            {cellsArray.length}
          </div>
        </div>

        {completedCounts && (
          <div className="life-god-pattern-tracker">
            {(Object.keys(LIBRARY_LIMITS) as LifeGodPlayerPatternType[]).map((type) => {
              const done = completedCounts[type]
              const total = LIBRARY_LIMITS[type]
              const isCurrent = type === request.type
              return (
                <span key={type} className={isCurrent ? 'tracker-item current' : 'tracker-item'}>
                  {TYPE_LABELS[type]} {done}/{total}
                </span>
              )
            })}
          </div>
        )}

        <div className="life-god-palette">
          {PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={color === activeColor ? 'palette-swatch active' : 'palette-swatch'}
              style={{ background: color }}
              onClick={() => setActiveColor(color)}
              aria-label={`Couleur ${color}`}
            />
          ))}
        </div>

        <div
          className="life-god-pattern-grid"
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {Array.from({ length: DRAWING_SIZE * DRAWING_SIZE }, (_, index) => {
            const x = index % DRAWING_SIZE
            const y = Math.floor(index / DRAWING_SIZE)
            const key = `${x}:${y}`
            const cellColor = cellColors.get(key)
            return (
              <button
                key={key}
                type="button"
                aria-label={`cellule ${x},${y}`}
                className={cellColor ? 'life-god-pattern-cell active' : 'life-god-pattern-cell'}
                style={cellColor ? { background: cellColor, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.24)' } : undefined}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handlePointerDown(x, y, e.button)
                }}
                onPointerMove={(e) => {
                  handlePointerMove(x, y, e.buttons)
                }}
              />
            )
          })}
        </div>

        <div className="life-god-pattern-actions">
          <span>{message}</span>
          <button type="button" onClick={() => setCellColors(new Map())}>
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

        .life-god-pattern-overlay-inworld {
          pointer-events: none;
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

        .life-god-pattern-panel-compact {
          width: min(82vw, 360px);
          background: rgba(8, 11, 18, 0.88);
          border-color: rgba(200, 215, 240, 0.28);
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.6);
          pointer-events: auto;
        }

        .life-god-pattern-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 8px;
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

        .life-god-pattern-tracker {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
          font-size: 11px;
        }

        .tracker-item {
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(200, 210, 230, 0.7);
        }

        .tracker-item.current {
          background: rgba(87, 143, 212, 0.25);
          color: rgba(140, 190, 255, 0.95);
          font-weight: 700;
        }

        .life-god-palette {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .palette-swatch {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
          transition: border-color 0.1s;
        }

        .palette-swatch.active {
          border-color: #fff;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
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
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.24);
        }

        .life-god-pattern-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
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
