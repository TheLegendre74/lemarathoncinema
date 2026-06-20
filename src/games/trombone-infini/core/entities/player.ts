import type { Player, Input, World, Bullet } from '../types';
import { BALANCE, WORLD_W, WORLD_H } from '../balance';

export function createPlayer(): Player {
  return {
    id: 0,
    x: WORLD_W / 2,
    y: WORLD_H - 80,
    vx: 0,
    vy: 0,
    radius: BALANCE.playerHitboxRadius,
    active: true,
    hp: BALANCE.playerMaxHp,
    maxHp: BALANCE.playerMaxHp,
    lives: BALANCE.playerStartLives,
    weaponLevel: 0,
    bombs: BALANCE.playerStartBombs,
    speed: BALANCE.playerSpeed,
    invulnTimer: 0,
    shieldActive: false,
    scoreMultiplier: 1,
    multiplierTimer: 0,
    continues: BALANCE.playerContinues,
    firing: true,
    fireTimer: 0,
  };
}

export function updatePlayer(p: Player, input: Input, dt: number, world: World): void {
  let dx = 0, dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  p.x += dx * p.speed * dt;
  p.y += dy * p.speed * dt;

  const margin = BALANCE.playerSpriteRadius;
  p.x = Math.max(margin, Math.min(world.width - margin, p.x));
  p.y = Math.max(margin, Math.min(world.height - margin, p.y));

  if (p.invulnTimer > 0) p.invulnTimer -= dt;
  if (p.multiplierTimer > 0) {
    p.multiplierTimer -= dt;
    if (p.multiplierTimer <= 0) p.scoreMultiplier = 1;
  }

  p.fireTimer -= dt;
  if ((input.fire || p.firing) && p.fireTimer <= 0) {
    firePlayerWeapon(p, world);
  }
}

function firePlayerWeapon(p: Player, world: World): void {
  const wl = BALANCE.weaponLevels[p.weaponLevel];
  p.fireTimer = 1 / wl.fireRate;

  const speed = BALANCE.playerBulletSpeed;
  const dmg = BALANCE.playerBulletDamage;
  const count = wl.bullets;
  const spread = wl.spread;

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i - (count - 1) / 2) * spread;
    const b: Bullet = {
      id: world.nextEntityId++,
      x: p.x,
      y: p.y - 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 3,
      active: true,
      damage: dmg,
      isPlayerBullet: true,
      homing: false,
      homingStrength: 0,
      fake: false,
    };
    world.playerBullets.push(b);
  }

  if (wl.side) {
    for (const sx of [-1, 1]) {
      const b: Bullet = {
        id: world.nextEntityId++,
        x: p.x + sx * 20,
        y: p.y,
        vx: sx * speed * 0.3,
        vy: -speed * 0.8,
        radius: 3,
        active: true,
        damage: dmg,
        isPlayerBullet: true,
        homing: false,
        homingStrength: 0,
        fake: false,
      };
      world.playerBullets.push(b);
    }
  }
}

export function damagePlayer(p: Player, world: World): boolean {
  if (p.invulnTimer > 0) return false;
  if (p.shieldActive) {
    p.shieldActive = false;
    p.invulnTimer = 0.5;
    return false;
  }

  p.hp--;
  world.events.playerHit = true;
  world.events.screenShake = 0.3;

  if (p.hp <= 0) {
    p.lives--;
    world.events.playerDeath = true;
    world.events.screenShake = 0.5;
    if (p.lives > 0) {
      p.hp = p.maxHp;
      p.x = world.width / 2;
      p.y = world.height - 80;
      p.invulnTimer = BALANCE.playerInvulnTime;
      if (p.weaponLevel > 0) p.weaponLevel--;
    }
    return p.lives <= 0;
  }

  p.invulnTimer = 1.0;
  return false;
}

export function useBomb(p: Player, world: World): boolean {
  if (p.bombs <= 0) return false;
  p.bombs--;
  p.invulnTimer = BALANCE.bombIFrames;

  for (const b of world.enemyBullets) b.active = false;
  for (const e of world.enemies) {
    e.hp -= BALANCE.bombDamage;
  }
  if (world.boss && !world.boss.invulnerable) {
    const phase = world.boss.phases[world.boss.currentPhase];
    if (phase) phase.hp -= BALANCE.bombDamage;
  }

  world.events.screenShake = 0.6;
  world.events.explosions.push({ x: world.width / 2, y: world.height / 2 });
  return true;
}
