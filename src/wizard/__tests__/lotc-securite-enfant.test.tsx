/**
 * Lot C — jumelles de sécurité du flux ≤11.
 *
 * Trois promesses, mesurées sur les écrans réels du flux neuf :
 * - aucun artisanat pour la tranche enfant, les quatre pour l'autre, sur les
 *   mêmes données — et pas d'étape compétences dans le flux enfant ;
 * - le flux ne demande ni date de naissance ni âge exact : la tranche est le
 *   SEUL champ d'âge, et les seuls champs libres sont les DEUX noms — celui du
 *   personnage, et (D25) le vrai nom du joueur, optionnel ;
 * - aucun écran ne porte le marqueur d'époque (reconstruit ici pour ne pas
 *   exister littéralement dans ce fichier).
 */
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { artisanatsDisponibles } from '../../rules/age'
import { classesEnfant, factionsEnfant } from '../../rules/kids'
import { getRules } from '../../rules/load'
import EtapeAge from '../../pages/creation/EtapeAge'
import EtapeCampEnfant from '../../pages/creation/enfant/EtapeCampEnfant'
import EtapeClasseEnfant from '../../pages/creation/enfant/EtapeClasseEnfant'
import EtapeFicheEnfant from '../../pages/creation/enfant/EtapeFicheEnfant'
import EtapeNiveauEnfant from '../../pages/creation/enfant/EtapeNiveauEnfant'
import EtapeNomEnfant from '../../pages/creation/enfant/EtapeNomEnfant'
import { ETAPES_ENFANT } from '../enfant'
import type { FicheCreation } from '../types'
import { trancheEnfant, trancheQuiContinue } from '../validation'

const MOT_INTERDIT = new RegExp(['m', 'i', 'n', 'e', 'u', 'r'].join(''), 'i')

const FICHE: FicheCreation = {
  trancheAge: trancheEnfant(),
  enfant: {
    faction: factionsEnfant()[0].id,
    classe: classesEnfant()[0].id,
    niveau: 5,
    nom: 'Brume',
  },
}

/** Tous les écrans du flux enfant, rendus dans un même conteneur. */
function rendreLeFluxEnfant(): HTMLElement {
  const { container } = render(
    <>
      <EtapeAge fiche={FICHE} onMaj={() => {}} />
      <EtapeCampEnfant fiche={FICHE} onMaj={() => {}} />
      <EtapeNiveauEnfant fiche={FICHE} onChangement={() => {}} />
      <EtapeClasseEnfant fiche={FICHE} onMaj={() => {}} />
      <EtapeNomEnfant fiche={FICHE} onMaj={() => {}} />
      <EtapeFicheEnfant fiche={FICHE} />
    </>,
  )
  return container
}

afterEach(cleanup)

describe('Lot C — artisanats interdits par la tranche, jamais par un marqueur', () => {
  it('tranche_11_moins_zero_artisanat_offert', () => {
    expect(artisanatsDisponibles(trancheEnfant())).toHaveLength(0)
  })

  it('tranche_12_plus_quatre_artisanats_offerts', () => {
    const disponibles = artisanatsDisponibles(trancheQuiContinue())
    expect(disponibles).toHaveLength(4)
    expect(disponibles).toEqual(getRules().competences.artisanats.liste)
  })

  it('le flux enfant n’a aucune étape compétences ni artisanats', () => {
    const ids = ETAPES_ENFANT.map((e) => e.id) as string[]
    expect(ids).not.toContain('talents')
    expect(ids).not.toContain('langues')
    expect(ids).not.toContain('destin')
    expect(ids).not.toContain('forces')
    const ecrans = rendreLeFluxEnfant().textContent ?? ''
    for (const artisanat of getRules().competences.artisanats.liste) {
      expect(ecrans).not.toContain(artisanat.nom)
    }
  })

  it('la gate vient de la MÊME donnée que l’embranchement : la tranche', () => {
    expect(trancheEnfant()).toBe(getRules().competences.artisanats.interdit_tranche)
    expect(trancheEnfant()).not.toBe(trancheQuiContinue())
  })
})

describe('Lot C — le flux enfant ne demande ni date de naissance ni âge exact', () => {
  it('la tranche est le SEUL champ d’âge : aucun champ date ni numérique', () => {
    const container = rendreLeFluxEnfant()
    const champs = [...container.querySelectorAll('input, select, textarea')]
    for (const champ of champs) {
      expect(champ.getAttribute('type')).not.toBe('date')
      expect(champ.getAttribute('type')).not.toBe('number')
      expect(champ.tagName).toBe('INPUT')
    }
  })

  /**
   * ⚠️ SPEC DE TEST MODIFIÉE PAR D25, ET RAPPORTÉE.
   *
   * Ce lot comptait UN seul champ libre dans le flux ≤11 (le nom du
   * personnage). D25 en ajoute un second — le vrai nom du joueur, optionnel —
   * et l'ajoute explicitement aux DEUX wizards. Les deux exigences ne peuvent
   * pas tenir ensemble : le compte devait bouger, et c'est l'arbitrage qui l'a
   * fait bouger, pas ce fichier.
   *
   * La jumelle ne s'affaiblit PAS pour autant : elle reste un compte EXACT, et
   * chacun des deux champs est nommé et rattaché à son libellé. Un troisième
   * champ libre — celui-là non arbitré — la fait toujours rougir.
   */
  it('jumelle : les seuls champs libres du flux sont les DEUX noms', () => {
    const container = rendreLeFluxEnfant()
    const champs = [...container.querySelectorAll('input, select, textarea')]
    expect(champs).toHaveLength(2)
    expect(champs.map((c) => c.id)).toEqual(['inom-enfant', 'inom-joueur-enfant'])

    const duPersonnage = container.querySelector('label[for="inom-enfant"]')
    expect(duPersonnage?.textContent).toMatch(/nom de ton personnage/i)

    // D25 : celui du joueur se présente comme optionnel, dans son libellé même.
    const duJoueur = container.querySelector('label[for="inom-joueur-enfant"]')
    expect(duJoueur?.textContent).toMatch(/ton nom à toi \(le joueur/i)
    expect(duJoueur?.textContent).toMatch(/optionnel/i)
  })

  it('jumelle : la fiche enfant ne porte aucun champ d’âge autre que la tranche', () => {
    expect(Object.keys(FICHE.enfant ?? {}).sort()).toEqual(['classe', 'faction', 'niveau', 'nom'])
  })
})

describe('Lot C — aucun écran ne porte le marqueur d’époque', () => {
  it('les libellés du flux neuf en sont exempts', () => {
    const texte = rendreLeFluxEnfant().textContent ?? ''
    expect(texte.length).toBeGreaterThan(0)
    expect(MOT_INTERDIT.test(texte)).toBe(false)
  })

  it('jumelle : le témoin est capable de le voir', () => {
    expect(MOT_INTERDIT.test('un joueur ' + ['min', 'eur'].join(''))).toBe(true)
  })
})
