import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * `version.json` — fiche d'identité publique du site déployé, servie à la
 * racine. Elle dit quel commit est en ligne et quelle version des deux corpus
 * il contient, pour qu'on sache en une seconde si un joueur regarde la
 * dernière version ou une page gardée en cache par son téléphone.
 *
 * ⚠️ Fichier PUBLIC : aucun nom, aucune donnée de joueur, aucune PII.
 * ⚠️ Les numéros de version se LISENT au build depuis les fichiers de règles
 *    eux-mêmes (D5 : une seule maison de la vérité). Rien n'est recopié ici.
 * ⚠️ Exclu du precache (`globIgnores`) : précaché, il serait servi depuis le
 *    cache et MENTIRAIT sur la version réellement en ligne.
 */
const VERSION_JSON = 'version.json'

function versionDesRegles(chemin: string): string {
  const corpus = JSON.parse(
    readFileSync(new URL(chemin, import.meta.url), 'utf8'),
  ) as { meta: { version: string } }
  return corpus.meta.version
}

function ficheDeVersion(): Plugin {
  return {
    name: 'terra-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: VERSION_JSON,
        source:
          JSON.stringify(
            {
              commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
              branche: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
              date: new Date().toISOString(),
              rules: versionDesRegles('./src/data/rules.json'),
              rules_kids: versionDesRegles('./src/data/rules_kids.json'),
            },
            null,
            2,
          ) + '\n',
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    ficheDeVersion(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: [
        'icon.svg',
        'icon-maskable.svg',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
      ],
      manifest: {
        id: '/',
        name: 'Terra Mortis',
        short_name: 'Terra Mortis',
        description:
          "Compagnon de jeu pour le GN Terra Mortis : création de personnage, fiches et encyclopédie, utilisable hors ligne.",
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f0d0c',
        theme_color: '#0f0d0c',
        categories: ['utilities'],
        // ⛔ AUCUNE icône SVG ici. Un manifeste qui ne déclare que des SVG
        // en `sizes: "any"` fait échouer l'installation Android : Chromium
        // retombe sur un signet, qui rouvre le navigateur au lieu de lancer
        // l'app — hors ligne perdu, sur le terrain. Les PNG se régénèrent
        // depuis les SVG avec `npm run icones` (scripts/icones.mjs).
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
        // version.json doit dire la vérité sur ce qui est EN LIGNE : jamais
        // précaché, jamais servi depuis le cache.
        globIgnores: [VERSION_JSON],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
