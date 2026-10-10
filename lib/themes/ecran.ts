export function ecranOccupe({ seuilZ, part }: { seuilZ: number; part: number }): boolean {
  if (typeof window === 'undefined') return false

  if (document.hidden) return true

  if (document.body.style.cursor) return true

  const active = document.activeElement
  if (active) {
    const tag = active.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || active.hasAttribute('contenteditable')) {
      return true
    }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const seuil = vw * vh * part

  const fixedEls = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]')
  let totalArea = 0

  const allEls = document.querySelectorAll('*')
  for (const el of allEls) {
    if (el.hasAttribute('data-calque-theme')) continue
    const style = window.getComputedStyle(el)
    if (style.position !== 'fixed') continue
    const z = parseInt(style.zIndex)
    if (isNaN(z) || z < seuilZ) continue
    const rect = el.getBoundingClientRect()
    const area = rect.width * rect.height
    if (area > 0) totalArea += area
    if (totalArea >= seuil) return true
  }

  return false
}
