import * as Phaser from 'phaser';
import { WORLD_W, WORLD_H } from '../../core/balance';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create(data: { gameScene: Phaser.Scene }) {
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;

    this.add.rectangle(cx, cy, WORLD_W, WORLD_H, 0x000000, 0.7);

    this.add.text(cx, cy - 60, 'PAUSE', {
      fontSize: '32px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5);

    const resume = this.add.text(cx, cy, '[ Reprendre ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#0f0',
    }).setOrigin(0.5).setInteractive();

    const quit = this.add.text(cx, cy + 50, '[ Quitter ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#f00',
    }).setOrigin(0.5).setInteractive();

    resume.on('pointerdown', () => this.resumeGame(data));
    quit.on('pointerdown', () => {
      this.scene.stop();
      this.scene.stop('Game');
      this.scene.start('Title');
    });

    this.input.keyboard!.on('keydown-ESC', () => this.resumeGame(data));
    this.input.keyboard!.on('keydown-P', () => this.resumeGame(data));
  }

  private resumeGame(data: { gameScene: Phaser.Scene }) {
    this.scene.stop();
    this.scene.resume('Game');
    (data.gameScene as any).resume();
  }
}
