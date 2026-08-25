/**
 * D19 ③ GD6 — GATE : le badge « niv N » près des dons acquis.
 *
 * Q12 : A (Fred, 2026-08-24) — le badge vit sur l'écran FICHE, et là
 * seulement. ⛔ La feuille imprimée ne change pas d'un pixel : elle vit dans
 * `src/pages/impression/`, que ce lot n'a pas touché, et la gate le PROUVE
 * sur son rendu (zéro occurrence).
 *
 * La gate éprouve aussi le cas résiduel du lot : une fiche au plafond de la
 * table avec un droit de palier d'Esprit que plus aucune montée ne pourra
 * offrir — l'écran Fiche lui rend une carte de réclamation, hors impression.
 *
 * D5 : ni le seuil d'Esprit ni les échelons ne sont écrits ici.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { capacitesDeClasse } from '../../rules/capacites'
import { db, type Personnage } from '../../db'
import { niveauMax, niveauMin } from '../../rules/niveau'
import { valeurCarac } from '../../rules/stats'
import { droitDons, listeDons } from '../../rules/talents'
import { niveauxDuDon, palierNonConsomme } from '../../wizard/datation'
import { niveauCourant } from '../../wizard/historique'
import { donPrenable, donsDePalierDeLaMontee, manquesDeLaMontee } from '../../wizard/montee'
import { donsDeLaFiche } from '../../wizard/troc'
import { consommationDonsDeLaFiche } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import {
  echelonsAPoint,
  ficheDatee,
  seuilDuPalier,
} from '../../wizard/__tests__/aide-datation'
import { personnageDeLaFiche } from '../montee/__tests__/aide-montee'
import FicheAffichage from '../creation/FicheAffichage'
import FeuilleImpression from '../impression/FeuilleImpression'
import Fiche from '../Fiche'

const SEUIL = seuilDuPalier()
const PLAFOND = niveauMax()
const A_POINT = echelonsAPoint().filter((n) => n > niveauMin())
/** L'échelon où l'Esprit atteint le palier dans les fiches témoins. */
const PALIER_AU = A_POINT[A_POINT.length - 1]

/** Une fiche au plafond dont l'Esprit atteint le palier en cours de route. */
function ficheTemoin(palierNonConsomme = false): FicheCreation {
  return ficheDatee({
    niveau: PLAFOND,
    espritCreation: SEUIL - A_POINT.length,
    surEsprit: A_POINT,
    palierNonConsomme,
  })
}

async function afficherLaFiche(fiche: FicheCreation): Promise<number> {
  const id = await db.personnages.add(personnageDeLaFiche(fiche) as Personnage)
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

/** La ligne de « Ce que tu as acquis » qui porte ce nom. */
function ligneAcquise(nom: string): HTMLElement | undefined {
  const section = screen.getByRole('heading', { name: 'Ce que tu as acquis' })
    .parentElement as HTMLElement
  return Array.from(section.children).find(
    (el) => el.querySelector('b')?.textContent === nom,
  ) as HTMLElement | undefined
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(cleanup)

describe('D19 ③ GD6 — l’écran Fiche date chaque don acquis', () => {
  it('témoin : la fiche du test a bien un don gagné AVANT son niveau courant', () => {
    const fiche = ficheTemoin()
    expect(niveauCourant(fiche)).toBe(PLAFOND)
    expect(PALIER_AU).toBeLessThan(PLAFOND)
    const dates = donsDeLaFiche(fiche).flatMap(({ don }) => niveauxDuDon(fiche, don.id))
    expect(dates).toContain(PALIER_AU)
    expect(new Set(dates).size).toBeGreaterThan(1)
  })

  it('chaque don porte son « niv N », celui de la dérivation', async () => {
    const fiche = ficheTemoin()
    await afficherLaFiche(fiche)
    for (const { don, n } of donsDeLaFiche(fiche)) {
      const nom = `${don.nom}${n > 1 ? ` ×${n}` : ''}`
      const ligne = ligneAcquise(nom)
      expect(ligne, `don absent de la fiche : ${nom}`).toBeTruthy()
      const attendu = `niv ${niveauxDuDon(fiche, don.id).join(' · ')}`
      expect(
        ligne!.textContent,
        `« ${nom} » ne porte pas son badge de datation`,
      ).toContain(attendu)
    }
  })

  it('le don du palier porte le niveau de l’ATTEINTE, pas celui du jour', async () => {
    const fiche = ficheTemoin()
    const duPalier = donsDeLaFiche(fiche).find(
      ({ don }) => niveauxDuDon(fiche, don.id).join() === String(PALIER_AU),
    )
    expect(duPalier, 'la fiche témoin ne porte aucun don daté du palier').toBeTruthy()
    await afficherLaFiche(fiche)
    const ligne = ligneAcquise(duPalier!.don.nom)!
    expect(ligne.textContent).toContain(`niv ${PALIER_AU}`)
    expect(ligne.textContent).not.toContain(`niv ${PLAFOND}`)
  })
})

describe('D19 ③ GD6 — le badge ne déborde pas de l’écran Fiche', () => {
  it('le wizard (étape Fiche) n’affiche aucun badge de datation sur les dons', () => {
    const fiche = ficheTemoin()
    render(<FicheAffichage fiche={fiche} />)
    for (const { don, n } of donsDeLaFiche(fiche)) {
      const ligne = ligneAcquise(`${don.nom}${n > 1 ? ` ×${n}` : ''}`)!
      expect(
        /niv \d/.test(ligne.textContent ?? ''),
        `« ${don.nom} » porte un badge de datation hors de l'écran Fiche`,
      ).toBe(false)
    }
  })

  it('la feuille IMPRIMÉE n’en porte aucune occurrence', () => {
    const html = renderToStaticMarkup(<FeuilleImpression fiche={ficheTemoin()} />)
    const texte = html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'")
    const trouvees = texte.match(/niv \d/g) ?? []
    expect(
      trouvees,
      `la feuille imprimée porte ${trouvees.length} badge(s) de datation`,
    ).toEqual([])
  })
})

describe('D19 ③ — le cas résiduel : réclamer au plafond de la table', () => {
  /** Le libellé arbitré de l'emplacement du palier (brief D19 ③). */
  const TITRE = `Don d'Esprit ${SEUIL}`

  it('une fiche au plafond avec un droit en souffrance offre la carte', async () => {
    const fiche = ficheTemoin(true)
    expect(palierNonConsomme(fiche)).toBeGreaterThan(0)
    await afficherLaFiche(fiche)
    expect(screen.queryByRole('heading', { name: TITRE })).not.toBeNull()
  })

  it('la carte vit HORS de la zone d’impression', async () => {
    await afficherLaFiche(ficheTemoin(true))
    const carte = screen.getByRole('heading', { name: TITRE }).parentElement as HTMLElement
    expect(carte.className).toContain('pas-a-imprimer')
  })

  it('une fiche sans droit en souffrance n’offre rien', async () => {
    await afficherLaFiche(ficheTemoin())
    expect(screen.queryByRole('heading', { name: TITRE })).toBeNull()
  })

  it('réclamer écrit le don, et la fiche a consommé exactement ses droits', async () => {
    const fiche = ficheTemoin(true)
    const id = await afficherLaFiche(fiche)
    const carte = screen.getByRole('heading', { name: TITRE }).parentElement as HTMLElement
    fireEvent.click(within(carte).getByRole('button', { name: 'Choisir ce don' }))
    // Un don que la fiche ne porte PAS encore : la réclamation doit le faire
    // entrer, daté du palier — pas grossir un cumulable déjà pris ailleurs.
    const neufAttendu = listeDons().find((don) => !(fiche.dons ?? {})[don.id])!
    const cible = within(carte)
      .getAllByRole('button')
      .find((el) => (el.textContent ?? '').startsWith(neufAttendu.nom))!
    expect(cible.getAttribute('aria-disabled')).not.toBe('true')
    fireEvent.click(cible)
    fireEvent.click(within(carte).getByRole('button', { name: 'Réclamer ce don' }))

    await waitFor(async () => {
      const apres = (await db.personnages.get(id))!.creation as FicheCreation
      expect(consommationDonsDeLaFiche(apres)).toBe(
        droitDons(valeurCarac(apres, 'e'), apres.achats, niveauCourant(apres)),
      )
      expect(palierNonConsomme(apres)).toBe(0)
    })
    // Et le don réclamé date du niveau où l'Esprit a atteint le palier.
    const apres = (await db.personnages.get(id))!.creation as FicheCreation
    expect(niveauxDuDon(apres, neufAttendu.id)).toEqual([PALIER_AU])
  })
})

describe('D19 ③ — GN4 : Q2 (t016, Fred 2026-08-25) — la carte à N’IMPORTE QUEL niveau', () => {
  /** Le libellé arbitré de l'emplacement du palier (brief D19 ③). */
  const TITRE = `Don d'Esprit ${SEUIL}`

  /** Une fiche EN COURS DE ROUTE (pas au plafond) avec un droit en souffrance. */
  function ficheEnCoursDeRoute(): FicheCreation {
    return ficheDatee({
      niveau: PALIER_AU,
      espritCreation: SEUIL - A_POINT.length,
      surEsprit: A_POINT,
      palierNonConsomme: true,
    })
  }

  it('témoin : cette fiche n’est PAS au plafond de la table', () => {
    expect(PALIER_AU).toBeLessThan(PLAFOND)
  })

  it('une fiche en souffrance sous le plafond offre déjà la carte', async () => {
    const fiche = ficheEnCoursDeRoute()
    expect(palierNonConsomme(fiche)).toBeGreaterThan(0)
    await afficherLaFiche(fiche)
    expect(screen.queryByRole('heading', { name: TITRE })).not.toBeNull()
  })

  it('réclamer depuis cette carte, sous le plafond, écrit le don et referme le droit', async () => {
    const fiche = ficheEnCoursDeRoute()
    const id = await afficherLaFiche(fiche)
    const carte = screen.getByRole('heading', { name: TITRE }).parentElement as HTMLElement
    fireEvent.click(within(carte).getByRole('button', { name: 'Choisir ce don' }))
    // Un don NON cumulable : l'anti-doublon de la montée suivante s'éprouve dessus.
    const neufAttendu = listeDons().find(
      (don) => !don.cumulable && !(fiche.dons ?? {})[don.id],
    )!
    const cible = within(carte)
      .getAllByRole('button')
      .find((el) => (el.textContent ?? '').startsWith(neufAttendu.nom))!
    expect(cible.getAttribute('aria-disabled')).not.toBe('true')
    fireEvent.click(cible)
    fireEvent.click(within(carte).getByRole('button', { name: 'Réclamer ce don' }))

    await waitFor(async () => {
      const apres = (await db.personnages.get(id))!.creation as FicheCreation
      expect(palierNonConsomme(apres)).toBe(0)
    })
    const perso = (await db.personnages.get(id))! as Personnage
    const apres = perso.creation as FicheCreation
    expect(consommationDonsDeLaFiche(apres)).toBe(
      droitDons(valeurCarac(apres, 'e'), apres.achats, niveauCourant(apres)),
    )
    // Le don réclamé date du niveau où l'Esprit a atteint le palier, pas du jour.
    expect(niveauxDuDon(apres, neufAttendu.id)).toEqual([PALIER_AU])

    // GN5 — pas de double porte : la montée suivante ne redemande rien, et
    // passe sans `donPalier`.
    expect(donsDePalierDeLaMontee(perso, PLAFOND, {})).toBe(0)
    const capacite = capacitesDeClasse(apres.classe).find(
      (c) => c.niveau <= PLAFOND && !Object.values(apres.capNiveaux ?? {}).includes(c.id),
    )!.id
    const donDeLEchelon = listeDons().find(
      (d) => d.id !== neufAttendu.id && !(apres.dons ?? {})[d.id],
    )!.id
    const manques = manquesDeLaMontee(perso, PLAFOND, { capacite, don: donDeLEchelon })
    expect(manques, `manques restants : ${manques.join(', ')}`).toEqual([])

    // Et l'anti-doublon : le don réclamé n'est plus prenable à la montée
    // suivante (il n'est pas cumulable — on l'a choisi ainsi ci-dessus).
    expect(donPrenable(perso, neufAttendu)).toBe(false)
  })
})
