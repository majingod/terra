/**
 * D4-bis — au moment du CHOIX, l'écran de voie montre l'ARBRE COMPLET : les
 * cinq échelons de chaque voie, verbatim complet, pas un seul réduit à un
 * badge. La fiche, elle, ne montre que l'acquis.
 *
 * Rien n'est recopié ici : la classe, la voie et les textes attendus sont
 * lus de rules.json.
 */
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../../rules/branches'
import { getRules } from '../../../rules/load'
import { normaliserNiveau } from '../../../rules/niveau'
import EtapeClasse from '../EtapeClasse'
import { texteAffiche } from '../ui'
import FicheAffichage from '../FicheAffichage'
import type { FicheCreation } from '../../../wizard/types'

const CLASSE = getRules().classes_squelette.liste.find((c) =>
  classesAvecBranches().some((b) => b.classe_id === c.id),
)!
const VOIE = branchesDe(CLASSE.id)[0]

afterEach(cleanup)

function ficheAuNiveau(niveau: number): FicheCreation {
  return { faction: CLASSE.faction, classe: CLASSE.id, voie: VOIE.id, niveau }
}

describe('D4-bis — arbre complet au choix de voie', () => {
  it('les 5 échelons de la voie sont à l’écran, texte complet', () => {
    render(<EtapeClasse fiche={ficheAuNiveau(1)} onChangement={() => {}} />)
    expect(VOIE.capacites).toHaveLength(5)
    for (const capacite of VOIE.capacites) {
      expect(screen.getAllByText(new RegExp(escapeRegExp(capacite.nom))).length).toBeGreaterThan(0)
      expect(
        screen.getAllByText((_, el) => el?.textContent?.includes(texteAffiche(capacite)) === true)
          .length,
      ).toBeGreaterThan(0)
    }
  })

  it('jumelle : les échelons ≤ niveau sont marqués acquis, les autres non', () => {
    const niveau = 3
    render(<EtapeClasse fiche={ficheAuNiveau(niveau)} onChangement={() => {}} />)
    const acquis = screen.getAllByText(/· acquis$/)
    expect(acquis).toHaveLength(normaliserNiveau(niveau))
  })

  it('la fiche, elle, ne montre QUE l’acquis', () => {
    render(<FicheAffichage fiche={ficheAuNiveau(2)} />)
    const dedans = VOIE.capacites.filter(
      (c) => screen.queryAllByText(new RegExp(escapeRegExp(c.nom))).length > 0,
    )
    expect(dedans.map((c) => c.niveau)).toEqual([1, 2])
  })
})

function escapeRegExp(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
