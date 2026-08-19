/**
 * D9-bis ① — l'encyclopédie rend ses QUATRE sections, et chacune montre bien
 * la donnée qu'elle promet.
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
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe } from '../../rules/branches'
import { listeDesavantages } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { classesSquelette } from '../../rules/stats'
import { listeCompetencesSimples, listeDons } from '../../rules/talents'
import Encyclopedie, { SECTIONS, type SectionId } from '../Encyclopedie'
import { texteAffiche } from '../creation/ui'

afterEach(cleanup)

/** Un témoin par section : son libellé d'onglet et le texte de règle attendu. */
const TEMOINS: Array<{ section: SectionId; temoin: string }> = [
  {
    section: 'classes',
    temoin: texteAffiche(branchesDe(classesSquelette()[0].id)[0].capacites[0]),
  },
  { section: 'dons', temoin: texteAffiche(listeDons()[0]) },
  { section: 'competences', temoin: listeCompetencesSimples()[0].base },
  { section: 'desavantages', temoin: texteAffiche(listeDesavantages()[0]) },
]

function ouvrir(section: SectionId) {
  render(<Encyclopedie />)
  const onglet = SECTIONS.find((s) => s.id === section)!
  fireEvent.click(screen.getByRole('button', { name: onglet.nom }))
}

function estAffiche(texte: string): boolean {
  return screen.queryAllByText((_, el) => el?.textContent?.includes(texte) === true).length > 0
}

describe('D9-bis ① — encyclopédie', () => {
  it('dénominateur : quatre sections, ni plus ni moins', () => {
    expect(SECTIONS).toHaveLength(4)
    expect(TEMOINS).toHaveLength(SECTIONS.length)
    render(<Encyclopedie />)
    for (const definition of SECTIONS) {
      expect(screen.getByRole('button', { name: definition.nom })).toBeTruthy()
    }
  })

  it('encyclopedie_rend_un_temoin_par_section', () => {
    for (const { section, temoin } of TEMOINS) {
      expect(temoin.length).toBeGreaterThan(0)
      ouvrir(section)
      expect(estAffiche(temoin)).toBe(true)
      cleanup()
    }
  })

  it('jumelle : un témoin d’une AUTRE section n’est pas rendu par celle-ci', () => {
    // Sans ça, une page qui déverse tout rendrait le test ci-dessus trivial.
    const [premier, second] = TEMOINS
    ouvrir(second.section)
    expect(estAffiche(second.temoin)).toBe(true)
    expect(estAffiche(premier.temoin)).toBe(false)
  })

  it('la version des règles affichée est celle du fichier', () => {
    render(<Encyclopedie />)
    expect(estAffiche(getRules().meta.version)).toBe(true)
  })
})
