import type { Difficulty } from './types';

export const WORLD_W = 480;
export const WORLD_H = 720;

export const FIXED_DT = 1 / 120;

export const INFINITY_STONES = ['space', 'mind', 'reality', 'power', 'time', 'soul'] as const;
export type StoneName = (typeof INFINITY_STONES)[number];

const BASE = {
  playerSpeed: 300,
  playerSpeedCap: 380,
  playerFireRate: 8,
  playerBulletSpeed: 600,
  playerBulletDamage: 2,
  playerHitboxRadius: 6,
  playerSpriteRadius: 16,
  playerStartLives: 3,
  playerMaxHp: 3,
  playerStartBombs: 3,
  playerMaxBombs: 5,
  playerInvulnTime: 2.0,
  playerContinues: 2,

  bombDamage: 80,
  bombIFrames: 1.5,

  enemyHp: { popcorn: 1, weaver: 2, turret: 3, bomber: 5, miniboss: 60 } as Record<string, number>,
  enemySpeed: { popcorn: 120, weaver: 100, turret: 40, bomber: 60, miniboss: 50 } as Record<string, number>,
  enemyFireRate: { popcorn: 0, weaver: 0.5, turret: 0.8, bomber: 0.5, miniboss: 1.5 } as Record<string, number>,
  enemyBulletSpeed: 130,
  enemyScoreValue: { popcorn: 100, weaver: 200, turret: 300, bomber: 500, miniboss: 3000 } as Record<string, number>,

  boss1TotalHp: 700,
  boss1Phases: [200, 240, 260],
  boss1FireRate: 0.5,

  boss2TotalHp: 700,
  boss2Phases: [220, 240, 240],
  boss2FireRate: 0.45,

  boss3GemHp: 300,
  boss3FinalPhaseHp: 200,
  boss3FireRate: 0.35,

  powerUpDropRate: 0.2,
  powerUpFallSpeed: 80,

  weaponLevels: [
    { bullets: 2, spread: 0, fireRate: 8 },
    { bullets: 3, spread: 0.05, fireRate: 9 },
    { bullets: 5, spread: 0.12, fireRate: 10 },
    { bullets: 5, spread: 0.15, fireRate: 10, side: true },
    { bullets: 7, spread: 0.18, fireRate: 11, side: true, drones: true },
  ],

  multiplierDuration: 8,
  multiplierValue: 2,

  stage1Duration: 120,
  stage2Duration: 150,
  stage3Duration: 180,

  targetRunDuration: { min: 18 * 60, max: 22 * 60 },
  targetBoss1Kill: 90,
  targetBoss2Kill: 120,
  targetBoss3Kill: 390,
};

const HARD_MULTIPLIERS = {
  enemyHpMul: 1.5,
  enemyBulletSpeedMul: 1.3,
  enemyFireRateMul: 1.4,
  spawnRateMul: 1.3,
  bossHpMul: 1.4,
};

export type Balance = typeof BASE & { hardMul: typeof HARD_MULTIPLIERS };

export const BALANCE: Balance = { ...BASE, hardMul: HARD_MULTIPLIERS };

export function getEnemyHp(type: string, difficulty: Difficulty): number {
  const base = BALANCE.enemyHp[type] ?? 1;
  return difficulty === 'hard' ? Math.ceil(base * BALANCE.hardMul.enemyHpMul) : base;
}

export function getEnemyBulletSpeed(difficulty: Difficulty): number {
  return difficulty === 'hard'
    ? BALANCE.enemyBulletSpeed * BALANCE.hardMul.enemyBulletSpeedMul
    : BALANCE.enemyBulletSpeed;
}

export function getBossHp(baseHp: number, difficulty: Difficulty): number {
  return difficulty === 'hard' ? Math.ceil(baseHp * BALANCE.hardMul.bossHpMul) : baseHp;
}
