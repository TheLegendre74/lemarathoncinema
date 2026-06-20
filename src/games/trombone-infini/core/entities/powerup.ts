import type { PowerUp, PowerUpType, World, Player } from '../types';
import { BALANCE } from '../balance';
import type { SeededRNG } from '../rng';

export function createPowerUp(x: number, y: number, type: PowerUpType, world: World): PowerUp {
  const valueMap: Record<PowerUpType, number> = {
    weapon: 1, bomb: 1, speed: 20, shield: 1, popcorn: 500, multiplier: BALANCE.multiplierValue,
  };
  return {
    id: world.nextEntityId++,
    x, y,
    vx: 0,
    vy: BALANCE.powerUpFallSpeed,
    radius: 10,
    active: true,
    type,
    value: valueMap[type],
  };
}

export function rollPowerUpDrop(x: number, y: number, rng: SeededRNG, world: World): void {
  if (!rng.chance(BALANCE.powerUpDropRate)) return;

  const roll = rng.next();
  let type: PowerUpType;
  if (roll < 0.3) type = 'popcorn';
  else if (roll < 0.5) type = 'weapon';
  else if (roll < 0.65) type = 'bomb';
  else if (roll < 0.8) type = 'speed';
  else if (roll < 0.9) type = 'shield';
  else type = 'multiplier';

  world.powerUps.push(createPowerUp(x, y, type, world));
}

export function applyPowerUp(p: Player, pu: PowerUp, world: World): void {
  world.events.powerUpCollected.push(pu.type);

  switch (pu.type) {
    case 'weapon':
      if (p.weaponLevel < BALANCE.weaponLevels.length - 1) {
        p.weaponLevel++;
      }
      world.score += 100 * p.scoreMultiplier;
      break;
    case 'bomb':
      p.bombs = Math.min(p.bombs + 1, BALANCE.playerMaxBombs);
      break;
    case 'speed':
      p.speed = Math.min(p.speed + pu.value, BALANCE.playerSpeedCap);
      break;
    case 'shield':
      p.shieldActive = true;
      break;
    case 'popcorn':
      world.score += pu.value * p.scoreMultiplier;
      break;
    case 'multiplier':
      p.scoreMultiplier = pu.value;
      p.multiplierTimer = BALANCE.multiplierDuration;
      break;
  }
}

export function updatePowerUp(pu: PowerUp, dt: number, world: World): void {
  pu.y += pu.vy * dt;
  if (pu.y > world.height + 20) pu.active = false;
}
