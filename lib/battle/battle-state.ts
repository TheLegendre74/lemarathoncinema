import { BATTLE_CONFIG } from './config';
import {
  Mon, chooseAI, newSide, switchIn, runMove, endTurn,
  effSpeed, updateMega, applyTurnPassive, bestSwitch, bestOff,
} from './engine';
import type { MonTuple } from './engine';
import type {
  CardData, MoveEngine, Side, Field, WeatherType,
  Difficulty, BattleLogEntry, BattlePhase, BattleSnapshot,
  BattleEvent, PlayerAction, MegaInfo,
} from './types';

const CFG = BATTLE_CONFIG;

function monSnap(m: Mon) {
  return { num: m.num, name: m.name, hp: Math.max(0, m.hp), maxhp: m.maxhp, types: m.types, status: m.status };
}

function teamSnap(team: Mon[]) {
  return team.map(m => ({
    num: m.num, name: m.name, hp: Math.max(0, m.hp), maxhp: m.maxhp,
    alive: m.alive(), status: m.status,
  }));
}

export class BattleState {
  teamA: Mon[];
  teamB: Mon[];
  sideA: Side;
  sideB: Side;
  field: Field;
  activeA = 0;
  activeB = 0;
  turn = 0;
  megaUsedA = false;
  megaUsedB = false;
  phase: BattlePhase = 'player_choice';
  winner: 'A' | 'B' | 'draw' | null = null;
  difficulty: Difficulty;
  cards: Record<number, CardData>;
  initEvents: BattleEvent[] = [];
  needClippyReplace = false;

  constructor(
    teamASpec: MonTuple[],
    teamBSpec: MonTuple[],
    cards: Record<number, CardData>,
    difficulty: Difficulty,
  ) {
    this.cards = cards;
    this.difficulty = difficulty;
    this.teamA = teamASpec.map(t => new Mon(t[0], t[1], t[2], t[3], cards));
    this.teamB = teamBSpec.map(t => new Mon(t[0], t[1], t[2], t[3], cards));
    this.sideA = newSide();
    this.sideB = newSide();
    this.field = { weather: null, wturns: 0, tr: 0, wsetter: null };

    const dummyLog: BattleLogEntry[] = [];
    switchIn(this.teamA[0], this.sideA, this.teamB[0], this.field, dummyLog);
    switchIn(this.teamB[0], this.sideB, this.teamA[0], this.field, dummyLog);

    this.initEvents = [
      this.evt(`${this.monA.name} entre en scène !`),
      this.evt(`📎 Clippy envoie ${this.monB.name} !`),
    ];
  }

  get monA(): Mon { return this.teamA[this.activeA]; }
  get monB(): Mon { return this.teamB[this.activeB]; }

  snapshot(): BattleSnapshot {
    return {
      activeA: this.monA.alive() ? monSnap(this.monA) : null,
      activeB: this.monB.alive() ? monSnap(this.monB) : null,
      weather: this.field.weather,
      tr: this.field.tr,
      teamA: teamSnap(this.teamA),
      teamB: teamSnap(this.teamB),
    };
  }

  private evt(message: string, isKO?: 'A' | 'B'): BattleEvent {
    return { message, snapshot: this.snapshot(), isKO };
  }

  getPlayerMoves() {
    const mon = this.monA;
    const card = this.cards[mon.num];
    return mon.moves.map((m, i) => ({
      engineMove: m,
      index: i,
      pp: mon.ppLeft[i],
      maxPP: m.pp ?? 99,
      displayName: card?.moves?.[i]?.name ?? m.name,
      displayType: card?.moves?.[i]?.type ?? m.type,
      displayCat: card?.moves?.[i]?.cat ?? m.cat,
      displayPow: card?.moves?.[i]?.pow ?? m.pow ?? null,
    }));
  }

  getAvailableSwitches() {
    return this.teamA
      .map((m, i) => ({ mon: m, index: i, hp: m.hp, maxhp: m.maxhp, alive: m.alive(), num: m.num, name: m.name, types: m.types, status: m.status }))
      .filter(x => x.alive && x.index !== this.activeA);
  }

  canClimax(): boolean {
    return !!(this.monA.mega && !this.megaUsedA);
  }

  submitAction(action: PlayerAction): BattleEvent[] {
    if (this.phase !== 'player_choice') return [];
    const events: BattleEvent[] = [];

    if (action.type === 'forfeit') {
      this.winner = 'B';
      this.phase = 'ended';
      events.push(this.evt('Tu abandonnes le combat…'));
      return events;
    }

    this.turn++;
    let a = this.monA;
    let b = this.monB;

    // --- Climax awakenings ---
    if (action.type === 'move' && action.climax && a.mega && !this.megaUsedA) {
      this.awakenClimax(a, 'A', events);
    }
    if (b.mega && !this.megaUsedB && (this.difficulty === 'moyen' || this.difficulty === 'difficile')) {
      if (this.turn <= CFG.CLIPPY_AWAKEN_TURN) {
        this.awakenClimax(b, 'B', events);
      }
    }

    updateMega(a, this.field);
    updateMega(b, this.field);
    applyTurnPassive(a);
    applyTurnPassive(b);

    a.moncombo = a.monument ? this.sideA.monset.size : 0;
    b.moncombo = b.monument ? this.sideB.monset.size : 0;
    a.undercombo = a.underdog ? this.sideA.underset.size : 0;
    b.undercombo = b.underdog ? this.sideB.underset.size : 0;

    if (a.megaed && a.mega && a.mega[0] === 'trickroom' && a.alive()) {
      this.field.tr = Math.max(this.field.tr, 2);
    }
    if (b.megaed && b.mega && b.mega[0] === 'trickroom' && b.alive()) {
      this.field.tr = Math.max(this.field.tr, 2);
    }

    // --- Decisions ---
    let decA: ['move', MoveEngine] | ['switch', number];
    if (action.type === 'move') {
      decA = ['move', a.moves[action.moveIndex]];
    } else {
      decA = ['switch', action.targetIndex];
    }
    const decB = chooseAI(b, a, this.sideB, this.sideA, this.field, this.teamB, this.activeB);

    // --- Switches first ---
    if (decA[0] === 'switch') {
      if (a.ability === 'Remontage') a.hp = Math.min(a.maxhp, a.hp + Math.floor(a.maxhp / 3));
      events.push(this.evt(`${a.name} revient !`));
      this.activeA = decA[1];
      const dLog: BattleLogEntry[] = [];
      switchIn(this.teamA[this.activeA], this.sideA, b, this.field, dLog);
      a = this.monA;
      events.push(this.evt(`${a.name} entre en jeu !`));
    }
    if (decB[0] === 'switch') {
      if (b.ability === 'Remontage') b.hp = Math.min(b.maxhp, b.hp + Math.floor(b.maxhp / 3));
      events.push(this.evt(`📎 ${b.name} revient !`));
      this.activeB = decB[1];
      const dLog: BattleLogEntry[] = [];
      switchIn(this.teamB[this.activeB], this.sideB, a, this.field, dLog);
      b = this.monB;
      events.push(this.evt(`📎 ${b.name} entre en jeu !`));
    }

    // --- Moves in speed order ---
    type Act = { who: 'A' | 'B'; att: Mon; dfn: Mon; ms: Side; fs: Side; mv: MoveEngine };
    const acts: Act[] = [];
    if (decA[0] === 'move') acts.push({ who: 'A', att: a, dfn: b, ms: this.sideA, fs: this.sideB, mv: decA[1] });
    if (decB[0] === 'move') acts.push({ who: 'B', att: b, dfn: a, ms: this.sideB, fs: this.sideA, mv: decB[1] });

    acts.sort((x, y) => {
      const prX = (x.mv.pri ?? 0) + (x.mv.cat === 'status' && x.att.ability === 'Réplique' ? 1 : 0);
      const prY = (y.mv.pri ?? 0) + (y.mv.cat === 'status' && y.att.ability === 'Réplique' ? 1 : 0);
      if (prX !== prY) return prY - prX;
      let spX = effSpeed(x.att, this.field);
      let spY = effSpeed(y.att, this.field);
      if (this.field.tr > 0) { spX = -spX; spY = -spY; }
      if (spX !== spY) return spY - spX;
      return Math.random() - 0.5;
    });

    for (const { who, att, dfn, ms, fs, mv } of acts) {
      if (!att.alive() || !dfn.alive()) continue;
      const prefix = who === 'B' ? '📎 ' : '';

      if (att.sleep > 0) {
        att.sleep--;
        if (att.sleep > 0) {
          events.push(this.evt(`${prefix}${att.name} dort profondément…`));
          att.firstTurn = false;
          continue;
        } else {
          att.status = null;
          events.push(this.evt(`${prefix}${att.name} se réveille !`));
        }
      }
      if (att.conf > 0) {
        att.conf--;
        if (Math.random() < 0.33) {
          att.hp -= Math.floor(40 * att.stat('Spec') / att.stat('Tec') / 3 + 2);
          att.hp = Math.max(0, att.hp);
          events.push(this.evt(`${prefix}${att.name} se blesse dans sa confusion !`));
          att.firstTurn = false;
          if (!att.alive()) events.push(this.evt(`${prefix}${att.name} est K.O. !`, who));
          continue;
        }
      }
      if (att.status === 'para' && Math.random() < 0.25) {
        events.push(this.evt(`${prefix}${att.name} est paralysé et ne peut pas agir !`));
        att.firstTurn = false;
        continue;
      }

      const moveLog: BattleLogEntry[] = [];
      runMove(att, dfn, mv, ms, fs, this.field, moveLog, this.turn, who);

      if (moveLog.length > 0) {
        for (const entry of moveLog) {
          events.push(this.evt(who === 'B' && !entry.detail.startsWith('📎') ? `📎 ${entry.detail}` : entry.detail));
        }
      } else {
        const card = this.cards[att.num];
        const displayName = card?.moves?.find(m => m.name === mv.name)?.name ?? mv.name;
        events.push(this.evt(`${prefix}${att.name} utilise ${displayName} !`));
      }

      att.firstTurn = false;

      if (!dfn.alive()) {
        events.push(this.evt(
          `${who === 'A' ? '📎 ' : ''}${dfn.name} est K.O. !`,
          who === 'A' ? 'B' : 'A',
        ));
      }
      if (!att.alive()) {
        events.push(this.evt(`${prefix}${att.name} est K.O. !`, who));
      }
    }

    // --- Pivots ---
    if (a.alive() && a.pivotPending) {
      a.pivotPending = false;
      const [bk] = bestSwitch(this.teamA, this.activeA, b, this.field, this.sideA);
      if (bk != null) {
        events.push(this.evt(`${a.name} se replie !`));
        this.activeA = bk;
        const dLog: BattleLogEntry[] = [];
        switchIn(this.teamA[this.activeA], this.sideA, b, this.field, dLog);
        a = this.monA;
        events.push(this.evt(`${a.name} entre en jeu !`));
      }
    }
    if (b.alive() && b.pivotPending) {
      b.pivotPending = false;
      const [bk] = bestSwitch(this.teamB, this.activeB, a, this.field, this.sideB);
      if (bk != null) {
        events.push(this.evt(`📎 ${b.name} se replie !`));
        this.activeB = bk;
        const dLog: BattleLogEntry[] = [];
        switchIn(this.teamB[this.activeB], this.sideB, a, this.field, dLog);
        b = this.monB;
        events.push(this.evt(`📎 ${b.name} entre en jeu !`));
      }
    }

    // --- End turn ---
    endTurn([a, b], [this.sideA, this.sideB], this.field);

    if (this.field.weather) {
      events.push(this.evt(`La météo : ${this.weatherLabel(this.field.weather)}`));
    }

    if (!a.alive() && a.hp <= 0) {
      if (!events.some(e => e.isKO === 'A' && e.message.includes(a.name))) {
        events.push(this.evt(`${a.name} est K.O. !`, 'A'));
      }
    }
    if (!b.alive() && b.hp <= 0) {
      if (!events.some(e => e.isKO === 'B' && e.message.includes(b.name))) {
        events.push(this.evt(`📎 ${b.name} est K.O. !`, 'B'));
      }
    }

    // --- Determine next phase ---
    const aTeamAlive = this.teamA.some(m => m.alive());
    const bTeamAlive = this.teamB.some(m => m.alive());

    if (!aTeamAlive || !bTeamAlive) {
      this.winner = !aTeamAlive ? 'B' : 'A';
      this.phase = 'ended';
      events.push(this.evt(this.winner === 'A' ? 'Victoire !' : 'Défaite…'));
      return events;
    }

    if (!this.monB.alive()) {
      this.replaceClippy(events);
    }

    if (!this.monA.alive()) {
      this.phase = 'ko_replace';
    } else {
      this.phase = 'player_choice';
    }

    return events;
  }

  submitReplacement(targetIndex: number): BattleEvent[] {
    if (this.phase !== 'ko_replace') return [];
    const events: BattleEvent[] = [];

    this.activeA = targetIndex;
    const dLog: BattleLogEntry[] = [];
    switchIn(this.teamA[this.activeA], this.sideA, this.monB, this.field, dLog);
    events.push(this.evt(`${this.monA.name} entre en jeu !`));

    const aTeamAlive = this.teamA.some(m => m.alive());
    const bTeamAlive = this.teamB.some(m => m.alive());

    if (!aTeamAlive || !bTeamAlive) {
      this.winner = !aTeamAlive ? 'B' : 'A';
      this.phase = 'ended';
      events.push(this.evt(this.winner === 'A' ? 'Victoire !' : 'Défaite…'));
    } else {
      this.phase = 'player_choice';
    }

    return events;
  }

  private awakenClimax(mon: Mon, side: 'A' | 'B', events: BattleEvent[]) {
    const prefix = side === 'B' ? '📎 ' : '';
    mon.megaed = true;
    if (side === 'A') this.megaUsedA = true;
    else this.megaUsedB = true;

    if (mon.mega![0] === 'trickroom') {
      this.field.tr = 5;
      events.push(this.evt(`${prefix}${mon.name} éveille son Climax ! La Distorsion se met en place !`));
    } else if (mon.mega![0]) {
      this.field.weather = mon.mega![0] as WeatherType;
      this.field.wturns = CFG.WEATHER_TURNS;
      this.field.wsetter = side === 'A' ? this.sideA : this.sideB;
      events.push(this.evt(`${prefix}${mon.name} éveille son Climax ! ${this.weatherLabel(this.field.weather!)} se lève !`));
    } else {
      events.push(this.evt(`${prefix}${mon.name} éveille son Climax !`));
    }
  }

  private replaceClippy(events: BattleEvent[]) {
    const a = this.monA;
    const opts = this.teamB.map((_, k) => k).filter(k => this.teamB[k].alive());
    if (!opts.length) return;
    const bestIdx = opts.reduce((best, k) => {
      const score = bestOff(this.teamB[k], a, this.field, this.sideA)[1]
                  - bestOff(a, this.teamB[k], this.field, this.sideB)[2];
      const bestScore = bestOff(this.teamB[best], a, this.field, this.sideA)[1]
                      - bestOff(a, this.teamB[best], this.field, this.sideB)[2];
      return score > bestScore ? k : best;
    });
    this.activeB = bestIdx;
    const dLog: BattleLogEntry[] = [];
    switchIn(this.teamB[this.activeB], this.sideB, a, this.field, dLog);
    events.push(this.evt(`📎 Clippy envoie ${this.monB.name} !`));
  }

  private weatherLabel(w: WeatherType): string {
    const labels: Record<string, string> = {
      sun: 'Plein Soleil', rain: 'Sous la Pluie',
      sand: 'Vent de Sable', snow: 'Chute de Neige',
    };
    return w ? labels[w] ?? w : '';
  }
}
