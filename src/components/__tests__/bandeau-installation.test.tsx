/**
 * Bandeau d'installation : rien tant que le navigateur n'offre pas
 * l'installation, la bannière dès qu'il l'offre, et refermable.
 */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BandeauInstallation from '../BandeauInstallation'

afterEach(cleanup)

/** L'offre du navigateur, telle qu'il l'émet (prompt() en plus d'un Event). */
function offrirLInstallation(prompt = vi.fn().mockResolvedValue(undefined)) {
  const evenement = Object.assign(new Event('beforeinstallprompt'), { prompt })
  act(() => {
    window.dispatchEvent(evenement)
  })
  return prompt
}

describe('Bandeau d’installation', () => {
  it('rien si le navigateur n’offre pas l’installation', () => {
    render(<BandeauInstallation />)
    expect(screen.queryByRole('button', { name: /installer/i })).toBeNull()
  })

  it('la bannière apparaît quand le navigateur l’offre', () => {
    render(<BandeauInstallation />)
    offrirLInstallation()
    expect(screen.getByRole('button', { name: /installer l’app/i })).toBeTruthy()
  })

  it('le bouton passe la main à l’invite du navigateur', () => {
    render(<BandeauInstallation />)
    const prompt = offrirLInstallation()
    fireEvent.click(screen.getByRole('button', { name: /installer l’app/i }))
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /installer l’app/i })).toBeNull()
  })

  it('refermable : une fois fermée, elle ne revient pas', () => {
    render(<BandeauInstallation />)
    offrirLInstallation()
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }))
    expect(screen.queryByRole('button', { name: /installer l’app/i })).toBeNull()
    offrirLInstallation()
    expect(screen.queryByRole('button', { name: /installer l’app/i })).toBeNull()
  })

  it('l’offre par défaut du navigateur est neutralisée (preventDefault)', () => {
    render(<BandeauInstallation />)
    const evenement = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(),
    })
    act(() => {
      window.dispatchEvent(evenement)
    })
    expect(evenement.defaultPrevented).toBe(true)
  })
})
