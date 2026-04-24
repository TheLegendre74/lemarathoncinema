import type { LifeGodInputController, LifeGodPaintMode, LifeGodRenderer, LifeGodSimulationController } from '../types'

interface CreateLifeGodInputParams {
  target: HTMLDivElement
  renderer: LifeGodRenderer
  simulation: LifeGodSimulationController
}

export function createLifeGodInput({
  target,
  renderer,
  simulation,
}: CreateLifeGodInputParams): LifeGodInputController {
  let pointerActive = false
  let activeMode: LifeGodPaintMode = 'draw'
  let selectionLock = false

  function paintFromPointer(event: PointerEvent) {
    const cell = renderer.getCellAtClientPoint(event.clientX, event.clientY)
    if (!cell) return
    simulation.paintCell(cell.x, cell.y, activeMode)
  }

  function handlePointerDown(event: PointerEvent) {
    const amId = renderer.getAmAtClientPoint(event.clientX, event.clientY, simulation.getState())
    if (amId) {
      selectionLock = true
      simulation.selectAm(amId)
      target.setPointerCapture(event.pointerId)
      return
    }

    pointerActive = true
    selectionLock = false
    activeMode = event.button === 2 ? 'erase' : 'draw'
    paintFromPointer(event)
    target.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent) {
    if (selectionLock || !pointerActive) return
    paintFromPointer(event)
  }

  function handlePointerUp(event: PointerEvent) {
    pointerActive = false
    selectionLock = false
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault()
  }

  target.addEventListener('pointerdown', handlePointerDown)
  target.addEventListener('pointermove', handlePointerMove)
  target.addEventListener('pointerup', handlePointerUp)
  target.addEventListener('pointerleave', handlePointerUp)
  target.addEventListener('pointercancel', handlePointerUp)
  target.addEventListener('contextmenu', handleContextMenu)

  return {
    destroy() {
      target.removeEventListener('pointerdown', handlePointerDown)
      target.removeEventListener('pointermove', handlePointerMove)
      target.removeEventListener('pointerup', handlePointerUp)
      target.removeEventListener('pointerleave', handlePointerUp)
      target.removeEventListener('pointercancel', handlePointerUp)
      target.removeEventListener('contextmenu', handleContextMenu)
    },
  }
}
