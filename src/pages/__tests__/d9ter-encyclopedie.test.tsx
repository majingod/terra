/**
 * D9-ter — l'encyclopédie porte SIX chips, dans cet ordre, et atterrit sur
 * « Règles ».
 *
 * [GU2] Ce fichier est la preuve de changement du lot : lancé sur
 * `origin/main` (quatre sections, D9-bis ①), il ROUGIT proprement ; lancé sur
 * le lot, il verdit. Il ne mesure que la structure d'écran — aucune phrase du
 * Tome n'est écrite ici.
 */
// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compteDe, ongletsDeContenu } from '../../encyclopedie/modele'
import Encyclopedie, { SECTIONS } from '../Encyclopedie'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

/** L'ordre D9-ter, en identifiants : ☆ Épinglés d'abord, Règles ensuite. */
const ORDRE_ATTENDU = [
  'epingles',
  'regles',
  'classes',
  'dons',
  'competences',
  'desavantages',
]

function barreDesChips(): HTMLElement {
  return screen.getByRole('navigation', { name: /sections/i })
}

describe('D9-ter — les six chips de l’encyclopédie', () => {
  it('six sections, dans l’ordre D9-ter', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(ORDRE_ATTENDU)
  })

  it('les six chips sont à l’écran, dans le même ordre', () => {
    render(<Encyclopedie />)
    const chips = within(barreDesChips()).getAllByRole('button')
    expect(chips).toHaveLength(6)
    for (const [i, definition] of SECTIONS.entries()) {
      expect(chips[i].textContent).toContain(definition.nom)
    }
  })

  it('l’onglet d’atterrissage est « Règles » — jamais un accueil vide', () => {
    render(<Encyclopedie />)
    const chips = within(barreDesChips()).getAllByRole('button')
    const presses = chips.filter((c) => c.getAttribute('aria-pressed') === 'true')
    expect(presses).toHaveLength(1)
    expect(presses[0].textContent).toContain(SECTIONS[1].nom)
  })

  it('chaque chip porte son compteur, dérivé des données', () => {
    render(<Encyclopedie />)
    const chips = within(barreDesChips()).getAllByRole('button')
    // Épinglés : compteur dynamique, à zéro tant que rien n'est épinglé.
    expect(chips[0].textContent).toMatch(/0\s*$/)
    for (const onglet of ongletsDeContenu()) {
      const rang = ORDRE_ATTENDU.indexOf(onglet.id)
      expect(rang).toBeGreaterThan(0)
      expect(chips[rang].textContent).toMatch(new RegExp(`${compteDe(onglet)}\\s*$`))
    }
  })

  it('jumelle : les compteurs ne sont pas tous égaux (ils viennent des données)', () => {
    const comptes = ongletsDeContenu().map(compteDe)
    expect(new Set(comptes).size).toBeGreaterThan(1)
    expect(Math.min(...comptes)).toBeGreaterThan(0)
  })
})
