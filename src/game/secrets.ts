/** Détection et suivi des secrets, sans Phaser. */
import type { LevelDef, SecretDef } from './level';

export const SECRET_RADIUS = 14;

export class SecretTracker {
  private readonly found = new Set<string>();

  constructor(private readonly level: LevelDef) {}

  get total(): number {
    return this.level.secrets.length;
  }

  get foundCount(): number {
    return this.found.size;
  }

  isFound(id: string): boolean {
    return this.found.has(id);
  }

  /** Découverte au simple contact. Renvoie les secrets trouvés à cet instant. */
  touch(cx: number, cy: number, ballRadius: number): SecretDef[] {
    const newly: SecretDef[] = [];
    for (const s of this.level.secrets) {
      if (this.found.has(s.id)) continue;
      if (Math.hypot(s.x - cx, s.y - cy) <= ballRadius + SECRET_RADIUS) {
        this.found.add(s.id);
        newly.push(s);
      }
    }
    return newly;
  }
}
