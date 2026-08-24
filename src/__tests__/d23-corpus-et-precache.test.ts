/**
 * D23 · G9 et G10 — ce lot est un lot de LOGIQUE.
 *
 * ⛔ Un lot de logique ne change pas un octet des corpus, et ne fait pas
 * grossir ce qui part sur l'appareil du joueur. Les deux gates le prouvent par
 * mesure, pas par relecture : une empreinte sha256 par corpus, et le poids réel
 * sur disque des URL précachées.
 *
 * `it.runIf` et non `if (…) return` : un test qui `return` est compté PASSÉ, et
 * un test toujours vert ne garde rien. Le poids se mesure donc quand `dist/`
 * existe — c'est-à-dire en CI, après le build.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DONNEES = join(RACINE, 'src', 'data')
const DIST = join(RACINE, 'dist')
const SW = join(DIST, 'sw.js')
const IL_Y_A_UN_BUILD = existsSync(SW)

/**
 * Les trois corpus, aux empreintes du départ du lot (origin/main = 5324088).
 * D24 met à jour `rules_kids.json` (1.0.0 → 1.1.0, métier + langues) : ce
 * lot-ci n'est pas un lot de logique pure, c'est l'arbitrage attendu.
 */
const EMPREINTES: Record<string, string> = {
  'rules.json': '49dcf0308d87e3a031731ec158ab9459cdc3e913839945048fff394c55f2874b',
  'rules_kids.json': 'e4eb58b87596a4041ca95dc104a92a2f9502ac553793803739575381373998db',
  'tome_extraits.json': '24f4f45838f318f609bc8b701511b0f872defbefd841a41bd11ac1b103ec9462',
}

/** Le plafond du brief. ⛔ Il ne se monte pas depuis un lot — c'est un arbitrage. */
const PLAFOND_KIB = 700

/** Les URL uniques de `precacheAndRoute([...])`, dans l'ordre du fichier. */
function urlsPrecachees(): string[] {
  const sw = readFileSync(SW, 'utf8')
  const debut = sw.indexOf('precacheAndRoute([')
  const fin = sw.indexOf(']', debut)
  return [...new Set([...sw.slice(debut, fin).matchAll(/url:"([^"]+)"/g)].map((m) => m[1]))]
}

describe('D23 · G9 — les corpus sont intouchés à l’octet', () => {
  for (const [fichier, attendue] of Object.entries(EMPREINTES)) {
    it(`${fichier} n’a pas bougé d’un octet`, () => {
      const reelle = createHash('sha256').update(readFileSync(join(DONNEES, fichier))).digest('hex')
      expect(
        reelle,
        `${fichier} a changé. Un lot de LOGIQUE ne touche pas au contenu du jeu — si c'est voulu, c'est un arbitrage.`,
      ).toBe(attendue)
    })
  }
})

describe('D23 · G10 — le precache reste sous le plafond', () => {
  it.runIf(IL_Y_A_UN_BUILD)(`le poids sur disque des URL uniques ≤ ${PLAFOND_KIB} KiB`, () => {
    const urls = urlsPrecachees()
    const octets = urls.reduce((somme, url) => {
      const chemin = join(DIST, url)
      expect(existsSync(chemin), `précaché mais absent de dist/ : ${url}`).toBe(true)
      return somme + statSync(chemin).size
    }, 0)

    const kib = octets / 1024
    expect(kib, `poids réel : ${kib.toFixed(2)} KiB sur ${urls.length} URL uniques`).toBeLessThanOrEqual(
      PLAFOND_KIB,
    )
  })

  it.runIf(IL_Y_A_UN_BUILD)('⛔ aucun fichier n’est entré ni sorti du bundle', () => {
    // Un lot de logique ne change pas le JEU de ce qui part sur l'appareil.
    expect(urlsPrecachees().length).toBe(17)
  })
})
