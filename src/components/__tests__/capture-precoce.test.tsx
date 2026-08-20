/**
 * La capture précoce de l'offre d'installation — la cause technique n° 2.
 *
 * Chrome n'émet `beforeinstallprompt` qu'à son heure, et rien ne garantit
 * que React soit monté à ce moment-là. Un écouteur posé dans un `useEffect`
 * rate l'offre pour tout ce chargement de page : la rangée montre alors
 * « Comment faire » — les instructions manuelles — alors que le navigateur
 * offrait l'installation en un tap.
 *
 * ⭐ Ce fichier ROUGIT sur le code d'avant, où l'écouteur vivait dans le
 * `useEffect` de `RangeeInstallation`. Il n'importe rien du nouveau module :
 * il se lance tel quel contre `main`.
 */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RangeeInstallation from '../RangeeInstallation'

afterEach(cleanup)

/** L'offre du navigateur, telle qu'il l'émet (prompt() en plus d'un Event). */
function emettreLOffre(prompt = vi.fn().mockResolvedValue(undefined)) {
  const evenement = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
  })
  window.dispatchEvent(evenement)
  return { prompt, evenement }
}

const boutonInstaller = () => screen.queryByRole('button', { name: /^installer$/i })
const boutonCommentFaire = () => screen.queryByRole('button', { name: /comment faire/i })

describe('Offre d’installation émise AVANT le rendu de React', () => {
  // ⚠️ Ce test passe d'abord, avant qu'aucune offre n'ait été émise : il
  // interdit que le suivant soit vert pour une autre raison que la sienne.
  it('jumelle : sans offre, la rangée montre « Comment faire »', () => {
    render(<RangeeInstallation />)
    expect(boutonCommentFaire()).toBeTruthy()
    expect(boutonInstaller()).toBeNull()
  })

  it('⭐ une offre arrivée avant le rendu est quand même servie', () => {
    // L'offre part d'abord — aucun composant n'est monté.
    const { prompt } = emettreLOffre()
    render(<RangeeInstallation />)

    const installer = boutonInstaller()
    expect(installer, 'la rangée est retombée sur « Comment faire » : l’offre a été perdue').toBeTruthy()

    // On la relâche ici, pour qu'elle ne fuie pas vers le fichier suivant.
    fireEvent.click(installer as HTMLElement)
    expect(prompt).toHaveBeenCalledTimes(1)
  })
})
