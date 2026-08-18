/**
 * T1 (bug Manus #1) — l'étape Forces n'accepte que la permutation exacte de
 * la répartition du fichier {3,2,1}. Refusés : {2,2,2}, {3,3,1}, toute
 * distribution « 6 points libres ». Jumelle : {3,2,1} passe.
 */
import { describe, expect, it } from 'vitest'
import rulesJson from '../../data/rules.json'
import { problemesForces } from '../validation'
import type { FicheCreation } from '../types'

function ficheForces(p: number, r: number, e: number): FicheCreation {
  return { caracs: { p, r, e }, extras: { p: 0, r: 0, e: 0 } }
}

describe('T1 — répartition des caractéristiques (bug Manus #1)', () => {
  it('refuse {2,2,2}', () => {
    expect(problemesForces(ficheForces(2, 2, 2))).not.toEqual([])
  })

  it('refuse {3,3,1}', () => {
    expect(problemesForces(ficheForces(3, 3, 1))).not.toEqual([])
  })

  it('refuse les « 6 points libres » (ex. {4,1,1} et {1,1,4})', () => {
    expect(problemesForces(ficheForces(4, 1, 1))).not.toEqual([])
    expect(problemesForces(ficheForces(1, 1, 4))).not.toEqual([])
  })

  it('refuse les jetons non tous posés', () => {
    expect(problemesForces({ caracs: { p: 3, r: 2 } })).not.toEqual([])
  })

  it('jumelle : toute permutation exacte de la répartition du fichier passe', () => {
    const [a, b, c] = rulesJson.caracteristiques.creation.repartition
    expect(problemesForces(ficheForces(a, b, c))).toEqual([])
    expect(problemesForces(ficheForces(c, a, b))).toEqual([])
    expect(problemesForces(ficheForces(b, c, a))).toEqual([])
  })
})
