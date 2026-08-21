/**
 * D20 ⑥③ — le train ne rompt pas.
 *
 * Arrivé au bout du niveau 1 avec une cible haute, l'écran suivant est la
 * montée 2 — PAS la fiche. Et à la fin de la dernière montée, la fiche.
 *
 * ⛔ Le compte d'écrans est CALCULÉ depuis la table d'évolution, jamais écrit
 * en dur : si la table gagne ou perd un échelon, cette gate suit.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { gainsMontee } from '../../rules/montee'
import { niveauMax, niveauMin, niveauxPossibles } from '../../rules/niveau'
import Creer from '../../pages/Creer'
import { ETAPES } from '../validation'
import { ficheComplete } from './aide-fiche-complete'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const BAS = niveauMin()
const HAUT = niveauMax()
/** ⛔ Le compte d'écrans de montée vient de la table, jamais d'un chiffre. */
const ECRANS_DE_MONTEE = niveauxPossibles().filter((n) => n > BAS)

function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

async function semerBrouillon(cible: number) {
  const base = ficheComplete(CLASSE, BAS, capNiveaux(BAS), 'Bob') as Record<string, unknown>
  const fiche = { ...base }
  delete fiche.niveau
  delete fiche.historique
  fiche.cible = cible
  await db.brouillons.put({
    id: 1,
    etape: ETAPES.length,
    donnees: { fiche } as never,
    updatedAt: Date.now(),
  })
}

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

/** Répond à tout ce que l'échelon demande, puis confirme. */
function traverser(niveauAtteint: number) {
  const gains = gainsMontee(niveauAtteint)
  if (gains.caracPoints > 0) {
    const carte = screen.getByRole('heading', {
      name: new RegExp(`^\\+${gains.caracPoints} point`),
    }).parentElement as HTMLElement
    fireEvent.click(
      within(carte)
        .getAllByRole('button')
        .find((el) => el.hasAttribute('aria-pressed') && !(el as HTMLButtonElement).disabled)!,
    )
  }
  if (gains.dons > 0) {
    const carte = screen.getByRole('heading', { name: new RegExp(`^\\+${gains.dons} don`) })
      .parentElement as HTMLElement
    fireEvent.click(
      within(carte)
        .getAllByRole('button')
        .find(
          (el) =>
            el.className.includes('carte-choix') && el.getAttribute('aria-disabled') !== 'true',
        )!,
    )
  }
  const carteCap = screen.getByRole('heading', { name: `Capacité du niveau ${niveauAtteint}` })
    .parentElement as HTMLElement
  for (const voie of VOIES) {
    const entete = within(carteCap)
      .getAllByRole('button')
      .find((el) => el.hasAttribute('aria-expanded') && (el.textContent ?? '').includes(voie.nom))
    if (entete) fireEvent.click(entete)
  }
  fireEvent.click(
    within(carteCap)
      .getAllByRole('button')
      .find(
        (el) =>
          el.hasAttribute('aria-pressed') &&
          el.getAttribute('aria-disabled') !== 'true' &&
          (el.textContent ?? '').includes('niv '),
      )!,
  )
  fireEvent.click(screen.getByRole('button', { name: `Confirmer le niveau ${niveauAtteint}` }))
}

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

describe('D20 ③ — le train ne rompt pas', () => {
  it('après le niveau 1, l’écran suivant est la montée 2 — pas la fiche', async () => {
    await semerBrouillon(HAUT)
    afficheCreer()
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la fiche' }))

    expect(
      await screen.findByRole('heading', { name: `Monter au niveau ${ECRANS_DE_MONTEE[0]}` }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('heading', { name: 'Fiche créée' }),
      'la fiche ne doit pas s’intercaler entre deux montées',
    ).toBeNull()
  })

  it('le train enchaîne EXACTEMENT les écrans que la table demande, puis la fiche', async () => {
    await semerBrouillon(HAUT)
    afficheCreer()
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la fiche' }))

    const vus: number[] = []
    for (const niveauAtteint of ECRANS_DE_MONTEE) {
      await screen.findByRole('heading', { name: `Monter au niveau ${niveauAtteint}` })
      // Entre deux montées, jamais la fiche : le joueur ne fait qu'un passage.
      expect(screen.queryByRole('heading', { name: 'Fiche créée' })).toBeNull()
      vus.push(niveauAtteint)
      traverser(niveauAtteint)
    }
    expect(vus).toEqual(ECRANS_DE_MONTEE)

    // …et à la fin de la dernière montée, la fiche.
    expect(await screen.findByRole('heading', { name: 'Fiche créée' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /^Monter au niveau/ })).toBeNull()
    await waitFor(async () => {
      expect((await db.personnages.toArray())[0].niveau).toBe(HAUT)
    })
  })

  it('jumelle : une cible au niveau de départ ne fait rouler aucun train', async () => {
    await semerBrouillon(BAS)
    afficheCreer()
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la fiche' }))

    expect(await screen.findByRole('heading', { name: 'Fiche créée' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /^Monter au niveau/ })).toBeNull()
  })
})
