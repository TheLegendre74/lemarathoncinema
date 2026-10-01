const FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', hourCycle: 'h23', weekday: 'short',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

export function parisParts(d = new Date()) {
  const p = Object.fromEntries(FMT.formatToParts(d).map(x => [x.type, x.value]))
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second, dow }
}

export function parisOffsetMinutes(d: Date): number {
  const p = parisParts(d)
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s)
  return Math.round((asUtc - d.getTime()) / 60000)
}

export function fromParis(y: number, m: number, d: number, h = 0, min = 0): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, h, min))
  const off1 = parisOffsetMinutes(guess)
  const t = new Date(guess.getTime() - off1 * 60000)
  const off2 = parisOffsetMinutes(t)
  return off1 === off2 ? t : new Date(guess.getTime() - off2 * 60000)
}

export function parisDayRange(d = new Date()) {
  const p = parisParts(d)
  const start = fromParis(p.y, p.m, p.d)
  const next = new Date(Date.UTC(p.y, p.m - 1, p.d) + 86400000)
  const end = fromParis(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())
  return { start, end }
}

export function parisMonday(d = new Date()): Date {
  const p = parisParts(d)
  const monday = new Date(Date.UTC(p.y, p.m - 1, p.d) - (p.dow - 1) * 86400000)
  return fromParis(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate())
}

export function parisJour(d = new Date(), debut = 0): string {
  const p = parisParts(d)
  const base = Date.UTC(p.y, p.m - 1, p.d) - (p.h < debut ? 86400000 : 0)
  return new Date(base).toISOString().slice(0, 10)
}
