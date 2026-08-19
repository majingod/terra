/**
 * D14 — les coquilles se corrigent À L'AFFICHAGE ; le verbatim sous gate
 * reste intact. Ce lot livre le MÉCANISME : le composant rend
 * `affichage ?? verbatim`. Aucun champ `affichage` n'existe encore dans
 * rules.json — c'est mesuré ici, et le fallback est donc le seul chemin
 * emprunté aujourd'hui.
 */
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import rules from '../../../data/rules.json'
import { TexteRegle, texteAffiche } from '../ui'

afterEach(cleanup)

/** Combien de clés « affichage » porte aujourd'hui le fichier de règles. */
function compterAffichages(valeur: unknown): number {
  if (Array.isArray(valeur)) return valeur.reduce<number>((n, v) => n + compterAffichages(v), 0)
  if (typeof valeur !== 'object' || valeur === null) return 0
  return Object.entries(valeur).reduce(
    (n, [cle, sous]) => n + (cle === 'affichage' ? 1 : 0) + compterAffichages(sous),
    0,
  )
}

describe('D14 — composant d’affichage de texte de règle', () => {
  it('sans champ « affichage », le verbatim est rendu tel quel', () => {
    render(<TexteRegle source={{ verbatim: 'Texte du Tome, faute incluse.' }} />)
    expect(screen.getByText(/Texte du Tome, faute incluse\./)).toBeTruthy()
  })

  it('jumelle : avec un champ « affichage », c’est lui qui est rendu', () => {
    render(
      <TexteRegle source={{ verbatim: 'Texte du Tome, faute incluse.', affichage: 'Corrigé.' }} />,
    )
    expect(screen.getByText(/Corrigé\./)).toBeTruthy()
    expect(screen.queryByText(/faute incluse/)).toBeNull()
  })

  it('le verbatim sous gate n’est jamais touché par la correction d’affichage', () => {
    const source = { verbatim: 'Original.', affichage: 'Corrigé.' }
    texteAffiche(source)
    expect(source.verbatim).toBe('Original.')
  })

  it('dénominateur : rules.json ne porte encore AUCUN champ « affichage »', () => {
    // Les données de correction viennent dans un lot suivant (D14) : tant que
    // ce compte vaut 0, seul le fallback s'exécute en production.
    expect(compterAffichages(rules)).toBe(0)
  })
})
