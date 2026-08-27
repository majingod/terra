/**
 * t017 · GATES C — « Tes niveaux » et Monter passent SOUS LE BANDEAU
 * (Q24 A, Fred 2026-08-26 — retour terrain du 22 août).
 *
 * Au GN, le bouton Monter voisinait Imprimer au bas de la fiche : deux gestes
 * qui n'ont rien à faire côte à côte, et le mauvais partait parfois. Il remonte
 * sous l'identité, avec « Tes niveaux ».
 *
 * ⚠️ GATE QUI ROUGIT SUR `origin/main`, PAR ASSERTION : ce fichier n'importe que
 * des modules présents sur main (`Fiche`, `db`, les fabriques de fiches). Sur
 * main, C-G1 tombe sur « bandeau → Tes niveaux → Statistiques » (l'ordre y est
 * bandeau → Statistiques → … → Tes niveaux) et C-G2 sur le voisinage
 * d'Imprimer.
 *
 * ⛔ Rien de ce qui S'IMPRIME ne change : les deux blocs restent
 * `pas-a-imprimer` (C3), et la feuille papier est un autre composant.
 *
 * ⚠️ Q26 A (Fred, 2026-08-26) — ARBITRAGE. Le brief demandait d'abord « une
 * fiche ≤11 n'affiche ni « Tes niveaux » ni Monter » ; la moitié « ni Monter »
 * contredisait une gate déjà verte (`d20lot2-garde-intention` · « ⚠️ ≤11 : la
 * garde s'applique aussi — le bouton de montée est partagé »). Écart rapporté,
 * arbitré : la fiche ≤11 PARTAGE ce bouton, et il passe sous LEUR bandeau lui
 * aussi — la moitié des joueurs sont ≤11, et le voisinage avec Imprimer les
 * gênait pareillement. Leur carte s'étiquette « Ton niveau », au SINGULIER, et
 * ne porte ⛔ aucune rangée de pastilles : chez eux le niveau se déclare.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DUREE_MAINTIEN_MS } from '../../components/BoutonMaintien'
import { db, type Personnage } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { classesEnfant, factionsEnfant, normaliserNiveauEnfant } from '../../rules/kids'
import { niveauAtteignableEnfant } from '../../rules/montee'
import { niveauMin, niveauxPossibles } from '../../rules/niveau'
import { trancheEnfant } from '../../wizard/validation'
import { ficheComplete } from '../../wizard/__tests__/aide-fiche-complete'
import { personnageDeLaFiche, personnageEnfant } from '../montee/__tests__/aide-montee'
import Fiche from '../Fiche'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const DEPART = niveauMin()
const ATTEINT = niveauxPossibles().filter((niveau) => niveau > DEPART)[0]
const NOM = 'Brakk'

/** Les libellés arbitrés, écrits mot pour mot. */
const ETIQUETTE_NIVEAUX = 'Tes niveaux'
/** ≤11 (Q26 A) : au SINGULIER — chez eux le niveau se déclare. */
const ETIQUETTE_NIVEAU = 'Ton niveau'
const TITRE_STATS = 'Statistiques'
const TITRE_IDENTITE = 'Identité'
const IMPRIMER = 'Imprimer / PDF'
const MONTER = `Monter au niveau ${ATTEINT}`
const MAINTIEN = /maintiens pour monter/i

function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

async function poserFiche12(): Promise<number> {
  const fiche = ficheComplete(CLASSE, DEPART, capNiveaux(DEPART), NOM)
  return (await db.personnages.add(personnageDeLaFiche(fiche) as Personnage)) as number
}

async function poserFicheEnfant(): Promise<number> {
  return (await db.personnages.add(
    personnageEnfant({
      trancheAge: trancheEnfant(),
      enfant: {
        faction: factionsEnfant()[0].id,
        classe: classesEnfant()[0].id,
        niveau: normaliserNiveauEnfant(1),
        nom: 'Lila',
      },
    }) as Personnage,
  )) as number
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

/**
 * Le rang d'un nœud dans le DOM rendu — lu de `compareDocumentPosition`, pas
 * d'une classe ni d'une position devinée.
 */
function rangs(...noeuds: Element[]): number[] {
  const tous = Array.from(document.querySelectorAll('*'))
  return noeuds.map((noeud) => {
    const rang = tous.indexOf(noeud)
    expect(rang, 'nœud absent du document').toBeGreaterThanOrEqual(0)
    return rang
  })
}

/** L'étiquette « Tes niveaux » de la fiche — celle du texte, pas celle du `nav`. */
function etiquetteNiveaux(): Element | undefined {
  return Array.from(document.querySelectorAll('p')).find(
    (n) => n.textContent?.trim() === ETIQUETTE_NIVEAUX,
  )
}

/** L'étiquette « Ton niveau » de la carte ≤11 (Q26 A). */
function etiquetteSingulier(): Element | undefined {
  return Array.from(document.querySelectorAll('p')).find(
    (n) => n.textContent?.trim() === ETIQUETTE_NIVEAU,
  )
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

describe('t017 · C-G1 — l’ordre de la fiche 12+ : bandeau → Tes niveaux → Statistiques', () => {
  it('« Tes niveaux » est APRÈS l’identité et AVANT les statistiques', async () => {
    await afficherFiche(await poserFiche12())

    const identite = screen.getByRole('heading', { name: TITRE_IDENTITE })
    const stats = screen.getByRole('heading', { name: TITRE_STATS })
    const niveaux = etiquetteNiveaux()
    expect(niveaux, `la fiche n’affiche pas « ${ETIQUETTE_NIVEAUX} »`).toBeTruthy()

    const [rIdentite, rNiveaux, rStats] = rangs(identite, niveaux!, stats)
    expect(rNiveaux, '« Tes niveaux » n’est pas sous le bandeau d’identité').toBeGreaterThan(
      rIdentite,
    )
    expect(rNiveaux, '« Tes niveaux » n’est pas avant les statistiques').toBeLessThan(rStats)
  })

  it('Monter est DANS la carte « Tes niveaux », donc sous le bandeau lui aussi', async () => {
    await afficherFiche(await poserFiche12())

    const carte = etiquetteNiveaux()!.closest('div')!
    const monter = screen.getByRole('button', { name: MONTER })
    expect(
      carte.contains(monter),
      'le bouton Monter n’est pas dans la carte « Tes niveaux »',
    ).toBe(true)
  })

  it('⛔ la carte ne défile pas : elle ENROULE (aucun `overflow-x`)', async () => {
    await afficherFiche(await poserFiche12())
    const carte = etiquetteNiveaux()!.closest('div')!
    expect(carte.outerHTML).not.toContain('overflow-x')
    // La rangée pastilles + bouton s'enroule : sur écran étroit le bouton passe
    // dessous, il ne pousse jamais la fiche de travers.
    const rangee = carte.querySelector('.flex-wrap')
    expect(rangee, 'la rangée « pastilles + Monter » ne s’enroule pas').toBeTruthy()
  })
})

describe('t017 · C-G2 — Imprimer n’a plus Monter pour voisin', () => {
  it('aucun bouton Monter dans la section d’Imprimer ni dans la précédente', async () => {
    await afficherFiche(await poserFiche12())

    const imprimer = screen.getByRole('link', { name: IMPRIMER })
    const section = imprimer.closest('div')!
    expect(
      section.textContent,
      'Monter est encore dans le bloc d’actions, à côté d’Imprimer',
    ).not.toContain('Monter au niveau')

    // …et ce n'est plus son VOISIN non plus. C'était ça, le sinistre du terrain :
    // deux gestes lourds dos à dos, et c'est le mauvais qui partait. Il y a
    // maintenant des cartes entières entre les deux — les statistiques, les
    // capacités, les acquis. Le témoin de cette distance est le titre
    // « Statistiques » : sur `origin/main` il est AVANT Monter, plus après.
    const monter = screen.getByRole('button', { name: MONTER })
    const stats = screen.getByRole('heading', { name: TITRE_STATS })
    const [rMonter, rStats, rImprimer] = rangs(monter, stats, imprimer)
    expect(rMonter, 'Monter est passé sous les statistiques').toBeLessThan(rStats)
    expect(rStats, 'rien ne sépare plus Monter d’Imprimer').toBeLessThan(rImprimer)
  })
})

// GATE MODIFIÉE PAR Q26 A (t017, 2026-08-26)
// AVANT : « le flux ≤11 n'a pas bougé » — leur Monter restait en bas de fiche.
// Arbitrage : il passe sous LEUR bandeau lui aussi, dans une carte « Ton
// niveau » (singulier), et ⛔ sans rangée de pastilles.
describe('t017 · C-G3 — chez les ≤11 aussi, Monter est sous le bandeau', () => {
  it('l’ordre est identité → carte « Ton niveau » (avec Monter) → statistiques', async () => {
    await afficherFiche(await poserFicheEnfant())

    const identite = screen.getByRole('heading', { name: TITRE_IDENTITE })
    const stats = screen.getByRole('heading', { name: TITRE_STATS })
    const etiquette = etiquetteSingulier()
    expect(etiquette, `la fiche ≤11 n’affiche pas « ${ETIQUETTE_NIVEAU} »`).toBeTruthy()

    const vise = niveauAtteignableEnfant(normaliserNiveauEnfant(1))!
    const monter = screen.getByRole('button', { name: `Monter au niveau ${vise}` })
    expect(
      etiquette!.closest('div')!.contains(monter),
      'le bouton Monter du flux ≤11 n’est pas dans la carte « Ton niveau »',
    ).toBe(true)

    const [rIdentite, rEtiquette, rStats] = rangs(identite, etiquette!, stats)
    expect(rEtiquette, '« Ton niveau » n’est pas sous le bandeau d’identité').toBeGreaterThan(
      rIdentite,
    )
    expect(rEtiquette, '« Ton niveau » n’est pas avant les statistiques').toBeLessThan(rStats)
  })

  it('⛔ aucune rangée « Tes niveaux » : chez eux le niveau se DÉCLARE', async () => {
    await afficherFiche(await poserFicheEnfant())
    expect(
      etiquetteNiveaux(),
      '⛔ la rangée « Tes niveaux » a débordé sur le flux ≤11 : il n’y a pas de montées à rouvrir',
    ).toBeUndefined()
    expect(
      document.body.textContent,
      '⛔ le texte « Tes niveaux » apparaît sur une fiche ≤11',
    ).not.toContain(ETIQUETTE_NIVEAUX)
  })

  it('Imprimer n’a plus Monter pour voisin sur la planche ≤11 non plus', async () => {
    await afficherFiche(await poserFicheEnfant())

    // ⚠️ Le flux ≤11 garde l'impression SIMPLE de sa planche : son Imprimer est
    // un bouton, pas un lien vers la feuille 12+.
    const imprimer = screen.getByRole('button', { name: IMPRIMER })
    const section = imprimer.closest('div')!
    expect(
      section.textContent,
      'Monter est encore dans le bloc d’actions, à côté d’Imprimer',
    ).not.toContain('Monter au niveau')

    const vise = niveauAtteignableEnfant(normaliserNiveauEnfant(1))!
    const monter = screen.getByRole('button', { name: `Monter au niveau ${vise}` })
    const stats = screen.getByRole('heading', { name: TITRE_STATS })
    const [rMonter, rStats, rImprimer] = rangs(monter, stats, imprimer)
    expect(rMonter, 'Monter est passé sous les statistiques').toBeLessThan(rStats)
    expect(rStats, 'rien ne sépare plus Monter d’Imprimer').toBeLessThan(rImprimer)
  })
})

describe('t017 · C-G4 — toucher Monter ouvre TOUJOURS la fenêtre d’intention', () => {
  it('le maintien de la garde reste la seule porte de l’écran de montée', async () => {
    await afficherFiche(await poserFiche12())

    fireEvent.click(screen.getByRole('button', { name: MONTER }))
    const bouton = screen.getByRole('button', { name: MAINTIEN })
    expect(bouton, 'la garde d’intention a disparu avec le déménagement').toBeTruthy()

    /** L'écran de montée : son titre est un `heading`, le bouton ne l'est pas. */
    const ecranOuvert = () => screen.queryByRole('heading', { name: MONTER }) !== null
    expect(ecranOuvert(), 'l’écran s’est ouvert au simple toucher').toBe(false)

    // Un maintien INCOMPLET n'ouvre toujours rien.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    fireEvent.pointerDown(bouton)
    act(() => {
      vi.advanceTimersByTime(DUREE_MAINTIEN_MS - 1)
    })
    fireEvent.pointerUp(bouton)
    vi.useRealTimers()
    expect(ecranOuvert(), 'l’écran s’est ouvert avant la fin du maintien').toBe(false)

    // Le maintien COMPLET, lui, ouvre l'écran — et lui seul.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    fireEvent.pointerDown(screen.getByRole('button', { name: MAINTIEN }))
    act(() => {
      vi.advanceTimersByTime(DUREE_MAINTIEN_MS)
    })
    vi.useRealTimers()
    await waitFor(() => expect(ecranOuvert()).toBe(true))
  })
})
