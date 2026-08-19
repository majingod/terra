/**
 * t006 / D12 — baisser le niveau déclenche la fenêtre de répercussions
 * EXISTANTE, avec ses deux régimes et aucun troisième :
 * - l'impossible se retire tout seul et se nomme (une capacité achetée que
 *   la voie donne désormais d'office, cas d'une MONTÉE) ;
 * - le surplus se retire par le joueur (les dons en trop d'une BAISSE).
 *
 * Aucun nom ni chiffre de règle n'est écrit ici : la voie témoin, ses
 * capacités et les dons témoins sont tirés de rules.json.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { donsCumules, niveauMax, niveauMin } from '../../rules/niveau'
import { listeDons } from '../../rules/talents'
import { ETAPES, changerNiveau, surplusDons } from '../validation'
import type { FicheCreation } from '../types'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]
const HAUT = niveauMax()
const BAS = niveauMin()

/** Fiche témoin au niveau haut, avec autant de dons que le niveau en donne. */
function ficheAuPlafond(): FicheCreation {
  const dons: Record<string, number> = {}
  for (const don of listeDons().slice(0, donsCumules(HAUT))) dons[don.id] = 1
  return { classe: CLASSE, voie: VOIE.id, niveau: HAUT, dons }
}

describe('t006 — répercussions d’un changement de niveau', () => {
  it('témoin : au plafond, la fiche consomme exactement son droit de dons', () => {
    const fiche = ficheAuPlafond()
    expect(Object.keys(fiche.dons ?? {})).toHaveLength(donsCumules(HAUT))
    expect(surplusDons(fiche)).toBe(0)
  })

  it('baisse_de_niveau_ouvre_repercussions', () => {
    const { fiche, retraits } = changerNiveau(ficheAuPlafond(), BAS)
    expect(fiche.niveau).toBe(BAS)
    expect(retraits.length).toBeGreaterThan(0)
    // Le surplus est NOMMÉ et chiffré ; il n'est pas retiré à la place du joueur.
    const enTrop = donsCumules(HAUT) - donsCumules(BAS)
    expect(retraits.some((r) => r.includes(String(enTrop)))).toBe(true)
    expect(Object.keys(fiche.dons ?? {})).toHaveLength(donsCumules(HAUT))
    expect(surplusDons(fiche)).toBe(enTrop)
  })

  it('jumelle : sans rien de consommé, une baisse n’ouvre aucune fenêtre', () => {
    const { fiche, retraits } = changerNiveau(
      { classe: CLASSE, voie: VOIE.id, niveau: HAUT },
      BAS,
    )
    expect(fiche.niveau).toBe(BAS)
    expect(retraits).toEqual([])
  })

  it('jumelle : monter au niveau d’une capacité déjà achetée la retire et la nomme', () => {
    // Achat d'héritage d'une capacité de sa PROPRE voie, prise au niveau bas :
    // monter jusqu'à son échelon la donne d'office, l'achat est donc retiré.
    const echelon = VOIE.capacites.find((c) => c.niveau === HAUT)
    expect(echelon).toBeDefined()
    const avant: FicheCreation = {
      classe: CLASSE,
      voie: VOIE.id,
      niveau: BAS,
      capChoix: { [String(HAUT)]: [echelon!.id] },
    }
    const { fiche, retraits } = changerNiveau(avant, HAUT)
    expect(fiche.capChoix?.[String(HAUT)]).toEqual([])
    expect(retraits.some((r) => r.includes(echelon!.nom))).toBe(true)
  })

  it('changer pour le même niveau ne répercute rien', () => {
    expect(changerNiveau(ficheAuPlafond(), HAUT).retraits).toEqual([])
  })

  it('D12 — « Ton niveau » est APRÈS le camp et AVANT tout consommateur', () => {
    const ids = ETAPES.map((e) => e.id)
    const iNiveau = ids.indexOf('niveau')
    expect(iNiveau).toBeGreaterThan(ids.indexOf('camp'))
    // classe (arbre des voies), destin (achats de capacité/don) et talents
    // (dons, compétences) consomment tous ce que le niveau ouvre.
    for (const consommateur of ['classe', 'destin', 'talents'] as const) {
      expect(iNiveau).toBeLessThan(ids.indexOf(consommateur))
    }
    expect(ETAPES[iNiveau].nom).toBe('Ton niveau')
  })
})
