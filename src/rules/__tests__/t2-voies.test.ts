/**
 * T2 (bug Manus #2) — depuis rules.json : 8 classes × 3 voies non vides
 * = 24 voies, 120 capacités. Comptes CALCULÉS par critère, pas listés à la
 * main.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches, toutesLesCapacites } from '../branches'

describe('T2 — voies et capacités (bug Manus #2)', () => {
  const classes = classesAvecBranches()

  it('compte 8 classes', () => {
    expect(classes).toHaveLength(8)
  })

  it('chaque classe a exactement 3 voies, toutes non vides', () => {
    for (const classe of classes) {
      const voies = branchesDe(classe.classe_id)
      expect(voies, classe.classe_id).toHaveLength(3)
      for (const voie of voies) {
        expect(voie.capacites.length, `${classe.classe_id}/${voie.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('compte 24 voies au total (8 × 3), par critère', () => {
    const total = classes.reduce((somme, c) => somme + branchesDe(c.classe_id).length, 0)
    expect(total).toBe(24)
  })

  it('compte 120 capacités de voie au total, par critère', () => {
    expect(toutesLesCapacites()).toHaveLength(120)
  })

  it('jumelle : aucune voie vide, aucune capacité sans verbatim', () => {
    const vides = toutesLesCapacites().filter((c) => !c.verbatim || c.verbatim.trim() === '')
    expect(vides.map((c) => c.id)).toEqual([])
  })
})
