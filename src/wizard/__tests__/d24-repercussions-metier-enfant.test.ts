/**
 * D24 · G3 — répercussions du changement de métier. Quitter Érudit alors
 * que des langues sont déjà choisies les nomme AVANT de les vider ; rejoindre
 * Érudit, ou changer entre deux métiers sans Érudit, s'applique tout de
 * suite. Même patron que la fenêtre de répercussions du 12+ et du niveau
 * enfant (lotc-repercussions-enfant.test.ts) : rien avant Continuer.
 */
import { describe, expect, it } from 'vitest'
import { classesEnfant } from '../../rules/kids'
import { languesPigeablesEnfant } from '../../rules/langues_kids'
import { changerMetierEnfant, choixEnfant } from '../enfant'
import type { FicheCreation } from '../types'
import { trancheEnfant } from '../validation'

const CLASSE = classesEnfant().find((c) => c.id !== 'druide')!
const [LANGUE_A, LANGUE_B] = languesPigeablesEnfant()

function ficheErudit(langues: string[]): FicheCreation {
  return {
    trancheAge: trancheEnfant(),
    enfant: { faction: 'sanctum', classe: CLASSE.id, competence: 'erudit', langues, nom: 'Témoin' },
  }
}

describe('D24 · G3 — quitter Érudit avec des langues choisies', () => {
  it('nomme les langues : « Langues : {X}, {Y} »', () => {
    const changement = changerMetierEnfant(ficheErudit([LANGUE_A.id, LANGUE_B.id]), 'riche')
    expect(changement.retraits).toEqual([`Langues : ${LANGUE_A.nom}, ${LANGUE_B.nom}`])
  })

  it('rien ne s’applique avant la confirmation : la fiche d’origine est intacte', () => {
    const avant = ficheErudit([LANGUE_A.id, LANGUE_B.id])
    const changement = changerMetierEnfant(avant, 'riche')
    expect(choixEnfant(avant).competence).toBe('erudit')
    expect(choixEnfant(avant).langues).toEqual([LANGUE_A.id, LANGUE_B.id])
    // Continuer : le métier change et les langues se vident.
    expect(choixEnfant(changement.fiche).competence).toBe('riche')
    expect(choixEnfant(changement.fiche).langues).toBeUndefined()
  })

  it('jumelle : sans langue choisie, quitter Érudit ne nomme rien (s’applique tout de suite)', () => {
    const changement = changerMetierEnfant(ficheErudit([]), 'riche')
    expect(changement.retraits).toEqual([])
    expect(choixEnfant(changement.fiche).competence).toBe('riche')
  })

  it('jumelle : rejoindre Érudit ne nomme rien', () => {
    const fiche: FicheCreation = {
      trancheAge: trancheEnfant(),
      enfant: { faction: 'sanctum', classe: CLASSE.id, competence: 'riche', nom: 'Témoin' },
    }
    const changement = changerMetierEnfant(fiche, 'erudit')
    expect(changement.retraits).toEqual([])
    expect(choixEnfant(changement.fiche).competence).toBe('erudit')
  })

  it('jumelle : changer entre deux métiers sans Érudit ne nomme rien', () => {
    const fiche: FicheCreation = {
      trancheAge: trancheEnfant(),
      enfant: { faction: 'sanctum', classe: CLASSE.id, competence: 'riche', nom: 'Témoin' },
    }
    const changement = changerMetierEnfant(fiche, 'herboriste')
    expect(changement.retraits).toEqual([])
    expect(choixEnfant(changement.fiche).competence).toBe('herboriste')
  })

  it('jumelle : rechoisir le même métier (Érudit) ne vide pas les langues', () => {
    const changement = changerMetierEnfant(ficheErudit([LANGUE_A.id, LANGUE_B.id]), 'erudit')
    expect(changement.retraits).toEqual([])
    expect(choixEnfant(changement.fiche).langues).toEqual([LANGUE_A.id, LANGUE_B.id])
  })
})
