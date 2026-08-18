/**
 * T3 (bug Manus #3) — droit de dons : droit(esprit=2)=1 ; droit(esprit=3)=2 ;
 * +1 par achat « +1 Don » ; un cumulable pris ×2 consomme 2 droits.
 * Jamais « 3 par défaut ».
 */
import { describe, expect, it } from 'vitest'
import { effetAchat, listeAchats } from '../heritage'
import { consommationDons, droitDons, listeDons, refusDons } from '../talents'

const achatDon = listeAchats().find((a) => effetAchat(a.achat).type === 'don')

describe('T3 — droit de dons (bug Manus #3)', () => {
  it('droit(esprit=2) = 1', () => {
    expect(droitDons(2)).toBe(1)
  })

  it('droit(esprit=3) = 2', () => {
    expect(droitDons(3)).toBe(2)
  })

  it("jamais « 3 par défaut » : ni esprit 1 ni esprit 2 ne donnent 3", () => {
    expect(droitDons(1)).not.toBe(3)
    expect(droitDons(2)).not.toBe(3)
  })

  it("+1 par achat « +1 Don » (libellé trouvé dans le fichier)", () => {
    expect(achatDon).toBeDefined()
    expect(droitDons(2, { [achatDon!.achat]: 1 })).toBe(2)
    expect(droitDons(3, { [achatDon!.achat]: 2 })).toBe(4)
  })

  it('un don cumulable pris ×2 consomme 2 droits', () => {
    const cumulable = listeDons().find((d) => d.cumulable)
    expect(cumulable).toBeDefined()
    expect(consommationDons({ [cumulable!.id]: 2 })).toBe(2)
    expect(refusDons({ [cumulable!.id]: 2 })).toEqual([])
  })

  it('jumelle : un don non cumulable pris ×2 est refusé', () => {
    const nonCumulable = listeDons().find((d) => !d.cumulable)
    expect(nonCumulable).toBeDefined()
    expect(refusDons({ [nonCumulable!.id]: 2 })).not.toEqual([])
    expect(refusDons({ [nonCumulable!.id]: 1 })).toEqual([])
  })
})
