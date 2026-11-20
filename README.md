# Rouler-Trouver

Jeu d'exploration dont le seul but est de trouver des secrets cachés. Version web jouable dans le navigateur.

## Stack

| Rôle | Choix |
|---|---|
| Rendu 3D | [Three.js](https://threejs.org) (WebGL) |
| Physique | [Rapier 3D](https://rapier.rs) (`@dimforge/rapier3d-compat`, WASM) |
| Langage | TypeScript (strict) |
| Build / serveur de dev | Vite |
| Tests | Vitest |
| CI | GitHub Actions (typecheck, tests, build) |
| Cible | Web (navigateur), sortie statique dans `dist/` |

## Démarrer

```bash
npm ci          # installer (Node 22, voir .nvmrc)
npm run dev     # serveur local avec rechargement
npm test        # tests
npm run build   # build web -> dist/
```

## Arborescence

```
src/
  main.ts        # point d'entrée (renderer, boucle)
  game/          # logique pure, sans Three.js ni Rapier, testée avec Vitest
  world/         # monde physique Rapier (sans Three.js), testé avec Vitest
  scenes/        # une scène 3D par fichier (PascalCase)
  **/*.test.ts   # tests à côté du code testé
public/          # assets statiques copiés tels quels
```

## Conventions

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Prototype (phase 1)

Une zone, « Jardin », avec 3 secrets : un de rebond (à gauche), un d'élan (au-delà du trou), un caché (derrière le buisson).

```
Flèches / Q D    rouler
Espace           sauter
Tab              carnet (pause)
```

Logique pure dans `src/game/` (niveau, physique de la boule, secrets), testée avec Vitest ; monde physique Rapier dans `src/world/`, rendu Three.js dans `src/scenes/`.

## Version web (GitHub Pages)

Chaque push sur `main` lance `.github/workflows/deploy.yml` : build Vite puis publication de `dist/` sur GitHub Pages.
Réglage à faire une seule fois : **Settings > Pages > Source = GitHub Actions**.
Lancement manuel possible : onglet Actions > « Deploy (GitHub Pages) » > Run workflow.
Adresse : https://mazklaus.github.io/rouler-trouver/
