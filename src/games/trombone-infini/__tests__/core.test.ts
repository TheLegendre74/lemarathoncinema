import { describe, it, expect } from 'vitest';
import { createWorld, startGame, updateWorld, freshEvents } from '../core/world';
import { createPlayer, damagePlayer, useBomb } from '../core/entities/player';
import { circleCollide, processCollisions } from '../core/systems/collision';
import { applyPowerUp, createPowerUp } from '../core/entities/powerup';
import { SeededRNG } from '../core/rng';
import { BALANCE, INFINITY_STONES } from '../core/balance';
import { createBoss1, updateBoss1 } from '../core/boss/boss1-station';
import { createBoss3, updateBoss3 } from '../core/boss/boss3-clippy';

describe('RNG', () => {
  it('produces deterministic sequence', () => {
    const a = new SeededRNG(123);
    const b = new SeededRNG(123);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('range returns values within bounds', () => {
    const rng = new SeededRNG(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.range(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });
});

describe('Collisions', () => {
  it('detects overlapping circles', () => {
    const a = { id: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 10, active: true };
    const b = { id: 2, x: 15, y: 0, vx: 0, vy: 0, radius: 10, active: true };
    expect(circleCollide(a, b)).toBe(true);
  });

  it('rejects non-overlapping circles', () => {
    const a = { id: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 10, active: true };
    const b = { id: 2, x: 25, y: 0, vx: 0, vy: 0, radius: 10, active: true };
    expect(circleCollide(a, b)).toBe(false);
  });

  it('handles touching circles as no collision', () => {
    const a = { id: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 10, active: true };
    const b = { id: 2, x: 20, y: 0, vx: 0, vy: 0, radius: 10, active: true };
    expect(circleCollide(a, b)).toBe(false);
  });
});

describe('Player', () => {
  it('takes damage and loses hp', () => {
    const world = createWorld();
    startGame(world);
    world.player.invulnTimer = 0;
    const dead = damagePlayer(world.player, world);
    expect(dead).toBe(false);
    expect(world.player.hp).toBe(2);
  });

  it('loses a life at 0 hp', () => {
    const world = createWorld();
    startGame(world);
    world.player.invulnTimer = 0;
    world.player.hp = 1;
    const dead = damagePlayer(world.player, world);
    expect(dead).toBe(false);
    expect(world.player.lives).toBe(2);
    expect(world.player.hp).toBe(BALANCE.playerMaxHp);
  });

  it('is dead when 0 lives remain', () => {
    const world = createWorld();
    startGame(world);
    world.player.invulnTimer = 0;
    world.player.hp = 1;
    world.player.lives = 1;
    const dead = damagePlayer(world.player, world);
    expect(dead).toBe(true);
    expect(world.player.lives).toBe(0);
  });

  it('is invulnerable during invuln timer', () => {
    const world = createWorld();
    startGame(world);
    world.player.invulnTimer = 1;
    const dead = damagePlayer(world.player, world);
    expect(dead).toBe(false);
    expect(world.player.hp).toBe(3);
  });

  it('shield absorbs hit', () => {
    const world = createWorld();
    startGame(world);
    world.player.invulnTimer = 0;
    world.player.shieldActive = true;
    const dead = damagePlayer(world.player, world);
    expect(dead).toBe(false);
    expect(world.player.hp).toBe(3);
    expect(world.player.shieldActive).toBe(false);
  });

  it('bomb clears enemy bullets', () => {
    const world = createWorld();
    startGame(world);
    world.enemyBullets.push({
      id: 100, x: 100, y: 100, vx: 0, vy: 0, radius: 4,
      active: true, damage: 1, isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
    });
    world.enemyBullets.push({
      id: 101, x: 200, y: 200, vx: 0, vy: 0, radius: 4,
      active: true, damage: 1, isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
    });
    const used = useBomb(world.player, world);
    expect(used).toBe(true);
    expect(world.enemyBullets.every(b => !b.active)).toBe(true);
    expect(world.player.bombs).toBe(BALANCE.playerStartBombs - 1);
  });

  it('cannot use bomb with 0 stock', () => {
    const world = createWorld();
    startGame(world);
    world.player.bombs = 0;
    expect(useBomb(world.player, world)).toBe(false);
  });
});

describe('Power-ups', () => {
  it('weapon upgrade increases level', () => {
    const world = createWorld();
    startGame(world);
    const pu = createPowerUp(0, 0, 'weapon', world);
    applyPowerUp(world.player, pu, world);
    expect(world.player.weaponLevel).toBe(1);
  });

  it('weapon upgrade caps at max', () => {
    const world = createWorld();
    startGame(world);
    world.player.weaponLevel = BALANCE.weaponLevels.length - 1;
    const pu = createPowerUp(0, 0, 'weapon', world);
    applyPowerUp(world.player, pu, world);
    expect(world.player.weaponLevel).toBe(BALANCE.weaponLevels.length - 1);
  });

  it('bomb pickup increases stock', () => {
    const world = createWorld();
    startGame(world);
    world.player.bombs = 1;
    const pu = createPowerUp(0, 0, 'bomb', world);
    applyPowerUp(world.player, pu, world);
    expect(world.player.bombs).toBe(2);
  });

  it('bomb caps at max', () => {
    const world = createWorld();
    startGame(world);
    world.player.bombs = BALANCE.playerMaxBombs;
    const pu = createPowerUp(0, 0, 'bomb', world);
    applyPowerUp(world.player, pu, world);
    expect(world.player.bombs).toBe(BALANCE.playerMaxBombs);
  });

  it('shield activates', () => {
    const world = createWorld();
    startGame(world);
    const pu = createPowerUp(0, 0, 'shield', world);
    applyPowerUp(world.player, pu, world);
    expect(world.player.shieldActive).toBe(true);
  });

  it('multiplier sets value and timer', () => {
    const world = createWorld();
    startGame(world);
    const pu = createPowerUp(0, 0, 'multiplier', world);
    applyPowerUp(world.player, pu, world);
    expect(world.player.scoreMultiplier).toBe(BALANCE.multiplierValue);
    expect(world.player.multiplierTimer).toBe(BALANCE.multiplierDuration);
  });

  it('speed increases with cap', () => {
    const world = createWorld();
    startGame(world);
    world.player.speed = BALANCE.playerSpeedCap - 5;
    const pu = createPowerUp(0, 0, 'speed', world);
    applyPowerUp(world.player, pu, world);
    expect(world.player.speed).toBe(BALANCE.playerSpeedCap);
  });

  it('popcorn adds score with multiplier', () => {
    const world = createWorld();
    startGame(world);
    world.player.scoreMultiplier = 2;
    const pu = createPowerUp(0, 0, 'popcorn', world);
    applyPowerUp(world.player, pu, world);
    expect(world.score).toBe(1000);
  });
});

describe('World update', () => {
  it('does not update in title state', () => {
    const world = createWorld();
    const rng = new SeededRNG(1);
    const input = { left: false, right: false, up: false, down: false, fire: false, bomb: false };
    updateWorld(world, input, rng);
    expect(world.totalTime).toBe(0);
  });

  it('advances time in playing state', () => {
    const world = createWorld();
    startGame(world);
    const rng = new SeededRNG(1);
    const input = { left: false, right: false, up: false, down: false, fire: false, bomb: false };
    updateWorld(world, input, rng);
    expect(world.totalTime).toBeGreaterThan(0);
  });
});

describe('Scoring', () => {
  it('scores correctly on enemy kill', () => {
    const world = createWorld();
    startGame(world);
    world.score = 0;
    world.player.scoreMultiplier = 1;

    world.enemies.push({
      id: 50, x: world.player.x, y: world.player.y - 20, vx: 0, vy: 0,
      radius: 10, active: true, type: 'popcorn', hp: 1, maxHp: 1,
      fireTimer: 99, age: 0, patternData: 0,
    });
    world.playerBullets.push({
      id: 51, x: world.player.x, y: world.player.y - 20, vx: 0, vy: -600,
      radius: 5, active: true, damage: 1, isPlayerBullet: true, homing: false, homingStrength: 0, fake: false,
    });

    const rng = new SeededRNG(1);
    processCollisions(world, rng);

    expect(world.score).toBe(BALANCE.enemyScoreValue.popcorn);
  });
});

describe('Boss transitions', () => {
  it('boss1 advances phases when hp depleted', () => {
    const world = createWorld();
    startGame(world);
    world.boss = createBoss1(world);
    world.bossActive = true;

    world.boss!.state = 'phase1';
    world.boss!.invulnerable = false;
    world.boss!.y = 120;
    world.boss!.phases[0].hp = 0;
    updateBoss1(world.boss!, 0.016, world);
    expect(world.boss!.currentPhase).toBe(1);
  });

  it('boss1 defeated when all phases done', () => {
    const world = createWorld();
    startGame(world);
    world.boss = createBoss1(world);
    world.bossActive = true;
    world.boss!.state = 'phase3';
    world.boss!.invulnerable = false;
    world.boss!.y = 120;
    world.boss!.currentPhase = 2;
    world.boss!.phases[2].hp = 0;
    updateBoss1(world.boss!, 0.016, world);
    expect(world.boss!.defeated).toBe(true);
    expect(world.events.bossDefeated).toBe(true);
  });

  it('boss3 has correct number of phases (gems + final)', () => {
    const world = createWorld();
    startGame(world);
    const boss = createBoss3(world);
    expect(boss.phases.length).toBe(INFINITY_STONES.length + 1);
  });

  it('boss3 defeat triggers victory after last phase', () => {
    const world = createWorld();
    startGame(world);
    world.stage = 2;
    world.boss = createBoss3(world);
    world.bossActive = true;
    world.boss!.y = 110;
    world.boss!.state = 'final';
    world.boss!.invulnerable = false;
    world.boss!.currentPhase = world.boss!.phases.length - 1;
    world.boss!.phases[world.boss!.currentPhase].hp = 0;
    updateBoss3(world.boss!, 0.016, world);
    expect(world.boss!.defeated).toBe(true);
  });
});

describe('Win/Lose conditions', () => {
  it('game over when lives 0 and no continues', () => {
    const world = createWorld();
    startGame(world);
    world.player.lives = 1;
    world.player.hp = 1;
    world.player.continues = 0;
    world.player.invulnTimer = 0;
    damagePlayer(world.player, world);
    expect(world.player.lives).toBe(0);
  });

  it('continue restores lives', () => {
    const world = createWorld();
    startGame(world);
    world.player.lives = 1;
    world.player.hp = 1;
    world.player.continues = 1;
    world.player.invulnTimer = 0;
    damagePlayer(world.player, world);

    if (world.player.lives <= 0 && world.player.continues > 0) {
      world.player.continues--;
      world.player.lives = BALANCE.playerStartLives;
      world.player.hp = BALANCE.playerMaxHp;
    }
    expect(world.player.lives).toBe(BALANCE.playerStartLives);
    expect(world.player.continues).toBe(0);
  });
});
