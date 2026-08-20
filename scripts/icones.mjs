/**
 * Génère les icônes PNG du manifeste à partir des SVG de `public/`.
 *
 * Pourquoi des PNG : Chromium refuse d'installer une PWA dont le manifeste
 * ne déclare que des icônes SVG en `sizes: "any"` — l'installation Android
 * retombe alors sur un simple signet, qui rouvre le navigateur au lieu de
 * lancer l'app. Un joueur croirait avoir installé Terra Mortis et se
 * retrouverait sans hors-ligne, sur le terrain, le soir.
 *
 * Les SVG restent la SOURCE : on ne retouche jamais un PNG à la main, on
 * relance `npm run icones`.
 *
 * Rastériseur : @resvg/resvg-js — rendu SVG dédié, binaire préconstruit,
 * 4,3 Mo installés contre 28,4 Mo pour sharp (qui embarque libvips).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/** Chaque PNG du manifeste, avec sa source et son côté en pixels. */
const ICONES = [
  { source: 'icon.svg', sortie: 'icon-192.png', cote: 192 },
  { source: 'icon.svg', sortie: 'icon-512.png', cote: 512 },
  { source: 'icon-maskable.svg', sortie: 'icon-maskable-512.png', cote: 512 },
]

for (const { source, sortie, cote } of ICONES) {
  const svg = readFileSync(join(PUBLIC, source), 'utf8')
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: cote } }).render().asPng()

  // Les dimensions se relisent dans l'en-tête IHDR : un rendu muet qui
  // sortirait à la mauvaise taille ne doit pas atteindre le dépôt.
  const largeur = png.readUInt32BE(16)
  const hauteur = png.readUInt32BE(20)
  if (largeur !== cote || hauteur !== cote) {
    throw new Error(`${sortie} : ${largeur}×${hauteur} rendu au lieu de ${cote}×${cote}`)
  }

  writeFileSync(join(PUBLIC, sortie), png)
  console.log(`${sortie} — ${largeur}×${hauteur}, ${png.length} octets (depuis ${source})`)
}
