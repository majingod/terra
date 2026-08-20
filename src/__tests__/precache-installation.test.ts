/**
 * Les icônes PNG dans le precache du service worker — ce qui sera VRAIMENT
 * sur l'appareil du joueur quand le réseau manquera.
 *
 * Sans elles au precache, une app installée puis ouverte hors réseau n'a pas
 * son icône, et le manifeste pointe vers des fichiers que le service worker
 * ne sait pas servir.
 *
 * ⚠️ Le COMPTE d'entrées, le POIDS et le jeu exact des URL sont gardés par
 * `d16-precache.test.ts` (une seule maison de la vérité) ; l'absence de
 * `version.json` du precache l'est par `version-json.test.ts`. Ce fichier ne
 * garde que les trois PNG, nommés un par un.
 *
 * `it.runIf` et non `if (…) return` : sans build, l'inactivité reste visible
 * dans le compte.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(RACINE, 'dist')
const SW = join(DIST, 'sw.js')
const IL_Y_A_UN_BUILD = existsSync(SW)

const PNG_DU_MANIFESTE = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']

/** Les URL précachées, lues dans le `sw.js` réellement généré. */
function urlsPrecachees(): string[] {
  const sw = readFileSync(SW, 'utf8')
  const debut = sw.indexOf('precacheAndRoute([')
  const fin = sw.indexOf(']', debut)
  return [...sw.slice(debut, fin).matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
}

describe('Precache : les icônes PNG partent avec l’app', () => {
  for (const png of PNG_DU_MANIFESTE) {
    it.runIf(IL_Y_A_UN_BUILD)(`${png} est précaché`, () => {
      const urls = urlsPrecachees()
      expect(urls.includes(png), `${png} absent du precache. Entrées :\n${urls.join('\n')}`).toBe(
        true,
      )
    })
  }
})
