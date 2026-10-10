let lastDestructClick: {
  x: number
  y: number
  target: HTMLElement | null
  modal: HTMLElement | null
  time: number
} | null = null

export function getLastDestructClick() {
  if (!lastDestructClick) return null
  if (Date.now() - lastDestructClick.time > 30_000) return null
  return lastDestructClick
}

export function emitDestruction() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cm:destruction'))
  }
}

export function initDestructionListener() {
  if (typeof window === 'undefined') return

  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest?.('[data-destructif]')
    if (!btn) return

    let x: number, y: number
    if (e.detail === 0) {
      const rect = (btn as HTMLElement).getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top + rect.height / 2
    } else {
      x = e.clientX
      y = e.clientY
    }

    const cible = (btn as HTMLElement).closest('[data-destructif-cible]') as HTMLElement | null

    let modal: HTMLElement | null = null
    let el: HTMLElement | null = btn as HTMLElement
    while (el) {
      const style = window.getComputedStyle(el)
      if (style.position === 'fixed' && parseInt(style.zIndex || '0') >= 500) {
        modal = el
        break
      }
      el = el.parentElement
    }

    lastDestructClick = { x, y, target: cible, modal, time: Date.now() }
  }, true)
}
