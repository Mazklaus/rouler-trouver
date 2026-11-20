/** Détection et suivi des secrets, sans Three.js ni Rapier. */
import type { LevelDef, SecretDef, Vec3 } from './level';

export const SECRET_RADIUS = 0.35;

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
  touch(center: Vec3, ballRadius: number): SecretDef[] {
    const newly: SecretDef[] = [];
    for (const s of this.level.secrets) {
      if (this.found.has(s.id)) continue;
      const p = s.position;
      if (Math.hypot(p.x - center.x, p.y - center.y, p.z - center.z) <= ballRadius + SECRET_RADIUS) {
        this.found.add(s.id);
        newly.push(s);
      }
    }
    return newly;
  }
}
