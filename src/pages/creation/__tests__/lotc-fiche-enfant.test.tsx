/**
 * Lot C — la fiche enfant : la règle maison y est affichée mot pour mot, et
 * seul l'acquis y figure (les pouvoirs au-dessus du niveau n'y sont pas).
 */
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  capacitesEnfantAcquises,
  classesEnfant,
  factionsEnfant,
  getVersionKids,
  raceEnfant,
  regleMaisonEnfant,
} from '../../../rules/kids'
import { trancheEnfant } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import FicheEnfantAffichage from '../enfant/FicheEnfantAffichage'

const CLASSE = classesEnfant()[0]
const FACTION = factionsEnfant()[0]

afterEach(cleanup)

function fiche(niveau: number): FicheCreation {
  return {
    trancheAge: trancheEnfant(),
    enfant: { faction: FACTION.id, classe: CLASSE.id, niveau, nom: 'Brume' },
  }
}

describe('Lot C — fiche enfant', () => {
  it('fiche_enfant_affiche_regle_1_degat', () => {
    render(<FicheEnfantAffichage fiche={fiche(1)} />)
    expect(
      screen.getByText(
        'Peu importe la force du coup reçu, tu ne perds jamais plus de 1 PV à la fois.',
      ),
    ).toBeTruthy()
  })

  it('jumelle : la règle affichée est bien celle du fichier, pas une copie', () => {
    render(<FicheEnfantAffichage fiche={fiche(5)} />)
    expect(screen.getByText(regleMaisonEnfant().affichage)).toBeTruthy()
  })

  it('la fiche porte l’identité, les stats et la version du corpus enfant', () => {
    render(<FicheEnfantAffichage fiche={fiche(4)} />)
    expect(screen.getByText('Brume')).toBeTruthy()
    expect(screen.getByText(FACTION.nom)).toBeTruthy()
    expect(screen.getByText(CLASSE.nom)).toBeTruthy()
    expect(screen.getByText(raceEnfant().nom)).toBeTruthy()
    expect(screen.getByText(`Règles enfant v${getVersionKids()}`)).toBeTruthy()
    for (const tuile of ['PV', 'Dégâts', 'Lutte']) {
      expect(screen.getByText(tuile)).toBeTruthy()
    }
  })

  it('seul l’acquis figure : au niveau 3, le pouvoir du niveau 5 n’est pas là', () => {
    render(<FicheEnfantAffichage fiche={fiche(3)} />)
    const acquises = capacitesEnfantAcquises(CLASSE.id, 3)
    expect(acquises).toHaveLength(2)
    for (const capacite of acquises) {
      expect(screen.getAllByText(capacite.nom_affichage ?? capacite.nom).length).toBeGreaterThan(0)
    }
    const plusTard = CLASSE.capacites.find((c) => c.niveau === 5)!
    expect(screen.queryByText(plusTard.nom_affichage ?? plusTard.nom)).toBeNull()
  })

  it('D14 : la coquille de la planche est corrigée à l’affichage, le verbatim reste intact', () => {
    const corrigee = classesEnfant()
      .flatMap((c) => c.capacites)
      .find((c) => c.nom_affichage !== undefined)!
    expect(corrigee.nom).not.toBe(corrigee.nom_affichage)
    render(
      <FicheEnfantAffichage
        fiche={{
          trancheAge: trancheEnfant(),
          enfant: {
            faction: FACTION.id,
            classe: classesEnfant().find((c) => c.capacites.includes(corrigee))!.id,
            niveau: 5,
            nom: 'Brume',
          },
        }}
      />,
    )
    expect(screen.getByText(corrigee.nom_affichage!)).toBeTruthy()
    expect(screen.queryByText(corrigee.nom)).toBeNull()
  })
})
