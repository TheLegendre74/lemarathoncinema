import * as Phaser from 'phaser';
import { WORLD_W, WORLD_H } from '../../core/balance';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: { score: number; continues: number }) {
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;

    this.add.rectangle(cx, cy, WORLD_W, WORLD_H, 0x0a0000, 1);

    this.add.text(cx, cy - 80, 'GAME OVER', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ff0000',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 20, `Score: ${data.score}`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#fff',
    }).setOrigin(0.5);

    const retry = this.add.text(cx, cy + 40, '[ Réessayer ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#0f0',
    }).setOrigin(0.5).setInteractive();

    const title = this.add.text(cx, cy + 90, '[ Titre ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#888',
    }).setOrigin(0.5).setInteractive();

    retry.on('pointerdown', () => this.scene.start('Game', { difficulty: 'normal' }));
    title.on('pointerdown', () => this.scene.start('Title'));

    this.input.keyboard!.on('keydown-SPACE', () => this.scene.start('Game', { difficulty: 'normal' }));
    this.input.keyboard!.on('keydown-ENTER', () => this.scene.start('Title'));
  }
}
