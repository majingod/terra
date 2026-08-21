/**
 * D20 ⑥② — le niveau est un fait CALCULÉ, plus un champ saisi.
 *
 * Il se dérive de l'historique : montées + 1. Deux sources qui peuvent
 * diverger, c'est exactement le mensonge qui a produit le trou de D19 — donc
 * la gate pose un champ `niveau` MENTEUR sur la fiche et sur
 * l'enregistrement, et vérifie que l'écran n'en tient aucun compte.
 *
 * D5 : les niveaux témoins sont ceux de la table d'évolution, jamais 1..5
 * écrits ici.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { niveauMax, niveauMin, niveauxPossibles } from '../../rules/niveau'
import Fiche from '../../pages/Fiche'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import { ficheComplete } from './aide-fiche-complete'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const BAS = niveauMin()
const HAUT = niveauMax()

function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

/** L'historique d'un personnage qui a VRAIMENT traversé les échelons 1..niveau. */
function historique(niveau: number): Array<Record<string, unknown>> {
  return niveauxPossibles()
    .filter((n) => n <= niveau)
    .map((n, index) => ({ niveau: n, le: 1_700_000_000_000 + index }))
}

/**
 * Une fiche du niveau demandé — historique VRAI, champ `niveau` MENTEUR (sur
 * la fiche du wizard comme sur l'enregistrement). Si le champ saisi peut
 * contredire l'historique, l'écran affichera le mensonge et la gate rougira.
 */
async function semer(niveau: number) {
  const mensonge = niveau === HAUT ? BAS : HAUT
  const base = ficheComplete(CLASSE, niveau, capNiveaux(niveau), 'Bob') as Record<string, unknown>
  const creation = { ...base, niveau: mensonge, historique: historique(niveau) }
  const personnage = personnageDeLaFiche(base as never)
  await db.personnages.clear()
  await db.personnages.add({
    ...personnage,
    id: 1,
    niveau: mensonge,
    creation: creation as never,
  })
}

function afficheFiche() {
  return render(
    <MemoryRouter initialEntries={['/fiche/1']}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Le niveau que l'écran AFFICHE, lu de la case « Niveau » de l'identité. */
async function niveauAffiche(): Promise<number> {
  const etiquette = await screen.findByText('Niveau')
  const valeur = etiquette.nextElementSibling?.textContent ?? ''
  return Number(valeur.trim())
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = () => {}
})

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

describe('D20 ② — le niveau affiché vaut montées + 1', () => {
  for (const niveau of niveauxPossibles()) {
    it(`niveau ${niveau} : ${niveau - BAS} montée(s) + 1, malgré un champ saisi menteur`, async () => {
      await semer(niveau)
      afficheFiche()
      expect(await niveauAffiche()).toBe(niveau)
    })
  }

  it('le bouton de montée part du niveau dérivé, pas du champ saisi', async () => {
    await semer(BAS)
    afficheFiche()
    // Un personnage de niveau BAS monte vers BAS+1 — le champ menteur dit HAUT,
    // qui proposerait le plafond « vois ton MJ » à la place du bouton.
    expect(
      await screen.findByRole('button', { name: `Monter au niveau ${BAS + 1}` }),
    ).toBeTruthy()
  })
})
