import * as Phaser from 'phaser';
import { WORLD_W, WORLD_H } from '../../core/balance';

export class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }

  create(data: { score: number }) {
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;

    this.add.rectangle(cx, cy, WORLD_W, WORLD_H, 0x0a0a1a, 1);

    this.add.text(cx, cy - 120, 'VICTOIRE !', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 60, 'Clippy est vaincu.\nLe Trombone de l\'Infini est brisé.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaa',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy, `Score Final: ${data.score}`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#fff',
    }).setOrigin(0.5);

    const hs = parseInt(localStorage.getItem('trombone_highscore') || '0', 10);
    if (data.score >= hs) {
      this.add.text(cx, cy + 40, '★ NOUVEAU RECORD ! ★', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ff0',
      }).setOrigin(0.5);
    }

    // TODO Supabase: set clippy_defeated = true for this user
    // persistence.setClippyDefeated(true);

    const title = this.add.text(cx, cy + 100, '[ Retour au titre ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#0f0',
    }).setOrigin(0.5).setInteractive();

    title.on('pointerdown', () => this.scene.start('Title'));
    this.input.keyboard!.on('keydown-SPACE', () => this.scene.start('Title'));
    this.input.keyboard!.on('keydown-ENTER', () => this.scene.start('Title'));
  }
}
