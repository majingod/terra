/**
 * Chemin d'installation (maquette v1) : la rangée est là TOUJOURS tant que
 * l'app n'est pas installée — bouton doré quand le navigateur offre
 * l'installation, « Comment faire » quand il se tait — et elle disparaît
 * complètement une fois l'app installée.
 *
 * Le cas qui compte est le silence du navigateur : c'est là qu'il n'y avait
 * rien du tout à l'écran avant ce correctif.
 */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RangeeInstallation from '../RangeeInstallation'
import { ongletProbable } from '../FeuilleInstallation'

afterEach(() => {
  cleanup()
  // jsdom n'a pas `matchMedia` : les tests qui le posent le retirent.
  delete (window as { matchMedia?: unknown }).matchMedia
  delete (window.navigator as { standalone?: unknown }).standalone
})

/** L'offre du navigateur, telle qu'il l'émet (prompt() en plus d'un Event). */
function offrirLInstallation(prompt = vi.fn().mockResolvedValue(undefined)) {
  const evenement = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
  })
  act(() => {
    window.dispatchEvent(evenement)
  })
  return { prompt, evenement }
}

/** Le navigateur dit que l'app tourne déjà installée. */
function poserModeInstalle(installee: boolean) {
  window.matchMedia = ((requete: string) => ({
    matches: installee && requete.includes('standalone'),
    media: requete,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

const boutonInstaller = () => screen.queryByRole('button', { name: /^installer$/i })
const boutonCommentFaire = () => screen.queryByRole('button', { name: /comment faire/i })

describe('Rangée d’installation', () => {
  it('le navigateur se tait : la rangée est là quand même, avec « Comment faire »', () => {
    render(<RangeeInstallation />)
    expect(screen.getByText(/installer l’app/i)).toBeTruthy()
    expect(boutonCommentFaire()).toBeTruthy()
    expect(boutonInstaller()).toBeNull()
  })

  it('le navigateur offre l’installation : le bouton doré remplace « Comment faire »', () => {
    render(<RangeeInstallation />)
    offrirLInstallation()
    expect(boutonInstaller()).toBeTruthy()
    expect(boutonCommentFaire()).toBeNull()
  })

  it('le bouton doré passe la main à l’invite du navigateur', () => {
    render(<RangeeInstallation />)
    const { prompt } = offrirLInstallation()
    fireEvent.click(boutonInstaller() as HTMLElement)
    expect(prompt).toHaveBeenCalledTimes(1)
  })

  it('l’offre par défaut du navigateur est neutralisée (preventDefault)', () => {
    render(<RangeeInstallation />)
    const { evenement } = offrirLInstallation()
    expect(evenement.defaultPrevented).toBe(true)
  })

  it('offre consommée sans installation : la rangée retombe sur « Comment faire »', () => {
    render(<RangeeInstallation />)
    offrirLInstallation()
    fireEvent.click(boutonInstaller() as HTMLElement)
    expect(boutonInstaller()).toBeNull()
    expect(boutonCommentFaire()).toBeTruthy()
  })

  it('une fois installée pendant la session, la rangée disparaît complètement', () => {
    render(<RangeeInstallation />)
    offrirLInstallation()
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.queryByText(/installer l’app/i)).toBeNull()
    expect(boutonCommentFaire()).toBeNull()
  })

  it('app déjà installée (display-mode: standalone) : rien du tout', () => {
    poserModeInstalle(true)
    render(<RangeeInstallation />)
    expect(screen.queryByText(/installer l’app/i)).toBeNull()
  })

  it('app déjà installée sur iOS (navigator.standalone) : rien du tout', () => {
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true })
    render(<RangeeInstallation />)
    expect(screen.queryByText(/installer l’app/i)).toBeNull()
  })
})

describe('Feuille « Comment faire »', () => {
  function ouvrir() {
    render(<RangeeInstallation />)
    fireEvent.click(boutonCommentFaire() as HTMLElement)
  }

  it('« Comment faire » ouvre les instructions, avec les trois navigateurs', () => {
    ouvrir()
    expect(screen.getByRole('dialog')).toBeTruthy()
    const onglets = screen.getAllByRole('tab')
    expect(onglets.map((o) => o.textContent)).toEqual(['Android', 'Samsung', 'iPhone / iPad'])
  })

  it('les pas du navigateur choisi remplacent ceux d’avant', () => {
    ouvrir()
    expect(screen.getByText(/trois points en haut à droite de Chrome/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /iPhone/i }))
    expect(screen.getByText(/seul Safari sait installer une app/i)).toBeTruthy()
    expect(screen.getByText(/le carré avec une flèche vers le haut/i)).toBeTruthy()
    expect(screen.queryByText(/trois points en haut à droite de Chrome/i)).toBeNull()
  })

  it('la feuille dit comment savoir que c’est fait', () => {
    ouvrir()
    expect(screen.getByText(/comment savoir que ça a marché/i)).toBeTruthy()
    expect(screen.getByText(/la barre d’adresse du navigateur a disparu/i)).toBeTruthy()
  })

  it('elle se referme — et la rangée, elle, reste', () => {
    ouvrir()
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(boutonCommentFaire()).toBeTruthy()
  })

  it('Échap referme aussi', () => {
    ouvrir()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('l’onglet ouvert d’abord est celui du navigateur qu’on a sous la main', () => {
    expect(ongletProbable('Mozilla/5.0 (Linux; Android 13; SM-A536B) SamsungBrowser/23.0')).toBe(
      'samsung',
    )
    expect(ongletProbable('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari')).toBe(
      'ios',
    )
    expect(ongletProbable('Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/126')).toBe('android')
  })
})
