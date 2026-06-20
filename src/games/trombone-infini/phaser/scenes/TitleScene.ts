import * as Phaser from 'phaser';
import type { Difficulty } from '../../core/types';

export class TitleScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = 'normal';

  constructor() { super('Title'); }

  create() {
    const cx = +this.game.config.width / 2;
    const cy = +this.game.config.height / 2;

    this.add.text(cx, 100, 'LE TROMBONE\nDE L\'INFINI', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffd700',
      align: 'center', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 200, '— Un shoot\'em up ciné —', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaa',
    }).setOrigin(0.5);

    const hs = localStorage.getItem('trombone_highscore') || '0';
    this.add.text(cx, 260, `HIGH SCORE: ${hs}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ff6600',
    }).setOrigin(0.5);

    const normalBtn = this.add.text(cx, 360, '[ NORMAL ]', {
      fontSize: '20px', fontFamily: 'monospace', color: '#0f0',
    }).setOrigin(0.5).setInteractive();

    const hardBtn = this.add.text(cx, 410, '[ DIFFICILE ]', {
      fontSize: '20px', fontFamily: 'monospace', color: '#888',
    }).setOrigin(0.5).setInteractive();

    normalBtn.on('pointerdown', () => {
      this.selectedDifficulty = 'normal';
      normalBtn.setColor('#0f0');
      hardBtn.setColor('#888');
    });

    hardBtn.on('pointerdown', () => {
      this.selectedDifficulty = 'hard';
      hardBtn.setColor('#f00');
      normalBtn.setColor('#888');
    });

    const startBtn = this.add.text(cx, 500, '▶  JOUER  ▶', {
      fontSize: '24px', fontFamily: 'monospace', color: '#fff',
      backgroundColor: '#333', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive();

    startBtn.on('pointerdown', () => {
      this.scene.start('Game', { difficulty: this.selectedDifficulty });
    });

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.scene.start('Game', { difficulty: this.selectedDifficulty });
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.start('Game', { difficulty: this.selectedDifficulty });
    });

    this.add.text(cx, cy + 260, 'Contrôles: ZQSD/Flèches = déplacer\nEspace = tir (auto) | Shift = bombe | Échap = pause', {
      fontSize: '10px', fontFamily: 'monospace', color: '#666', align: 'center',
    }).setOrigin(0.5);
  }
}
