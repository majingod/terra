/**
 * Le libellé « Sous-branche » quitte l'AFFICHAGE des fiches d'avant le
 * wizard — le champ, lui, reste stocké.
 *
 * D16 a retiré la voie de l'en-tête des fiches du wizard ; le repli des
 * vieux enregistrements (ceux sans `creation`) la montrait encore. C'est un
 * changement d'affichage et rien d'autre : D16 ⑨ tient toujours — ni
 * renommage, ni effacement, un vieil export reste importable tel quel.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { classeSquelette } from '../../rules/stats'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import Fiche from '../Fiche'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]

/** L'enregistrement d'avant le wizard : pas de `creation`, une `sousBranche`. */
function personnageEpoque(): Omit<Personnage, 'id'> {
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: "Fiche d'époque",
    classe: classeSquelette(CLASSE)!.nom,
    sousBranche: VOIE.nom,
    niveau: 2,
  }
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

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

describe('Le libellé « Sous-branche » ne s’affiche plus', () => {
  it('une fiche d’époque s’affiche sans la ligne « Sous-branche »', async () => {
    const id = (await db.personnages.add(personnageEpoque() as never)) as number
    afficherFiche(id)
    expect(await screen.findByText("Fiche d'époque")).toBeTruthy()
    expect(screen.queryByText(/Sous-branche/)).toBeNull()
    // Le reste du repli est intact : la fiche reste lisible.
    expect(screen.getByText(/Classe/)).toBeTruthy()
    expect(screen.getByText(/Niveau/)).toBeTruthy()
  })

  it('jumelle : le champ stocké, lui, n’a pas bougé — rien n’est effacé', async () => {
    const id = (await db.personnages.add(personnageEpoque() as never)) as number
    afficherFiche(id)
    expect(await screen.findByText("Fiche d'époque")).toBeTruthy()
    const relu = await db.personnages.get(id)
    expect(relu?.sousBranche).toBe(VOIE.nom)
  })

  it('jumelle : le nom de la voie n’apparaît nulle part à l’écran de cette fiche', async () => {
    const id = (await db.personnages.add(personnageEpoque() as never)) as number
    afficherFiche(id)
    expect(await screen.findByText("Fiche d'époque")).toBeTruthy()
    expect(screen.queryAllByText(VOIE.nom)).toEqual([])
  })
})
