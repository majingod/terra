/**
 * D4-bis — au moment du CHOIX, l'écran montre l'ARBRE COMPLET, texte complet,
 * pas un seul échelon réduit à un badge. La fiche, elle, ne montre que ce que
 * le personnage a.
 *
 * D16 : l'écran du choix a changé de maison. Il n'y a plus d'étape de voie —
 * c'est « Tes capacités » qui ouvre l'arbre, les trois voies ensemble, chaque
 * capacité avec son texte. L'exigence D4-bis, elle, ne bouge pas : au moment
 * de choisir, le joueur voit ce que fait chaque capacité.
 *
 * Rien n'est recopié ici : la classe, les voies et les textes attendus sont
 * lus de rules.json.
 */
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../../rules/branches'
import { capacitesDeClasse } from '../../../rules/capacites'
import { getRules } from '../../../rules/load'
import { niveauMax } from '../../../rules/niveau'
import EtapeCapacites from '../EtapeCapacites'
import { texteAffiche } from '../ui'
import FicheAffichage from '../FicheAffichage'
import type { FicheCreation } from '../../../wizard/types'

const CLASSE = getRules().classes_squelette.liste.find((c) =>
  classesAvecBranches().some((b) => b.classe_id === c.id),
)!
const VOIES = branchesDe(CLASSE.id)
const VOIE = VOIES[0]

afterEach(cleanup)

function ficheAuNiveau(niveau: number, capNiveaux: Record<string, string> = {}): FicheCreation {
  return { faction: CLASSE.faction, classe: CLASSE.id, niveau, capNiveaux }
}

/**
 * Le personnage au dernier échelon, tous ses emplacements remplis SAUF le
 * dernier : c'est celui-là qui s'ouvre, et il montre tout l'arbre.
 */
function ficheDernierEmplacementOuvert(): FicheCreation {
  const plafond = niveauMax()
  const capNiveaux: Record<string, string> = {}
  for (let n = 1; n < plafond; n++) {
    capNiveaux[String(n)] = VOIES[(n - 1) % VOIES.length].capacites.find((c) => c.niveau === n)!.id
  }
  return ficheAuNiveau(plafond, capNiveaux)
}

describe('D4-bis / D16 — arbre complet au moment du choix', () => {
  it('au dernier échelon, les 5 échelons de la voie sont à l’écran, texte complet', () => {
    render(<EtapeCapacites fiche={ficheDernierEmplacementOuvert()} onMaj={() => {}} />)
    expect(VOIE.capacites).toHaveLength(niveauMax())
    for (const capacite of VOIE.capacites) {
      expect(screen.getAllByText(capacite.nom).length, capacite.nom).toBeGreaterThan(0)
      expect(
        screen.getAllByText(texteAffiche(capacite)).length,
        `texte de ${capacite.nom}`,
      ).toBeGreaterThan(0)
    }
  })

  it('jumelle : les TROIS voies sont ouvertes ensemble, pas une seule', () => {
    render(<EtapeCapacites fiche={ficheDernierEmplacementOuvert()} onMaj={() => {}} />)
    const sections = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(sections).toEqual(VOIES.map((v) => v.nom))
    for (const capacite of capacitesDeClasse(CLASSE.id)) {
      expect(screen.getAllByText(capacite.nom).length, capacite.nom).toBeGreaterThan(0)
    }
  })

  it('un emplacement ne propose JAMAIS au-dessus de son échelon', () => {
    // Remplacement de l'ancienne assertion « les échelons ≤ niveau sont
    // marqués acquis » : plus rien n'est acquis d'office (D16). Ce qui reste
    // vrai, et vérifiable, c'est le plafond du choix.
    const niveau = 3
    render(<EtapeCapacites fiche={ficheAuNiveau(niveau)} onMaj={() => {}} />)
    // Seul l'emplacement du niveau 1 est ouvert : rien au-dessus de 1.
    const badges = screen.getAllByText(/^niv \d+$/).map((el) => Number(el.textContent!.slice(4)))
    expect(badges.length).toBeGreaterThan(0)
    expect(Math.max(...badges)).toBe(1)
    for (const capacite of capacitesDeClasse(CLASSE.id).filter((c) => c.niveau > 1)) {
      expect(screen.queryAllByText(capacite.nom), capacite.nom).toEqual([])
    }
  })

  it('la fiche, elle, ne montre QUE ce que le personnage a choisi', () => {
    const capNiveaux = {
      '1': VOIE.capacites.find((c) => c.niveau === 1)!.id,
      '2': VOIES[1].capacites.find((c) => c.niveau === 2)!.id,
    }
    render(<FicheAffichage fiche={ficheAuNiveau(2, capNiveaux)} />)
    const dedans = capacitesDeClasse(CLASSE.id).filter(
      (c) => screen.queryAllByText(c.nom).length > 0,
    )
    expect(dedans.map((c) => c.id).sort()).toEqual(Object.values(capNiveaux).sort())
  })
})
