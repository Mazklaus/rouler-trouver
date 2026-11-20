import Phaser from 'phaser';
import { GARDEN, type LevelDef, type SecretDef } from '../game/level';
import { createBall, PHYSICS, stepBall, type BallState } from '../game/physics';
import { SECRET_RADIUS, SecretTracker } from '../game/secrets';

/** Couleurs provisoires (formes simples, pas d'assets). */
const COLORS = {
  sky: 0xfff4e0, // crème
  ground: 0x4a2c2a, // cacao
  bounce: 0x9b6bd3,
  decor: 0x3f7d4e,
  hero: 0xff5c8a, // rose réservé au héros
  secret: 0x36e0c8, // turquoise réservé aux secrets
} as const;
const SECRET_CSS = '#36E0C8';
const TEXT_CSS = '#4A2C2A';

const FIXED_DT = 1 / 120;
/** Hauteur de monde visible à l'écran, quelle que soit la taille de la fenêtre. */
const VIEW_HEIGHT = 760;

/** Scène unique du prototype : une zone, une boule, trois secrets. */
export class PlayScene extends Phaser.Scene {
  private level: LevelDef = GARDEN;
  private ball!: BallState;
  private secrets!: SecretTracker;
  private ballGfx!: Phaser.GameObjects.Arc;
  private ballView!: Phaser.GameObjects.Container;
  private secretGfx = new Map<string, Phaser.GameObjects.Arc>();
  private counter!: Phaser.GameObjects.Text;
  private notebook!: Phaser.GameObjects.Container;
  private notebookText!: Phaser.GameObjects.Text;
  private hud!: Phaser.Cameras.Scene2D.Camera;
  private keys!: Record<'left' | 'right' | 'q' | 'a' | 'd' | 'space' | 'tab', Phaser.Input.Keyboard.Key>;
  private accumulator = 0;
  private jumpQueued = false;
  private paused = false;

  constructor() {
    super('Play');
  }

  create(): void {
    this.ball = createBall(this.level);
    this.secrets = new SecretTracker(this.level);
    this.cameras.main.setBackgroundColor(COLORS.sky);

    const world = this.add.container(0, 0);
    world.add(this.drawGround());
    for (const s of this.level.secrets) {
      const gfx = this.add.circle(s.x, s.y, SECRET_RADIUS, COLORS.secret).setStrokeStyle(3, 0xffffff);
      this.tweens.add({ targets: gfx, scale: 1.15, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
      this.secretGfx.set(s.id, gfx);
      world.add(gfx);
    }
    this.ballGfx = this.add.circle(this.ball.x, this.ball.y - PHYSICS.radius, PHYSICS.radius, COLORS.hero);
    // Un trait blanc rend la rotation visible.
    const stripe = this.add.rectangle(0, 0, 4, PHYSICS.radius * 2, 0xffffff);
    const ballView = this.add.container(this.ballGfx.x, this.ballGfx.y, []);
    this.ballGfx.setPosition(0, 0);
    ballView.add([this.ballGfx, stripe]);
    this.ballView = ballView;
    world.add(ballView);
    // Premier plan : les décors masquent le secret « caché » ; un point qui scintille sert d'indice.
    for (const d of this.level.decors) {
      world.add(this.add.rectangle(d.x, d.y, d.width, d.height, COLORS.decor).setOrigin(0, 0));
      const hint = this.add.circle(d.x + d.width * 0.6, d.y + 12, 6, COLORS.secret);
      this.tweens.add({ targets: hint, alpha: 0.2, yoyo: true, repeat: -1, duration: 900 });
      world.add(hint);
    }

    const cam = this.cameras.main;
    cam.setBounds(0, -200, this.level.width, this.level.killY + 200);
    cam.startFollow(ballView, true, 0.12, 0.12);

    this.createHud(world);
    this.createInput();
    this.fitZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitZoom, this));
  }

  override update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.tab)) this.toggleNotebook();
    if (this.paused) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) this.jumpQueued = true;

    const k = this.keys;
    const move = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.q.isDown || k.a.isDown ? 1 : 0);

    this.accumulator = Math.min(this.accumulator + delta / 1000, 0.25);
    while (this.accumulator >= FIXED_DT) {
      const events = stepBall(this.ball, { move, jump: this.jumpQueued }, FIXED_DT, this.level);
      this.jumpQueued = false;
      this.accumulator -= FIXED_DT;
      if (events.includes('respawn')) this.cameras.main.fadeIn(350, 255, 244, 224);
      for (const s of this.secrets.touch(this.ball.x, this.ball.y - PHYSICS.radius, PHYSICS.radius)) this.onDiscover(s);
    }

    this.ballView.setPosition(this.ball.x, this.ball.y - PHYSICS.radius);
    this.ballView.rotation += (this.ball.vx * (delta / 1000)) / PHYSICS.radius;
  }

  private drawGround(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    const pts = this.level.ground;
    const bottom = this.level.killY + 200;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (b.x <= a.x || a.kind === 'gap') continue;
      g.fillStyle(a.kind === 'bounce' ? COLORS.bounce : COLORS.ground);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(a.x, a.y),
          new Phaser.Math.Vector2(b.x, b.y),
          new Phaser.Math.Vector2(b.x, bottom),
          new Phaser.Math.Vector2(a.x, bottom),
        ],
        true,
      );
    }
    return g;
  }

  private createHud(world: Phaser.GameObjects.Container): void {
    this.counter = this.add.text(24, 20, '', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: SECRET_CSS,
      stroke: TEXT_CSS,
      strokeThickness: 4,
    });
    const help = this.add.text(24, 64, '⬅ ➡ / Q D : rouler   Espace : sauter   Tab : carnet', {
      fontSize: '20px',
      color: TEXT_CSS,
    });
    this.time.delayedCall(12000, () => this.tweens.add({ targets: help, alpha: 0, duration: 800 }));

    const panel = this.add.rectangle(0, 0, 420, 220, 0x4a2c2a, 0.88);
    this.notebookText = this.add.text(0, 0, '', { fontSize: '28px', color: '#FFF4E0', align: 'center' }).setOrigin(0.5);
    this.notebook = this.add.container(0, 0, [panel, this.notebookText]).setVisible(false);

    // Caméra HUD dédiée, sans zoom ni défilement ; la caméra principale ignore le HUD.
    this.hud = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.hud.ignore(world);
    this.cameras.main.ignore([this.counter, help, this.notebook]);
    this.updateCounter();
  }

  private createInput(): void {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      q: kb.addKey(K.Q),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      space: kb.addKey(K.SPACE),
      tab: kb.addKey(K.TAB),
    };
  }

  private fitZoom(): void {
    const { width, height } = this.scale;
    this.cameras.main.setSize(width, height).setZoom(height / VIEW_HEIGHT);
    this.hud?.setSize(width, height);
    this.notebook?.setPosition(width / 2, height / 2);
  }

  private updateCounter(): void {
    // Le compteur permanent ne révèle pas le total (maquette UI) ; le carnet, si.
    this.counter.setText(`● ${this.secrets.foundCount} / ?`);
  }

  private onDiscover(secret: SecretDef): void {
    const gfx = this.secretGfx.get(secret.id);
    if (gfx) {
      this.tweens.killTweensOf(gfx);
      this.tweens.add({ targets: gfx, scale: 3, alpha: 0, duration: 500, onComplete: () => gfx.destroy() });
    }
    this.updateCounter();
    this.tweens.add({ targets: this.counter, scale: 1.2, yoyo: true, duration: 150 });
    const pop = this.add.text(this.counter.x + this.counter.width + 16, this.counter.y, '+1 secret !', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: SECRET_CSS,
      stroke: TEXT_CSS,
      strokeThickness: 4,
    });
    this.cameras.main.ignore(pop);
    this.tweens.add({ targets: pop, y: pop.y - 10, alpha: 0, delay: 1100, duration: 400, onComplete: () => pop.destroy() });
  }

  private toggleNotebook(): void {
    this.paused = !this.paused;
    this.notebook.setVisible(this.paused);
    this.notebookText.setText(
      `Carnet\n\n${this.level.name}   ${this.secrets.foundCount} / ${this.secrets.total}\n\n(Tab pour reprendre)`,
    );
    if (this.paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
  }
}
