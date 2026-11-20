import Phaser from 'phaser';
import { PlayScene } from './scenes/PlayScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#111111',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [PlayScene],
});
