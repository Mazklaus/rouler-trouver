/**
 * Données du niveau, sans Three.js ni Rapier.
 * Convention : 1 unité = 1 m, Y vers le haut. Le parcours suit l'axe X, la profondeur est l'axe Z.
 */

export type Vec3 = { x: number; y: number; z: number };

export type BlockKind = 'ground' | 'bounce';

/** Bloc statique : un pavé, éventuellement incliné autour de Z (pente le long de X). */
export interface Block {
  center: Vec3;
  /** Dimensions complètes (largeur X, hauteur Y, profondeur Z). */
  size: Vec3;
  /** Rotation autour de Z, en radians (pente). */
  rotZ: number;
  kind: BlockKind;
}

export type SecretType = 'hidden' | 'momentum' | 'bounce';

export interface SecretDef {
  id: string;
  type: SecretType;
  position: Vec3;
}

/** Décor sans collision : la boule le traverse, mais il masque ce qui est dedans. */
export interface Decor {
  center: Vec3;
  size: Vec3;
}

export interface LevelDef {
  name: string;
  /** En dessous de cette hauteur, la boule est tombée. */
  killY: number;
  start: Vec3;
  blocks: Block[];
  secrets: SecretDef[];
  decors: Decor[];
}

const THICKNESS = 1;

/** Plateau plat de x0 à x1, dessus à la hauteur `top`. */
export function flat(x0: number, x1: number, top: number, depth: number, kind: BlockKind = 'ground', bottom = top - THICKNESS): Block {
  const h = top - bottom;
  return { center: { x: (x0 + x1) / 2, y: top - h / 2, z: 0 }, size: { x: x1 - x0, y: h, z: depth }, rotZ: 0, kind };
}

/** Pente dont le dessus relie (x0, y0) à (x1, y1). */
export function ramp(x0: number, y0: number, x1: number, y1: number, depth: number): Block {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const rotZ = Math.atan2(dy, dx);
  // Le centre est sous le milieu du dessus, décalé d'une demi-épaisseur le long de la normale.
  const nx = -Math.sin(rotZ);
  const ny = Math.cos(rotZ);
  return {
    center: { x: (x0 + x1) / 2 - (nx * THICKNESS) / 2, y: (y0 + y1) / 2 - (ny * THICKNESS) / 2, z: 0 },
    size: { x: len, y: THICKNESS, z: depth },
    rotZ,
    kind: 'ground',
  };
}

const D = 10; // profondeur du parcours

/**
 * Zone de test « Jardin », 3 secrets.
 * De gauche à droite : pilier + champignon de rebond, départ, colline, descente,
 * trou à franchir avec de l'élan, plateau du secret d'élan, colline, plaine avec buisson.
 */
export const GARDEN: LevelDef = {
  name: 'Jardin',
  killY: -10,
  start: { x: 0, y: 0.5, z: 0 },
  blocks: [
    flat(-18, -12, 4, D, 'ground', -1), // pilier
    flat(-12, -9, 0, D, 'bounce'), // champignon de rebond
    flat(-9, 10, 0, D), // départ
    ramp(10, 0, 18, 4, D),
    flat(18, 21, 4, D, 'ground', 0),
    ramp(21, 4, 33, 0, D),
    // trou de 33 à 38.5
    flat(38.5, 46, 0, D),
    ramp(46, 0, 54, 4, D),
    flat(54, 57, 4, D, 'ground', 0),
    ramp(57, 4, 65, 0, D),
    flat(65, 90, 0, D),
  ],
  secrets: [
    { id: 'jardin-rebond', type: 'bounce', position: { x: -15, y: 4.6, z: 0 } },
    { id: 'jardin-elan', type: 'momentum', position: { x: 39.8, y: 0.6, z: 0 } },
    { id: 'jardin-cache', type: 'hidden', position: { x: 80, y: 0.6, z: -1 } },
  ],
  decors: [{ center: { x: 80, y: 1, z: -0.5 }, size: { x: 3, y: 2, z: 3 } }],
};
