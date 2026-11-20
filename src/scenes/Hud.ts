/** HUD en HTML par-dessus le canvas : compteur, pop de découverte, rappel des touches, carnet. */
import type { SecretTracker } from '../game/secrets';

const STYLE = `
.hud{position:fixed;inset:0;pointer-events:none;font:bold 28px system-ui,sans-serif;color:#4A2C2A}
.hud-counter{position:absolute;top:20px;left:24px;font-size:34px;color:#36E0C8;-webkit-text-stroke:1.5px #4A2C2A}
.hud-pop{position:absolute;top:24px;left:150px;color:#36E0C8;-webkit-text-stroke:1px #4A2C2A;opacity:0;transition:opacity .3s}
.hud-pop.show{opacity:1}
.hud-help{position:absolute;bottom:20px;left:24px;font-size:18px;font-weight:600;transition:opacity .8s}
.hud-notebook{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(74,44,42,.9);color:#FFF4E0;padding:28px 48px;border-radius:18px;text-align:center;display:none}
.hud-notebook.show{display:block}
.hud-flash{position:absolute;inset:0;background:#FFF4E0;opacity:0}
`;

export class Hud {
  private readonly counter: HTMLElement;
  private readonly pop: HTMLElement;
  private readonly notebook: HTMLElement;
  private readonly fade: HTMLElement;
  private popTimer = 0;

  constructor(
    private readonly zoneName: string,
    private readonly secrets: SecretTracker,
  ) {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.append(style);

    const root = el('div', 'hud');
    this.fade = el('div', 'hud-flash');
    this.counter = el('div', 'hud-counter');
    this.pop = el('div', 'hud-pop', '+1 secret !');
    const help = el('div', 'hud-help', '⬅⬆⬇➡ / ZQSD rouler · Espace sauter · Souris (glisser) caméra · Tab carnet');
    this.notebook = el('div', 'hud-notebook');
    root.append(this.fade, this.counter, this.pop, help, this.notebook);
    document.body.append(root);
    // Le rappel des touches s'efface après les premières secondes.
    setTimeout(() => (help.style.opacity = '0'), 15000);
    this.refresh();
  }

  discovered(): void {
    this.refresh();
    this.pop.classList.add('show');
    clearTimeout(this.popTimer);
    this.popTimer = window.setTimeout(() => this.pop.classList.remove('show'), 1500);
  }

  showNotebook(open: boolean): void {
    this.notebook.innerHTML = '';
    this.notebook.append(
      el('div', '', '📖 Carnet'),
      el('div', '', `${this.zoneName}   ${this.secrets.foundCount} / ${this.secrets.total}`),
      el('div', '', 'Tab pour reprendre'),
    );
    for (const c of Array.from(this.notebook.children)) (c as HTMLElement).style.margin = '10px 0';
    this.notebook.classList.toggle('show', open);
  }

  /** Court fondu crème après une chute. */
  flash(): void {
    this.fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-out' });
  }

  private refresh(): void {
    // Le compteur permanent ne révèle pas le total (maquette UI) ; le carnet, si.
    this.counter.textContent = `● ${this.secrets.foundCount} / ?`;
  }
}

function el(tag: string, className: string, text = ''): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  e.textContent = text;
  return e;
}
