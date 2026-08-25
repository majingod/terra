/**
 * D9-ter — l'encyclopédie rend ses CINQ onglets de contenu (plus « ☆ Épinglés »),
 * et chacun montre bien la donnée qu'il promet.
 *
 * Ce fichier remplace la mesure D9-bis ① (quatre sections) que D9-ter
 * renumérote : même rôle, même exigence, cinq témoins au lieu de quatre.
 *
 * Jumelle positive de `encyclopedie_sans_texte_en_dur` : ce test-là prouve
 * qu'aucune règle n'est recopiée dans le code ; celui-ci prouve que les
 * règles sont quand même à l'écran — sinon « zéro texte en dur » serait
 * trivialement vert sur une page vide.
 *
 * Chaque témoin est TIRÉ DES DONNÉES au moment du test : aucune phrase du
 * Tome n'est écrite ici non plus. Le témoin est le texte que les données
 * disent d'AFFICHER (`affichage ?? verbatim`, D14), pas le verbatim brut :
 * depuis 1.1.0, les deux diffèrent là où le Tome porte une coquille.
 */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LIBELLES } from '../../encyclopedie/modele'
import { enParagraphes } from '../../encyclopedie/texte'
import { branchesDe } from '../../rules/branches'
import { listeDesavantages } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { classesSquelette } from '../../rules/stats'
import { listeCompetencesSimples, listeDons } from '../../rules/talents'
import Encyclopedie, { SECTIONS, type SectionId } from '../Encyclopedie'
import { texteAffiche, type SourceDeTexte } from '../creation/ui'

beforeEach(() => {
  localStorage.clear()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)

/** Le premier paragraphe d'un texte du Tome, tel que l'écran l'aère. */
function premierParagraphe(source: SourceDeTexte): string {
  return enParagraphes(texteAffiche(source))[0].texte
}

const PREMIERE_CLASSE = classesSquelette()[0]
const PREMIERE_VOIE = branchesDe(PREMIERE_CLASSE.id)[0]

/**
 * Un témoin par onglet de contenu : les accordéons à ouvrir pour l'atteindre,
 * et le texte de règle attendu au bout.
 */
const TEMOINS: Array<{ section: SectionId; chemin: string[]; temoin: string }> = [
  {
    section: 'regles',
    chemin: [getRules().regles_de_base.sections[0].titre],
    temoin: premierParagraphe({ verbatim: getRules().regles_de_base.sections[0].verbatim! }),
  },
  {
    section: 'classes',
    chemin: [PREMIERE_CLASSE.nom, `${LIBELLES.voie} ${PREMIERE_VOIE.nom}`],
    temoin: premierParagraphe(PREMIERE_VOIE.capacites[0]),
  },
  {
    section: 'dons',
    chemin: [listeDons()[0].nom],
    temoin: premierParagraphe(listeDons()[0]),
  },
  {
    section: 'competences',
    chemin: [listeCompetencesSimples()[0].nom],
    temoin: listeCompetencesSimples()[0].base,
  },
  {
    section: 'desavantages',
    chemin: [listeDesavantages()[0].nom],
    temoin: premierParagraphe(listeDesavantages()[0]),
  },
]

/** Un titre du corpus peut porter des parenthèses : on le prend au pied de la lettre. */
function debutantPar(titre: string): RegExp {
  return new RegExp(`^${titre.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&')}`)
}

function ouvrir(section: SectionId, chemin: readonly string[]) {
  render(<Encyclopedie />)
  const barre = screen.getByRole('navigation', { name: /sections/i })
  const rang = SECTIONS.findIndex((s) => s.id === section)
  fireEvent.click(within(barre).getAllByRole('button')[rang])
  for (const titre of chemin) {
    fireEvent.click(screen.getByRole('button', { name: debutantPar(titre) }))
  }
}

function estAffiche(texte: string): boolean {
  return screen.queryAllByText((_, el) => el?.textContent?.includes(texte) === true).length > 0
}

describe('D9-ter — encyclopédie', () => {
  it('dénominateur : six chips, cinq onglets de contenu, un témoin chacun', () => {
    expect(SECTIONS).toHaveLength(6)
    expect(TEMOINS).toHaveLength(SECTIONS.length - 1)
    render(<Encyclopedie />)
    const barre = screen.getByRole('navigation', { name: /sections/i })
    const chips = within(barre).getAllByRole('button')
    for (const [i, definition] of SECTIONS.entries()) {
      expect(chips[i].textContent).toContain(definition.nom)
    }
  })

  it('encyclopedie_rend_un_temoin_par_section', () => {
    for (const { section, chemin, temoin } of TEMOINS) {
      expect(temoin.length).toBeGreaterThan(0)
      ouvrir(section, chemin)
      expect(estAffiche(temoin), section).toBe(true)
      cleanup()
    }
  })

  it('jumelle : un témoin d’une AUTRE section n’est pas rendu par celle-ci', () => {
    // Sans ça, une page qui déverse tout rendrait le test ci-dessus trivial.
    const [premier, second] = TEMOINS
    ouvrir(second.section, second.chemin)
    expect(estAffiche(second.temoin)).toBe(true)
    expect(estAffiche(premier.temoin)).toBe(false)
  })

  it('jumelle : un accordéon fermé ne déverse pas son corps', () => {
    const { section, chemin, temoin } = TEMOINS[2]
    ouvrir(section, [])
    expect(estAffiche(temoin)).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: debutantPar(chemin[0]) }))
    expect(estAffiche(temoin)).toBe(true)
  })

  it('la version des règles affichée est celle du fichier', () => {
    render(<Encyclopedie />)
    expect(estAffiche(getRules().meta.version)).toBe(true)
  })
})
