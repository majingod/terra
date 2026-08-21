/**
 * D17 ① et ② — le bouton de montée sur la fiche, et son exclusion d'impression.
 *
 * ① Une fiche sous le plafond porte « Monter au niveau {N+1} » ; au plafond,
 *   le bouton disparaît et la ligne « vois ton MJ » prend sa place (jumelle).
 * ② Ni l'un ni l'autre ne s'imprime : la feuille papier ne montre jamais un
 *   bouton d'app. L'assertion tient les DEUX bouts — la classe portée par les
 *   éléments, et la règle `@media print` qui la cache.
 *
 * D5 : le plafond et les échelons viennent de la table d'évolution ; seuls
 * les LIBELLÉS (arbitrés mot pour mot) sont écrits ici.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { classesAvecBranches, branchesDe } from '../../../rules/branches'
import { niveauMax, niveauxPossibles } from '../../../rules/niveau'
import { db } from '../../../db'
import { ficheComplete } from '../../../wizard/__tests__/aide-fiche-complete'
import Fiche from '../../Fiche'
import { personnageDeLaFiche } from './aide-montee'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const PLAFOND = niveauMax()

/** Les libellés arbitrés (brief D17 ③), écrits mot pour mot. */
const MONTER = (niveau: number) => `Monter au niveau ${niveau}`
const PLAFOND_ATTEINT = `Niveau ${PLAFOND} atteint. Au-delà, vois ton MJ.`

/** Une capacité par niveau, prise dans une voie différente à chaque échelon. */
function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

async function poserFiche(niveau: number): Promise<number> {
  const fiche = ficheComplete(CLASSE, niveau, capNiveaux(niveau), 'Bob')
  return (await db.personnages.add(personnageDeLaFiche(fiche) as never)) as number
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

describe('D17 ① — le bouton existe sous le plafond, disparaît au plafond', () => {
  it('une fiche sous le plafond porte « Monter au niveau {N+1} », sans ligne de plafond', async () => {
    const niveau = PLAFOND - 1
    afficherFiche(await poserFiche(niveau))
    expect(await screen.findByRole('button', { name: MONTER(niveau + 1) })).toBeTruthy()
    expect(screen.queryByText(PLAFOND_ATTEINT)).toBeNull()
  })

  it('jumelle : au plafond, plus de bouton — la ligne « vois ton MJ » prend sa place', async () => {
    afficherFiche(await poserFiche(PLAFOND))
    expect(await screen.findByText(PLAFOND_ATTEINT)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Monter au niveau / })).toBeNull()
  })

  it('jumelle : à CHAQUE échelon sous le plafond, le bouton nomme le niveau suivant', async () => {
    for (const niveau of niveauxPossibles().filter((n) => n < PLAFOND)) {
      cleanup()
      await db.personnages.clear()
      afficherFiche(await poserFiche(niveau))
      expect(
        await screen.findByRole('button', { name: MONTER(niveau + 1) }),
        `niveau ${niveau}`,
      ).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// ② l'impression
// ---------------------------------------------------------------------------

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'index.css'),
  'utf8',
)

/** Le bloc `@media print` de la feuille de style, accolades équilibrées. */
function blocImpression(): string {
  const debut = CSS.indexOf('@media print')
  expect(debut, 'aucun bloc @media print dans index.css').toBeGreaterThanOrEqual(0)
  let profondeur = 0
  for (let i = CSS.indexOf('{', debut); i < CSS.length; i++) {
    if (CSS[i] === '{') profondeur++
    if (CSS[i] === '}') {
      profondeur--
      if (profondeur === 0) return CSS.slice(debut, i + 1)
    }
  }
  throw new Error('bloc @media print non refermé')
}

/** La classe d'exclusion, portée par l'élément ou l'un de ses ancêtres. */
function horsImpression(element: HTMLElement): boolean {
  return element.closest('.pas-a-imprimer') !== null
}

describe('D17 ② — rien de tout ça ne s’imprime', () => {
  it('la feuille de style cache bien la classe d’exclusion à l’impression', () => {
    const bloc = blocImpression()
    expect(bloc).toContain('.pas-a-imprimer')
    const regle = bloc.slice(bloc.indexOf('.pas-a-imprimer'))
    expect(regle.slice(0, regle.indexOf('}'))).toMatch(/display:\s*none/)
  })

  it('le bouton de montée porte l’exclusion d’impression', async () => {
    const niveau = PLAFOND - 1
    afficherFiche(await poserFiche(niveau))
    const bouton = await screen.findByRole('button', { name: MONTER(niveau + 1) })
    expect(horsImpression(bouton)).toBe(true)
  })

  it('jumelle : la ligne de plafond porte la même exclusion', async () => {
    afficherFiche(await poserFiche(PLAFOND))
    const ligne = await screen.findByText(PLAFOND_ATTEINT)
    expect(horsImpression(ligne)).toBe(true)
  })

  it('jumelle : la zone imprimable de la fiche, elle, ne porte PAS l’exclusion', async () => {
    afficherFiche(await poserFiche(PLAFOND - 1))
    const identite = await screen.findByText('Identité')
    expect(identite.closest('.fiche-imprimable'), 'la fiche reste imprimable').toBeTruthy()
    expect(horsImpression(identite)).toBe(false)
  })
})
