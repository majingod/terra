/**
 * D17 — les gains d'une montée sont LUS des tables d'évolution.
 *
 * Ce fichier tient l'articulation du brief : « gains lus de la table
 * d'évolution de rules.json, ⛔ jamais en dur ». Il compare, échelon par
 * échelon, ce que `gainsMontee` rend à la LIGNE de la table — et fait la
 * même chose sur le corpus enfant, qui a sa propre table et son propre
 * plafond. Les deux corpus ne se mélangent nulle part.
 *
 * Le plafond n'est pas un 5 écrit ici : c'est le dernier échelon de la table
 * concernée. Au-delà, D12 : « vois ton MJ ».
 */
import { describe, expect, it } from 'vitest'
import { niveauMaxEnfant, niveauxPossiblesEnfant, tableEvolutionEnfant } from '../kids'
import {
  gainsMontee,
  gainsMonteeEnfant,
  niveauAtteignable,
  niveauAtteignableEnfant,
} from '../montee'
import { niveauMax, niveauMin, niveauxPossibles, tableEvolution } from '../niveau'

describe('D17 — le niveau atteignable s’arrête au dernier échelon de la table', () => {
  it('sous le plafond, monter mène à l’échelon suivant', () => {
    for (const niveau of niveauxPossibles().filter((n) => n < niveauMax())) {
      expect(niveauAtteignable(niveau), `niveau ${niveau}`).toBe(niveau + 1)
    }
  })

  it('au plafond, il n’y a plus d’échelon : le bouton n’a rien à proposer', () => {
    expect(niveauAtteignable(niveauMax())).toBeUndefined()
  })

  it('jumelle : la table enfant a SON plafond, lu de son propre fichier', () => {
    for (const niveau of niveauxPossiblesEnfant().filter((n) => n < niveauMaxEnfant())) {
      expect(niveauAtteignableEnfant(niveau), `niveau ${niveau}`).toBe(niveau + 1)
    }
    expect(niveauAtteignableEnfant(niveauMaxEnfant())).toBeUndefined()
  })
})

describe('D17 — les gains 12+ sont exactement la ligne de la table', () => {
  it('échelon par échelon, rien n’est ajouté ni retranché', () => {
    for (const ligne of tableEvolution().filter((l) => l.niv > niveauMin())) {
      expect(gainsMontee(ligne.niv), `échelon ${ligne.niv}`).toEqual({
        niveau: ligne.niv,
        caracPoints: ligne.carac_points ?? 0,
        dons: ligne.dons ?? 0,
        competences: ligne.competence ?? 0,
      })
    }
  })

  it('témoin : la table donne bien des échelons à point de caractéristique ET des échelons à don', () => {
    const montees = tableEvolution().filter((l) => l.niv > niveauMin())
    expect(montees.filter((l) => (l.carac_points ?? 0) > 0).length).toBeGreaterThan(0)
    expect(montees.filter((l) => (l.dons ?? 0) > 0).length).toBeGreaterThan(0)
    // Et aucun échelon de montée ne donne les deux : une carte de gain à la fois.
    expect(
      montees.filter((l) => (l.carac_points ?? 0) > 0 && (l.dons ?? 0) > 0).map((l) => l.niv),
    ).toEqual([])
  })

  it('un échelon hors table est refusé, il n’est pas deviné', () => {
    expect(() => gainsMontee(niveauMax() + 1)).toThrow(/table d'évolution/)
  })
})

describe('D17 — les gains ≤11 sont exactement la ligne de la table enfant', () => {
  it('échelon par échelon, capacité, Lutte et Dégâts viennent de la planche', () => {
    for (const ligne of tableEvolutionEnfant().filter((l) => l.niv > 1)) {
      expect(gainsMonteeEnfant(ligne.niv), `échelon ${ligne.niv}`).toEqual({
        niveau: ligne.niv,
        capacite: ligne.capacite === true,
        lutte: ligne.lutte ?? 0,
        degats: ligne.degats ?? 0,
      })
    }
  })

  it('témoin : la table enfant porte bien des échelons à capacité, un à Lutte et un à Dégâts', () => {
    const montees = tableEvolutionEnfant().filter((l) => l.niv > 1)
    expect(montees.filter((l) => l.capacite).length).toBeGreaterThan(0)
    expect(montees.filter((l) => (l.lutte ?? 0) > 0).length).toBeGreaterThan(0)
    expect(montees.filter((l) => (l.degats ?? 0) > 0).length).toBeGreaterThan(0)
  })

  it('un échelon hors table enfant est refusé, lui aussi', () => {
    expect(() => gainsMonteeEnfant(niveauMaxEnfant() + 1)).toThrow(/table d'évolution/)
  })
})
