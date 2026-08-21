/**
 * D20 ⑥⑨ — le fil à deux étages (MAQUETTE_FIL_D20_v2).
 *
 * ⛔ Les pastilles s'ENROULENT : aucun `overflow-x` sur les rangées. Une
 * rangée qui défile cache des pastilles sans le dire — c'est précisément ce
 * que la maquette refuse.
 *
 * ⛔ Aucune media query neuve : l'enroulement s'adapte seul, du 360 px au
 * 840 px. La gate balaye les sources du fil — `@media` en CSS comme les
 * préfixes responsives de Tailwind, qui en produisent.
 *
 * Dans ce lot le fil est en AFFICHAGE SEUL : aucune pastille de niveau n'est
 * cliquable pour revenir en arrière (le retour rétroactif est le lot 2).
 */
// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { niveauMin, niveauxPossibles } from '../../../rules/niveau'
import { ETAPES } from '../../../wizard/validation'
import Fil, { PastillesNiveaux } from '../Fil'

const ICI = niveauxPossibles()[1] ?? niveauMin()
const SOURCES = ['Fil.tsx', 'Pastilles.tsx'].map((nom) =>
  join(dirname(fileURLToPath(import.meta.url)), '..', nom),
)

function afficherFil() {
  return render(
    <Fil
      etapes={ETAPES}
      valides={ETAPES.map(() => true)}
      etape={0}
      onAller={() => {}}
      barre
      ici={ICI}
    />,
  )
}

afterEach(cleanup)

describe('D20 ⑨ — les deux étages du fil', () => {
  it('« TON PERSONNAGE » puis « TES NIVEAUX », dans cet ordre', () => {
    const { container } = afficherFil()
    const texte = (container.textContent ?? '').toUpperCase()
    const personnage = texte.indexOf('TON PERSONNAGE')
    const niveaux = texte.indexOf('TES NIVEAUX')
    expect(personnage, 'étage « TON PERSONNAGE » absent').toBeGreaterThanOrEqual(0)
    expect(niveaux, 'étage « TES NIVEAUX » absent').toBeGreaterThan(personnage)
  })

  it('un étage de niveaux qui porte TOUS les échelons de la table', () => {
    afficherFil()
    const etage = screen.getByRole('navigation', { name: /tes niveaux/i })
    expect(within(etage).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      niveauxPossibles().map(String),
    )
  })

  it('les trois états de la maquette : fait · ici · pas encore atteint', () => {
    render(<PastillesNiveaux ici={ICI} />)
    const etage = screen.getByRole('navigation', { name: /tes niveaux/i })
    for (const niveau of niveauxPossibles()) {
      const attendu = niveau < ICI ? 'fait' : niveau === ICI ? 'en cours' : 'pas encore atteint'
      expect(
        within(etage).getByLabelText(`Niveau ${niveau} — ${attendu}`),
        `état attendu pour le niveau ${niveau} : ${attendu}`,
      ).toBeTruthy()
    }
  })
})

describe('D20 ⑨ — les pastilles s’enroulent, elles ne défilent pas', () => {
  it('aucune rangée du fil ne porte d’`overflow-x`', () => {
    const { container } = afficherFil()
    const rangees = [...container.querySelectorAll('ol')]
    expect(rangees.length, 'aucune rangée de pastilles trouvée').toBeGreaterThan(0)
    for (const rangee of rangees) {
      expect(
        rangee.className,
        `rangée qui défile au lieu de s’enrouler : ${rangee.className}`,
      ).not.toMatch(/overflow-x|overflow-auto|overflow-scroll/)
      expect(rangee.className, 'rangée sans enroulement').toMatch(/flex-wrap/)
    }
  })

  it('⛔ aucune media query dans les sources du fil — l’enroulement s’adapte seul', () => {
    for (const chemin of SOURCES) {
      const source = readFileSync(chemin, 'utf8')
      expect(source, `media query dans ${chemin}`).not.toMatch(/@media/)
      // Les préfixes responsives de Tailwind COMPILENT en media queries.
      expect(source, `préfixe responsive dans ${chemin}`).not.toMatch(
        /["'` ](sm|md|lg|xl|2xl):/,
      )
    }
  })
})

describe('D20 ⑨ — dans ce lot, le fil des niveaux est en affichage seul', () => {
  it('aucune pastille de niveau n’est cliquable pour revenir en arrière', () => {
    afficherFil()
    const etage = screen.getByRole('navigation', { name: /tes niveaux/i })
    expect(
      within(etage).queryAllByRole('button'),
      'le retour rétroactif est le lot 2 — rien ne se touche ici',
    ).toEqual([])
    expect(within(etage).queryAllByRole('link')).toEqual([])
  })

  it('jumelle : figé, l’étage des étapes ne se touche plus non plus', () => {
    render(
      <Fil
        etapes={ETAPES}
        valides={ETAPES.map(() => true)}
        etape={ETAPES.length - 1}
        onAller={() => {}}
        barre
        ici={ICI}
        fige
      />,
    )
    const etapes = screen.getByRole('navigation', { name: /étapes de création/i })
    for (const bouton of within(etapes).getAllByRole('button')) {
      expect((bouton as HTMLButtonElement).disabled, 'une étape reste cliquable après la création').toBe(
        true,
      )
    }
  })
})
