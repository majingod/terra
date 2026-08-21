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
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../../rules/branches'
import {
  capaciteDeClasseParId,
  capacitesDeClasse,
  capacitesDisponibles,
} from '../../../rules/capacites'
import { effetAchat, listeAchats } from '../../../rules/heritage'
import { niveauMax, niveauxPossibles } from '../../../rules/niveau'
import { classeSquelette } from '../../../rules/stats'
import type { FicheCreation } from '../../../wizard/types'
import { historiqueJusquA } from '../../../wizard/__tests__/aide-fiche-complete'
import EtapeCapacites, { texteAide } from '../EtapeCapacites'
import EtapeDestin from '../EtapeDestin'
import FicheAffichage from '../FicheAffichage'
import { texteAffiche } from '../ui'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)

/** L'en-tête d'accordéon de voie qui porte `nom` (le chevron le précède). */
function accordeonDeVoie(nom: string): HTMLElement | undefined {
  return screen
    .getAllByRole('button')
    .find((el) => el.hasAttribute('aria-expanded') && (el.textContent ?? '').includes(nom))
}

function boutonVoie(nom: string): HTMLElement {
  const bouton = accordeonDeVoie(nom)
  expect(bouton, `accordéon de voie introuvable : ${nom}`).toBeTruthy()
  return bouton!
}

/** Ouvre (ou referme) l'accordéon d'une voie. */
function basculerVoie(nom: string) {
  fireEvent.click(boutonVoie(nom))
}

/** La carte d'une capacité choisissable, par son nom — accessible name ancrée au début. */
function carteCapacite(nom: string): HTMLElement {
  const carte = screen
    .getAllByRole('button')
    .find((el) => el.hasAttribute('aria-pressed') && (el.textContent ?? '').startsWith(nom))
  expect(carte, `carte de capacité introuvable : ${nom}`).toBeTruthy()
  return carte!
}

/** Le bouton (« Choisir » ou « Changer ») qui ouvre l'emplacement d'un niveau. */
function ouvrirEmplacement(niveau: number) {
  const carte = screen.getByText(`Capacité du niveau ${niveau}`).closest('.carte-choix') as HTMLElement
  const bouton =
    within(carte).queryByRole('button', { name: 'Choisir' }) ??
    within(carte).getByRole('button', { name: 'Changer' })
  fireEvent.click(bouton)
}

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

/**
 * D20 : le niveau d'une fiche vient de son HISTORIQUE (montées + 1) —
 * `niveau` est un champ d'époque, une fiche témoin qui l'écrirait mentirait.
 */
function ficheAuNiveau(niveau: number, remplie = true): FicheCreation {
  return {
    faction: classeSquelette(CLASSE)!.faction,
    classe: CLASSE,
    historique: historiqueJusquA(niveau),
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

  it('l’emplacement ouvert montre les TROIS voies (accordéons), et raye ce qui est déjà pris', () => {
    // Niveau 2, l'emplacement 1 rempli : l'emplacement 2 s'ouvre tout seul.
    const idPris = capNiveauxPanaches(2)['1']
    const fiche = { ...ficheAuNiveau(2), capNiveaux: { '1': idPris } }
    render(<EtapeCapacites fiche={fiche} onMaj={() => {}} />)
    const sections = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(sections).toEqual(VOIES.map((v) => v.nom))
    // Maquette v5 : fermées par défaut, la rayée n'apparaît qu'à l'ouverture de sa voie.
    expect(screen.queryAllByText('déjà choisie')).toEqual([])
    const voieDeLaPrise = capaciteDeClasseParId(CLASSE, idPris)!.voieNom
    basculerVoie(voieDeLaPrise)
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

  it('une capacité corrigée rend son `affichage`, pas son verbatim — une fois sa voie ouverte', () => {
    render(<EtapeCapacites fiche={ficheDernierOuvert()} onMaj={() => {}} />)
    basculerVoie(AVEC!.voieNom)
    expect(screen.getAllByText(AVEC!.affichage!).length).toBeGreaterThan(0)
    expect(screen.queryAllByText(AVEC!.verbatim)).toEqual([])
  })

  it('jumelle : une capacité sans correction rend son verbatim tel quel — une fois sa voie ouverte', () => {
    render(<EtapeCapacites fiche={ficheDernierOuvert()} onMaj={() => {}} />)
    basculerVoie(SANS!.voieNom)
    expect(screen.getAllByText(texteAffiche(SANS!)).length).toBeGreaterThan(0)
    expect(texteAffiche(SANS!)).toBe(SANS!.verbatim)
  })
})

describe('Maquette v5 ① — les accordéons de voie sont fermés par défaut', () => {
  it('au rendu d’un emplacement ouvert, aucune description de capacité n’est dans le document', () => {
    render(<EtapeCapacites fiche={ficheAuNiveau(3, false)} onMaj={() => {}} />)
    ouvrirEmplacement(3)
    for (const capacite of capacitesDeClasse(CLASSE).filter((c) => c.niveau <= 3)) {
      expect(screen.queryByText(texteAffiche(capacite)), capacite.nom).toBeNull()
    }
  })

  it('ouvrir une voie fait apparaître ses capacités, texte complet (`affichage ?? verbatim`)', () => {
    render(<EtapeCapacites fiche={ficheAuNiveau(3, false)} onMaj={() => {}} />)
    ouvrirEmplacement(3)
    const capacite = capacitesDeClasse(CLASSE).find((c) => c.niveau <= 3)!
    basculerVoie(capacite.voieNom)
    expect(screen.getByText(texteAffiche(capacite))).toBeTruthy()
    // Comparaison à la chaîne entière, jamais un extrait : aucune troncature.
    expect(screen.getByText(texteAffiche(capacite)).textContent).toBe(texteAffiche(capacite))
  })
})

describe('Maquette v5 ② — retoucher la carte choisie désélectionne', () => {
  function Controlee({ initiale }: { initiale: FicheCreation }) {
    const [fiche, setFiche] = useState(initiale)
    return <EtapeCapacites fiche={fiche} onMaj={setFiche} />
  }

  it('choisir puis retoucher la même carte : plus aucune carte choisie dans l’emplacement', () => {
    const capacite = capacitesDeClasse(CLASSE).find((c) => c.niveau === 1)!
    render(<Controlee initiale={ficheAuNiveau(1, false)} />)
    basculerVoie(capacite.voieNom)
    fireEvent.click(carteCapacite(capacite.nom))
    // Une sélection avance/referme l'emplacement (comportement existant,
    // inchangé) : le rouvrir pour retoucher le choix qu'il porte.
    ouvrirEmplacement(1)
    basculerVoie(capacite.voieNom)
    const carte = carteCapacite(capacite.nom)
    expect(carte.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(carte)
    expect(carte.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
    // La validation existante (1 choix par emplacement) fait le reste : rien
    // n'est ajouté ici pour la remplacer.
    expect(screen.getByText('Capacité du niveau 1')).toBeTruthy()
  })
})

describe('Maquette v5 ③ — la pastille de voie compte juste (scénario Bob)', () => {
  it('druide niveau 3, Liane et Rafale prises, emplacement 3 : Chaman 2, Élémentaliste 2, Clerc 3', () => {
    const capNiveaux = { '1': 'druide.chaman.1', '2': 'druide.elementaliste.2' }
    const fiche: FicheCreation = {
      faction: classeSquelette('druide')!.faction,
      classe: 'druide',
      niveau: 3,
      capNiveaux,
    }
    render(<EtapeCapacites fiche={fiche} onMaj={() => {}} />)
    // L'emplacement 3 est le premier vide : il s'ouvre tout seul.
    const attendu: [string, number][] = [
      ['Chaman', 2],
      ['Élémentaliste', 2],
      ['Clerc', 3],
    ]
    for (const [voie, n] of attendu) {
      expect(within(boutonVoie(voie)).getByText(String(n)), voie).toBeTruthy()
    }
    // Jumelle : le même compte, tiré de `capacitesDisponibles` — jamais un nombre en dur.
    for (const [voie, n] of attendu) {
      const bassin = capacitesDisponibles('druide', 3, Object.values(capNiveaux))
      expect(bassin.filter((c) => c.voieNom === voie), voie).toHaveLength(n)
    }
  })
})

describe('Maquette v5 ④ — l’indicateur de voie fermée', () => {
  function Controlee({ initiale }: { initiale: FicheCreation }) {
    const [fiche, setFiche] = useState(initiale)
    return <EtapeCapacites fiche={fiche} onMaj={setFiche} />
  }

  it('choix fait puis voie repliée : l’en-tête porte le nom de la capacité ; désélection → il disparaît', () => {
    const capacite = capacitesDeClasse(CLASSE).find((c) => c.niveau === 1)!
    render(<Controlee initiale={ficheAuNiveau(1, false)} />)
    basculerVoie(capacite.voieNom)
    fireEvent.click(carteCapacite(capacite.nom))
    // La sélection referme l'emplacement (comportement existant) : le
    // rouvrir montre la voie repliée par défaut, indicateur déjà posé.
    ouvrirEmplacement(1)
    expect(boutonVoie(capacite.voieNom).textContent).toContain(capacite.nom)

    basculerVoie(capacite.voieNom) // ouvre pour retoucher
    fireEvent.click(carteCapacite(capacite.nom)) // retouche = désélectionne
    basculerVoie(capacite.voieNom) // replie — la désélection, elle, ne referme pas l'emplacement
    expect(boutonVoie(capacite.voieNom).textContent).not.toContain(capacite.nom)
  })
})

describe('Maquette v5 ⑤ — la rayée : dans sa voie ouverte, sans description, hors pastille', () => {
  it('une capacité prise à un autre niveau est rayée, sans texte, et sort du compte de sa voie', () => {
    // Niveau 2, l'emplacement 1 rempli : l'emplacement 2 s'ouvre tout seul.
    const idPris = capNiveauxPanaches(2)['1']
    const prise = capaciteDeClasseParId(CLASSE, idPris)!
    const fiche = { ...ficheAuNiveau(2), capNiveaux: { '1': idPris } }
    render(<EtapeCapacites fiche={fiche} onMaj={() => {}} />)
    const totalVoie = capacitesDeClasse(CLASSE).filter(
      (c) => c.voieId === prise.voieId && c.niveau <= 2,
    ).length
    basculerVoie(prise.voieNom)
    // Scopé à CET accordéon : l'emplacement 1 (fermé) montre aussi sa propre
    // capacité choisie avec sa description complète — hors de propos ici.
    const accordeon = within(boutonVoie(prise.voieNom).parentElement!)
    expect(accordeon.getByText('déjà choisie')).toBeTruthy()
    expect(accordeon.queryByText(texteAffiche(prise))).toBeNull()
    expect(within(boutonVoie(prise.voieNom)).getByText(String(totalVoie - 1))).toBeTruthy()
  })
})

describe('Maquette v5 ⑥ — les achats XP : 3 cartes à plat, jamais d’étage voie', () => {
  it('un achat « +1 Capacité de niveau N » montre 3 cartes (une par voie), sans accordéon', () => {
    const achat = listeAchats().find((a) => effetAchat(a.achat).type === 'capacite')!
    const effet = effetAchat(achat.achat) as { type: 'capacite'; niveau: number }
    const fiche: FicheCreation = {
      faction: classeSquelette(CLASSE)!.faction,
      classe: CLASSE,
      niveau: niveauMax(),
      xpPerm: 99,
      achats: { [achat.achat]: 1 },
    }
    render(<EtapeDestin fiche={fiche} onMaj={() => {}} onChangement={() => {}} />)
    const bassin = capacitesDeClasse(CLASSE).filter((c) => c.niveau === effet.niveau)
    expect(bassin, 'l’invariant D16 : une capacité par niveau et par voie').toHaveLength(3)
    for (const capacite of bassin) {
      expect(screen.getAllByText(capacite.nom).length, capacite.nom).toBeGreaterThan(0)
      expect(screen.getAllByText(capacite.voieNom).length, `voie de ${capacite.nom}`).toBeGreaterThan(
        0,
      )
      expect(
        screen.getAllByText(texteAffiche(capacite)).length,
        `texte de ${capacite.nom}`,
      ).toBeGreaterThan(0)
    }
    // Pas d'étage voie : aucun accordéon pour ces trois voies.
    for (const capacite of bassin) {
      expect(accordeonDeVoie(capacite.voieNom), `accordéon parasite pour ${capacite.voieNom}`).toBeUndefined()
    }
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
    const { niveauMin } = await import('../../../rules/niveau')
    const index = ETAPES.findIndex((e) => e.id === 'capacites')
    // ⚠️ GATE MODIFIÉE PAR D20 : un brouillon est TOUJOURS au niveau de
    // création — on ne naît plus qu'au niveau 1, et on monte après. Ce que
    // cette gate garde (l'étape est câblée, pas un écran vide) est intact ;
    // seul le compte d'emplacements suit la nouvelle règle.
    await db.brouillons.put({
      id: 1,
      etape: index + 1,
      donnees: { fiche: { ...ficheAuNiveau(niveauMin(), false), historique: undefined } },
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
    const { niveauMin: bas } = await import('../../../rules/niveau')
    expect(screen.getAllByText(/^Capacité du niveau \d+$/).map((el) => el.textContent)).toEqual([
      `Capacité du niveau ${bas()}`,
    ])
    await db.brouillons.clear()
  })
})
