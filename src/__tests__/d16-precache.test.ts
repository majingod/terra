/**
 * D16 ⑪ — le precache du service worker n'a pas bougé.
 *
 * Ce lot est un changement de LOGIQUE : aucun fichier n'entre dans le bundle,
 * aucun n'en sort. Le jeu des URL précachées doit donc rester le même (aux
 * empreintes de contenu près, qui changent à chaque build), leur compte aussi,
 * et le poids rester sous le plafond.
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

/** Mesuré au commit de départ de ce lot (572204a) : 16 entrées, 568,41 KiB. */
const ENTREES_ATTENDUES = 16
/** Plafond du brief. */
const PLAFOND_KIB = 640

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
    expect(entreesPrecache()).toHaveLength(ENTREES_ATTENDUES)
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
