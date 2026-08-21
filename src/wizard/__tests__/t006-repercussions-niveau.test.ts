/**
 * t006 / D12 — la place de l'étape « Ton niveau » dans le parcours.
 *
 * ⚠️ GATE MODIFIÉE PAR D20, et voici pourquoi. Cette gate gardait la fenêtre
 * de répercussions d'une BAISSE de niveau à la création : la fiche naissait au
 * niveau déclaré, et redescendre reprenait ce que le niveau avait donné.
 *
 * D20 supprime la chose gardée, pas la garde : on ne naît plus qu'au niveau 1,
 * et on monte. Il n'existe donc plus de « baisse de niveau » à la création —
 * `changerNiveau` n'a plus d'objet et a été retiré ; l'étape fixe une CIBLE,
 * qui ne donne rien et ne peut donc rien reprendre. Le retour EN ARRIÈRE sur
 * un niveau déjà traversé, et sa fenêtre de répercussions, sont le lot 2 :
 * cette gate y reviendra, sur l'historique.
 *
 * Ce qui reste gardé ici : la cible ne touche à RIEN (c'est le remplaçant
 * exact de « une baisse n'ouvre aucune fenêtre »), et la place de l'étape dans
 * le parcours, inchangée depuis D12.
 *
 * Aucun nom ni chiffre de règle n'est écrit ici : la classe témoin, ses
 * capacités et les dons témoins sont tirés de rules.json.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { donsCumules, niveauMax, niveauMin } from '../../rules/niveau'
import { listeDons } from '../../rules/talents'
import { ETAPES, changerCible, problemesNiveau, surplusDons } from '../validation'
import type { FicheCreation } from '../types'
import { historiqueJusquA } from './aide-fiche-complete'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]
const HAUT = niveauMax()
const BAS = niveauMin()

/** Fiche témoin AU NIVEAU DE CRÉATION, avec autant de dons qu'il en donne. */
function ficheDeCreation(): FicheCreation {
  const dons: Record<string, number> = {}
  for (const don of listeDons().slice(0, donsCumules(BAS))) dons[don.id] = 1
  return { classe: CLASSE, historique: historiqueJusquA(BAS), dons }
}

describe('D20 — la cible ne répercute rien', () => {
  it('témoin : à la création, la fiche consomme exactement son droit de dons', () => {
    const fiche = ficheDeCreation()
    expect(Object.keys(fiche.dons ?? {})).toHaveLength(donsCumules(BAS))
    expect(surplusDons(fiche)).toBe(0)
  })

  it('viser le niveau le plus haut n’ouvre aucune fenêtre et ne retire rien', () => {
    const avant = ficheDeCreation()
    const { fiche, retraits } = changerCible(avant, HAUT)
    expect(retraits).toEqual([])
    expect(fiche.cible).toBe(HAUT)
    expect(fiche.dons).toEqual(avant.dons)
    // La cible ne donne rien : le droit de dons ne bouge pas d'un cran.
    expect(surplusDons(fiche)).toBe(0)
  })

  it('jumelle : redescendre la cible ne retire rien non plus — elle n’a rien donné', () => {
    const haute = VOIE.capacites.find((c) => c.niveau === BAS)!
    const avant: FicheCreation = {
      classe: CLASSE,
      historique: historiqueJusquA(BAS),
      cible: HAUT,
      capNiveaux: { [String(BAS)]: haute.id },
    }
    const { fiche, retraits } = changerCible(avant, BAS)
    expect(retraits).toEqual([])
    expect(fiche.capNiveaux?.[String(BAS)]).toBe(haute.id)
  })

  it('viser le même niveau ne répercute rien', () => {
    expect(changerCible(ficheDeCreation(), BAS).retraits).toEqual([])
  })

  it('une cible hors de la table est refusée et nommée', () => {
    expect(problemesNiveau({ cible: HAUT + 1 })).toHaveLength(1)
    expect(problemesNiveau({ cible: HAUT })).toEqual([])
    // Absente, la cible vaut le niveau de départ : rien à refuser.
    expect(problemesNiveau({})).toEqual([])
  })
})

describe('t006 — la place de l’étape « Ton niveau »', () => {
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
