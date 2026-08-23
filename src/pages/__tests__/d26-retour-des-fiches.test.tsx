/**
 * D26 — les fiches que l'ancienne corbeille cachait reviennent dans la liste,
 * et G4 — la corbeille, elle, a disparu du code comme de l'écran.
 *
 * ⛔ Aucune purge : le balayage REMET en liste, il n'efface pas un octet. Le
 * sinistre à garder en tête est celui d'une migration qui mange la fiche d'un
 * joueur, hors réseau, sur le terrain — ces gates comptent les enregistrements
 * avant et après, et comparent les `updatedAt` un par un.
 *
 * ⛔ Aucun vrai prénom d'enfant ici : uniquement des personnages fictifs.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import Accueil from '../Accueil'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

afterEach(async () => {
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

function fiche(nom: string, updatedAt: number, retireeLe?: number): Omit<Personnage, 'id'> {
  const base = {
    ...nouvellePersonnageVierge(),
    nomPerso: nom,
    race: 'Humain',
    classe: 'Guerrier',
    niveau: 3,
    updatedAt,
  }
  return retireeLe === undefined ? base : { ...base, retireeLe }
}

/** Une fiche du flux ≤11, elle aussi rangée dans l'ancienne corbeille. */
function ficheEnfantRetiree(nom: string, updatedAt: number, retireeLe: number) {
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: nom,
    updatedAt,
    retireeLe,
    trancheAge: '≤11' as const,
    creation: { trancheAge: '≤11' as const, enfant: { faction: 'sanctum', classe: 'garde', niveau: 2 } },
  }
}

/** Les noms des cartes de la liste, dans l'ordre affiché. */
function nomsAffiches(): string[] {
  return Array.from(document.querySelectorAll('a[href^="/fiche/"]')).map(
    (lien) => lien.querySelector('span')?.textContent ?? '',
  )
}

/**
 * Le bandeau n'apparaît QU'APRÈS le balayage : c'est le seul point de
 * synchronisation honnête. ⛔ Pas le compte de cartes — la liste ne filtre plus
 * rien, elle affiche les 5 fiches AVANT même que le balayage n'ait rendu la
 * main, et une assertion sur la base y passerait trop tôt.
 */
async function attendreLeBalayage() {
  await screen.findByRole('button', { name: 'Compris' })
}

/** Un magasin rempli comme celui de l'organisateur après le GN du 22 août. */
async function magasinDeFred() {
  await db.personnages.bulkAdd([
    fiche('Kaelen', 6000),
    fiche('Sarielle', 5000),
    fiche('Vharos', 4000, 900_000),
    ficheEnfantRetiree('Brume', 3000, 900_001),
    fiche('Ombrelin', 2000, 900_002),
  ])
  const avant = await db.personnages.toArray()
  return new Map(avant.map((p) => [p.id as number, p.updatedAt]))
}

describe('D26 · G3 — le balayage sur un magasin rempli', () => {
  it('⭐ 2 actives + 3 retirées (dont une fiche enfant) → 5 cartes, 5 enregistrements', async () => {
    await magasinDeFred()

    afficheAccueil()
    await attendreLeBalayage()

    // Ordre inchangé : le balayage ne touche pas la clé de tri.
    expect(nomsAffiches()).toEqual(['Kaelen', 'Sarielle', 'Vharos', 'Brume', 'Ombrelin'])
    expect(await db.personnages.count()).toBe(5)
  })

  it('⭐ zéro enregistrement porte encore `retireeLe`, et la clé est RETIRÉE', async () => {
    await magasinDeFred()

    afficheAccueil()
    await attendreLeBalayage()

    const apres = await db.personnages.toArray()
    expect(apres.filter((p) => p.retireeLe !== undefined)).toEqual([])
    for (const p of apres) {
      expect(
        Object.prototype.hasOwnProperty.call(p, 'retireeLe'),
        `${p.nomPerso} porte encore la clé retireeLe`,
      ).toBe(false)
    }
  })

  it('⭐ ⛔ aucune donnée perdue : `updatedAt` inchangés à l’octet, aucune fiche orpheline', async () => {
    const avant = await magasinDeFred()

    afficheAccueil()
    await attendreLeBalayage()

    const apres = await db.personnages.toArray()
    expect(apres).toHaveLength(avant.size)
    for (const p of apres) {
      expect(avant.has(p.id as number), `fiche orpheline : ${p.nomPerso}`).toBe(true)
      expect(p.updatedAt, `updatedAt bougé sur ${p.nomPerso}`).toBe(avant.get(p.id as number))
    }
  })

  it('le balayage est idempotent : un second passage ne remonte plus rien et n’efface rien', async () => {
    await magasinDeFred()

    afficheAccueil()
    await attendreLeBalayage()
    // Le premier passage a tout remonté : la base est propre AVANT le second.
    expect((await db.personnages.toArray()).filter((p) => p.retireeLe !== undefined)).toEqual([])
    cleanup()

    afficheAccueil()
    await waitFor(() => expect(nomsAffiches()).toHaveLength(5))
    // Plus rien à remonter : le bandeau ne peut plus apparaître, ni maintenant
    // ni plus tard — et pas une fiche n'a été effacée au passage.
    expect(screen.queryByRole('button', { name: 'Compris' })).toBeNull()
    expect(await db.personnages.count()).toBe(5)
  })
})

describe('D26 · G7 — le bandeau, et son accord', () => {
  it('⭐ 3 fiches remontées : le pluriel, le bon compte, et l’explication', async () => {
    await magasinDeFred()

    afficheAccueil()

    expect(await screen.findByText('3 fiches retirées sont revenues dans ta liste.')).toBeTruthy()
    expect(
      screen.getByText(
        "La corbeille n'existe plus. « Supprimer » efface maintenant une fiche pour de bon — l'app te le demandera deux fois.",
      ),
    ).toBeTruthy()
  })

  it('⭐ une seule fiche remontée : le SINGULIER', async () => {
    await db.personnages.bulkAdd([fiche('Kaelen', 2000), fiche('Vharos', 1000, 900_000)])

    afficheAccueil()

    expect(await screen.findByText('1 fiche retirée est revenue dans ta liste.')).toBeTruthy()
    expect(screen.queryByText(/fiches retirées sont revenues/)).toBeNull()
  })

  it('⭐ jumelle : rien à remonter → AUCUN bandeau', async () => {
    await db.personnages.bulkAdd([fiche('Kaelen', 2000), fiche('Sarielle', 1000)])

    afficheAccueil()
    await waitFor(() => expect(nomsAffiches()).toEqual(['Kaelen', 'Sarielle']))

    expect(screen.queryByText(/revenue[s]? dans ta liste/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Compris' })).toBeNull()
  })

  it('« Compris » masque le bandeau, et les fiches restent en liste', async () => {
    await magasinDeFred()

    afficheAccueil()
    fireEvent.click(await screen.findByRole('button', { name: 'Compris' }))


    expect(screen.queryByText(/revenue[s]? dans ta liste/)).toBeNull()
    expect(nomsAffiches()).toHaveLength(5)
  })
})

describe('D23 · G4 — la corbeille n’existe plus (rougit sur la version d’avant)', () => {
  it('⭐ le module `src/db/retrait.ts` n’existe plus', () => {
    expect(
      existsSync(join(SRC, 'db', 'retrait.ts')),
      'src/db/retrait.ts est encore là : la corbeille survit dans le code',
    ).toBe(false)
  })

  it('⭐ l’accueil ne rend plus la section « Fiches retirées », même avec une fiche marquée', async () => {
    await db.personnages.bulkAdd([fiche('Kaelen', 2000), fiche('Vharos', 1000, 900_000)])

    afficheAccueil()
    // La fiche marquée est REVENUE dans la liste, elle n'est pas dans un tiroir.
    await waitFor(() => expect(nomsAffiches()).toEqual(['Kaelen', 'Vharos']))

    const entetesCorbeille = Array.from(document.querySelectorAll('*')).filter((n) =>
      /^Fiches retirées\s*\(/.test(n.textContent ?? ''),
    )
    expect(entetesCorbeille, 'la section « Fiches retirées » est encore rendue').toEqual([])
    expect(document.querySelector('summary')).toBeNull()
    expect(screen.queryByRole('button', { name: /remettre .* dans ma liste/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Retirer/ })).toBeNull()
  })
})
