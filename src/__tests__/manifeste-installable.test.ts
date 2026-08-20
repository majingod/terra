/**
 * Le manifeste et ses icônes — la cause mesurée n° 3.
 *
 * Un manifeste qui ne déclare que des icônes SVG en `sizes: "any"` fait
 * échouer l'installation sous Chromium : Android retombe sur un simple
 * signet, qui rouvre le navigateur au lieu de lancer l'app. Le joueur croit
 * avoir installé Terra Mortis et se retrouve SANS hors-ligne, sur le
 * terrain, le soir.
 *
 * Les assertions sur `dist/` ne s'exécutent qu'après `npm run build`
 * (`it.runIf` : l'inactivité reste VISIBLE dans le compte — un test qui
 * ferait `return` serait compté comme passé).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(RACINE, 'dist')
const PUBLIC = join(RACINE, 'public')
const BUILDE = existsSync(DIST)

interface IconeManifeste {
  src: string
  sizes: string
  type: string
  purpose: string
}

function iconesDuManifeste(): IconeManifeste[] {
  const manifeste = JSON.parse(
    readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'),
  ) as { icons: IconeManifeste[] }
  return manifeste.icons
}

/** Largeur et hauteur lues dans l'en-tête IHDR du fichier PNG lui-même. */
function dimensionsPng(fichier: string): { largeur: number; hauteur: number } {
  const octets = readFileSync(join(PUBLIC, fichier))
  const signature = octets.subarray(0, 8).toString('hex')
  expect(signature, `${fichier} n’est pas un PNG`).toBe('89504e470d0a1a0a')
  expect(octets.subarray(12, 16).toString('ascii'), `${fichier} : chunk IHDR absent`).toBe('IHDR')
  return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) }
}

describe('Manifeste : des icônes qui installent vraiment', () => {
  it.runIf(BUILDE)('⛔ aucune icône SVG dans le manifeste', () => {
    expect(iconesDuManifeste().filter((i) => i.type === 'image/svg+xml')).toEqual([])
  })

  it.runIf(BUILDE)('⛔ aucune icône en `sizes: "any"`', () => {
    expect(iconesDuManifeste().filter((i) => i.sizes === 'any')).toEqual([])
  })

  it.runIf(BUILDE)('jumelle : les trois icônes PNG attendues, et exactement elles', () => {
    const icones = iconesDuManifeste()
    const empreinte = (i: IconeManifeste) => `${i.sizes} ${i.type} ${i.purpose}`
    expect(icones.map(empreinte).sort()).toEqual(
      [
        '192x192 image/png any',
        '512x512 image/png any',
        '512x512 image/png maskable',
      ].sort(),
    )
  })
})

describe('Icônes : de vraies images, aux dimensions déclarées', () => {
  it('icon-192.png mesure 192 × 192 dans son en-tête IHDR', () => {
    expect(dimensionsPng('icon-192.png')).toEqual({ largeur: 192, hauteur: 192 })
  })

  it('icon-512.png mesure 512 × 512 dans son en-tête IHDR', () => {
    expect(dimensionsPng('icon-512.png')).toEqual({ largeur: 512, hauteur: 512 })
  })

  it('icon-maskable-512.png mesure 512 × 512 dans son en-tête IHDR', () => {
    expect(dimensionsPng('icon-maskable-512.png')).toEqual({ largeur: 512, hauteur: 512 })
  })
})
