/**
 * D18 ② — GATE : le mage, en montée 2→3, prend une capacité à la place du
 * don de l'échelon.
 *
 * Maquette D18 v1, écran B : les dons à plat comme aujourd'hui, puis — sous
 * eux — les voies de la classe en accordéons, chacun titré « ✦ Troc du mage —
 * une capacité ≤ niv N ». Une capacité au-dessus de N est indisponible avec
 * sa raison. La capacité troquée traverse l'anti-doublon D16.
 *
 * D5 : la classe témoin est celle que les DONNÉES désignent par leur champ
 * `troc` ; l'échelon témoin est le premier de la table qui donne un don
 * au-dessus du niveau minimum — jamais un « 3 » écrit ici.
 */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { branchesDe } from '../../../rules/branches'
import { capacitesDeClasse } from '../../../rules/capacites'
import { getRules } from '../../../rules/load'
import { niveauMin, niveauxPossibles, tableEvolution } from '../../../rules/niveau'
import { gainsMontee } from '../../../rules/montee'
import { miseAJourMontee } from '../../../wizard/montee'
import type { FicheCreation } from '../../../wizard/types'
import { ficheComplete } from '../../../wizard/__tests__/aide-fiche-complete'
import EcranMontee from '../EcranMontee'
import { personnageDeLaFiche } from './aide-montee'

/**
 * La valeur du champ `troc` qui dit « un don peut devenir une capacité ».
 * Écrite ici pour que la gate puisse tourner sur un dépôt où
 * `src/rules/troc.ts` n'existe pas encore : c'est le critère qu'on éprouve.
 */
const DON_VERS_CAPACITE = 'don_vers_capacite'

const CLASSES = getRules().classes_squelette.liste
const AVEC_TROC = CLASSES.find((c) => (c as { troc?: string }).troc === DON_VERS_CAPACITE)
/** Sans le champ dans les données, la gate rougit à l'écran, pas à l'import. */
const CLASSE = AVEC_TROC?.id ?? CLASSES[0].id
const SANS_TROC = CLASSES.find((c) => (c as { troc?: string }).troc === undefined)!.id
const VOIES = branchesDe(CLASSE)

/** L'échelon de montée qui donne un don (le plus bas au-dessus du minimum). */
const ATTEINT = tableEvolution()
  .filter((ligne) => ligne.niv > niveauMin() && ligne.dons > 0)
  .map((ligne) => ligne.niv)[0]
const DEPART = ATTEINT - 1
const TITRE_DON = `+${gainsMontee(ATTEINT).dons} don`
/** Le libellé arbitré de la maquette D18 v1, écran B. */
const TITRE_TROC = `✦ Troc du mage — une capacité ≤ niv ${ATTEINT}`

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

function personnage(classe = CLASSE, retouche: Partial<FicheCreation> = {}) {
  const fiche = { ...ficheComplete(classe, DEPART, capNiveaux(classe, DEPART)), ...retouche }
  return { ...personnageDeLaFiche(fiche), id: 1 }
}

function afficher(classe = CLASSE, retouche: Partial<FicheCreation> = {}) {
  render(
    <EcranMontee
      personnage={personnage(classe, retouche)}
      niveauAtteint={ATTEINT}
      onConfirmer={() => {}}
      onAnnuler={() => {}}
    />,
  )
}

/** La carte de gain qui porte ce titre. */
function carteDeGain(titre: string): HTMLElement {
  return screen.getByRole('heading', { name: titre }).parentElement as HTMLElement
}

/** Les en-têtes d'accordéon d'une carte de gain. */
function accordeons(carte: HTMLElement): HTMLElement[] {
  return within(carte)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-expanded'))
}

/** Les cartes choisissables d'une carte de gain. */
function choisissables(carte: HTMLElement): HTMLElement[] {
  return within(carte)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-pressed'))
}

/** La capacité de niveau exactement N de la classe. */
function capaciteDeNiveau(n: number) {
  return capacitesDeClasse(CLASSE).find(
    (c) => c.niveau === n && !Object.values(capNiveaux(CLASSE, DEPART)).includes(c.id),
  )!
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('D18 ② — sous les dons de l’échelon, les voies de la classe', () => {
  it('témoin : les données désignent bien une classe qui troque don → capacité', () => {
    expect(AVEC_TROC, "aucune classe de rules.json ne porte troc: 'don_vers_capacite'").toBeTruthy()
    expect(gainsMontee(ATTEINT).dons).toBeGreaterThan(0)
  })

  it('la carte du don porte un accordéon par voie, au libellé du troc', () => {
    afficher()
    const carte = carteDeGain(TITRE_DON)
    const entetes = accordeons(carte)
    expect(
      entetes.length,
      `accordéons vus : ${entetes.map((e) => e.textContent).join(' | ')}`,
    ).toBe(VOIES.length)
    for (const entete of entetes) {
      expect(entete.textContent).toContain(TITRE_TROC)
    }
    // La pastille nomme la voie (maquette D18 v1, écran B).
    for (const voie of VOIES) {
      expect(
        entetes.some((e) => (e.textContent ?? '').includes(voie.nom)),
        `voie absente des pastilles : ${voie.nom}`,
      ).toBe(true)
    }
  })

  it('les capacités de niveau ≤ l’échelon y sont choisissables', () => {
    afficher()
    const carte = carteDeGain(TITRE_DON)
    const cible = capaciteDeNiveau(ATTEINT)
    const entete = accordeons(carte).find((e) => (e.textContent ?? '').includes(cible.voieNom))!
    fireEvent.click(entete)
    expect(
      choisissables(carte).some((el) => (el.textContent ?? '').startsWith(cible.nom)),
      `capacité de niveau ${ATTEINT} absente du troc : ${cible.nom}`,
    ).toBe(true)
  })

  it('une capacité au-dessus de l’échelon est indisponible, avec la raison affichée', () => {
    afficher()
    const carte = carteDeGain(TITRE_DON)
    const trop = capacitesDeClasse(CLASSE).find((c) => c.niveau > ATTEINT)!
    const entete = accordeons(carte).find((e) => (e.textContent ?? '').includes(trop.voieNom))!
    fireEvent.click(entete)
    // Elle est VISIBLE — rien n'est escamoté — mais pas choisissable.
    const vue = within(carte).getByText(trop.nom)
    expect(vue).toBeTruthy()
    expect(
      choisissables(carte).some((el) => (el.textContent ?? '').startsWith(trop.nom)),
      `capacité de niveau ${trop.niveau} choisissable alors que l'échelon est ${ATTEINT}`,
    ).toBe(false)
    expect(vue.parentElement?.textContent).toContain(String(ATTEINT))
  })

  it('anti-doublon D16 : une capacité déjà prise à un niveau n’est pas choisissable ici', () => {
    afficher()
    const carte = carteDeGain(TITRE_DON)
    const deja = capacitesDeClasse(CLASSE).find((c) =>
      Object.values(capNiveaux(CLASSE, DEPART)).includes(c.id),
    )!
    const entete = accordeons(carte).find((e) => (e.textContent ?? '').includes(deja.voieNom))!
    fireEvent.click(entete)
    expect(
      choisissables(carte).some((el) => (el.textContent ?? '').startsWith(deja.nom)),
      `capacité déjà prise offerte au troc : ${deja.nom}`,
    ).toBe(false)
  })
})

describe('D18 ② — choisir la capacité remplit l’emplacement du don', () => {
  function choisirLaCapacite(cible = capaciteDeNiveau(ATTEINT)) {
    const carte = carteDeGain(TITRE_DON)
    const entete = accordeons(carte).find((e) => (e.textContent ?? '').includes(cible.voieNom))!
    fireEvent.click(entete)
    const bouton = choisissables(carte).find((el) => (el.textContent ?? '').startsWith(cible.nom))
    expect(bouton, `capacité absente du troc : ${cible.nom}`).toBeTruthy()
    fireEvent.click(bouton!)
    return cible
  }

  it('les cartes de don s’éteignent : l’emplacement porte l’un OU l’autre', () => {
    afficher()
    choisirLaCapacite()
    const carte = carteDeGain(TITRE_DON)
    const cartesDeDon = within(carte)
      .getAllByRole('button')
      .filter((el) => el.getAttribute('aria-disabled') === 'true')
    expect(cartesDeDon.length, 'les cartes de don ne se sont pas éteintes').toBeGreaterThan(0)
  })

  it('« Confirmer » s’allume quand la capacité du niveau est posée elle aussi', () => {
    afficher()
    choisirLaCapacite()
    const carteCapacite = carteDeGain(`Capacité du niveau ${ATTEINT}`)
    const cible = capacitesDeClasse(CLASSE).find(
      (c) =>
        c.niveau <= ATTEINT &&
        !Object.values(capNiveaux(CLASSE, DEPART)).includes(c.id) &&
        c.id !== capaciteDeNiveau(ATTEINT).id,
    )!
    fireEvent.click(
      accordeons(carteCapacite).find((e) => (e.textContent ?? '').includes(cible.voieNom))!,
    )
    fireEvent.click(
      choisissables(carteCapacite).find((el) => (el.textContent ?? '').startsWith(cible.nom))!,
    )
    const confirmer = screen.getByRole('button', {
      name: `Confirmer le niveau ${ATTEINT}`,
    }) as HTMLButtonElement
    expect(confirmer.disabled).toBe(false)
  })
})

describe('D18 ② — ce que la confirmation écrit', () => {
  it('la capacité troquée se range parmi les capacités, la provenance reste lisible', () => {
    const perso = personnage()
    const troquee = capaciteDeNiveau(ATTEINT)
    const duNiveau = capacitesDeClasse(CLASSE).find(
      (c) =>
        c.niveau <= ATTEINT &&
        c.id !== troquee.id &&
        !Object.values(capNiveaux(CLASSE, DEPART)).includes(c.id),
    )!
    const maj = miseAJourMontee(
      perso,
      ATTEINT,
      { capacite: duNiveau.id, capTroquee: troquee.id },
      1,
    )
    expect(maj.capacites, 'la capacité troquée manque à la fiche').toContain(troquee.id)
    expect(maj.capacites).toContain(duNiveau.id)
    // Aucun don n'a été pris : le droit est parti dans la capacité.
    expect(maj.dons).toEqual(Object.keys(perso.creation?.dons ?? {}))
    // La provenance : elle vit sous `capDons`, pas sous `capNiveaux`.
    expect(maj.creation?.capDons?.[String(ATTEINT)]).toBe(troquee.id)
    expect(maj.creation?.capNiveaux?.[String(ATTEINT)]).toBe(duNiveau.id)
  })

  it('sans choix pour l’emplacement du don, la montée est refusée', () => {
    const perso = personnage()
    const duNiveau = capacitesDeClasse(CLASSE).find(
      (c) => c.niveau <= ATTEINT && !Object.values(capNiveaux(CLASSE, DEPART)).includes(c.id),
    )!
    expect(() => miseAJourMontee(perso, ATTEINT, { capacite: duNiveau.id }, 1)).toThrow()
  })
})

describe('D18 ③ — jumelle négative : un non-mage n’a aucune voie sous ses dons', () => {
  it('sa carte de don ne porte aucun accordéon', () => {
    afficher(SANS_TROC)
    const carte = carteDeGain(TITRE_DON)
    expect(
      accordeons(carte).map((e) => e.textContent),
      'une voie de troc est apparue chez une classe sans troc',
    ).toEqual([])
  })
})
