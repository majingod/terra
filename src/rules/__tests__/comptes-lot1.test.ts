/**
 * GATE_FIDELITE_SPEC_v2 §Tests (b) — comptes du lot 1.
 *
 * Les comptes attendus viennent du brief #02-a, pas des données : c'est
 * exactement le point. Si un compte diverge, on rapporte, on ne « corrige »
 * ni le test ni rules.json.
 */
import { describe, expect, it } from 'vitest'
import { getRules, getVersion } from '../load'

const rules = getRules()

describe('Comptes lot 1', () => {
  it('lit la version depuis meta.version du fichier', () => {
    expect(getVersion()).toBe(rules.meta.version)
    expect(getVersion()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('compte 6 races', () => {
    expect(rules.races.liste).toHaveLength(6)
  })

  it('compte 8 langues', () => {
    expect(rules.langues.liste).toHaveLength(8)
  })

  it('compte 13 dons', () => {
    expect(rules.dons.liste).toHaveLength(13)
  })

  it('compte 4 compétences simples', () => {
    expect(rules.competences.simples).toHaveLength(4)
  })

  it('compte 4 artisanats', () => {
    expect(rules.competences.artisanats.liste).toHaveLength(4)
  })

  it('compte 14 lignes de désavantages', () => {
    // A7, arbitrage Fred t002 : Amputé est scindé en deux lignes de wizard
    // (bras 3 XP / main-doigts 1 XP), d'où 14 lignes pour 13 entrées du Tome.
    expect(rules.heritage.desavantages.liste).toHaveLength(14)
  })

  it('compte 13 désavantages distincts (les 13 lignes du Tome p.20)', () => {
    const verbatims = rules.heritage.desavantages.liste.map((x) => x.verbatim)
    expect(new Set(verbatims).size).toBe(13)

    // Témoin nommé de la paire : les deux lignes Amputé partagent le verbatim.
    const ampute = rules.heritage.desavantages.liste.filter(
      (x) => x.id === 'ampute_bras' || x.id === 'ampute_main',
    )
    expect(ampute).toHaveLength(2)
    expect(ampute[0].verbatim).toBe(ampute[1].verbatim)
  })

  it("compte 11 avantages d'héritage", () => {
    expect(rules.heritage.avantages.liste).toHaveLength(11)
  })

  it('donne un id unique à chaque entrée du lot 1', () => {
    const ids = [
      ...rules.races.liste.map((x) => `race:${x.id}`),
      ...rules.langues.liste.map((x) => `langue:${x.id}`),
      ...rules.dons.liste.map((x) => `don:${x.id}`),
      ...rules.competences.simples.map((x) => `competence:${x.id}`),
      ...rules.competences.artisanats.liste.map((x) => `artisanat:${x.id}`),
      ...rules.heritage.desavantages.liste.map((x) => `desavantage:${x.id}`),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })
})
