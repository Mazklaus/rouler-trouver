# Conventions

## Branches

- `main` est protégée : on n'y pousse jamais directement, tout passe par une PR.
- Nom de branche : `<type>/<sujet-court>`, par exemple `feat/prototype-boucle`, `ci/deploy-pages`, `fix/collision-mur`.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/fr/) :

```
<type>(<portée optionnelle>): <résumé au présent, en minuscules>
```

Types : `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `build`, `chore`, `asset`.

Exemples :

```
feat(joueur): déplacement au clavier
ci: déploiement GitHub Pages
asset: sprites provisoires du niveau 1
```

## Pull requests

- Une PR = un sujet. Petite de préférence.
- La CI doit être verte (typecheck, tests, build).
- Relecture et merge par le Lead Programmer (squash merge).

## Code

- TypeScript strict, pas de `any` sans commentaire justifiant.
- Une scène 3D par fichier dans `src/scenes/`, classes en PascalCase, fichiers nommés comme la classe.
- La logique de jeu pure (règles, état, secrets) va dans `src/game/`, sans Three.js ni Rapier, pour être testable avec Vitest.
- Unités : 1 unité = 1 mètre, axe Y vers le haut (convention Three.js et Rapier).
- Rapier s'initialise une fois (`await RAPIER.init()`) avant de créer le monde ; pas de pas de simulation variable : pas fixe de 1/60 s.
- Libérer les ressources Three.js (`geometry.dispose()`, `material.dispose()`) quand un niveau est retiré.
- Code et noms en anglais, commentaires et docs en français.
