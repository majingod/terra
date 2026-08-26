/**
 * D20 lot 2 — GATES GL3 et GL9 : la rangée « TES NIVEAUX » sur l'écran Fiche.
 *
 * Q3 = B (t016, Fred 2026-08-26). Le geste du retour rétroactif ne vit pas
 * seulement dans le wizard : la fiche est enregistrée depuis trois jours, le MJ
 * dit « ton point du niveau 2 aurait dû aller en Puissance », et jusqu'ici le
 * seul chemin était de supprimer et de tout recommencer. La rangée vit donc
 * AUSSI ici — même geste, même fenêtre.
 *
 * ⚠️ GATE QUI ROUGIT SUR `origin/main`, PAR ASSERTION. Ce fichier n'importe
 * QUE des modules présents sur main (le harnais `afficherLaFiche` de
 * `d19-badge-datation-fiche`, repris tel quel) : sur main la rangée est
 * simplement ABSENTE, et l'assertion tombe proprement — jamais un import
 * cassé, qui ne prouverait rien.
 *
 * GL9 — les jumelles de PÉRIMÈTRE : la rangée porte `pas-a-imprimer` (la
 * feuille papier ne change pas d'un trait — Q12), le flux ≤11 n'en a jamais
 * (chez eux le niveau se déclare, il n'y a pas de montées), et ⛔ ni la
 * pastille de création, ni « ici », ni les pâles ne réagissent au toucher.
 *
 * D5 : ni le seuil d'Esprit ni les échelons ne sont écrits ici. Seuls les
 * LIBELLÉS arbitrés le sont, mot pour mot.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db, type Personnage } from '../../db'
import { classesEnfant, factionsEnfant } from '../../rules/kids'
import { niveauMin, niveauxPossibles } from '../../rules/niveau'
import { trancheEnfant } from '../../wizard/validation'
import { niveauCourant } from '../../wizard/historique'
import type { FicheCreation } from '../../wizard/types'
import { echelonsAPoint, ficheDatee, seuilDuPalier } from '../../wizard/__tests__/aide-datation'
import { personnageDeLaFiche, personnageEnfant } from '../montee/__tests__/aide-montee'
import FeuilleImpression from '../impression/FeuilleImpression'
import Fiche from '../Fiche'

const SEUIL = seuilDuPalier()
const BAS = niveauMin()
/** L'échelon de montée dont le point pousse l'Esprit au palier. */
const N = echelonsAPoint().filter((niveau) => niveau > BAS)[0]

/** Le titre de l'étage, arbitré sur la maquette (v3, validée). */
const ETAGE = 'Tes niveaux'
/** Ce qu'une pastille touchable annonce au lecteur d'écran. */
const CORRIGER = (niveau: number) => `Niveau ${niveau} — fait · corriger tes choix`

/**
 * La fiche témoin : un personnage EN COURS DE ROUTE (ni au premier échelon,
 * ni au plafond) — il a donc des pastilles faites, une « ici » et des pâles.
 */
function ficheTemoin(): FicheCreation {
  return ficheDatee({ niveau: N + 1, espritCreation: SEUIL - 1, surEsprit: [N] })
}

/** Le harnais de `d19-badge-datation-fiche`, repris tel quel. */
async function afficherLaFiche(fiche: FicheCreation): Promise<number> {
  const id = await db.personnages.add(personnageDeLaFiche(fiche) as Personnage)
  render(
    <MemoryRouter initialEntries={[`/fiche/${id}`]}>
      <Routes>
        <Route path="/fiche/:id" element={<Fiche />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Chargement…')).toBeNull())
  return id as number
}

/** La rangée de niveaux de l'écran Fiche — `null` quand il n'y en a pas. */
function rangeeDesNiveaux(): HTMLElement | null {
  return screen.queryByRole('navigation', { name: /tes niveaux/i })
}

/**
 * La rangée, ou une ASSERTION nommée si elle manque.
 *
 * ⚠️ C'est ce qui fait que cette gate rougit PROPREMENT sur `origin/main` :
 * sans cette porte, un `!` sur `null` ferait tomber un `TypeError`, et un
 * plantage ne dit pas ce qui manque.
 */
function laRangee(): HTMLElement {
  const rangee = rangeeDesNiveaux()
  expect(rangee, 'la rangée « TES NIVEAUX » est absente de l’écran Fiche').not.toBeNull()
  return rangee!
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(cleanup)

describe('D20 lot 2 · GL3 — l’écran Fiche porte la rangée « TES NIVEAUX »', () => {
  it('témoin : la fiche du test a bien traversé une montée, et n’est pas au plafond', () => {
    const fiche = ficheTemoin()
    expect(niveauCourant(fiche)).toBe(N + 1)
    expect(N).toBeGreaterThan(BAS)
    expect(niveauCourant(fiche)).toBeLessThan(niveauxPossibles()[niveauxPossibles().length - 1])
  })

  it('⭐ une fiche 12+ de niveau ≥ 2 affiche la rangée, avec TOUS les échelons de la table', async () => {
    await afficherLaFiche(ficheTemoin())
    const rangee = laRangee()
    expect(within(rangee).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      niveauxPossibles().map(String),
    )
    expect(screen.getByText(ETAGE)).toBeTruthy()
  })

  it('⭐ les montées TRAVERSÉES se touchent — et elles seules', async () => {
    const fiche = ficheTemoin()
    await afficherLaFiche(fiche)
    const rangee = laRangee()
    const ici = niveauCourant(fiche)

    const touchables = within(rangee)
      .getAllByRole('button')
      .map((bouton) => bouton.getAttribute('aria-label'))
    const attendus = niveauxPossibles()
      .filter((niveau) => niveau < ici && niveau > BAS)
      .map(CORRIGER)
    expect(touchables, 'les pastilles touchables ne sont pas les bonnes').toEqual(attendus)
    expect(attendus.length, 'la fiche témoin doit avoir au moins une montée traversée').toBeGreaterThan(0)
  })
})

describe('D20 lot 2 · GL9 — les jumelles de périmètre', () => {
  it('⛔ la pastille de la CRÉATION ne se touche pas — ce n’est pas une montée', async () => {
    await afficherLaFiche(ficheTemoin())
    const rangee = laRangee()
    expect(within(rangee).queryByLabelText(CORRIGER(BAS))).toBeNull()
    expect(within(rangee).getByLabelText(`Niveau ${BAS} — fait`).tagName).not.toBe('BUTTON')
  })

  it('⛔ « ici » et les pâles ne réagissent pas au toucher', async () => {
    const fiche = ficheTemoin()
    await afficherLaFiche(fiche)
    const rangee = laRangee()
    const ici = niveauCourant(fiche)

    expect(within(rangee).getByLabelText(`Niveau ${ici} — en cours`).tagName).not.toBe('BUTTON')
    for (const pale of niveauxPossibles().filter((niveau) => niveau > ici)) {
      expect(
        within(rangee).getByLabelText(`Niveau ${pale} — pas encore atteint`).tagName,
        `le niveau ${pale} réagit au toucher alors qu’il n’est pas atteint`,
      ).not.toBe('BUTTON')
    }
  })

  it('la rangée vit HORS de la zone d’impression', async () => {
    await afficherLaFiche(ficheTemoin())
    const rangee = laRangee()
    expect(
      rangee.closest('.pas-a-imprimer'),
      'la rangée de niveaux entrerait sur la feuille papier',
    ).not.toBeNull()
  })

  it('la feuille IMPRIMÉE n’en porte aucune trace (Q12 : elle ne change pas d’un trait)', () => {
    const html = renderToStaticMarkup(<FeuilleImpression fiche={ficheTemoin()} />)
    const texte = html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'")
    expect(texte.toUpperCase()).not.toContain(ETAGE.toUpperCase())
    expect(texte).not.toContain('corriger tes choix')
  })

  it('⚠️ ≤11 : jamais de rangée de niveaux — chez eux le niveau se déclare', async () => {
    const faction = factionsEnfant()[0]
    const classe = classesEnfant()[0]
    const fiche: FicheCreation = {
      trancheAge: trancheEnfant(),
      enfant: { faction: faction.id, classe: classe.id, niveau: 2, nom: 'Lila' },
    }
    const id = await db.personnages.add(personnageEnfant(fiche) as Personnage)
    render(
      <MemoryRouter initialEntries={[`/fiche/${id}`]}>
        <Routes>
          <Route path="/fiche/:id" element={<Fiche />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Chargement…')).toBeNull())
    expect(rangeeDesNiveaux(), 'le flux ≤11 ne porte jamais de rangée de niveaux').toBeNull()
  })
})
