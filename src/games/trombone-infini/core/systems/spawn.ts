import type { World, StageData, WaveSpawn, Difficulty } from '../types';
import { createEnemy } from '../entities/enemy';
import { BALANCE, WORLD_W } from '../balance';

export function getStageData(stage: number): StageData {
  switch (stage) {
    case 0: return buildStage1();
    case 1: return buildStage2();
    case 2: return buildStage3();
    default: return buildStage1();
  }
}

function buildWave(time: number, spawns: WaveSpawn[]) { return { time, spawns }; }

function buildStage1(): StageData {
  const waves = [];
  let t = 2;
  for (let i = 0; i < 8; i++) {
    waves.push(buildWave(t, [{ type: 'popcorn' as const, count: 5 + i, formation: 'v' as const, delay: 0.15, vy: 100 }]));
    t += 8;
  }
  for (let i = 0; i < 4; i++) {
    waves.push(buildWave(t, [
      { type: 'weaver' as const, count: 3, formation: 'line' as const, delay: 0.3, vy: 70 },
      { type: 'popcorn' as const, count: 4, formation: 'random' as const, delay: 0.1, vy: 120 },
    ]));
    t += 10;
  }
  for (let i = 0; i < 3; i++) {
    waves.push(buildWave(t, [
      { type: 'turret' as const, count: 2, formation: 'sides' as const, delay: 0, vy: 40 },
      { type: 'popcorn' as const, count: 6, formation: 'v' as const, delay: 0.2, vy: 110 },
    ]));
    t += 10;
  }
  waves.push(buildWave(t, [
    { type: 'bomber' as const, count: 2, formation: 'line' as const, delay: 0.5, vy: 50 },
    { type: 'weaver' as const, count: 4, formation: 'random' as const, delay: 0.2, vy: 80 },
  ]));
  t += 12;
  return { name: 'Champ d\'Astéroïdes', waves, bossTriggerTime: t, bossType: 'station' };
}

function buildStage2(): StageData {
  const waves = [];
  let t = 2;
  for (let i = 0; i < 6; i++) {
    waves.push(buildWave(t, [{ type: 'weaver' as const, count: 4 + i, formation: 'line' as const, delay: 0.2, vy: 80 }]));
    t += 9;
  }
  for (let i = 0; i < 5; i++) {
    waves.push(buildWave(t, [
      { type: 'turret' as const, count: 3, formation: 'sides' as const, delay: 0, vy: 30 },
      { type: 'weaver' as const, count: 3, formation: 'random' as const, delay: 0.15, vy: 90 },
    ]));
    t += 10;
  }
  for (let i = 0; i < 3; i++) {
    waves.push(buildWave(t, [
      { type: 'bomber' as const, count: 2 + i, formation: 'line' as const, delay: 0.3, vy: 50 },
      { type: 'popcorn' as const, count: 6, formation: 'v' as const, delay: 0.1, vy: 130 },
    ]));
    t += 11;
  }
  waves.push(buildWave(t, [
    { type: 'miniboss' as const, count: 1, formation: 'line' as const, delay: 0, vy: 30 },
  ]));
  t += 15;
  return { name: 'Couloirs de CAM-9000', waves, bossTriggerTime: t, bossType: 'eye' };
}

function buildStage3(): StageData {
  const waves = [];
  let t = 2;
  for (let i = 0; i < 5; i++) {
    waves.push(buildWave(t, [
      { type: 'popcorn' as const, count: 8, formation: 'v' as const, delay: 0.1, vy: 130 },
      { type: 'weaver' as const, count: 3, formation: 'random' as const, delay: 0.2, vy: 80 },
    ]));
    t += 8;
  }
  for (let i = 0; i < 4; i++) {
    waves.push(buildWave(t, [
      { type: 'turret' as const, count: 3, formation: 'sides' as const, delay: 0, vy: 35 },
      { type: 'bomber' as const, count: 2, formation: 'line' as const, delay: 0.3, vy: 55 },
      { type: 'popcorn' as const, count: 5, formation: 'random' as const, delay: 0.15, vy: 120 },
    ]));
    t += 11;
  }
  for (let i = 0; i < 3; i++) {
    waves.push(buildWave(t, [
      { type: 'bomber' as const, count: 3, formation: 'line' as const, delay: 0.4, vy: 50 },
      { type: 'weaver' as const, count: 5, formation: 'line' as const, delay: 0.2, vy: 90 },
      { type: 'turret' as const, count: 2, formation: 'sides' as const, delay: 0, vy: 30 },
    ]));
    t += 12;
  }
  waves.push(buildWave(t, [
    { type: 'miniboss' as const, count: 1, formation: 'line' as const, delay: 0, vy: 25 },
    { type: 'popcorn' as const, count: 10, formation: 'random' as const, delay: 0.1, vy: 140 },
  ]));
  t += 15;
  return { name: 'Arène de l\'Infini', waves, bossTriggerTime: t, bossType: 'clippy' };
}

export function spawnWave(wave: WaveSpawn, world: World): void {
  const { type, count, formation, delay } = wave;
  const vy = wave.vy ?? BALANCE.enemySpeed[type] ?? 80;

  for (let i = 0; i < count; i++) {
    let x: number, y: number, vx = 0;

    switch (formation) {
      case 'line':
        x = (WORLD_W / (count + 1)) * (i + 1);
        y = -20 - i * 30 * delay;
        break;
      case 'v': {
        const center = WORLD_W / 2;
        const offset = (i - (count - 1) / 2) * 35;
        x = center + offset;
        y = -20 - Math.abs(offset) * 0.5 - i * 20 * delay;
        break;
      }
      case 'circle':
        x = WORLD_W / 2 + Math.cos((i / count) * Math.PI * 2) * 80;
        y = -20 - Math.sin((i / count) * Math.PI * 2) * 40;
        break;
      case 'sides':
        x = i % 2 === 0 ? 40 : WORLD_W - 40;
        y = -20 - Math.floor(i / 2) * 40;
        break;
      case 'random':
        x = 40 + Math.random() * (WORLD_W - 80);
        y = -20 - i * 25 * delay;
        break;
      default:
        x = WORLD_W / 2;
        y = -20;
    }

    world.enemies.push(createEnemy(type, x, y, vx, vy, world.difficulty, world));
  }
}
