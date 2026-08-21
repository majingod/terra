/**
 * D18-bis — GATE : le troc quitte les achats d'expérience, dans les deux sens.
 *
 * Le catalogue d'héritage porte déjà « +1 Don » : c'est LA porte vers un don
 * de plus, et elle est moins chère qu'un achat de capacité. Troquer un achat
 * de capacité contre un don ferait deux portes pour un seul objet, la plus
 * chère en prime. Et sur cette même ligne, le catalogue exclut le mage
 * nommément (`restriction`) — le code ne l'avait jamais lue.
 *
 * ① Sur une fiche de guerrier COMME de mage, l'écran d'achats n'offre aucune
 *   voie de troc — et « +1 Don » reste achetable, à son prix, dans sa limite.
 * ② Le critère vient des DONNÉES : c'est la `restriction` du catalogue qui
 *   dit l'interdit, pas un id de classe écrit dans un test.
 * ④ Le budget XP paie le prix du catalogue, plein pot : la fuite au prix du
 *   troc est fermée.
 *
 * D5 : ni classe, ni don, ni libellé d'achat n'est nommé ici — tout est
 * retrouvé dans rules.json par critère.
 */
// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { depenseXp, effetAchat, listeAchats, xpRestant } from '../../../rules/heritage'
import type { AvantageHeritage } from '../../../rules/load'
import { capacitesDeClasse } from '../../../rules/capacites'
import { getRules } from '../../../rules/load'
import { niveauxPossibles } from '../../../rules/niveau'
import { listeDons } from '../../../rules/talents'
import { TROC_CAPACITE_VERS_DON, TROC_DON_VERS_CAPACITE } from '../../../rules/troc'
import type { FicheCreation } from '../../../wizard/types'
import { bassinAchat } from '../../../wizard/capacites'
import { ficheComplete } from '../../../wizard/__tests__/aide-fiche-complete'
import EtapeDestin from '../EtapeDestin'

const CLASSES = getRules().classes_squelette.liste
const GUERRIER = CLASSES.find((c) => c.troc === TROC_CAPACITE_VERS_DON)!.id
const MAGE = CLASSES.find((c) => c.troc === TROC_DON_VERS_CAPACITE)!.id

/** Les achats de capacité du catalogue, du moins cher au plus cher. */
const ACHATS_CAPACITE = listeAchats()
  .filter((a) => effetAchat(a.achat).type === 'capacite')
  .sort((a, b) => a.cout_xp - b.cout_xp)
/** La ligne « +1 Don » du catalogue — la porte normale vers un don de plus. */
const ACHAT_DON = listeAchats().find((a) => effetAchat(a.achat).type === 'don')!

function niveauDeLAchat(achat: AvantageHeritage): number {
  return (effetAchat(achat.achat) as { type: 'capacite'; niveau: number }).niveau
}

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

function Etape({ depart }: { depart: FicheCreation }) {
  const [fiche, setFiche] = useState(depart)
  return (
    <EtapeDestin
      fiche={fiche}
      onMaj={setFiche}
      onChangement={(changement) => setFiche(changement.fiche)}
    />
  )
}

function afficher(classe: string, retouche: Partial<FicheCreation> = {}): FicheCreation {
  const niveau = niveauxPossibles()[1]
  const depart = { ...ficheComplete(classe, niveau, capNiveaux(classe, niveau)), ...retouche }
  render(<Etape depart={depart} />)
  return depart
}

/** La ligne d'un achat du catalogue, retrouvée par son libellé. */
function ligneAchat(achat: AvantageHeritage): HTMLElement {
  return screen.getByText(achat.achat).closest('div')!.parentElement as HTMLElement
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('D18-bis ① — l’écran d’achats n’offre plus aucune voie de troc', () => {
  for (const [role, classe] of [
    ['guerrier', GUERRIER],
    ['mage', MAGE],
  ] as Array<[string, string]>) {
    it(`${role} : aucune carte de don, aucun accordéon de voie sous un achat de capacité`, () => {
      const achat = ACHATS_CAPACITE[0]
      const fiche = afficher(classe, { xpPerm: 99, achats: { [achat.achat]: 1 } })

      // Ce que la ligne d'achat offre, carte par carte : EXACTEMENT le bassin
      // de capacités de son niveau, et rien d'autre. Un nom de don qui serait
      // aussi un nom de capacité ne peut donc pas se cacher dans le compte.
      const ligne = ligneAchat(achat)
      const offert = within(ligne)
        .getAllByRole('button')
        .filter((el) => el.hasAttribute('aria-pressed'))
        .map((el) => el.textContent ?? '')
      // Le bassin de l'achat, D16 : anti-doublon compris, jamais recalculé ici.
      const bassin = bassinAchat(fiche, niveauDeLAchat(achat))
      expect(bassin.length, 'bassin de capacités vide : la gate ne prouverait rien')
        .toBeGreaterThan(0)
      expect(
        offert.length,
        `cartes vues : ${offert.map((t) => t.slice(0, 40)).join(' | ')}`,
      ).toBe(bassin.length)
      for (const carte of offert) {
        expect(
          bassin.some((c) => carte.startsWith(c.nom)),
          `carte hors du bassin de capacités : ${carte.slice(0, 60)}`,
        ).toBe(true)
      }
      // Et aucun accordéon nulle part sur cet écran : les voies n'y entrent pas.
      expect(
        screen.getAllByRole('button').filter((el) => el.hasAttribute('aria-expanded')).length,
        'un accordéon de voie est apparu sur l’écran d’achats',
      ).toBe(1) // le seul repliable de l'étape : le tutoriel 💡
    })

    it(`${role} : « ${ACHAT_DON.achat} » reste achetable, à son prix et dans sa limite`, () => {
      afficher(classe, { xpPerm: 99 })
      const ligne = ligneAchat(ACHAT_DON)
      expect(within(ligne).getByText(`${ACHAT_DON.cout_xp} XP`)).toBeTruthy()
      expect(within(ligne).getByText(`max ${ACHAT_DON.max_achats}`)).toBeTruthy()

      const plus = screen.getByRole('button', {
        name: `${ACHAT_DON.achat} : plus`,
      }) as HTMLButtonElement
      for (let i = 0; i < (ACHAT_DON.max_achats ?? 0); i++) {
        expect(plus.disabled, `bloqué à ${i} achats alors que le max est ${ACHAT_DON.max_achats}`)
          .toBe(false)
        fireEvent.click(plus)
      }
      // Le plafond du catalogue tient — ni plus, ni moins.
      expect(plus.disabled).toBe(true)
      const depense = ACHAT_DON.cout_xp * (ACHAT_DON.max_achats ?? 0)
      expect(screen.getByText(new RegExp(`${depense} dépensés`))).toBeTruthy()
    })
  }
})

describe('D18-bis ② — l’interdit du mage se lit dans les données', () => {
  it('la ligne « +1 Don » porte une restriction, et elle nomme l’échange', () => {
    // Le critère, pas la liste : on lit le champ, on ne recopie pas la phrase.
    expect(ACHAT_DON.restriction, `« ${ACHAT_DON.achat} » ne porte aucune restriction`)
      .toBeTruthy()
    expect(ACHAT_DON.restriction!.length).toBeGreaterThan(0)
  })

  it('aucun don acheté n’est troquable : le troc ne connaît que les niveaux', () => {
    // La forme de l'emplacement de troc le dit à la compilation comme à
    // l'exécution : il n'existe que par niveau. Ici, la preuve par l'écran —
    // la fiche d'un mage qui achète des dons n'ouvre aucun troc de plus.
    afficher(MAGE, { xpPerm: 99, achats: { [ACHAT_DON.achat]: ACHAT_DON.max_achats ?? 1 } })
    for (const capacite of capacitesDeClasse(MAGE)) {
      expect(
        screen.queryByText(capacite.nom),
        `une capacité est offerte contre un don acheté : ${capacite.nom}`,
      ).toBeNull()
    }
  })
})

describe('D18-bis ④ — le budget XP paie le prix du catalogue', () => {
  it('chaque achat de capacité coûte exactement ce que le catalogue dit', () => {
    for (const achat of ACHATS_CAPACITE) {
      expect(depenseXp({ [achat.achat]: 1 }), achat.achat).toBe(achat.cout_xp)
    }
  })

  it('un champ de troc résiduel sur la fiche ne fait plus baisser le prix', () => {
    // La fuite de #22 : un don rangé dans l'emplacement acheté payait le prix
    // du moins cher des achats de capacité. Une fiche qui porterait encore ce
    // champ paie désormais plein tarif.
    const cher = ACHATS_CAPACITE[ACHATS_CAPACITE.length - 1]
    expect(cher.cout_xp, 'le catalogue n’a qu’un seul prix d’achat de capacité').toBeGreaterThan(
      ACHATS_CAPACITE[0].cout_xp,
    )
    const fiche = {
      xpPerm: cher.cout_xp,
      achats: { [cher.achat]: 1 },
      donChoix: { [String(niveauDeLAchat(cher))]: [listeDons()[0].id] },
    } as FicheCreation
    expect(depenseXp(fiche.achats)).toBe(cher.cout_xp)
    expect(xpRestant(fiche)).toBe(0)
  })

  it('à l’écran, l’achat le plus cher affiche bien son prix', () => {
    const cher = ACHATS_CAPACITE[ACHATS_CAPACITE.length - 1]
    afficher(GUERRIER, { xpPerm: 99, achats: { [cher.achat]: 1 } })
    expect(screen.getByText(new RegExp(`${cher.cout_xp} dépensés`))).toBeTruthy()
  })
})
