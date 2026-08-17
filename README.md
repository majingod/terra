# Terra Mortis

Application compagnon pour le GN familial **Terra Mortis** — PWA offline-first en français.

## Stack

- Vite + React + TypeScript
- `vite-plugin-pwa` (installable, fonctionne hors ligne)
- Dexie (IndexedDB) pour le stockage local des fiches
- Tailwind CSS (haute lisibilité, grands boutons)
- React Router

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Statut

Scaffold initial (phase 1). Aucune règle de jeu n'est encore intégrée
(`src/data/rules.json` est un placeholder) — le contenu sera livré séparément.
Pas de backend/Supabase à ce stade.
