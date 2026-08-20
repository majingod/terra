/**
 * Le manifeste et ses icônes — la cause technique n° 1 de « j'ai installé
 * l'app et elle n'est pas là ».
 *
 * Un manifeste qui ne déclare que des icônes SVG en `sizes: "any"` fait
 * échouer l'installation sous Chromium : Android retombe sur un simple
 * signet, qui rouvre le navigateur au lieu de lancer l'app. Le joueur croit
 * avoir installé Terra Mortis et se retrouve SANS hors-ligne, sur le
 * terrain, le soir.
 *
 * Les assertions sur `dist/` ne s'exécutent qu'après `npm run build`
 * (`it.runIf` : l'inactivité reste VISIBLE dans le compte — un test qui
 * ferait `return` serait compté comme passé, et un test toujours vert ne
 * garde rien).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(RACINE, 'dist')
const PUBLIC = join(RACINE, 'public')
const IL_Y_A_UN_BUILD = existsSync(join(DIST, 'manifest.webmanifest'))

interface IconeManifeste {
  src: string
  sizes: string
  type: string
  purpose: string
}

/** Les icônes du manifeste RÉELLEMENT généré, pas celles du fichier source. */
function iconesDuManifeste(): IconeManifeste[] {
  const manifeste = JSON.parse(
    readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'),
  ) as { icons: IconeManifeste[] }
  return manifeste.icons
}

/** Largeur et hauteur lues dans l'en-tête IHDR du PNG lui-même. */
function dimensionsPng(fichier: string): { largeur: number; hauteur: number } {
  const octets = readFileSync(join(PUBLIC, fichier))
  expect(octets.subarray(0, 8).toString('hex'), `${fichier} n’est pas un PNG`).toBe(
    '89504e470d0a1a0a',
  )
  expect(octets.subarray(12, 16).toString('ascii'), `${fichier} : chunk IHDR absent`).toBe('IHDR')
  return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) }
}

describe('Manifeste : des icônes qui installent vraiment', () => {
  it.runIf(IL_Y_A_UN_BUILD)('⛔ aucune icône `image/svg+xml` dans le manifeste', () => {
    const svg = iconesDuManifeste().filter((i) => i.type === 'image/svg+xml')
    expect(svg, `icônes SVG déclarées :\n${JSON.stringify(svg, null, 2)}`).toEqual([])
  })

  it.runIf(IL_Y_A_UN_BUILD)('⛔ aucune icône en `sizes: "any"`', () => {
    const floues = iconesDuManifeste().filter((i) => i.sizes === 'any')
    expect(floues, `icônes sans taille déclarée :\n${JSON.stringify(floues, null, 2)}`).toEqual([])
  })

  it.runIf(IL_Y_A_UN_BUILD)('jumelle : les trois icônes PNG attendues, et exactement elles', () => {
    const icones = iconesDuManifeste()
    const empreinte = (i: IconeManifeste) => `${i.sizes} ${i.type} ${i.purpose}`
    expect(icones.map(empreinte).sort()).toEqual(
      ['192x192 image/png any', '512x512 image/png any', '512x512 image/png maskable'].sort(),
    )
  })
})

describe('Icônes : de vraies images, aux dimensions déclarées', () => {
  // ⚠️ Les dimensions se lisent dans l'en-tête du fichier, jamais son
  // existence ni son poids : un fichier vide, ou un SVG renommé `.png`,
  // passerait un test de présence et casserait l'installation.
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

describe('iOS : l’apple-touch-icon', () => {
  // iOS ignore un apple-touch-icon en SVG — l'écran d'accueil se retrouve
  // avec une vignette de la page au lieu de l'icône. Assertion sur la SOURCE
  // (`index.html`), donc aucun build requis.
  it('index.html pointe apple-touch-icon vers un .png', () => {
    const html = readFileSync(join(RACINE, 'index.html'), 'utf8')
    const lien = /<link[^>]*rel="apple-touch-icon"[^>]*>/.exec(html)?.[0]
    expect(lien, 'aucun <link rel="apple-touch-icon"> dans index.html').toBeTruthy()
    const href = /href="([^"]+)"/.exec(lien as string)?.[1]
    expect(href, `apple-touch-icon → ${href}`).toMatch(/\.png$/)
  })
})
