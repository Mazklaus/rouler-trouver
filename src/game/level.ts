/**
 * Données et géométrie du niveau, sans Phaser.
 * Le sol est une ligne brisée (une hauteur par x). Repère écran : y vers le bas.
 */

export type SurfaceKind = 'ground' | 'bounce' | 'gap';

/** Un point du sol. `kind` décrit le segment qui part de ce point vers le suivant. */
export interface GroundPoint {
  x: number;
  y: number;
  kind?: SurfaceKind;
}

export type SecretType = 'hidden' | 'momentum' | 'bounce';

export interface SecretDef {
  id: string;
  type: SecretType;
  x: number;
  y: number;
}

export interface Decor {
  /** Décor de premier plan qui masque ce qui est derrière (secret « caché »). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelDef {
  name: string;
  width: number;
  /** En dessous de cette hauteur, la boule est tombée. */
  killY: number;
  start: { x: number; y: number };
  ground: GroundPoint[];
  secrets: SecretDef[];
  decors: Decor[];
}

export interface GroundSample {
  y: number;
  /** dy/dx du segment (positif = descend vers la droite). */
  slope: number;
  kind: Exclude<SurfaceKind, 'gap'>;
}

/**
 * Hauteur du sol en x, ou null s'il n'y a pas de sol (trou ou hors niveau).
 * Deux points de même x forment une marche verticale (mur) : le segment de largeur nulle est ignoré.
 */
export function groundAt(ground: readonly GroundPoint[], x: number): GroundSample | null {
  for (let i = 0; i < ground.length - 1; i++) {
    const a = ground[i]!;
    const b = ground[i + 1]!;
    if (b.x <= a.x) continue;
    if (x >= a.x && x < b.x) {
      const kind = a.kind ?? 'ground';
      if (kind === 'gap') return null;
      const slope = (b.y - a.y) / (b.x - a.x);
      return { y: a.y + slope * (x - a.x), slope, kind };
    }
  }
  return null;
}

/**
 * Zone de test « Jardin » : 3 secrets (rebond, élan, caché).
 * De gauche à droite : pilier + champignon de rebond, départ, colline,
 * descente vers un tremplin, trou, montée, colline, plaine avec buisson.
 */
export const GARDEN: LevelDef = {
  name: 'Jardin',
  width: 4000,
  killY: 1000,
  start: { x: 520, y: 650 },
  ground: [
    { x: 0, y: 0 },
    { x: 0, y: 380 }, // mur gauche puis haut du pilier
    { x: 220, y: 380 },
    { x: 220, y: 650, kind: 'bounce' }, // champignon de rebond
    { x: 340, y: 650 },
    { x: 600, y: 650 },
    { x: 1000, y: 450 }, // sommet de la colline gauche
    { x: 1150, y: 450 },
    { x: 1800, y: 650, kind: 'gap' }, // bord du tremplin, puis trou
    { x: 2060, y: 650 },
    { x: 2700, y: 450 }, // sommet de la colline droite
    { x: 2850, y: 450 },
    { x: 3100, y: 650 },
    { x: 3900, y: 650 },
    { x: 3900, y: 0 }, // mur droit
    { x: 4000, y: 0 },
  ],
  secrets: [
    { id: 'jardin-rebond', type: 'bounce', x: 110, y: 340 },
    { id: 'jardin-elan', type: 'momentum', x: 2110, y: 600 },
    { id: 'jardin-cache', type: 'hidden', x: 3450, y: 620 },
  ],
  decors: [{ x: 3380, y: 560, width: 150, height: 92 }],
};
