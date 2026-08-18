/**
 * T7 — interdits de classe : Honorable indisponible pour `paladin` et
 * `chevalier_de_la_mort`, Menteur pour `paladin` ; jumelle : disponibles
 * pour `guerrier`.
 */
import { describe, expect, it } from 'vitest'
import { desavantagesDisponibles } from '../heritage'

function ids(classeId: string): string[] {
  return desavantagesDisponibles(classeId).map((d) => d.id)
}

describe('T7 — désavantages interdits par classe', () => {
  it('Honorable indisponible pour paladin et chevalier_de_la_mort', () => {
    expect(ids('paladin')).not.toContain('honorable')
    expect(ids('chevalier_de_la_mort')).not.toContain('honorable')
  })

  it('Menteur indisponible pour paladin', () => {
    expect(ids('paladin')).not.toContain('menteur')
  })

  it('jumelle : Honorable et Menteur disponibles pour guerrier', () => {
    expect(ids('guerrier')).toContain('honorable')
    expect(ids('guerrier')).toContain('menteur')
  })
})
