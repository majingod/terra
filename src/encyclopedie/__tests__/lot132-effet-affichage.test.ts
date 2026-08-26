/**
 * Lot corpus 1.3.2 (t017, arbitrages Q7–Q13 du 2026-08-26) — les corrections
 * d'AFFICHAGE (D14) des 11 fautes de la p.19 (objets du forgeron, runes),
 * de leurs jumelles du ch.2 (Critique, Backstab) et du Lexique p.3.
 *
 * ⛔ Aucune phrase du Tome n'est écrite ici : les comparaisons portent sur
 * des fragments arbitrés (Fred, t017), jamais sur une phrase entière.
 */
import { describe, expect, it } from 'vitest'
import { getRules } from '../../rules/load'
import { cartesDe, entreesDe, fragment, ongletsDeContenu, type Onglet, type OngletId } from '../modele'

const ONGLETS = ongletsDeContenu()
const PAR_ID = new Map<OngletId, Onglet>(ONGLETS.map((onglet) => [onglet.id, onglet]))

function onglet(id: OngletId): Onglet {
  const trouve = PAR_ID.get(id)
  expect(trouve, `onglet ${id}`).toBeDefined()
  return trouve!
}

const CARTES_DES_TABLES = entreesDe(onglet('competences')).flatMap((e) => cartesDe(e))

function carte(id: string) {
  const trouvee = CARTES_DES_TABLES.find((c) => c.id === id)
  expect(trouvee, `carte ${id}`).toBeDefined()
  return trouvee!
}

/** Nombre de phrases d'un texte : les « . » suivis d'un espace, plus la fin. */
function comptePhrases(texte: string): number {
  const milieux = texte.split('. ').length - 1
  const fin = texte.endsWith('.') ? 1 : 0
  return milieux + fin
}

const rules = getRules()
const forg = rules.tables_ch4.objets_forgeron.materiaux
const runes = rules.tables_ch4.runes
const classes = rules.branches_de_classes.classes

describe('lot corpus 1.3.2 — effet_affichage (D14)', () => {
  it('L1 — exactement 7 objets/runes portent un effet_affichage, sans couper ni ajouter de phrase', () => {
    const objets = forg.flatMap((materiau) => materiau.objets)
    const avecAffichage = [
      ...objets.filter((o) => o.effet_affichage !== undefined),
      ...runes.runes_arme.filter((r) => r.effet_affichage !== undefined),
      ...runes.runes_amulette.filter((r) => r.effet_affichage !== undefined),
    ]
    expect(avecAffichage).toHaveLength(7)
    expect(objets.filter((o) => o.effet_affichage !== undefined)).toHaveLength(5)
    expect(runes.runes_arme.filter((r) => r.effet_affichage !== undefined)).toHaveLength(1)
    expect(runes.runes_amulette.filter((r) => r.effet_affichage !== undefined)).toHaveLength(1)

    for (const item of avecAffichage) {
      const affichage = item.effet_affichage!
      expect(affichage).not.toBe(item.effet_verbatim)
      expect(affichage.trim().length).toBeGreaterThan(0)
      expect(comptePhrases(affichage), item.effet_verbatim).toBe(comptePhrases(item.effet_verbatim))
    }
  })

  it('L2 — « Arme vicieuse » (rune d’arme) : affiché corrigé, verbatim intact', () => {
    const armeVicieuse = carte(`rune:${fragment('Arme vicieuse')}`)
    expect(armeVicieuse.source?.affichage ?? '').toContain('si touchée dans le dos')
    expect(armeVicieuse.source?.affichage ?? '').toContain('peut être combiné')
    expect(armeVicieuse.source?.affichage ?? '').toContain('capacité Backstab')
    expect(armeVicieuse.source?.verbatim ?? '').toContain('si touchés')
    expect(armeVicieuse.source?.verbatim ?? '').toContain('peut-être combiner')
  })

  it('L3 — l’arme Aurorium (objet du forgeron) : affiché corrigé, verbatim intact', () => {
    const armeAurorium = carte(`objet:${fragment('Aurorium')}:${fragment('arme')}`)
    expect(armeAurorium.source?.affichage ?? '').toContain('peut se briser')
    expect(armeAurorium.source?.affichage ?? '').toContain('si raté')
    expect(armeAurorium.source?.verbatim ?? '').toContain('peu se briser')
    expect(armeAurorium.source?.verbatim ?? '').toContain('si rater')
  })

  it('L4 (jumelle) — une rune sans effet_affichage (« Arme de feu ») n’a pas de source.affichage', () => {
    const armeDeFeu = carte(`rune:${fragment('Arme de feu')}`)
    expect(armeDeFeu.source?.affichage).toBeUndefined()
    const rune = runes.runes_arme.find((r) => r.nom === 'Arme de feu')!
    expect(rune.effet_affichage).toBeUndefined()
    expect(armeDeFeu.source?.verbatim).toBe(rune.effet_verbatim)
  })

  it('L5 — les deux note_affichage Q12 existent et commencent par « Q12 A »', () => {
    const adamantiumArme = forg[0].objets.find((o) => o.type === 'arme')!
    expect(adamantiumArme.note_affichage).toBeDefined()
    expect(adamantiumArme.note_affichage!.startsWith('Q12 A')).toBe(true)

    const lexique = rules.regles_de_base.sections[6] as { note_affichage?: string }
    expect(lexique.note_affichage).toBeDefined()
    expect(lexique.note_affichage!.startsWith('Q12 A')).toBe(true)
  })

  it('L6 (jumelles ch.2) — Critique et Backstab affichent la faute corrigée, verbatim intact', () => {
    const critique = classes[1].branches[1].capacites[4]
    expect(critique.affichage ?? '').toContain('si raté')
    expect(critique.verbatim).toContain('si rater')

    const backstab = classes[3].branches[0].capacites[0]
    expect(backstab.affichage ?? '').toContain('si touchée dans le dos')
    expect(backstab.verbatim).toContain('si touchés dans le dos')
  })
})
