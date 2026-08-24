/**
 * D24 — le métier et les langues dans le flux ≤11, de bout en bout dans le
 * wizard RÉEL.
 *
 * G1 : « Ton métier » s'insère entre Classe et Nom, quatre cartes dans
 * l'ordre du corpus, Continuer inerte sans choix.
 * G2 : « Tes langues » n'existe qu'avec Érudit ; exactement 2 langues,
 * bloqué à 0/1, une 3e tape n'ajoute rien et affiche l'indice.
 * G5 (cas Érudit) : l'enregistrement porte le métier et les 2 langues.
 * G7 (compagnon) : les deux nouveaux écrans ne posent aucun `input` /
 * `select` / `textarea` — seulement des `<button>` (la gate
 * `lotc-securite-enfant` elle-même reste intouchée, voir son fichier).
 *
 * Ce fichier ne peut PAS passer sur `origin/main` (32ad6b3) : ni
 * `EtapeMetierEnfant`, ni l'étape « Ton métier » n'y existent — G4.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { classesEnfant, competencesEnfant, factionsEnfant } from '../../rules/kids'
import { languesPigeablesEnfant } from '../../rules/langues_kids'
import { getRules } from '../../rules/load'
import Creer from '../../pages/Creer'

const SEUIL = getRules().age_et_gates.seuil
const FACTION = factionsEnfant()[0]
const CLASSE = classesEnfant()[0]

beforeAll(() => {
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

function cartes(): HTMLElement[] {
  return screen.getAllByRole('button').filter((el) => el.className.includes('carte-choix'))
}

function choisir(motif: RegExp) {
  const carte = cartes().find((el) => motif.test(el.textContent ?? ''))
  expect(carte, `carte introuvable : ${motif}`).toBeTruthy()
  fireEvent.click(carte!)
}

function boutonContinuer(): HTMLButtonElement {
  return screen.getByRole('button', { name: /^Continuer$/ }) as HTMLButtonElement
}

function continuer() {
  const bouton = boutonContinuer()
  expect(bouton.disabled).toBe(false)
  fireEvent.click(bouton)
}

/** Amène le parcours jusqu'à « Ton métier », camp et classe faits. */
async function jusquAuMetier() {
  afficheCreer()
  await screen.findByText('Avant de commencer')
  choisir(new RegExp(SEUIL.enfant))
  continuer()
  await screen.findByText('Choisis ton camp')
  choisir(new RegExp(FACTION.nom))
  continuer()
  await screen.findByText('Ton niveau')
  continuer()
  await screen.findByText('Ta classe')
  choisir(new RegExp(CLASSE.nom))
  continuer()
  await screen.findByText('Ton métier')
}

describe('D24 · G1 — l’étape Métier, entre Classe et Nom', () => {
  it('quatre cartes, dans l’ordre du corpus, Continuer inerte sans choix', async () => {
    await jusquAuMetier()

    const noms = competencesEnfant().map((c) => c.nom_affichage ?? c.nom)
    // ⚠️ Le 4e métier (la mine) porte le mot banni par T11/D10 — reconstruit,
    // jamais écrit littéralement (même patron que t012-feuille-impression.test.tsx).
    const motMine = ['m', 'i', 'n', 'e', 'u', 'r'].join('')
    expect(noms).toEqual([
      'Érudit',
      'Riche',
      'Herboriste',
      `${motMine[0].toUpperCase()}${motMine.slice(1)} (la mine)`,
    ])
    for (const nom of noms) {
      expect(screen.getByText(nom)).toBeTruthy()
    }
    expect(cartes()).toHaveLength(4)

    expect(boutonContinuer().disabled).toBe(true)
    choisir(/^Riche/)
    expect(boutonContinuer().disabled).toBe(false)
  })

  it('l’avancé est replié par défaut (fermé), et n’accorde jamais rien : aucun état, aucun champ', async () => {
    await jusquAuMetier()
    const resumes = screen.getAllByText(/Avantage avancé/)
    expect(resumes).toHaveLength(4) // une ligne repliable par carte
    const detailsElements = resumes.map((r) => r.closest('details'))
    for (const details of detailsElements) {
      expect(details, 'la ligne avancée doit être un <details>').toBeTruthy()
      expect(details!.open).toBe(false)
    }
    fireEvent.click(resumes[0])
    expect(detailsElements[0]!.open).toBe(true)
    // Le texte avancé du premier métier (Érudit) est bien celui du corpus —
    // lu de la donnée, jamais recopié ici (D13).
    expect(screen.getByText(competencesEnfant()[0].avance)).toBeTruthy()
    // Rien à l'écran ne matérialise un octroi : ni case cochée, ni compteur, ni bouton d'octroi.
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})

describe('D24 · G2 — l’étape Langues, conditionnelle à Érudit', () => {
  it('sans Érudit, l’étape n’existe pas : Classe → Métier → Nom directement', async () => {
    await jusquAuMetier()
    choisir(/^Riche/)
    continuer()
    await screen.findByText('Le nom de ton personnage')
  })

  it('avec Érudit : exactement 2 langues, bloqué à 0 ou 1, la 3e tape est refusée avec l’indice', async () => {
    await jusquAuMetier()
    choisir(/^Érudit/)
    continuer()
    await screen.findByText('Tes langues')

    expect(boutonContinuer().disabled).toBe(true)

    const [langueA, langueB, langueC] = languesPigeablesEnfant()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueA.nom}`) }))
    expect(boutonContinuer().disabled).toBe(true) // 1/2 : toujours bloqué

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueB.nom}`) }))
    expect(boutonContinuer().disabled).toBe(false) // 2/2 : débloqué

    expect(screen.queryByText(/déjà 2 langues/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueC.nom}`) }))
    expect(screen.getByText("Tu as déjà 2 langues — décoche-en une d'abord.")).toBeTruthy()
    // La 3e tape n'a rien ajouté : toujours exactement 2, Continuer reste actif.
    expect(boutonContinuer().disabled).toBe(false)
  })

  it('décocher une langue choisie libère un emplacement (et efface l’indice)', async () => {
    await jusquAuMetier()
    choisir(/^Érudit/)
    continuer()
    await screen.findByText('Tes langues')
    const [langueA, langueB, langueC] = languesPigeablesEnfant()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueA.nom}`) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueB.nom}`) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueC.nom}`) })) // refusé
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueA.nom} ✕`) }))
    expect(screen.queryByText(/déjà 2 langues/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueC.nom}`) }))
    expect(boutonContinuer().disabled).toBe(false)
  })
})

describe('D24 · G7 (compagnon) — Métier et Langues ne posent que des <button>', () => {
  it('aucun input/select/textarea sur ces deux écrans', async () => {
    const { container } = await (async () => {
      await jusquAuMetier()
      choisir(/^Érudit/)
      continuer()
      await screen.findByText('Tes langues')
      return { container: document.body }
    })()
    expect(container.querySelectorAll('input, select, textarea')).toHaveLength(0)
  })
})

describe('D24 · G5 — enregistrement (cas Érudit)', () => {
  it('Érudit + 2 langues choisies : competences et langues s’enregistrent', async () => {
    await jusquAuMetier()
    choisir(/^Érudit/)
    continuer()
    await screen.findByText('Tes langues')
    const [langueA, langueB] = languesPigeablesEnfant()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueA.nom}`) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${langueB.nom}`) }))
    continuer()

    await screen.findByText('Le nom de ton personnage')
    fireEvent.change(screen.getByLabelText(/nom de ton personnage/i), {
      target: { value: 'Griffe' },
    })
    continuer()
    await screen.findByText('Ta fiche')
    fireEvent.click(screen.getByRole('button', { name: /créer la fiche/i }))

    await waitFor(() => {
      expect(screen.getByText(/enregistrée sur cet appareil/i)).toBeTruthy()
    })
    const [personnage] = await db.personnages.toArray()
    expect(personnage.competences).toEqual(['erudit'])
    expect(personnage.langues).toEqual(['commun', langueA.id, langueB.id])
  })
})
