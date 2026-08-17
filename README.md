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

## Tests

```bash
npm test          # vitest run
npm run lint      # tsc --noEmit
```

## Statut

Fondations données (brief #02-a) : `src/data/rules.json` (v1.0.0) est la source
unique des règles (D5), `src/data/tome_extraits.json` sert uniquement de témoin
à la gate de fidélité et n'est jamais lu par l'app. Magasin local Dexie
(`src/db/db.ts`, base `terra` v1) avec harnais de migration D7. Aucune UI n'est
branchée sur ces modules à ce stade. Pas de backend/Supabase.
