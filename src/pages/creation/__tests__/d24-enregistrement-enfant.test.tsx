/**
 * D24 · G5 — enregistrement : `competences` et `langues` de la fiche
 * enfant, pour Riche, Druide+Riche et Druide+Érudit (le cas Érudit simple
 * est couvert de bout en bout dans d24-flux-metier-langues-enfant.test.tsx).
 *
 * Comme D13 (d13-sortie-creation.test.tsx), on sème le brouillon directement
 * sur la dernière étape plutôt que de recliquer tout le parcours : ce test
 * porte sur ce qui s'écrit en base, pas sur la navigation.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../db'
import { classesEnfant } from '../../../rules/kids'
import { languesPigeablesEnfant } from '../../../rules/langues_kids'
import { etapesActivesEnfant } from '../../../wizard/enfant'
import { trancheEnfant } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import Creer from '../../Creer'

const DRUIDE = classesEnfant().find((c) => c.id === 'druide')!
const AUTRE = classesEnfant().find((c) => c.id !== 'druide')!
const [LANGUE_A, LANGUE_B] = languesPigeablesEnfant()

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = () => {}
})

beforeEach(async () => {
  await db.brouillons.clear()
  await db.personnages.clear()
})

afterEach(async () => {
  cleanup()
  await db.brouillons.clear()
  await db.personnages.clear()
})

async function semerEtCreer(fiche: FicheCreation) {
  const etapeFiche = etapesActivesEnfant(fiche).findIndex((e) => e.id === 'fiche')
  await db.brouillons.put({
    id: 1,
    etape: etapeFiche + 1,
    donnees: { fiche },
    updatedAt: Date.now(),
  })
  render(
    <MemoryRouter initialEntries={['/creer']}>
      <Routes>
        <Route path="/creer" element={<Creer />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
  const bouton = await screen.findByRole('button', { name: /créer la fiche/i })
  expect((bouton as HTMLButtonElement).disabled, 'la fiche devrait être prête').toBe(false)
  fireEvent.click(bouton)
  await waitFor(() => {
    expect(screen.getByText(/enregistrée sur cet appareil/i)).toBeTruthy()
  })
  const [personnage] = await db.personnages.toArray()
  return personnage
}

describe('D24 · G5 — enregistrement du métier et des langues', () => {
  it('Riche (hors Druide) : competences: [riche], langues: [commun]', async () => {
    const personnage = await semerEtCreer({
      trancheAge: trancheEnfant(),
      enfant: { faction: 'sanctum', classe: AUTRE.id, competence: 'riche', nom: 'Témoin' },
    })
    expect(personnage.competences).toEqual(['riche'])
    expect(personnage.langues).toEqual(['commun'])
  })

  it('Druide + Riche : langues: [commun, druidique]', async () => {
    const personnage = await semerEtCreer({
      trancheAge: trancheEnfant(),
      enfant: { faction: 'sanctum', classe: DRUIDE.id, competence: 'riche', nom: 'Témoin' },
    })
    expect(personnage.competences).toEqual(['riche'])
    expect(personnage.langues).toEqual(['commun', 'druidique'])
  })

  it('Druide + Érudit : le Druidique ET les 2 langues choisies s’enregistrent', async () => {
    const personnage = await semerEtCreer({
      trancheAge: trancheEnfant(),
      enfant: {
        faction: 'sanctum',
        classe: DRUIDE.id,
        competence: 'erudit',
        langues: [LANGUE_A.id, LANGUE_B.id],
        nom: 'Témoin',
      },
    })
    expect(personnage.competences).toEqual(['erudit'])
    expect(personnage.langues).toEqual(['commun', 'druidique', LANGUE_A.id, LANGUE_B.id])
  })
})
