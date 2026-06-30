// ── Moteur de combat Cinémon — port de engine2.py ──
// Machine à états tour-par-tour. Sert au jeu jouable, à Clippy, et à la simulation.

import type {
  FilmCombatant, MoveEngine, StatId, GenreType,
  SideState, FieldState, TurnDecision, BattleEvent,
} from './types'
import { getStageMult, emptyStages } from './types'
import { BALANCE } from './config/balance.config'
import { getTypeMult } from './config/types.config'

// ── Helpers ──

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function rng(lo: number, hi: number) { return lo + Math.random() * (hi - lo) }

// ── Side / Field constructors ──

export function newSide(): SideState {
  return { rocks: 0, spikes: 0, tspikes: 0, sticky: 0, reflect: 0, lightscreen: 0, monset: new Set(), underset: new Set() }
}

export function newField(): FieldState {
  return { weather: null, weatherTurns: 0, weatherSetter: null, trickRoom: 0 }
}

// ── Stat calculation ──

export function getEffStat(mon: FilmCombatant, stat: StatId): number {
  let v = mon.base[stat] * getStageMult(mon.stages[stat])
  if (mon.megaActive && mon.mega) {
    v *= mon.megaMult
  }
  if (stat === 'Ryt' && mon.status === 'para') v *= 0.5
  return v
}

export function getEffSpeed(mon: FilmCombatant, field: FieldState): number {
  return getEffStat(mon, 'Ryt')
}

// ── Boost ──

export function applyBoost(mon: FilmCombatant, stat: StatId, n: number) {
  if (n < 0 && mon.passiveEngine.cat === 'no_lower') return
  mon.stages[stat] = clamp(mon.stages[stat] + n, -6, 6)
}

function applyBoosts(mon: FilmCombatant, boosts: [string, number][]) {
  for (const [k, n] of boosts) {
    if (k === 'ALL') {
      for (const s of ['Spec', 'Tec', 'Sce', 'Prof', 'Ryt'] as StatId[]) applyBoost(mon, s, n)
    } else {
      applyBoost(mon, k as StatId, n)
    }
  }
}

// ── Status ──

export function applyStatus(mon: FilmCombatant, st: string): boolean {
  if (mon.status && st !== 'confusion') return false
  if (mon.passiveEngine.cat === 'status_immune') return false

  if (st === 'confusion') {
    mon.confTurns = 2 + Math.floor(Math.random() * 3)
    return true
  }
  if (st === 'sleep') {
    mon.sleepTurns = 1 + Math.floor(Math.random() * 3)
    mon.status = 'sleep'
    return true
  }
  mon.status = st as any
  if (st === 'poison_bad') mon.toxCounter = 1
  return true
}

// ── Damage calculation ──

export interface DamageResult {
  damage: number
  typeMult: number
  isCrit: boolean
}

export function calculateDamage(
  att: FilmCombatant,
  dfn: FilmCombatant,
  mv: MoveEngine,
  field: FieldState,
  sideDef: SideState,
  opts?: { deterministic?: boolean },
): DamageResult {
  const cat = mv.cat
  if (cat !== 'phys' && cat !== 'spe') return { damage: 0, typeMult: 1, isCrit: false }

  const a = cat === 'phys' ? getEffStat(att, 'Spec') : getEffStat(att, 'Sce')
  let d = cat === 'phys' ? getEffStat(dfn, 'Tec') : getEffStat(dfn, 'Prof')
  d *= BALANCE.ANTISTALL_WALLBREAK_FACTOR

  const stab = mv.type !== '—' && att.types.includes(mv.type as GenreType) ? BALANCE.STAB : 1.0
  const tm = getTypeMult(mv.type, dfn.types)
  if (tm === 0) return { damage: 0, typeMult: 0, isCrit: false }

  let w = 1.0
  if (field.weather === 'sun') w = BALANCE.SUN_DAMAGE_MULT

  const det = opts?.deterministic
  const isCrit = det ? false : Math.random() < BALANCE.CRIT_CHANCE
  let critMult = 1.0
  if (isCrit) {
    if (dfn.passiveEngine.cat === 'crit_immune') critMult = 1.0
    else critMult = BALANCE.CRIT_MULT
  }

  const alea = det ? 1.0 : rng(BALANCE.RANDOM_MIN, BALANCE.RANDOM_MAX)

  let dmg = ((mv.pow ?? 0) * a / d / 3 + 2) * stab * tm * w * critMult * alea

  // Weather team buff
  if (field.weather && att.types.length > 0) {
    const genre = att.types[0]
    if (BALANCE.GENRE_WEATHER[genre] === field.weather) {
      dmg *= BALANCE.WEATHER_TEAM_BUFF
    }
  }

  // Legendary cold entry
  if (att.rarity === 'LÉGENDAIRE') {
    dmg *= att.firstTurn ? BALANCE.LEG_COLD_FACTOR : BALANCE.LEG_WARM
  }

  // Outsider
  if (att.isOutsider && att.outsiderCombo >= BALANCE.OUTSIDER_GATE) {
    dmg *= (1 + BALANCE.OUTSIDER_SCALE * (att.outsiderCombo - (BALANCE.OUTSIDER_GATE - 1)))
  }
  if (dfn.isOutsider && dfn.outsiderCombo >= BALANCE.OUTSIDER_GATE) {
    dmg *= (1 - BALANCE.OUTSIDER_SCALE * (dfn.outsiderCombo - (BALANCE.OUTSIDER_GATE - 1)))
  }

  // Burn halves physical
  if (cat === 'phys' && att.status === 'burn') dmg *= 0.5

  // Screens
  if (cat === 'phys' && sideDef.reflect > 0) dmg *= 0.5
  if (cat === 'spe' && sideDef.lightscreen > 0) dmg *= 0.5

  // Multiscale / first-hit halving
  if (dfn.passiveEngine.cat === 'multiscale_first' && dfn.hp === dfn.maxHp) dmg *= 0.5

  return { damage: Math.max(1, Math.floor(dmg)), typeMult: tm, isCrit }
}

// deterministic expected damage (for AI decisions)
export function damageExpect(
  att: FilmCombatant, dfn: FilmCombatant, mv: MoveEngine,
  field: FieldState, sideDef: SideState,
): { dmg: number; tm: number } {
  const cat = mv.cat
  if (cat !== 'phys' && cat !== 'spe') return { dmg: 0, tm: 1 }
  if (mv.percent) return { dmg: Math.max(1, Math.floor(dfn.maxHp * mv.percent)), tm: 1 }

  const a = cat === 'phys' ? getEffStat(att, 'Spec') : getEffStat(att, 'Sce')
  let d = cat === 'phys' ? getEffStat(dfn, 'Tec') : getEffStat(dfn, 'Prof')
  d *= BALANCE.ANTISTALL_WALLBREAK_FACTOR

  const stab = mv.type !== '—' && att.types.includes(mv.type as GenreType) ? BALANCE.STAB : 1.0
  const tm = getTypeMult(mv.type, dfn.types)
  if (tm === 0) return { dmg: 0, tm: 0 }

  const w = field.weather === 'sun' ? BALANCE.SUN_DAMAGE_MULT : 1.0
  let dmg = ((mv.pow ?? 0) * a / d / 3 + 2) * stab * tm * w * 0.925

  if (cat === 'phys' && att.status === 'burn') dmg *= 0.5
  if (cat === 'phys' && sideDef.reflect > 0) dmg *= 0.5
  if (cat === 'spe' && sideDef.lightscreen > 0) dmg *= 0.5
  if (dfn.passiveEngine.cat === 'multiscale_first' && dfn.hp === dfn.maxHp) dmg *= 0.5

  return { dmg: Math.max(1, dmg), tm }
}

// ── Best offensive move (for AI) ──

export function bestOffense(
  att: FilmCombatant, dfn: FilmCombatant, field: FieldState, sideDef: SideState,
): { move: MoveEngine | null; dmgAcc: number; dmgRaw: number } {
  let best: MoveEngine | null = null
  let bestAcc = 0, bestRaw = 0

  for (const mv of att.moves) {
    if (mv.cat !== 'phys' && mv.cat !== 'spe') continue
    const { dmg } = damageExpect(att, dfn, mv, field, sideDef)
    const dacc = dmg * (mv.acc ?? 100) / 100
    if (dacc > bestAcc) { best = mv; bestAcc = dacc; bestRaw = dmg }
  }
  return { move: best, dmgAcc: bestAcc, dmgRaw: bestRaw }
}

function outspeeds(att: FilmCombatant, dfn: FilmCombatant, field: FieldState): boolean {
  const sa = getEffSpeed(att, field)
  const sd = getEffSpeed(dfn, field)
  if (field.trickRoom > 0) return sa < sd
  return sa >= sd
}

function hasPP(mon: FilmCombatant, moveIdx: number): boolean {
  return mon.ppLeft[moveIdx] > 0
}

function moveIndex(mon: FilmCombatant, mv: MoveEngine): number {
  return mon.moves.indexOf(mv)
}

// ── Entry hazards & passives ──

export function switchIn(
  mon: FilmCombatant, mySide: SideState, foe: FilmCombatant | null,
  field: FieldState, events: BattleEvent[],
) {
  // Hazards
  if (mySide.rocks) {
    const dmg = Math.floor(mon.maxHp / 8)
    mon.hp -= dmg
    events.push({ type: 'hazard', text: `Des rochers blessent ${mon.name} !` })
  }
  if (mySide.spikes) {
    const div = mySide.spikes === 1 ? 16 : mySide.spikes === 2 ? 12 : 8
    mon.hp -= Math.floor(mon.maxHp / div)
    events.push({ type: 'hazard', text: `${mon.name} est blessé par les pièges !` })
  }
  if (mySide.sticky && mon.passiveEngine.cat !== 'status_immune') {
    applyBoost(mon, 'Ryt', -1)
    events.push({ type: 'boost', text: `${mon.name} est ralenti par la toile !` })
  }
  if (mySide.tspikes && !mon.status && mon.passiveEngine.cat !== 'status_immune') {
    if (mySide.tspikes === 1) { mon.status = 'poison' }
    else { mon.status = 'poison_bad'; mon.toxCounter = 1 }
    events.push({ type: 'status', text: `${mon.name} est empoisonné par les pièges !` })
  }
  mon.hp = Math.max(0, mon.hp)
  if (mon.hp <= 0) { mon.isAlive = false; return }

  // Outsider tracking
  if (mon.isOutsider) mySide.underset.add(mon.num)

  // Entry passive
  if (!mon.entryDone) {
    mon.entryDone = true
    const cat = mon.passiveEngine.cat
    const pp = mon.passiveEngine.params

    if (cat === 'start_boost' || cat === 'start_team_boost') {
      applyBoosts(mon, pp.boosts ?? [])
    } else if (cat === 'entry_drop' && foe && foe.isAlive) {
      applyBoosts(foe, pp.boosts ?? [])
      events.push({ type: 'boost', text: `${mon.name} intimide ${foe.name} !` })
    } else if (cat === 'regen_start') {
      mon.hp = Math.min(mon.maxHp, mon.hp + Math.floor(mon.maxHp / 6))
    } else if (cat === 'weather_auto' && pp.weather) {
      field.weather = pp.weather
      field.weatherTurns = BALANCE.WEATHER_DURATION
      field.weatherSetter = mySide
    }
  }

  mon.firstTurn = true
}

function applyTurnPassive(mon: FilmCombatant) {
  if (!mon.isAlive) return
  const cat = mon.passiveEngine.cat
  const pp = mon.passiveEngine.params

  if (cat === 'per_turn_boost') {
    for (const [k, n] of (pp.boosts ?? []) as [string, number][]) {
      if (k !== 'ALL' && Math.abs(mon.stages[k as StatId]) < BALANCE.PER_TURN_CAP) {
        applyBoost(mon, k as StatId, n)
      }
    }
  } else if (cat === 'regen_turn') {
    mon.hp = Math.min(mon.maxHp, mon.hp + Math.floor(mon.maxHp / 16))
  } else if (cat === 'lowhp_boost' && !mon.lowhpDone && mon.hp < mon.maxHp * 0.5) {
    mon.lowhpDone = true
    applyBoosts(mon, pp.boosts ?? [])
  }
}

// ── Climax (mega evolution) ──

export function updateClimaxMult(mon: FilmCombatant, field: FieldState) {
  if (!mon.megaActive || !mon.mega) { mon.megaMult = 1.0; return }
  const { affinity, strongMult, defaultMult } = mon.mega
  if (affinity === 'trickroom') {
    mon.megaMult = field.trickRoom > 0 ? (1 + strongMult) : (1 + defaultMult)
  } else {
    mon.megaMult = (affinity && field.weather === affinity) ? (1 + strongMult) : (1 + defaultMult)
  }
}

// ── Run a move ──

export function runMove(
  att: FilmCombatant, dfn: FilmCombatant, mv: MoveEngine,
  mySide: SideState, foeSide: SideState, field: FieldState,
  events: BattleEvent[],
) {
  const mi = moveIndex(att, mv)

  if (mv.cat === 'status') {
    if (mi >= 0 && att.ppLeft[mi] <= 0) return
    if (mi >= 0) att.ppLeft[mi]--
    if (att.tauntTurns > 0) {
      events.push({ type: 'message', text: `${att.name} est provoqué et ne peut pas utiliser ${mv.name} !` })
      return
    }

    const e = mv.eff ?? ''

    if (e === 'taunt') {
      dfn.tauntTurns = 3
      events.push({ type: 'message', text: `${att.name} provoque ${dfn.name} !` })
    } else if (e === 'protect') {
      att.isProtected = true
      events.push({ type: 'message', text: `${att.name} se protège !` })
    } else if (e === 'recover') {
      let heal = Math.floor(att.maxHp / 3)
      heal = Math.floor(heal * Math.max(0.3, 1 - 0.25 * att.recoverCount))
      att.recoverCount++
      att.hp = Math.min(att.maxHp, att.hp + heal)
      events.push({ type: 'heal', text: `${att.name} récupère des PV !` })
    } else if (e === 'reflect') {
      mySide.reflect = 3
      events.push({ type: 'message', text: `Un mur protecteur s'élève !` })
    } else if (e === 'lightscreen') {
      mySide.lightscreen = 3
      events.push({ type: 'message', text: `Un écran de lumière apparaît !` })
    } else if (e === 'auroraveil') {
      mySide.reflect = 3; mySide.lightscreen = 3
      events.push({ type: 'message', text: `Un voile d'aurore enveloppe l'équipe !` })
    } else if (e.startsWith('weather:')) {
      const wt = e.split(':')[1]
      field.weather = wt; field.weatherTurns = BALANCE.WEATHER_DURATION; field.weatherSetter = mySide
      events.push({ type: 'weather', text: `La météo change !` })
    } else if (e === 'trickroom') {
      field.trickRoom = field.trickRoom === 0 ? BALANCE.TRICK_ROOM_DURATION : 0
      events.push({ type: 'message', text: field.trickRoom > 0 ? `La Distorsion s'installe !` : `La Distorsion se dissipe !` })
    } else if (e === 'hazard:rocks') {
      foeSide.rocks = 1
      events.push({ type: 'hazard', text: `Des rochers pointus se déploient !` })
    } else if (e === 'hazard:spikes') {
      foeSide.spikes = Math.min(3, foeSide.spikes + 1)
      events.push({ type: 'hazard', text: `Des pièges se déploient !` })
    } else if (e === 'hazard:tspikes') {
      foeSide.tspikes = Math.min(2, foeSide.tspikes + 1)
    } else if (e === 'hazard:sticky') {
      foeSide.sticky = 1
    } else if (e === 'defog') {
      foeSide.rocks = 0; foeSide.spikes = 0; foeSide.tspikes = 0; foeSide.sticky = 0
      mySide.rocks = 0; mySide.spikes = 0; mySide.tspikes = 0; mySide.sticky = 0
      events.push({ type: 'message', text: `${att.name} dissipe les pièges !` })
    } else if (e.startsWith('boost:')) {
      const [, k, n] = e.split(':')
      applyBoost(att, k as StatId, parseInt(n))
      events.push({ type: 'boost', text: `${att.name} booste ses stats !` })
    } else if (e.startsWith('drop:')) {
      const [, k, n] = e.split(':')
      applyBoost(dfn, k as StatId, parseInt(n))
      events.push({ type: 'boost', text: `${dfn.name} voit ses stats baisser !` })
    } else if (e.startsWith('allboost:')) {
      const n = parseInt(e.split(':')[1])
      for (const s of ['Spec', 'Tec', 'Sce', 'Prof', 'Ryt'] as StatId[]) applyBoost(att, s, n)
      events.push({ type: 'boost', text: `Toutes les stats de ${att.name} augmentent !` })
    } else if (e === 'vatout') {
      applyBoost(att, 'Spec', 6)
      att.hp = Math.max(1, att.hp - Math.floor(att.maxHp / 2))
      events.push({ type: 'boost', text: `${att.name} joue le tout pour le tout !` })
    } else if (e.startsWith('status:')) {
      const st = e.split(':')[1]
      if (applyStatus(dfn, st)) {
        events.push({ type: 'status', text: `${dfn.name} est affecté par ${st} !` })
      }
    }
    return
  }

  // ── Damage moves ──
  if (mi >= 0) att.ppLeft[mi]--

  if (dfn.isProtected) {
    events.push({ type: 'message', text: `${dfn.name} se protège de l'attaque !` })
    return
  }

  // Accuracy
  const acc = (mv.acc ?? 100) / 100
  if (Math.random() > acc) {
    events.push({ type: 'miss', text: `${att.name} rate son attaque !` })
    return
  }

  // Percent-based damage
  if (mv.percent) {
    if (dfn.disguise) { dfn.disguise = false; dfn.hp -= Math.floor(dfn.maxHp / 8); return }
    dfn.hp -= Math.floor(dfn.maxHp * mv.percent)
    dfn.hp = Math.max(0, dfn.hp)
    if (dfn.hp <= 0) dfn.isAlive = false
    return
  }

  // Passive evasion
  if (att.passiveEngine.cat !== 'true_hit') {
    if (dfn.passiveEngine.cat === 'dodge_first' && !dfn.dodgeUsed) {
      dfn.dodgeUsed = true
      events.push({ type: 'miss', text: `${dfn.name} esquive le premier coup !` })
      return
    }
    if ((dfn.passiveEngine.cat === 'evasion' || dfn.passiveEngine.cat === 'miss_chance')) {
      const pct = (dfn.passiveEngine.params.pct ?? 30) / 100
      if (Math.random() < pct) {
        events.push({ type: 'miss', text: `${dfn.name} esquive l'attaque !` })
        return
      }
    }
  }

  const result = calculateDamage(att, dfn, mv, field, foeSide)
  let dmg = result.damage

  // Disguise
  if (dfn.disguise) {
    dfn.disguise = false
    dfn.hp -= Math.floor(dfn.maxHp / 8)
    events.push({ type: 'message', text: `Le déguisement de ${dfn.name} absorbe le coup !` })
    return
  }

  // Endure
  if (dfn.passiveEngine.cat === 'endure_once' && !dfn.endureUsed && dmg >= dfn.hp && dfn.hp > 1) {
    dmg = dfn.hp - 1
    dfn.endureUsed = true
    events.push({ type: 'message', text: `${dfn.name} encaisse le coup de justesse !` })
  }

  dfn.hp -= dmg
  dfn.hp = Math.max(0, dfn.hp)

  // Build damage event
  const dmgEvt: BattleEvent = {
    type: 'damage',
    text: `${att.name} utilise ${mv.name} !`,
    data: { damage: dmg, typeMult: result.typeMult, isCrit: result.isCrit },
  }
  events.push(dmgEvt)

  if (result.isCrit) events.push({ type: 'crit', text: `Coup critique !` })
  if (result.typeMult > 1.1) events.push({ type: 'supereffective', text: `C'est super efficace !` })
  else if (result.typeMult > 0 && result.typeMult < 0.9) events.push({ type: 'resisted', text: `Ce n'est pas très efficace…` })
  else if (result.typeMult === 0) events.push({ type: 'immune', text: `Ça n'a aucun effet…` })

  // Damage return passive
  if (dmg > 0 && dfn.passiveEngine.cat === 'damage_return' && mv.cat === 'phys') {
    const ret = Math.floor(dmg * (dfn.passiveEngine.params.frac ?? 0.5))
    att.hp = Math.max(0, att.hp - ret)
    events.push({ type: 'recoil', text: `${att.name} subit des dégâts en retour !` })
  }

  if (dmg > 0) att.dealtDamage = true

  // Recoil
  if (mv.recoil && dmg > 0) {
    const rc = Math.floor(dmg * mv.recoil)
    att.hp -= rc
    att.hp = Math.max(0, att.hp)
    events.push({ type: 'recoil', text: `${att.name} subit le contrecoup !` })
  }

  // Self-drop
  if (mv.self_drop) {
    for (const [k, n] of mv.self_drop) applyBoost(att, k as StatId, n)
  }

  // Self HP cost
  if (mv.self_hp) {
    att.hp = Math.max(0, att.hp - Math.floor(att.maxHp * mv.self_hp))
  }

  // Speed drop on flinch
  if (mv.flinch_speed) applyBoost(dfn, 'Ryt', -1)

  // Secondary effect
  if (mv.sec && Math.random() < mv.sec[1]) {
    if (applyStatus(dfn, mv.sec[0])) {
      events.push({ type: 'status', text: `${dfn.name} est affecté !` })
    }
  }

  // Pivot
  if (mv.pivot && att.isAlive && att.hp > 0) att.pivotPending = true

  // Check KOs
  if (dfn.hp <= 0) { dfn.isAlive = false; events.push({ type: 'faint', text: `${dfn.name} est mis K.O. !` }) }
  if (att.hp <= 0) { att.isAlive = false; events.push({ type: 'faint', text: `${att.name} est mis K.O. !` }) }
}

// ── End of turn effects ──

export function endTurn(
  mons: [FilmCombatant, FilmCombatant],
  sides: [SideState, SideState],
  field: FieldState,
  events: BattleEvent[],
) {
  const w = field.weather
  for (let i = 0; i < 2; i++) {
    const m = mons[i]
    if (!m.isAlive) continue

    if (m.passiveEngine.cat !== 'status_immune') {
      if (w === 'rain') m.hp = Math.min(m.maxHp, m.hp + Math.floor(m.maxHp / 16))
      else if (w === 'sand') { m.hp -= Math.floor(m.maxHp / 16) }
      else if (w === 'snow' && field.weatherSetter && sides[i] !== field.weatherSetter) {
        m.hp -= Math.floor(m.maxHp / 16)
      }

      if (m.status === 'poison') {
        m.hp -= Math.floor(m.maxHp / 8)
        events.push({ type: 'status', text: `${m.name} souffre du poison !` })
      } else if (m.status === 'poison_bad') {
        m.toxCounter++
        m.hp -= Math.floor(m.maxHp * m.toxCounter / 16)
        events.push({ type: 'status', text: `${m.name} souffre gravement du poison !` })
      } else if (m.status === 'burn') {
        m.hp -= Math.floor(m.maxHp / 16)
        events.push({ type: 'status', text: `${m.name} souffre de sa brûlure !` })
      }
    }

    m.hp = Math.max(0, m.hp)
    if (m.hp <= 0) { m.isAlive = false; events.push({ type: 'faint', text: `${m.name} succombe !` }) }
  }

  // Screens countdown
  for (const s of sides) {
    if (s.reflect > 0) s.reflect--
    if (s.lightscreen > 0) s.lightscreen--
  }

  // Weather countdown
  if (field.weatherTurns > 0) {
    field.weatherTurns--
    if (field.weatherTurns === 0) { field.weather = null; events.push({ type: 'weather', text: `La météo redevient normale.` }) }
  }

  // Trick Room countdown
  if (field.trickRoom > 0) {
    field.trickRoom--
    if (field.trickRoom === 0) events.push({ type: 'message', text: `La Distorsion se dissipe !` })
  }

  // Taunt, protect, turn passives
  for (const m of mons) {
    if (m.tauntTurns > 0) m.tauntTurns--
    m.isProtected = false
  }
}

// ── STRUGGLE (repli quand 0 PP) ──

export const STRUGGLE: MoveEngine = {
  name: 'Lutte',
  type: '—',
  cat: 'phys',
  pow: BALANCE.STRUGGLE_POWER,
  acc: 100,
  pri: 0,
  pp: 999,
  recoil: BALANCE.STRUGGLE_RECOIL,
}

// ── AI: Clippy's brain (ported from engine2.py choose()) ──

export function chooseAI(
  att: FilmCombatant, dfn: FilmCombatant,
  mySide: SideState, foeSide: SideState, field: FieldState,
  team: FilmCombatant[], idx: number,
): TurnDecision {
  const NOSCR: SideState = { ...newSide() }

  const statusMoves: { mv: MoveEngine; mi: number }[] = []
  for (let i = 0; i < att.moves.length; i++) {
    if (att.moves[i].cat === 'status' && att.ppLeft[i] > 0) {
      statusMoves.push({ mv: att.moves[i], mi: i })
    }
  }

  // 0) Distorsion override: poser Trick Room au tour 1 inconditionnellement
  if (att.firstTurn && field.trickRoom === 0) {
    for (const { mv, mi } of statusMoves) {
      if ((mv.eff ?? '') === 'trickroom') return { type: 'move', move: mv, moveIndex: mi }
    }
  }

  const bo = bestOffense(att, dfn, field, foeSide)
  const ft = bestOffense(dfn, att, field, mySide)
  const iFast = outspeeds(att, dfn, field)
  const canKO = bo.move !== null && bo.dmgRaw >= dfn.hp
  const foeKOs = ft.dmgRaw >= att.hp

  // 1) KO immédiat si plus rapide
  if (canKO && iFast && bo.move) return { type: 'move', move: bo.move, moveIndex: moveIndex(att, bo.move) }

  // 2) revenge-kill à la priorité
  for (let i = 0; i < att.moves.length; i++) {
    const m = att.moves[i]
    if (m.cat === 'phys' || m.cat === 'spe') {
      if ((m.pri ?? 0) > 0) {
        const { dmg } = damageExpect(att, dfn, m, field, foeSide)
        if (dmg >= dfn.hp) return { type: 'move', move: m, moveIndex: i }
      }
    }
  }

  // 3) KO si adversaire ne tue pas avant
  if (canKO && !foeKOs && bo.move) return { type: 'move', move: bo.move, moveIndex: moveIndex(att, bo.move) }

  // 4) setup au lead
  if (att.firstTurn && !foeKOs) {
    for (const { mv, mi } of statusMoves) {
      const e = mv.eff ?? ''
      if (e === 'hazard:rocks' && !foeSide.rocks) return { type: 'move', move: mv, moveIndex: mi }
      if (e === 'hazard:spikes' && foeSide.spikes < 3) return { type: 'move', move: mv, moveIndex: mi }
      if (e.startsWith('weather:') && field.weather !== e.split(':')[1]) return { type: 'move', move: mv, moveIndex: mi }
      if ((e === 'reflect' || e === 'lightscreen' || e === 'auroraveil') && !mySide.reflect && !mySide.lightscreen) {
        if (e !== 'auroraveil' || field.weather === 'snow') return { type: 'move', move: mv, moveIndex: mi }
      }
      if (e === 'trickroom' && field.trickRoom === 0) return { type: 'move', move: mv, moveIndex: mi }
    }
  }

  // 5) Provoc
  const foeStaller = dfn.moves.some(mm => mm.cat === 'status' && (mm.eff === 'recover' || mm.eff === 'hazard:rocks' || mm.eff === 'hazard:spikes'))
  if (foeStaller && dfn.tauntTurns === 0 && !foeKOs) {
    for (const { mv, mi } of statusMoves) {
      if (mv.eff === 'taunt') return { type: 'move', move: mv, moveIndex: mi }
    }
  }

  // 6) setup si safe
  if (!foeKOs && ft.dmgRaw * 2 < att.hp) {
    for (const { mv, mi } of statusMoves) {
      const e = mv.eff ?? ''
      if (e === 'vatout' && (att.stages.Spec ?? 0) < 4 && att.hp > att.maxHp * 0.6) return { type: 'move', move: mv, moveIndex: mi }
      if (e.startsWith('boost:')) {
        const k = e.split(':')[1] as StatId
        if ((att.stages[k] ?? 0) < 4) return { type: 'move', move: mv, moveIndex: mi }
      }
    }
  }

  // 7) heal
  if (att.hp < att.maxHp * 0.40 && att.tauntTurns === 0) {
    for (const { mv, mi } of statusMoves) {
      if (mv.eff === 'recover') return { type: 'move', move: mv, moveIndex: mi }
    }
  }

  // 8) pivot
  const canSwitch = !att.firstTurn
  if (canSwitch) {
    const offDrop = Math.min(att.stages.Spec ?? 0, att.stages.Sce ?? 0)
    if (offDrop <= -2 && !canKO) {
      const sw = bestSwitch(team, idx, dfn, field, mySide)
      if (sw.idx !== null && sw.score > -att.maxHp * 0.15) return { type: 'switch', targetIndex: sw.idx }
    }
    if (foeKOs && !canKO) {
      const sw = bestSwitch(team, idx, dfn, field, mySide)
      if (sw.idx !== null && sw.score > att.maxHp * 0.15) return { type: 'switch', targetIndex: sw.idx }
    }
    // muré
    if (bo.move && bo.dmgAcc < dfn.hp * 0.07) {
      const sw = bestSwitch(team, idx, dfn, field, mySide)
      if (sw.idx !== null) {
        const altOff = bestOffense(team[sw.idx], dfn, field, NOSCR)
        if (altOff.dmgAcc > bo.dmgAcc * 3 && sw.score > 0) return { type: 'switch', targetIndex: sw.idx }
      }
    }
  }

  // 9) default: best offensive
  if (bo.move) return { type: 'move', move: bo.move, moveIndex: moveIndex(att, bo.move) }
  if (statusMoves.length) return { type: 'move', move: statusMoves[0].mv, moveIndex: statusMoves[0].mi }

  // Struggle
  return { type: 'move', move: STRUGGLE, moveIndex: -1 }
}

function bestSwitch(
  team: FilmCombatant[], idx: number, dfn: FilmCombatant,
  field: FieldState, mySide: SideState,
): { idx: number | null; score: number } {
  const NOSCR = newSide()
  let bestIdx: number | null = null
  let bestScore = -Infinity

  for (let k = 0; k < team.length; k++) {
    if (k === idx || !team[k].isAlive) continue
    const c = team[k]
    const mine = bestOffense(c, dfn, field, NOSCR).dmgAcc
    const foe = bestOffense(dfn, c, field, NOSCR).dmgRaw
    const entryDmg = entryHazardDmg(mySide) * c.maxHp
    let score = mine - foe - entryDmg
    if (foe < (c.hp - entryDmg)) score += c.hp * 0.35
    if (score > bestScore) { bestScore = score; bestIdx = k }
  }
  return { idx: bestIdx, score: bestScore }
}

function entryHazardDmg(side: SideState): number {
  let h = side.rocks ? 0.125 : 0
  if (side.spikes) h += [0, 1 / 16, 1 / 12, 1 / 8][side.spikes]
  return h
}

// ── Full turn resolution ──

export interface TurnResult {
  events: BattleEvent[]
  done: boolean
  winner: 'player' | 'clippy' | 'draw' | null
}

export function resolveTurn(
  playerTeam: FilmCombatant[], playerIdx: number,
  clippyTeam: FilmCombatant[], clippyIdx: number,
  playerDec: TurnDecision, clippyDec: TurnDecision,
  playerSide: SideState, clippySide: SideState,
  field: FieldState,
): TurnResult & { newPlayerIdx: number; newClippyIdx: number } {
  const events: BattleEvent[] = []
  let pIdx = playerIdx
  let cIdx = clippyIdx

  // Switches first
  if (playerDec.type === 'switch') {
    pIdx = playerDec.targetIndex
    events.push({ type: 'switch', text: `Vous envoyez ${playerTeam[pIdx].name} !` })
    switchIn(playerTeam[pIdx], playerSide, clippyTeam[cIdx], field, events)
  }
  if (clippyDec.type === 'switch') {
    cIdx = clippyDec.targetIndex
    events.push({ type: 'switch', text: `Clippy envoie ${clippyTeam[cIdx].name} !` })
    switchIn(clippyTeam[cIdx], clippySide, playerTeam[pIdx], field, events)
  }

  // Move actions, ordered by priority then speed
  const acts: { who: 'player' | 'clippy'; att: FilmCombatant; dfn: FilmCombatant; ms: SideState; fs: SideState; mv: MoveEngine }[] = []
  if (playerDec.type === 'move') {
    const a = playerTeam[pIdx]
    const mv = playerDec.moveIndex === -1 ? STRUGGLE : a.moves[playerDec.moveIndex]
    acts.push({ who: 'player', att: a, dfn: clippyTeam[cIdx], ms: playerSide, fs: clippySide, mv })
  }
  if (clippyDec.type === 'move') {
    const b = clippyTeam[cIdx]
    const mv = clippyDec.moveIndex === -1 ? STRUGGLE : b.moves[clippyDec.moveIndex]
    acts.push({ who: 'clippy', att: b, dfn: playerTeam[pIdx], ms: clippySide, fs: playerSide, mv })
  }

  acts.sort((a, b) => {
    const priA = a.mv.pri ?? 0, priB = b.mv.pri ?? 0
    if (priA !== priB) return priB - priA
    const spA = getEffSpeed(a.att, field), spB = getEffSpeed(b.att, field)
    if (field.trickRoom > 0) return spA - spB
    return spB - spA
  })

  for (const act of acts) {
    if (!act.att.isAlive || !act.dfn.isAlive) continue

    // Sleep check
    if (act.att.sleepTurns > 0) {
      act.att.sleepTurns--
      if (act.att.sleepTurns > 0) {
        events.push({ type: 'status', text: `${act.att.name} dort profondément…` })
        act.att.firstTurn = false; continue
      } else {
        act.att.status = null
        events.push({ type: 'status', text: `${act.att.name} se réveille !` })
      }
    }

    // Confusion check
    if (act.att.confTurns > 0) {
      act.att.confTurns--
      if (Math.random() < 0.33) {
        const selfDmg = Math.floor(40 * getEffStat(act.att, 'Spec') / getEffStat(act.att, 'Tec') / 3 + 2)
        act.att.hp = Math.max(0, act.att.hp - selfDmg)
        if (act.att.hp <= 0) act.att.isAlive = false
        events.push({ type: 'status', text: `${act.att.name} se blesse dans sa confusion !` })
        act.att.firstTurn = false; continue
      }
    }

    // Paralysis check
    if (act.att.status === 'para' && Math.random() < 0.25) {
      events.push({ type: 'status', text: `${act.att.name} est paralysé !` })
      act.att.firstTurn = false; continue
    }

    // Check if out of PP → Struggle
    let mv = act.mv
    const mi = moveIndex(act.att, mv)
    if (mi >= 0 && act.att.ppLeft[mi] <= 0) {
      const hasAnyPP = act.att.ppLeft.some(pp => pp > 0)
      if (!hasAnyPP) mv = STRUGGLE
    }

    runMove(act.att, act.dfn, mv, act.ms, act.fs, field, events)
    act.att.firstTurn = false
  }

  // Turn passives
  const p = playerTeam[pIdx], c = clippyTeam[cIdx]
  if (p.isAlive) applyTurnPassive(p)
  if (c.isAlive) applyTurnPassive(c)

  // Update outsider combos
  for (const mon of playerTeam) { if (mon.isAlive) mon.outsiderCombo = playerSide.underset.size }
  for (const mon of clippyTeam) { if (mon.isAlive) mon.outsiderCombo = clippySide.underset.size }

  // Update climax
  if (p.isAlive) updateClimaxMult(p, field)
  if (c.isAlive) updateClimaxMult(c, field)

  // End turn
  if (p.isAlive && c.isAlive) {
    endTurn([p, c], [playerSide, clippySide], field, events)
  }

  // Pivot
  if (p.isAlive && p.pivotPending) {
    p.pivotPending = false
    const sw = bestSwitch(playerTeam, pIdx, c, field, playerSide)
    if (sw.idx !== null) { pIdx = sw.idx; switchIn(playerTeam[pIdx], playerSide, c, field, events) }
  }
  if (c.isAlive && c.pivotPending) {
    c.pivotPending = false
    const sw = bestSwitch(clippyTeam, cIdx, p, field, clippySide)
    if (sw.idx !== null) { cIdx = sw.idx; switchIn(clippyTeam[cIdx], clippySide, p, field, events) }
  }

  // Check win
  const playerAlive = playerTeam.some(m => m.isAlive)
  const clippyAlive = clippyTeam.some(m => m.isAlive)

  let done = false, winner: 'player' | 'clippy' | 'draw' | null = null
  if (!playerAlive && !clippyAlive) { done = true; winner = 'draw' }
  else if (!clippyAlive) { done = true; winner = 'player' }
  else if (!playerAlive) { done = true; winner = 'clippy' }

  // Tiebreaker (from engine2.py fix): same alive count → compare HP
  if (done && winner === 'draw') {
    const pAliveCount = playerTeam.filter(m => m.isAlive).length
    const cAliveCount = clippyTeam.filter(m => m.isAlive).length
    if (pAliveCount !== cAliveCount) {
      winner = pAliveCount > cAliveCount ? 'player' : 'clippy'
    } else {
      const pHp = playerTeam.reduce((s, m) => s + m.hp, 0)
      const cHp = clippyTeam.reduce((s, m) => s + m.hp, 0)
      if (pHp !== cHp) winner = pHp > cHp ? 'player' : 'clippy'
    }
  }

  return { events, done, winner, newPlayerIdx: pIdx, newClippyIdx: cIdx }
}

// ── RL Environment interface (§13ter) ──

export interface RLEnv {
  reset(teamA: FilmCombatant[], teamB: FilmCombatant[]): void
  legalActions(side: 'A' | 'B'): TurnDecision[]
  encodeState(side: 'A' | 'B'): number[]
  step(actionA: TurnDecision, actionB: TurnDecision): { events: BattleEvent[]; reward: number; done: boolean }
}

export function createRLEnv(): RLEnv {
  let teamA: FilmCombatant[] = []
  let teamB: FilmCombatant[] = []
  let sideA = newSide(), sideB = newSide()
  let field = newField()
  let idxA = 0, idxB = 0

  return {
    reset(tA, tB) {
      teamA = tA; teamB = tB
      sideA = newSide(); sideB = newSide(); field = newField()
      idxA = 0; idxB = 0
      switchIn(teamA[0], sideA, teamB[0], field, [])
      switchIn(teamB[0], sideB, teamA[0], field, [])
    },

    legalActions(side) {
      const team = side === 'A' ? teamA : teamB
      const idx = side === 'A' ? idxA : idxB
      const mon = team[idx]
      const actions: TurnDecision[] = []

      for (let i = 0; i < mon.moves.length; i++) {
        if (mon.ppLeft[i] > 0) {
          actions.push({ type: 'move', move: mon.moves[i], moveIndex: i })
        }
      }
      if (actions.length === 0) {
        actions.push({ type: 'move', move: STRUGGLE, moveIndex: -1 })
      }

      for (let k = 0; k < team.length; k++) {
        if (k !== idx && team[k].isAlive) {
          actions.push({ type: 'switch', targetIndex: k })
        }
      }
      return actions
    },

    encodeState(side) {
      const my = side === 'A' ? teamA : teamB
      const opp = side === 'A' ? teamB : teamA
      const myIdx = side === 'A' ? idxA : idxB
      const oppIdx = side === 'A' ? idxB : idxA
      const vec: number[] = []

      // Active mon stats (normalized)
      const m = my[myIdx]
      vec.push(m.hp / m.maxHp)
      vec.push(...Object.values(m.stages).map(s => s / 6))

      const o = opp[oppIdx]
      vec.push(o.hp / o.maxHp)
      vec.push(...Object.values(o.stages).map(s => s / 6))

      // Team HP
      for (const t of my) vec.push(t.hp / t.maxHp)
      for (const t of opp) vec.push(t.isAlive ? t.hp / t.maxHp : 0)

      // Weather/TR
      vec.push(field.weather === 'sun' ? 1 : field.weather === 'rain' ? 2 : field.weather === 'sand' ? 3 : field.weather === 'snow' ? 4 : 0)
      vec.push(field.trickRoom > 0 ? 1 : 0)

      return vec
    },

    step(actionA, actionB) {
      const result = resolveTurn(teamA, idxA, teamB, idxB, actionA, actionB, sideA, sideB, field)
      idxA = result.newPlayerIdx
      idxB = result.newClippyIdx

      // Auto-switch KO'd mons
      if (!teamA[idxA].isAlive) {
        const alive = teamA.findIndex((m, i) => i !== idxA && m.isAlive)
        if (alive >= 0) { idxA = alive; switchIn(teamA[idxA], sideA, teamB[idxB], field, result.events) }
      }
      if (!teamB[idxB].isAlive) {
        const alive = teamB.findIndex((m, i) => i !== idxB && m.isAlive)
        if (alive >= 0) { idxB = alive; switchIn(teamB[idxB], sideB, teamA[idxA], field, result.events) }
      }

      let reward = 0
      if (result.winner === 'player') reward = 1
      else if (result.winner === 'clippy') reward = -1

      return { events: result.events, reward, done: result.done }
    },
  }
}
