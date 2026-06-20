import type { Boss, World, Bullet, BossPhase } from '../types';
import { BALANCE, getBossHp, WORLD_W } from '../balance';

export function createBoss1(world: World): Boss {
  const phases: BossPhase[] = BALANCE.boss1Phases.map((hp, i) => ({
    name: ['Tourelles', 'Supralaser', 'Réacteur'][i],
    hp: getBossHp(hp, world.difficulty),
    maxHp: getBossHp(hp, world.difficulty),
    timer: 0,
    index: i,
  }));

  const totalHp = phases.reduce((s, p) => s + p.hp, 0);

  const turrets: Array<{ id: number; x: number; y: number; vx: number; vy: number; radius: number; active: boolean }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    turrets.push({
      id: world.nextEntityId++,
      x: WORLD_W / 2 + Math.cos(angle) * 60,
      y: 120 + Math.sin(angle) * 30,
      vx: 0, vy: 0,
      radius: 12,
      active: true,
    });
  }

  return {
    id: world.nextEntityId++,
    x: WORLD_W / 2,
    y: -80,
    vx: 0, vy: 0,
    radius: 50,
    active: true,
    phases,
    currentPhase: 0,
    totalHp,
    maxTotalHp: totalHp,
    phaseTimer: 0,
    fireTimer: 0,
    stateTimer: 0,
    state: 'entering',
    defeated: false,
    invulnerable: true,
    subEntities: turrets,
  };
}

export function updateBoss1(boss: Boss, dt: number, world: World): void {
  boss.phaseTimer += dt;
  boss.fireTimer -= dt;
  boss.stateTimer -= dt;

  if (boss.state === 'entering') {
    boss.y += 60 * dt;
    if (boss.y >= 120) {
      boss.y = 120;
      boss.state = 'phase1';
      boss.invulnerable = false;
      world.events.bossPhaseChange = 0;
      world.events.texts.push({ text: 'LA STATION SOMBRE', x: world.width / 2, y: world.height / 2, duration: 2 });
    }
    return;
  }

  const phase = boss.phases[boss.currentPhase];
  if (!phase) return;

  if (phase.hp <= 0) {
    boss.currentPhase++;
    if (boss.currentPhase >= boss.phases.length) {
      boss.defeated = true;
      boss.active = false;
      world.events.bossDefeated = true;
      world.events.screenShake = 1;
      world.events.explosions.push({ x: boss.x, y: boss.y });
      world.score += 10000 * world.player.scoreMultiplier;
      return;
    }
    boss.state = `phase${boss.currentPhase + 1}`;
    boss.stateTimer = 0;
    boss.invulnerable = false;
    world.events.bossPhaseChange = boss.currentPhase;
    world.events.texts.push({
      text: boss.phases[boss.currentPhase].name,
      x: world.width / 2, y: world.height / 2, duration: 1.5,
    });
    return;
  }

  const targetX = WORLD_W / 2 + Math.sin(boss.phaseTimer * 0.5) * 80;
  boss.x += (targetX - boss.x) * 3 * dt;
  boss.x = Math.max(60, Math.min(WORLD_W - 60, boss.x));

  for (const t of boss.subEntities) {
    if (!t.active) continue;
    const angle = (boss.subEntities.indexOf(t) / 6) * Math.PI * 2 + boss.phaseTimer * 0.3;
    t.x = boss.x + Math.cos(angle) * 60;
    t.y = boss.y + Math.sin(angle) * 30;
  }

  switch (boss.currentPhase) {
    case 0: updatePhase1(boss, dt, world); break;
    case 1: updatePhase2(boss, dt, world); break;
    case 2: updatePhase3(boss, dt, world); break;
  }
}

function updatePhase1(boss: Boss, dt: number, world: World): void {
  if (boss.fireTimer <= 0) {
    boss.fireTimer = BALANCE.boss1FireRate;
    for (const t of boss.subEntities) {
      if (!t.active) continue;
      const dx = world.player.x - t.x;
      const dy = world.player.y - t.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 160;
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: t.x, y: t.y,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: 4, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
      });
    }
  }
}

function updatePhase2(boss: Boss, dt: number, world: World): void {
  const cycle = boss.phaseTimer % 5;
  if (cycle < 1.2) {
    boss.invulnerable = true;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = 0.15;
      for (let i = -2; i <= 2; i++) {
        world.enemyBullets.push({
          id: world.nextEntityId++,
          x: boss.x + i * 15, y: boss.y + 40,
          vx: i * 30, vy: 250,
          radius: 5, active: true, damage: 1,
          isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
        });
      }
    }
  } else {
    boss.invulnerable = false;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = 0.5;
      const speed = 140;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + boss.phaseTimer;
        world.enemyBullets.push({
          id: world.nextEntityId++,
          x: boss.x, y: boss.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 4, active: true, damage: 1,
          isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
        });
      }
    }
  }
}

function updatePhase3(boss: Boss, dt: number, world: World): void {
  boss.invulnerable = false;
  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.3;
    const speed = 170;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + boss.phaseTimer * 2;
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: boss.x, y: boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
      });
    }
    const dx = world.player.x - boss.x;
    const dy = world.player.y - boss.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    for (let i = -1; i <= 1; i++) {
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: boss.x, y: boss.y + 50,
        vx: (dx / len) * 200 + i * 40,
        vy: (dy / len) * 200,
        radius: 5, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
      });
    }
  }
}
