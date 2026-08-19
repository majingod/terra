/**
 * Tests de caractérisation de l'Accueil — figent le comportement actuel de
 * l'écran (liste vide, une fiche, lien de carte, ordre, replis d'affichage,
 * bouton de création) avant tout ajout de fonctionnalité (suppression de
 * fiche à venir).
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
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

describe('Accueil', () => {
  it('liste vide : message d’absence de fiche, aucune carte', async () => {
    afficheAccueil()
    expect(await screen.findByText(/aucune fiche pour l'instant/i)).toBeTruthy()
    expect(screen.queryAllByRole('link', { name: /voir mes fiches|niveau/i })).toHaveLength(0)
    expect(document.querySelectorAll('a[href^="/fiche/"]')).toHaveLength(0)
  })

  it('une fiche : affiche son nom, et une ligne avec race, classe, niveau', async () => {
    await db.personnages.add({
      nomPerso: 'Kaelen',
      faction: '',
      race: 'Humain',
      classe: 'Guerrier',
      sousBranche: '',
      caracs: { puissance: 0, resistance: 0, esprit: 0 },
      dons: [],
      competences: [],
      capacites: [],
      langues: [],
      niveau: 3,
      ressources: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    afficheAccueil()

    expect(await screen.findByText('Kaelen')).toBeTruthy()
    expect(screen.getByText(/Humain.*Guerrier.*Niveau 3/)).toBeTruthy()
  })

  it('le lien d’une carte pointe vers /fiche/<id> de la bonne fiche', async () => {
    const id = await db.personnages.add({
      nomPerso: 'Sarielle',
      faction: '',
      race: 'Elfe',
      classe: 'Mage',
      sousBranche: '',
      caracs: { puissance: 0, resistance: 0, esprit: 0 },
      dons: [],
      competences: [],
      capacites: [],
      langues: [],
      niveau: 2,
      ressources: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    afficheAccueil()

    const carte = (await screen.findByText('Sarielle')).closest('a')
    expect(carte?.getAttribute('href')).toBe(`/fiche/${id}`)
  })

  it('⭐ ordre : de la plus récemment modifiée à la plus ancienne', async () => {
    await db.personnages.bulkAdd([
      {
        nomPerso: 'Ancienne',
        faction: '',
        race: 'Humain',
        classe: 'Guerrier',
        sousBranche: '',
        caracs: { puissance: 0, resistance: 0, esprit: 0 },
        dons: [],
        competences: [],
        capacites: [],
        langues: [],
        niveau: 1,
        ressources: {},
        createdAt: 1,
        updatedAt: 1000,
      },
      {
        nomPerso: 'Recente',
        faction: '',
        race: 'Humain',
        classe: 'Guerrier',
        sousBranche: '',
        caracs: { puissance: 0, resistance: 0, esprit: 0 },
        dons: [],
        competences: [],
        capacites: [],
        langues: [],
        niveau: 1,
        ressources: {},
        createdAt: 1,
        updatedAt: 3000,
      },
      {
        nomPerso: 'Intermediaire',
        faction: '',
        race: 'Humain',
        classe: 'Guerrier',
        sousBranche: '',
        caracs: { puissance: 0, resistance: 0, esprit: 0 },
        dons: [],
        competences: [],
        capacites: [],
        langues: [],
        niveau: 1,
        ressources: {},
        createdAt: 1,
        updatedAt: 2000,
      },
    ])

    afficheAccueil()

    await screen.findByText('Recente')
    const noms = screen
      .getAllByRole('link')
      .map((lien) => lien.textContent ?? '')
      .filter((texte) => /^(Ancienne|Recente|Intermediaire)/.test(texte))
      .map((texte) => texte.match(/^(Ancienne|Recente|Intermediaire)/)?.[0])

    expect(noms).toEqual(['Recente', 'Intermediaire', 'Ancienne'])
  })

  it('replis : nomPerso vide → « Sans nom » ; race et classe vides → « — »', async () => {
    await db.personnages.add({
      nomPerso: '',
      faction: '',
      race: '',
      classe: '',
      sousBranche: '',
      caracs: { puissance: 0, resistance: 0, esprit: 0 },
      dons: [],
      competences: [],
      capacites: [],
      langues: [],
      niveau: 5,
      ressources: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    afficheAccueil()

    expect(await screen.findByText('Sans nom')).toBeTruthy()
    expect(screen.getByText(/— · — · Niveau 5/)).toBeTruthy()
  })

  it('le bouton de création pointe vers /creer', async () => {
    afficheAccueil()
    const bouton = await screen.findByRole('link', { name: /créer un personnage/i })
    expect(bouton.getAttribute('href')).toBe('/creer')
  })
})
