/**
 * t017 · GATES A — le MODE SOLEIL (Q20 A, Fred 2026-08-26).
 *
 * Retour terrain du 22 août : au GN, en plein soleil, l'écran sombre était
 * illisible. Le mode soleil est un SECOND BLOC DE JETONS sous `html.soleil` —
 * mêmes clés, autres valeurs — et rien d'autre : aucune classe de composant ne
 * choisit sa couleur à la main.
 *
 * ⚠️ GATE QUI ROUGIT SUR `origin/main`, PAR ASSERTION pour A-G1 (le bloc
 * `html.soleil` n'y est pas : « aucun bloc html.soleil dans les jetons »). Les
 * autres importent `../mode`, qui naît avec ce lot.
 *
 * A-G1 est le cœur : le contraste ne se juge pas à l'œil sur une capture, il se
 * MESURE. Le test relit le vrai fichier de jetons, convertit chaque oklch en
 * sRGB linéaire (formule Björn Ottosson, matrices standard), en tire la
 * luminance relative puis le ratio WCAG, et refuse le lot si un seuil tombe.
 *
 * ⛔ Si un ratio passe sous son seuil, ce n'est pas au test de bouger : c'est le
 * jeton qui est faux, et c'est Fred qui arbitre une valeur.
 */
// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { classesSquelette } from '../../rules/stats'
import FeuilleImpression from '../../pages/impression/FeuilleImpression'
import { ficheDeCreation } from '../../pages/impression/exemples'
import { CLASSE_SOLEIL, CLE_MODE, basculerMode, lireMode, poserMode } from '../mode'
import Layout from '../../components/Layout'
import { MemoryRouter } from 'react-router-dom'

const RACINE = dirname(fileURLToPath(import.meta.url))
const CSS = readFileSync(join(RACINE, '..', 'terra-mortis-tokens.css'), 'utf8')

// ---------------------------------------------------------------------------
// oklch → sRGB linéaire → luminance relative → ratio WCAG
// ---------------------------------------------------------------------------

/** Les jetons d'un bloc, lus du VRAI fichier : `--nom: L C H;`. */
function jetonsDuBloc(selecteur: string): Record<string, string> {
  const debut = CSS.indexOf(`${selecteur} {`)
  expect(debut, `aucun bloc ${selecteur} dans les jetons`).toBeGreaterThanOrEqual(0)
  const corps = CSS.slice(debut, CSS.indexOf('}', debut))
  const jetons: Record<string, string> = {}
  for (const [, nom, valeur] of corps.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    jetons[nom] = valeur.trim()
  }
  return jetons
}

/** Le triplet oklch d'un jeton, converti en sRGB LINÉAIRE (Ottosson). */
function sRGBLineaire(triplet: string): [number, number, number] {
  const [L, C, H] = triplet.split(/\s+/).map(Number)
  const angle = (H * Math.PI) / 180
  const a = C * Math.cos(angle)
  const b = C * Math.sin(angle)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const canaux: [number, number, number] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  // Hors gamut : on ramène dans [0, 1], comme le fait l'écran.
  return canaux.map((v) => Math.min(1, Math.max(0, v))) as [number, number, number]
}

/** Luminance relative WCAG, sur les canaux linéaires. */
function luminance(triplet: string): number {
  const [r, g, b] = sRGBLineaire(triplet)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Le ratio de contraste WCAG entre deux jetons. */
function ratio(jetons: Record<string, string>, avant: string, arriere: string): number {
  const a = luminance(jetons[avant])
  const b = luminance(jetons[arriere])
  const [haut, bas] = a > b ? [a, b] : [b, a]
  return (haut + 0.05) / (bas + 0.05)
}

/** Les paires exigées DANS LES DEUX MODES. */
const PAIRES_COMMUNES: Array<[string, string, number]> = [
  ['foreground', 'background', 4.5],
  ['foreground', 'card', 4.5],
  ['muted-foreground', 'background', 4.5],
  ['muted-foreground', 'card', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['secondary-foreground', 'secondary', 4.5],
  ['gold', 'card', 3],
  ['legion-texte', 'card', 3],
  ['sanctum-texte', 'card', 3],
]

describe('t017 · A-G1 — le contraste des deux blocs de jetons se MESURE', () => {
  for (const selecteur of [':root', 'html.soleil']) {
    it(`${selecteur} : chaque paire de texte tient son seuil WCAG`, () => {
      const jetons = jetonsDuBloc(selecteur)
      for (const [avant, arriere, seuil] of PAIRES_COMMUNES) {
        expect(jetons[avant], `jeton manquant : --${avant} (${selecteur})`).toBeTruthy()
        expect(jetons[arriere], `jeton manquant : --${arriere} (${selecteur})`).toBeTruthy()
        const mesure = ratio(jetons, avant, arriere)
        expect(
          mesure,
          `${selecteur} — ${avant}/${arriere} = ${mesure.toFixed(2)} (seuil ${seuil})`,
        ).toBeGreaterThanOrEqual(seuil)
      }
    })
  }

  it('html.soleil : la bordure se voit sur le fond (≥ 3)', () => {
    // ⛔ EN SOLEIL SEULEMENT. Le sombre est à 1,39 aujourd'hui : ce lot ne
    // re-spécifie pas la bordure du thème d'origine — il n'y touche pas.
    const jetons = jetonsDuBloc('html.soleil')
    const mesure = ratio(jetons, 'border', 'background')
    expect(mesure, `border/background = ${mesure.toFixed(2)} (seuil 3)`).toBeGreaterThanOrEqual(3)
  })

  it('les deux blocs portent EXACTEMENT les mêmes clés de couleur', () => {
    // Le mode soleil n'ajoute pas de jeton et n'en oublie aucun : sinon un
    // écran tomberait sur la valeur sombre d'une clé restée en arrière.
    // `--radius` et les `--chart-*` ne sont pas des couleurs re-spécifiées.
    const couleurs = (bloc: Record<string, string>) =>
      Object.keys(bloc)
        .filter((nom) => nom !== 'radius' && !nom.startsWith('chart-'))
        .sort()
    expect(couleurs(jetonsDuBloc('html.soleil'))).toEqual(couleurs(jetonsDuBloc(':root')))
  })
})

describe('t017 · A-G2 — le mode se lit, se pose, se bascule et se souvient', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove(CLASSE_SOLEIL)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove(CLASSE_SOLEIL)
  })

  it('sans clé, le mode est SOMBRE — l’identité visuelle est le défaut (D11)', () => {
    expect(lireMode()).toBe('sombre')
  })

  it('une clé illisible retombe sur sombre, elle n’invente pas un mode', () => {
    localStorage.setItem(CLE_MODE, 'crépuscule')
    expect(lireMode()).toBe('sombre')
  })

  it('poser « soleil » écrit la clé ET pose la classe sur <html>', () => {
    poserMode('soleil')
    expect(localStorage.getItem(CLE_MODE)).toBe('soleil')
    expect(document.documentElement.classList.contains(CLASSE_SOLEIL)).toBe(true)
    poserMode('sombre')
    expect(localStorage.getItem(CLE_MODE)).toBe('sombre')
    expect(document.documentElement.classList.contains(CLASSE_SOLEIL)).toBe(false)
  })

  it('basculer deux fois revient EXACTEMENT au point de départ', () => {
    expect(basculerMode()).toBe('soleil')
    expect(document.documentElement.classList.contains(CLASSE_SOLEIL)).toBe(true)
    expect(basculerMode()).toBe('sombre')
    expect(document.documentElement.classList.contains(CLASSE_SOLEIL)).toBe(false)
    expect(lireMode()).toBe('sombre')
  })

  it('un navigateur qui REFUSE le stockage ne plante pas — il reste sombre', () => {
    const refus = () => {
      throw new Error('stockage refusé (mode privé strict)')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refus)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refus)

    expect(lireMode()).toBe('sombre')
    // …et la bascule bascule quand même, le temps de la session.
    expect(() => poserMode('soleil')).not.toThrow()
    expect(document.documentElement.classList.contains(CLASSE_SOLEIL)).toBe(true)
    expect(basculerMode()).toBe('sombre')
    expect(document.documentElement.classList.contains(CLASSE_SOLEIL)).toBe(false)
  })
})

describe('t017 · A-G3 (jumelle) — la bascule de l’en-tête nomme ce qu’elle FAIT', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove(CLASSE_SOLEIL)
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.classList.remove(CLASSE_SOLEIL)
  })

  /** Le bouton de bascule — retrouvé par son `aria-label`, jamais par sa place. */
  function bascule(): HTMLElement {
    return screen.getByRole('button', { name: 'Mode soleil' })
  }

  function afficherLayout() {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )
  }

  it('en sombre elle propose « Soleil » ; touchée, elle propose « Sombre »', () => {
    afficherLayout()
    expect(bascule().textContent).toContain('Soleil')
    expect(bascule().getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(bascule())
    expect(bascule().textContent).toContain('Sombre')
    expect(bascule().getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.classList.contains(CLASSE_SOLEIL)).toBe(true)
    expect(localStorage.getItem(CLE_MODE)).toBe('soleil')
  })

  it('⛔ elle porte `pas-a-imprimer` : un bouton d’app ne s’imprime jamais', () => {
    afficherLayout()
    expect(bascule().className).toContain('pas-a-imprimer')
  })
})

describe('t017 · A-G4 — la feuille IMPRIMÉE ne dépend pas du mode', () => {
  afterEach(() => {
    document.documentElement.classList.remove(CLASSE_SOLEIL)
  })

  it('le même HTML à l’octet, avec et sans `html.soleil`', () => {
    // D27-quater : si ça diffère, c'est qu'un composant d'impression hérite
    // une couleur de l'écran — la feuille papier ne doit rien en savoir.
    const fiche = ficheDeCreation(classesSquelette()[0].id)

    document.documentElement.classList.remove(CLASSE_SOLEIL)
    const enSombre = renderToStaticMarkup(<FeuilleImpression fiche={fiche} />)
    document.documentElement.classList.add(CLASSE_SOLEIL)
    const enSoleil = renderToStaticMarkup(<FeuilleImpression fiche={fiche} />)

    expect(enSoleil.length, 'la feuille témoin est vide : le test ne prouve rien').toBeGreaterThan(
      0,
    )
    expect(enSoleil).toBe(enSombre)
  })
})
