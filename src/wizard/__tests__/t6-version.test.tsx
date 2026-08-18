/**
 * T6 — la fiche affiche `meta.version` LUE DU FICHIER (D8-bis).
 * Preuve anti-constante : si getVersion() rend une version témoin, la fiche
 * l'affiche telle quelle — une constante en dur ferait rougir ce test.
 */
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import rulesJson from '../../data/rules.json'
import * as load from '../../rules/load'
import FicheAffichage from '../../pages/creation/FicheAffichage'
import { texteVersionRegles } from '../fiche'
import type { FicheCreation } from '../types'

vi.mock('../../rules/load', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../rules/load')>()
  return { ...original, getVersion: vi.fn(original.getVersion) }
})

const FICHE: FicheCreation = {
  trancheAge: '12+',
  faction: 'sanctum',
  race: 'nain',
  classe: 'guerrier',
  voie: 'guerrier.barbare',
  caracs: { p: 3, r: 2, e: 1 },
  extras: { p: 0, r: 0, e: 0 },
  dons: { robustesse: 1 },
  comps: ['herboriste'],
  langChoix: [],
  desavOrdre: [],
  xpPerm: 0,
  achats: {},
  capChoix: {},
  nom: 'Témoin T6',
}

afterEach(() => {
  cleanup()
  vi.mocked(load.getVersion).mockClear()
})

function chercheTexte(attendu: string) {
  return (_: string, element: Element | null) =>
    element?.tagName === 'SPAN' && (element.textContent ?? '').includes(attendu)
}

describe('T6 — version des règles visible sur la fiche', () => {
  it('la fiche affiche meta.version lue du fichier', () => {
    render(<FicheAffichage fiche={FICHE} />)
    expect(screen.getByText(chercheTexte(`Règles v${rulesJson.meta.version}`))).toBeTruthy()
    expect(vi.mocked(load.getVersion)).toHaveBeenCalled()
  })

  it('anti-constante : une version témoin lue du fichier s’affiche telle quelle', () => {
    vi.mocked(load.getVersion).mockReturnValue('999.0.0-temoin')
    try {
      render(<FicheAffichage fiche={FICHE} />)
      expect(screen.getByText(chercheTexte('Règles v999.0.0-temoin'))).toBeTruthy()
      expect(screen.queryByText(chercheTexte(`Règles v${rulesJson.meta.version}`))).toBeNull()
    } finally {
      vi.mocked(load.getVersion).mockImplementation(
        () => rulesJson.meta.version,
      )
    }
  })

  it('jumelle : texteVersionRegles() reflète le fichier', () => {
    expect(texteVersionRegles()).toBe(`Règles v${rulesJson.meta.version}`)
  })
})
