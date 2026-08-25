/**
 * Les gestes de l'encyclopédie D9-ter, tels que la maquette v3.1 les montre :
 * chercher, tout ouvrir, épingler, suivre un lien croisé, grossir le texte.
 *
 * ⛔ Aucune phrase du Tome n'est écrite ici : chaque témoin est tiré du modèle
 * au moment du test.
 */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { texteAffiche } from '../../pages/creation/ui'
import Encyclopedie, { SECTIONS } from '../../pages/Encyclopedie'
import { CLE_EPINGLES, CLE_TAILLE, CRANS_DE_TAILLE } from '../epingles'
import {
  compteDe,
  entreesDe,
  ongletsDeContenu,
  sousEntrees,
  type OngletId,
} from '../modele'

const ONGLETS = ongletsDeContenu()

beforeEach(() => {
  localStorage.clear()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)

function allerA(id: OngletId | 'epingles') {
  const nom = SECTIONS.find((s) => s.id === id)!.nom
  const barre = screen.getByRole('navigation', { name: /sections/i })
  fireEvent.click(within(barre).getByRole('button', { name: new RegExp(nom.replace('&', '&')) }))
}

function chip(id: OngletId | 'epingles'): HTMLElement {
  const barre = screen.getByRole('navigation', { name: /sections/i })
  const rang = SECTIONS.findIndex((s) => s.id === id)
  return within(barre).getAllByRole('button')[rang]
}

function ouvrirAccordeon(titre: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${titre}`) }))
}

describe('recherche', () => {
  it('dès deux caractères, elle filtre l’onglet actif et ouvre ce qui correspond', () => {
    render(<Encyclopedie />)
    allerA('dons')
    const dons = entreesDe(ONGLETS.find((o) => o.id === 'dons')!)
    const cible = dons[0]
    const autre = dons[dons.length - 1]

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: cible.titre } })
    expect(screen.queryByText(cible.titre)).not.toBeNull()
    expect(screen.queryByText(autre.titre)).toBeNull()
    // Ouvert : le corps de l'entrée trouvée est à l'écran.
    const corps = cible.blocs.find((bloc) => bloc.genre === 'texte')!
    const temoin = texteAffiche(corps.source).slice(0, 40)
    expect(document.body.textContent).toContain(temoin)
  })

  it('un seul caractère ne filtre pas', () => {
    render(<Encyclopedie />)
    allerA('dons')
    const dons = entreesDe(ONGLETS.find((o) => o.id === 'dons')!)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: dons[0].titre[0] } })
    for (const don of dons) expect(screen.queryByText(don.titre), don.id).not.toBeNull()
  })

  it('elle filtre aussi les sous-accordéons', () => {
    render(<Encyclopedie />)
    allerA('classes')
    const classes = entreesDe(ONGLETS.find((o) => o.id === 'classes')!)
    const voies = sousEntrees(classes[0])
    expect(voies.length).toBeGreaterThan(1)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: voies[0].titre } })
    expect(screen.queryByText(voies[0].titre)).not.toBeNull()
    expect(screen.queryByText(voies[1].titre)).toBeNull()
  })

  it('sans correspondance, elle le dit', () => {
    render(<Encyclopedie />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzqxw' } })
    expect(screen.getByText(/rien ne correspond/i)).toBeTruthy()
  })
})

describe('retour en haut', () => {
  it('le bouton n’apparaît qu’après un long défilement', () => {
    render(<Encyclopedie />)
    expect(screen.queryByRole('button', { name: /retour en haut/i })).toBeNull()
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true })
    fireEvent.scroll(window)
    const bouton = screen.getByRole('button', { name: /retour en haut/i })
    fireEvent.click(bouton)
    expect(window.scrollTo).toHaveBeenCalled()
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    fireEvent.scroll(window)
    expect(screen.queryByRole('button', { name: /retour en haut/i })).toBeNull()
  })
})

describe('tout ouvrir / tout fermer', () => {
  it('le groupe s’ouvre en entier, puis se referme', () => {
    render(<Encyclopedie />)
    allerA('dons')
    const dons = entreesDe(ONGLETS.find((o) => o.id === 'dons')!)
    const bouton = screen.getByRole('button', { name: /tout ouvrir/i })
    fireEvent.click(bouton)
    for (const don of dons) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${don.titre}`) }).getAttribute('aria-expanded'),
      ).toBe('true')
    }
    fireEvent.click(screen.getByRole('button', { name: /tout fermer/i }))
    for (const don of dons) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${don.titre}`) }).getAttribute('aria-expanded'),
      ).toBe('false')
    }
  })
})

describe('épinglage', () => {
  it('la ☆ bascule, compte, persiste et remplit l’onglet Épinglés', () => {
    render(<Encyclopedie />)
    const premier = entreesDe(ONGLETS[0])[0]
    expect(chip('epingles').textContent).toMatch(/0\s*$/)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`épingler : ${premier.id}`, 'i') }))
    expect(chip('epingles').textContent).toMatch(/1\s*$/)
    expect(JSON.parse(localStorage.getItem(CLE_EPINGLES)!)).toEqual([premier.id])

    allerA('epingles')
    expect(screen.getAllByRole('button', { name: new RegExp(`^${premier.titre}`) }).length).toBe(1)

    // Rebascule : la liste se vide, le message d'état vide revient.
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`retirer des épinglés : ${premier.id}`, 'i') }),
    )
    expect(JSON.parse(localStorage.getItem(CLE_EPINGLES)!)).toEqual([])
    expect(screen.getByText(/touche l’étoile/i)).toBeTruthy()
  })

  it('les épinglés se relisent au chargement, dans leur ordre d’épinglage', () => {
    const entrees = entreesDe(ONGLETS[0])
    const ordre = [entrees[2].id, entrees[0].id]
    localStorage.setItem(CLE_EPINGLES, JSON.stringify(ordre))
    render(<Encyclopedie />)
    expect(chip('epingles').textContent).toMatch(/2\s*$/)
    allerA('epingles')
    const titres = [entrees[2].titre, entrees[0].titre]
    const rendus = screen
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
      .filter((t) => titres.some((titre) => t.startsWith(titre)))
    expect(rendus[0].startsWith(titres[0])).toBe(true)
  })

  it('une carte s’épingle aussi', () => {
    render(<Encyclopedie />)
    allerA('classes')
    const classe = entreesDe(ONGLETS.find((o) => o.id === 'classes')!)[0]
    ouvrirAccordeon(classe.titre)
    const etoiles = screen.getAllByRole('button', { name: /^épingler : capacite:/i })
    expect(etoiles.length).toBeGreaterThan(0)
    fireEvent.click(etoiles[0])
    expect(JSON.parse(localStorage.getItem(CLE_EPINGLES)!)[0]).toMatch(/^capacite:/)
  })

  it('un stockage illisible ne casse rien', () => {
    localStorage.setItem(CLE_EPINGLES, 'ceci n’est pas du JSON')
    render(<Encyclopedie />)
    expect(chip('epingles').textContent).toMatch(/0\s*$/)
  })
})

describe('liens croisés', () => {
  it('toucher un lien ouvre l’onglet et l’accordéon visés', () => {
    const { container } = render(<Encyclopedie />)
    allerA('classes')
    fireEvent.click(screen.getAllByRole('button', { name: /tout ouvrir/i })[0])
    const liens = container.querySelectorAll('.lien-croise')
    expect(liens.length).toBeGreaterThan(0)
    const texteDuLien = liens[0].textContent!
    fireEvent.click(liens[0])
    // L'onglet visé est actif, et une entrée dont le titre porte ce mot est ouverte.
    const ouverts = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-expanded') === 'true')
    expect(
      ouverts.some((b) => (b.textContent ?? '').toLowerCase().includes(texteDuLien.toLowerCase())),
    ).toBe(true)
  })

  it('au plus un lien par corps d’accordéon', () => {
    const { container } = render(<Encyclopedie />)
    fireEvent.click(screen.getAllByRole('button', { name: /tout ouvrir/i })[0])
    for (const corps of container.querySelectorAll('.acc-corps')) {
      // Les sous-accordéons portent leur propre corps : on ne compte que le sien.
      const propres = [...corps.querySelectorAll('.lien-croise')].filter(
        (lien) => lien.closest('.acc-corps') === corps,
      )
      expect(propres.length).toBeLessThanOrEqual(1)
    }
  })

  it('jamais un lien vers sa propre section', () => {
    const { container } = render(<Encyclopedie />)
    fireEvent.click(screen.getAllByRole('button', { name: /tout ouvrir/i })[0])
    for (const lien of container.querySelectorAll('.lien-croise')) {
      const accordeon = lien.closest('.acc')!
      expect((accordeon.querySelector('.acc-tete')?.textContent ?? '').trim()).not.toBe(
        lien.textContent,
      )
    }
  })
})

describe('taille du texte', () => {
  it('trois crans, mémorisés', () => {
    const { container } = render(<Encyclopedie />)
    const cadre = container.firstElementChild as HTMLElement
    expect(cadre.style.fontSize).toBe(CRANS_DE_TAILLE[1])
    fireEvent.click(screen.getByRole('button', { name: /taille du texte/i }))
    expect(cadre.style.fontSize).toBe(CRANS_DE_TAILLE[2])
    expect(localStorage.getItem(CLE_TAILLE)).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: /taille du texte/i }))
    expect(cadre.style.fontSize).toBe(CRANS_DE_TAILLE[0])
  })

  it('le cran mémorisé est repris au chargement', () => {
    localStorage.setItem(CLE_TAILLE, '0')
    const { container } = render(<Encyclopedie />)
    expect((container.firstElementChild as HTMLElement).style.fontSize).toBe(CRANS_DE_TAILLE[0])
  })
})

describe('compteurs', () => {
  it('chaque onglet de contenu affiche le compte de ses entrées', () => {
    render(<Encyclopedie />)
    for (const onglet of ONGLETS) {
      expect(chip(onglet.id).textContent, onglet.id).toMatch(
        new RegExp(`${compteDe(onglet)}\\s*$`),
      )
    }
  })
})
