/**
 * Lot C — le parcours ≤11 de bout en bout, dans le wizard RÉEL.
 *
 * L'étape tranche d'âge embranche : camp → niveau → classe → nom → fiche,
 * puis la fiche s'enregistre sur l'appareil. Aucune étape compétences ni
 * artisanats n'apparaît, et l'écran de sortie dit où retrouver la fiche.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { classesEnfant, factionsEnfant, getVersionKids } from '../../rules/kids'
import { getRules } from '../../rules/load'
import Creer from '../../pages/Creer'
import { ETAPES_ENFANT, etapesActivesEnfant } from '../enfant'

const SEUIL = getRules().age_et_gates.seuil
const FACTION = factionsEnfant()[0]
const CLASSE = classesEnfant()[0]

beforeAll(() => {
  // jsdom n'implémente ni l'un ni l'autre ; le wizard s'en sert au clic.
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = () => {}
})

beforeEach(async () => {
  sessionStorage.clear()
  await db.brouillons.clear()
  await db.personnages.clear()
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
      </Routes>
    </MemoryRouter>,
  )
}

/** Clique la carte de choix dont le texte contient `motif`. */
function choisir(motif: RegExp) {
  const carte = screen
    .getAllByRole('button')
    .find((el) => el.className.includes('carte-choix') && motif.test(el.textContent ?? ''))
  expect(carte, `carte introuvable : ${motif}`).toBeTruthy()
  fireEvent.click(carte!)
}

function continuer() {
  const bouton = screen.getByRole('button', { name: /^Continuer$/ }) as HTMLButtonElement
  expect(bouton.disabled).toBe(false)
  fireEvent.click(bouton)
}

describe('Lot C — parcours de création ≤11', () => {
  it('tranche_11_moins_parcourt_camp_niveau_classe_nom', async () => {
    afficheCreer()
    await screen.findByText('Avant de commencer')

    choisir(new RegExp(SEUIL.enfant))

    // Le stepper montre EXACTEMENT les étapes ACTIVES du flux enfant — sans
    // métier choisi, « Langues » (D24, conditionnelle à Érudit) n'y figure pas.
    const etapes = screen
      .getByRole('navigation', { name: /étapes de création/i })
      .querySelectorAll('li')
    expect([...etapes].map((li) => li.textContent?.replace(/[^A-Za-zÀ-ÿ]/g, ''))).toEqual(
      etapesActivesEnfant({ enfant: {} }).map((e) => e.nom.replace(/[^A-Za-zÀ-ÿ]/g, '')),
    )
    // Aucune étape artisanats / talents / destin / forces.
    expect(ETAPES_ENFANT.map((e) => e.id)).toEqual([
      'age',
      'camp',
      'niveau',
      'classe',
      'metier',
      'langues-enfant',
      'nom',
      'fiche',
    ])
    // Sans Érudit, « langues-enfant » ne fait pas partie des étapes actives.
    expect(etapesActivesEnfant({ enfant: {} }).map((e) => e.id)).toEqual([
      'age',
      'camp',
      'niveau',
      'classe',
      'metier',
      'nom',
      'fiche',
    ])

    continuer()
    await screen.findByText('Choisis ton camp')
    choisir(new RegExp(FACTION.nom))

    continuer()
    await screen.findByText('Ton niveau')
    // Le niveau 1 est le défaut : on continue sans rien toucher.

    continuer()
    await screen.findByText('Ta classe')
    choisir(new RegExp(CLASSE.nom))

    continuer()
    await screen.findByText('Ton métier')
    // Riche, pas Érudit : ce parcours n'exerce pas l'étape Langues (D24, testée à part).
    choisir(/Riche/)

    continuer()
    await screen.findByText('Le nom de ton personnage')
    fireEvent.change(screen.getByLabelText(/nom de ton personnage/i), {
      target: { value: 'Brume' },
    })

    continuer()
    await screen.findByText('Ta fiche')

    const creer = screen.getByRole('button', { name: /créer la fiche/i }) as HTMLButtonElement
    expect(creer.disabled).toBe(false)
    fireEvent.click(creer)

    await waitFor(() => {
      expect(screen.getByText(/enregistrée sur cet appareil/i)).toBeTruthy()
    })
    const [personnage] = await db.personnages.toArray()
    expect(personnage.nomPerso).toBe('Brume')
    expect(personnage.classe).toBe(CLASSE.nom)
    expect(personnage.faction).toBe(FACTION.nom)
    expect(personnage.niveau).toBe(1)
    expect(personnage.reglesVersion).toBe(getVersionKids())
    expect(personnage.creation?.enfant).toBeTruthy()
    // D24 : le métier choisi s'enregistre, et Riche ne donne aucune langue en plus du Commun.
    expect(personnage.competences).toEqual(['riche'])
    expect(personnage.langues).toEqual(['commun'])
  })

  it('jumelle : taper l’icône d’une étape franchie y ramène', async () => {
    afficheCreer()
    await screen.findByText('Avant de commencer')
    choisir(new RegExp(SEUIL.enfant))
    continuer()
    await screen.findByText('Choisis ton camp')

    fireEvent.click(screen.getByRole('button', { name: /Âge/ }))
    await screen.findByText('Avant de commencer')
  })

  it('jumelle : la tranche du Tome garde le wizard complet', async () => {
    afficheCreer()
    await screen.findByText('Avant de commencer')
    choisir(new RegExp(SEUIL.joueur_regulier))
    continuer()
    // Le camp du Tome, pas celui de la planche : la race y est demandée.
    await screen.findByText('Choisis ton camp')
    expect(screen.getByText(/la faction limite les races et les classes/i)).toBeTruthy()
  })
})
