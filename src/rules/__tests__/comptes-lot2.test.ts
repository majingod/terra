/**
 * GATE_FIDELITE_SPEC_v2 §Tests (c) — comptes du lot 2.
 *
 * 24 branches, 120 capacités (8 x 3 x 5), 24 capacités de niveau 1 non vides,
 * 15 capacités de base, ids uniques. Les deux cellules « +1 sauvegarde »
 * comptent comme témoins NON VIDES.
 */
import { describe, expect, it } from 'vitest'
import {
  classesAvecBranches,
  toutesLesCapacites,
  toutesLesCapacitesDeBase,
} from '../branches'

const classes = classesAvecBranches()
const capacites = toutesLesCapacites()
const capacitesDeBase = toutesLesCapacitesDeBase()

function estNonVide(texte: string | undefined): boolean {
  return typeof texte === 'string' && texte.trim().length > 0
}

describe('Comptes lot 2', () => {
  it('compte 8 classes, 3 branches chacune, soit 24 branches', () => {
    expect(classes).toHaveLength(8)
    for (const classe of classes) {
      expect(classe.branches, classe.classe_id).toHaveLength(3)
    }
    expect(classes.flatMap((classe) => classe.branches)).toHaveLength(24)
  })

  it('compte 120 capacités de branche (8 x 3 x 5)', () => {
    for (const classe of classes) {
      for (const branche of classe.branches) {
        expect(branche.capacites, `${classe.classe_id}/${branche.id}`).toHaveLength(5)
      }
    }
    expect(capacites).toHaveLength(120)
    expect(capacites).toHaveLength(8 * 3 * 5)
  })

  it('couvre les niveaux 1 à 5 dans chaque branche', () => {
    for (const classe of classes) {
      for (const branche of classe.branches) {
        const niveaux = branche.capacites.map((capacite) => capacite.niveau).sort((a, b) => a - b)
        expect(niveaux, `${classe.classe_id}/${branche.id}`).toEqual([1, 2, 3, 4, 5])
      }
    }
  })

  it('compte 24 capacités de niveau 1, toutes non vides', () => {
    const niveau1 = capacites.filter((capacite) => capacite.niveau === 1)
    expect(niveau1).toHaveLength(24)
    const vides = niveau1.filter((capacite) => !estNonVide(capacite.verbatim) || !estNonVide(capacite.nom))
    expect(vides.map((capacite) => capacite.id)).toEqual([])
  })

  it('compte 15 capacités de base', () => {
    expect(capacitesDeBase).toHaveLength(15)
    const vides = capacitesDeBase.filter(
      (capacite) => !estNonVide(capacite.verbatim) || !estNonVide(capacite.nom),
    )
    expect(vides.map((capacite) => capacite.id)).toEqual([])
  })

  it('ne laisse aucune capacité vide — les deux « +1 sauvegarde » comptent comme non vides', () => {
    const vides = capacites.filter(
      (capacite) => !estNonVide(capacite.verbatim) || !estNonVide(capacite.nom),
    )
    expect(vides.map((capacite) => capacite.id)).toEqual([])

    const temoins = capacites.filter((capacite) => capacite.nom === '+1 sauvegarde')
    expect(temoins).toHaveLength(2)
    for (const temoin of temoins) {
      expect(estNonVide(temoin.verbatim), temoin.id).toBe(true)
    }
  })

  it('donne un id unique à chaque classe, branche et capacité', () => {
    const ids = [
      ...classes.map((classe) => classe.classe_id),
      ...classes.flatMap((classe) => classe.branches.map((branche) => branche.id)),
      ...capacites.map((capacite) => capacite.id),
      ...capacitesDeBase.map((capacite) => capacite.id),
    ]
    const doublons = ids.filter((id, index) => ids.indexOf(id) !== index)
    expect(doublons).toEqual([])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
