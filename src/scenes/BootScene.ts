import Phaser from 'phaser';

/** Scène de démarrage : placeholder en attendant le prototype du Gameplay Programmer. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Rouler-Trouver', { fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}
