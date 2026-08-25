/**
 * t015 — GT4 : l'encyclopédie gagne son propre « Comment fonctionne cette
 * page », en tête du contenu, visible quel que soit l'onglet actif. Libellés
 * validés par l'organisateur — au caractère près, rien n'est reformulé.
 */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Encyclopedie, { SECTIONS } from '../../pages/Encyclopedie'

const GESTES = [
  'Touche un onglet en haut pour changer de section — ☆ Épinglés rassemble ce que tu as étoilé.',
  "Tape un mot dans la recherche : les règles qui en parlent s'ouvrent toutes seules.",
  "Touche l'étoile ☆ d'une règle, d'une capacité ou d'un objet pour la retrouver dans Épinglés.",
  'Les mots dorés soulignés sont des liens : touche-les pour sauter à la règle.',
  'A · A+ change la taille du texte ; « Tout ouvrir » déplie un groupe au complet.',
]

const POURQUOI = 'pour préparer ta fiche la veille du GN avec tout le manuel dans ta poche, même sans réseau.'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)

function allerA(id: (typeof SECTIONS)[number]['id']) {
  const nom = SECTIONS.find((s) => s.id === id)!.nom
  const barre = screen.getByRole('navigation', { name: /sections/i })
  fireEvent.click(within(barre).getByRole('button', { name: new RegExp(nom) }))
}

describe('t015 — GT4 : le mode d’emploi de l’encyclopédie', () => {
  it('se rend avec le titre « Comment fonctionne cette page » et les 5 gestes au caractère près', () => {
    render(<Encyclopedie />)
    expect(screen.getByText('Comment fonctionne cette page')).toBeTruthy()
    for (const geste of GESTES) expect(screen.getByText(geste)).toBeTruthy()
    expect(screen.getByText(`Pourquoi : ${POURQUOI}`)).toBeTruthy()
  })

  it('reste visible quel que soit l’onglet actif', () => {
    render(<Encyclopedie />)
    for (const section of SECTIONS) {
      allerA(section.id)
      expect(screen.getByText('Comment fonctionne cette page')).toBeTruthy()
    }
  })

  it('la mémoire tuto-encyclopedie fonctionne : repliée, elle le reste après un nouveau rendu', () => {
    render(<Encyclopedie />)
    fireEvent.click(screen.getByText('Comment fonctionne cette page'))
    expect(sessionStorage.getItem('tuto-encyclopedie')).toBe('replie')
    expect(screen.queryByText(GESTES[0])).toBeNull()
    cleanup()

    render(<Encyclopedie />)
    expect(screen.queryByText(GESTES[0])).toBeNull()
    expect(screen.getByText('Voir plus de détails')).toBeTruthy()
  })
})
