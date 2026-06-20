import { createWorld, startGame, updateWorld } from '../core/world';
import { SeededRNG } from '../core/rng';
import { FIXED_DT, BALANCE } from '../core/balance';
import { computeAutoInput } from './autoplayer';
import type { Difficulty } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';

interface SimResult {
  difficulty: Difficulty;
  totalTimeSec: number;
  stage1TimeSec: number;
  stage2TimeSec: number;
  stage3TimeSec: number;
  boss1KillTime: number;
  boss2KillTime: number;
  boss3KillTime: number;
  totalDeaths: number;
  finalScore: number;
  completed: boolean;
  softLock: boolean;
  nanDetected: boolean;
  maxEntities: number;
  bossesDefeated: number;
}

function runSim(difficulty: Difficulty, seed: number): SimResult {
  const rng = new SeededRNG(seed);
  const world = createWorld(difficulty, seed);
  startGame(world);

  let totalDeaths = 0;
  let stageStartTime = 0;
  const stageTimes: number[] = [0, 0, 0];
  const bossKillTimes: number[] = [0, 0, 0];
  let bossSpawnTime = 0;
  let maxEntities = 0;
  let lastStage = 0;
  let softLock = false;
  let nanDetected = false;
  let bossesDefeated = 0;

  const maxTicks = 30 * 60 * 120;
  let stuckCounter = 0;
  let lastBossHp = -1;

  world.player.continues = 99;

  for (let tick = 0; tick < maxTicks; tick++) {
    if (world.state !== 'playing') break;

    if (world.player.continues < 50) world.player.continues = 99;

    const input = computeAutoInput(world);
    const stageBefore = world.stage;
    updateWorld(world, input, rng);


    if (world.events.bossDefeated) {
      bossKillTimes[stageBefore] = world.totalTime - bossSpawnTime;
      bossSpawnTime = 0;
      lastBossHp = -1;
      stuckCounter = 0;
      bossesDefeated++;
    }

    if (world.stage !== lastStage) {
      stageTimes[lastStage] = world.totalTime - stageStartTime;
      stageStartTime = world.totalTime;
      lastStage = world.stage;
    }

    if (world.events.playerDeath) totalDeaths++;

    if (world.bossActive && world.boss) {
      if (bossSpawnTime === 0) bossSpawnTime = world.totalTime;

      if (isNaN(world.boss.totalHp) || world.boss.totalHp === undefined) {
        nanDetected = true;
        break;
      }

      if (world.boss.totalHp === lastBossHp) {
        stuckCounter++;
      } else {
        stuckCounter = 0;
      }
      lastBossHp = world.boss.totalHp;

      if (stuckCounter > 120 * 120) {
        softLock = true;
        break;
      }
    }

    const entityCount = world.enemies.length + world.playerBullets.length +
                        world.enemyBullets.length + world.powerUps.length;
    if (entityCount > maxEntities) maxEntities = entityCount;

    if (isNaN(world.player.x) || isNaN(world.player.y) || isNaN(world.score)) {
      nanDetected = true;
      break;
    }
  }

  stageTimes[lastStage] = world.totalTime - stageStartTime;

  return {
    difficulty,
    totalTimeSec: world.totalTime,
    stage1TimeSec: stageTimes[0],
    stage2TimeSec: stageTimes[1],
    stage3TimeSec: stageTimes[2],
    boss1KillTime: bossKillTimes[0],
    boss2KillTime: bossKillTimes[1],
    boss3KillTime: bossKillTimes[2],
    totalDeaths: totalDeaths,
    finalScore: world.score,
    completed: world.state === 'victory',
    softLock,
    nanDetected,
    maxEntities,
    bossesDefeated,
  };
}

function generateReport(results: SimResult[]): string {
  let md = '# BALANCE REPORT — Le Trombone de l\'Infini\n\n';
  md += `Généré le ${new Date().toISOString()}\n\n`;

  for (const r of results) {
    md += `## ${r.difficulty.toUpperCase()}\n\n`;
    md += `| Métrique | Valeur | Cible |\n|---|---|---|\n`;
    md += `| Durée totale | ${fmt(r.totalTimeSec)} | 18–22 min |\n`;
    md += `| Stage 1 | ${fmt(r.stage1TimeSec)} | ~4–5 min |\n`;
    md += `| Stage 2 | ${fmt(r.stage2TimeSec)} | ~5 min |\n`;
    md += `| Stage 3 | ${fmt(r.stage3TimeSec)} | ~9–10 min |\n`;
    md += `| Boss 1 kill | ${fmt(r.boss1KillTime)} | ~90s |\n`;
    md += `| Boss 2 kill | ${fmt(r.boss2KillTime)} | ~120s |\n`;
    md += `| Boss 3 kill | ${fmt(r.boss3KillTime)} | ~360–420s |\n`;
    md += `| Morts | ${r.totalDeaths} | — |\n`;
    md += `| Score final | ${r.finalScore} | — |\n`;
    md += `| Terminé | ${r.completed ? 'OUI' : 'NON'} | OUI |\n`;
    md += `| Soft-lock | ${r.softLock ? 'OUI ⚠️' : 'NON'} | NON |\n`;
    md += `| NaN détecté | ${r.nanDetected ? 'OUI ⚠️' : 'NON'} | NON |\n`;
    md += `| Max entités | ${r.maxEntities} | <500 |\n`;
    md += `| Boss vaincus | ${r.bossesDefeated}/3 | 3/3 |\n`;
    md += '\n';
  }

  return md;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m${s.toString().padStart(2, '0')}s (${Math.round(sec)}s)`;
}

const normalResult = runSim('normal', 42);
const hardResult = runSim('hard', 42);

const report = generateReport([normalResult, hardResult]);
const reportPath = path.resolve(__dirname, '..', '..', '..', '..', 'BALANCE_REPORT.md');
fs.writeFileSync(reportPath, report, 'utf-8');

console.log(report);

if (!normalResult.completed) {
  console.error('❌ Normal run NOT completed');
  process.exit(1);
}
if (normalResult.softLock) {
  console.error('❌ Soft-lock detected');
  process.exit(1);
}
if (normalResult.nanDetected) {
  console.error('❌ NaN detected');
  process.exit(1);
}

console.log('✅ Simulation passed');
