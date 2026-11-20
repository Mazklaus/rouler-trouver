# Rouler-Trouver

Jeu d'exploration dont le seul but est de trouver des secrets cachés. Version web jouable dans le navigateur.

## Stack

| Rôle | Choix |
|---|---|
| Moteur | [Phaser 4](https://phaser.io) (2D, WebGL/Canvas) |
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
  main.ts        # configuration Phaser
  scenes/        # une scène Phaser par fichier (PascalCase)
  **/*.test.ts   # tests à côté du code testé
public/          # assets statiques copiés tels quels
```

## Conventions

Voir [CONTRIBUTING.md](CONTRIBUTING.md).
