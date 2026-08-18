/**
 * D13 — écran de sortie du wizard : après « Créer la fiche », le joueur
 * reste sur l'écran de création (aucune navigation vers /fiche/:id) ; un
 * texte confirme que la fiche est enregistrée sur l'appareil et un bouton
 * « Voir mes fiches » ramène à l'Accueil.
 *
 * `etapesValides` est neutralisé (D13 ne touche pas au moteur de règles) :
 * la fiche témoin est minimale, seule la mécanique de sortie est testée ici.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db'
import Creer from '../../Creer'
import { ETAPES } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'

vi.mock('../../../wizard/validation', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../wizard/validation')>()
  return { ...original, etapesValides: () => original.ETAPES.map(() => true) }
})

const FICHE_TEMOIN: FicheCreation = { nom: 'Témoin D13' }

beforeEach(async () => {
  await db.brouillons.put({
    id: 1,
    etape: ETAPES.length,
    donnees: { fiche: FICHE_TEMOIN },
    updatedAt: Date.now(),
  })
})

afterEach(async () => {
  cleanup()
  await db.brouillons.clear()
  await db.personnages.clear()
})

function afficheCreer() {
  return render(
    <MemoryRouter initialEntries={['/creer']}>
      <Routes>
        <Route path="/creer" element={<Creer />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
        <Route path="/fiche/:id" element={<div>FICHE-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('D13 — écran de sortie du wizard', () => {
  it('« Créer la fiche » : pas de nouvelle navigation, texte de sortie + bouton vers l’Accueil', async () => {
    afficheCreer()
    const bouton = await screen.findByRole('button', { name: /créer la fiche/i })
    expect((bouton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(bouton)

    await waitFor(() => {
      expect(screen.getByText(/enregistrée sur cet appareil/i)).toBeTruthy()
    })
    // Pas de navigation : ni vers /fiche/:id, ni vers /.
    expect(screen.queryByText('FICHE-TEMOIN')).toBeNull()
    expect(screen.queryByText('ACCUEIL-TEMOIN')).toBeNull()

    const lien = screen.getByRole('link', { name: /voir mes fiches/i })
    expect(lien.getAttribute('href')).toBe('/')

    fireEvent.click(lien)
    await waitFor(() => {
      expect(screen.getByText('ACCUEIL-TEMOIN')).toBeTruthy()
    })
  })

  it('jumelle : la fiche est bien enregistrée en base malgré l’absence de navigation', async () => {
    afficheCreer()
    const bouton = await screen.findByRole('button', { name: /créer la fiche/i })
    fireEvent.click(bouton)

    await waitFor(async () => {
      expect(await db.personnages.count()).toBe(1)
    })
    const [personnage] = await db.personnages.toArray()
    expect(personnage.nomPerso).toBe('Témoin D13')
  })
})
