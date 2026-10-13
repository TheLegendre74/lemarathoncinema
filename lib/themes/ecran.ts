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

  const candidates = new Set<Element>()
  for (const el of document.body.children) candidates.add(el)
  for (const el of document.querySelectorAll('[style*="position"]')) candidates.add(el)

  let totalArea = 0
  for (const el of candidates) {
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
