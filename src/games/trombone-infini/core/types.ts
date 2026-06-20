export interface Vec2 { x: number; y: number }

export interface Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  lives: number;
  weaponLevel: number;
  bombs: number;
  speed: number;
  invulnTimer: number;
  shieldActive: boolean;
  scoreMultiplier: number;
  multiplierTimer: number;
  continues: number;
  firing: boolean;
  fireTimer: number;
}

export type EnemyType = 'popcorn' | 'weaver' | 'turret' | 'bomber' | 'miniboss';

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  fireTimer: number;
  age: number;
  patternData: number;
}

export interface Bullet extends Entity {
  damage: number;
  isPlayerBullet: boolean;
  homing: boolean;
  homingStrength: number;
  fake: boolean;
}

export type PowerUpType = 'weapon' | 'bomb' | 'speed' | 'shield' | 'popcorn' | 'multiplier';

export interface PowerUp extends Entity {
  type: PowerUpType;
  value: number;
}

export type BossPhase = {
  name: string;
  hp: number;
  maxHp: number;
  timer: number;
  index: number;
};

export interface Boss extends Entity {
  phases: BossPhase[];
  currentPhase: number;
  totalHp: number;
  maxTotalHp: number;
  phaseTimer: number;
  fireTimer: number;
  stateTimer: number;
  state: string;
  defeated: boolean;
  invulnerable: boolean;
  subEntities: Entity[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type Difficulty = 'normal' | 'hard';

export interface WaveSpawn {
  type: EnemyType;
  count: number;
  formation: 'line' | 'v' | 'circle' | 'random' | 'sides';
  delay: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface Wave {
  time: number;
  spawns: WaveSpawn[];
}

export interface StageData {
  name: string;
  waves: Wave[];
  bossTriggerTime: number;
  bossType: 'station' | 'eye' | 'clippy';
}

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  bomb: boolean;
}

export interface WorldEvents {
  explosions: Vec2[];
  powerUpCollected: PowerUpType[];
  playerHit: boolean;
  playerDeath: boolean;
  bossPhaseChange: number;
  bossDefeated: boolean;
  screenShake: number;
  texts: { text: string; x: number; y: number; duration: number }[];
}

export interface World {
  state: GameState;
  difficulty: Difficulty;
  stage: number;
  stageTimer: number;
  player: Player;
  enemies: Enemy[];
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  powerUps: PowerUp[];
  particles: Particle[];
  boss: Boss | null;
  bossActive: boolean;
  score: number;
  highScore: number;
  nextEntityId: number;
  events: WorldEvents;
  width: number;
  height: number;
  waveIndex: number;
  stageComplete: boolean;
  totalTime: number;
  bossDialogues: string[];
}
