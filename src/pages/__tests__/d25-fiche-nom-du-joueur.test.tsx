/**
 * D25 · G4 — le nom du joueur sur la fiche : lu, et modifiable sur place.
 *
 * Une seule page pour les ≤11 et les 12+, donc un seul endroit où ce nom se lit
 * et s'écrit. Rempli, la fiche dit « joué par X » ; vide, elle ne montre qu'une
 * invitation en pointillé — jamais une exigence, jamais un champ pré-rempli.
 *
 * L'édition inline écrit UN champ (et l'horodatage que porte toute modification
 * de fiche) : le reste de l'enregistrement ne bouge pas d'un octet. Effacer le
 * nom RETIRE la clé — un `''` en magasin ferait afficher « joué par  » et ne se
 * distinguerait plus d'un champ jamais rempli.
 *
 * ⛔ Aucun vrai nom : les valeurs viennent de `NOMS_JOUEUR_FICTIFS` (G1).
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { classesEnfant, factionsEnfant, niveauxPossiblesEnfant } from '../../rules/kids'
import { niveauMin } from '../../rules/niveau'
import { historiqueJusquA } from '../../wizard/__tests__/aide-fiche-complete'
import { trancheEnfant } from '../../wizard/validation'
import { AUTRE_NOM_JOUEUR_FICTIF, NOM_JOUEUR_FICTIF } from '../../__tests__/aide-noms-joueur'
import Fiche from '../Fiche'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]
const BAS = niveauMin()

/** Une fiche 12+ enregistrée, avec ou sans nom de joueur. */
function fiche12(nomDuJoueur?: string): Omit<Personnage, 'id'> {
  const base: Omit<Personnage, 'id'> = {
    ...nouvellePersonnageVierge(),
    nomPerso: 'Kaelen Sombrelame',
    classe: CLASSE,
    niveau: BAS,
    creation: {
      classe: CLASSE,
      capNiveaux: { [String(BAS)]: VOIE.capacites.find((c) => c.niveau === BAS)!.id },
      historique: historiqueJusquA(BAS),
    },
  }
  return nomDuJoueur === undefined ? base : { ...base, nomDuJoueur }
}

/** Une fiche ≤11 : même page, même champ (D27-bis : pas de feuille imprimée). */
function ficheEnfant(nomDuJoueur?: string): Omit<Personnage, 'id'> {
  const base: Omit<Personnage, 'id'> = {
    ...nouvellePersonnageVierge(),
    nomPerso: 'Brume',
    trancheAge: trancheEnfant(),
    creation: {
      trancheAge: trancheEnfant(),
      historique: historiqueJusquA(BAS),
      enfant: {
        faction: factionsEnfant()[0].id,
        classe: classesEnfant()[0].id,
        niveau: niveauxPossiblesEnfant()[0],
        nom: 'Brume',
      },
    },
  }
  return nomDuJoueur === undefined ? base : { ...base, nomDuJoueur }
}

async function afficheFiche(personnage: Omit<Personnage, 'id'>): Promise<number> {
  const id = await db.personnages.add(personnage)
  render(
    <MemoryRouter initialEntries={[`/fiche/${id}`]}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
  return id as number
}

/** Le bouton de l'état vide — l'invitation en pointillé. */
function boutonAjouter() {
  return screen.queryByRole('button', { name: '+ Ton nom (le joueur)' })
}

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

describe('D25 · G4 — la fiche montre le nom du joueur', () => {
  it('rempli → « joué par X », et pas de bouton d’ajout', async () => {
    await afficheFiche(fiche12(NOM_JOUEUR_FICTIF))
    const ligne = await screen.findByText(/joué par/)
    expect(ligne.textContent).toBe(`joué par ${NOM_JOUEUR_FICTIF}`)
    expect(boutonAjouter()).toBeNull()
  })

  it('vide → le bouton « + Ton nom (le joueur) », et rien qui ressemble à un nom', async () => {
    await afficheFiche(fiche12())
    await waitFor(() => expect(boutonAjouter()).not.toBeNull())
    expect(screen.queryByText(/joué par/)).toBeNull()
  })

  it('la fiche ≤11 porte le champ elle aussi — une seule page pour les deux flux', async () => {
    await afficheFiche(ficheEnfant(AUTRE_NOM_JOUEUR_FICTIF))
    const ligne = await screen.findByText(/joué par/)
    expect(ligne.textContent).toBe(`joué par ${AUTRE_NOM_JOUEUR_FICTIF}`)
  })
})

describe('D25 · G4 — l’édition inline', () => {
  it('depuis l’état vide : le bouton ouvre la saisie, OK enregistre', async () => {
    const id = await afficheFiche(fiche12())
    await waitFor(() => expect(boutonAjouter()).not.toBeNull())

    fireEvent.click(boutonAjouter()!)
    const champ = screen.getByLabelText('Ton vrai nom') as HTMLInputElement
    expect(champ.value, '⛔ jamais pré-rempli').toBe('')
    expect(champ.maxLength).toBe(40)

    fireEvent.change(champ, { target: { value: NOM_JOUEUR_FICTIF } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(async () =>
      expect((await db.personnages.get(id))?.nomDuJoueur).toBe(NOM_JOUEUR_FICTIF),
    )
    // …et l'écran suit : la ligne remplace le bouton.
    await screen.findByText(/joué par/)
  })

  it('depuis l’état rempli : un tap sur la ligne rouvre la saisie, pré-remplie du nom', async () => {
    const id = await afficheFiche(fiche12(NOM_JOUEUR_FICTIF))
    fireEvent.click(await screen.findByText(/joué par/))

    const champ = screen.getByLabelText('Ton vrai nom') as HTMLInputElement
    expect(champ.value).toBe(NOM_JOUEUR_FICTIF)

    fireEvent.change(champ, { target: { value: AUTRE_NOM_JOUEUR_FICTIF } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(async () =>
      expect((await db.personnages.get(id))?.nomDuJoueur).toBe(AUTRE_NOM_JOUEUR_FICTIF),
    )
  })

  it('la saisie est trimée, et une saisie vide RETIRE la clé', async () => {
    const id = await afficheFiche(fiche12(NOM_JOUEUR_FICTIF))
    fireEvent.click(await screen.findByText(/joué par/))
    fireEvent.change(screen.getByLabelText('Ton vrai nom'), {
      target: { value: `  ${AUTRE_NOM_JOUEUR_FICTIF}  ` },
    })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(async () =>
      expect((await db.personnages.get(id))?.nomDuJoueur).toBe(AUTRE_NOM_JOUEUR_FICTIF),
    )

    // Effacement : la clé s'en va, elle ne reste pas vide.
    fireEvent.click(await screen.findByText(/joué par/))
    fireEvent.change(screen.getByLabelText('Ton vrai nom'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(async () => {
      const relue = await db.personnages.get(id)
      expect(Object.prototype.hasOwnProperty.call(relue as object, 'nomDuJoueur')).toBe(false)
    })
    await waitFor(() => expect(boutonAjouter()).not.toBeNull())
  })

  it('l’écriture ne touche QUE ce champ (et l’horodatage de modification)', async () => {
    const id = await afficheFiche(fiche12())
    const avant = (await db.personnages.get(id)) as Personnage

    await waitFor(() => expect(boutonAjouter()).not.toBeNull())
    fireEvent.click(boutonAjouter()!)
    fireEvent.change(screen.getByLabelText('Ton vrai nom'), { target: { value: NOM_JOUEUR_FICTIF } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(async () =>
      expect((await db.personnages.get(id))?.nomDuJoueur).toBe(NOM_JOUEUR_FICTIF),
    )

    const apres = (await db.personnages.get(id)) as Personnage
    const { nomDuJoueur: _n1, updatedAt: _u1, ...resteAvant } = avant
    const { nomDuJoueur: _n2, updatedAt: _u2, ...resteApres } = apres
    expect(resteApres).toEqual(resteAvant)
    expect(apres.updatedAt).toBeGreaterThanOrEqual(avant.updatedAt)
  })

  it('la saisie est accessible : input labellisé, OK atteignable au clavier', async () => {
    await afficheFiche(fiche12())
    await waitFor(() => expect(boutonAjouter()).not.toBeNull())
    fireEvent.click(boutonAjouter()!)

    // Un libellé, donc un nom accessible — pas un champ muet à côté d'une icône.
    const champ = screen.getByLabelText('Ton vrai nom')
    expect(champ.tagName).toBe('INPUT')
    // Un vrai <button> : atteignable au Tab, actionnable à Entrée et à Espace.
    const ok = screen.getByRole('button', { name: 'OK' })
    expect(ok.tagName).toBe('BUTTON')
    expect(ok.getAttribute('disabled')).toBeNull()
  })
})
