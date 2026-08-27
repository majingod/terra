/**
 * D20-bis (t017, Q23 A, Fred 2026-08-26) — la création se fait au niveau 1, et
 * le wizard 12+ ne demande plus de niveau.
 *
 * Retour terrain du 22 août : l'étape « Ton niveau » arrivait avant que le
 * joueur ait compris ce qu'on lui demandait. Elle disparaît du wizard 12+ ;
 * tout personnage naît niveau 1 et monte depuis SA FICHE, un niveau à la fois
 * (D17 + garde d'intention Q4).
 *
 * ⚠️ GATE QUI ROUGIT SUR `origin/main`, PAR ASSERTION — jamais par un import
 * cassé, qui ne prouverait rien. Sur main : B-G1 « expected [ … 'niveau' … ]
 * not to contain 'niveau' », B-G2 le parcours bute sur l'étape restée là,
 * B-G4 « expected true to be false » (le fichier y est encore).
 *
 * ⚠️ Le flux ≤11 n'est PAS touché : chez eux le niveau se DÉCLARE, il n'y a
 * pas de montées — leur étape reste, et B-G3 la garde.
 *
 * D5 : aucun chiffre de niveau n'est écrit ici. Le niveau de départ, les
 * emplacements et la classe témoin viennent tous du corpus.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { classesAvecBranches } from '../../rules/branches'
import { getRules } from '../../rules/load'
import { niveauMin } from '../../rules/niveau'
import { classeSquelette, racesPourFaction } from '../../rules/stats'
import Creer from '../../pages/Creer'
import { ETAPES_ENFANT } from '../enfant'
import { ETAPES } from '../validation'

const CLASSE = classesAvecBranches()[0].classe_id
const FACTION =
  classeSquelette(CLASSE)!.faction === 'toute'
    ? getRules().factions.liste[0].id
    : classeSquelette(CLASSE)!.faction
const DEPART = niveauMin()
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

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

describe('D20-bis · B-G1 — « Ton niveau » a quitté le wizard 12+', () => {
  it('`ETAPES` ne porte plus d’étape `niveau`, et le camp mène droit à la classe', () => {
    const ids: readonly string[] = ETAPES.map((etape) => etape.id)
    expect(ids, 'l’étape « Ton niveau » est encore dans le wizard 12+').not.toContain('niveau')
    expect(ids.indexOf('classe'), 'le fil ne s’est pas refermé derrière l’étape retirée').toBe(
      ids.indexOf('camp') + 1,
    )
  })
})

describe('D20-bis · B-G2 — le parcours 12+ ne demande jamais de niveau', () => {
  it('du camp à la classe sans étape de niveau, et le stepper n’en nomme aucune', async () => {
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

    // ⭐ Le geste suivant est la CLASSE : rien ne s'intercale. L'attente porte
    // sur les DEUX titres possibles, pour que l'échec soit une assertion nommée
    // (« le wizard 12+ demande encore un niveau ») et jamais un délai qui expire.
    const titre = await screen.findByRole('heading', {
      name: /^(Choisis ta classe|Ton niveau)$/,
    })
    expect(titre.textContent, 'le wizard 12+ demande encore un niveau').toBe('Choisis ta classe')

    // …et le niveau n'est écrit nulle part dans le brouillon : ni saisi, ni visé.
    const brouillon = await waitFor(async () => {
      const lu = await db.brouillons.get(1)
      expect(lu, 'aucun brouillon persisté').toBeTruthy()
      return lu!
    })
    const fiche = (brouillon.donnees.fiche ?? {}) as Record<string, unknown>
    expect(fiche.niveau, 'le niveau ne doit plus être saisi').toBeUndefined()
    expect(fiche.cible, 'le wizard ne pose plus de cible : le train ne part plus d’ici').toBe(
      undefined,
    )
  })

  it('la fiche qui en sort naît au niveau de départ, avec UNE entrée d’historique', async () => {
    afficheCreer()
    await screen.findByText('Avant de commencer')
    choisir(new RegExp(getRules().age_et_gates.seuil.joueur_regulier))
    continuer()

    // La fiche complète se sème au brouillon (le harnais de d20 ①) — mais SANS
    // cible : c'est exactement le brouillon que D20-bis produit désormais.
    const { ficheComplete } = await import('./aide-fiche-complete')
    const base = ficheComplete(CLASSE, DEPART, capNiveauDeDepart(), 'Bob') as Record<
      string,
      unknown
    >
    delete base.niveau
    delete base.historique
    delete base.cible
    await db.brouillons.put({
      id: 1,
      etape: ETAPES.length,
      donnees: { fiche: base } as never,
      updatedAt: Date.now(),
    })
    cleanup()
    afficheCreer()

    fireEvent.click(await screen.findByRole('button', { name: 'Créer la fiche' }))
    await screen.findByRole('heading', { name: 'Fiche créée' })
    // ⛔ Aucun train : sans cible, il n'y a plus rien à traverser.
    expect(screen.queryByRole('heading', { name: /^Monter au niveau/ })).toBeNull()

    const personnage = await waitFor(async () => {
      const toutes = await db.personnages.toArray()
      expect(toutes).toHaveLength(1)
      return toutes[0]
    })
    expect(personnage.niveau, 'tout personnage naît au niveau de départ').toBe(DEPART)
    const creation = (personnage.creation ?? {}) as Record<string, unknown>
    const historique = (creation.historique ?? []) as Array<Record<string, unknown>>
    expect(historique.map((e) => e.niveau), 'une seule entrée : la création').toEqual([DEPART])
  })
})

/** La capacité du seul échelon ouvert à la création. */
function capNiveauDeDepart(): Record<string, string> {
  const voie = classesAvecBranches()[0].branches[0]
  const capacite = voie.capacites.find((c) => c.niveau === DEPART)!
  return { [String(DEPART)]: capacite.id }
}

describe('D20-bis · B-G3 (jumelle) — le flux ≤11 garde son étape de niveau', () => {
  it('`ETAPES_ENFANT` la porte toujours : chez eux le niveau se DÉCLARE', () => {
    const ids: readonly string[] = ETAPES_ENFANT.map((etape) => etape.id)
    expect(ids, 'D20-bis a débordé sur le flux ≤11').toContain('niveau')
  })
})

describe('D20-bis · B-G4 — l’écran de l’étape retirée n’existe plus', () => {
  it('`src/pages/creation/EtapeNiveau.tsx` a disparu (l’enfant, lui, reste)', () => {
    // Assertion, jamais un import : sur `origin/main` le fichier est là, et la
    // gate doit le DIRE plutôt que planter à la collecte.
    expect(
      existsSync(join(RACINE, 'src', 'pages', 'creation', 'EtapeNiveau.tsx')),
      'l’étape « Ton niveau » du wizard 12+ a encore un écran',
    ).toBe(false)
    expect(
      existsSync(join(RACINE, 'src', 'pages', 'creation', 'enfant', 'EtapeNiveauEnfant.tsx')),
      '⛔ l’étape de niveau du flux ≤11 a été emportée avec elle',
    ).toBe(true)
  })
})
