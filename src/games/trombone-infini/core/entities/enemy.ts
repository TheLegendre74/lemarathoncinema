import type { Enemy, EnemyType, World, Bullet } from '../types';
import { BALANCE, getEnemyHp, getEnemyBulletSpeed } from '../balance';
import type { Difficulty } from '../types';

export function createEnemy(
  type: EnemyType,
  x: number,
  y: number,
  vx: number,
  vy: number,
  difficulty: Difficulty,
  world: World
): Enemy {
  const hp = getEnemyHp(type, difficulty);
  const radiusMap: Record<EnemyType, number> = {
    popcorn: 10, weaver: 12, turret: 14, bomber: 18, miniboss: 28,
  };
  return {
    id: world.nextEntityId++,
    x, y, vx, vy,
    radius: radiusMap[type],
    active: true,
    type,
    hp,
    maxHp: hp,
    fireTimer: 2 + Math.random() * 2,
    age: 0,
    patternData: 0,
  };
}

export function updateEnemy(e: Enemy, dt: number, world: World): void {
  e.age += dt;

  switch (e.type) {
    case 'popcorn':
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      break;
    case 'weaver':
      e.x += Math.sin(e.age * 3) * 100 * dt + e.vx * dt;
      e.y += e.vy * dt;
      break;
    case 'turret':
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y > 100) { e.vy = 5; }
      break;
    case 'bomber':
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      break;
    case 'miniboss':
      e.x += Math.sin(e.age * 1.5) * 60 * dt;
      e.y += e.vy * dt;
      if (e.y > 120) e.vy = 3;
      break;
  }

  if (e.y > world.height + 50 || e.x < -50 || e.x > world.width + 50 || e.age > 30) {
    e.active = false;
    return;
  }

  const fireRate = BALANCE.enemyFireRate[e.type] ?? 0;
  if (fireRate > 0) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 1 / (fireRate * (world.difficulty === 'hard' ? BALANCE.hardMul.enemyFireRateMul : 1));
      fireEnemyBullet(e, world);
    }
  }
}

function fireEnemyBullet(e: Enemy, world: World): void {
  const p = world.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const speed = getEnemyBulletSpeed(world.difficulty);

  if (e.type === 'bomber') {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: e.x, y: e.y,
        vx: Math.cos(angle) * speed * 0.8,
        vy: Math.sin(angle) * speed * 0.8,
        radius: 4,
        active: true,
        damage: 1,
        isPlayerBullet: false,
        homing: false,
        homingStrength: 0,
        fake: false,
      });
    }
  } else {
    world.enemyBullets.push({
      id: world.nextEntityId++,
      x: e.x, y: e.y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      radius: 4,
      active: true,
      damage: 1,
      isPlayerBullet: false,
      homing: false,
      homingStrength: 0,
      fake: false,
    });
  }
}
