import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';
import { WORLD_W, WORLD_H } from '../core/balance';

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: WORLD_W,
    height: WORLD_H,
    parent,
    backgroundColor: '#0a0a0f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, TitleScene, GameScene, PauseScene, GameOverScene, VictoryScene],
    physics: { default: 'arcade', arcade: { debug: false } },
    audio: { noAudio: false },
    render: { pixelArt: false, antialias: true },
  };

  return new Phaser.Game(config);
}
