import type { World, Input, GameState, Difficulty } from './types';
import { BALANCE, WORLD_W, WORLD_H, FIXED_DT } from './balance';
import { SeededRNG } from './rng';
import { createPlayer, updatePlayer, useBomb } from './entities/player';
import { updateEnemy } from './entities/enemy';
import { updatePowerUp } from './entities/powerup';
import { processCollisions } from './systems/collision';
import { getStageData, spawnWave } from './systems/spawn';
import { createBoss1, updateBoss1 } from './boss/boss1-station';
import { createBoss2, updateBoss2 } from './boss/boss2-eye';
import { createBoss3, updateBoss3 } from './boss/boss3-clippy';

export function createWorld(difficulty: Difficulty = 'normal', seed = 42): World {
  return {
    state: 'title',
    difficulty,
    stage: 0,
    stageTimer: 0,
    player: createPlayer(),
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    powerUps: [],
    particles: [],
    boss: null,
    bossActive: false,
    score: 0,
    highScore: 0,
    nextEntityId: 1,
    events: freshEvents(),
    width: WORLD_W,
    height: WORLD_H,
    waveIndex: 0,
    stageComplete: false,
    totalTime: 0,
    bossDialogues: [],
  };
}

export function freshEvents() {
  return {
    explosions: [] as { x: number; y: number }[],
    powerUpCollected: [] as any[],
    playerHit: false,
    playerDeath: false,
    bossPhaseChange: -1,
    bossDefeated: false,
    screenShake: 0,
    texts: [] as any[],
  };
}

export function startGame(world: World): void {
  const p = createPlayer();
  Object.assign(world, {
    state: 'playing' as GameState,
    stage: 0,
    stageTimer: 0,
    player: p,
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    powerUps: [],
    particles: [],
    boss: null,
    bossActive: false,
    score: 0,
    nextEntityId: 1,
    waveIndex: 0,
    stageComplete: false,
    totalTime: 0,
    bossDialogues: [],
  });
}

export function updateWorld(world: World, input: Input, rng: SeededRNG): void {
  if (world.state !== 'playing') return;

  world.events = freshEvents();
  const dt = FIXED_DT;
  world.totalTime += dt;
  world.stageTimer += dt;

  if (input.bomb) useBomb(world.player, world);
  updatePlayer(world.player, input, dt, world);

  const stageData = getStageData(world.stage);

  if (!world.bossActive) {
    while (world.waveIndex < stageData.waves.length &&
           stageData.waves[world.waveIndex].time <= world.stageTimer) {
      const wave = stageData.waves[world.waveIndex];
      for (const sp of wave.spawns) {
        spawnWave(sp, world);
      }
      world.waveIndex++;
    }

    const allEnemiesCleared = world.enemies.filter(e => e.active).length === 0;
    const bossTimeout = world.stageTimer >= stageData.bossTriggerTime + 15;
    if (world.stageTimer >= stageData.bossTriggerTime && (allEnemiesCleared || bossTimeout)) {
      for (const e of world.enemies) e.active = false;
      spawnBoss(world, stageData.bossType);
    }
  }

  for (const e of world.enemies) {
    if (e.active) updateEnemy(e, dt, world);
  }

  for (const b of world.playerBullets) {
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -20 || b.y > world.height + 20 || b.x < -20 || b.x > world.width + 20) {
      b.active = false;
    }
  }

  for (const b of world.enemyBullets) {
    if (!b.active) continue;
    if (b.homing) {
      const dx = world.player.x - b.x;
      const dy = world.player.y - b.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      b.vx += (dx / len) * b.homingStrength * dt;
      b.vy += (dy / len) * b.homingStrength * dt;
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (speed > 200) {
        b.vx = (b.vx / speed) * 200;
        b.vy = (b.vy / speed) * 200;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -40 || b.y > world.height + 40 || b.x < -40 || b.x > world.width + 40) {
      b.active = false;
    }
  }

  for (const pu of world.powerUps) {
    if (pu.active) updatePowerUp(pu, dt, world);
  }

  if (world.boss && world.bossActive) {
    switch (world.stage) {
      case 0: updateBoss1(world.boss, dt, world); break;
      case 1: updateBoss2(world.boss, dt, world); break;
      case 2: updateBoss3(world.boss, dt, world); break;
    }

    if (world.boss.defeated) {
      world.bossActive = false;
      if (world.stage < 2) {
        world.stage++;
        world.stageTimer = 0;
        world.waveIndex = 0;
        world.boss = null;
        world.stageComplete = false;
        world.enemyBullets.length = 0;
        world.events.texts.push({
          text: `STAGE ${world.stage + 1}`,
          x: world.width / 2, y: world.height / 2, duration: 3,
        });
      } else {
        world.state = 'victory';
      }
    }
  }

  processCollisions(world, rng);

  world.enemies = world.enemies.filter(e => e.active);
  world.playerBullets = world.playerBullets.filter(b => b.active);
  world.enemyBullets = world.enemyBullets.filter(b => b.active);
  world.powerUps = world.powerUps.filter(p => p.active);
}

function spawnBoss(world: World, type: string): void {
  world.bossActive = true;
  switch (type) {
    case 'station': world.boss = createBoss1(world); break;
    case 'eye': world.boss = createBoss2(world); break;
    case 'clippy': world.boss = createBoss3(world); break;
  }
}
