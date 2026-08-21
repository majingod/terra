/**
 * D20 ⑥④ — une fiche d'AVANT ce lot s'ouvre en lecture seule.
 *
 * Le critère est l'ABSENCE d'historique, testée par les deux bouts : sans
 * historique → bandeau, Exporter d'abord, Supprimer, et aucune modification
 * possible ; avec historique → la fiche s'ouvre normalement et se modifie.
 *
 * ⛔ Aucune suppression au démarrage, aucune sans un geste du joueur : la gate
 * vérifie que la fiche est TOUJOURS là après le simple affichage, et qu'il
 * faut deux gestes pour l'effacer.
 *
 * ⚠️ ≤11 : une fiche enfant n'est pas une ancienne fiche — son flux n'a jamais
 * eu d'historique à porter. La jumelle du bas le garde.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { classesEnfant, factionsEnfant, niveauMinEnfant } from '../../rules/kids'
import { niveauMin, niveauxPossibles } from '../../rules/niveau'
import { trancheEnfant } from '../../wizard/validation'
import { ficheComplete } from '../../wizard/__tests__/aide-fiche-complete'
import { personnageDeLaFiche } from '../montee/__tests__/aide-montee'
import Fiche from '../Fiche'
import { BANDEAU_ANCIENNE_FICHE } from '../AncienneFiche'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const BAS = niveauMin()

function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

/** Une fiche COURANTE : elle porte son historique, elle vit. */
function ficheCourante(): Omit<Personnage, 'id'> {
  return personnageDeLaFiche(ficheComplete(CLASSE, BAS, capNiveaux(BAS), 'Bob'))
}

/** La MÊME fiche, mais d'avant D20 : tout pareil, sans historique. */
function ficheDAvant(): Omit<Personnage, 'id'> {
  const courante = ficheCourante()
  const { historique: _sansLui, ...creation } = courante.creation ?? {}
  return { ...courante, creation }
}

function afficher(id: number) {
  return render(
    <MemoryRouter initialEntries={[`/fiche/${id}`]}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = () => {}
})

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

describe('D20 ④ — sans historique : lecture seule, bandeau, deux gestes', () => {
  it('bandeau, Exporter d’abord, Supprimer — et rien qui modifie', async () => {
    const id = (await db.personnages.add(ficheDAvant() as never)) as number
    afficher(id)

    expect(await screen.findByText(BANDEAU_ANCIENNE_FICHE)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Exporter d’abord/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Supprimer$/ })).toBeTruthy()

    // ⛔ Aucune modification possible : ni montée, ni import, ni champ.
    expect(screen.queryByRole('button', { name: /^Monter au niveau/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Importer/ })).toBeNull()
    expect(document.querySelectorAll('input, textarea, select')).toHaveLength(0)

    // ⛔ Rien n'est effacé par le simple fait d'avoir ouvert la fiche.
    expect(await db.personnages.count()).toBe(1)
  })

  it('⛔ supprimer demande DEUX gestes, et le premier n’efface rien', async () => {
    const id = (await db.personnages.add(ficheDAvant() as never)) as number
    afficher(id)

    fireEvent.click(await screen.findByRole('button', { name: /^Supprimer$/ }))
    expect(await db.personnages.count(), 'le premier geste ne doit rien effacer').toBe(1)

    // Le second geste est explicite, et il est réversible jusqu'au bout.
    expect(screen.getByRole('button', { name: /^Annuler$/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Oui, supprimer/ }))
    await waitFor(async () => {
      expect(await db.personnages.count()).toBe(0)
    })
  })
})

describe('D20 ④ — jumelle : avec historique, la fiche s’ouvre et se modifie', () => {
  it('aucun bandeau, et la montée reste offerte', async () => {
    const id = (await db.personnages.add(ficheCourante() as never)) as number
    afficher(id)

    expect(await screen.findByText('Niveau')).toBeTruthy()
    expect(screen.queryByText(BANDEAU_ANCIENNE_FICHE)).toBeNull()
    expect(screen.queryByRole('button', { name: /^Supprimer$/ })).toBeNull()
    // Ce qui MODIFIE la fiche est là : c'est le bout positif du critère.
    expect(screen.getByRole('button', { name: `Monter au niveau ${BAS + 1}` })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Importer/ })).toBeTruthy()
  })

  it('⚠️ ≤11 — une fiche enfant n’est jamais une fiche d’ancienne version', async () => {
    const enfant: Omit<Personnage, 'id'> = {
      ...nouvellePersonnageVierge(),
      nomPerso: 'Petit héros',
      niveau: niveauMinEnfant(),
      trancheAge: trancheEnfant(),
      creation: {
        trancheAge: trancheEnfant(),
        enfant: {
          faction: factionsEnfant()[0].id,
          classe: classesEnfant()[0].id,
          niveau: niveauMinEnfant(),
          nom: 'Petit héros',
        },
      },
    }
    const id = (await db.personnages.add(enfant as never)) as number
    afficher(id)

    expect(await screen.findByText('Petit héros')).toBeTruthy()
    expect(screen.queryByText(BANDEAU_ANCIENNE_FICHE)).toBeNull()
    expect(screen.queryByRole('button', { name: /^Supprimer$/ })).toBeNull()
  })
})
