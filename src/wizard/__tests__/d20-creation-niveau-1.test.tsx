/**
 * D20 ⑥① — on ne crée plus au-dessus du niveau 1 d'un trait.
 *
 * Un personnage doit avoir ÉTÉ niveau 1 avant d'être niveau 2. La création se
 * fait au niveau 1 ; le train de montées traverse les échelons un par un.
 * Chaque échelon traversé laisse une entrée d'historique datée — c'est elle
 * qui rend le niveau d'acquisition retrouvable (D19 lot 3 en dépend).
 *
 * ⚠️ MODIFIÉ PAR D20-bis (t017, Q23 A, 2026-08-26) : l'étape « Ton niveau » a
 * quitté le wizard 12+. Le premier test parcourt donc le fil SANS elle ; les
 * deux suivants sèment la cible dans le brouillon et gardent, tels quels, le
 * chemin hérité.
 *
 * D5 : aucun chiffre de niveau n'est écrit ici. La cible, le nombre
 * d'emplacements et le point de caractéristique témoin viennent tous de la
 * table d'évolution.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { getRules } from '../../rules/load'
import { gainsMontee } from '../../rules/montee'
import { niveauMax, niveauMin, niveauxPossibles } from '../../rules/niveau'
import { classeSquelette, racesPourFaction } from '../../rules/stats'
import Creer from '../../pages/Creer'
import { ETAPES } from '../validation'
import { ficheComplete } from './aide-fiche-complete'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const FACTION = classeSquelette(CLASSE)!.faction === 'toute'
  ? getRules().factions.liste[0].id
  : classeSquelette(CLASSE)!.faction
const BAS = niveauMin()
const HAUT = niveauMax()
/** Les échelons que le train traverse APRÈS la création : 2, 3, … */
const MONTEES = niveauxPossibles().filter((n) => n > BAS)

/** Une capacité par échelon 1..niveau, prise dans une voie tournante. */
function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

/**
 * Un brouillon COMPLET au niveau 1, posé sur la dernière étape, avec la cible
 * demandée. Ni `niveau` ni `historique` n'y figurent : le premier n'est plus
 * un champ saisi, le second est ce que la création écrira.
 */
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
        <Route path="/fiche/:id" element={<div>FICHE-TEMOIN</div>} />
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
  expect(bouton.disabled, 'Continuer est éteint').toBe(false)
  fireEvent.click(bouton)
}

/** Répond à TOUT ce que l'écran de montée de l'échelon demande, puis confirme. */
function traverser(niveauAtteint: number) {
  const gains = gainsMontee(niveauAtteint)

  if (gains.caracPoints > 0) {
    const carte = screen.getByRole('heading', {
      name: new RegExp(`^\\+${gains.caracPoints} point`),
    }).parentElement as HTMLElement
    const jeton = within(carte)
      .getAllByRole('button')
      .find((el) => el.hasAttribute('aria-pressed') && !(el as HTMLButtonElement).disabled)
    expect(jeton, 'aucun jeton de caractéristique posable').toBeTruthy()
    fireEvent.click(jeton!)
  }

  if (gains.dons > 0) {
    const carte = screen.getByRole('heading', { name: new RegExp(`^\\+${gains.dons} don`) })
      .parentElement as HTMLElement
    const donLibre = within(carte)
      .getAllByRole('button')
      .find(
        (el) =>
          el.className.includes('carte-choix') && el.getAttribute('aria-disabled') !== 'true',
      )
    expect(donLibre, `aucun don prenable au niveau ${niveauAtteint}`).toBeTruthy()
    fireEvent.click(donLibre!)
  }

  // La capacité de l'échelon : ouvrir les voies, prendre la première libre.
  const carteCap = screen.getByRole('heading', {
    name: `Capacité du niveau ${niveauAtteint}`,
  }).parentElement as HTMLElement
  for (const voie of VOIES) {
    const entete = within(carteCap)
      .getAllByRole('button')
      .find((el) => el.hasAttribute('aria-expanded') && (el.textContent ?? '').includes(voie.nom))
    if (entete) fireEvent.click(entete)
  }
  const capacite = within(carteCap)
    .getAllByRole('button')
    .find(
      (el) =>
        el.hasAttribute('aria-pressed') &&
        el.getAttribute('aria-disabled') !== 'true' &&
        (el.textContent ?? '').includes('niv '),
    )
  expect(capacite, `aucune capacité libre au niveau ${niveauAtteint}`).toBeTruthy()
  fireEvent.click(capacite!)

  const confirmer = screen.getByRole('button', {
    name: `Confirmer le niveau ${niveauAtteint}`,
  }) as HTMLButtonElement
  expect(confirmer.disabled, `Confirmer éteint au niveau ${niveauAtteint}`).toBe(false)
  fireEvent.click(confirmer)
}

/** La fiche enregistrée (une seule dans le magasin). */
async function ficheEnregistree() {
  const toutes = await db.personnages.toArray()
  expect(toutes).toHaveLength(1)
  return toutes[0]
}

/** L'historique daté de la fiche enregistrée, quoi qu'il porte. */
function historiqueDe(personnage: { creation?: unknown }): Array<Record<string, unknown>> {
  const creation = (personnage.creation ?? {}) as Record<string, unknown>
  return (creation.historique ?? []) as Array<Record<string, unknown>>
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

// GATE MODIFIÉE PAR D20-bis (t017, Q23 A, 2026-08-26)
// AVANT : « choisir le niveau le plus haut n'ouvre qu'UN emplacement » — le
// parcours passait par l'étape « Ton niveau ». D20-bis la retire du wizard 12+ :
// même parcours, sans l'étape, et l'assertion « un seul emplacement » reste
// entière — c'est elle qui prouve qu'on naît toujours au niveau 1.
describe('D20-bis — le wizard 12+ va de Camp à Classe sans demander de niveau', () => {
  it('il n’ouvre qu’UN emplacement de capacité : le personnage naît niveau 1', async () => {
    afficheCreer()
    await screen.findByText('Avant de commencer')

    choisir(new RegExp(getRules().age_et_gates.seuil.joueur_regulier))
    continuer()

    // Camp : la faction de la classe témoin, puis une race sans sous-choix.
    const faction = getRules().factions.liste.find((f) => f.id === FACTION)!
    choisir(new RegExp(faction.nom))
    const race = racesPourFaction(FACTION).find(
      (r) => !r.bonus.some((b) => typeof b === 'object' && 'choix' in b),
    )!
    choisir(new RegExp(race.nom))
    continuer()

    // D20-bis : plus d'étape « Ton niveau » — le camp mène droit à la classe.
    await screen.findByRole('heading', { name: 'Choisis ta classe' })
    expect(
      screen.queryByRole('heading', { name: 'Ton niveau' }),
      'le wizard 12+ demande encore un niveau',
    ).toBeNull()

    choisir(new RegExp(classeSquelette(CLASSE)!.nom))
    continuer()

    // La création se fait au niveau 1 : un seul emplacement, celui du niveau 1.
    await screen.findByRole('heading', { name: 'Tes capacités' })
    const emplacements = screen.getAllByRole('heading', { name: /^Capacité du niveau / })
    expect(
      emplacements.map((el) => el.textContent),
      'la création doit ouvrir le seul emplacement du niveau 1',
    ).toEqual([`Capacité du niveau ${BAS}`])

    // …et le niveau n'est plus un champ saisi : rien ne l'écrit.
    const brouillon = await db.brouillons.get(1)
    const fiche = (brouillon?.donnees.fiche ?? {}) as Record<string, unknown>
    expect(fiche.niveau, 'le niveau ne doit plus être saisi').toBeUndefined()
  })
})

// GATE MODIFIÉE PAR D20-bis (t017, Q23 A, 2026-08-26)
// Ces deux tests SÈMENT la cible dans le brouillon (`semerBrouillon`) : depuis
// D20-bis aucune étape ne la pose plus, et ils prouvent donc désormais le
// CHEMIN HÉRITÉ — un brouillon commencé avant ce lot monte encore par le train.
// Leurs assertions, elles, ne changent pas d'un mot.
describe('D20 ① — le train : une fiche du haut de la table porte tout son historique', () => {
  it('la création puis les montées laissent une entrée datée par échelon', async () => {
    await semerBrouillon(HAUT)
    afficheCreer()

    const creer = await screen.findByRole('button', { name: 'Créer la fiche' })
    fireEvent.click(creer)

    for (const niveauAtteint of MONTEES) {
      await screen.findByRole('heading', { name: `Monter au niveau ${niveauAtteint}` })
      traverser(niveauAtteint)
    }
    await screen.findByRole('heading', { name: 'Fiche créée' })

    const personnage = await waitFor(async () => {
      const p = await ficheEnregistree()
      expect(p.niveau).toBe(HAUT)
      return p
    })

    const historique = historiqueDe(personnage)
    expect(
      historique.length,
      `une entrée par échelon traversé (${niveauxPossibles().length} attendues)`,
    ).toBe(niveauxPossibles().length)
    expect(historique.map((e) => e.niveau)).toEqual(niveauxPossibles())
    for (const entree of historique) {
      expect(typeof entree.le, "chaque entrée d'historique est datée").toBe('number')
    }

    // Le point de caractéristique d'un échelon est retrouvable AVEC son niveau.
    for (const niveau of MONTEES) {
      const gains = gainsMontee(niveau)
      const entree = historique.find((e) => e.niveau === niveau)
      expect(entree, `entrée manquante pour le niveau ${niveau}`).toBeTruthy()
      const caracs = (entree!.caracs ?? {}) as Record<string, number>
      const poses = Object.values(caracs).reduce((somme, n) => somme + n, 0)
      expect(
        poses,
        `points de caractéristique du niveau ${niveau} introuvables avec leur niveau`,
      ).toBe(gains.caracPoints)
    }
  })

  it('jumelle : au niveau 1, une seule entrée et aucun point supplémentaire', async () => {
    await semerBrouillon(BAS)
    afficheCreer()

    fireEvent.click(await screen.findByRole('button', { name: 'Créer la fiche' }))
    await screen.findByRole('heading', { name: 'Fiche créée' })
    expect(screen.queryByRole('heading', { name: /^Monter au niveau/ })).toBeNull()

    const personnage = await waitFor(async () => {
      const p = await ficheEnregistree()
      expect(p.niveau).toBe(BAS)
      return p
    })
    const historique = historiqueDe(personnage)
    expect(historique.map((e) => e.niveau)).toEqual([BAS])
    const caracs = (historique[0].caracs ?? {}) as Record<string, number>
    expect(Object.values(caracs).reduce((somme, n) => somme + n, 0)).toBe(0)
  })
})
