/**
 * D17 ⑥ — la montée du flux ≤11 : aucun choix, confirmation seule.
 *
 * La planche enfant a sa propre table : elle donne la capacité UNIQUE de la
 * classe aux échelons qui en portent une, et de la Lutte ou des Dégâts aux
 * autres. Rien ne se choisit — l'écran montre ce qui arrive, et confirme.
 *
 * D14 : le texte affiché est `affichage ?? verbatim`. D5 : la classe et les
 * échelons témoins sont pris du corpus enfant par critère, jamais recopiés ;
 * les deux corpus ne se mélangent pas.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  capacitesEnfantAcquises,
  classesEnfant,
  factionsEnfant,
  niveauMaxEnfant,
  tableEvolutionEnfant,
} from '../../../rules/kids'
import { trancheEnfant } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import { db } from '../../../db'
import Fiche from '../../Fiche'
import { personnageEnfant } from './aide-montee'
import { ouvrirLaMonteeParLaGarde } from './aide-garde-montee'

/** Le Guerrier de la planche — la première classe du corpus enfant. */
const CLASSE = classesEnfant()[0]
const FACTION = factionsEnfant()[0]
const PLAFOND = niveauMaxEnfant()

/** Les échelons de montée, classés par ce que la table leur fait porter. */
const AVEC_CAPACITE = tableEvolutionEnfant()
  .filter((ligne) => ligne.capacite && ligne.niv > 1)
  .map((ligne) => ligne.niv)
const AVEC_LUTTE = tableEvolutionEnfant().filter((ligne) => (ligne.lutte ?? 0) > 0)
const AVEC_DEGATS = tableEvolutionEnfant().filter((ligne) => (ligne.degats ?? 0) > 0)

function ficheEnfant(niveau: number): FicheCreation {
  return {
    trancheAge: trancheEnfant(),
    enfant: { faction: FACTION.id, classe: CLASSE.id, niveau, nom: 'Lila' },
  }
}

async function poserFiche(niveau: number): Promise<number> {
  return (await db.personnages.add(personnageEnfant(ficheEnfant(niveau)) as never)) as number
}

function afficherFiche(id: number) {
  return render(
    <MemoryRouter initialEntries={[`/fiche/${id}`]}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * Ouvre l'écran de montée depuis la fiche.
 *
 * ⚠️ GATE MODIFIÉE PAR D20 lot 2 (Q4, t016), et voici pourquoi : la garde
 * d'intention s'est glissée entre le bouton et l'écran — elle vaut pour les
 * DEUX flux, le bouton de montée étant partagé. Ce que la gate garde n'a pas
 * bougé d'un pouce (l'écran ≤11 ne propose aucun choix, la confirmation écrit
 * d'un coup) ; seul le chemin pour y arriver a gagné un maintien.
 */
async function ouvrirLaMontee(niveau: number, id: number) {
  afficherFiche(id)
  await ouvrirLaMonteeParLaGarde(niveau + 1)
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

describe('D17 ⑥ — un Guerrier ≤11 qui monte vers un échelon à capacité', () => {
  const atteint = AVEC_CAPACITE[0]
  const depart = atteint - 1
  const capacite = capacitesEnfantAcquises(CLASSE.id, atteint).find((c) => c.niveau === atteint)!

  it('témoin : la table enfant porte bien cet échelon à capacité, et le texte a une forme d’affichage', () => {
    expect(AVEC_CAPACITE.length).toBeGreaterThan(0)
    expect(capacite).toBeDefined()
    expect(capacite.affichage ?? capacite.verbatim).toBeTruthy()
  })

  it('l’écran montre la capacité au complet, et ne propose AUCUN choix', async () => {
    const id = await poserFiche(depart)
    await ouvrirLaMontee(depart, id)

    expect(screen.getByRole('heading', { name: 'Ta nouvelle capacité' })).toBeTruthy()
    expect(screen.getByText(capacite.nom_affichage ?? capacite.nom)).toBeTruthy()
    expect(screen.getByText(`niveau ${capacite.niveau}`)).toBeTruthy()
    // D14 : le texte affiché est `affichage ?? verbatim`, jamais réécrit.
    expect(screen.getByText(capacite.affichage ?? capacite.verbatim)).toBeTruthy()

    // Aucune carte à choisir, aucun accordéon : la confirmation, et rien d'autre.
    const boutons = screen.getAllByRole('button')
    expect(boutons.filter((el) => el.hasAttribute('aria-pressed'))).toEqual([])
    expect(boutons.filter((el) => el.hasAttribute('aria-expanded'))).toEqual([])
    expect(boutons.map((el) => el.textContent)).toEqual([
      'Annuler',
      `Confirmer le niveau ${atteint}`,
    ])
  })

  it('confirmer ajoute la capacité et le niveau — d’un coup, sur le magasin', async () => {
    const id = await poserFiche(depart)
    const avant = (await db.personnages.get(id))!
    expect(avant.capacites).not.toContain(capacite.id)

    await ouvrirLaMontee(depart, id)
    fireEvent.click(screen.getByRole('button', { name: `Confirmer le niveau ${atteint}` }))

    await waitFor(async () => {
      expect((await db.personnages.get(id))!.niveau).toBe(atteint)
    })
    const apres = (await db.personnages.get(id))!
    expect(apres.capacites).toContain(capacite.id)
    expect(apres.creation?.enfant?.niveau).toBe(atteint)
    // La fiche montre alors la nouvelle capacité, au complet.
    expect(await screen.findByText(capacite.affichage ?? capacite.verbatim)).toBeTruthy()
  })
})

describe('D17 ⑥ jumelle — les échelons sans capacité : Lutte et Dégâts, lus de la table', () => {
  it('l’échelon de Lutte montre le gain de la table, et rien à choisir', async () => {
    const ligne = AVEC_LUTTE[0]
    const id = await poserFiche(ligne.niv - 1)
    await ouvrirLaMontee(ligne.niv - 1, id)
    expect(screen.getByRole('heading', { name: `+${ligne.lutte} Lutte` })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ta nouvelle capacité' })).toBeNull()
    expect(screen.getAllByRole('button').filter((el) => el.hasAttribute('aria-pressed'))).toEqual([])
  })

  it('l’échelon de Dégâts montre le sien', async () => {
    const ligne = AVEC_DEGATS[0]
    const id = await poserFiche(ligne.niv - 1)
    await ouvrirLaMontee(ligne.niv - 1, id)
    expect(screen.getByRole('heading', { name: `+${ligne.degats} Dégâts` })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ta nouvelle capacité' })).toBeNull()
  })

  it('la Lutte de la fiche suit le niveau après confirmation — elle se recalcule, elle n’est pas stockée', async () => {
    const ligne = AVEC_LUTTE[0]
    const id = await poserFiche(ligne.niv - 1)
    await ouvrirLaMontee(ligne.niv - 1, id)
    fireEvent.click(screen.getByRole('button', { name: `Confirmer le niveau ${ligne.niv}` }))
    await waitFor(async () => {
      expect((await db.personnages.get(id))!.niveau).toBe(ligne.niv)
    })
    const stats = await screen.findByText('Statistiques')
    const tuiles = within(stats.parentElement as HTMLElement)
    expect(tuiles.getByText('Lutte')).toBeTruthy()
    expect(
      tuiles.getByText(String(CLASSE.lutte + (ligne.lutte ?? 0))),
      'la Lutte de la classe plus celle de l’échelon',
    ).toBeTruthy()
  })
})

describe('D17 ⑥ jumelle — le plafond de la planche enfant', () => {
  it('au dernier échelon de SA table, la fiche enfant porte la ligne « vois ton MJ »', async () => {
    const id = await poserFiche(PLAFOND)
    afficherFiche(id)
    expect(
      await screen.findByText(`Niveau ${PLAFOND} atteint. Au-delà, vois ton MJ.`),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Monter au niveau / })).toBeNull()
  })
})
