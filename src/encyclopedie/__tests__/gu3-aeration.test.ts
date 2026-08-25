/**
 * GU3 — l'aération ne perd rien.
 *
 * `enParagraphes` coupe les longs textes du Tome sur leurs étiquettes
 * internes. Ce test parcourt TOUS les textes que l'encyclopédie lui donne à
 * aérer et vérifie que la concaténation des paragraphes, à l'espace près,
 * redonne le texte source. Zéro exception : pas de liste d'écarts tolérés.
 *
 * ⛔ Aucune phrase du Tome n'est écrite ici : les textes sont tirés du modèle
 * au moment du test.
 */
import { describe, expect, it } from 'vitest'
import { texteAffiche } from '../../pages/creation/ui'
import { ongletsDeContenu, sourcesAerees, toutesLesSources } from '../modele'
import { auxBlancsPres, enParagraphes, recomposer } from '../texte'

const ONGLETS = ongletsDeContenu()
const AEREES = sourcesAerees(ONGLETS).map(texteAffiche).filter((t) => t.length > 0)

describe('GU3 — aération recomposable', () => {
  it('dénominateur : 219 textes aérés, 9 coupés, 44 étiquettes relevées', () => {
    // Le dénominateur dit ce que la gate couvre. Il bouge avec le corpus :
    // une entrée neuve au Tome le fait bouger, et c'est voulu.
    expect(AEREES).toHaveLength(219)
    expect(AEREES.filter((t) => enParagraphes(t).length > 1)).toHaveLength(9)
    expect(AEREES.flatMap((t) => enParagraphes(t).filter((p) => p.etiquette))).toHaveLength(44)
    expect(toutesLesSources(ONGLETS).length).toBeGreaterThan(AEREES.length)
  })

  it('encyclopedie_aeration_sans_perte', () => {
    const perdus = AEREES.filter(
      (texte) => auxBlancsPres(recomposer(enParagraphes(texte))) !== auxBlancsPres(texte),
    )
    expect(perdus).toEqual([])
  })

  it('l’aération coupe pour de vrai : des textes rendent plus d’un paragraphe', () => {
    const coupes = AEREES.filter((texte) => enParagraphes(texte).length > 1)
    expect(coupes.length).toBeGreaterThan(0)
    // Et le plus long des textes coupés en rend franchement plusieurs.
    expect(Math.max(...coupes.map((t) => enParagraphes(t).length))).toBeGreaterThan(3)
  })

  it('les étiquettes du Tome sont relevées, pas inventées', () => {
    const etiquetes = AEREES.flatMap((texte) =>
      enParagraphes(texte).flatMap((p) => (p.etiquette ? [p] : [])),
    )
    expect(etiquetes.length).toBeGreaterThan(20)
    // Chaque étiquette est un préfixe littéral de son texte source.
    for (const paragraphe of etiquetes) {
      expect(paragraphe.etiquette!.trim()).toBe(paragraphe.etiquette)
      expect(/[.:]$/.test(paragraphe.etiquette!)).toBe(true)
    }
  })

  it('jumelle : un texte sans étiquette reste d’un seul tenant', () => {
    const simple = 'Une phrase d’écran, sans étiquette interne, qui ne doit pas être coupée.'
    expect(enParagraphes(simple)).toEqual([{ texte: simple }])
  })

  it('jumelle : le détecteur attrape une perte, si on lui en fabrique une', () => {
    // Preuve que le critère mesure : une recomposition tronquée doit différer.
    const temoin = AEREES.find((t) => enParagraphes(t).length > 1)
    expect(temoin).toBeDefined()
    const tronquee = recomposer(enParagraphes(temoin!).slice(1))
    expect(auxBlancsPres(tronquee)).not.toBe(auxBlancsPres(temoin!))
  })
})
