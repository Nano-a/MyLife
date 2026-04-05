# MyLife

Monorepo basé sur `SPECS_MYLIFE_APP.md` : app web (Vite + React), logique partagée (`@mylife/core`), stub Firebase (`@mylife/firebase`).

## Démarrage

```bash
npm install
npm run dev --workspace=web
```

Ouvre `http://localhost:5173`. Première visite : écran de connexion → « Continuer (démo sans Firebase) ».

## Build

```bash
npm run build --workspace=@mylife/core
npm run build --workspace=web
```

## À venir (spec)

Expo (Android), Electron, sync Firestore réelle, exports PDF/xlsx, Web Workers pour calculs lourds, widget Android.
