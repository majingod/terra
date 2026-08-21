/**
 * D18 ⑤ — un troc s'écrit comme le reste : d'un coup, sur un magasin
 * réellement rempli ; Annuler n'écrit rien.
 *
 * La montée du mage passe par le MÊME chemin que D17 — une seule mise à jour,
 * jamais deux, jamais une fiche à moitié montée. Ce que la gate ajoute, c'est
 * qu'une capacité prise à la place d'un don y arrive entière : rangée parmi
 * les capacités, et sa provenance lisible sous `creation.capDons`.
 *
 * D7 : aucune montée de version Dexie — `creation` porte déjà la fiche du
 * wizard, et les champs du troc y vivent.
 *
 * D5 : la classe témoin est celle que les données désignent par leur champ
 * `troc` ; l'échelon témoin est lu de la table d'évolution.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { capacitesDeClasse } from '../../rules/capacites'
import { getRules } from '../../rules/load'
import { gainsMontee } from '../../rules/montee'
import { niveauMin, niveauxPossibles, tableEvolution } from '../../rules/niveau'
import { TROC_DON_VERS_CAPACITE } from '../../rules/troc'
import { ficheComplete } from '../../wizard/__tests__/aide-fiche-complete'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import Fiche from '../../pages/Fiche'
import { db, type Personnage } from '../index'

const CLASSE = getRules().classes_squelette.liste.find(
  (c) => c.troc === TROC_DON_VERS_CAPACITE,
)!.id

/** L'échelon de montée qui donne un don (le plus bas au-dessus du minimum). */
const ATTEINT = tableEvolution()
  .filter((ligne) => ligne.niv > niveauMin() && ligne.dons > 0)
  .map((ligne) => ligne.niv)[0]
const DEPART = ATTEINT - 1

const MONTER = `Monter au niveau ${ATTEINT}`
const CONFIRMER = `Confirmer le niveau ${ATTEINT}`
const TITRE_DON = `+${gainsMontee(ATTEINT).dons} don`
const CARTE_CAPACITE = `Capacité du niveau ${ATTEINT}`

function capNiveaux(niveau: number): Record<string, string> {
  const arbre = capacitesDeClasse(CLASSE)
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n) => {
      choix[String(n)] = arbre.find(
        (c) => c.niveau === n && !Object.values(choix).includes(c.id),
      )!.id
    })
  return choix
}

/** Les deux capacités que la gate va poser : l'une troquée, l'autre du niveau. */
function ciblesLibres() {
  const prises = Object.values(capNiveaux(DEPART))
  const libres = capacitesDeClasse(CLASSE).filter(
    (c) => c.niveau <= ATTEINT && !prises.includes(c.id),
  )
  return { troquee: libres[0], duNiveau: libres[1] }
}

/** Un magasin réellement rempli : trois fiches, dont celle qui monte. */
async function remplirLeMagasin(): Promise<number> {
  for (const [niveau, nom] of [
    [niveauMin(), 'Voisine'],
    [DEPART, 'Bob'],
    [ATTEINT, 'Voisin'],
  ] as Array<[number, string]>) {
    await db.personnages.add(
      personnageDeLaFiche(ficheComplete(CLASSE, niveau, capNiveaux(niveau), nom)) as never,
    )
  }
  return (await db.personnages.toArray()).find((p) => p.nomPerso === 'Bob')!.id as number
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

function carteDeGain(titre: string): HTMLElement {
  return screen.getByRole('heading', { name: titre }).parentElement as HTMLElement
}

function accordeons(carte: HTMLElement): HTMLElement[] {
  return within(carte)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-expanded'))
}

function choisissables(carte: HTMLElement): HTMLElement[] {
  return within(carte)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-pressed'))
}

/** Ouvre la voie d'une capacité dans une carte de gain, puis la touche. */
function poser(titre: string, cible: { nom: string; voieNom: string }) {
  const carte = carteDeGain(titre)
  const entete = accordeons(carte).find((e) => (e.textContent ?? '').includes(cible.voieNom))
  expect(entete, `accordéon introuvable pour ${cible.nom} (${cible.voieNom}) dans « ${titre} »`)
    .toBeTruthy()
  fireEvent.click(entete!)
  const bouton = choisissables(carte).find((el) => (el.textContent ?? '').startsWith(cible.nom))
  expect(bouton, `carte introuvable : ${cible.nom}`).toBeTruthy()
  fireEvent.click(bouton!)
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await db.personnages.clear()
})

describe('D18 ⑤ — la montée troquée s’écrit d’un coup', () => {
  it('une seule mise à jour, la capacité troquée rangée avec les capacités', async () => {
    const id = await remplirLeMagasin()
    const avant = (await db.personnages.get(id)) as Personnage
    const { troquee, duNiveau } = ciblesLibres()

    const update = vi.spyOn(db.personnages, 'update')
    const add = vi.spyOn(db.personnages, 'add')
    const put = vi.spyOn(db.personnages, 'put')

    afficherFiche(id)
    fireEvent.click(await screen.findByRole('button', { name: MONTER }))

    // Le don de l'échelon devient une capacité, puis la capacité du niveau.
    poser(TITRE_DON, troquee)
    poser(CARTE_CAPACITE, duNiveau)

    const confirmer = screen.getByRole('button', { name: CONFIRMER }) as HTMLButtonElement
    expect(confirmer.disabled).toBe(false)
    fireEvent.click(confirmer)

    await waitFor(async () => {
      expect((await db.personnages.get(id))!.niveau).toBe(ATTEINT)
    })

    const apres = (await db.personnages.get(id)) as Personnage
    expect(apres.capacites).toEqual([...avant.capacites, duNiveau.id, troquee.id])
    // Aucun don de plus : le droit du don est parti dans la capacité.
    expect(apres.dons).toEqual(avant.dons)
    // La provenance reste lisible dans les données stockées.
    expect(apres.creation?.capDons?.[String(ATTEINT)]).toBe(troquee.id)
    expect(apres.creation?.capNiveaux?.[String(ATTEINT)]).toBe(duNiveau.id)

    expect(update).toHaveBeenCalledTimes(1)
    expect(add).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('jumelle : les autres fiches du magasin ne bougent pas', async () => {
    const id = await remplirLeMagasin()
    const voisines = (await db.personnages.toArray()).filter((p) => p.id !== id)
    const { troquee, duNiveau } = ciblesLibres()

    afficherFiche(id)
    fireEvent.click(await screen.findByRole('button', { name: MONTER }))
    poser(TITRE_DON, troquee)
    poser(CARTE_CAPACITE, duNiveau)
    fireEvent.click(screen.getByRole('button', { name: CONFIRMER }))

    await waitFor(async () => {
      expect((await db.personnages.get(id))!.niveau).toBe(ATTEINT)
    })
    for (const voisine of voisines) {
      expect(await db.personnages.get(voisine.id as number), voisine.nomPerso).toEqual(voisine)
    }
  })
})

describe('D18 ⑤ jumelle — Annuler n’écrit rien, troc compris', () => {
  it('poser un troc puis annuler laisse l’enregistrement intact, à l’octet près', async () => {
    const id = await remplirLeMagasin()
    const avant = (await db.personnages.get(id)) as Personnage
    const { troquee, duNiveau } = ciblesLibres()

    const update = vi.spyOn(db.personnages, 'update')

    afficherFiche(id)
    fireEvent.click(await screen.findByRole('button', { name: MONTER }))
    poser(TITRE_DON, troquee)
    poser(CARTE_CAPACITE, duNiveau)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: CONFIRMER })).toBeNull()
    })
    expect(await db.personnages.get(id)).toEqual(avant)
    expect(update).not.toHaveBeenCalled()
  })
})
