/**
 * GATE_FIDELITE_SPEC_v2 §Tests (e) — répartition des caractéristiques.
 * Seul le multi-ensemble exact {3,2,1} est accepté.
 * (Bug observé sur un prototype précédent : le total de points suffisait.)
 */
import { describe, expect, it } from 'vitest'
import { repartitionAttendue, validerRepartition } from '../caracs'

describe('Répartition des caractéristiques', () => {
  it('lit la répartition depuis rules.json', () => {
    expect(repartitionAttendue().slice().sort((a, b) => a - b)).toEqual([1, 2, 3])
  })

  it('accepte 3-2-1', () => {
    expect(validerRepartition([3, 2, 1])).toBe(true)
  })

  it("accepte 3-2-1 dans n'importe quel ordre", () => {
    expect(validerRepartition([1, 2, 3])).toBe(true)
    expect(validerRepartition([2, 3, 1])).toBe(true)
    expect(validerRepartition([1, 3, 2])).toBe(true)
  })

  it('refuse 9 points (3-3-3)', () => {
    expect(validerRepartition([3, 3, 3])).toBe(false)
  })

  it('refuse 3-3-0', () => {
    expect(validerRepartition([3, 3, 0])).toBe(false)
  })

  it('refuse 2-2-2', () => {
    expect(validerRepartition([2, 2, 2])).toBe(false)
  })
})
