// Port fidèle de engine2.py — NE PAS modifier l'équilibrage.
// Toutes les constantes viennent de config.ts.

import { BATTLE_CONFIG } from './config';
import { typeMult } from './type-chart';
import { GENRE_WEATHER } from './weather';
import type {
  MoveEngine, MegaInfo, Side, Field, WeatherType,
  StatKey, BattleLogEntry, BattleResult, CardData,
} from './types';

const CFG = BATTLE_CONFIG;

// ── Stage table ──
const STAGE: Record<number, number> = {
  [-6]: 0.25, [-5]: 0.29, [-4]: 0.33, [-3]: 0.40, [-2]: 0.50, [-1]: 0.67,
  0: 1.0,
  1: 1.50, 2: 2.00, 3: 2.50, 4: 3.00, 5: 3.50, 6: 4.00,
};

// ── Ability → weather map (pour eff_speed) ──
const ABILITY_WEATHER: Record<string, WeatherType> = {
  'Sous la Pluie': 'rain',
  'Plein Soleil': 'sun',
  'Vent de Sable': 'sand',
  'Glissade': 'snow',
};

const WEATHER_SET: Record<string, WeatherType> = {
  'Crachin': 'rain',
  'Sécheresse': 'sun',
  'Lève-Sable': 'sand',
  'Chute de Neige': 'snow',
};

// ── Mon class ──

export class Mon {
  num: number;
  name: string;
  types: string[];
  ability: string;
  maxhp: number;
  hp: number;
  base: Record<StatKey, number>;
  monument: boolean;
  underdog: boolean;
  rarity: string;
  moncombo = 0;
  undercombo = 0;
  moves: MoveEngine[];
  stage: Record<StatKey, number>;
  status: string | null = null;
  tox = 0;
  sleep = 0;
  conf = 0;
  taunt = 0;
  protected = false;
  protectStreak = 0;
  disguise: boolean;
  firstTurn = true;
  pivotPending = false;
  recoverCount = 0;
  idle = 0;
  dealt = false;
  ppLeft: number[];
  pcat: string;
  pp: Record<string, unknown>;
  dodgeUsed = false;
  endureUsed = false;
  lowhpDone = false;
  entryDone = false;
  mega: MegaInfo;
  megaed = false;
  megaMult = 1.0;

  constructor(
    num: number,
    ability: string,
    moves: MoveEngine[],
    mega: MegaInfo,
    cards: Record<number, CardData>,
  ) {
    const c = cards[num];
    const s = c.stats;
    this.num = num;
    this.name = c.name;
    this.types = c.types;
    this.ability = ability;
    this.maxhp = Math.floor(s.Post * CFG.HP_MULT);
    this.hp = this.maxhp;
    this.base = { Spec: s.Spec, Tec: s.Tec, Sce: s.Sce, Prof: s.Prof, Ryt: s.Ryt };
    this.monument = c.monument ?? false;
    this.underdog = c.rarity === 'RARE';
    this.rarity = c.rarity;
    this.moves = moves;
    this.stage = { Spec: 0, Tec: 0, Sce: 0, Prof: 0, Ryt: 0 };
    this.disguise = ability === 'Mascarade';
    this.ppLeft = moves.map(m => m.pp ?? 99);
    const pe = c.passive_engine ?? { cat: 'flavor', params: {} };
    this.pcat = pe.cat;
    this.pp = (pe.params ?? {}) as Record<string, unknown>;
    this.mega = mega;
    if (mega && mega[0]) {
      for (const k of Object.keys(this.base) as StatKey[]) {
        this.base[k] = this.base[k] * (1 - CFG.CLIMAX_MALUS);
      }
      this.maxhp = Math.floor(this.maxhp * (1 - CFG.CLIMAX_MALUS));
      this.hp = this.maxhp;
    }
  }

  alive(): boolean { return this.hp > 0; }

  stat(k: StatKey): number {
    let v = this.base[k] * (STAGE[this.stage[k]] ?? 1);
    if (this.megaed && this.mega && (this.mega[1] as string[]).includes(k)) {
      v *= this.megaMult;
    }
    if (k === 'Ryt' && this.status === 'para') v *= 0.5;
    return v;
  }

  boost(k: StatKey, n: number): void {
    if (n < 0 && this.pcat === 'no_lower') return;
    this.stage[k] = Math.max(CFG.STAGE_MIN, Math.min(CFG.STAGE_MAX, this.stage[k] + n));
  }
}

// ── Helpers ──

function updateMega(mon: Mon, field: Field): void {
  if (!mon.megaed || !mon.mega) { mon.megaMult = 1.0; return; }
  const [aff, , strong, def] = mon.mega;
  if (aff === 'trickroom') {
    mon.megaMult = field.tr > 0 ? strong : def;
  } else {
    mon.megaMult = (aff != null && field.weather === aff) ? strong : def;
  }
}

function effSpeed(mon: Mon, field: Field): number {
  let sp = mon.stat('Ryt');
  const wmap = ABILITY_WEATHER[mon.ability];
  if (wmap && field.weather === wmap) sp *= 2;
  return sp;
}

function newSide(): Side {
  return {
    rocks: 0, spikes: 0, tspikes: 0, sticky: 0,
    reflect: 0, lightscreen: 0,
    monset: new Set(), monheal: false, underset: new Set(),
  };
}

function midx(att: Mon, mv: MoveEngine): number {
  for (let i = 0; i < att.moves.length; i++) {
    if (att.moves[i] === mv) return i;
  }
  return 0;
}

function hasPP(att: Mon, mv: MoveEngine): boolean {
  return att.ppLeft[midx(att, mv)] > 0;
}

// ── Damage ──

function damage(
  att: Mon, dfn: Mon, mv: MoveEngine, field: Field, sideDef: Side,
): [number, number] {
  const cat = mv.cat;
  if (cat !== 'phys' && cat !== 'spe') return [0, 0];
  let a: number, d: number;
  if (cat === 'phys') { a = att.stat('Spec'); d = dfn.stat('Tec'); }
  else { a = att.stat('Sce'); d = dfn.stat('Prof'); }
  d *= (1 - CFG.ANTISTALL_WALLBREAK);
  let stab = mv.type && att.types.includes(mv.type) ? CFG.STAB_MULT : 1.0;
  if (att.ability === "Cinéma d'Auteur" && mv.type && att.types.includes(mv.type)) stab = 2.0;
  const tm = typeMult(mv.type ?? '—', dfn.types);
  if (tm === 0) return [0, 0];
  let w = 1.0;
  if (field.weather === 'sun') w = CFG.SUN_WEATHER_BOOST;
  const crit = Math.random() < CFG.CRIT_RATE ? CFG.CRIT_MULT : 1.0;
  const critFinal = dfn.pcat === 'crit_immune' ? 1.0 : crit;
  const alea = CFG.RANDOM_MIN + Math.random() * (CFG.RANDOM_MAX - CFG.RANDOM_MIN);
  let dmg = ((mv.pow ?? 0) * a / d / 3 + 2) * stab * tm * w * critFinal * alea;

  // Weather team buff
  if (field.weather && GENRE_WEATHER[att.types[0] as keyof typeof GENRE_WEATHER] === field.weather) {
    dmg *= (1 + CFG.WEATHER_TEAM_BUFF);
  }
  // Légendaire entrée à froid
  if (att.rarity === 'LÉGENDAIRE') {
    dmg *= att.firstTurn ? CFG.LEG_COLD_FACTOR : CFG.LEG_WARM;
  }
  // Outsider
  if (att.underdog && att.undercombo >= CFG.OUTSIDER_GATE) {
    dmg *= (1 + CFG.OUTSIDER_SCALE * (att.undercombo - (CFG.OUTSIDER_GATE - 1)));
  }
  if (dfn.underdog && dfn.undercombo >= CFG.OUTSIDER_GATE) {
    dmg *= (1 - CFG.OUTSIDER_SCALE * (dfn.undercombo - (CFG.OUTSIDER_GATE - 1)));
  }
  // Brûlure
  if (cat === 'phys' && att.status === 'burn') dmg *= 0.5;
  // Écrans
  if (cat === 'phys' && sideDef.reflect > 0) dmg *= 0.5;
  if (cat === 'spe' && sideDef.lightscreen > 0) dmg *= 0.5;
  // Multiscale
  if ((dfn.ability === 'Première Bobine' || dfn.pcat === 'multiscale_first') && dfn.hp === dfn.maxhp) {
    dmg *= 0.5;
  }
  return [Math.max(1, Math.floor(dmg)), tm];
}

// ── Status ──

function applyStatus(mon: Mon, st: string): boolean {
  if (mon.status) return false;
  if (mon.pcat === 'status_immune') return false;
  if (st === 'confusion') {
    if (mon.ability === 'Sang-Froid') return false;
    mon.conf = 2 + Math.floor(Math.random() * 3);
    return true;
  }
  if (st === 'sleep') {
    mon.sleep = 1 + Math.floor(Math.random() * 3);
    mon.status = 'sleep';
    return true;
  }
  if (mon.ability === 'Quatrième Mur') return false;
  mon.status = st;
  if (st === 'poison_bad') mon.tox = 1;
  return true;
}

// ── Entry ──

function applyEntryPassive(mon: Mon, mySide: Side, foe: Mon | null, field: Field): void {
  if (mon.entryDone) return;
  mon.entryDone = true;
  const cat = mon.pcat;
  const pp = mon.pp as Record<string, unknown>;

  function doBoost(tgt: Mon, boosts: [string, number][]) {
    for (const [k, n] of boosts) {
      if (k === 'ALL') {
        for (const kk of Object.keys(tgt.base) as StatKey[]) tgt.boost(kk, n);
      } else {
        tgt.boost(k as StatKey, n);
      }
    }
  }

  if (cat === 'start_boost' || cat === 'start_team_boost') {
    doBoost(mon, (pp.boosts as [string, number][]) ?? []);
  } else if (cat === 'entry_drop' && foe && foe.alive()) {
    doBoost(foe, (pp.boosts as [string, number][]) ?? []);
  } else if (cat === 'regen_start') {
    mon.hp = Math.min(mon.maxhp, mon.hp + Math.floor(mon.maxhp / 6));
  } else if (cat === 'weather_auto' && pp.weather) {
    field.weather = pp.weather as WeatherType;
    field.wturns = 5;
    field.wsetter = mySide;
  }
}

function applyTurnPassive(mon: Mon): void {
  if (!mon.alive()) return;
  if (mon.pcat === 'per_turn_boost') {
    const boosts = (mon.pp as Record<string, unknown>).boosts as [string, number][] | undefined;
    if (boosts) {
      for (const [k, n] of boosts) {
        if (k !== 'ALL' && Math.abs(mon.stage[k as StatKey]) < CFG.PER_TURN_CAP) {
          mon.boost(k as StatKey, n);
        }
      }
    }
  } else if (mon.pcat === 'regen_turn') {
    mon.hp = Math.min(mon.maxhp, mon.hp + Math.floor(mon.maxhp / 16));
  } else if (mon.pcat === 'lowhp_boost' && !mon.lowhpDone && mon.hp < mon.maxhp * 0.5) {
    mon.lowhpDone = true;
    const boosts = (mon.pp as Record<string, unknown>).boosts as [string, number][] | undefined;
    if (boosts) {
      for (const [k, n] of boosts) {
        if (k !== 'ALL') mon.boost(k as StatKey, n);
      }
    }
  }
}

function switchIn(mon: Mon, mySide: Side, foe: Mon | null, field: Field, log: BattleLogEntry[]): void {
  if (mySide.rocks) mon.hp -= Math.floor(mon.maxhp / 8);
  if (mySide.spikes) {
    const div = mySide.spikes === 1 ? 16 : mySide.spikes === 2 ? 12 : 8;
    mon.hp -= Math.floor(mon.maxhp / div);
  }
  if (mySide.sticky && mon.ability !== 'Garde-Pellicule') mon.boost('Ryt', -1);
  if (mySide.tspikes && !(mon.status ?? '').includes('poison') && !['Garde-Pellicule', 'Quatrième Mur'].includes(mon.ability)) {
    mon.status = mySide.tspikes === 1 ? 'poison' : 'poison_bad';
    if (mySide.tspikes === 2) mon.tox = 1;
  }
  mon.hp = Math.max(0, mon.hp);

  const wset = WEATHER_SET[mon.ability];
  if (wset) { field.weather = wset; field.wturns = 5; field.wsetter = mySide; }
  if (mon.ability === "L'Aura du Patron" && foe && foe.alive()) {
    if (foe.ability === 'Tête Brûlée') foe.boost('Spec', 2);
    else if (foe.ability === 'Rancunier') foe.boost('Sce', 2);
    else foe.boost('Spec', -1);
  }
  if (mon.monument) mySide.monset.add(mon.num);
  if (mon.underdog) mySide.underset.add(mon.num);
  applyEntryPassive(mon, mySide, foe, field);
  mon.firstTurn = true;
}

// ── Damage expect (déterministe pour l'IA) ──

function damageExpect(att: Mon, dfn: Mon, mv: MoveEngine, field: Field, sideDef: Side): [number, number] {
  if (mv.percent) return [Math.max(1, dfn.maxhp * mv.percent), 1];
  const cat = mv.cat;
  if (cat !== 'phys' && cat !== 'spe') return [0, 0];
  let a: number, d: number;
  if (cat === 'phys') { a = att.stat('Spec'); d = dfn.stat('Tec'); }
  else { a = att.stat('Sce'); d = dfn.stat('Prof'); }
  d *= (1 - CFG.ANTISTALL_WALLBREAK);
  let stab = mv.type && att.types.includes(mv.type) ? CFG.STAB_MULT : 1.0;
  if (att.ability === "Cinéma d'Auteur" && mv.type && att.types.includes(mv.type)) stab = 2.0;
  const tm = typeMult(mv.type ?? '—', dfn.types);
  if (tm === 0) return [0, 0];
  const w = field.weather === 'sun' ? CFG.SUN_WEATHER_BOOST : 1.0;
  let dmg = ((mv.pow ?? 0) * a / d / 3 + 2) * stab * tm * w * 0.925;
  if (cat === 'phys' && att.status === 'burn') dmg *= 0.5;
  if (cat === 'phys' && (sideDef?.reflect ?? 0) > 0) dmg *= 0.5;
  if (cat === 'spe' && (sideDef?.lightscreen ?? 0) > 0) dmg *= 0.5;
  if ((dfn.ability === 'Première Bobine' || dfn.pcat === 'multiscale_first') && dfn.hp === dfn.maxhp) dmg *= 0.5;
  return [Math.max(1, dmg), tm];
}

const NOSCR: Side = { rocks: 0, spikes: 0, tspikes: 0, sticky: 0, reflect: 0, lightscreen: 0, monset: new Set(), monheal: false, underset: new Set() };

function bestOff(att: Mon, dfn: Mon, field: Field, sideDef: Side): [MoveEngine | null, number, number] {
  let bm: MoveEngine | null = null;
  let bacc = 0;
  let braw = 0;
  for (const mv of att.moves) {
    if (mv.cat === 'phys' || mv.cat === 'spe') {
      const [d] = damageExpect(att, dfn, mv, field, sideDef);
      const dacc = d * (mv.acc ?? 100) / 100;
      if (dacc > bacc) { bm = mv; bacc = dacc; braw = d; }
    }
  }
  return [bm, bacc, braw];
}

function outspeeds(att: Mon, dfn: Mon, field: Field): boolean {
  const sa = effSpeed(att, field);
  const sd = effSpeed(dfn, field);
  if (field.tr > 0) return sa < sd;
  return sa >= sd;
}

function entryHaz(side: Side): number {
  let h = side.rocks * 0.125;
  if (side.spikes) h += [0, 1/16, 1/12, 1/8][side.spikes] ?? 0;
  return h;
}

function bestSwitch(team: Mon[], idx: number, dfn: Mon, field: Field, mySide: Side): [number | null, number] {
  const haz = entryHaz(mySide);
  let best: number | null = null;
  let bs = -1e9;
  for (let k = 0; k < team.length; k++) {
    if (k === idx || !team[k].alive()) continue;
    const c = team[k];
    const mine = bestOff(c, dfn, field, NOSCR)[1];
    const foe = bestOff(dfn, c, field, NOSCR)[2];
    const entry = c.maxhp * haz;
    let score = mine - foe - entry;
    if (foe < (c.hp - entry)) score += c.hp * 0.35;
    if (score > bs) { bs = score; best = k; }
  }
  return [best, bs];
}

// ── IA Clippy (port fidèle de choose()) ──

export function chooseAI(
  att: Mon, dfn: Mon, mySide: Side, foeSide: Side, field: Field, team: Mon[], idx: number,
): ['move', MoveEngine] | ['switch', number] {
  const utils = att.moves.filter(m => m.cat === 'status' && hasPP(att, m));
  const [bo, boAcc, boRaw] = bestOff(att, dfn, field, foeSide);
  const [, , ftRaw] = bestOff(dfn, att, field, mySide);
  const iFast = outspeeds(att, dfn, field);
  const canKo = bo != null && boRaw >= dfn.hp;
  const foeKos = ftRaw >= att.hp;

  if (canKo && iFast) return ['move', bo!];
  for (const m of att.moves) {
    if ((m.cat === 'phys' || m.cat === 'spe') && (m.pri ?? 0) > 0) {
      const [d] = damageExpect(att, dfn, m, field, foeSide);
      if (d >= dfn.hp) return ['move', m];
    }
  }
  if (canKo && !foeKos) return ['move', bo!];

  if (att.firstTurn && !foeKos) {
    for (const m of utils) {
      const e = m.eff ?? '';
      if (e === 'hazard:rocks' && !foeSide.rocks) return ['move', m];
      if (e === 'hazard:spikes' && foeSide.spikes < 3) return ['move', m];
      if (e.startsWith('weather:') && field.weather !== e.split(':')[1]) return ['move', m];
      if (['reflect', 'lightscreen', 'auroraveil'].includes(e) && !mySide.reflect && !mySide.lightscreen) {
        if (e !== 'auroraveil' || field.weather === 'snow') return ['move', m];
      }
      if (e === 'trickroom' && field.tr === 0) return ['move', m];
    }
  }

  const foeStaller = dfn.moves.some(mm => mm.cat === 'status' && ['recover', 'hazard:rocks', 'hazard:spikes'].includes(mm.eff ?? ''));
  if (foeStaller && dfn.taunt === 0 && !foeKos) {
    for (const m of utils) {
      if (m.eff === 'taunt') return ['move', m];
    }
  }

  if (!foeKos && ftRaw * 2 < att.hp) {
    for (const m of utils) {
      if (m.eff === 'vatout' && (att.stage.Spec ?? 0) < 4 && att.hp > att.maxhp * 0.6) return ['move', m];
      if ((m.eff ?? '').startsWith('boost:')) {
        const k = m.eff!.split(':')[1] as StatKey;
        if ((att.stage[k] ?? 0) < 4) return ['move', m];
      }
    }
  }

  if (att.hp < att.maxhp * 0.40 && att.taunt === 0) {
    for (const m of utils) {
      if (m.eff === 'recover') return ['move', m];
    }
  }

  const canSwitch = !att.firstTurn;
  if (canSwitch && att.ability === 'Chute de Neige' && mySide.reflect > 0 && !canKo) {
    for (let k = 0; k < team.length; k++) {
      if (team[k].alive() && k !== idx && team[k].moves.some(mm => mm.cat === 'status' && mm.eff === 'vatout')) {
        return ['switch', k];
      }
    }
  }
  const offDrop = Math.min(att.stage.Spec ?? 0, att.stage.Sce ?? 0);
  if (canSwitch && offDrop <= -2 && !canKo) {
    const [bk, score] = bestSwitch(team, idx, dfn, field, mySide);
    if (bk != null && score > -att.maxhp * 0.15) return ['switch', bk];
  }
  if (canSwitch && foeKos && !canKo) {
    const [bk, score] = bestSwitch(team, idx, dfn, field, mySide);
    if (bk != null && score > att.maxhp * 0.15) return ['switch', bk];
  }
  if (canSwitch && bo != null && boAcc < dfn.hp * 0.07) {
    const [bk, score] = bestSwitch(team, idx, dfn, field, mySide);
    if (bk != null && bestOff(team[bk], dfn, field, NOSCR)[1] > boAcc * 3 && score > 0) {
      return ['switch', bk];
    }
  }

  if (bo != null) return ['move', bo];
  if (utils.length) return ['move', utils[0]];
  return ['move', att.moves[0]];
}

// ── Run Move ──

function runMove(
  att: Mon, dfn: Mon, mv: MoveEngine,
  mySide: Side, foeSide: Side, field: Field, log: BattleLogEntry[], turn: number, side: 'A' | 'B',
): void {
  if ((mv.pri ?? 0) > 0 && dfn.alive() && dfn.ability === 'Mise en Scène') return;

  if (mv.cat === 'status') {
    const i = midx(att, mv);
    if (att.ppLeft[i] <= 0) return;
    att.ppLeft[i]--;
    const e = mv.eff ?? '';
    if (att.taunt > 0) return;

    if (e === 'taunt') {
      if (dfn.ability !== 'Tirade') dfn.taunt = 3;
    } else if (e === 'protect') {
      att.protected = true;
    } else if (e === 'recover') {
      let heal = Math.floor(att.maxhp / 3);
      heal = Math.floor(heal * Math.max(CFG.ANTISTALL_HEAL_FLOOR, 1 - CFG.ANTISTALL_HEAL_DECAY * att.recoverCount));
      att.recoverCount++;
      att.hp = Math.min(att.maxhp, att.hp + heal);
    } else if (e === 'reflect') {
      mySide.reflect = 3;
    } else if (e === 'lightscreen') {
      mySide.lightscreen = 3;
    } else if (e === 'auroraveil') {
      mySide.reflect = 3; mySide.lightscreen = 3;
    } else if (e.startsWith('weather:')) {
      field.weather = e.split(':')[1] as WeatherType;
      field.wturns = CFG.WEATHER_TURNS;
      field.wsetter = mySide;
    } else if (e === 'trickroom') {
      field.tr = field.tr === 0 ? 5 : 0;
    } else if (e === 'hazard:rocks') {
      foeSide.rocks = 1;
    } else if (e === 'hazard:spikes') {
      foeSide.spikes = Math.min(3, foeSide.spikes + 1);
    } else if (e === 'hazard:tspikes') {
      foeSide.tspikes = Math.min(2, foeSide.tspikes + 1);
    } else if (e === 'hazard:sticky') {
      foeSide.sticky = 1;
    } else if (e === 'defog') {
      Object.assign(foeSide, { rocks: 0, spikes: 0, tspikes: 0, sticky: 0 });
      Object.assign(mySide, { rocks: 0, spikes: 0, tspikes: 0, sticky: 0 });
    } else if (e.startsWith('boost:')) {
      const parts = e.split(':');
      att.boost(parts[1] as StatKey, parseInt(parts[2]));
    } else if (e.startsWith('drop:')) {
      const parts = e.split(':');
      if (dfn.ability !== 'Tirade') dfn.boost(parts[1] as StatKey, parseInt(parts[2]));
    } else if (e.startsWith('allboost:')) {
      const n = parseInt(e.split(':')[1]);
      for (const k of Object.keys(att.base) as StatKey[]) att.boost(k, n);
    } else if (e === 'vatout') {
      att.boost('Spec', 6);
      att.hp = Math.max(1, att.hp - Math.floor(att.maxhp / 2));
    } else if (e.startsWith('status:')) {
      applyStatus(dfn, e.split(':')[1]);
    }
    log.push({ turn, side, action: 'move', detail: `${att.name} utilise ${mv.name}` });
    return;
  }

  // Dégâts
  if (dfn.protected) {
    log.push({ turn, side, action: 'info', detail: `${dfn.name} se protège !` });
    return;
  }
  const acc = (mv.acc ?? 100) / 100;
  if (Math.random() > acc) {
    log.push({ turn, side, action: 'info', detail: `${att.name} rate ${mv.name} !` });
    return;
  }
  if (mv.percent) {
    if (dfn.disguise) { dfn.disguise = false; dfn.hp -= Math.floor(dfn.maxhp / 8); return; }
    dfn.hp -= Math.floor(dfn.maxhp * mv.percent);
    log.push({ turn, side, action: 'move', detail: `${att.name} utilise ${mv.name}` });
    return;
  }
  if (att.pcat !== 'true_hit') {
    if (dfn.pcat === 'dodge_first' && !dfn.dodgeUsed) { dfn.dodgeUsed = true; return; }
    if ((dfn.pcat === 'evasion' || dfn.pcat === 'miss_chance') && Math.random() < ((dfn.pp as Record<string, number>).pct ?? 30) / 100) return;
  }
  const [dmgRaw, tm] = damage(att, dfn, mv, field, foeSide);
  let dmg = dmgRaw;
  if (dfn.disguise) { dfn.disguise = false; dfn.hp -= Math.floor(dfn.maxhp / 8); return; }
  if (dfn.pcat === 'endure_once' && !dfn.endureUsed && dmg >= dfn.hp && dfn.hp > 1) {
    dmg = dfn.hp - 1; dfn.endureUsed = true;
  }
  dfn.hp -= dmg;
  if (dmg > 0 && dfn.pcat === 'damage_return' && mv.cat === 'phys') {
    att.hp = Math.max(0, att.hp - Math.floor(dmg * ((dfn.pp as Record<string, number>).frac ?? 0.5)));
  }
  if (dmg > 0 && att.pcat === 'onhit_boost') {
    const boosts = (att.pp as Record<string, unknown>).boosts as [string, number][] | undefined;
    if (boosts) for (const [k, n] of boosts) { if (k !== 'ALL') att.boost(k as StatKey, n); }
  }
  if (dmg > 0) att.dealt = true;
  if (mv.recoil) att.hp -= Math.floor(dmg * mv.recoil);
  if (mv.self_drop) { for (const [k, n] of mv.self_drop) att.boost(k as StatKey, n); }
  if (mv.self_hp) att.hp = Math.max(0, att.hp - Math.floor(att.maxhp * mv.self_hp));
  if (mv.flinch_speed) dfn.boost('Ryt', -1);
  if (mv.sec && Math.random() < mv.sec[1]) applyStatus(dfn, mv.sec[0]);
  if (mv.pivot && att.alive()) att.pivotPending = true;
  if (mv.cat === 'phys' && dfn.alive()) {
    if (dfn.ability === 'Statique' && Math.random() < 0.3) applyStatus(att, 'para');
    if (dfn.ability === 'Pellicule Toxique' && Math.random() < 0.3) applyStatus(att, 'poison');
  }

  let detail = `${att.name} utilise ${mv.name}`;
  if (tm >= 2) detail += ' — Super efficace !';
  else if (tm > 0 && tm < 1) detail += ' — Pas très efficace…';
  else if (tm === 0) detail += ' — Aucun effet !';
  log.push({ turn, side, action: 'move', detail });
}

// ── End Turn ──

function endTurn(mons: [Mon, Mon], sides: [Side, Side], field: Field): void {
  const w = field.weather;
  for (let i = 0; i < 2; i++) {
    const m = mons[i];
    if (!m.alive()) continue;
    if (m.ability !== 'Garde-Pellicule') {
      if (w === 'rain') m.hp = Math.min(m.maxhp, m.hp + Math.floor(m.maxhp / 16));
      else if (w === 'sand') m.hp -= Math.floor(m.maxhp / 16);
      else if (w === 'snow' && field.wsetter != null && sides[i] !== field.wsetter) m.hp -= Math.floor(m.maxhp / 16);
      if (m.status === 'poison') m.hp -= Math.floor(m.maxhp / 8);
      else if (m.status === 'poison_bad') { m.tox++; m.hp -= Math.floor(m.maxhp * m.tox / 16); }
      else if (m.status === 'burn') m.hp -= Math.floor(m.maxhp / 16);
    }
    m.hp = Math.max(0, m.hp);
  }
  for (const s of sides) {
    for (const k of ['reflect', 'lightscreen'] as const) {
      if (s[k] > 0) s[k]--;
    }
  }
  if (field.wturns > 0) {
    field.wturns--;
    if (field.wturns === 0) field.weather = null;
  }
  if (field.tr > 0) field.tr--;
  for (const m of mons) {
    if (m.taunt > 0) m.taunt--;
    m.protected = false;
  }
}

// ── Battle (boucle principale) ──

export type MonTuple = [number, string, MoveEngine[], MegaInfo];

export function battle(
  teamASpec: MonTuple[],
  teamBSpec: MonTuple[],
  cards: Record<number, CardData>,
  chooseHuman?: (att: Mon, dfn: Mon, mySide: Side, foeSide: Side, field: Field, team: Mon[], idx: number) => Promise<['move', MoveEngine] | ['switch', number]>,
): BattleResult {
  const A = teamASpec.map(t => new Mon(t[0], t[1], t[2], t[3], cards));
  const B = teamBSpec.map(t => new Mon(t[0], t[1], t[2], t[3], cards));
  const sA = newSide();
  const sB = newSide();
  const field: Field = { weather: null, wturns: 0, tr: 0, wsetter: null };
  let ia = 0, ib = 0;
  const megaUsed = [false, false];
  const log: BattleLogEntry[] = [];

  switchIn(A[ia], sA, B[ib], field, log);
  switchIn(B[ib], sB, A[ia], field, log);

  let turns = 0;
  while (A.some(m => m.alive()) && B.some(m => m.alive()) && turns < CFG.MAX_TURNS) {
    turns++;
    let a = A[ia], b = B[ib];

    if (!a.alive()) {
      const opts = A.map((_, k) => k).filter(k => A[k].alive());
      if (!opts.length) break;
      ia = opts.reduce((best, k) => {
        const score = bestOff(A[k], b, field, sB)[1] - bestOff(b, A[k], field, sA)[2];
        const bestScore = bestOff(A[best], b, field, sB)[1] - bestOff(b, A[best], field, sA)[2];
        return score > bestScore ? k : best;
      });
      a = A[ia]; switchIn(a, sA, b, field, log);
      log.push({ turn: turns, side: 'A', action: 'switch', detail: `${a.name} entre en jeu !` });
    }
    if (!b.alive()) {
      const opts = B.map((_, k) => k).filter(k => B[k].alive());
      if (!opts.length) break;
      ib = opts.reduce((best, k) => {
        const score = bestOff(B[k], a, field, sA)[1] - bestOff(a, B[k], field, sB)[2];
        const bestScore = bestOff(B[best], a, field, sA)[1] - bestOff(a, B[best], field, sB)[2];
        return score > bestScore ? k : best;
      });
      b = B[ib]; switchIn(b, sB, a, field, log);
      log.push({ turn: turns, side: 'B', action: 'switch', detail: `${b.name} entre en jeu !` });
    }
    a = A[ia]; b = B[ib];

    // Climax awakening
    if (a.mega && !megaUsed[0] && a.hp > a.maxhp * 0.5) {
      a.megaed = true; megaUsed[0] = true;
      if (a.mega[0] === 'trickroom') field.tr = 5;
      else if (a.mega[0]) { field.weather = a.mega[0] as WeatherType; field.wturns = CFG.WEATHER_TURNS; field.wsetter = sA; }
      log.push({ turn: turns, side: 'A', action: 'info', detail: `${a.name} éveille son Climax !`, weatherNow: field.weather });
    }
    if (b.mega && !megaUsed[1] && b.hp > b.maxhp * 0.5) {
      b.megaed = true; megaUsed[1] = true;
      if (b.mega[0] === 'trickroom') field.tr = 5;
      else if (b.mega[0]) { field.weather = b.mega[0] as WeatherType; field.wturns = CFG.WEATHER_TURNS; field.wsetter = sB; }
      log.push({ turn: turns, side: 'B', action: 'info', detail: `${b.name} éveille son Climax !`, weatherNow: field.weather });
    }
    updateMega(a, field); updateMega(b, field);
    applyTurnPassive(a); applyTurnPassive(b);
    a.moncombo = a.monument ? sA.monset.size : 0;
    b.moncombo = b.monument ? sB.monset.size : 0;
    a.undercombo = a.underdog ? sA.underset.size : 0;
    b.undercombo = b.underdog ? sB.underset.size : 0;

    if (a.megaed && a.mega && a.mega[0] === 'trickroom' && a.alive()) field.tr = Math.max(field.tr, 2);
    if (b.megaed && b.mega && b.mega[0] === 'trickroom' && b.alive()) field.tr = Math.max(field.tr, 2);

    const decA = chooseAI(a, b, sA, sB, field, A, ia);
    const decB = chooseAI(b, a, sB, sA, field, B, ib);

    // Switches
    if (decA[0] === 'switch') {
      if (a.ability === 'Remontage') a.hp = Math.min(a.maxhp, a.hp + Math.floor(a.maxhp / 3));
      ia = decA[1]; switchIn(A[ia], sA, b, field, log); a = A[ia];
      log.push({ turn: turns, side: 'A', action: 'switch', detail: `${a.name} entre en jeu !` });
    }
    if (decB[0] === 'switch') {
      if (b.ability === 'Remontage') b.hp = Math.min(b.maxhp, b.hp + Math.floor(b.maxhp / 3));
      ib = decB[1]; switchIn(B[ib], sB, a, field, log); b = B[ib];
      log.push({ turn: turns, side: 'B', action: 'switch', detail: `${b.name} entre en jeu !` });
    }

    // Actions
    type Act = { who: 'A' | 'B'; att: Mon; dfn: Mon; ms: Side; fs: Side; mv: MoveEngine };
    const acts: Act[] = [];
    if (decA[0] === 'move') acts.push({ who: 'A', att: a, dfn: b, ms: sA, fs: sB, mv: decA[1] });
    if (decB[0] === 'move') acts.push({ who: 'B', att: b, dfn: a, ms: sB, fs: sA, mv: decB[1] });

    acts.sort((x, y) => {
      const prX = (x.mv.pri ?? 0) + (x.mv.cat === 'status' && x.att.ability === 'Réplique' ? 1 : 0);
      const prY = (y.mv.pri ?? 0) + (y.mv.cat === 'status' && y.att.ability === 'Réplique' ? 1 : 0);
      if (prX !== prY) return prY - prX;
      let spX = effSpeed(x.att, field);
      let spY = effSpeed(y.att, field);
      if (field.tr > 0) { spX = -spX; spY = -spY; }
      if (spX !== spY) return spY - spX;
      return Math.random() - 0.5;
    });

    for (const { who, att: attM, dfn: dfnM, ms, fs, mv } of acts) {
      if (!attM.alive() || !dfnM.alive()) continue;
      if (attM.sleep > 0) {
        attM.sleep--;
        if (attM.sleep > 0) { attM.firstTurn = false; continue; }
        else attM.status = null;
      }
      if (attM.conf > 0) {
        attM.conf--;
        if (Math.random() < 0.33) {
          attM.hp -= Math.floor(40 * attM.stat('Spec') / attM.stat('Tec') / 3 + 2);
          attM.hp = Math.max(0, attM.hp);
          attM.firstTurn = false;
          continue;
        }
      }
      if (attM.status === 'para' && Math.random() < 0.25) { attM.firstTurn = false; continue; }
      runMove(attM, dfnM, mv, ms, fs, field, log, turns, who);
      attM.firstTurn = false;
    }

    // Pivots
    if (a.alive() && a.pivotPending) {
      a.pivotPending = false;
      const [bk] = bestSwitch(A, ia, b, field, sA);
      if (bk != null) { ia = bk; switchIn(A[ia], sA, b, field, log); a = A[ia]; }
    }
    if (b.alive() && b.pivotPending) {
      b.pivotPending = false;
      const [bk] = bestSwitch(B, ib, a, field, sB);
      if (bk != null) { ib = bk; switchIn(B[ib], sB, a, field, log); b = B[ib]; }
    }

    endTurn([a, b], [sA, sB], field);

    // Log HP
    log.push({
      turn: turns, side: 'A', action: 'info',
      detail: `Tour ${turns}`,
      hpA: a.hp, hpAmax: a.maxhp,
      hpB: b.hp, hpBmax: b.maxhp,
      weatherNow: field.weather,
    });

    // Faint check
    if (!a.alive()) log.push({ turn: turns, side: 'A', action: 'faint', detail: `${a.name} est K.O. !` });
    if (!b.alive()) log.push({ turn: turns, side: 'B', action: 'faint', detail: `${b.name} est K.O. !` });
  }

  const aliveA = A.filter(m => m.alive()).length;
  const aliveB = B.filter(m => m.alive()).length;
  const winner = aliveA > aliveB ? 'A' : aliveB > aliveA ? 'B' : 'draw';

  return { winner, turns, log, aliveA, aliveB };
}
