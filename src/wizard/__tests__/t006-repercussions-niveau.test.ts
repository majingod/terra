/**
 * t006 / D12 — baisser le niveau déclenche la fenêtre de répercussions
 * EXISTANTE, avec ses deux régimes et aucun troisième :
 * - l'impossible se retire tout seul et se nomme (les emplacements de
 *   capacité en trop d'une BAISSE de niveau, D16) ;
 * - le surplus se retire par le joueur (les dons en trop d'une BAISSE).
 *
 * D16 : une MONTÉE de niveau ne retire plus rien — la voie ne donne plus
 * aucune capacité d'office, elle n'a plus rien à reprendre à un achat.
 *
 * Aucun nom ni chiffre de règle n'est écrit ici : la classe témoin, ses
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
  return { classe: CLASSE, niveau: HAUT, dons }
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
    const { fiche, retraits } = changerNiveau({ classe: CLASSE, niveau: HAUT }, BAS)
    expect(fiche.niveau).toBe(BAS)
    expect(retraits).toEqual([])
  })

  it('D16 — monter de niveau ne reprend RIEN à un achat : plus rien n’est d’office', () => {
    // Achat d'héritage d'une capacité d'un échelon haut, pris au niveau bas.
    // Avant D16, monter jusqu'à cet échelon le donnait d'office et retirait
    // l'achat. La voie ne donne plus rien : l'achat reste, intact.
    const echelon = VOIE.capacites.find((c) => c.niveau === HAUT)
    expect(echelon).toBeDefined()
    const avant: FicheCreation = {
      classe: CLASSE,
      niveau: BAS,
      capChoix: { [String(HAUT)]: [echelon!.id] },
    }
    const { fiche, retraits } = changerNiveau(avant, HAUT)
    expect(fiche.capChoix?.[String(HAUT)]).toEqual([echelon!.id])
    expect(retraits.filter((r) => r.includes(echelon!.nom))).toEqual([])
  })

  it('jumelle : une BAISSE, elle, vide les emplacements en trop et les nomme', () => {
    const haute = VOIE.capacites.find((c) => c.niveau === HAUT)!
    const avant: FicheCreation = {
      classe: CLASSE,
      niveau: HAUT,
      capNiveaux: { [String(HAUT)]: haute.id },
    }
    const { fiche, retraits } = changerNiveau(avant, BAS)
    expect(fiche.capNiveaux?.[String(HAUT)]).toBeUndefined()
    expect(retraits.some((r) => r.includes(haute.nom))).toBe(true)
  })

  it('changer pour le même niveau ne répercute rien', () => {
    expect(changerNiveau(ficheAuPlafond(), HAUT).retraits).toEqual([])
  })

  it('D12 — « Ton niveau » est APRÈS le camp et AVANT tout consommateur', () => {
    const ids = ETAPES.map((e) => e.id)
    const iNiveau = ids.indexOf('niveau')
    expect(iNiveau).toBeGreaterThan(ids.indexOf('camp'))
    // classe, capacités (un emplacement par niveau), destin (achats de
    // capacité/don) et talents consomment tous ce que le niveau ouvre.
    for (const consommateur of ['classe', 'capacites', 'destin', 'talents'] as const) {
      expect(iNiveau).toBeLessThan(ids.indexOf(consommateur))
    }
    expect(ETAPES[iNiveau].nom).toBe('Ton niveau')
  })
})
