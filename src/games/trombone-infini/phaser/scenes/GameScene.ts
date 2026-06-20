import * as Phaser from 'phaser';
import { createWorld, startGame, updateWorld, freshEvents } from '../../core/world';
import { SeededRNG } from '../../core/rng';
import { FIXED_DT, BALANCE, WORLD_W, WORLD_H } from '../../core/balance';
import type { World, Input, Difficulty } from '../../core/types';
import { SfxManager } from '../render/sfx';

export class GameScene extends Phaser.Scene {
  private world!: World;
  private rng!: SeededRNG;
  private accumulator = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private stageNameTimer = 0;
  private stageNameText = '';
  private dialogueTimer = 0;
  private dialogueText = '';
  private sfx!: SfxManager;
  private crtOverlay!: Phaser.GameObjects.Graphics;
  private stars: { x: number; y: number; speed: number; brightness: number }[] = [];

  constructor() { super('Game'); }

  init(data: { difficulty: Difficulty }) {
    const seed = Date.now();
    this.rng = new SeededRNG(seed);
    this.world = createWorld(data.difficulty || 'normal', seed);
    this.accumulator = 0;
    this.shakeTimer = 0;
  }

  create() {
    startGame(this.world);
    this.gfx = this.add.graphics();
    this.sfx = new SfxManager(this);

    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * WORLD_W,
        y: Math.random() * WORLD_H,
        speed: 30 + Math.random() * 80,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }

    this.createHud();
    this.createCrtOverlay();

    this.input.keyboard!.on('keydown-ESC', () => {
      this.world.state = 'paused';
      this.scene.launch('Pause', { gameScene: this });
      this.scene.pause();
    });
    this.input.keyboard!.on('keydown-P', () => {
      this.world.state = 'paused';
      this.scene.launch('Pause', { gameScene: this });
      this.scene.pause();
    });
  }

  resume() {
    this.world.state = 'playing';
  }

  private createHud() {
    const style = { fontSize: '12px', fontFamily: 'monospace', color: '#fff' };
    this.hudTexts.score = this.add.text(8, 4, 'SCORE: 0', style).setDepth(100);
    this.hudTexts.highscore = this.add.text(WORLD_W - 8, 4, 'HI: 0', { ...style, color: '#ff6600' }).setOrigin(1, 0).setDepth(100);
    this.hudTexts.lives = this.add.text(8, 20, 'VIES: 3', { ...style, color: '#0f0' }).setDepth(100);
    this.hudTexts.hp = this.add.text(80, 20, 'HP: 3', { ...style, color: '#0ff' }).setDepth(100);
    this.hudTexts.bombs = this.add.text(140, 20, 'BOMBES: 2', { ...style, color: '#f0f' }).setDepth(100);
    this.hudTexts.weapon = this.add.text(250, 20, 'ARM: 1', { ...style, color: '#ff0' }).setDepth(100);
    this.hudTexts.stage = this.add.text(WORLD_W / 2, 4, '', { ...style, color: '#ffd700' }).setOrigin(0.5, 0).setDepth(100);
    this.hudTexts.bossHp = this.add.text(WORLD_W / 2, WORLD_H - 16, '', { fontSize: '10px', fontFamily: 'monospace', color: '#f00' }).setOrigin(0.5, 1).setDepth(100);
    this.hudTexts.stageAnnounce = this.add.text(WORLD_W / 2, WORLD_H / 2, '', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffd700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);
    this.hudTexts.dialogue = this.add.text(WORLD_W / 2, 60, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#f88', fontStyle: 'italic',
      wordWrap: { width: WORLD_W - 40 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(101);
  }

  private createCrtOverlay() {
    this.crtOverlay = this.add.graphics().setDepth(200).setAlpha(0.06);
    for (let y = 0; y < WORLD_H; y += 3) {
      this.crtOverlay.fillStyle(0x000000, 1);
      this.crtOverlay.fillRect(0, y, WORLD_W, 1);
    }
  }

  private readInput(): Input {
    const kb = this.input.keyboard!;
    const keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
      z: 'Z', q: 'Q',
      fire: 'SPACE', bomb: 'SHIFT',
    }) as any;

    return {
      left: keys.left.isDown || keys.a.isDown || keys.q.isDown,
      right: keys.right.isDown || keys.d.isDown,
      up: keys.up.isDown || keys.w.isDown || keys.z.isDown,
      down: keys.down.isDown || keys.s.isDown,
      fire: keys.fire.isDown,
      bomb: Phaser.Input.Keyboard.JustDown(keys.bomb),
    };
  }

  update(_time: number, delta: number) {
    const state = this.world.state as string;
    if (state !== 'playing') {
      if (state === 'gameover') {
        this.saveHighScore();
        this.scene.start('GameOver', { score: this.world.score, continues: this.world.player.continues });
      }
      if (state === 'victory') {
        this.saveHighScore();
        this.scene.start('Victory', { score: this.world.score });
      }
      return;
    }

    const input = this.readInput();
    this.accumulator += delta / 1000;

    const maxSteps = 10;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < maxSteps) {
      updateWorld(this.world, input, this.rng);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (this.accumulator > FIXED_DT * 3) this.accumulator = 0;

    this.processEvents();
    this.render();
    this.updateHud();
    this.updateShake(delta / 1000);

    const postState = this.world.state as string;
    if (postState === 'gameover') {
      this.saveHighScore();
      this.scene.start('GameOver', { score: this.world.score, continues: this.world.player.continues });
    } else if (postState === 'victory') {
      this.saveHighScore();
      this.scene.start('Victory', { score: this.world.score });
    }
  }

  private processEvents() {
    const ev = this.world.events;

    if (ev.screenShake > 0) {
      this.shakeTimer = ev.screenShake;
      this.shakeIntensity = ev.screenShake * 8;
    }

    for (const exp of ev.explosions) {
      this.sfx.playExplosion();
    }

    if (ev.playerHit) this.sfx.playHit();
    if (ev.playerDeath) this.sfx.playDeath();

    for (const pu of ev.powerUpCollected) {
      this.sfx.playPowerUp();
    }

    for (const txt of ev.texts) {
      this.stageNameText = txt.text;
      this.stageNameTimer = txt.duration;
    }

    if (ev.bossPhaseChange >= 0) {
      this.sfx.playBossPhase();
    }

    if (this.world.bossDialogues.length > 0) {
      this.dialogueText = this.world.bossDialogues[this.world.bossDialogues.length - 1];
      this.dialogueTimer = 4;
    }
  }

  private render() {
    const g = this.gfx;
    g.clear();

    this.renderStars(g);
    this.renderPowerUps(g);
    this.renderPlayerBullets(g);
    this.renderEnemyBullets(g);
    this.renderEnemies(g);
    this.renderBoss(g);
    this.renderPlayer(g);
    this.renderParticles(g);
  }

  private renderStars(g: Phaser.GameObjects.Graphics) {
    const dt = this.game.loop.delta / 1000;
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > WORLD_H) { star.y = -2; star.x = Math.random() * WORLD_W; }
      const alpha = star.brightness * (this.world.stage === 0 ? 0.6 : this.world.stage === 1 ? 0.3 : 0.8);
      g.fillStyle(0xffffff, alpha);
      g.fillRect(star.x, star.y, 1.5, 1.5);
    }
  }

  private renderPlayer(g: Phaser.GameObjects.Graphics) {
    const p = this.world.player;
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 10) % 2 === 0) return;

    g.fillStyle(0x00ccff, 1);
    g.fillTriangle(p.x, p.y - 14, p.x - 12, p.y + 10, p.x + 12, p.y + 10);
    g.fillStyle(0x0088ff, 1);
    g.fillTriangle(p.x, p.y - 8, p.x - 6, p.y + 6, p.x + 6, p.y + 6);

    if (p.shieldActive) {
      g.lineStyle(2, 0x00ffff, 0.6);
      g.strokeCircle(p.x, p.y, 20);
    }

    g.fillStyle(0xff8800, 0.8);
    g.fillTriangle(p.x - 3, p.y + 12, p.x, p.y + 20 + Math.random() * 4, p.x + 3, p.y + 12);
  }

  private renderPlayerBullets(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x00ff88, 1);
    for (const b of this.world.playerBullets) {
      if (!b.active) continue;
      g.fillRect(b.x - 1.5, b.y - 4, 3, 8);
    }
  }

  private renderEnemyBullets(g: Phaser.GameObjects.Graphics) {
    for (const b of this.world.enemyBullets) {
      if (!b.active) continue;
      if (b.fake) {
        g.fillStyle(0xff0000, 0.3);
        g.fillCircle(b.x, b.y, b.radius + 1);
      } else if (b.homing) {
        g.fillStyle(0xffff00, 1);
        g.fillCircle(b.x, b.y, b.radius);
      } else {
        g.fillStyle(0xff3333, 1);
        g.fillCircle(b.x, b.y, b.radius);
      }
    }
  }

  private renderEnemies(g: Phaser.GameObjects.Graphics) {
    for (const e of this.world.enemies) {
      if (!e.active) continue;
      const colors: Record<string, number> = {
        popcorn: 0xaaaaaa, weaver: 0x8888ff, turret: 0xff8800, bomber: 0xff4444, miniboss: 0xff00ff,
      };
      g.fillStyle(colors[e.type] ?? 0xffffff, 1);

      switch (e.type) {
        case 'popcorn':
          g.fillRect(e.x - 8, e.y - 8, 16, 16);
          break;
        case 'weaver':
          g.fillTriangle(e.x, e.y - 10, e.x - 10, e.y + 8, e.x + 10, e.y + 8);
          break;
        case 'turret':
          g.fillCircle(e.x, e.y, e.radius);
          break;
        case 'bomber':
          g.fillRect(e.x - 14, e.y - 10, 28, 20);
          g.fillStyle(0xcc0000, 1);
          g.fillRect(e.x - 4, e.y + 8, 8, 6);
          break;
        case 'miniboss':
          g.fillRect(e.x - 24, e.y - 16, 48, 32);
          g.fillStyle(0xdd00dd, 1);
          g.fillCircle(e.x, e.y, 10);
          break;
      }

      if (e.maxHp > 1) {
        const ratio = e.hp / e.maxHp;
        g.fillStyle(0x333333, 0.8);
        g.fillRect(e.x - e.radius, e.y - e.radius - 6, e.radius * 2, 3);
        g.fillStyle(ratio > 0.5 ? 0x00ff00 : 0xff0000, 0.9);
        g.fillRect(e.x - e.radius, e.y - e.radius - 6, e.radius * 2 * ratio, 3);
      }
    }
  }

  private renderBoss(g: Phaser.GameObjects.Graphics) {
    const boss = this.world.boss;
    if (!boss || !this.world.bossActive) return;

    const stageColors = [0x8888aa, 0xff2222, 0xffd700];
    const color = stageColors[this.world.stage] ?? 0xffffff;

    g.fillStyle(color, 1);

    switch (this.world.stage) {
      case 0:
        g.fillCircle(boss.x, boss.y, 40);
        g.fillStyle(0x555566, 1);
        g.fillRect(boss.x - 45, boss.y - 3, 90, 6);
        if (boss.currentPhase >= 2) {
          g.fillStyle(0x00ff00, 0.6 + Math.sin(this.time.now / 200) * 0.3);
          g.fillCircle(boss.x, boss.y, 12);
        }
        for (const t of boss.subEntities) {
          if (!t.active) continue;
          g.fillStyle(0xffaa00, 1);
          g.fillCircle(t.x, t.y, 8);
        }
        break;

      case 1:
        g.fillStyle(0x222222, 1);
        g.fillRect(boss.x - 40, boss.y - 30, 80, 60);
        g.fillStyle(boss.invulnerable ? 0x440000 : 0xff0000, 1);
        g.fillCircle(boss.x, boss.y, 25);
        g.fillStyle(0x000000, 1);
        g.fillCircle(boss.x, boss.y, 12);
        g.fillStyle(boss.invulnerable ? 0x880000 : 0xff4444, 1);
        g.fillCircle(boss.x, boss.y, 6);
        break;

      case 2: {
        g.fillStyle(0xcccccc, 1);
        g.fillRect(boss.x - 4, boss.y - 30, 8, 60);
        g.fillCircle(boss.x, boss.y - 30, 12);
        g.fillRect(boss.x + 15, boss.y - 10, 30, 25);
        g.fillStyle(0x888888, 1);
        g.fillCircle(boss.x + 30, boss.y + 20, 8);
        const stoneColors = [0x0066ff, 0xffff00, 0xff0000, 0x9900ff, 0x00ff00, 0xff8800];
        const phase = boss.currentPhase;
        for (let i = 0; i < 6; i++) {
          const destroyed = i < phase;
          const active = i === phase;
          g.fillStyle(destroyed ? 0x333333 : stoneColors[i], active ? 1 : 0.5);
          const sx = boss.x + 20 + (i % 3) * 12;
          const sy = boss.y - 8 + Math.floor(i / 3) * 12;
          g.fillCircle(sx, sy, active ? 6 : 4);
        }
        break;
      }
    }

    if (boss.invulnerable) {
      g.lineStyle(2, 0xffffff, 0.3 + Math.sin(this.time.now / 100) * 0.2);
      g.strokeCircle(boss.x, boss.y, boss.radius + 5);
    }
  }

  private renderPowerUps(g: Phaser.GameObjects.Graphics) {
    const puColors: Record<string, number> = {
      weapon: 0xff0000, bomb: 0xff00ff, speed: 0x00ff00,
      shield: 0x00ffff, popcorn: 0xffff00, multiplier: 0xffd700,
    };
    for (const pu of this.world.powerUps) {
      if (!pu.active) continue;
      g.fillStyle(puColors[pu.type] ?? 0xffffff, 0.9);
      g.fillCircle(pu.x, pu.y, 8);
      g.fillStyle(0xffffff, 1);
      const labels: Record<string, string> = { weapon: 'W', bomb: 'B', speed: 'S', shield: '◇', popcorn: '★', multiplier: 'x' };
      // Text labels rendered via graphics aren't great; just use colored circles
    }
  }

  private renderParticles(_g: Phaser.GameObjects.Graphics) {
    // Particles are handled via events, minimal for now
  }

  private updateHud() {
    const w = this.world;
    const p = w.player;

    this.hudTexts.score.setText(`SCORE: ${w.score}`);

    const hs = parseInt(localStorage.getItem('trombone_highscore') || '0', 10);
    this.hudTexts.highscore.setText(`HI: ${Math.max(hs, w.score)}`);

    this.hudTexts.lives.setText(`VIES: ${'♥'.repeat(p.lives)}`);
    this.hudTexts.hp.setText(`HP: ${'█'.repeat(p.hp)}${'░'.repeat(p.maxHp - p.hp)}`);
    this.hudTexts.bombs.setText(`BOMBES: ${p.bombs}`);
    this.hudTexts.weapon.setText(`ARM: ${p.weaponLevel + 1}`);

    const stageNames = ['Champ d\'Astéroïdes', 'Couloirs de CAM-9000', 'Arène de l\'Infini'];
    this.hudTexts.stage.setText(stageNames[w.stage] || '');

    if (w.bossActive && w.boss) {
      const phase = w.boss.phases[w.boss.currentPhase];
      const ratio = phase ? phase.hp / phase.maxHp : 0;
      const bar = '█'.repeat(Math.ceil(ratio * 20)) + '░'.repeat(20 - Math.ceil(ratio * 20));
      this.hudTexts.bossHp.setText(`BOSS [${bar}] ${phase?.name ?? ''}`);
    } else {
      this.hudTexts.bossHp.setText('');
    }

    const dt = this.game.loop.delta / 1000;

    if (this.stageNameTimer > 0) {
      this.stageNameTimer -= dt;
      this.hudTexts.stageAnnounce.setText(this.stageNameText);
      this.hudTexts.stageAnnounce.setAlpha(Math.min(1, this.stageNameTimer));
    } else {
      this.hudTexts.stageAnnounce.setText('');
    }

    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      this.hudTexts.dialogue.setText(this.dialogueText);
      this.hudTexts.dialogue.setAlpha(Math.min(1, this.dialogueTimer));
    } else {
      this.hudTexts.dialogue.setText('');
    }
  }

  private updateShake(dt: number) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const ox = (Math.random() - 0.5) * this.shakeIntensity;
      const oy = (Math.random() - 0.5) * this.shakeIntensity;
      this.cameras.main.setScroll(ox, oy);
    } else {
      this.cameras.main.setScroll(0, 0);
    }
  }

  private saveHighScore() {
    const hs = parseInt(localStorage.getItem('trombone_highscore') || '0', 10);
    if (this.world.score > hs) {
      localStorage.setItem('trombone_highscore', String(this.world.score));
    }
  }
}
