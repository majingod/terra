/**
 * T8 — langues : droit = (esprit≥3 ? 1 : 0) + (érudit ? (esprit>1 ? 2 : 1) : 0) ;
 * Druidique automatique pour le druide ; `des_morts` jamais proposée à la
 * création.
 */
import { describe, expect, it } from 'vitest'
import { droitLangues, languesAcquises, languesProposables } from '../langues'
import { getRules } from '../load'

describe('T8 — droits et restrictions de langues', () => {
  it('droit sans érudit : 0 à esprit 1-2, 1 à esprit 3+', () => {
    expect(droitLangues(1)).toBe(0)
    expect(droitLangues(2)).toBe(0)
    expect(droitLangues(3)).toBe(1)
    expect(droitLangues(5)).toBe(1)
  })

  it('érudit : 1 langue si esprit 1 (illettré), sinon 2', () => {
    expect(droitLangues(1, ['erudit'])).toBe(1)
    expect(droitLangues(2, ['erudit'])).toBe(2)
    expect(droitLangues(3, ['erudit'])).toBe(3)
  })

  it('Druidique automatique pour le druide, quelle que soit la race', () => {
    for (const race of getRules().races.liste) {
      expect(languesAcquises(race.id, 'druide')).toContain('druidique')
    }
  })

  it('jumelle : pas de Druidique hors druide', () => {
    for (const race of getRules().races.liste) {
      expect(languesAcquises(race.id, 'guerrier')).not.toContain('druidique')
    }
  })

  it('les langues acquises viennent de la race (langues_depart)', () => {
    for (const race of getRules().races.liste) {
      expect(languesAcquises(race.id, 'guerrier')).toEqual(race.langues_depart)
    }
  })

  it('`des_morts` jamais proposée à la création (toutes races × toutes classes)', () => {
    const classes = getRules().classes_squelette.liste
    for (const race of getRules().races.liste) {
      for (const classe of classes) {
        const proposees = languesProposables(race.id, classe.id).map((l) => l.id)
        expect(proposees, `${race.id}/${classe.id}`).not.toContain('des_morts')
      }
    }
  })
})
