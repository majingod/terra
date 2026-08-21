/**
 * D18 ① — GATE : le guerrier, à la création, met un don dans un emplacement
 * de capacité.
 *
 * Maquette D18 v1, écran A : sous les trois vraies voies de l'emplacement
 * ouvert, une voie de PLUS — même accordéon, même pastille de compte, cartes
 * de dons à texte complet. Choisir un don remplit l'emplacement (exclusif
 * avec les capacités), la fiche écrite porte le don, et un non-guerrier n'a
 * AUCUNE voie de plus.
 *
 * D5 : ni la classe, ni le don, ni la capacité ne sont nommés ici. La classe
 * témoin est celle que les DONNÉES désignent par leur champ `troc` ; le don
 * témoin est le premier du catalogue.
 */
// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { branchesDe } from '../../../rules/branches'
import { capacitesDeClasse } from '../../../rules/capacites'
import { getRules } from '../../../rules/load'
import { niveauxPossibles } from '../../../rules/niveau'
import { listeDons } from '../../../rules/talents'
import { problemesCapacites } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import { ficheComplete } from '../../../wizard/__tests__/aide-fiche-complete'
import EtapeCapacites from '../EtapeCapacites'
import FicheAffichage from '../FicheAffichage'

/**
 * La valeur du champ `troc` qui dit « une capacité peut devenir un don ».
 * Elle est écrite ici parce que la gate doit pouvoir tourner sur un dépôt où
 * `src/rules/troc.ts` n'existe pas encore — c'est le critère lui-même qu'on
 * met à l'épreuve, pas un id de classe.
 */
const CAPACITE_VERS_DON = 'capacite_vers_don'

const CLASSES = getRules().classes_squelette.liste
const AVEC_TROC = CLASSES.find(
  (c) => (c as { troc?: string }).troc === CAPACITE_VERS_DON,
)
/** Sans le champ dans les données, on retombe sur une classe quelconque :
 *  la gate rougit alors sur l'écran, pas à l'import. */
const CLASSE = AVEC_TROC?.id ?? CLASSES[0].id
const SANS_TROC = CLASSES.find((c) => (c as { troc?: string }).troc === undefined)!.id
const VOIES = branchesDe(CLASSE)
const DON = listeDons()[0]
/** L'emplacement témoin : le deuxième, comme la maquette (création niveau 3). */
const NIVEAU = niveauxPossibles()[2]

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

/** L'étape branchée sur un état, comme le wizard la monte. */
function Etape({
  depart,
  onFiche,
}: {
  depart: FicheCreation
  onFiche: (fiche: FicheCreation) => void
}) {
  const [fiche, setFiche] = useState(depart)
  return (
    <EtapeCapacites
      fiche={fiche}
      onMaj={(suite) => {
        setFiche(suite)
        onFiche(suite)
      }}
    />
  )
}

let derniere: FicheCreation = {}

function afficher(depart: FicheCreation) {
  derniere = depart
  render(<Etape depart={depart} onFiche={(f) => (derniere = f)} />)
}

/** La carte d'un emplacement de niveau. */
function emplacement(niveau: number): HTMLElement {
  return screen.getByText(`Capacité du niveau ${niveau}`).closest('.carte-choix') as HTMLElement
}

/** Les en-têtes d'accordéon DE L'EMPLACEMENT (le tutoriel en a un aussi). */
function accordeons(niveau: number): HTMLElement[] {
  return within(emplacement(niveau))
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-expanded'))
}

/** Ouvre l'emplacement du niveau donné (bouton « Choisir » ou « Changer »). */
function ouvrirEmplacement(niveau: number) {
  const carte = emplacement(niveau)
  const bouton =
    within(carte).queryByRole('button', { name: 'Choisir' }) ??
    within(carte).queryByRole('button', { name: 'Changer' })
  if (bouton) fireEvent.click(bouton)
  return carte
}

/** La carte choisissable dont le nom ouvre le libellé. */
function carte(nom: string): HTMLElement | undefined {
  return screen
    .getAllByRole('button')
    .find((el) => el.hasAttribute('aria-pressed') && (el.textContent ?? '').startsWith(nom))
}

/**
 * Une fiche complète dont l'étape des dons n'a rien pris : la gate met à
 * l'épreuve l'emplacement de CAPACITÉ, pas le droit de dons — et tout le
 * catalogue doit s'y offrir.
 */
function depart(classe: string, capacites: Record<string, string> = {}): FicheCreation {
  return { ...ficheComplete(classe, NIVEAU, capacites), dons: {} }
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('D18 ① — la voie de troc, sous les vraies voies', () => {
  it('témoin : les données désignent bien une classe qui troque capacité → don', () => {
    expect(
      AVEC_TROC,
      "aucune classe de rules.json ne porte troc: 'capacite_vers_don'",
    ).toBeTruthy()
  })

  it('l’emplacement ouvert porte une voie de PLUS que les voies de la classe', () => {
    afficher(depart(CLASSE))
    ouvrirEmplacement(NIVEAU)
    expect(
      accordeons(NIVEAU).length,
      `accordéons vus : ${accordeons(NIVEAU)
        .map((a) => a.textContent)
        .join(' | ')}`,
    ).toBe(VOIES.length + 1)
  })

  it('cette voie de plus offre les dons du catalogue, à texte complet', () => {
    afficher(depart(CLASSE))
    ouvrirEmplacement(NIVEAU)
    const troc = accordeons(NIVEAU)[VOIES.length]
    expect(troc, 'pas de voie de troc sous les trois voies').toBeTruthy()
    fireEvent.click(troc)
    for (const don of listeDons()) {
      expect(carte(don.nom), `carte de don absente : ${don.nom}`).toBeTruthy()
    }
    expect(screen.getByText(DON.verbatim)).toBeTruthy()
  })
})

describe('D18 ① — choisir un don remplit l’emplacement', () => {
  function choisirLeDon() {
    afficher(depart(CLASSE))
    ouvrirEmplacement(NIVEAU)
    const troc = accordeons(NIVEAU)[VOIES.length]
    expect(troc, 'pas de voie de troc sous les trois voies').toBeTruthy()
    fireEvent.click(troc)
    const carteDon = carte(DON.nom)
    expect(carteDon, `carte de don absente : ${DON.nom}`).toBeTruthy()
    fireEvent.click(carteDon!)
  }

  it('la fiche porte le don DANS l’emplacement, pas ailleurs', () => {
    choisirLeDon()
    expect(derniere.donNiveaux?.[String(NIVEAU)]).toBe(DON.id)
    expect(derniere.capNiveaux?.[String(NIVEAU)]).toBeUndefined()
    // Il n'a pas fui vers l'étape des dons : ce n'est pas un droit de don.
    expect(derniere.dons?.[DON.id]).toBeUndefined()
  })

  it('retoucher la carte choisie la désélectionne — l’emplacement revient vide', () => {
    choisirLeDon()
    ouvrirEmplacement(NIVEAU)
    fireEvent.click(accordeons(NIVEAU)[VOIES.length])
    fireEvent.click(carte(DON.nom)!)
    expect(derniere.donNiveaux?.[String(NIVEAU)]).toBeUndefined()
  })

  it('exclusivité : choisir une capacité ensuite retire le don du même emplacement', () => {
    choisirLeDon()
    ouvrirEmplacement(NIVEAU)
    const capacite = capacitesDeClasse(CLASSE).find((c) => c.niveau <= NIVEAU)!
    const voie = accordeons(NIVEAU).find((el) => (el.textContent ?? '').includes(capacite.voieNom))!
    fireEvent.click(voie)
    fireEvent.click(carte(capacite.nom)!)
    expect(derniere.capNiveaux?.[String(NIVEAU)]).toBe(capacite.id)
    expect(derniere.donNiveaux?.[String(NIVEAU)]).toBeUndefined()
  })

  it('l’emplacement rempli par un don est valide, et compte pour son niveau', () => {
    const capacites = capNiveaux(CLASSE, NIVEAU)
    delete capacites[String(NIVEAU)]
    const fiche: FicheCreation = {
      ...ficheComplete(CLASSE, NIVEAU, capacites),
      donNiveaux: { [String(NIVEAU)]: DON.id },
    }
    expect(problemesCapacites(fiche)).toEqual([])
    // Jumelle : sans le don, il manque un emplacement.
    expect(problemesCapacites({ ...fiche, donNiveaux: {} })).not.toEqual([])
  })
})

describe('D18 ① — la fiche écrite porte le don', () => {
  it('il se range parmi les dons, sans distinction artificielle', () => {
    const capacites = capNiveaux(CLASSE, NIVEAU)
    delete capacites[String(NIVEAU)]
    const fiche: FicheCreation = {
      ...depart(CLASSE, capacites),
      donNiveaux: { [String(NIVEAU)]: DON.id },
    }
    render(<FicheAffichage fiche={fiche} />)
    const acquis = screen.getByRole('heading', { name: 'Ce que tu as acquis' })
      .parentElement as HTMLElement
    expect(
      within(acquis).queryByText(DON.nom),
      `« ${DON.nom} » absent de la fiche écrite`,
    ).toBeTruthy()
  })
})

describe('D18 ③ — jumelle négative : un non-guerrier n’a aucune voie de troc', () => {
  it('son emplacement ouvert ne porte QUE les voies de sa classe', () => {
    afficher(depart(SANS_TROC))
    ouvrirEmplacement(NIVEAU)
    expect(accordeons(NIVEAU)).toHaveLength(branchesDe(SANS_TROC).length)
    for (const don of listeDons()) {
      expect(carte(don.nom), `un don s'est glissé chez une classe sans troc : ${don.nom}`)
        .toBeUndefined()
    }
  })
})
