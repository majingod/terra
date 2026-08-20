/**
 * D16 à l'écran — l'étape « Tes capacités » et la fiche.
 *
 * ⑥ un emplacement par niveau du personnage, libellés « Capacité du niveau k » ;
 * ⑦ D14 : la description affichée est `affichage ?? verbatim` ;
 * ⑧ la fiche n'a plus de ligne d'en-tête « Voie », et chaque capacité rendue
 *    porte le nom de sa voie et son texte.
 *
 * D5/D14 : les capacités témoins sont CHOISIES dans rules.json par critère
 * (l'une porte une correction d'affichage, l'autre non), jamais nommées ici.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../../rules/branches'
import { capacitesDeClasse } from '../../../rules/capacites'
import { niveauMax, niveauxPossibles } from '../../../rules/niveau'
import { classeSquelette } from '../../../rules/stats'
import type { FicheCreation } from '../../../wizard/types'
import EtapeCapacites, { texteAide } from '../EtapeCapacites'
import FicheAffichage from '../FicheAffichage'
import { texteAffiche } from '../ui'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)

/** Une capacité par niveau, prise dans une voie DIFFÉRENTE à chaque échelon. */
function capNiveauxPanaches(niveau: number): Record<string, string> {
  const capNiveaux: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      const voie = VOIES[index % VOIES.length]
      capNiveaux[String(n)] = voie.capacites.find((c) => c.niveau === n)!.id
    })
  return capNiveaux
}

function ficheAuNiveau(niveau: number, remplie = true): FicheCreation {
  return {
    faction: classeSquelette(CLASSE)!.faction,
    classe: CLASSE,
    niveau,
    capNiveaux: remplie ? capNiveauxPanaches(niveau) : {},
  }
}

afterEach(cleanup)

describe('D16 ⑥ — un emplacement par niveau du personnage', () => {
  it('cree_au_niveau_4_rend_4_emplacements', () => {
    render(<EtapeCapacites fiche={ficheAuNiveau(4, false)} onMaj={() => {}} />)
    for (const niveau of [1, 2, 3, 4]) {
      expect(screen.getByText(`Capacité du niveau ${niveau}`)).toBeTruthy()
    }
    expect(screen.queryByText('Capacité du niveau 5')).toBeNull()
    expect(screen.getAllByText(/^Capacité du niveau \d+$/)).toHaveLength(4)
  })

  it('jumelle : le compte d’emplacements suit le niveau, échelon par échelon', () => {
    for (const niveau of niveauxPossibles()) {
      cleanup()
      render(<EtapeCapacites fiche={ficheAuNiveau(niveau, false)} onMaj={() => {}} />)
      expect(screen.getAllByText(/^Capacité du niveau \d+$/), `niveau ${niveau}`).toHaveLength(
        niveau,
      )
    }
  })

  it('le titre et l’intro sont ceux de la maquette validée', () => {
    render(<EtapeCapacites fiche={ficheAuNiveau(2, false)} onMaj={() => {}} />)
    expect(screen.getByText('Tes capacités')).toBeTruthy()
    expect(
      screen.getByText(
        "À chaque niveau, tu as choisi 1 capacité de ta classe — n'importe quelle voie, de ce niveau ou d'un niveau plus bas. Jamais deux fois la même.",
      ),
    ).toBeTruthy()
  })

  it('l’aide a TROIS formes : plusieurs échelons au-dessus, un seul, aucun', () => {
    const plafond = niveauMax()
    // ① il reste plusieurs échelons : pluriel, et l'intervalle k+1 → plafond.
    expect(texteAide(1, plafond)).toBe(
      `Ce choix-ci peut aller jusqu'au niveau 1. Les capacités de niveau 2 à ${plafond} t'attendent aux prochains niveaux.`,
    )
    // ② il n'en reste qu'un : singulier, et pas d'intervalle « 5 à 5 ».
    expect(texteAide(plafond - 1, plafond)).toBe(
      `Ce choix-ci peut aller jusqu'au niveau ${plafond - 1}. Les capacités de niveau ${plafond} t'attendent au prochain niveau.`,
    )
    expect(texteAide(plafond - 1, plafond)).not.toContain(`${plafond} à ${plafond}`)
    // ③ au dernier échelon : la première phrase, et rien d'autre.
    expect(texteAide(plafond, plafond)).toBe(
      `Ce choix-ci peut aller jusqu'au niveau ${plafond}.`,
    )
  })

  it('jumelle : aucune forme ne bégaie l’intervalle, sur tous les échelons', () => {
    const plafond = niveauMax()
    for (const niveau of niveauxPossibles()) {
      const aide = texteAide(niveau, plafond)
      expect(aide.startsWith(`Ce choix-ci peut aller jusqu'au niveau ${niveau}.`), aide).toBe(true)
      expect(aide, aide).not.toMatch(/niveau (\d+) à \1\b/)
    }
  })

  it('l’aide de l’emplacement ouvert est bien à l’écran', () => {
    render(<EtapeCapacites fiche={ficheAuNiveau(1, false)} onMaj={() => {}} />)
    expect(screen.getByText(texteAide(1, niveauMax()))).toBeTruthy()
  })

  it('l’emplacement ouvert montre les TROIS voies, et raye ce qui est déjà pris', () => {
    // Niveau 2, l'emplacement 1 rempli : l'emplacement 2 s'ouvre tout seul.
    const fiche = { ...ficheAuNiveau(2), capNiveaux: { '1': capNiveauxPanaches(2)['1'] } }
    render(<EtapeCapacites fiche={fiche} onMaj={() => {}} />)
    const sections = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(sections).toEqual(VOIES.map((v) => v.nom))
    expect(screen.getAllByText('déjà choisie')).toHaveLength(1)
  })

  it('un emplacement rempli porte « Changer »', () => {
    render(<EtapeCapacites fiche={ficheAuNiveau(2)} onMaj={() => {}} />)
    expect(screen.getAllByText('Changer').length).toBeGreaterThan(0)
  })
})

describe('D16 ⑦ — D14 à l’écran : `affichage ?? verbatim`', () => {
  const AVEC = capacitesDeClasse(CLASSE).find(
    (c) => c.affichage !== undefined && c.affichage !== c.verbatim,
  )
  const SANS = capacitesDeClasse(CLASSE).find((c) => c.affichage === undefined)

  /** Tous les échelons remplis sauf le dernier : tout l'arbre est à l'écran. */
  function ficheDernierOuvert(): FicheCreation {
    const plafond = niveauMax()
    const capNiveaux = capNiveauxPanaches(plafond)
    delete capNiveaux[String(plafond)]
    return { ...ficheAuNiveau(plafond, false), capNiveaux }
  }

  it('témoin : le fichier porte bien les deux cas pour cette classe', () => {
    expect(AVEC, 'une capacité avec correction d’affichage').toBeDefined()
    expect(SANS, 'une capacité sans correction d’affichage').toBeDefined()
  })

  it('une capacité corrigée rend son `affichage`, pas son verbatim', () => {
    render(<EtapeCapacites fiche={ficheDernierOuvert()} onMaj={() => {}} />)
    expect(screen.getAllByText(AVEC!.affichage!).length).toBeGreaterThan(0)
    expect(screen.queryAllByText(AVEC!.verbatim)).toEqual([])
  })

  it('jumelle : une capacité sans correction rend son verbatim tel quel', () => {
    render(<EtapeCapacites fiche={ficheDernierOuvert()} onMaj={() => {}} />)
    expect(screen.getAllByText(texteAffiche(SANS!)).length).toBeGreaterThan(0)
    expect(texteAffiche(SANS!)).toBe(SANS!.verbatim)
  })
})

describe('D16 ⑧ — la fiche : plus de ligne « Voie », la voie sur chaque capacité', () => {
  it('aucun libellé « Voie » en ligne d’en-tête', () => {
    render(<FicheAffichage fiche={ficheAuNiveau(3)} />)
    expect(screen.queryAllByText('Voie')).toEqual([])
    expect(screen.queryAllByText(/^Voie\b/)).toEqual([])
  })

  it('jumelle : chaque capacité rendue porte le nom de sa voie et son texte', () => {
    const fiche = ficheAuNiveau(3)
    render(<FicheAffichage fiche={fiche} />)
    const capacites = capacitesDeClasse(CLASSE).filter((c) =>
      Object.values(fiche.capNiveaux ?? {}).includes(c.id),
    )
    expect(capacites).toHaveLength(3)
    for (const capacite of capacites) {
      expect(screen.getAllByText(capacite.nom).length, capacite.nom).toBeGreaterThan(0)
      expect(screen.getAllByText(`niv ${capacite.niveau}`).length, capacite.id).toBeGreaterThan(0)
      expect(screen.getAllByText(capacite.voieNom).length, capacite.voieNom).toBeGreaterThan(0)
      expect(
        screen.getAllByText(texteAffiche(capacite)).length,
        `texte de ${capacite.nom}`,
      ).toBeGreaterThan(0)
    }
  })

  it('la section s’appelle « Capacités » et trie par niveau croissant', () => {
    const fiche = ficheAuNiveau(3)
    render(<FicheAffichage fiche={fiche} />)
    expect(screen.getByText('Capacités')).toBeTruthy()
    const rendus = screen.getAllByText(/^niv \d+$/).map((el) => Number(el.textContent!.slice(4)))
    expect(rendus).toEqual([...rendus].sort((a, b) => a - b))
  })

  it('une capacité achetée par XP porte « · achat XP »', () => {
    const achat = capacitesDeClasse(CLASSE).find(
      (c) => c.niveau === 1 && !Object.values(capNiveauxPanaches(1)).includes(c.id),
    )!
    render(<FicheAffichage fiche={{ ...ficheAuNiveau(1), capChoix: { '1': [achat.id] } }} />)
    expect(screen.getAllByText('· achat XP')).toHaveLength(1)
  })
})

describe('D16 — l’étape est bien CÂBLÉE dans le wizard', () => {
  it('un brouillon posé sur « Tes capacités » ouvre l’étape, pas un écran vide', async () => {
    const { db } = await import('../../../db')
    const { default: Creer } = await import('../../Creer')
    const { ETAPES } = await import('../../../wizard/validation')
    const { MemoryRouter } = await import('react-router-dom')
    const index = ETAPES.findIndex((e) => e.id === 'capacites')
    await db.brouillons.put({
      id: 1,
      etape: index + 1,
      donnees: { fiche: ficheAuNiveau(2, false) },
      updatedAt: 1,
    })
    render(
      <MemoryRouter>
        <Creer />
      </MemoryRouter>,
    )
    // Le titre de l'étape ET sa pastille dans le stepper portent le même mot.
    expect((await screen.findAllByText('Tes capacités')).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Tes capacités')
    expect(screen.getAllByText(/^Capacité du niveau \d+$/)).toHaveLength(2)
    await db.brouillons.clear()
  })
})
