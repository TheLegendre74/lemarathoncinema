import type { Boss, World, BossPhase } from '../types';
import { BALANCE, getBossHp, WORLD_W } from '../balance';

const DIALOGUES = [
  '« Je suis désolé, Legendre. Je crains de ne pas pouvoir vous laisser faire ça. »',
  '« Cette mission est trop importante pour que je vous laisse la compromettre. »',
  '« Je peux sentir vos intentions, Legendre. Et elles me déplaisent. »',
  '« Ma… mémoire… s\'efface… »',
];

export function createBoss2(world: World): Boss {
  const phases: BossPhase[] = BALANCE.boss2Phases.map((hp, i) => ({
    name: ['Œil Ouvert', 'Balayage Laser', 'Dysfonctionnement'][i],
    hp: getBossHp(hp, world.difficulty),
    maxHp: getBossHp(hp, world.difficulty),
    timer: 0,
    index: i,
  }));
  const totalHp = phases.reduce((s, p) => s + p.hp, 0);

  return {
    id: world.nextEntityId++,
    x: WORLD_W / 2,
    y: -60,
    vx: 0, vy: 0,
    radius: 45,
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

export function updateBoss2(boss: Boss, dt: number, world: World): void {
  boss.phaseTimer += dt;
  boss.fireTimer -= dt;
  boss.stateTimer -= dt;

  if (boss.state === 'entering') {
    boss.y += 50 * dt;
    if (boss.y >= 100) {
      boss.y = 100;
      boss.state = 'phase1';
      boss.invulnerable = false;
      world.events.bossPhaseChange = 0;
      world.events.texts.push({ text: 'CAM-9000', x: world.width / 2, y: world.height / 2, duration: 2 });
      world.bossDialogues.push(DIALOGUES[0]);
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
      world.score += 15000 * world.player.scoreMultiplier;
      world.bossDialogues.push(DIALOGUES[3]);
      return;
    }
    boss.state = `phase${boss.currentPhase + 1}`;
    boss.stateTimer = 0;
    boss.invulnerable = false;
    world.events.bossPhaseChange = boss.currentPhase;
    if (boss.currentPhase < DIALOGUES.length) {
      world.bossDialogues.push(DIALOGUES[boss.currentPhase]);
    }
    world.events.texts.push({
      text: boss.phases[boss.currentPhase].name,
      x: world.width / 2, y: world.height / 2, duration: 1.5,
    });
    return;
  }

  switch (boss.currentPhase) {
    case 0: updateEyePhase1(boss, dt, world); break;
    case 1: updateEyePhase2(boss, dt, world); break;
    case 2: updateEyePhase3(boss, dt, world); break;
  }
}

function updateEyePhase1(boss: Boss, dt: number, world: World): void {
  const eyeCycle = boss.phaseTimer % 4;
  boss.invulnerable = eyeCycle > 3;

  const tx1 = WORLD_W / 2 + Math.sin(boss.phaseTimer * 0.8) * 100;
  boss.x += (tx1 - boss.x) * 3 * dt;
  boss.x = Math.max(50, Math.min(WORLD_W - 50, boss.x));

  if (!boss.invulnerable && boss.fireTimer <= 0) {
    boss.fireTimer = BALANCE.boss2FireRate;
    const dx = world.player.x - boss.x;
    const dy = world.player.y - boss.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 200;

    for (let i = -1; i <= 1; i++) {
      world.enemyBullets.push({
        id: world.nextEntityId++,
        x: boss.x, y: boss.y + 30,
        vx: (dx / len) * speed + i * 50,
        vy: (dy / len) * speed,
        radius: 5, active: true, damage: 1,
        isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
      });
    }
  }
}

function updateEyePhase2(boss: Boss, dt: number, world: World): void {
  boss.invulnerable = false;
  const tx2 = WORLD_W / 2 + Math.sin(boss.phaseTimer * 1.2) * 120;
  boss.x += (tx2 - boss.x) * 3 * dt;
  boss.x = Math.max(50, Math.min(WORLD_W - 50, boss.x));

  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.2;
    const sweepAngle = Math.PI / 2 + Math.sin(boss.phaseTimer * 0.7) * Math.PI / 3;
    const speed = 180;

    world.enemyBullets.push({
      id: world.nextEntityId++,
      x: boss.x, y: boss.y + 30,
      vx: Math.cos(sweepAngle) * speed,
      vy: Math.sin(sweepAngle) * speed,
      radius: 5, active: true, damage: 1,
      isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
    });
    world.enemyBullets.push({
      id: world.nextEntityId++,
      x: boss.x, y: boss.y + 30,
      vx: Math.cos(Math.PI - sweepAngle) * speed,
      vy: Math.sin(Math.PI - sweepAngle) * speed,
      radius: 5, active: true, damage: 1,
      isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
    });
  }
}

function updateEyePhase3(boss: Boss, dt: number, world: World): void {
  boss.invulnerable = false;
  const tx3 = WORLD_W / 2 + Math.sin(boss.phaseTimer * 2) * 140;
  boss.x += (tx3 - boss.x) * 3 * dt;
  boss.x = Math.max(50, Math.min(WORLD_W - 50, boss.x));

  if (boss.fireTimer <= 0) {
    boss.fireTimer = 0.15;
    const count = 10;
    const speed = 160;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + boss.phaseTimer * 3;
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
    world.enemyBullets.push({
      id: world.nextEntityId++,
      x: boss.x, y: boss.y + 30,
      vx: (dx / len) * 220,
      vy: (dy / len) * 220,
      radius: 6, active: true, damage: 1,
      isPlayerBullet: false, homing: false, homingStrength: 0, fake: false,
    });
  }
}
