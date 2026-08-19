/**
 * Le badge d'une capacité de base nomme SA CLASSE, pas sa catégorie :
 * « Magicien · de base », même grammaire que « Archimage · niv 1 ».
 *
 * Mesuré sur Fred : « Élémentaliste [classe] » se lisait comme un nom de
 * classe. Ce test rougit si un badge « classe » nu revient sur la fiche.
 */
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe, capacitesDeBase, classesAvecBranches } from '../../../rules/branches'
import { classesSquelette } from '../../../rules/stats'
import FicheAffichage from '../FicheAffichage'
import type { FicheCreation } from '../../../wizard/types'

const CLASSE = classesSquelette().find(
  (c) =>
    capacitesDeBase(c.id).length > 0 &&
    classesAvecBranches().some((b) => b.classe_id === c.id),
)!
const VOIE = branchesDe(CLASSE.id)[0]

const FICHE: FicheCreation = {
  faction: CLASSE.faction,
  classe: CLASSE.id,
  voie: VOIE.id,
  niveau: 1,
}

afterEach(cleanup)

describe('Badge des capacités de base', () => {
  it('capacite_de_base_porte_le_nom_de_sa_classe_et_pas_le_badge_classe_nu', () => {
    render(<FicheAffichage fiche={FICHE} />)
    const bases = capacitesDeBase(CLASSE.id)
    expect(bases.length).toBeGreaterThan(0)
    for (const capacite of bases) {
      const ligne = screen
        .getAllByText(capacite.nom)
        .map((el) => el.parentElement?.textContent ?? '')
        .find((texte) => texte.includes(capacite.nom))
      expect(ligne, capacite.nom).toBeTruthy()
      expect(ligne).toContain(`${CLASSE.nom} · de base`)
    }
    // Le libellé nu ne doit plus exister nulle part sur la fiche.
    expect(screen.queryAllByText('classe')).toEqual([])
  })

  it('jumelle : la même grammaire que les capacités de voie (« Voie · niv N »)', () => {
    render(<FicheAffichage fiche={FICHE} />)
    const echelon = VOIE.capacites.find((c) => c.niveau === 1)!
    expect(screen.getByText(`${VOIE.nom} · niv ${echelon.niveau}`)).toBeTruthy()
    // Un badge par capacité de base — la classe en a autant que le Tome lui donne.
    expect(screen.getAllByText(`${CLASSE.nom} · de base`)).toHaveLength(
      capacitesDeBase(CLASSE.id).length,
    )
  })
})
