/**
 * GATE_FIDELITE_SPEC_v2 §Tests (d) — gate d'âge (D10).
 * '≤11' rend 0 artisanat, '12+' rend les 4, SUR LES MÊMES DONNÉES.
 */
import { describe, expect, it } from 'vitest'
import { artisanatsDisponibles } from '../age'
import { getRules } from '../load'

describe("Gate d'âge — artisanats", () => {
  it('rend 0 artisanat pour la tranche « 11 ans et moins »', () => {
    expect(artisanatsDisponibles('≤11')).toHaveLength(0)
  })

  it('rend les 4 artisanats pour la tranche « 12 ans et plus »', () => {
    expect(artisanatsDisponibles('12+')).toHaveLength(4)
  })

  it('travaille sur les mêmes données de base dans les deux tranches', () => {
    const source = getRules().competences.artisanats.liste
    expect(source).toHaveLength(4)
    expect(artisanatsDisponibles('12+')).toEqual(source)
    expect(artisanatsDisponibles('≤11')).toEqual([])
    // La donnée n'a pas bougé entre les deux appels : la gate filtre, elle
    // ne mute pas le catalogue.
    expect(getRules().competences.artisanats.liste).toHaveLength(4)
  })
})
