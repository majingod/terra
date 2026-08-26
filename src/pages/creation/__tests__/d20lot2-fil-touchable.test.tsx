/**
 * D20 lot 2 · C3 — l'étage « TES NIVEAUX » du fil devient TOUCHABLE, dans le
 * wizard comme sur la fiche (Q3 = B, t016).
 *
 * ⛔ Le geste est OPT-IN : sans `onCorriger`, l'étage reste exactement ce qu'il
 * était au lot 1 — un affichage seul. C'est l'appelant qui ouvre la porte,
 * jamais la rangée toute seule. La gate du lot 1 (`d20-fil`) reste donc verte
 * telle quelle, et cette gate-ci garde l'autre moitié du contrat.
 *
 * ⛔ Ligne de coupe 1 : seules les MONTÉES traversées se touchent. La pastille
 * du premier échelon de la table n'en est pas une — c'est la création, et ses
 * choix se corrigent par l'étage « TON PERSONNAGE ». « Ici » et les pâles non
 * plus : les pâles se montent par le bouton de montée, comme aujourd'hui.
 *
 * ⛔ Les pastilles s'ENROULENT toujours, et aucune media query n'entre : le
 * lot 1 l'exigeait, le lot 2 ne le desserre pas.
 *
 * D5 : les échelons viennent de la table d'évolution, jamais d'un 1..5 écrit ici.
 */
// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { niveauMin, niveauxPossibles } from '../../../rules/niveau'
import { ETAPES } from '../../../wizard/validation'
import Fil, { PastillesNiveaux, libelleCorrigerLeNiveau } from '../Fil'

const BAS = niveauMin()
/** Un « ici » qui laisse au moins une montée traversée ET une pastille pâle. */
const ICI = niveauxPossibles()[2] ?? niveauxPossibles()[niveauxPossibles().length - 1]
const SOURCE = join(dirname(fileURLToPath(import.meta.url)), '..', 'Fil.tsx')

function etage(): HTMLElement {
  return screen.getByRole('navigation', { name: /tes niveaux/i })
}

afterEach(cleanup)

describe('D20 lot 2 · C3 — sans le geste, l’étage reste en affichage seul', () => {
  it('témoin : la fiche témoin a bien des faits, un « ici » et des pâles', () => {
    expect(niveauxPossibles().filter((niveau) => niveau < ICI).length).toBeGreaterThan(1)
    expect(niveauxPossibles().filter((niveau) => niveau > ICI).length).toBeGreaterThan(0)
  })

  it('⛔ sans `onCorriger`, aucune pastille ne se touche — le lot 1, intact', () => {
    render(<PastillesNiveaux ici={ICI} />)
    expect(within(etage()).queryAllByRole('button')).toEqual([])
    expect(within(etage()).queryAllByRole('link')).toEqual([])
  })
})

describe('D20 lot 2 · C3 — avec le geste, les MONTÉES traversées se touchent', () => {
  it('⭐ les touchables sont exactement les niveaux traversés au-dessus de la création', () => {
    render(<PastillesNiveaux ici={ICI} onCorriger={() => {}} />)
    const attendus = niveauxPossibles()
      .filter((niveau) => niveau < ICI && niveau > BAS)
      .map(libelleCorrigerLeNiveau)
    expect(
      within(etage())
        .getAllByRole('button')
        .map((bouton) => bouton.getAttribute('aria-label')),
    ).toEqual(attendus)
    expect(attendus.length).toBeGreaterThan(0)
  })

  it('⭐ toucher une pastille rend SON niveau, jamais un autre', () => {
    const touche = vi.fn()
    render(<PastillesNiveaux ici={ICI} onCorriger={touche} />)
    const cible = niveauxPossibles().filter((niveau) => niveau < ICI && niveau > BAS)[0]
    fireEvent.click(screen.getByLabelText(libelleCorrigerLeNiveau(cible)))
    expect(touche).toHaveBeenCalledTimes(1)
    expect(touche).toHaveBeenCalledWith(cible)
  })

  it('⛔ la création, « ici » et les pâles ne réagissent pas au toucher', () => {
    render(<PastillesNiveaux ici={ICI} onCorriger={() => {}} />)
    const rangee = etage()
    expect(within(rangee).getByLabelText(`Niveau ${BAS} — fait`).tagName).not.toBe('BUTTON')
    expect(within(rangee).getByLabelText(`Niveau ${ICI} — en cours`).tagName).not.toBe('BUTTON')
    for (const pale of niveauxPossibles().filter((niveau) => niveau > ICI)) {
      expect(within(rangee).getByLabelText(`Niveau ${pale} — pas encore atteint`).tagName).not.toBe(
        'BUTTON',
      )
    }
  })

  it('le fil entier passe le geste à son étage de niveaux', () => {
    const touche = vi.fn()
    render(
      <Fil
        etapes={ETAPES}
        valides={ETAPES.map(() => true)}
        etape={0}
        onAller={() => {}}
        barre
        ici={ICI}
        onCorrigerLeNiveau={touche}
      />,
    )
    const cible = niveauxPossibles().filter((niveau) => niveau < ICI && niveau > BAS)[0]
    fireEvent.click(screen.getByLabelText(libelleCorrigerLeNiveau(cible)))
    expect(touche).toHaveBeenCalledWith(cible)
  })
})

describe('D20 lot 2 · C3 — le lot 1 ne se desserre pas', () => {
  it('⛔ la rangée s’enroule toujours : aucun `overflow-x`, même touchable', () => {
    const { container } = render(<PastillesNiveaux ici={ICI} onCorriger={() => {}} />)
    const rangee = container.querySelector('ol')!
    expect(rangee.className).not.toMatch(/overflow-x|overflow-auto|overflow-scroll/)
    expect(rangee.className).toMatch(/flex-wrap/)
  })

  it('⛔ aucune media query neuve dans la source du fil', () => {
    const source = readFileSync(SOURCE, 'utf8')
    expect(source).not.toMatch(/@media/)
    // Les préfixes responsives de Tailwind COMPILENT en media queries.
    expect(source).not.toMatch(/["'` ](sm|md|lg|xl|2xl):/)
  })

  it('⛔ l’en-tête du fil ne promet plus « le retour rétroactif est le lot 2 »', () => {
    const source = readFileSync(SOURCE, 'utf8')
    const entete = source.slice(0, source.indexOf('*/'))
    // ⚠️ La PROMESSE, pas le nom du lot : l'en-tête a le droit de dire d'où
    // vient le geste, pas de le renvoyer à un lot qui reste à venir.
    expect(
      entete,
      'l’en-tête renvoie encore le geste à un lot à venir — il est ici, maintenant',
    ).not.toMatch(/(sont|est) le lot 2/)
    // …et il dit ce que l'étage fait DÉSORMAIS — l'affichage seul n'y reste
    // mentionné que comme le cas où l'appelant n'ouvre pas le geste.
    expect(entete).toMatch(/rétroactif/i)
    expect(entete).toMatch(/onCorriger/)
  })
})
