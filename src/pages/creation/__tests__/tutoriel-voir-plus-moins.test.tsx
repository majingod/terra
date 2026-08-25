/**
 * t015 — le « Comment fonctionne » gagne « Voir plus / Voir moins de
 * détails » à la place des chevrons ▸/▾. Reproduit le geste vivant de
 * MAQUETTE_TUTORIEL_VOIR_PLUS_MOINS.html (Q11 : GO tel quel) : ouvert par
 * défaut, un touche sur le titre OU sur le libellé bascule l'état.
 */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Tutoriel } from '../ui'

afterEach(cleanup)
beforeEach(() => sessionStorage.clear())

describe('t015 — Tutoriel : Voir plus / Voir moins de détails', () => {
  it('ouvert par défaut, « Voir moins de détails » est visible au premier rendu', () => {
    render(
      <Tutoriel etapeId="t015-un" gestes={['Un geste.']} pourquoi="une raison." />,
    )
    expect(screen.getByText('Voir moins de détails')).toBeTruthy()
    expect(screen.getByText('Un geste.')).toBeTruthy()
    expect(screen.queryByText('Voir plus de détails')).toBeNull()
  })

  it('un touche sur le titre replie : contenu absent, « Voir plus de détails » apparaît', () => {
    render(
      <Tutoriel etapeId="t015-deux" gestes={['Un geste.']} pourquoi="une raison." />,
    )
    fireEvent.click(screen.getByText('Comment fonctionne cette étape'))
    expect(screen.queryByText('Un geste.')).toBeNull()
    expect(screen.getByText('Voir plus de détails')).toBeTruthy()
    expect(screen.queryByText('Voir moins de détails')).toBeNull()

    fireEvent.click(screen.getByText('Comment fonctionne cette étape'))
    expect(screen.getByText('Un geste.')).toBeTruthy()
    expect(screen.getByText('Voir moins de détails')).toBeTruthy()
  })

  it('le libellé lui-même est un second déclencheur, indépendant du titre', () => {
    render(
      <Tutoriel etapeId="t015-trois" gestes={['Un geste.']} pourquoi="une raison." />,
    )
    fireEvent.click(screen.getByText('Voir moins de détails'))
    expect(screen.queryByText('Un geste.')).toBeNull()
    expect(screen.getByText('Voir plus de détails')).toBeTruthy()

    fireEvent.click(screen.getByText('Voir plus de détails'))
    expect(screen.getByText('Un geste.')).toBeTruthy()
    expect(screen.getByText('Voir moins de détails')).toBeTruthy()
  })

  it('aria-expanded suit l’état sur le bouton de titre', () => {
    render(
      <Tutoriel etapeId="t015-quatre" gestes={['Un geste.']} pourquoi="une raison." />,
    )
    const titre = screen.getByText('Comment fonctionne cette étape').closest('button')!
    expect(titre.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(titre)
    expect(titre.getAttribute('aria-expanded')).toBe('false')
  })

  it('la mémoire de session (clé tuto-${etapeId}) est inchangée', () => {
    render(
      <Tutoriel etapeId="t015-cinq" gestes={['Un geste.']} pourquoi="une raison." />,
    )
    fireEvent.click(screen.getByText('Voir moins de détails'))
    expect(sessionStorage.getItem('tuto-t015-cinq')).toBe('replie')
    cleanup()

    render(
      <Tutoriel etapeId="t015-cinq" gestes={['Un geste.']} pourquoi="une raison." />,
    )
    expect(screen.getByText('Voir plus de détails')).toBeTruthy()
    expect(screen.queryByText('Un geste.')).toBeNull()
  })

  it('la prop titre a pour défaut « Comment fonctionne cette étape » — les usages du wizard ne changent pas d’appel', () => {
    render(
      <Tutoriel etapeId="t015-six" gestes={['Un geste.']} pourquoi="une raison." />,
    )
    expect(screen.getByText('Comment fonctionne cette étape')).toBeTruthy()
  })

  it('la prop titre peut être surchargée (usage encyclopédie)', () => {
    render(
      <Tutoriel
        etapeId="t015-sept"
        titre="Comment fonctionne cette page"
        gestes={['Un geste.']}
        pourquoi="une raison."
      />,
    )
    expect(screen.getByText('Comment fonctionne cette page')).toBeTruthy()
    expect(screen.queryByText('Comment fonctionne cette étape')).toBeNull()
  })
})
