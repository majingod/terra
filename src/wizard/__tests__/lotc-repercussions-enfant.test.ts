/**
 * Lot C — répercussions du flux enfant. Le régime est celui du 12+, pas un
 * troisième : baisser son niveau reprend ce que les échelons quittés
 * donnaient d'office, et la fenêtre le NOMME avant que quoi que ce soit ne
 * s'applique. Monter n'enlève rien.
 */
import { describe, expect, it } from 'vitest'
import { capacitesEnfantAcquises, classesEnfant } from '../../rules/kids'
import { changerNiveauEnfant, choixEnfant, etapesValidesEnfant } from '../enfant'
import type { FicheCreation } from '../types'
import { trancheEnfant } from '../validation'

const CLASSE = classesEnfant()[0]

function ficheAuNiveau(niveau: number): FicheCreation {
  return {
    trancheAge: trancheEnfant(),
    enfant: { faction: 'sanctum', classe: CLASSE.id, niveau, nom: 'Témoin' },
  }
}

describe('Lot C — fenêtre de répercussions du flux enfant', () => {
  it('baisse_de_niveau_enfant_ouvre_repercussions', () => {
    const changement = changerNiveauEnfant(ficheAuNiveau(5), 1)
    expect(changement.retraits.length).toBeGreaterThan(0)
    // Les deux capacités quittées sont nommées, chacune avec son échelon.
    const perdues = capacitesEnfantAcquises(CLASSE.id, 5).filter((c) => c.niveau > 1)
    expect(perdues).toHaveLength(2)
    for (const capacite of perdues) {
      const nom = capacite.nom_affichage ?? capacite.nom
      expect(changement.retraits.some((r) => r.includes(nom))).toBe(true)
    }
    // Les bonus d'échelon quittés sont nommés eux aussi.
    expect(changement.retraits.some((r) => /Lutte/.test(r))).toBe(true)
    expect(changement.retraits.some((r) => /Dégâts/.test(r))).toBe(true)
  })

  it('jumelle : monter de niveau ne retire rien', () => {
    const changement = changerNiveauEnfant(ficheAuNiveau(1), 5)
    expect(changement.retraits).toEqual([])
    expect(choixEnfant(changement.fiche).niveau).toBe(5)
  })

  it('jumelle : le même niveau ne retire rien', () => {
    expect(changerNiveauEnfant(ficheAuNiveau(3), 3).retraits).toEqual([])
  })

  it('rien ne s’applique avant la confirmation : la fiche d’origine est intacte', () => {
    const avant = ficheAuNiveau(5)
    const changement = changerNiveauEnfant(avant, 2)
    expect(choixEnfant(avant).niveau).toBe(5)
    expect(choixEnfant(changement.fiche).niveau).toBe(2)
  })

  it('une baisse d’un seul échelon ne nomme que ce que cet échelon donnait', () => {
    const changement = changerNiveauEnfant(ficheAuNiveau(2), 1)
    expect(changement.retraits).toHaveLength(1)
    expect(changement.retraits[0]).toMatch(/Lutte/)
  })

  it('la fiche enfant reste valide après la baisse (rien à retirer par le joueur)', () => {
    const changement = changerNiveauEnfant(ficheAuNiveau(5), 1)
    expect(etapesValidesEnfant(changement.fiche).every(Boolean)).toBe(true)
  })
})
