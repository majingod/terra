/**
 * D19 ③ GD2 / GD5 — GATE : le chemin de réclamation du don d'Esprit.
 *
 * Le trou mesuré sur `main` : `gainsMontee` ne lit que la ligne de table. Un
 * joueur dont le point d'un échelon pousse son Esprit au palier gagne un don
 * (table cumulative des caractéristiques) et n'a AUCUN emplacement où le
 * mettre — sa fiche reste à « dons : N/N+1 » sans issue.
 *
 * Le lot ajoute cet emplacement à l'écran de montée : il s'offre quand la
 * montée en cours ouvre le palier, ou quand un droit de palier est resté non
 * consommé d'une montée passée, et il se choisit AVANT de confirmer.
 *
 * D5 : ni le seuil d'Esprit, ni les échelons témoins ne sont écrits ici — ils
 * se lisent de rules.json. Le LIBELLÉ « Don d'Esprit N » est, lui, écrit en
 * clair : c'est le libellé arbitré du brief, et c'est ce que la gate éprouve
 * (elle doit pouvoir rougir sur un dépôt où le module qui le porte n'existe
 * pas encore).
 */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { capacitesDeClasse } from '../../../rules/capacites'
import { getRules } from '../../../rules/load'
import { gainsMontee } from '../../../rules/montee'
import { niveauMax, niveauMin } from '../../../rules/niveau'
import { valeurCarac } from '../../../rules/stats'
import { droitDons, listeDons } from '../../../rules/talents'
import { miseAJourMontee } from '../../../wizard/montee'
import { consommationDonsDeLaFiche } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import {
  donsDuPalier,
  echelonsAPoint,
  ficheDatee,
  seuilDuPalier,
} from '../../../wizard/__tests__/aide-datation'
import EcranMontee from '../EcranMontee'
import { personnageDeLaFiche } from './aide-montee'

const SEUIL = seuilDuPalier()
/** Le libellé arbitré de l'emplacement supplémentaire (brief D19 ③). */
const TITRE_PALIER = `Don d'Esprit ${SEUIL}`
/** Une classe sans troc : l'écran ne montre alors que ses emplacements propres. */
const CLASSE = getRules().classes_squelette.liste.find(
  (c) => (c as { troc?: string }).troc === undefined,
)!.id
/** Le premier échelon de montée dont le point peut pousser l'Esprit au palier. */
const VERS_PALIER = echelonsAPoint().filter((n) => n > niveauMin())[0]
const PLAFOND = niveauMax()

function personnage(fiche: FicheCreation) {
  return { ...personnageDeLaFiche(fiche), id: 1 }
}

function afficher(fiche: FicheCreation, niveauAtteint: number) {
  render(
    <EcranMontee
      personnage={personnage(fiche)}
      niveauAtteint={niveauAtteint}
      onConfirmer={() => {}}
      onAnnuler={() => {}}
    />,
  )
}

/** La carte de gain qui porte ce titre, ou `null` si elle ne s'offre pas. */
function carteDeGain(titre: string): HTMLElement | null {
  const titres = screen.queryAllByRole('heading', { name: titre })
  return titres.length > 0 ? (titres[0].parentElement as HTMLElement) : null
}

/** Les cartes choisissables d'une carte de gain. */
function choisissables(carte: HTMLElement): HTMLElement[] {
  return within(carte)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-pressed'))
}

/** Pose le jeton de caractéristique nommé (« Esprit », « Puissance »). */
function poserJeton(nom: string) {
  const bouton = screen
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-pressed'))
    .find((el) => (el.textContent ?? '').startsWith(nom))
  expect(bouton, `jeton absent de l'écran : ${nom}`).toBeTruthy()
  fireEvent.click(bouton!)
}

/** Une capacité de l'arbre, de niveau ≤ N, pas encore prise par la fiche. */
function capaciteLibre(fiche: FicheCreation, niveau: number): string {
  const prises = new Set(Object.values(fiche.capNiveaux ?? {}))
  return capacitesDeClasse(fiche.classe).find(
    (c) => c.niveau <= niveau && !prises.has(c.id),
  )!.id
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('D19 ③ — témoins : le scénario de la gate existe dans le corpus', () => {
  it('un échelon de montée donne un point, et le palier d’Esprit donne un don', () => {
    expect(VERS_PALIER).toBeGreaterThan(niveauMin())
    expect(gainsMontee(VERS_PALIER).caracPoints).toBeGreaterThan(0)
    expect(donsDuPalier(SEUIL)).toBeGreaterThan(0)
    expect(donsDuPalier(SEUIL - 1)).toBe(0)
  })
})

describe('D19 ③ GD2 — la montée qui ouvre le palier offre l’emplacement', () => {
  /** Une fiche à un point du palier : le prochain point d'Esprit l'ouvre. */
  function auBordDuPalier() {
    return ficheDatee({ classe: CLASSE, niveau: VERS_PALIER - 1, espritCreation: SEUIL - 1 })
  }

  it('poser le point sur l’Esprit ouvre « Don d’Esprit N »', () => {
    const fiche = auBordDuPalier()
    expect(valeurCarac(fiche, 'e')).toBe(SEUIL - 1)
    afficher(fiche, VERS_PALIER)
    // Avant le geste, rien : l'emplacement n'est pas dû.
    expect(carteDeGain(TITRE_PALIER)).toBeNull()
    poserJeton('Esprit')
    const carte = carteDeGain(TITRE_PALIER)
    expect(
      carte,
      `« ${TITRE_PALIER} » ne s'offre pas alors que l'Esprit atteint ${SEUIL}. ` +
        `Titres vus : ${screen
          .getAllByRole('heading')
          .map((h) => h.textContent)
          .join(' | ')}`,
    ).not.toBeNull()
    // Tout le catalogue s'y offre, comme dans n'importe quel emplacement de don.
    expect(choisissables(carte!).length).toBe(listeDons().length)
  })

  it('reprendre le jeton referme l’emplacement — aucun don ne reste posé', () => {
    afficher(auBordDuPalier(), VERS_PALIER)
    poserJeton('Esprit')
    const carte = carteDeGain(TITRE_PALIER)!
    fireEvent.click(choisissables(carte)[0])
    poserJeton('Esprit') // le même jeton : il se reprend
    expect(carteDeGain(TITRE_PALIER)).toBeNull()
  })

  it('« Confirmer » reste éteint tant que le don du palier n’est pas choisi', () => {
    const fiche = auBordDuPalier()
    afficher(fiche, VERS_PALIER)
    poserJeton('Esprit')
    const capacite = capacitesDeClasse(CLASSE).find(
      (c) => c.niveau <= VERS_PALIER && !Object.values(fiche.capNiveaux ?? {}).includes(c.id),
    )!
    const carteCapacite = carteDeGain(`Capacité du niveau ${VERS_PALIER}`)!
    const entete = within(carteCapacite)
      .getAllByRole('button')
      .filter((el) => el.hasAttribute('aria-expanded'))
      .find((el) => (el.textContent ?? '').includes(capacite.voieNom))!
    fireEvent.click(entete)
    fireEvent.click(
      choisissables(carteCapacite).find((el) =>
        (el.textContent ?? '').startsWith(capacite.nom),
      )!,
    )
    const confirmer = () =>
      screen.getByRole('button', {
        name: `Confirmer le niveau ${VERS_PALIER}`,
      }) as HTMLButtonElement
    expect(
      confirmer().disabled,
      'Confirmer s’allume alors que le don du palier n’est pas choisi',
    ).toBe(true)
    fireEvent.click(choisissables(carteDeGain(TITRE_PALIER)!)[0])
    expect(confirmer().disabled).toBe(false)
  })
})

describe('D19 ③ GD5 — la jumelle : sans palier ouvert, aucun emplacement de plus', () => {
  it('le point posé ailleurs que sur l’Esprit n’ouvre rien', () => {
    afficher(
      ficheDatee({ classe: CLASSE, niveau: VERS_PALIER - 1, espritCreation: SEUIL - 1 }),
      VERS_PALIER,
    )
    poserJeton('Puissance')
    expect(carteDeGain(TITRE_PALIER)).toBeNull()
  })

  it('un Esprit qui reste loin du palier n’ouvre rien non plus', () => {
    afficher(
      ficheDatee({ classe: CLASSE, niveau: VERS_PALIER - 1, espritCreation: 1 }),
      VERS_PALIER,
    )
    poserJeton('Esprit')
    expect(carteDeGain(TITRE_PALIER)).toBeNull()
  })

  it('un palier DÉJÀ consommé ne redemande rien', () => {
    // L'Esprit est au palier dès la création : le don a été pris à la création.
    afficher(
      ficheDatee({ classe: CLASSE, niveau: VERS_PALIER - 1, espritCreation: SEUIL }),
      VERS_PALIER,
    )
    poserJeton('Esprit')
    expect(carteDeGain(TITRE_PALIER)).toBeNull()
  })
})

describe('D19 ③ GD5 — le droit de palier laissé en souffrance se rattrape', () => {
  const A_POINT = echelonsAPoint().filter((n) => n > niveauMin())
  const ATTEINT = A_POINT[A_POINT.length - 1]

  /** La fiche telle qu'une version d'AVANT ce lot la laissait : droit en souffrance. */
  function enSouffrance() {
    return ficheDatee({
      classe: CLASSE,
      niveau: ATTEINT,
      espritCreation: SEUIL - A_POINT.length,
      surEsprit: A_POINT,
      palierNonConsomme: true,
    })
  }

  it('l’emplacement s’offre à la montée suivante, sans qu’aucun point ne soit posé', () => {
    const fiche = enSouffrance()
    expect(
      consommationDonsDeLaFiche(fiche),
      'la fiche témoin devrait porter un droit de don NON consommé',
    ).toBe(droitDons(valeurCarac(fiche, 'e'), fiche.achats, ATTEINT) - donsDuPalier(SEUIL))
    afficher(fiche, PLAFOND)
    expect(carteDeGain(TITRE_PALIER)).not.toBeNull()
  })

  it('l’anti-doublon vaut d’un emplacement à l’autre de la MÊME montée', () => {
    const fiche = enSouffrance()
    afficher(fiche, PLAFOND)
    const nonCumulable = listeDons().find(
      (d) => !d.cumulable && !(fiche.dons ?? {})[d.id],
    )!
    const carteDon = carteDeGain(`+${gainsMontee(PLAFOND).dons} don`)!
    fireEvent.click(
      choisissables(carteDon).find((el) =>
        (el.textContent ?? '').startsWith(nonCumulable.nom),
      )!,
    )
    // Le même don, dans l'emplacement du palier : éteint, avec la raison.
    const cartePalier = carteDeGain(TITRE_PALIER)!
    const jumelle = within(cartePalier)
      .getAllByRole('button')
      .find((el) => (el.textContent ?? '').startsWith(nonCumulable.nom))!
    expect(
      jumelle.getAttribute('aria-disabled'),
      `« ${nonCumulable.nom} » reste choisissable dans les deux emplacements`,
    ).toBe('true')
  })

  it('après la montée, la fiche a consommé EXACTEMENT ses droits', () => {
    const fiche = enSouffrance()
    const libres = listeDons().filter((d) => !(fiche.dons ?? {})[d.id])
    const maj = miseAJourMontee(
      { ...personnageDeLaFiche(fiche), id: 1 },
      PLAFOND,
      {
        capacite: capaciteLibre(fiche, PLAFOND),
        don: libres[0].id,
        donPalier: libres[1].id,
      },
      1,
    )
    const apres = maj.creation as FicheCreation
    expect(consommationDonsDeLaFiche(apres)).toBe(
      droitDons(valeurCarac(apres, 'e'), apres.achats, PLAFOND),
    )
  })

  it('sans le don du palier, la montée est refusée', () => {
    const fiche = enSouffrance()
    const libres = listeDons().filter((d) => !(fiche.dons ?? {})[d.id])
    expect(() =>
      miseAJourMontee(
        { ...personnageDeLaFiche(fiche), id: 1 },
        PLAFOND,
        { capacite: capaciteLibre(fiche, PLAFOND), don: libres[0].id },
        1,
      ),
    ).toThrow()
  })
})
