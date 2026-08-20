/**
 * Les deux gates du correctif, prises sur l'ACCUEIL lui-même — c'est là que
 * le joueur cherche, et c'est là qu'il ne trouvait rien.
 *
 * ⭐ Ces deux tests ROUGISSENT sur le code d'avant (`BandeauInstallation`) :
 *   1. l'ancien bandeau ne s'affichait QUE sur `beforeinstallprompt`, donc
 *      rien pendant les ~30 premières secondes sur Chrome, rien du tout sur
 *      iPhone ni sur Samsung Internet ;
 *   2. son écouteur était posé dans un `useEffect` : une offre arrivée avant
 *      le montage de React était perdue pour tout ce chargement de page.
 *
 * Ils rendent l'Accueil entier, sans rien importer du nouveau module : ils
 * peuvent donc se lancer tels quels contre `main`.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Accueil from '../Accueil'

afterEach(cleanup)

function afficheAccueil() {
  return render(
    <MemoryRouter>
      <Accueil />
    </MemoryRouter>,
  )
}

/** L'offre du navigateur, telle qu'il l'émet (prompt() en plus d'un Event). */
function emettreLOffre(prompt = vi.fn().mockResolvedValue(undefined)) {
  const evenement = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
  })
  act(() => {
    window.dispatchEvent(evenement)
  })
  return { prompt, evenement }
}

describe('Chemin d’installation, sur l’Accueil', () => {
  it('la rangée est là même quand le navigateur n’offre RIEN', () => {
    afficheAccueil()
    expect(screen.getByText('Installer l’app')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Comment faire' })).toBeTruthy()
  })

  it('une offre arrivée AVANT le rendu de React est quand même servie', () => {
    // L'offre part d'abord — React n'est pas encore monté.
    emettreLOffre()
    afficheAccueil()

    const installer = screen.getByRole('button', { name: 'Installer' })
    expect(installer).toBeTruthy()

    // L'offre retenue est relâchée ici, pour ne pas fuir vers le test suivant.
    fireEvent.click(installer)
  })
})
