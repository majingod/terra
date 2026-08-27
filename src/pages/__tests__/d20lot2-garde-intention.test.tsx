/**
 * D20 lot 2 — GATE GL4 : la GARDE D'INTENTION de la montée (Q4, t016, Fred
 * 2026-08-26).
 *
 * Une montée est un geste lourd : elle s'ajoute à la fiche pour de bon. Entre
 * le toucher du bouton et l'écran de montée, l'app demande donc de la volonté
 * — le même geste que la suppression (D23) : un maintien de 1 500 ms, sur un
 * bouton qui NOMME le personnage et le niveau visé.
 *
 * ⚠️ GATE QUI ROUGIT SUR `origin/main`, PAR ASSERTION. Ce fichier n'importe QUE
 * des modules présents sur main (`Fiche`, `db`, `BoutonMaintien` pour la
 * durée, les fabriques de fiches) : sur main, toucher le bouton ouvre l'écran
 * de montée DIRECTEMENT, et l'assertion « l'écran ne s'est pas ouvert » tombe
 * proprement — jamais un import cassé, qui ne prouverait rien.
 *
 * Le chrono du maintien est un `setInterval` : on ne fake QUE `setInterval` et
 * `clearInterval`. Faker `setTimeout` casserait Dexie, `fake-indexeddb` et
 * l'attente de `@testing-library` — même mécanique que la gate D23 · G2.
 *
 * ⛔ Les LIGNES DE COUPE, gardées ici aussi : le train de création ne porte
 * PAS la garde (la cible choisie à l'étape « Ton niveau » EST l'intention, et
 * trois maintiens d'affilée puniraient le chemin normal) et la correction par
 * pastille non plus (sa fenêtre de répercussions est sa garde).
 *
 * D5 : les échelons et le plafond viennent de la table ; seuls les LIBELLÉS
 * arbitrés sont écrits ici, mot pour mot.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DUREE_MAINTIEN_MS } from '../../components/BoutonMaintien'
import { db, type Personnage } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { classesEnfant, factionsEnfant, normaliserNiveauEnfant } from '../../rules/kids'
import { niveauAtteignableEnfant } from '../../rules/montee'
import { trancheEnfant } from '../../wizard/validation'
import { niveauMax, niveauMin, niveauxPossibles } from '../../rules/niveau'
import { ficheComplete } from '../../wizard/__tests__/aide-fiche-complete'
import { personnageDeLaFiche, personnageEnfant } from '../montee/__tests__/aide-montee'
import Fiche from '../Fiche'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const DEPART = niveauMin()
const ATTEINT = niveauxPossibles().filter((niveau) => niveau > DEPART)[0]
const NOM = 'Maël du Sanctum'

/** Les libellés arbitrés (Q4, t016), écrits mot pour mot. */
const MONTER = `Monter au niveau ${ATTEINT}`
const MAINTIEN = /maintiens pour monter/i
const INTENTION = `Tu t'apprêtes à monter ${NOM} au niveau ${ATTEINT} — cette montée s'ajoutera à sa fiche.`
/** Le titre de l'écran de montée : ce qui ne doit PAS être là avant la fin. */
const ECRAN_DE_MONTEE = MONTER

/** Une capacité par niveau, prise dans une voie tournante. */
function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

async function poserFiche(): Promise<number> {
  const fiche = ficheComplete(CLASSE, DEPART, capNiveaux(DEPART), NOM)
  return (await db.personnages.add(personnageDeLaFiche(fiche) as Personnage)) as number
}

async function afficherFiche(id: number) {
  render(
    <MemoryRouter initialEntries={[`/fiche/${id}`]}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Chargement…')).toBeNull())
}

/** Le titre de l'écran de montée est un `heading` — le bouton, non. */
function ecranDeMonteeOuvert(): boolean {
  return screen.queryByRole('heading', { name: ECRAN_DE_MONTEE }) !== null
}

/**
 * Maintient le bouton `duree` ms, chrono faké, puis rend la main au temps réel.
 *
 * ⚠️ L'absence du bouton est une ASSERTION nommée, pas un plantage de requête :
 * c'est ce qui fait rougir cette gate PROPREMENT sur `origin/main`, où la
 * garde n'existe pas encore.
 */
function maintient(duree: number, relache = true) {
  const boutons = screen.queryAllByRole('button', { name: MAINTIEN })
  expect(
    boutons.length,
    'la fenêtre d’intention n’offre aucun bouton à maintien : la garde manque',
  ).toBe(1)
  const bouton = boutons[0]
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  fireEvent.pointerDown(bouton)
  act(() => {
    vi.advanceTimersByTime(duree)
  })
  if (relache) fireEvent.pointerUp(bouton)
  vi.useRealTimers()
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(async () => {
  vi.useRealTimers()
  cleanup()
  await db.personnages.clear()
})

describe('D20 lot 2 · GL4 — toucher le bouton de montée ouvre la fenêtre d’INTENTION', () => {
  it('témoin : la fiche part bien sous le plafond, avec un échelon à gagner', async () => {
    await afficherFiche(await poserFiche())
    expect(screen.getByRole('button', { name: MONTER })).toBeTruthy()
    expect(ATTEINT).toBeLessThanOrEqual(niveauMax())
    expect(ecranDeMonteeOuvert()).toBe(false)
  })

  it('⭐ le toucher ouvre la fenêtre, qui NOMME le personnage et le niveau visé', async () => {
    await afficherFiche(await poserFiche())
    fireEvent.click(screen.getByRole('button', { name: MONTER }))

    // ⛔ Jamais une confirmation générique : le nom et le niveau y sont.
    const question = Array.from(document.querySelectorAll('p')).find(
      (n) => n.textContent?.replace(/\s+/g, ' ').trim() === INTENTION,
    )
    expect(question, `la fenêtre d’intention ne dit pas : « ${INTENTION} »`).toBeTruthy()
    expect(screen.getByRole('button', { name: MAINTIEN })).toBeTruthy()
  })

  it('⭐ l’écran de montée ne s’ouvre PAS avant la fin du maintien', async () => {
    await afficherFiche(await poserFiche())
    fireEvent.click(screen.getByRole('button', { name: MONTER }))
    expect(
      ecranDeMonteeOuvert(),
      'l’écran de montée s’est ouvert sans que le maintien ait commencé',
    ).toBe(false)

    // Un maintien INCOMPLET (relâché avant la fin) ne fait rien du tout.
    maintient(DUREE_MAINTIEN_MS - 1)
    expect(
      ecranDeMonteeOuvert(),
      'l’écran de montée s’est ouvert avant la fin du maintien',
    ).toBe(false)
    // …et la fenêtre d'intention est toujours là, prête à recommencer.
    expect(screen.getByRole('button', { name: MAINTIEN })).toBeTruthy()
  })

  it('⭐ le maintien complet, LUI, ouvre l’écran de montée', async () => {
    await afficherFiche(await poserFiche())
    fireEvent.click(screen.getByRole('button', { name: MONTER }))
    maintient(DUREE_MAINTIEN_MS)
    await waitFor(() => expect(ecranDeMonteeOuvert()).toBe(true))
  })

  it('jumelle : la garde n’ÉCRIT rien — ni ouverte, ni abandonnée', async () => {
    const id = await poserFiche()
    const avant = JSON.stringify(await db.personnages.get(id))
    await afficherFiche(id)

    fireEvent.click(screen.getByRole('button', { name: MONTER }))
    maintient(DUREE_MAINTIEN_MS - 1)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(JSON.stringify(await db.personnages.get(id))).toBe(avant)
    // Annuler rend le bouton de montée : le joueur n'est pas coincé.
    expect(await screen.findByRole('button', { name: MONTER })).toBeTruthy()
  })
})

describe('D20 lot 2 · GL4 — les lignes de coupe de la garde', () => {
  const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

  // GATE MODIFIÉE PAR D20-bis (t017, Q23 A, 2026-08-26) — commentaire seul,
  // aucune assertion touchée. Depuis D20-bis le wizard 12+ ne pose plus de
  // cible : ce train ne part QUE d'un brouillon commencé avant ce lot. La ligne
  // de coupe garde donc désormais le chemin HÉRITÉ, et elle le garde entier.
  it('⛔ le TRAIN de création ne porte pas la garde — la cible EST l’intention', () => {
    const source = readFileSync(join(RACINE, 'src', 'pages', 'Creer.tsx'), 'utf8')
    expect(
      source,
      'le train de création s’est mis à demander un maintien : trois d’affilée puniraient le chemin normal',
    ).not.toContain('BoutonMaintien')
    expect(source).not.toContain('FenetreIntentionMontee')
  })

  it('⛔ la CORRECTION par pastille non plus — sa fenêtre de répercussions est sa garde', () => {
    const chemin = join(RACINE, 'src', 'pages', 'montee', 'EcranCorrection.tsx')
    // Assertion nommée, jamais un ENOENT : sur `origin/main` l'écran de
    // correction n'existe pas encore, et la gate doit le DIRE.
    expect(existsSync(chemin), 'l’écran de correction par pastille n’existe pas').toBe(true)
    expect(readFileSync(chemin, 'utf8')).not.toContain('BoutonMaintien')
  })

  it('⚠️ ≤11 : la garde s’applique aussi — le bouton de montée est partagé', async () => {
    // Prouvé par le COMPORTEMENT, pas par la lecture de la source : une fiche
    // du flux ≤11 passe par la même porte.
    const faction = factionsEnfant()[0]
    const classe = classesEnfant()[0]
    const NOM_ENFANT = 'Lila'
    const niveau = normaliserNiveauEnfant(1)
    const vise = niveauAtteignableEnfant(niveau)!
    const id = (await db.personnages.add(
      personnageEnfant({
        trancheAge: trancheEnfant(),
        enfant: { faction: faction.id, classe: classe.id, niveau, nom: NOM_ENFANT },
      }) as Personnage,
    )) as number
    await afficherFiche(id)

    fireEvent.click(screen.getByRole('button', { name: `Monter au niveau ${vise}` }))
    const attendu = `Tu t'apprêtes à monter ${NOM_ENFANT} au niveau ${vise} — cette montée s'ajoutera à sa fiche.`
    expect(
      Array.from(document.querySelectorAll('p')).some(
        (n) => n.textContent?.replace(/\s+/g, ' ').trim() === attendu,
      ),
      `la fenêtre d’intention manque au flux ≤11 : « ${attendu} »`,
    ).toBe(true)
    expect(screen.getByRole('button', { name: MAINTIEN })).toBeTruthy()
    // …et l'écran de montée ≤11 ne s'ouvre pas avant la fin du maintien.
    expect(screen.queryByRole('heading', { name: 'Ta nouvelle capacité' })).toBeNull()
  })
})
