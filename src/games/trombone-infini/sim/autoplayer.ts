import type { World, Input } from '../core/types';

export function computeAutoInput(world: World): Input {
  const p = world.player;
  const input: Input = { left: false, right: false, up: false, down: false, fire: true, bomb: false };

  let dangerX = 0, dangerY = 0, dangerCount = 0;
  const scanRadius = 120;

  for (const b of world.enemyBullets) {
    if (!b.active) continue;
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < scanRadius) {
      const weight = 1 - dist / scanRadius;
      dangerX += dx * weight;
      dangerY += dy * weight;
      dangerCount++;
    }
  }

  for (const e of world.enemies) {
    if (!e.active) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < scanRadius * 1.5) {
      const weight = (1 - dist / (scanRadius * 1.5)) * 0.5;
      dangerX += dx * weight;
      dangerY += dy * weight;
      dangerCount++;
    }
  }

  if (dangerCount > 0) {
    if (dangerX > 10) input.left = true;
    else if (dangerX < -10) input.right = true;

    if (dangerY > 10) input.up = true;
    else if (dangerY < -10) input.down = true;
  }

  const margin = 60;
  if (p.x < margin) input.right = true;
  if (p.x > world.width - margin) input.left = true;
  if (p.y < margin * 2) input.down = true;
  if (p.y > world.height - margin) input.up = true;

  if (dangerCount > 5 && p.hp <= 1 && p.bombs > 0) {
    input.bomb = true;
  }
  if (dangerCount > 10 && p.bombs > 0) {
    input.bomb = true;
  }

  for (const pu of world.powerUps) {
    if (!pu.active) continue;
    const dx = pu.x - p.x;
    const dy = pu.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100 && dangerCount < 3) {
      if (dx > 15) input.right = true;
      else if (dx < -15) input.left = true;
      if (dy > 15) input.down = true;
      else if (dy < -15) input.up = true;
    }
  }

  return input;
}
