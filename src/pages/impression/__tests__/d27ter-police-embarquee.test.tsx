// @vitest-environment jsdom
/**
 * D27-ter (t014) — la feuille imprimée ne dépend plus de la police de
 * l'appareil.
 *
 * Le sinistre : sur la tablette de l'organisateur, la feuille A4 sortait en
 * 3 pages (en-tête orphelin, corps, queue) pour TOUTES les classes, alors que
 * la gate d'impression passait ici. Cause mesurée : la feuille demandait
 * Arial, absente d'Android ; le système substituait une police plus large, et
 * 2 mm de jeu ne suffisaient pas. `page-break-inside: avoid` sur le corps
 * transformait ensuite un dépassement de 2 mm en en-tête orphelin.
 *
 * Quatre gardes, et ce fichier ROUGIT sur `origin/main` (d22fd43) :
 *   ① la feuille déclare TerraSans en premier, embarquée par `polices.css` ;
 *   ② les deux woff2 existent et pèsent moins de 10 KiB chacun (precache) ;
 *   ③ le corps ne porte plus `page-break-inside: avoid` ;
 *   ④ l'impression attend `document.fonts.ready` avant `window.print()` ;
 *   ⑤ la page est LETTRE (papier du Québec), plus A4.
 * La géométrie elle-même (8 classes = 1 page A4) reste la gate d'impression
 * de l'architecte, hors jsdom.
 */
// @vitest-environment jsdom
// @vitest-environment jsdom
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { CSS_PAGE } from '../css'
import { imprimerQuandLesPolicesSontLa } from '../PageImpression'

const ICI = dirname(fileURLToPath(import.meta.url))
const IMPRESSION = join(ICI, '..')
const feuille = readFileSync(join(IMPRESSION, 'feuille.css'), 'utf8')
// Sur `origin/main` le fichier n'existe pas : on veut un rouge lisible, pas un plantage.
const CHEMIN_POLICES = join(IMPRESSION, 'polices.css')
const polices = existsSync(CHEMIN_POLICES) ? readFileSync(CHEMIN_POLICES, 'utf8') : ''

describe('D27-ter ① — la feuille demande SA police, pas celle de l’appareil', () => {
  it('font-family de .tm-feuille commence par TerraSans', () => {
    const regle = feuille.match(/\.tm-feuille\{[^}]*font-family:([^;}]+)/)
    expect(regle, 'font-family de .tm-feuille introuvable').toBeTruthy()
    expect(regle![1].trim().split(',')[0].trim()).toBe('TerraSans')
  })

  it('polices.css embarque TerraSans en 400 et 700, sans repli silencieux', () => {
    const faces = polices.match(/@font-face\{[^}]*\}/g) ?? []
    const graisses = faces
      .filter((f) => /font-family:TerraSans/.test(f) && /font-display:block/.test(f))
      .map((f) => f.match(/font-weight:(\d+)/)?.[1])
      .sort()
    expect(graisses).toEqual(['400', '700'])
  })

  it('le composant charge polices.css avant feuille.css', () => {
    const composant = readFileSync(join(IMPRESSION, 'FeuilleImpression.tsx'), 'utf8')
    expect(composant.indexOf("import './polices.css'")).toBeGreaterThan(-1)
    expect(composant.indexOf("import './polices.css'")).toBeLessThan(
      composant.indexOf("import './feuille.css'"),
    )
  })
})

describe('D27-ter ② — les deux woff2 sont là et restent légers', () => {
  for (const nom of ['TerraSans-Regular.woff2', 'TerraSans-Bold.woff2']) {
    it(`${nom} existe et pèse moins de 10 KiB`, () => {
      const chemin = join(IMPRESSION, 'polices', nom)
      expect(existsSync(chemin), chemin).toBe(true)
      expect(statSync(chemin).size / 1024).toBeLessThan(10)
    })
  }
  it('la licence OFL accompagne la police renommée', () => {
    const licence = readFileSync(join(IMPRESSION, 'polices', 'LICENCE-TerraSans.txt'), 'utf8')
    expect(licence).toMatch(/SIL Open Font License/)
    expect(licence).toMatch(/Liberation/)
  })
})

describe('D27-ter ③ — un dépassement ne fabrique plus d’en-tête orphelin', () => {
  it('le corps ne porte pas page-break-inside: avoid', () => {
    const corps = feuille.match(/\.tm-feuille \.corps\{[^}]*\}/)
    expect(corps, '.tm-feuille .corps introuvable').toBeTruthy()
    expect(corps![0]).not.toMatch(/break-inside\s*:\s*avoid/)
  })
})

describe('D27-ter ④ — l’impression attend les polices', () => {
  it('window.print ne part qu’une fois document.fonts.ready résolu', async () => {
    let liberer: () => void = () => {}
    const ready = new Promise<void>((resolve) => {
      liberer = resolve
    })
    Object.defineProperty(document, 'fonts', { value: { ready }, configurable: true })
    const print = vi.fn()
    window.print = print

    const attente = imprimerQuandLesPolicesSontLa()
    await Promise.resolve()
    expect(print, 'imprimé avant que les polices soient là').not.toHaveBeenCalled()

    liberer()
    await attente
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('sans document.fonts (jsdom), on imprime tout de suite', async () => {
    Object.defineProperty(document, 'fonts', { value: undefined, configurable: true })
    const print = vi.fn()
    window.print = print
    await imprimerQuandLesPolicesSontLa()
    expect(print).toHaveBeenCalledTimes(1)
  })
})

describe('D27-ter ⑤ — le papier est Lettre, pas A4', () => {
  it('@page déclare size: letter portrait', () => {
    expect(CSS_PAGE).toMatch(/size:\s*letter portrait/)
    expect(CSS_PAGE).not.toMatch(/A4/)
  })
})
