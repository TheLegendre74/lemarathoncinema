import type { Entity, World } from '../types';
import { damagePlayer } from '../entities/player';
import { applyPowerUp } from '../entities/powerup';
import { rollPowerUpDrop } from '../entities/powerup';
import { BALANCE } from '../balance';
import type { SeededRNG } from '../rng';

export function circleCollide(a: Entity, b: Entity): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = dx * dx + dy * dy;
  const rSum = a.radius + b.radius;
  return dist < rSum * rSum;
}

export function processCollisions(world: World, rng: SeededRNG): void {
  const { player, enemies, playerBullets, enemyBullets, powerUps } = world;

  for (const b of playerBullets) {
    if (!b.active) continue;

    for (const e of enemies) {
      if (!e.active) continue;
      if (circleCollide(b, e)) {
        b.active = false;
        e.hp -= b.damage;
        if (e.hp <= 0) {
          e.active = false;
          world.score += (BALANCE.enemyScoreValue[e.type] ?? 100) * player.scoreMultiplier;
          world.events.explosions.push({ x: e.x, y: e.y });
          rollPowerUpDrop(e.x, e.y, rng, world);
        }
        break;
      }
    }

    if (!b.active) continue;
    if (world.boss && world.bossActive && !world.boss.invulnerable) {
      const boss = world.boss;
      if (circleCollide(b, boss)) {
        b.active = false;
        const phase = boss.phases[boss.currentPhase];
        if (phase && phase.hp > 0) {
          phase.hp -= b.damage;
          boss.totalHp -= b.damage;
          if (boss.totalHp < 0) boss.totalHp = 0;
        }
      }

      for (const sub of boss.subEntities) {
        if (!sub.active) continue;
        if (circleCollide(b, sub)) {
          b.active = false;
          const phase = boss.phases[boss.currentPhase];
          if (phase && phase.hp > 0) {
            phase.hp -= b.damage;
            boss.totalHp -= b.damage;
            if (boss.totalHp < 0) boss.totalHp = 0;
          }
          break;
        }
      }
    }
  }

  for (const b of enemyBullets) {
    if (!b.active) continue;
    if (b.fake) continue;
    if (circleCollide(b, player)) {
      b.active = false;
      const dead = damagePlayer(player, world);
      if (dead && player.continues > 0) {
        player.continues--;
        player.lives = BALANCE.playerStartLives;
        player.hp = BALANCE.playerMaxHp;
        player.invulnTimer = BALANCE.playerInvulnTime;
        player.x = world.width / 2;
        player.y = world.height - 80;
      } else if (dead) {
        world.state = 'gameover';
      }
    }
  }

  for (const e of enemies) {
    if (!e.active) continue;
    if (circleCollide(e, player)) {
      const dead = damagePlayer(player, world);
      if (dead && player.continues > 0) {
        player.continues--;
        player.lives = BALANCE.playerStartLives;
        player.hp = BALANCE.playerMaxHp;
        player.invulnTimer = BALANCE.playerInvulnTime;
      } else if (dead) {
        world.state = 'gameover';
      }
    }
  }

  for (const pu of powerUps) {
    if (!pu.active) continue;
    if (circleCollide(pu, player)) {
      pu.active = false;
      applyPowerUp(player, pu, world);
    }
  }
}
