/**
 * D19 ③ GD3 — GATE : les trois règles de datation, pilotées par table.
 *
 * > Un don gagné par Esprit 3 porte le niveau du personnage au moment où
 * > Esprit a atteint 3 ; point acheté → toujours niveau 1 ; point d'échelon →
 * > le niveau de cet échelon. (arbitrage Fred t009)
 *
 * D5 : aucun échelon, aucun seuil, aucun droit n'est écrit ici — tout se
 * déduit de rules.json (table d'évolution, table cumulative d'Esprit,
 * catalogue des achats d'héritage).
 */
import { describe, expect, it } from 'vitest'
import { capacitesDeClasse } from '../../rules/capacites'
import { getRules } from '../../rules/load'
import { niveauMax, niveauMin, tableEvolution } from '../../rules/niveau'
import { droitDons, listeDons } from '../../rules/talents'
import { valeurCarac } from '../../rules/stats'
import { datesDesDons, niveauPalierEsprit3, palierNonConsomme } from '../datation'
import { miseAJourMontee } from '../montee'
import { consommationDonsDeLaFiche } from '../validation'
import type { FicheCreation } from '../types'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import {
  donsDuPalier,
  echelonsAPoint,
  ficheDatee,
  seuilDuPalier,
} from './aide-datation'

/** Les échelons de la table qui DONNENT un don, jusqu'au niveau demandé. */
function echelonsDeDon(niveau: number): number[] {
  return tableEvolution()
    .filter((ligne) => ligne.niv <= niveau && ligne.dons > 0)
    .flatMap((ligne) => Array.from({ length: ligne.dons }, () => ligne.niv))
}

const PLAFOND = niveauMax()
const SEUIL = seuilDuPalier()
/** Les deux échelons de montée dont le point peut pousser l'Esprit au palier. */
const A_POINT = echelonsAPoint().filter((n) => n > niveauMin())

describe('D19 ③ — témoins : ce que le corpus dit', () => {
  it('la table cumulative ouvre bien un don à un seuil d’Esprit', () => {
    expect(SEUIL).toBeGreaterThan(0)
    expect(donsDuPalier(SEUIL)).toBeGreaterThan(0)
    expect(donsDuPalier(SEUIL - 1)).toBe(0)
  })

  it('des échelons de montée donnent un point de caractéristique', () => {
    expect(A_POINT.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Règle 1 — un don pris dans l'emplacement d'un échelon date de cet échelon
// ---------------------------------------------------------------------------

describe('D19 ③ — échelon → son niveau', () => {
  it('les dons de la table portent le niveau de leur échelon', () => {
    // Esprit sous le seuil : aucun don de palier ne vient brouiller le compte.
    const fiche = ficheDatee({ niveau: PLAFOND, espritCreation: 1 })
    expect(valeurCarac(fiche, 'e')).toBeLessThan(SEUIL)
    const datees = datesDesDons(fiche)
    expect(datees.map((d) => d.source)).toEqual(echelonsDeDon(PLAFOND).map(() => 'echelon'))
    expect(datees.map((d) => d.niveau)).toEqual(echelonsDeDon(PLAFOND))
  })

  it('un don rangé dans un emplacement de CAPACITÉ (troc D18) date de cet emplacement', () => {
    const troc = getClasseQuiTroque()
    const fiche = ficheDatee({ classe: troc, niveau: PLAFOND, espritCreation: 1 })
    const libre = listeDons().find((d) => !(fiche.dons ?? {})[d.id])!
    const avecTroc: FicheCreation = { ...fiche, donNiveaux: { [String(PLAFOND)]: libre.id } }
    const instance = datesDesDons(avecTroc).find((d) => d.id === libre.id)
    expect(instance).toEqual({ id: libre.id, niveau: PLAFOND, source: 'troc' })
  })
})

/** La classe que les DONNÉES désignent comme troquant capacité → don. */
function getClasseQuiTroque(): string {
  const classes = getRules().classes_squelette.liste
  return (classes.find((c) => c.troc === 'capacite_vers_don') ?? classes[0]).id
}

// ---------------------------------------------------------------------------
// Règle 2 — un don issu d'un achat XP date du niveau 1
// ---------------------------------------------------------------------------

describe('D19 ③ — achat → niveau 1', () => {
  it('le don acheté à l’héritage date du niveau minimum, quel que soit le niveau', () => {
    const fiche = ficheDatee({ niveau: PLAFOND, espritCreation: 1, achatsDon: 1 })
    const datees = datesDesDons(fiche)
    const achetes = datees.filter((d) => d.source === 'achat')
    expect(achetes.length, `sources vues : ${datees.map((d) => d.source).join(', ')}`).toBe(1)
    expect(achetes[0].niveau).toBe(niveauMin())
  })
})

// ---------------------------------------------------------------------------
// Règle 3 — le don du palier date du niveau où l'Esprit a atteint le seuil
// ---------------------------------------------------------------------------

describe('D19 ③ — le niveau où l’Esprit atteint le palier', () => {
  it('Esprit au seuil dès la création → niveau 1', () => {
    const fiche = ficheDatee({ niveau: PLAFOND, espritCreation: SEUIL })
    expect(niveauPalierEsprit3(fiche)).toBe(niveauMin())
  })

  it('le point d’un échelon pousse l’Esprit au seuil → ce niveau-là', () => {
    for (const echelon of A_POINT) {
      const fiche = ficheDatee({
        niveau: PLAFOND,
        espritCreation: SEUIL - 1,
        surEsprit: [echelon],
      })
      expect(valeurCarac(fiche, 'e')).toBeGreaterThanOrEqual(SEUIL)
      expect(niveauPalierEsprit3(fiche), `échelon ${echelon}`).toBe(echelon)
    }
  })

  it('Esprit jamais au seuil → aucun niveau de palier', () => {
    const fiche = ficheDatee({ niveau: PLAFOND, espritCreation: 1 })
    expect(niveauPalierEsprit3(fiche)).toBeUndefined()
  })
})

describe('D19 ③ — le scénario canonique : Esprit 3 au niveau 4, Méditation au niveau 5', () => {
  /** L'échelon de montée le plus HAUT qui donne un point : le « 4 » du brief. */
  const ATTEINT_LE_PALIER = A_POINT[A_POINT.length - 1]
  /** L'échelon du plafond, qui donne un don : le « 5 » du brief. */
  const APRES = PLAFOND

  it('témoin : le scénario du brief existe bien dans la table', () => {
    expect(ATTEINT_LE_PALIER).toBeLessThan(APRES)
    expect(echelonsDeDon(APRES)).toContain(APRES)
  })

  it('le don choisi APRÈS coup porte le niveau où l’Esprit a atteint le palier', () => {
    // La fiche telle qu'une version d'avant D19 ③ la laissait : l'Esprit a
    // atteint le palier à l'échelon du point, et le don gagné n'avait AUCUN
    // emplacement où aller — il est resté non consommé.
    const avant = ficheDatee({
      niveau: ATTEINT_LE_PALIER,
      espritCreation: SEUIL - A_POINT.length,
      surEsprit: A_POINT,
      palierNonConsomme: true,
    })
    expect(niveauPalierEsprit3(avant)).toBe(ATTEINT_LE_PALIER)
    expect(palierNonConsomme(avant)).toBe(donsDuPalier(SEUIL))

    const personnage = { ...personnageDeLaFiche(avant), id: 1 }
    // Deux dons libres au catalogue : celui de l'échelon, et le « Méditation »
    // du brief — celui que le joueur réclame au niveau d'après.
    const libres = listeDons().filter((d) => !(avant.dons ?? {})[d.id])
    const duPalier = libres.find((d) => /m[ée]ditation/i.test(d.id)) ?? libres[0]
    const deLEchelon = libres.find((d) => d.id !== duPalier.id)!
    const capacite = capaciteLibre(avant, APRES)

    const maj = miseAJourMontee(
      personnage,
      APRES,
      { capacite, don: deLEchelon.id, donPalier: duPalier.id },
      1,
    )
    const apres = maj.creation as FicheCreation
    const datees = datesDesDons(apres)
    const instance = datees.find((d) => d.id === duPalier.id)
    expect(
      instance,
      `dons datés : ${datees.map((d) => `${d.id}@${d.niveau}/${d.source}`).join(', ')}`,
    ).toEqual({ id: duPalier.id, niveau: ATTEINT_LE_PALIER, source: 'palier' })
    // Et le don de l'échelon, lui, date bien de l'échelon.
    expect(datees.find((d) => d.id === deLEchelon.id)).toEqual({
      id: deLEchelon.id,
      niveau: APRES,
      source: 'echelon',
    })
  })
})

/** Une capacité de l'arbre de la classe, de niveau ≤ N, pas encore prise. */
function capaciteLibre(fiche: FicheCreation, niveau: number): string {
  const prises = new Set(Object.values(fiche.capNiveaux ?? {}))
  return capacitesDeClasse(fiche.classe).find(
    (c) => c.niveau <= niveau && !prises.has(c.id),
  )!.id
}

// ---------------------------------------------------------------------------
// Création : tout date de 1 · fiche sans historique : indatable
// ---------------------------------------------------------------------------

describe('D19 ③ — à la création, tout date du niveau 1', () => {
  it('échelon, achat et palier confondus, aucune date ne dépasse le niveau minimum', () => {
    const fiche = ficheDatee({ niveau: niveauMin(), espritCreation: SEUIL, achatsDon: 1 })
    const datees = datesDesDons(fiche)
    expect(datees.length).toBe(
      droitDons(valeurCarac(fiche, 'e'), fiche.achats, niveauMin()),
    )
    expect(datees.every((d) => d.niveau === niveauMin())).toBe(true)
    expect(new Set(datees.map((d) => d.source))).toEqual(
      new Set(['echelon', 'achat', 'palier']),
    )
  })
})

describe('D19 ③ — fiche d’AVANT D20 : indatable, jamais un plantage', () => {
  const SANS_HISTORIQUE: FicheCreation = (() => {
    const fiche = ficheDatee({ niveau: PLAFOND, espritCreation: SEUIL })
    const { historique, ...reste } = fiche
    void historique
    // Le champ d'époque, tel qu'une vieille fiche le porte encore.
    return { ...reste, niveau: PLAFOND }
  })()

  it('la dérivation ne lève pas et ne date rien', () => {
    expect(() => datesDesDons(SANS_HISTORIQUE)).not.toThrow()
    const datees = datesDesDons(SANS_HISTORIQUE)
    expect(datees.length).toBeGreaterThan(0)
    expect(datees.every((d) => d.niveau === undefined)).toBe(true)
    expect(datees.every((d) => d.source === 'indatable')).toBe(true)
  })

  it('le niveau du palier ne s’invente pas non plus', () => {
    expect(niveauPalierEsprit3(SANS_HISTORIQUE)).toBeUndefined()
  })

  it('une fiche vide ne fait rien exploser', () => {
    expect(datesDesDons({})).toEqual([])
    expect(datesDesDons(undefined)).toEqual([])
    expect(niveauPalierEsprit3(undefined)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Le compte : la datation couvre exactement les droits de la fiche
// ---------------------------------------------------------------------------

describe('D19 ③ — la datation ne perd ni n’invente d’instance', () => {
  it('autant d’instances datées que de dons pris, sur tous les parcours', () => {
    for (const espritCreation of [1, 2, 3]) {
      for (const surEsprit of [[], ...A_POINT.map((n) => [n]), A_POINT]) {
        const fiche = ficheDatee({ niveau: PLAFOND, espritCreation, surEsprit })
        const datees = datesDesDons(fiche)
        expect(
          datees.length,
          `Esprit ${espritCreation} + ${JSON.stringify(surEsprit)}`,
        ).toBe(consommationDonsDeLaFiche(fiche))
        expect(datees.every((d) => d.niveau !== undefined)).toBe(true)
      }
    }
  })
})
