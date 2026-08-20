/**
 * D16 — les deux gates qui DOIVENT rougir sur `main`.
 *
 * Le GN existe depuis deux ans : beaucoup de joueurs ont pioché dans
 * plusieurs voies. Le wizard d'avant leur imposait une voie unique et donnait
 * d'office ses échelons — il REFUSAIT donc les vrais personnages.
 *
 * ③ une fiche qui pige dans deux voies est VALIDE ;
 * ④ une fiche complète SANS champ `voie` est VALIDE.
 *
 * D5 : ni la classe, ni les voies, ni les capacités ne sont écrites ici —
 * tout est tiré de rules.json par la fabrique de fiche complète.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { ETAPES, etapesValides, problemesEtape } from '../validation'
import { ficheComplete } from './aide-fiche-complete'
import type { FicheCreation } from '../types'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)

/** Deux voies DIFFÉRENTES : l'échelon 1 de la première, l'échelon 2 de la seconde. */
const DEUX_VOIES = {
  '1': VOIES[0].capacites.find((c) => c.niveau === 1)!.id,
  '2': VOIES[1].capacites.find((c) => c.niveau === 2)!.id,
}

/** Tous les problèmes de la fiche, étape par étape — la sortie rouge lisible. */
function tousLesProblemes(fiche: FicheCreation): string[] {
  return ETAPES.flatMap((etape) =>
    problemesEtape(fiche, etape.id).map((probleme) => `${etape.id} : ${probleme}`),
  )
}

describe('D16 ③ — une fiche qui pige dans deux voies est valide', () => {
  it('témoin : les deux capacités viennent bien de DEUX voies différentes', () => {
    const voiesTouchees = new Set(
      Object.values(DEUX_VOIES).map(
        (id) => VOIES.find((v) => v.capacites.some((c) => c.id === id))!.id,
      ),
    )
    expect(voiesTouchees.size).toBe(2)
  })

  it('fiche_niveau_2_pige_dans_deux_voies_est_valide', () => {
    const fiche = ficheComplete(CLASSE, 2, DEUX_VOIES)
    expect(tousLesProblemes(fiche)).toEqual([])
    expect(etapesValides(fiche).every(Boolean)).toBe(true)
  })

  it('jumelle : les trois voies à la fois, au niveau 3, passent aussi', () => {
    const troisVoies = {
      '1': VOIES[0].capacites.find((c) => c.niveau === 1)!.id,
      '2': VOIES[1].capacites.find((c) => c.niveau === 2)!.id,
      '3': VOIES[2].capacites.find((c) => c.niveau === 3)!.id,
    }
    expect(tousLesProblemes(ficheComplete(CLASSE, 3, troisVoies))).toEqual([])
  })
})

describe('D16 ④ — une fiche complète SANS champ « voie » est valide', () => {
  it('fiche_complete_sans_champ_voie_est_valide', () => {
    const fiche = ficheComplete(CLASSE, 2, DEUX_VOIES)
    expect('voie' in fiche).toBe(false)
    expect(fiche.voie).toBeUndefined()
    expect(tousLesProblemes(fiche)).toEqual([])
  })

  it('jumelle : la même fiche portant encore un champ « voie » d’époque passe aussi', () => {
    const ancienne: FicheCreation = { ...ficheComplete(CLASSE, 2, DEUX_VOIES), voie: VOIES[0].id }
    expect(tousLesProblemes(ancienne)).toEqual([])
  })
})
