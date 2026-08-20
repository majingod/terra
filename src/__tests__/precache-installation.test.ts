/**
 * Le precache du service worker — ce qui sera VRAIMENT sur l'appareil du
 * joueur quand le réseau manquera.
 *
 * Les icônes PNG doivent y être (sans elles, une installation faite hors
 * réseau n'aurait pas son icône), et `version.json` ne doit JAMAIS y être :
 * précaché, il mentirait sur la version réellement en ligne.
 *
 * `it.runIf` plutôt qu'un `return` : sans build, l'inactivité reste visible
 * dans le compte.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(RACINE, 'dist')
const BUILDE = existsSync(DIST)

/** Les entrées attendues à coup sûr — le reste est nommé par empreinte. */
const ATTENDUES = [
  'icon.svg',
  'icon-maskable.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'index.html',
  'registerSW.js',
]

const ENTREES_ATTENDUES = 19
const PLAFOND_KIO = 640

/** Les URL précachées, lues dans le `sw.js` réellement généré. */
function urlsPrecachees(): string[] {
  const sw = readFileSync(join(DIST, 'sw.js'), 'utf8')
  return [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
}

describe('Precache du service worker', () => {
  it.runIf(BUILDE)('les cinq icônes, la page et registerSW.js y sont', () => {
    const urls = new Set(urlsPrecachees())
    for (const attendue of ATTENDUES) {
      expect(urls.has(attendue), `${attendue} absent du precache`).toBe(true)
    }
  })

  it.runIf(BUILDE)('⛔ version.json n’y est pas', () => {
    expect(urlsPrecachees()).not.toContain('version.json')
  })

  it.runIf(BUILDE)(`le precache compte ${ENTREES_ATTENDUES} entrées`, () => {
    const urls = urlsPrecachees()
    // Le message porte la LISTE : un écart doit se lire sans relancer le build.
    expect(urls.length, `entrées réelles :\n${urls.join('\n')}`).toBe(ENTREES_ATTENDUES)
  })

  it.runIf(BUILDE)(`le precache pèse au plus ${PLAFOND_KIO} Kio`, () => {
    const octets = urlsPrecachees().reduce((total, url) => total + statSync(join(DIST, url)).size, 0)
    // Plafond, jamais égalité : une égalité rougirait à chaque octet ajouté.
    expect(octets / 1024).toBeLessThanOrEqual(PLAFOND_KIO)
  })
})
