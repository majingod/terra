/**
 * L'entrée d'installation : ce que le joueur voit, et ce qu'il ne voit plus
 * une fois l'app installée.
 */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EntreeInstallation, { ongletDevine } from '../EntreeInstallation'

afterEach(() => {
  cleanup()
  // jsdom n'a pas `matchMedia` : les tests qui le posent le retirent.
  delete (window as { matchMedia?: unknown }).matchMedia
})

function emettreLOffre(prompt = vi.fn().mockResolvedValue(undefined)) {
  const evenement = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
  })
  act(() => {
    window.dispatchEvent(evenement)
  })
  return { prompt, evenement }
}

/** Le navigateur répond que l'app tourne en mode « app installée ». */
function poserAffichageStandalone(standalone: boolean) {
  window.matchMedia = ((requete: string) => ({
    matches: standalone && requete.includes('display-mode: standalone'),
    media: requete,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('Entrée d’installation', () => {
  it('le bouton passe la main à l’invite du navigateur, dont l’offre a été neutralisée', () => {
    render(<EntreeInstallation />)
    const { prompt, evenement } = emettreLOffre()

    expect(evenement.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Installer' }))
    expect(prompt).toHaveBeenCalledTimes(1)

    // L'offre ne sert qu'une fois : la rangée retombe sur « Comment faire ».
    expect(screen.getByRole('button', { name: 'Comment faire' })).toBeTruthy()
  })

  it('déjà installée : la rangée n’est pas rendue', () => {
    poserAffichageStandalone(true)
    render(<EntreeInstallation />)
    expect(screen.queryByText('Installer l’app')).toBeNull()
  })

  it('jumelle : hors mode « app installée », la rangée est bien rendue', () => {
    poserAffichageStandalone(false)
    render(<EntreeInstallation />)
    expect(screen.getByText('Installer l’app')).toBeTruthy()
  })

  it('⛔ la rangée n’offre aucun bouton pour la fermer', () => {
    render(<EntreeInstallation />)
    expect(screen.queryByRole('button', { name: /fermer|masquer|plus tard|✕|×/i })).toBeNull()
  })
})

describe('Feuille d’instructions', () => {
  function ouvrirLaFeuille() {
    render(<EntreeInstallation />)
    fireEvent.click(screen.getByRole('button', { name: 'Comment faire' }))
  }

  it('elle porte les trois onglets, chacun avec au moins trois pas', () => {
    ouvrirLaFeuille()
    const feuille = screen.getByRole('dialog')
    const onglets = screen.getAllByRole('tab')
    expect(onglets.map((o) => o.textContent)).toEqual(['Android', 'Samsung', 'iPhone / iPad'])

    for (const onglet of onglets) {
      fireEvent.click(onglet)
      expect(feuille.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(3)
    }
  })

  it('l’encadré de fin dit comment savoir que c’est fait', () => {
    ouvrirLaFeuille()
    expect(
      screen.getByText(
        /Comment savoir que ça a marché : l’icône Terra Mortis apparaît sur ton écran d’accueil, et quand tu l’ouvres, la barre d’adresse du navigateur a disparu\./,
      ),
    ).toBeTruthy()
  })

  it('la devinette d’agent choisit l’onglet ouvert en premier', () => {
    expect(ongletDevine('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari')).toBe(
      'ios',
    )
    expect(ongletDevine('Mozilla/5.0 (Linux; Android 13; SM-A536B) SamsungBrowser/23.0')).toBe(
      'samsung',
    )
    expect(ongletDevine('Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/126')).toBe('android')
  })

  it('⚠️ commodité, jamais filtre : les trois onglets restent atteignables quel que soit l’agent', () => {
    for (const agent of [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari',
      'Mozilla/5.0 (Linux; Android 13; SM-A536B) SamsungBrowser/23.0',
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/126',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/128',
    ]) {
      Object.defineProperty(window.navigator, 'userAgent', { value: agent, configurable: true })
      ouvrirLaFeuille()

      const onglets = screen.getAllByRole('tab')
      expect(onglets).toHaveLength(3)
      for (const onglet of onglets) {
        fireEvent.click(onglet)
        expect(onglet.getAttribute('aria-selected')).toBe('true')
      }
      cleanup()
    }
  })

  it('elle se referme, et la rangée reste', () => {
    ouvrirLaFeuille()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Comment faire' })).toBeTruthy()
  })
})
