/**
 * T8 — langues : droit = (esprit≥3 ? 1 : 0) + (érudit ? (esprit>1 ? 2 : 1) : 0) ;
 * Druidique automatique pour le druide ; `des_morts` réservée au sorcier et
 * au chevalier de la mort.
 *
 * GATE MODIFIÉE PAR D19 ④ (arbitrage Q6, Fred, t016, 2026-08-26) : « Les
 * sorciers et les chevaliers de la mort peuvent prendre la Langue des morts
 * à la création OU quand ils gagnent une langue supplémentaire grâce à un
 * Esprit élevé. Jamais les autres classes. » Le dernier test de ce fichier
 * affirmait `des_morts` jamais proposée à la création, toutes classes
 * confondues — Q6 corrige ça pour ces deux classes ; il se ré-écrit ici,
 * exact, jamais assoupli.
 */
import { describe, expect, it } from 'vitest'
import { droitLangues, languesAcquises, languesProposables } from '../langues'
import { getRules } from '../load'

/** Les deux classes que Q6 ouvre à la Langue des morts (t016, 2026-08-26). */
const CLASSES_DES_MORTS = ['sorcier', 'chevalier_de_la_mort']

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

  it('`des_morts` proposée au sorcier et au chevalier de la mort (toutes races)', () => {
    for (const race of getRules().races.liste) {
      for (const classeId of CLASSES_DES_MORTS) {
        const proposees = languesProposables(race.id, classeId).map((l) => l.id)
        expect(proposees, `${race.id}/${classeId}`).toContain('des_morts')
      }
    }
  })

  it('`des_morts` jamais proposée aux six autres classes (toutes races)', () => {
    const autres = getRules().classes_squelette.liste.filter(
      (c) => !CLASSES_DES_MORTS.includes(c.id),
    )
    expect(autres.length).toBe(6)
    for (const race of getRules().races.liste) {
      for (const classe of autres) {
        const proposees = languesProposables(race.id, classe.id).map((l) => l.id)
        expect(proposees, `${race.id}/${classe.id}`).not.toContain('des_morts')
      }
    }
  })
})
