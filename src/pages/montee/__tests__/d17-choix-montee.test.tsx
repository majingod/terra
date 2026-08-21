/**
 * D17 ③ ④ ⑦ — l'écran de montée : ce qu'il demande, et ce qu'il refuse.
 *
 * ③ « Confirmer » reste éteint tant qu'un gain n'a pas son choix — un jeton
 *   de caractéristique ET une capacité pour l'échelon qui donne un point ; un
 *   don ET une capacité pour celui qui donne un don. Le bassin de capacités
 *   vient de `capacitesDisponibles` (D16), il n'est pas réimplémenté.
 * ④ Le jeton d'une caractéristique déjà au maximum est indisponible — le
 *   maximum est lu des données, jamais écrit ici.
 * ⑦ Une capacité déjà prise (choix de niveau OU achat XP) n'apparaît pas
 *   dans le bassin de la montée.
 *
 * D5 : les échelons témoins sont CHOISIS dans la table d'évolution par
 * critère (celui qui donne un point de caractéristique, celui qui donne un
 * don) — jamais nommés par un chiffre écrit ici.
 */
// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../../rules/branches'
import { capacitesDeClasse, capacitesDisponibles } from '../../../rules/capacites'
import { effetAchat, listeAchats } from '../../../rules/heritage'
import { getRules } from '../../../rules/load'
import { niveauMin, niveauxPossibles, tableEvolution } from '../../../rules/niveau'
import { libelleCarteCapacite, libelleConfirmer } from '../../../wizard/montee'
import type { FicheCreation } from '../../../wizard/types'
import { ficheComplete } from '../../../wizard/__tests__/aide-fiche-complete'
import EcranMontee from '../EcranMontee'
import { personnageDeLaFiche } from './aide-montee'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const MAX_CARAC = getRules().caracteristiques.creation.max

/** L'échelon de montée qui donne un point de caractéristique (le plus haut). */
const VERS_CARAC = tableEvolution()
  .filter((ligne) => ligne.niv > niveauMin() && (ligne.carac_points ?? 0) > 0)
  .map((ligne) => ligne.niv)
  .pop()!
/** L'échelon de montée qui donne un don (le plus bas au-dessus du niveau 1). */
const VERS_DON = tableEvolution()
  .filter((ligne) => ligne.niv > niveauMin() && (ligne.dons ?? 0) > 0)
  .map((ligne) => ligne.niv)[0]

function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

function personnageAuNiveau(niveau: number, retouche: Partial<FicheCreation> = {}) {
  const fiche = { ...ficheComplete(CLASSE, niveau, capNiveaux(niveau), 'Bob'), ...retouche }
  return { ...personnageDeLaFiche(fiche), id: 1 }
}

function afficher(niveau: number, retouche: Partial<FicheCreation> = {}) {
  render(
    <EcranMontee
      personnage={personnageAuNiveau(niveau, retouche)}
      niveauAtteint={niveau + 1}
      onConfirmer={() => {}}
      onAnnuler={() => {}}
    />,
  )
}

/** La carte de gain qui porte ce titre. */
function carteDeGain(titre: string): HTMLElement {
  return screen.getByRole('heading', { name: titre }).parentElement as HTMLElement
}

/** Les boutons « choisissables » d'une carte (ceux qui portent aria-pressed). */
function choisissables(carte: HTMLElement): HTMLElement[] {
  return within(carte)
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-pressed'))
}

function boutonConfirmer(niveauAtteint: number): HTMLButtonElement {
  return screen.getByRole('button', { name: libelleConfirmer(niveauAtteint) }) as HTMLButtonElement
}

/** Ouvre les trois accordéons de voie de la carte de capacité. */
function ouvrirLesVoies(carte: HTMLElement) {
  for (const voie of VOIES) {
    const entete = within(carte)
      .getAllByRole('button')
      .find((el) => el.hasAttribute('aria-expanded') && (el.textContent ?? '').includes(voie.nom))
    if (entete) fireEvent.click(entete)
  }
}

/** Choisit une capacité par son nom, sa voie ouverte au passage. */
function choisirCapacite(niveauAtteint: number, nom: string) {
  const carte = carteDeGain(libelleCarteCapacite(niveauAtteint))
  ouvrirLesVoies(carte)
  const bouton = choisissables(carte).find((el) => (el.textContent ?? '').startsWith(nom))
  expect(bouton, `carte de capacité introuvable : ${nom}`).toBeTruthy()
  fireEvent.click(bouton!)
}

beforeAll(() => {
  // jsdom ne l'implémente pas ; la carte de choix s'en sert au clic.
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('D17 ③ — Confirmer reste éteint tant qu’un gain n’a pas son choix', () => {
  const niveau = VERS_CARAC - 1
  const atteint = VERS_CARAC
  const titreCarac = '+1 point de caractéristique'

  it('témoin : cet échelon donne bien un point de caractéristique, pas un don', () => {
    const ligne = tableEvolution().find((l) => l.niv === atteint)!
    expect(ligne.carac_points ?? 0).toBeGreaterThan(0)
    expect(ligne.dons ?? 0).toBe(0)
  })

  it('sans rien : éteint — les deux cartes sont bien là', () => {
    afficher(niveau)
    expect(screen.getByRole('heading', { name: titreCarac })).toBeTruthy()
    expect(screen.getByRole('heading', { name: libelleCarteCapacite(atteint) })).toBeTruthy()
    expect(boutonConfirmer(atteint).disabled).toBe(true)
  })

  it('avec le jeton de caractéristique SEUL : toujours éteint (la capacité manque)', () => {
    afficher(niveau)
    fireEvent.click(choisissables(carteDeGain(titreCarac))[0])
    expect(boutonConfirmer(atteint).disabled).toBe(true)
  })

  it('avec la capacité SEULE : toujours éteint (le jeton manque)', () => {
    afficher(niveau)
    const libre = capacitesDisponibles(CLASSE, atteint, Object.values(capNiveaux(niveau)))[0]
    choisirCapacite(atteint, libre.nom)
    expect(boutonConfirmer(atteint).disabled).toBe(true)
  })

  it('avec les deux : allumé', () => {
    afficher(niveau)
    fireEvent.click(choisissables(carteDeGain(titreCarac))[0])
    const libre = capacitesDisponibles(CLASSE, atteint, Object.values(capNiveaux(niveau)))[0]
    choisirCapacite(atteint, libre.nom)
    expect(boutonConfirmer(atteint).disabled).toBe(false)
  })
})

describe('D17 ③ jumelle — l’échelon qui donne un don demande don ET capacité', () => {
  const niveau = VERS_DON - 1
  const atteint = VERS_DON

  it('témoin : cet échelon donne bien un don, pas de point de caractéristique', () => {
    const ligne = tableEvolution().find((l) => l.niv === atteint)!
    expect(ligne.dons ?? 0).toBeGreaterThan(0)
    expect(ligne.carac_points ?? 0).toBe(0)
  })

  it('la carte de caractéristique n’apparaît PAS — l’échelon n’en donne pas', () => {
    afficher(niveau)
    expect(screen.queryByRole('heading', { name: /point.? de caractéristique/ })).toBeNull()
    expect(screen.getByRole('heading', { name: '+1 don' })).toBeTruthy()
  })

  it('avec le don SEUL : éteint ; avec la capacité en plus : allumé', () => {
    afficher(niveau)
    expect(boutonConfirmer(atteint).disabled).toBe(true)
    fireEvent.click(choisissables(carteDeGain('+1 don'))[0])
    expect(boutonConfirmer(atteint).disabled).toBe(true)
    const libre = capacitesDisponibles(CLASSE, atteint, Object.values(capNiveaux(niveau)))[0]
    choisirCapacite(atteint, libre.nom)
    expect(boutonConfirmer(atteint).disabled).toBe(false)
  })

  it('avec la capacité SEULE : éteint (le don manque)', () => {
    afficher(niveau)
    const libre = capacitesDisponibles(CLASSE, atteint, Object.values(capNiveaux(niveau)))[0]
    choisirCapacite(atteint, libre.nom)
    expect(boutonConfirmer(atteint).disabled).toBe(true)
  })
})

describe('D17 ③ — le bassin de capacités vient de `capacitesDisponibles`', () => {
  it('les cartes choisissables sont EXACTEMENT le bassin D16 de l’échelon atteint', () => {
    const niveau = VERS_CARAC - 1
    const atteint = VERS_CARAC
    afficher(niveau)
    const carte = carteDeGain(libelleCarteCapacite(atteint))
    ouvrirLesVoies(carte)
    const rendues = choisissables(carte)
      .map((el) => (el.textContent ?? '').trim())
      .sort()
    const bassin = capacitesDisponibles(CLASSE, atteint, Object.values(capNiveaux(niveau)))
    expect(bassin.length).toBeGreaterThan(0)
    expect(rendues).toHaveLength(bassin.length)
    for (const capacite of bassin) {
      expect(
        rendues.some((texte) => texte.startsWith(capacite.nom)),
        `absente du bassin rendu : ${capacite.nom}`,
      ).toBe(true)
    }
  })

  it('le module de montée ne réimplémente aucun bassin : il passe par l’étage D16', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'wizard', 'montee.ts'),
      'utf8',
    )
    expect(source).toContain("from './capacites'")
    expect(source).toContain('optionsDuNiveau')
    // Aucun second filtre de niveau, aucun anti-doublon recopié.
    expect(source).not.toMatch(/niveau\s*<=/)
    expect(source).not.toContain('capacitesDeClasse')
  })
})

describe('D17 ④ — le jeton d’une caractéristique au maximum est indisponible', () => {
  const niveau = VERS_CARAC - 1
  const achatCarac = listeAchats().find((a) => effetAchat(a.achat).type === 'carac')!

  /** Une fiche dont la Puissance est AU MAXIMUM (achat d'héritage compris). */
  function ficheAuMax(): Partial<FicheCreation> {
    const base = getRules().caracteristiques.creation.repartition[0]
    return {
      achats: { [achatCarac.achat]: MAX_CARAC - base },
      xpPerm: achatCarac.cout_xp * (MAX_CARAC - base),
      caracs: { p: base, r: 2, e: 1 },
      extras: { p: MAX_CARAC - base, r: 0, e: 0 },
    }
  }

  it('témoin : la fiche a bien une caractéristique au maximum lu des données', () => {
    const personnage = personnageAuNiveau(niveau, ficheAuMax())
    expect(personnage.caracs.puissance).toBe(MAX_CARAC)
  })

  it('le jeton de cette caractéristique est éteint, les deux autres non', () => {
    afficher(niveau, ficheAuMax())
    const jetons = choisissables(carteDeGain('+1 point de caractéristique'))
    const puissance = jetons.find((el) => (el.textContent ?? '').startsWith('Puissance'))!
    expect((puissance as HTMLButtonElement).disabled).toBe(true)
    const autres = jetons.filter((el) => el !== puissance)
    expect(autres).toHaveLength(2)
    for (const jeton of autres) {
      expect((jeton as HTMLButtonElement).disabled, jeton.textContent ?? '').toBe(false)
    }
  })

  it('jumelle : sans caractéristique au maximum, les trois jetons sont disponibles', () => {
    afficher(niveau)
    const jetons = choisissables(carteDeGain('+1 point de caractéristique'))
    expect(jetons).toHaveLength(3)
    for (const jeton of jetons) {
      expect((jeton as HTMLButtonElement).disabled, jeton.textContent ?? '').toBe(false)
    }
  })

  it('chaque jeton montre son passage {v} → {v+1} et ce que le palier atteint rapporte', () => {
    afficher(niveau)
    const carte = carteDeGain('+1 point de caractéristique')
    const personnage = personnageAuNiveau(niveau)
    const paliers = getRules().caracteristiques.table
    const attendus: Array<[string, number, string]> = [
      ['Puissance', personnage.caracs.puissance, paliers.puissance[String(personnage.caracs.puissance + 1)]],
      ['Résistance', personnage.caracs.resistance, paliers.resistance[String(personnage.caracs.resistance + 1)]],
      ['Esprit', personnage.caracs.esprit, paliers.esprit[String(personnage.caracs.esprit + 1)]],
    ]
    for (const [nom, valeur, palier] of attendus) {
      const jeton = choisissables(carte).find((el) => (el.textContent ?? '').startsWith(nom))!
      expect(within(jeton).getByText(`${valeur} → ${valeur + 1}`), nom).toBeTruthy()
      if (palier) expect(within(jeton).getByText(palier), `${nom} palier`).toBeTruthy()
    }
  })
})

describe('D17 ⑦ — anti-doublon à travers la montée', () => {
  const niveau = VERS_CARAC - 1
  const atteint = VERS_CARAC

  it('une capacité prise à la création n’est pas choisissable dans la montée', () => {
    afficher(niveau)
    const carte = carteDeGain(libelleCarteCapacite(atteint))
    ouvrirLesVoies(carte)
    const prises = Object.values(capNiveaux(niveau))
    const rendues = choisissables(carte).map((el) => (el.textContent ?? '').trim())
    for (const id of prises) {
      const capacite = capacitesDeClasse(CLASSE).find((c) => c.id === id)!
      expect(
        rendues.some((texte) => texte.startsWith(capacite.nom)),
        `encore choisissable : ${capacite.nom}`,
      ).toBe(false)
      // Elle reste VISIBLE, rayée — rien n'est caché au joueur (maquette v5).
      expect(within(carte).getAllByText(capacite.nom).length).toBeGreaterThan(0)
    }
    expect(within(carte).getAllByText('déjà choisie').length).toBe(prises.length)
  })

  it('jumelle : une capacité achetée par XP en sort aussi', () => {
    const libres = capacitesDisponibles(CLASSE, atteint, Object.values(capNiveaux(niveau)))
    const achetee = libres[0]
    afficher(niveau, { capChoix: { [String(achetee.niveau)]: [achetee.id] } })
    const carte = carteDeGain(libelleCarteCapacite(atteint))
    ouvrirLesVoies(carte)
    const rendues = choisissables(carte).map((el) => (el.textContent ?? '').trim())
    expect(
      rendues.some((texte) => texte.startsWith(achetee.nom)),
      `achat XP encore choisissable : ${achetee.nom}`,
    ).toBe(false)
    expect(rendues).toHaveLength(libres.length - 1)
  })
})
