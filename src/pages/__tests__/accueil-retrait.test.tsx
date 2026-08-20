/**
 * Retirer une fiche depuis l'accueil, et la remettre.
 *
 * Le chemin de retour compte autant que l'aller : une fiche remise revient à
 * sa place exacte dans l'ordre, et l'écran se comporte correctement quand
 * TOUTES les fiches sont retirées — le cas du joueur qui n'en a qu'une.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import Accueil from '../Accueil'

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

function afficheAccueil() {
  return render(
    <MemoryRouter>
      <Accueil />
    </MemoryRouter>,
  )
}

function fiche(nom: string, updatedAt: number): Omit<Personnage, 'id'> {
  return { ...nouvellePersonnageVierge(), nomPerso: nom, race: 'Humain', classe: 'Guerrier', niveau: 4, updatedAt }
}

/** Les noms des cartes de la liste principale, dans l'ordre affiché. */
function nomsDeLaListePrincipale(): string[] {
  return Array.from(document.querySelectorAll('a[href^="/fiche/"]')).map(
    (lien) => lien.querySelector('span')?.textContent ?? '',
  )
}

describe('Accueil — retirer une fiche', () => {
  it('la confirmation NOMME la fiche, jamais une confirmation générique', async () => {
    await db.personnages.add(fiche('Kaelen', 1000))
    afficheAccueil()

    fireEvent.click(await screen.findByRole('button', { name: /retirer kaelen de ta liste/i }))

    expect(screen.getByText('Retirer Kaelen de ta liste ?')).toBeTruthy()
  })

  it('annuler ne retire rien : la fiche reste dans la liste principale', async () => {
    await db.personnages.add(fiche('Kaelen', 1000))
    afficheAccueil()

    fireEvent.click(await screen.findByRole('button', { name: /retirer kaelen de ta liste/i }))
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

    expect(nomsDeLaListePrincipale()).toEqual(['Kaelen'])
    expect((await db.personnages.toArray())[0].retireeLe).toBeUndefined()
  })

  it('confirmer : la fiche quitte la liste principale et rejoint « Fiches retirées »', async () => {
    await db.personnages.bulkAdd([fiche('Kaelen', 2000), fiche('Sarielle', 1000)])
    afficheAccueil()

    fireEvent.click(await screen.findByRole('button', { name: /retirer kaelen de ta liste/i }))
    fireEvent.click(screen.getByRole('button', { name: /oui, retirer/i }))

    await waitFor(() => expect(nomsDeLaListePrincipale()).toEqual(['Sarielle']))
    expect(screen.getByRole('button', { name: /remettre kaelen dans ma liste/i })).toBeTruthy()

    // ⭐ Elle n'a pas été effacée, seulement marquée.
    expect(await db.personnages.count()).toBe(2)
  })

  it('⭐ chemin de retour : la fiche remise réapparaît à sa position d’origine dans l’ordre', async () => {
    await db.personnages.bulkAdd([
      fiche('Recente', 3000),
      fiche('Intermediaire', 2000),
      fiche('Ancienne', 1000),
    ])
    afficheAccueil()

    await waitFor(() =>
      expect(nomsDeLaListePrincipale()).toEqual(['Recente', 'Intermediaire', 'Ancienne']),
    )

    fireEvent.click(screen.getByRole('button', { name: /retirer intermediaire de ta liste/i }))
    fireEvent.click(screen.getByRole('button', { name: /oui, retirer/i }))
    await waitFor(() => expect(nomsDeLaListePrincipale()).toEqual(['Recente', 'Ancienne']))

    fireEvent.click(screen.getByRole('button', { name: /remettre intermediaire dans ma liste/i }))

    await waitFor(() =>
      expect(nomsDeLaListePrincipale()).toEqual(['Recente', 'Intermediaire', 'Ancienne']),
    )
  })

  it('cas limite : toutes les fiches retirées → état vide correct, fiches encore accessibles', async () => {
    await db.personnages.add(fiche('Kaelen', 1000))
    afficheAccueil()

    fireEvent.click(await screen.findByRole('button', { name: /retirer kaelen de ta liste/i }))
    fireEvent.click(screen.getByRole('button', { name: /oui, retirer/i }))

    expect(await screen.findByText(/aucune fiche pour l'instant/i)).toBeTruthy()
    expect(nomsDeLaListePrincipale()).toEqual([])

    // Toujours atteignable depuis la section des retirées — et toujours en base.
    expect(screen.getByRole('button', { name: /remettre kaelen dans ma liste/i })).toBeTruthy()
    expect(await db.personnages.count()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: /remettre kaelen dans ma liste/i }))
    await waitFor(() => expect(nomsDeLaListePrincipale()).toEqual(['Kaelen']))
    expect(screen.queryByText(/aucune fiche pour l'instant/i)).toBeNull()
  })

  it('la section des retirées n’apparaît pas tant qu’aucune fiche n’est retirée', async () => {
    await db.personnages.add(fiche('Kaelen', 1000))
    afficheAccueil()

    await screen.findByText('Kaelen')
    expect(screen.queryByText(/fiches retirées/i)).toBeNull()
  })
})
