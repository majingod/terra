/**
 * D17 ⑤ — la confirmation écrit TOUT d'un coup, sur un magasin réellement
 * rempli ; Annuler n'écrit rien.
 *
 * D7 : aucune montée de version Dexie, et surtout pas deux écritures qui
 * pourraient laisser la fiche à moitié montée si la seconde échoue — la
 * fiche vit sur l'appareil du joueur, sans sauvegarde serveur.
 *
 * La gate part de la fiche affichée et va jusqu'au magasin : elle touche le
 * bouton, pose les choix, confirme, puis relit l'enregistrement.
 *
 * D5 : l'échelon témoin est CHOISI dans la table d'évolution (celui qui donne
 * un point de caractéristique) ; seuls les libellés arbitrés sont écrits ici.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { capacitesDisponibles } from '../../rules/capacites'
import { niveauMin, niveauxPossibles, tableEvolution } from '../../rules/niveau'
import { ficheComplete } from '../../wizard/__tests__/aide-fiche-complete'
import { niveauCourant } from '../../wizard/historique'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import Fiche from '../../pages/Fiche'
import { db, type Personnage } from '../index'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)

/** L'échelon de montée qui donne un point de caractéristique (le plus haut). */
const ATTEINT = tableEvolution()
  .filter((ligne) => ligne.niv > niveauMin() && (ligne.carac_points ?? 0) > 0)
  .map((ligne) => ligne.niv)
  .pop()!
const DEPART = ATTEINT - 1
const POINTS = tableEvolution().find((l) => l.niv === ATTEINT)!.carac_points ?? 0

/** Libellés arbitrés (brief D17 ③), mot pour mot. */
const MONTER = `Monter au niveau ${ATTEINT}`
const CONFIRMER = `Confirmer le niveau ${ATTEINT}`
const CARTE_CAPACITE = `Capacité du niveau ${ATTEINT}`

function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
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
  const bob = (await db.personnages.toArray()).find((p) => p.nomPerso === 'Bob')!
  return bob.id as number
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

function choisissables(carte: HTMLElement): HTMLElement[] {
  return within(carte)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-pressed'))
}

/** La capacité que la gate va choisir : la première du bassin de l'échelon. */
function capaciteLibre() {
  return capacitesDisponibles(CLASSE, ATTEINT, Object.values(capNiveaux(DEPART)))[0]
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await db.personnages.clear()
})

describe('D17 ⑤ — confirmer écrit niveau, capacité et caractéristique d’un coup', () => {
  it('témoin : cet échelon donne bien un point de caractéristique', () => {
    expect(POINTS).toBeGreaterThan(0)
  })

  it('la fiche montée est écrite en UNE seule mise à jour', async () => {
    const id = await remplirLeMagasin()
    const avant = (await db.personnages.get(id)) as Personnage
    const capacite = capaciteLibre()

    const update = vi.spyOn(db.personnages, 'update')
    const add = vi.spyOn(db.personnages, 'add')
    const put = vi.spyOn(db.personnages, 'put')

    afficherFiche(id)
    fireEvent.click(await screen.findByRole('button', { name: MONTER }))

    // Le jeton de Puissance, puis la capacité — sa voie ouverte au passage.
    const jetons = choisissables(carteDeGain(`+${POINTS} point de caractéristique`))
    const puissance = jetons.find((el) => (el.textContent ?? '').startsWith('Puissance'))!
    fireEvent.click(puissance)

    const carteCapacite = carteDeGain(CARTE_CAPACITE)
    const entete = within(carteCapacite)
      .getAllByRole('button')
      .find(
        (el) => el.hasAttribute('aria-expanded') && (el.textContent ?? '').includes(capacite.voieNom),
      )!
    fireEvent.click(entete)
    fireEvent.click(
      choisissables(carteCapacite).find((el) => (el.textContent ?? '').startsWith(capacite.nom))!,
    )

    const confirmer = screen.getByRole('button', { name: CONFIRMER }) as HTMLButtonElement
    expect(confirmer.disabled).toBe(false)
    fireEvent.click(confirmer)

    await waitFor(async () => {
      expect((await db.personnages.get(id))!.niveau).toBe(ATTEINT)
    })

    const apres = (await db.personnages.get(id)) as Personnage
    // Le niveau, la capacité et le point de caractéristique — tous ensemble.
    expect(apres.niveau).toBe(avant.niveau + 1)
    expect(apres.capacites).toEqual([...avant.capacites, capacite.id])
    expect(apres.caracs.puissance).toBe(avant.caracs.puissance + POINTS)
    expect(apres.caracs.resistance).toBe(avant.caracs.resistance)
    expect(apres.caracs.esprit).toBe(avant.caracs.esprit)
    // La fiche du wizard avance avec l'enregistrement : c'est elle qui
    // s'affiche, et elle qui porte l'anti-doublon de la prochaine montée.
    //
    // ⚠️ GATE MODIFIÉE PAR D20, avec sa raison : le niveau n'est plus un champ
    // de la fiche, c'est un fait dérivé de son HISTORIQUE. Ce que la gate
    // garde est intact — « la fiche du wizard avance » — mais elle le lit
    // désormais là où la vérité vit, et vérifie AUSSI que la montée y a
    // laissé son entrée datée.
    expect(niveauCourant(apres.creation)).toBe(ATTEINT)
    expect(apres.creation?.historique?.map((e) => e.niveau)).toEqual(
      niveauxPossibles().filter((n) => n <= ATTEINT),
    )
    expect(apres.creation?.historique?.at(-1)?.le).toBeGreaterThan(0)
    expect(apres.creation?.capNiveaux?.[String(ATTEINT)]).toBe(capacite.id)
    expect(apres.creation?.extras?.p).toBe((avant.creation?.extras?.p ?? 0) + POINTS)

    // Une seule écriture, jamais deux : ni add, ni put, ni second update.
    expect(update).toHaveBeenCalledTimes(1)
    expect(add).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('jumelle : les autres fiches du magasin ne bougent pas', async () => {
    const id = await remplirLeMagasin()
    const voisines = (await db.personnages.toArray()).filter((p) => p.id !== id)
    const capacite = capaciteLibre()

    afficherFiche(id)
    fireEvent.click(await screen.findByRole('button', { name: MONTER }))
    fireEvent.click(
      choisissables(carteDeGain(`+${POINTS} point de caractéristique`)).find((el) =>
        (el.textContent ?? '').startsWith('Puissance'),
      )!,
    )
    const carteCapacite = carteDeGain(CARTE_CAPACITE)
    fireEvent.click(
      within(carteCapacite)
        .getAllByRole('button')
        .find(
          (el) =>
            el.hasAttribute('aria-expanded') && (el.textContent ?? '').includes(capacite.voieNom),
        )!,
    )
    fireEvent.click(
      choisissables(carteCapacite).find((el) => (el.textContent ?? '').startsWith(capacite.nom))!,
    )
    fireEvent.click(screen.getByRole('button', { name: CONFIRMER }))

    await waitFor(async () => {
      expect((await db.personnages.get(id))!.niveau).toBe(ATTEINT)
    })
    for (const voisine of voisines) {
      expect(await db.personnages.get(voisine.id as number), voisine.nomPerso).toEqual(voisine)
    }
  })
})

describe('D17 ⑤ jumelle — Annuler n’écrit rien', () => {
  it('ouvrir la montée puis annuler laisse l’enregistrement intact, à l’octet près', async () => {
    const id = await remplirLeMagasin()
    const avant = (await db.personnages.get(id)) as Personnage
    const capacite = capaciteLibre()

    const update = vi.spyOn(db.personnages, 'update')

    afficherFiche(id)
    fireEvent.click(await screen.findByRole('button', { name: MONTER }))
    // Des choix sont bel et bien posés : ce sont EUX qui doivent disparaître.
    fireEvent.click(
      choisissables(carteDeGain(`+${POINTS} point de caractéristique`)).find((el) =>
        (el.textContent ?? '').startsWith('Puissance'),
      )!,
    )
    const carteCapacite = carteDeGain(CARTE_CAPACITE)
    fireEvent.click(
      within(carteCapacite)
        .getAllByRole('button')
        .find(
          (el) =>
            el.hasAttribute('aria-expanded') && (el.textContent ?? '').includes(capacite.voieNom),
        )!,
    )
    fireEvent.click(
      choisissables(carteCapacite).find((el) => (el.textContent ?? '').startsWith(capacite.nom))!,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    // On revient à la fiche, et le magasin n'a pas bougé.
    expect(await screen.findByRole('button', { name: MONTER })).toBeTruthy()
    expect(update).not.toHaveBeenCalled()
    expect(await db.personnages.get(id)).toEqual(avant)
  })
})
