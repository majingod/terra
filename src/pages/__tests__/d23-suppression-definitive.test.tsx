/**
 * D23 — « Supprimer » efface pour de bon, et il faut DEUX gestes pour y arriver.
 *
 * Gates G1, G2, G5, G6 et G8 du brief. Ce lot lève la garde « rien ne
 * s'efface » qui tenait depuis le lot corbeille : ces tests sont ce qui la
 * remplace. Ils prouvent les deux moitiés du contrat — le geste complet efface
 * VRAIMENT (une corbeille qui ment a fait croire à l'organisateur qu'il avait
 * supprimé des fiches encore présentes), et tout geste incomplet ne touche à
 * RIEN.
 *
 * Le chrono du maintien est un `setInterval` : on ne fake QUE `setInterval` et
 * `clearInterval`, le temps du geste. Faker `setTimeout` casserait Dexie,
 * `fake-indexeddb` et l'attente de `@testing-library`.
 *
 * ⛔ Aucun vrai prénom d'enfant ici : uniquement des personnages fictifs.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import { AVERTISSEMENT_SUPPRESSION } from '../../components/PanneauSuppression'
import { DUREE_MAINTIEN_MS } from '../../components/BoutonMaintien'
import * as exportImport from '../../utils/exportImport'
import Accueil from '../Accueil'

afterEach(async () => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  cleanup()
  await db.personnages.clear()
})

function afficheAccueil() {
  return render(
    <MemoryRouter>
      <Accueil />
    </MemoryRouter>,
  )
}

function fiche(nom: string, updatedAt: number): Omit<Personnage, 'id'> {
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: nom,
    race: 'Humain',
    classe: 'Guerrier',
    niveau: 4,
    updatedAt,
  }
}

/** Une fiche du flux ≤11 : même magasin, même parcours (D23 · G8). */
function ficheEnfant(nom: string, updatedAt: number): Omit<Personnage, 'id'> {
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: nom,
    updatedAt,
    trancheAge: '≤11',
    creation: { trancheAge: '≤11', enfant: { faction: 'sanctum', classe: 'garde', niveau: 2 } },
  }
}

async function ajoute(f: Omit<Personnage, 'id'>): Promise<number> {
  return (await db.personnages.add(f)) as number
}

/**
 * La question du panneau porte le nom en gras : son texte est réparti sur
 * plusieurs nœuds, et `getByText` ne lit que les nœuds texte DIRECTS.
 */
function texteEntier(attendu: string): boolean {
  return Array.from(document.querySelectorAll('p')).some(
    (n) => n.textContent?.replace(/\s+/g, ' ').trim() === attendu,
  )
}

function boutonMaintien(): HTMLElement {
  return screen.getByRole('button', { name: /maintiens pour supprimer/i })
}

function barre(): number {
  return Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))
}

/** Ouvre le panneau d'une fiche — le PREMIER geste, celui qui n'efface rien. */
async function ouvrePanneau(nom: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Supprimer ${nom}` }))
}

/** Maintient le bouton `duree` ms, chrono faké, puis rend la main au temps réel. */
function maintient(duree: number, relache = true) {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const bouton = boutonMaintien()
  fireEvent.pointerDown(bouton)
  act(() => {
    vi.advanceTimersByTime(duree)
  })
  if (relache) fireEvent.pointerUp(bouton)
  vi.useRealTimers()
}

describe('D23 · G1 — le geste complet efface pour de bon', () => {
  it('⭐ maintien de 1 500 ms : la fiche quitte le magasin, les autres restent', async () => {
    const id = await ajoute(fiche('Kaelen', 3000))
    await ajoute(fiche('Sarielle', 2000))
    await ajoute(fiche('Vharos', 1000))

    afficheAccueil()
    await ouvrePanneau('Kaelen')
    maintient(DUREE_MAINTIEN_MS)

    await waitFor(async () => expect(await db.personnages.get(id)).toBeUndefined())
    expect(await db.personnages.count()).toBe(2)
    expect((await db.personnages.toArray()).map((p) => p.nomPerso).sort()).toEqual([
      'Sarielle',
      'Vharos',
    ])
  })

  it('le panneau NOMME le personnage, et la carte disparaît avec un statut lisible', async () => {
    await ajoute(fiche('Kaelen', 1000))
    afficheAccueil()
    await ouvrePanneau('Kaelen')

    expect(texteEntier('Supprimer Kaelen pour de bon ?')).toBe(true)

    maintient(DUREE_MAINTIEN_MS)

    const statut = await screen.findByText('Kaelen supprimée pour de bon.')
    expect(statut.getAttribute('aria-live')).toBe('polite')
    await waitFor(() => expect(document.querySelectorAll('a[href^="/fiche/"]')).toHaveLength(0))
  })

  it('une fiche sans nom se supprime aussi, et s’annonce « Sans nom »', async () => {
    await ajoute(fiche('', 1000))
    afficheAccueil()
    await ouvrePanneau('Sans nom')

    expect(texteEntier('Supprimer Sans nom pour de bon ?')).toBe(true)
    maintient(DUREE_MAINTIEN_MS)

    expect(await screen.findByText('Sans nom supprimée pour de bon.')).toBeTruthy()
    await waitFor(async () => expect(await db.personnages.count()).toBe(0))
  })
})

describe('D23 · G2 — jumelle : non confirmé, rien ne bouge', () => {
  it('⭐ ① panneau ouvert puis « Annuler » : les 3 fiches sont intactes', async () => {
    const id = await ajoute(fiche('Kaelen', 3000))
    await ajoute(fiche('Sarielle', 2000))
    await ajoute(fiche('Vharos', 1000))
    const avant = await db.personnages.get(id)

    afficheAccueil()
    await ouvrePanneau('Kaelen')
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(await db.personnages.count()).toBe(3)
    expect(await db.personnages.get(id)).toEqual(avant)
    // Le panneau est refermé, et la carte est toujours là.
    expect(screen.queryByRole('button', { name: /maintiens pour supprimer/i })).toBeNull()
    expect(screen.getByText('Kaelen')).toBeTruthy()
  })

  it('⭐ ② maintien de 1 400 ms puis relâche : rien n’est effacé, barre à zéro', async () => {
    const id = await ajoute(fiche('Kaelen', 3000))
    await ajoute(fiche('Sarielle', 2000))
    await ajoute(fiche('Vharos', 1000))
    const avant = await db.personnages.get(id)

    afficheAccueil()
    await ouvrePanneau('Kaelen')

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    fireEvent.pointerDown(boutonMaintien())
    act(() => {
      vi.advanceTimersByTime(1400)
    })
    // La barre a bien avancé — le geste était en cours, il n'a pas abouti.
    expect(barre()).toBeGreaterThan(0)
    expect(barre()).toBeLessThan(100)
    fireEvent.pointerUp(boutonMaintien())
    vi.useRealTimers()

    expect(barre()).toBe(0)
    expect(await db.personnages.count()).toBe(3)
    expect(await db.personnages.get(id)).toEqual(avant)
  })

  it('quitter le bouton en cours de maintien remet à zéro et n’efface rien', async () => {
    await ajoute(fiche('Kaelen', 3000))
    await ajoute(fiche('Sarielle', 2000))
    await ajoute(fiche('Vharos', 1000))

    afficheAccueil()
    await ouvrePanneau('Kaelen')

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    fireEvent.pointerDown(boutonMaintien())
    act(() => {
      vi.advanceTimersByTime(1400)
    })
    fireEvent.pointerLeave(boutonMaintien())
    // Le doigt est parti : le temps qui passe ensuite ne déclenche RIEN.
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    vi.useRealTimers()

    expect(barre()).toBe(0)
    expect(await db.personnages.count()).toBe(3)
  })

  it('⛔ le bouton rouge ne s’active pas au clic : un tap seul n’efface pas', async () => {
    await ajoute(fiche('Kaelen', 1000))
    afficheAccueil()
    await ouvrePanneau('Kaelen')

    fireEvent.click(boutonMaintien())

    expect(await db.personnages.count()).toBe(1)
  })

  it('le chemin clavier est le MÊME geste : Entrée enfoncée 1 500 ms, pas un appui', async () => {
    await ajoute(fiche('Kaelen', 1000))
    afficheAccueil()
    await ouvrePanneau('Kaelen')

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    // Un appui bref ne fait rien.
    fireEvent.keyDown(boutonMaintien(), { key: 'Enter' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(boutonMaintien(), { key: 'Enter' })
    vi.useRealTimers()
    expect(barre()).toBe(0)
    expect(await db.personnages.count()).toBe(1)

    // La même touche ENFONCÉE jusqu'au bout efface.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    fireEvent.keyDown(boutonMaintien(), { key: 'Enter' })
    act(() => {
      vi.advanceTimersByTime(DUREE_MAINTIEN_MS)
    })
    vi.useRealTimers()

    await waitFor(async () => expect(await db.personnages.count()).toBe(0))
  })
})

describe('D23 · G5 — l’export est offert, jamais exigé', () => {
  it('le panneau propose « Exporter d’abord (fichier JSON) », branché sur exporterPersonnageJSON', async () => {
    await ajoute(fiche('Kaelen', 1000))
    const espion = vi.spyOn(exportImport, 'exporterPersonnageJSON').mockImplementation(() => {})

    afficheAccueil()
    await ouvrePanneau('Kaelen')

    fireEvent.click(screen.getByRole('button', { name: "Exporter d'abord (fichier JSON)" }))

    expect(espion).toHaveBeenCalledTimes(1)
    expect(espion.mock.calls[0][0].nomPerso).toBe('Kaelen')
    // ⛔ Exporter n'efface pas : c'est une offre, pas une étape du geste.
    expect(await db.personnages.count()).toBe(1)
  })

  it('⭐ jumelle : une suppression SANS export aboutit — l’export ne bloque jamais', async () => {
    await ajoute(fiche('Kaelen', 1000))
    const espion = vi.spyOn(exportImport, 'exporterPersonnageJSON').mockImplementation(() => {})

    afficheAccueil()
    await ouvrePanneau('Kaelen')
    maintient(DUREE_MAINTIEN_MS)

    await waitFor(async () => expect(await db.personnages.count()).toBe(0))
    expect(espion).not.toHaveBeenCalled()
  })
})

describe('D23 · G6 — le message « ta fiche vit sur cet appareil » est relogé', () => {
  it('le panneau le porte VERBATIM, au bord de l’effacement', async () => {
    await ajoute(fiche('Kaelen', 1000))
    afficheAccueil()
    await ouvrePanneau('Kaelen')

    expect(
      screen.getByText(
        'Ta fiche vit seulement sur cet appareil. Une fois supprimée, elle ne pourra pas être récupérée.',
      ),
    ).toBeTruthy()
    // La constante exportée et le texte à l'écran ne peuvent pas diverger.
    expect(screen.getByText(AVERTISSEMENT_SUPPRESSION)).toBeTruthy()
  })

  it('⛔ il ne s’affiche pas tant que le joueur n’a pas ouvert le panneau', async () => {
    await ajoute(fiche('Kaelen', 1000))
    afficheAccueil()
    await screen.findByText('Kaelen')

    expect(screen.queryByText(AVERTISSEMENT_SUPPRESSION)).toBeNull()
  })
})

describe('D23 · G8 — ≤11 : exactement le même parcours', () => {
  it('⭐ une fiche enfant suit G1 avec les mêmes libellés et les mêmes gestes', async () => {
    const id = await ajoute(ficheEnfant('Brume', 2000))
    await ajoute(fiche('Kaelen', 1000))

    afficheAccueil()
    await ouvrePanneau('Brume')

    // Mêmes mots, à la lettre.
    expect(texteEntier('Supprimer Brume pour de bon ?')).toBe(true)
    expect(screen.getByText(AVERTISSEMENT_SUPPRESSION)).toBeTruthy()
    expect(screen.getByRole('button', { name: "Exporter d'abord (fichier JSON)" })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeTruthy()

    maintient(DUREE_MAINTIEN_MS)

    await waitFor(async () => expect(await db.personnages.get(id)).toBeUndefined())
    expect(await db.personnages.count()).toBe(1)
    expect(await screen.findByText('Brume supprimée pour de bon.')).toBeTruthy()
  })
})
