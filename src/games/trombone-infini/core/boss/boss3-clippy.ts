import type { Boss, World, BossPhase } from '../types';
import { BALANCE, getBossHp, WORLD_W, INFINITY_STONES } from '../balance';
import type { StoneName } from '../balance';
import { createEnemy } from '../entities/enemy';

export function createBoss3(world: World): Boss {
  const phases: BossPhase[] = INFINITY_STONES.map((stone, i) => ({
    name: stoneDisplayName(stone),
    hp: getBossHp(BALANCE.boss3GemHp, world.difficulty),
    maxHp: getBossHp(BALANCE.boss3GemHp, world.difficulty),
    timer: 0,
    index: i,
  }));
  phases.push({
    name: 'Trombone Pathétique',
    hp: getBossHp(BALANCE.boss3FinalPhaseHp, world.difficulty),
    maxHp: getBossHp(BALANCE.boss3FinalPhaseHp, world.difficulty),
    timer: 0,
    index: INFINITY_STONES.length,
  });

  const totalHp = phases.reduce((s, p) => s + p.hp, 0);

  return {
    id: world.nextEntityId++,
    x: WORLD_W / 2,
    y: -100,
    vx: 0, vy: 0,
    radius: 55,
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
    subEntities: [],
  };
}

function stoneDisplayName(s: StoneName): string {
  const map: Record<StoneName, string> = {
    space: 'Pierre d\'Espace', mind: 'Pierre d\'Esprit', reality: 'Pierre de Réalité',
    power: 'Pierre de Pouvoir', time: 'Pierre du Temps', soul: 'Pierre d\'Âme',
  };
  return map[s];
}

export function updateBoss3(boss: Boss, dt: number, world: World): void {
  boss.phaseTimer += dt;
  boss.fireTimer -= dt;
  boss.stateTimer -= dt;

  if (boss.state === 'entering') {
    boss.y += 40 * dt;
    if (boss.y >= 110) {
      boss.y = 110;
      boss.state = 'gem0';
      boss.invulnerable = false;
      world.events.bossPhaseChange = 0;
      world.events.texts.push({ text: 'CLIPPY, MAÎTRE DU GANT', x: world.width / 2, y: world.height / 2, duration: 2.5 });
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
      world.events.screenShake = 1.5;
      world.events.explosions.push({ x: boss.x, y: boss.y });
      world.score += 50000 * world.player.scoreMultiplier;
      return;
    }
    const nextPhase = boss.phases[boss.currentPhase];
    boss.state = boss.currentPhase < INFINITY_STONES.length ? `gem${boss.currentPhase}` : 'final';
    boss.stateTimer = 0;
    boss.phaseTimer = 0;
    boss.invulnerable = false;
    world.events.bossPhaseChange = boss.currentPhase;
    world.events.screenShake = 0.5;
    world.events.texts.push({
      text: nextPhase.name,
      x: world.width / 2, y: world.height / 2, duration: 1.5,
    });
    return;
  }

  const targetX = world.width / 2 + Math.sin(boss.phaseTimer * 0.6) * 120;
  boss.x += (targetX - boss.x) * 3 * dt;
  const yOscil = 110 + Math.sin(boss.phaseTimer * 0.4) * 20;
  boss.y += (yOscil - boss.y) * 2 * dt;
  boss.x = Math.max(60, Math.min(world.width - 60, boss.x));

  if (boss.currentPhase < INFINITY_STONES.length) {
    const stone = INFINITY_STONES[boss.currentPhase];
    switch (stone) {
      case 'space': updateStoneSpace(boss, dt, world); break;
      case 'mind': updateStoneMind(boss, dt, world); break;
      case 'reality': updateStoneReality(boss, dt, world); break;
      case 'power': updateStonePower(boss, dt, world); break;
      case 'time': updateStoneTime(boss, dt, world); break;
      case 'soul': updateStoneSoul(boss, dt, world); break;
    }
  } else {
    updateFinalPhase(boss, dt, world);
  }
}

function updateStoneSpace(boss: Boss, dt: number, world: World): void {
  if (boss.stateTimer <= 0) {
    boss.stateTimer = 2;
    boss.x = 60 + Math.random() * (world.width - 120);
    boss.y = 60 + Math.random() * 120;
    world.events.screenShake = 0.2;
  }
  if (boss.fireTimer <= 0) {
    boss.fireTimer = BALANCE.boss3FireRate;
    const speed = 170;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + boss.phaseTimer;
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: boss.x, y: boss.y + 40,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: 4, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
      });
    }
  }
}

function updateStoneMind(boss: Boss, dt: number, world: World): void {
  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.5;
    const dx = world.player.x - boss.x;
    const dy = world.player.y - boss.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    world.enemyBullets.push({
      id: world.nextEntityId++,
      x: boss.x, y: boss.y + 40,
      vx: (dx / len) * 100, vy: (dy / len) * 100,
      radius: 6, active: true, damage: 1,
      isPlayerBullet: false, homing: true, homingStrength: 80, fake: false,
    });
  }
}

function updateStoneReality(boss: Boss, dt: number, world: World): void {
  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.25;
    const speed = 160;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + boss.phaseTimer * 1.5;
      const isFake = i % 3 === 0;
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: boss.x, y: boss.y + 30,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: isFake ? 5 : 4, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: isFake,
      });
    }
  }
}

function updateStonePower(boss: Boss, dt: number, world: World): void {
  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.8;
    const dx = world.player.x - boss.x;
    const dy = world.player.y - boss.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    for (let i = -3; i <= 3; i++) {
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: boss.x + i * 12, y: boss.y + 50,
        vx: (dx / len) * 130 + i * 15,
        vy: (dy / len) * 130,
        radius: 8, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
      });
    }
    world.events.screenShake = 0.3;
  }
}

function updateStoneTime(boss: Boss, dt: number, world: World): void {
  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.35;
    const speed = 150;
    const count = 6;
    const baseAngle = boss.phaseTimer * 2;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i / count) * Math.PI * 2;
      const timePhase = Math.sin(boss.phaseTimer * 3);
      const actualSpeed = speed * (0.5 + 0.5 * Math.abs(timePhase));
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: boss.x, y: boss.y + 30,
        vx: Math.cos(angle) * actualSpeed, vy: Math.sin(angle) * actualSpeed,
        radius: 4, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
      });
    }
  }
}

function updateStoneSoul(boss: Boss, dt: number, world: World): void {
  if (boss.stateTimer <= 0) {
    boss.stateTimer = 3;
    const types = ['popcorn', 'weaver'] as const;
    for (let i = 0; i < 3; i++) {
      const t = types[i % 2];
      const x = 60 + Math.random() * (world.width - 120);
      createEnemy(t, x, -20, 0, 80, world.difficulty, world);
      world.enemies.push(createEnemy(t, x, -20, 0, 80, world.difficulty, world));
    }
  }
  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.4;
    const speed = 150;
    const dx = world.player.x - boss.x;
    const dy = world.player.y - boss.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    world.enemyBullets.push({
      id: world.nextEntityId++,
      x: boss.x, y: boss.y + 40,
      vx: (dx / len) * speed, vy: (dy / len) * speed,
      radius: 5, active: true, damage: 1,
      isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
    });
  }
}

function updateFinalPhase(boss: Boss, dt: number, world: World): void {
  boss.invulnerable = false;
  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.5;
    const dx = world.player.x - boss.x;
    const dy = world.player.y - boss.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    world.enemyBullets.push({
      id: world.nextEntityId++,
      x: boss.x, y: boss.y + 40,
      vx: (dx / len) * 120, vy: (dy / len) * 120,
      radius: 4, active: true, damage: 1,
      isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
    });
  }
}
