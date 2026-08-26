/**
 * D19 ④ — GATE : la carte de RÉCLAMATION de la langue du palier d'Esprit,
 * sur l'écran Fiche (t016 v2 — Q5 = A, sœur de la carte de don de #37).
 *
 * Le trou mesuré sur `main` : la table accorde « +1 don, +1 langue » à
 * Esprit 3 (D19 ③) ; le don a sa porte depuis #37, la langue n'en a aucune —
 * une fiche dont l'Esprit dépasse son droit de création (montée, correction
 * #38) reste avec `langChoix` en souffrance, sans aucun moyen de le combler.
 *
 * D5 : ni le seuil d'Esprit ni les classes ne sont écrits en dur ici — ils
 * se lisent du corpus et de `src/rules/langues.ts`.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db, type Personnage } from '../../db'
import { languesProposables, droitLangues } from '../../rules/langues'
import { niveauMin } from '../../rules/niveau'
import { valeurCarac } from '../../rules/stats'
import { droitDons } from '../../rules/talents'
import { palierNonConsomme } from '../../wizard/datation'
import { niveauCourant } from '../../wizard/historique'
import { miseAJourCorrection } from '../../wizard/montee'
import { consommationDonsDeLaFiche, problemesLangues, trancheEnfant } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import {
  echelonsAPoint,
  ficheDatee,
  seuilDuPalier,
} from '../../wizard/__tests__/aide-datation'
import { classesEnfant, factionsEnfant } from '../../rules/kids'
import { personnageDeLaFiche, personnageEnfant } from '../montee/__tests__/aide-montee'
import Fiche from '../Fiche'

const SEUIL = seuilDuPalier()
/** Le libellé arbitré de la carte de langue (brief D19 ④). */
const TITRE = `Langue d'Esprit ${SEUIL}`
const TITRE_DON = `Don d'Esprit ${SEUIL}`
const A_POINT = echelonsAPoint().filter((n) => n > niveauMin())

/** Une fiche dont le droit de langue dépasse `langChoix` — le trou du lot. */
function ficheEnSouffrance(): FicheCreation {
  const fiche = ficheDatee({
    niveau: A_POINT[A_POINT.length - 1],
    espritCreation: SEUIL - A_POINT.length,
    surEsprit: A_POINT,
  })
  // ⚠️ `ficheDatee` construit toujours `langChoix` à hauteur du droit FINAL —
  // on retire la dernière langue choisie pour obtenir le trou que ce lot
  // vient boucher (une vieille fiche, ou un droit ouvert après coup).
  return { ...fiche, langChoix: (fiche.langChoix ?? []).slice(0, -1) }
}

async function afficherLaFiche(fiche: FicheCreation, enfant = false): Promise<number> {
  const perso = enfant ? personnageEnfant(fiche) : personnageDeLaFiche(fiche)
  const id = await db.personnages.add(perso as Personnage)
  render(
    <MemoryRouter initialEntries={[`/fiche/${id}`]}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Chargement…')).toBeNull())
  return id as number
}

function carte(titre: string): HTMLElement {
  return screen.getByRole('heading', { name: titre }).parentElement as HTMLElement
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(cleanup)

describe('D19 ④ GD témoin — la fiche fabriquée porte bien le trou du lot', () => {
  it('un droit de langue dort : langChoix a une place de moins que son droit', () => {
    const fiche = ficheEnSouffrance()
    const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])
    expect((fiche.langChoix ?? []).length).toBe(droit - 1)
  })
})

describe('D19 ④ CL2 — la carte s’offre quand un droit de langue dort', () => {
  it('une fiche en souffrance offre la carte « Langue d’Esprit N »', async () => {
    const fiche = ficheEnSouffrance()
    await afficherLaFiche(fiche)
    expect(
      screen.queryByRole('heading', { name: TITRE }),
      `« ${TITRE} » ne s'offre pas. Titres vus : ${screen
        .getAllByRole('heading')
        .map((h) => h.textContent)
        .join(' | ')}`,
    ).not.toBeNull()
  })

  it('une fiche sans droit en souffrance n’offre rien', async () => {
    await afficherLaFiche(ficheDatee({ niveau: 1, espritCreation: SEUIL - 1 }))
    expect(screen.queryByRole('heading', { name: TITRE })).toBeNull()
  })

  it('la carte vit HORS de la zone d’impression', async () => {
    await afficherLaFiche(ficheEnSouffrance())
    expect(carte(TITRE).className).toContain('pas-a-imprimer')
  })
})

describe('D19 ④ CL4 — réclamer écrit la langue, à la fin, et referme le droit', () => {
  it('réclamer écrit la langue et le déficit tombe à 0', async () => {
    const fiche = ficheEnSouffrance()
    const id = await afficherLaFiche(fiche)
    const avantHistorique = JSON.stringify(
      (await db.personnages.get(id))!.creation!.historique,
    )
    const c = carte(TITRE)
    const attendue = languesProposables(fiche.race, fiche.classe).find(
      (l) => !(fiche.langChoix ?? []).includes(l.id),
    )!
    fireEvent.click(within(c).getByRole('button', { name: attendue.nom }))
    fireEvent.click(within(c).getByRole('button', { name: 'Apprendre cette langue' }))

    await waitFor(async () => {
      const apres = (await db.personnages.get(id))!.creation as FicheCreation
      expect(problemesLangues(apres)).toEqual([])
    })
    const apres = (await db.personnages.get(id))!.creation as FicheCreation
    // Ajoutée à la FIN de langChoix.
    expect(apres.langChoix).toEqual([...(fiche.langChoix ?? []), attendue.id])
    // ⛔ L'historique reste octet-identique : les langues ne se datent pas.
    expect(JSON.stringify(apres.historique)).toBe(avantHistorique)
    // La carte disparaît.
    await waitFor(() => expect(screen.queryByRole('heading', { name: TITRE })).toBeNull())
  })
})

describe('D19 ④ CL5 — les jumelles du bassin, à la carte', () => {
  it('la Langue des morts n’apparaît QUE pour sorcier et chevalier de la mort', () => {
    for (const classeId of ['sorcier', 'chevalier_de_la_mort']) {
      const fiche = ficheEnSouffrance()
      const dansLeBassin = languesProposables(fiche.race, classeId).some(
        (l) => l.id === 'des_morts',
      )
      expect(dansLeBassin, classeId).toBe(true)
    }
  })

  it('jamais le Druidique hors druide, ni une langue déjà connue, dans le bassin de la carte', async () => {
    const fiche = ficheEnSouffrance()
    await afficherLaFiche(fiche)
    const c = carte(TITRE)
    const noms = within(c)
      .getAllByRole('button')
      .map((el) => el.textContent)
      .filter((t): t is string => t !== null && t !== 'Apprendre cette langue')
    expect(noms).not.toContain('Druidique')
    for (const id of fiche.langChoix ?? []) {
      const nom = languesProposables(fiche.race, fiche.classe).find((l) => l.id === id)?.nom
      if (nom) expect(noms).not.toContain(nom)
    }
  })

  it('un refus (doublon) bloque l’écriture de la carte', async () => {
    // Le trou est en souffrance ET la langue visée est déjà dans langChoix :
    // `miseAJourReclamationLangue` doit refuser plutôt qu'accepter un doublon.
    const base = ficheEnSouffrance()
    const dejaPrise = base.langChoix![0]
    const fiche: FicheCreation = { ...base }
    const { miseAJourReclamationLangue } = await import('../../wizard/montee')
    const perso = { ...personnageDeLaFiche(fiche), id: 1 } as Personnage
    expect(() => miseAJourReclamationLangue(perso, dejaPrise, 1)).toThrow()
  })
})

describe('D19 ④ CL6 — le pont avec #38 : la correction ouvre don ET langue ensemble', () => {
  const N = A_POINT[0]

  /** Une fiche traversant N+1, dont le point du niveau N est encore ailleurs. */
  function ficheAvantCorrection(): FicheCreation {
    return ficheDatee({ niveau: N + 1, espritCreation: SEUIL - 1, nom: 'Pont' })
  }

  it('la correction pousse l’Esprit au palier sans consommer ses deux droits', () => {
    const fiche = ficheAvantCorrection()
    const perso = { ...personnageDeLaFiche(fiche), id: 1 } as Personnage
    const maj = miseAJourCorrection(perso, N, { carac: 'e' }, 1)
    const apres = maj.creation as FicheCreation
    expect(valeurCarac(apres, 'e')).toBe(SEUIL)
    expect(palierNonConsomme(apres)).toBeGreaterThan(0)
    const droit = droitLangues(valeurCarac(apres, 'e'), apres.comps ?? [])
    expect((apres.langChoix ?? []).length).toBeLessThan(droit)
  })

  it('la fiche corrigée offre les DEUX cartes, réclamer les deux ne laisse aucun problème', async () => {
    const fiche = ficheAvantCorrection()
    const perso = { ...personnageDeLaFiche(fiche), id: undefined } as Personnage
    const id = (await db.personnages.add(perso)) as number
    const enBase = { ...(await db.personnages.get(id))!, id } as Personnage
    const maj = miseAJourCorrection(enBase, N, { carac: 'e' }, 1)
    await db.personnages.update(id, maj)

    render(
      <MemoryRouter initialEntries={[`/fiche/${id}`]}>
        <Routes>
          <Route path="/fiche/:id" element={<Fiche />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Chargement…')).toBeNull())

    expect(screen.queryByRole('heading', { name: TITRE_DON })).not.toBeNull()
    expect(screen.queryByRole('heading', { name: TITRE })).not.toBeNull()

    // Réclamer le don.
    const carteDon = carte(TITRE_DON)
    fireEvent.click(within(carteDon).getByRole('button', { name: 'Choisir ce don' }))
    const donsOptions = within(carteDon)
      .getAllByRole('button')
      .filter((el) => el.hasAttribute('aria-disabled') && el.getAttribute('aria-disabled') !== 'true')
    fireEvent.click(donsOptions[0])
    fireEvent.click(within(carteDon).getByRole('button', { name: 'Réclamer ce don' }))
    await waitFor(async () => {
      const apres = (await db.personnages.get(id))!.creation as FicheCreation
      expect(palierNonConsomme(apres)).toBe(0)
    })

    // Réclamer la langue.
    const carteLangue = carte(TITRE)
    const langueDisponible = within(carteLangue)
      .getAllByRole('button')
      .find((el) => el.textContent !== 'Apprendre cette langue')!
    fireEvent.click(langueDisponible)
    fireEvent.click(within(carteLangue).getByRole('button', { name: 'Apprendre cette langue' }))

    await waitFor(async () => {
      const apres = (await db.personnages.get(id))!.creation as FicheCreation
      expect(problemesLangues(apres)).toEqual([])
    })

    const apres = (await db.personnages.get(id))!.creation as FicheCreation
    expect(consommationDonsDeLaFiche(apres)).toBe(
      droitDons(valeurCarac(apres, 'e'), apres.achats, niveauCourant(apres)),
    )

    // Aucune double porte ensuite : ni l'une ni l'autre carte ne reste.
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: TITRE_DON })).toBeNull()
      expect(screen.queryByRole('heading', { name: TITRE })).toBeNull()
    })
  })
})

describe('D19 ④ CL8 — jumelle de périmètre : le flux ≤11 ne voit jamais la carte', () => {
  it('une fiche enfant n’affiche jamais « Langue d’Esprit N »', async () => {
    const ficheEnf: FicheCreation = {
      trancheAge: trancheEnfant(),
      enfant: { faction: factionsEnfant()[0].id, classe: classesEnfant()[0].id, niveau: 1 },
    }
    await afficherLaFiche(ficheEnf, true)
    expect(screen.queryByRole('heading', { name: TITRE })).toBeNull()
  })
})
