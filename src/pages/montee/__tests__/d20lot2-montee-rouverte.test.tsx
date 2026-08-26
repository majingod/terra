/**
 * D20 lot 2 — la MONTÉE ROUVERTE, de bout en bout (maquette v3, écran ①).
 *
 * Le geste entier, tel que le joueur le vit : la fiche est enregistrée, il
 * touche la pastille verte du niveau fautif, l'écran de sa montée se rouvre
 * PRÉ-REMPLI avec les choix d'alors, il change son point — et la fenêtre de
 * répercussions nomme tout ce qui part AVANT que quoi que ce soit s'applique.
 *
 * Ce que cette gate garde, et que rien d'autre ne garde :
 * - les deux moments ne se mélangent JAMAIS (dérivation, puis écriture) ;
 * - « Annuler » ne touche à rien, à l'octet près ;
 * - « Changer quand même » écrit en UNE seule mise à jour ;
 * - un changement sans répercussion s'applique SANS fenêtre ;
 * - ⚠️ chaque ouverture est un écran NEUF (`key`) — la gate ③ de #23 a déjà
 *   attrapé une fuite d'instance React une fois.
 *
 * D5 : ni le seuil d'Esprit ni les échelons ne sont écrits ici.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { capacitesDeClasse } from '../../../rules/capacites'
import { listeDons } from '../../../rules/talents'
import { valeurCarac } from '../../../rules/stats'
import { db, type Personnage } from '../../../db'
import {
  corrigerChoix,
  libelleMonteeRouverte,
  LIBELLE_ANNULER,
  LIBELLE_CHANGER,
} from '../../../wizard/cascade'
import { caracsDuNiveau } from '../../../wizard/historique'
import type { FicheCreation } from '../../../wizard/types'
import {
  echelonsAPoint,
  ficheDatee,
  seuilDuPalier,
} from '../../../wizard/__tests__/aide-datation'
import { personnageDeLaFiche } from './aide-montee'
import Fiche from '../../Fiche'

const SEUIL = seuilDuPalier()
/** L'échelon de montée dont le point pousse l'Esprit au palier. */
const N = echelonsAPoint().filter((niveau) => niveau > 1)[0]
/** Ce qu'une pastille touchable annonce au lecteur d'écran. */
const CORRIGER = `Niveau ${N} — fait · corriger tes choix`

/** La fiche de la maquette : le point du niveau N posé sur l'Esprit. */
function ficheTemoin(): FicheCreation {
  return ficheDatee({ niveau: N + 1, espritCreation: SEUIL - 1, surEsprit: [N], nom: 'Maël' })
}

async function poserEtAfficher(fiche: FicheCreation): Promise<number> {
  const id = (await db.personnages.add(personnageDeLaFiche(fiche) as Personnage)) as number
  render(
    <MemoryRouter initialEntries={[`/fiche/${id}`]}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Chargement…')).toBeNull())
  return id
}

/** Le geste : toucher la pastille verte du niveau fautif. */
async function rouvrirLaMontee(libelle = CORRIGER) {
  fireEvent.click(await screen.findByLabelText(libelle))
}

/** La carte d'un étage de l'écran rouvert. */
function carte(titre: string): HTMLElement {
  return screen.getByRole('heading', { name: titre }).parentElement as HTMLElement
}

/** Le jeton d'une caractéristique, dans la carte du point. */
function jeton(nom: string): HTMLElement {
  return within(carte('Le point de caractéristique'))
    .getAllByRole('button')
    .find((el) => (el.textContent ?? '').startsWith(nom))!
}

/** La fenêtre de répercussions — `null` tant qu'elle ne s'est pas ouverte. */
function fenetre(): HTMLElement | null {
  return screen.queryByRole('dialog', { name: 'Si tu changes ce choix' })
}

/** Une capacité de l'arbre, de niveau ≤ N, que la fiche ne porte pas encore. */
function capaciteLibre(fiche: FicheCreation) {
  const prises = new Set(Object.values(fiche.capNiveaux ?? {}))
  return capacitesDeClasse(fiche.classe).find(
    (capacite) => capacite.niveau <= N && !prises.has(capacite.id),
  )!
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(async () => {
  vi.restoreAllMocks()
  cleanup()
  await db.personnages.clear()
})

describe('D20 lot 2 — toucher la pastille rouvre la montée, PRÉ-REMPLIE', () => {
  it('⭐ le titre dit quelle montée se rouvre, et d’où viennent les choix', async () => {
    await poserEtAfficher(ficheTemoin())
    await rouvrirLaMontee()
    const titre = screen.getByRole('heading', { level: 2 })
    expect(titre.textContent).toContain(libelleMonteeRouverte(N))
    expect(titre.textContent).toContain('tes choix d’alors')
  })

  it('⭐ les choix d’ALORS y sont déjà posés — le point ET la capacité', async () => {
    const fiche = ficheTemoin()
    await poserEtAfficher(fiche)
    await rouvrirLaMontee()

    // Le point du niveau N était sur l'Esprit : son jeton est enfoncé.
    expect(caracsDuNiveau(fiche, N)).toEqual({ e: 1 })
    expect(jeton('Esprit').getAttribute('aria-pressed')).toBe('true')
    expect(jeton('Puissance').getAttribute('aria-pressed')).toBe('false')

    // La capacité d'alors est celle que la fiche porte à cet échelon.
    const attendue = capacitesDeClasse(fiche.classe).find(
      (capacite) => capacite.id === fiche.capNiveaux?.[String(N)],
    )!
    const carteCapacite = carte(`Capacité du niveau ${N}`)
    const entete = within(carteCapacite)
      .getAllByRole('button')
      .find((el) => (el.textContent ?? '').includes(attendue.voieNom))!
    fireEvent.click(entete)
    const choisie = within(carteCapacite)
      .getAllByRole('button')
      .find((el) => el.getAttribute('aria-pressed') === 'true')!
    expect(choisie.textContent).toContain(attendue.nom)
  })

  it('⛔ le don du palier ne se rouvre QUE là où la datation le date', async () => {
    await poserEtAfficher(ficheTemoin())
    await rouvrirLaMontee()
    // Ici l'Esprit a atteint son palier À CET échelon : la carte est là.
    expect(screen.getByRole('heading', { name: `Don d'Esprit ${SEUIL}` })).toBeTruthy()
  })
})

describe('D20 lot 2 — la fenêtre s’ouvre AVANT que quoi que ce soit s’applique', () => {
  it('⭐ changer le point ouvre la fenêtre, qui NOMME chaque perte', async () => {
    const fiche = ficheTemoin()
    const id = await poserEtAfficher(fiche)
    const avant = JSON.stringify(await db.personnages.get(id))

    await rouvrirLaMontee()
    expect(fenetre(), 'la fenêtre ne doit pas être là avant le geste').toBeNull()
    fireEvent.click(jeton('Puissance'))

    const ouverte = fenetre()
    expect(ouverte, 'la fenêtre de répercussions ne s’est pas ouverte').not.toBeNull()
    // Chaque perte dérivée y est nommée, à l'identique de la dérivation.
    const attendues = corrigerChoix(
      { ...personnageDeLaFiche(fiche), id } as Personnage,
      N,
      { carac: 'p' },
    )
    expect(attendues.pertes.length).toBeGreaterThan(0)
    for (const perte of attendues.pertes) {
      expect(
        within(ouverte!).getByText(perte.nom),
        `« ${perte.nom} » n’est pas nommée dans la fenêtre`,
      ).toBeTruthy()
    }

    // ⛔ Et RIEN n'a été écrit : la dérivation ne touche pas au magasin.
    expect(JSON.stringify(await db.personnages.get(id))).toBe(avant)
  })

  it('⭐ « Annuler » ne touche à rien, à l’octet près', async () => {
    const id = await poserEtAfficher(ficheTemoin())
    const avant = JSON.stringify(await db.personnages.get(id))

    await rouvrirLaMontee()
    fireEvent.click(jeton('Puissance'))
    fireEvent.click(within(fenetre()!).getByRole('button', { name: LIBELLE_ANNULER }))

    expect(fenetre(), 'la fenêtre est restée ouverte après Annuler').toBeNull()
    expect(JSON.stringify(await db.personnages.get(id))).toBe(avant)
    // …et le jeton est revenu à son choix d'alors : rien n'a bougé.
    expect(jeton('Esprit').getAttribute('aria-pressed')).toBe('true')
  })

  it('⭐ « Changer quand même » écrit — en UNE seule mise à jour', async () => {
    const fiche = ficheTemoin()
    const id = await poserEtAfficher(fiche)
    const update = vi.spyOn(db.personnages, 'update')
    const add = vi.spyOn(db.personnages, 'add')
    const put = vi.spyOn(db.personnages, 'put')

    await rouvrirLaMontee()
    fireEvent.click(jeton('Puissance'))
    fireEvent.click(within(fenetre()!).getByRole('button', { name: LIBELLE_CHANGER }))

    await waitFor(async () => {
      const apres = (await db.personnages.get(id))!
      expect(valeurCarac(apres.creation as FicheCreation, 'e')).toBe(SEUIL - 1)
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(add).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()

    const apres = (await db.personnages.get(id))!
    const attendue = corrigerChoix(
      { ...personnageDeLaFiche(fiche), id } as Personnage,
      N,
      { carac: 'p' },
    ).fiche
    expect(apres.creation).toEqual(attendue)
    // Le niveau du personnage n'a pas bougé d'un cran.
    expect(apres.niveau).toBe(N + 1)
    // …et l'app est revenue sur la fiche.
    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 2, name: /^Montée/ })).toBeNull(),
    )
  })
})

describe('D20 lot 2 — un changement sans répercussion s’applique SANS fenêtre', () => {
  it('⭐ changer la capacité de l’échelon : rien n’en dépend, aucune fenêtre', async () => {
    const fiche = ficheTemoin()
    const id = await poserEtAfficher(fiche)
    const autre = capaciteLibre(fiche)

    await rouvrirLaMontee()
    const carteCapacite = carte(`Capacité du niveau ${N}`)
    const entete = within(carteCapacite)
      .getAllByRole('button')
      .find((el) => (el.textContent ?? '').includes(autre.voieNom))!
    fireEvent.click(entete)
    fireEvent.click(
      within(carteCapacite)
        .getAllByRole('button')
        .find((el) => (el.textContent ?? '').includes(autre.nom))!,
    )

    expect(fenetre(), 'une correction sans perte ne doit ouvrir aucune fenêtre').toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la correction' }))

    await waitFor(async () => {
      const apres = (await db.personnages.get(id))!.creation as FicheCreation
      expect(apres.capNiveaux?.[String(N)]).toBe(autre.id)
    })
    // Le reste de la fiche n'a pas bougé : ni dons, ni langues, ni caracs.
    const apres = (await db.personnages.get(id))!.creation as FicheCreation
    expect(apres.dons).toEqual(personnageDeLaFiche(fiche).creation!.dons)
    expect(apres.langChoix).toEqual(fiche.langChoix)
    expect(valeurCarac(apres, 'e')).toBe(valeurCarac(fiche, 'e'))
  })
})

describe('D20 lot 2 — ⚠️ chaque ouverture est un écran NEUF (gate ③ de #23)', () => {
  it('rouvrir un AUTRE niveau ne garde rien du précédent', async () => {
    // Une fiche assez haute pour porter DEUX montées traversées.
    const fiche = ficheDatee({
      niveau: N + 2,
      espritCreation: SEUIL - 1,
      surEsprit: [N],
      nom: 'Maël',
    })
    await poserEtAfficher(fiche)

    // On rouvre le niveau N, on touche Puissance, puis on renonce.
    await rouvrirLaMontee()
    fireEvent.click(jeton('Puissance'))
    expect(fenetre()).not.toBeNull()
    fireEvent.click(within(fenetre()!).getByRole('button', { name: LIBELLE_ANNULER }))
    fireEvent.click(screen.getByRole('button', { name: LIBELLE_ANNULER }))

    // …puis on rouvre l'échelon SUIVANT : son écran ne sait rien de l'autre.
    const suivant = N + 1
    await rouvrirLaMontee(`Niveau ${suivant} — fait · corriger tes choix`)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(
      libelleMonteeRouverte(suivant),
    )
    // Cet échelon-là donne un don, pas un point : c'est SA carte qu'on voit.
    expect(screen.queryByRole('heading', { name: 'Le point de caractéristique' })).toBeNull()
    expect(screen.getByRole('heading', { name: `Le don du niveau ${suivant}` })).toBeTruthy()
    // Et le don d'alors y est déjà posé.
    const carteDon = carte(`Le don du niveau ${suivant}`)
    const pose = within(carteDon)
      .getAllByRole('button')
      .filter((el) => el.getAttribute('aria-pressed') === 'true')
    expect(pose).toHaveLength(1)
    expect(listeDons().some((don) => (pose[0].textContent ?? '').includes(don.nom))).toBe(true)
  })
})
