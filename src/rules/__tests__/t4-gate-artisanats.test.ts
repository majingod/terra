/**
 * T4 — gate artisanats (D10) : artisanatsDisponibles('≤11') === 0 ET
 * ('12+') === 4, sur les mêmes données.
 */
import { describe, expect, it } from 'vitest'
import { artisanatsDisponibles } from '../age'
import { getRules } from '../load'

describe('T4 — gate artisanats par tranche d’âge', () => {
  it("tranche '≤11' : 0 artisanat disponible", () => {
    expect(artisanatsDisponibles('≤11')).toHaveLength(0)
  })

  it("jumelle : tranche '12+' : 4 artisanats disponibles, les mêmes données", () => {
    const disponibles = artisanatsDisponibles('12+')
    expect(disponibles).toHaveLength(4)
    expect(disponibles).toEqual(getRules().competences.artisanats.liste)
  })
})
