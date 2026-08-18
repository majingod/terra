/**
 * T9 — budget XP : dépense > budget refusée ; `max_achats` respectés
 * (+1 Point de Caractéristique max 2, +1 Don max 3, lus du fichier) ;
 * aucune caractéristique au-delà du max du fichier.
 */
import { describe, expect, it } from 'vitest'
import { budgetXp, depenseXp, effetAchat, listeAchats, validerAchats } from '../heritage'
import { problemesForces } from '../../wizard/validation'

const achatCarac = listeAchats().find((a) => effetAchat(a.achat).type === 'carac')!
const achatDon = listeAchats().find((a) => effetAchat(a.achat).type === 'don')!
const achatPv = listeAchats().find((a) => effetAchat(a.achat).type === 'pv')!

describe('T9 — budget et plafonds d’achats', () => {
  it('les achats témoins existent dans le fichier avec leurs max', () => {
    expect(achatCarac.max_achats).toBe(2)
    expect(achatDon.max_achats).toBe(3)
    expect(achatPv.max_achats).toBeUndefined()
  })

  it('une dépense au-delà du budget est refusée', () => {
    const fiche = { xpPerm: 1, achats: { [achatPv.achat]: 2 } }
    expect(depenseXp(fiche.achats)).toBeGreaterThan(budgetXp(fiche))
    expect(validerAchats(fiche)).not.toEqual([])
  })

  it('jumelle : la même dépense passe quand le budget suffit', () => {
    const fiche = { xpPerm: 2 * achatPv.cout_xp, achats: { [achatPv.achat]: 2 } }
    expect(validerAchats(fiche)).toEqual([])
  })

  it('max_achats respecté : un achat au-delà de son max est refusé', () => {
    const budget = 100
    expect(
      validerAchats({ xpPerm: budget, achats: { [achatCarac.achat]: achatCarac.max_achats! + 1 } }),
    ).not.toEqual([])
    expect(
      validerAchats({ xpPerm: budget, achats: { [achatDon.achat]: achatDon.max_achats! + 1 } }),
    ).not.toEqual([])
  })

  it('jumelle : au max exact, les mêmes achats passent', () => {
    const budget = 100
    expect(
      validerAchats({ xpPerm: budget, achats: { [achatCarac.achat]: achatCarac.max_achats! } }),
    ).toEqual([])
    expect(
      validerAchats({ xpPerm: budget, achats: { [achatDon.achat]: achatDon.max_achats! } }),
    ).toEqual([])
  })

  it('aucune caractéristique au-delà du max du fichier', () => {
    const problemes = problemesForces({
      caracs: { p: 3, r: 2, e: 1 },
      extras: { p: 3, r: 0, e: 0 },
      achats: { [achatCarac.achat]: 3 },
    })
    expect(problemes.some((p) => p.includes('au-delà'))).toBe(true)
  })

  it('jumelle : au max exact (3 + 2 = 5), pas de refus « au-delà »', () => {
    const problemes = problemesForces({
      caracs: { p: 3, r: 2, e: 1 },
      extras: { p: 2, r: 0, e: 0 },
      achats: { [achatCarac.achat]: 2 },
    })
    expect(problemes.some((p) => p.includes('au-delà'))).toBe(false)
    expect(problemes).toEqual([])
  })
})
