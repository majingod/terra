/**
 * D18-bis ⑤ ⑥ — GATE : à la création, chaque emplacement de don dit à quel
 * échelon il appartient.
 *
 * Maquette D18-bis v2, écran C : la table donne un don aux échelons 1, 3 et 5.
 * Chacun forme son propre bloc, titré « Don du niveau N », avec la ligne
 * « Troquable contre une capacité de niveau ≤ N ». Sous cette ligne, UN SEUL
 * en-tête « ✦ Troquer contre une capacité » — puis les voies de la classe en
 * accordéons ordinaires, leur nom et leur compte.
 *
 * ⑥ L'anti-doublon D16 traverse les blocs : une capacité prise à l'échelon
 *   bas est indisponible à l'échelon haut, AVEC la raison affichée, et
 *   réciproquement.
 *
 * D5 : la classe témoin est celle que les données désignent par leur champ
 * `troc` ; le nombre de blocs est CALCULÉ depuis la table d'évolution, jamais
 * écrit ici.
 */
// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { branchesDe } from '../../../rules/branches'
import { capacitesDeClasse } from '../../../rules/capacites'
import { getRules } from '../../../rules/load'
import { niveauMax, niveauxPossibles } from '../../../rules/niveau'
import { echelonsDeDon, TROC_DON_VERS_CAPACITE } from '../../../rules/troc'
import {
  libelleDonDuNiveau,
  libellePlafondDuTroc,
  libelleTroquableContre,
  libelleTrocDuMage,
  optionsDeTrocCapacite,
  raisonCapaciteDejaAuTroc,
} from '../../../wizard/troc'
import { prisesAilleurs } from '../../../wizard/capacites'
import type { FicheCreation } from '../../../wizard/types'
import { ficheComplete } from '../../../wizard/__tests__/aide-fiche-complete'
import EtapeTalents from '../EtapeTalents'

const CLASSES = getRules().classes_squelette.liste
const MAGE = CLASSES.find((c) => c.troc === TROC_DON_VERS_CAPACITE)!.id
const SANS_TROC = CLASSES.find((c) => c.troc === undefined)!.id
const VOIES = branchesDe(MAGE)
/** Le niveau le plus haut de la table : celui qui ouvre le plus d'échelons. */
const NIVEAU = niveauMax()
/** Les échelons qui donnent un don — CALCULÉS, jamais « 1, 3, 5 » écrits ici. */
const ECHELONS = echelonsDeDon(NIVEAU)

function capNiveaux(classe: string, niveau: number): Record<string, string> {
  const arbre = capacitesDeClasse(classe)
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

let derniere: FicheCreation = {}

function Etape({ depart }: { depart: FicheCreation }) {
  const [fiche, setFiche] = useState(depart)
  return (
    <EtapeTalents
      fiche={fiche}
      onMaj={(suite) => {
        setFiche(suite)
        derniere = suite
      }}
      onChangement={(changement) => {
        setFiche(changement.fiche)
        derniere = changement.fiche
      }}
    />
  )
}

function afficher(classe = MAGE, retouche: Partial<FicheCreation> = {}): FicheCreation {
  const depart = { ...ficheComplete(classe, NIVEAU, capNiveaux(classe, NIVEAU)), ...retouche }
  derniere = depart
  render(<Etape depart={depart} />)
  return depart
}

/** Le bloc d'un emplacement de don, retrouvé par son titre. */
function bloc(echelon: number): HTMLElement | null {
  const titre = screen.queryByText(libelleDonDuNiveau(echelon))
  return titre ? (titre.parentElement as HTMLElement) : null
}

function accordeons(dans: HTMLElement): HTMLElement[] {
  return within(dans)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-expanded'))
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('D18-bis ⑤ — un bloc par échelon qui donne un don', () => {
  it('témoin : la table ouvre plusieurs échelons de don à ce niveau', () => {
    expect(ECHELONS.length).toBeGreaterThan(1)
  })

  it('il y a exactement autant de blocs que d’échelons, chacun nommé', () => {
    afficher()
    for (const echelon of ECHELONS) {
      expect(bloc(echelon), `bloc absent pour l'échelon ${echelon}`).toBeTruthy()
      expect(
        within(bloc(echelon)!).getByText(libelleTroquableContre(echelon)),
        `la ligne « troquable » manque au bloc ${echelon}`,
      ).toBeTruthy()
    }
    // Et pas un de plus : un échelon qui ne donne pas de don n'a pas de bloc.
    for (const niveau of niveauxPossibles()) {
      if (ECHELONS.includes(niveau)) continue
      expect(bloc(niveau), `bloc en trop pour l'échelon ${niveau}`).toBeNull()
    }
    expect(screen.getAllByText(libelleTrocDuMage())).toHaveLength(ECHELONS.length)
  })

  it('chaque bloc porte UN SEUL en-tête de troc, avec son propre plafond', () => {
    afficher()
    for (const echelon of ECHELONS) {
      const texte = bloc(echelon)!.textContent ?? ''
      expect(
        texte.split(libelleTrocDuMage()).length - 1,
        `en-tête répété dans le bloc ${echelon}`,
      ).toBe(1)
      expect(texte, `plafond absent du bloc ${echelon}`).toContain(
        libellePlafondDuTroc(echelon),
      )
    }
  })

  it('sous l’en-tête, les voies gardent leur nom ET leur compte', () => {
    const fiche = afficher()
    const comptes: number[] = []
    for (const echelon of ECHELONS) {
      const entetes = accordeons(bloc(echelon)!)
      expect(entetes).toHaveLength(VOIES.length)
      // Le MÊME bassin que celui que l'écran reçoit — anti-doublon D16 compris.
      const options = optionsDeTrocCapacite(
        fiche,
        echelon,
        prisesAilleurs(fiche, { echelonDon: echelon }),
      )
      for (const voie of VOIES) {
        const entete = entetes.find((e) => (e.textContent ?? '').startsWith(`▸${voie.nom}`))
        expect(entete, `voie absente du bloc ${echelon} : ${voie.nom}`).toBeTruthy()
        const attendu = options.filter(
          (o) => o.capacite.voieNom === voie.nom && !o.dejaPrise,
        ).length
        comptes.push(attendu)
        // La pastille est le dernier élément de l'en-tête.
        expect(
          (entete!.textContent ?? '').endsWith(String(attendu)),
          `compte faux pour ${voie.nom} au bloc ${echelon} : « ${entete!.textContent} », attendu ${attendu}`,
        ).toBe(true)
      }
    }
    // …et la gate prouve quelque chose : tous les comptes ne sont pas nuls.
    expect(comptes.some((n) => n > 0), `comptes vus : ${comptes.join(', ')}`).toBe(true)
  })

  it('jumelle négative : une classe sans troc n’a aucun bloc d’échelon', () => {
    afficher(SANS_TROC)
    for (const echelon of ECHELONS) {
      expect(bloc(echelon), `bloc apparu chez une classe sans troc : ${echelon}`).toBeNull()
    }
    expect(screen.queryByText(libelleTrocDuMage())).toBeNull()
  })
})

describe('D18-bis ⑥ — l’anti-doublon traverse les blocs, avec la raison', () => {
  const BAS = ECHELONS[0]
  const HAUT = ECHELONS[ECHELONS.length - 1]

  /** Une capacité de niveau ≤ l'échelon bas, libre de tout autre emplacement. */
  function capaciteCommune(fiche: FicheCreation) {
    const prises = new Set([
      ...Object.values(fiche.capNiveaux ?? {}),
      ...Object.values(fiche.capChoix ?? {}).flat(),
    ])
    return capacitesDeClasse(MAGE).find((c) => c.niveau <= BAS && !prises.has(c.id))!
  }

  it('prise à l’échelon bas, elle est indisponible à l’échelon haut', () => {
    const socle = ficheComplete(MAGE, NIVEAU, capNiveaux(MAGE, NIVEAU))
    const cible = capaciteCommune(socle)
    afficher(MAGE, { capDons: { [String(BAS)]: cible.id } })

    const options = optionsDeTrocCapacite(derniere, HAUT)
    const vue = options.find((o) => o.capacite.id === cible.id)!
    expect(vue.dejaPrise).toBe(true)
    expect(vue.raison).toBe(raisonCapaciteDejaAuTroc(BAS))

    // …et la raison est bien À L'ÉCRAN, sous l'échelon haut.
    const entete = accordeons(bloc(HAUT)!).find((e) =>
      (e.textContent ?? '').startsWith(`▸${cible.voieNom}`),
    )!
    fireEvent.click(entete)
    expect(
      within(bloc(HAUT)!).getByText(raisonCapaciteDejaAuTroc(BAS)),
      'la raison n’est pas affichée sous l’échelon haut',
    ).toBeTruthy()
  })

  it('jumelle : prise à l’échelon haut, elle est indisponible à l’échelon bas', () => {
    const socle = ficheComplete(MAGE, NIVEAU, capNiveaux(MAGE, NIVEAU))
    const cible = capaciteCommune(socle)
    afficher(MAGE, { capDons: { [String(HAUT)]: cible.id } })

    const vue = optionsDeTrocCapacite(derniere, BAS).find((o) => o.capacite.id === cible.id)!
    expect(vue.dejaPrise).toBe(true)
    expect(vue.raison).toBe(raisonCapaciteDejaAuTroc(HAUT))
    expect(within(bloc(BAS)!).queryByText(raisonCapaciteDejaAuTroc(HAUT))).toBeNull()
    const entete = accordeons(bloc(BAS)!).find((e) =>
      (e.textContent ?? '').startsWith(`▸${cible.voieNom}`),
    )!
    fireEvent.click(entete)
    expect(within(bloc(BAS)!).getByText(raisonCapaciteDejaAuTroc(HAUT))).toBeTruthy()
  })

  it('l’échelon qui PORTE le choix le montre choisi, pas éteint', () => {
    const socle = ficheComplete(MAGE, NIVEAU, capNiveaux(MAGE, NIVEAU))
    const cible = capaciteCommune(socle)
    afficher(MAGE, { capDons: { [String(BAS)]: cible.id } })
    const vue = optionsDeTrocCapacite(derniere, BAS).find((o) => o.capacite.id === cible.id)!
    expect(vue.choisie).toBe(true)
    expect(vue.dejaPrise).toBe(false)
  })
})
