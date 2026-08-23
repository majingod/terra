/**
 * Le precache du service worker — le jeu exact de ce qui part sur l'appareil.
 *
 * Écrit pour D16 ⑪ (un changement de LOGIQUE : aucun fichier ne devait entrer
 * ni sortir du bundle), ce garde-fou reste la seule maison de la vérité du
 * COMPTE, du JEU d'URL et du POIDS précachés — aux empreintes de contenu
 * près, qui changent à chaque build.
 *
 * Mis à jour par le lot « icônes PNG » : les trois PNG du manifeste entrent
 * au precache, 16 entrées deviennent 19. Sans elles, une app installée puis
 * ouverte hors réseau n'aurait pas son icône.
 *
 * `it.runIf` et non `if (…) return` : un test qui `return` est compté PASSÉ,
 * et un test toujours vert ne garde rien.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(RACINE, 'dist')
const SW = join(DIST, 'sw.js')
const IL_Y_A_UN_BUILD = existsSync(SW)

/**
 * Mesuré au commit de départ du lot « icônes PNG » (671c5f7) : 16 entrées,
 * 571,81 KiB — plus les trois PNG du manifeste ajoutés par ce lot.
 */
const ENTREES_ATTENDUES = 19
/**
 * Plafond du brief.
 *
 * t012 — le gabarit d'impression coûte ~18 KiB, plafond relevé par
 * l'organisateur, 2026-08-23. La feuille pleine page des 8 classes
 * (`src/pages/impression/`) entre au bundle : 627,82 → 646,00 KiB, à jeu
 * d'URL et compte d'entrées INCHANGÉS (19 entrées / 17 URL). Le plafond
 * passe de 640 à 700 KiB pour rouvrir de la marge — c'est un arbitrage de
 * l'organisateur, jamais une décision du lot.
 */
const PLAFOND_KIB = 700

/** Le jeu d'URL précachées, empreintes de contenu retirées. */
const URLS_ATTENDUES = [
  'assets/cinzel-latin-400-normal.woff2',
  'assets/cinzel-latin-600-normal.woff2',
  'assets/cinzel-latin-700-normal.woff2',
  'assets/cinzel-latin-900-normal.woff2',
  'assets/crimson-text-latin-400-italic.woff2',
  'assets/crimson-text-latin-400-normal.woff2',
  'assets/crimson-text-latin-600-normal.woff2',
  'assets/index.css',
  'assets/index.js',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'icon-maskable.svg',
  'icon.svg',
  'index.html',
  'manifest.webmanifest',
  'registerSW.js',
]

/** Les entrées de `precacheAndRoute([...])`, dans l'ordre du fichier. */
function entreesPrecache(): string[] {
  const sw = readFileSync(SW, 'utf8')
  const debut = sw.indexOf('precacheAndRoute([')
  const fin = sw.indexOf(']', debut)
  return [...sw.slice(debut, fin).matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
}

/**
 * « assets/index-B-QO9O2B.css » → « assets/index.css ». Seul `assets/` porte
 * des empreintes de contenu : `icon-maskable.svg` n'en est pas une.
 */
function sansEmpreinte(url: string): string {
  if (!url.startsWith('assets/')) return url
  return url.replace(/-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)$/, '$1')
}

describe('D16 ⑪ — precache du service worker', () => {
  it.runIf(IL_Y_A_UN_BUILD)('le compte d’entrées n’a pas bougé', () => {
    const urls = entreesPrecache()
    // Le message porte la LISTE : un écart se lit sans relancer le build.
    expect(urls.length, `entrées réelles :\n${urls.join('\n')}`).toBe(ENTREES_ATTENDUES)
  })

  it.runIf(IL_Y_A_UN_BUILD)('le jeu des URL est inchangé : aucun fichier ajouté ni retiré', () => {
    const urls = [...new Set(entreesPrecache().map(sansEmpreinte))].sort()
    expect(urls).toEqual(URLS_ATTENDUES)
  })

  it.runIf(IL_Y_A_UN_BUILD)(`le poids précaché reste sous ${PLAFOND_KIB} KiB`, () => {
    const octets = entreesPrecache().reduce((somme, url) => {
      const chemin = join(DIST, url)
      expect(existsSync(chemin), `précaché mais absent de dist/ : ${url}`).toBe(true)
      return somme + statSync(chemin).size
    }, 0)
    expect(octets / 1024).toBeLessThanOrEqual(PLAFOND_KIB)
  })
})
