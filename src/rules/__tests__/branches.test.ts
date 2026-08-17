/**
 * GATE_FIDELITE_SPEC_v2 §Tests (f) — branches par classe.
 * Pour CHAQUE classe, branchesDe(classe) rend exactement 3 branches non vides.
 * (« Aucune voie disponible » = bug observé.)
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, idsDeClasses } from '../branches'

const classes = idsDeClasses()

describe('branchesDe', () => {
  it('connaît les 8 classes du fichier', () => {
    expect(classes).toHaveLength(8)
  })

  it.each(classes)('rend exactement 3 branches non vides pour « %s »', (classeId) => {
    const branches = branchesDe(classeId)
    expect(branches).toHaveLength(3)
    for (const branche of branches) {
      expect(branche.id.trim(), classeId).not.toBe('')
      expect(branche.nom.trim(), classeId).not.toBe('')
      expect(branche.capacites.length, `${classeId}/${branche.id}`).toBeGreaterThan(0)
    }
  })

  it('rend un tableau vide pour une classe inconnue', () => {
    expect(branchesDe('classe-qui-nexiste-pas')).toEqual([])
  })
})
