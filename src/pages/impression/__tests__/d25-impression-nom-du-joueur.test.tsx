/**
 * D25 · G5 — le nom du joueur s'imprime dans SA case.
 *
 * La case « Nom du joueur » et la prop existaient déjà : ce qui manquait, c'est
 * que quelqu'un les relie. Ce test suit le champ de bout en bout — de
 * l'enregistrement à `PageImpression`, puis de la prop à la case de la feuille —
 * parce que c'est le chaînon manquant qui était le bug, pas la case.
 *
 * Vide, la case reste vide : le comportement d'avant ce lot, celui du crayon.
 *
 * ⚠️ La géométrie ne se teste pas en jsdom (c'est l'architecte qui valide les 8
 * aperçus). Ce qui se teste ici sans disposition : la valeur EST dans la bonne
 * case, et elle porte la marque qui la tient sur une seule ligne.
 *
 * ⛔ Aucun vrai nom : les valeurs viennent de `NOMS_JOUEUR_FICTIFS` (G1).
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../../db'
import { classesSquelette } from '../../../rules/stats'
import { historiqueJusquA } from '../../../wizard/__tests__/aide-fiche-complete'
import { AUTRE_NOM_JOUEUR_FICTIF, NOM_JOUEUR_FICTIF } from '../../../__tests__/aide-noms-joueur'
import FeuilleImpression from '../FeuilleImpression'
import PageImpression from '../PageImpression'
import { ficheDeCreation } from '../exemples'

const CLASSE = classesSquelette()[0]
const FICHE = ficheDeCreation(CLASSE.id)

/** L'étiquette de la case, telle qu'elle est imprimée sur le papier du terrain. */
const ETIQUETTE = 'Nom du joueur'

/**
 * La valeur imprimée dans la case portant `etiquette`.
 *
 * La feuille range chaque case en `<div class="ch">` : une ligne de valeur
 * (`l`) puis son étiquette (`e`). On retrouve donc la case PAR SON ÉTIQUETTE —
 * pas par sa position, qui est une affaire de maquette et peut bouger.
 */
function valeurDeLaCase(html: string, etiquette: string): string | undefined {
  const cases = html.match(/<div class="ch"[^>]*>.*?<\/div><\/div>/g) ?? []
  const trouvee = cases.find((bloc) => bloc.includes(`>${etiquette}</div>`))
  return trouvee?.match(/<div class="l[^"]*">(.*?)<\/div>/)?.[1]
}

function fiche(nomDuJoueur?: string): Omit<Personnage, 'id'> {
  const base: Omit<Personnage, 'id'> = {
    ...nouvellePersonnageVierge(),
    nomPerso: FICHE.nom ?? '',
    classe: CLASSE.id,
    creation: { ...FICHE, historique: FICHE.historique ?? historiqueJusquA(1) },
  }
  return nomDuJoueur === undefined ? base : { ...base, nomDuJoueur }
}

beforeEach(async () => {
  await db.personnages.clear()
  // `window.print` n'existe pas en jsdom, et la page l'appelle dès qu'elle est là.
  window.print = () => {}
  // `ResizeObserver` non plus : la mise à l'échelle de l'aperçu s'en sert. On
  // ne mesure rien ici (la géométrie se valide sur les aperçus), on rend.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

/** Enregistre la fiche et rend sa page d'impression — l'id vient de Dexie. */
async function afficheImpression(personnage: Omit<Personnage, 'id'>) {
  const id = await db.personnages.add(personnage)
  return render(
    <MemoryRouter initialEntries={[`/fiche/${id}/impression`]}>
      <Routes>
        <Route path="/fiche/:id/impression" element={<PageImpression />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

describe('D25 · G5 — la feuille rend le nom dans sa case', () => {
  it('rempli → la valeur est dans la case « Nom du joueur », et pas ailleurs', () => {
    const html = renderToStaticMarkup(
      <FeuilleImpression fiche={FICHE} nomDuJoueur={NOM_JOUEUR_FICTIF} />,
    )
    expect(valeurDeLaCase(html, ETIQUETTE)).toBe(NOM_JOUEUR_FICTIF)
    // ⛔ il ne déborde pas sur la case voisine : le nom du PERSONNAGE reste le sien.
    expect(valeurDeLaCase(html, 'Nom du Personnage')).toBe(FICHE.nom)
  })

  it('vide → la case reste vide (le comportement d’avant, au crayon)', () => {
    const html = renderToStaticMarkup(<FeuilleImpression fiche={FICHE} />)
    expect(valeurDeLaCase(html, ETIQUETTE)).toBe('')
    // La case et son étiquette sont bien là : c'est la VALEUR qui manque.
    expect(html).toContain(`>${ETIQUETTE}</div>`)
  })

  it('la valeur tient sur UNE ligne — la seconde garde du débordement A4', () => {
    const html = renderToStaticMarkup(
      <FeuilleImpression fiche={FICHE} nomDuJoueur={NOM_JOUEUR_FICTIF} />,
    )
    const bloc = (html.match(/<div class="ch"[^>]*>.*?<\/div><\/div>/g) ?? []).find((b) =>
      b.includes(`>${ETIQUETTE}</div>`),
    )
    expect(bloc, 'case « Nom du joueur » introuvable').toBeTruthy()
    expect(bloc).toContain('class="l une-ligne"')
  })
})

describe('D25 · G5 — la page d’impression transmet le champ', () => {
  it('la feuille pré-remplie porte le nom du joueur de la fiche', async () => {
    await afficheImpression(fiche(AUTRE_NOM_JOUEUR_FICTIF))
    await waitFor(() => expect(screen.queryByText(AUTRE_NOM_JOUEUR_FICTIF)).not.toBeNull())
  })

  it('une fiche sans nom de joueur imprime la case vide', async () => {
    const { container } = await afficheImpression(fiche())
    await waitFor(() => expect(container.querySelector('.tm-feuille')).not.toBeNull())
    const case_ = container.querySelector('.ident .l.une-ligne')
    expect(case_, 'la case « Nom du joueur » doit exister même vide').not.toBeNull()
    expect(case_?.textContent).toBe('')
  })
})
