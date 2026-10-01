import { describe, it, expect } from 'vitest'
import { parisParts, parisOffsetMinutes, fromParis, parisDayRange, parisMonday, parisJour } from '../paris'

describe('parisParts', () => {
  it('30/09/2026 20:00 Paris = 18:00 UTC (summer time)', () => {
    const d = fromParis(2026, 9, 30, 20, 0)
    expect(d.toISOString()).toBe('2026-09-30T18:00:00.000Z')
  })

  it('28/10/2026 20:00 Paris = 19:00 UTC (winter time)', () => {
    const d = fromParis(2026, 10, 28, 20, 0)
    expect(d.toISOString()).toBe('2026-10-28T19:00:00.000Z')
  })
})

describe('parisOffsetMinutes', () => {
  it('summer offset is +120', () => {
    const d = new Date('2026-07-15T12:00:00Z')
    expect(parisOffsetMinutes(d)).toBe(120)
  })

  it('winter offset is +60', () => {
    const d = new Date('2026-12-15T12:00:00Z')
    expect(parisOffsetMinutes(d)).toBe(60)
  })
})

describe('parisDayRange', () => {
  it('25/10/2026 (DST change day) = 25 hours', () => {
    const d = fromParis(2026, 10, 25, 12, 0)
    const { start, end } = parisDayRange(d)
    const hours = (end.getTime() - start.getTime()) / 3600000
    expect(hours).toBe(25)
  })

  it('29/03/2026 (spring forward) = 23 hours', () => {
    const d = fromParis(2026, 3, 29, 12, 0)
    const { start, end } = parisDayRange(d)
    const hours = (end.getTime() - start.getTime()) / 3600000
    expect(hours).toBe(23)
  })
})

describe('parisMonday', () => {
  it('dimanche 01/11/2026 23:59 Paris -> lundi 26/10/2026 23:00Z', () => {
    const sunday = fromParis(2026, 11, 1, 23, 59)
    const mon = parisMonday(sunday)
    expect(mon.toISOString()).toBe('2026-10-25T23:00:00.000Z')
  })
})

describe('parisJour', () => {
  it('06/10/2026 03:59 Paris avec debut=4 -> 2026-10-05', () => {
    const d = fromParis(2026, 10, 6, 3, 59)
    expect(parisJour(d, 4)).toBe('2026-10-05')
  })

  it('06/10/2026 04:00 Paris avec debut=4 -> 2026-10-06', () => {
    const d = fromParis(2026, 10, 6, 4, 0)
    expect(parisJour(d, 4)).toBe('2026-10-06')
  })

  it('25/10/2026 03:30 Paris (02:30Z, after winter switch) avec debut=4 -> 2026-10-24', () => {
    const d = new Date('2026-10-25T02:30:00Z')
    expect(parisJour(d, 4)).toBe('2026-10-24')
  })

  it('25/10/2026 12:00 Paris avec debut=0 -> 2026-10-25', () => {
    const d = fromParis(2026, 10, 25, 12, 0)
    expect(parisJour(d, 0)).toBe('2026-10-25')
  })
})
