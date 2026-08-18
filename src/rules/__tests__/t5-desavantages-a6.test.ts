/**
 * T5 (A6) — 4 désavantages cochés → XP = somme des 3 PREMIERS cochés
 * seulement. Attendu calculé depuis rules.json, pas recopié.
 */
import { describe, expect, it } from 'vitest'
import {
  desavantagesRpSeulement,
  listeDesavantages,
  plafondDesavantagesXp,
  xpDesavantages,
} from '../heritage'

describe('T5 — plafond A6 des désavantages', () => {
  // 4 désavantages sans variante, pris dans le fichier (ordre de cochage).
  const sansVariante = listeDesavantages().filter((d) => d.variante_xp === undefined)
  const coches = sansVariante.slice(0, 4).map((d) => d.id)

  it('le fichier fournit bien au moins 4 désavantages sans variante', () => {
    expect(coches).toHaveLength(4)
  })

  it('4 cochés → XP = somme des 3 premiers cochés seulement', () => {
    const plafond = plafondDesavantagesXp()
    const attendu = coches
      .slice(0, plafond)
      .reduce((somme, id) => somme + sansVariante.find((d) => d.id === id)!.xp, 0)
    const attenduAvecLeQuatrieme = attendu + sansVariante[3].xp
    expect(xpDesavantages(coches)).toBe(attendu)
    expect(xpDesavantages(coches)).not.toBe(attenduAvecLeQuatrieme)
  })

  it('le 4e coché est marqué « RP seulement »', () => {
    expect(desavantagesRpSeulement(coches)).toEqual([coches[3]])
  })

  it('jumelle : 3 cochés → XP = somme des 3', () => {
    const trois = coches.slice(0, 3)
    const attendu = trois.reduce(
      (somme, id) => somme + sansVariante.find((d) => d.id === id)!.xp,
      0,
    )
    expect(xpDesavantages(trois)).toBe(attendu)
    expect(desavantagesRpSeulement(trois)).toEqual([])
  })

  it("l'ordre de cochage compte : le même ensemble coché dans un autre ordre change l'XP compté", () => {
    // Choisit un ensemble où le 1er et le 4e ont des XP différents.
    const parXp = [...sansVariante].sort((a, b) => a.xp - b.xp)
    const quatre = [parXp[0], parXp[1], parXp[2], parXp[parXp.length - 1]]
    const ordreA = quatre.map((d) => d.id)
    const ordreB = [ordreA[3], ordreA[1], ordreA[2], ordreA[0]]
    expect(xpDesavantages(ordreA)).not.toBe(xpDesavantages(ordreB))
  })
})
