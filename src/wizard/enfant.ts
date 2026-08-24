/**
 * Flux de création ≤11 ans — étapes, validation, répercussions.
 *
 * Il s'embranche à l'étape tranche d'âge EXISTANTE du wizard : camp →
 * niveau → classe → métier → (langues, si Érudit) → nom du personnage →
 * fiche. Aucun artisanat n'y figure jamais (A5) : les artisanats du Tome
 * restent hors de portée des ≤11, la gate vient de la tranche
 * (`trancheEnfant()`, lue de rules.json), jamais d'un marqueur posé sur le
 * joueur. D24 ouvre en revanche UNE compétence de niveau 1 à cette tranche.
 *
 * Les règles lues ici viennent TOUTES de rules_kids.json (la planche), et
 * d'aucune autre autorité. La fenêtre de répercussions est celle du 12+ :
 * mêmes régimes, aucun troisième inventé — ici c'est « l'impossible se
 * retire tout seul et la fenêtre le nomme », parce qu'une baisse de niveau
 * reprend des capacités et des bonus que la planche donne d'office, et que
 * quitter Érudit reprend les langues qu'il avait données.
 */
import {
  capacitesEnfantAcquises,
  classeEnfant,
  classesEnfant,
  competenceEnfant,
  factionEnfant,
  niveauxPossiblesEnfant,
  normaliserNiveauEnfant,
  tableEvolutionEnfant,
} from '../rules/kids'
import { droitLanguesEnfant, languesPigeablesEnfant } from '../rules/langues_kids'
import type { FicheCreation, FicheEnfant } from './types'
import { trancheEnfant, type Changement } from './validation'

/**
 * Étapes du flux enfant. Chacune porte son icône : le stepper les affiche
 * nommées, et taper une icône ramène à son étape (exigences ① et ③).
 *
 * D24 : `langues-enfant` est CONDITIONNELLE — voir `etapesActivesEnfant`.
 * Cette liste reste le graphe complet (elle sert aussi de source aux
 * validateurs) ; ce qui se rend et se navigue vient toujours de la version
 * filtrée pour la fiche en cours.
 */
export const ETAPES_ENFANT = [
  { id: 'age', nom: 'Âge', icone: '👋' },
  { id: 'camp', nom: 'Camp', icone: '🛡️' },
  { id: 'niveau', nom: 'Niveau', icone: '⭐' },
  { id: 'classe', nom: 'Classe', icone: '⚔️' },
  { id: 'metier', nom: 'Métier', icone: '🛠️' },
  { id: 'langues-enfant', nom: 'Langues', icone: '🗣️' },
  { id: 'nom', nom: 'Nom', icone: '✍️' },
  { id: 'fiche', nom: 'Fiche', icone: '📜' },
] as const

export type EtapeEnfantId = (typeof ETAPES_ENFANT)[number]['id']

/** Les choix enfant d'une fiche, toujours sous forme d'objet. */
export function choixEnfant(fiche: FicheCreation): FicheEnfant {
  return fiche.enfant ?? {}
}

/** Remplace les choix enfant sans toucher au reste de la fiche. */
export function avecChoixEnfant(fiche: FicheCreation, choix: FicheEnfant): FicheCreation {
  return { ...fiche, enfant: { ...choixEnfant(fiche), ...choix } }
}

/**
 * D24 — les étapes RÉELLEMENT actives pour cette fiche : `langues-enfant`
 * n'existe que si le métier choisi est Érudit. Le fil, le stepper et la
 * validité de la fiche se calculent tous sur cette liste, jamais sur le
 * graphe brut `ETAPES_ENFANT`.
 */
export function etapesActivesEnfant(fiche: FicheCreation) {
  const avecLangues = choixEnfant(fiche).competence === 'erudit'
  return ETAPES_ENFANT.filter((etape) => avecLangues || etape.id !== 'langues-enfant')
}

// ---------------------------------------------------------------------------
// Validateurs d'étapes — [] = étape valide
// ---------------------------------------------------------------------------

export function problemesAgeEnfant(fiche: FicheCreation): string[] {
  if (!fiche.trancheAge) return ["tranche d'âge non choisie"]
  if (fiche.trancheAge !== trancheEnfant()) return ['tranche qui suit le flux du Tome']
  return []
}

export function problemesCampEnfant(fiche: FicheCreation): string[] {
  if (!factionEnfant(choixEnfant(fiche).faction)) return ['faction non choisie']
  return []
}

export function problemesNiveauEnfant(fiche: FicheCreation): string[] {
  const niveau = choixEnfant(fiche).niveau
  if (niveau === undefined) return [] // défaut : niveau min de la table
  if (!niveauxPossiblesEnfant().includes(niveau)) return [`niveau hors table : ${niveau}`]
  return []
}

export function problemesClasseEnfant(fiche: FicheCreation): string[] {
  if (!classeEnfant(choixEnfant(fiche).classe)) return ['classe non choisie']
  return []
}

export function problemesNomEnfant(fiche: FicheCreation): string[] {
  const nom = choixEnfant(fiche).nom
  if (!nom || nom.trim().length === 0) return ['nom du personnage manquant']
  return []
}

/** D24 — un métier parmi les quatre de la planche. */
export function problemesMetierEnfant(fiche: FicheCreation): string[] {
  if (!competenceEnfant(choixEnfant(fiche).competence)) return ['métier non choisi']
  return []
}

/** D24 — exactement le droit de langues (2 avec Érudit) ; l'étape n'existe que dans ce cas. */
export function problemesLanguesEnfant(fiche: FicheCreation): string[] {
  const choix = choixEnfant(fiche)
  const droit = droitLanguesEnfant(choix.competence)
  if ((choix.langues ?? []).length !== droit) return ['langues incomplètes']
  return []
}

const VALIDATEURS_ENFANT: Record<EtapeEnfantId, (fiche: FicheCreation) => string[]> = {
  age: problemesAgeEnfant,
  camp: problemesCampEnfant,
  niveau: problemesNiveauEnfant,
  classe: problemesClasseEnfant,
  metier: problemesMetierEnfant,
  'langues-enfant': problemesLanguesEnfant,
  nom: problemesNomEnfant,
  fiche: () => [],
}

export function problemesEtapeEnfant(fiche: FicheCreation, etape: EtapeEnfantId): string[] {
  return VALIDATEURS_ENFANT[etape](fiche)
}

export function etapeValideEnfant(fiche: FicheCreation, etape: EtapeEnfantId): boolean {
  return problemesEtapeEnfant(fiche, etape).length === 0
}

/** La fiche (dernière étape) est valide ssi toutes les précédentes (actives) le sont. */
export function etapesValidesEnfant(fiche: FicheCreation): boolean[] {
  const valides = etapesActivesEnfant(fiche).map((etape) => etapeValideEnfant(fiche, etape.id))
  valides[valides.length - 1] = valides.slice(0, -1).every(Boolean)
  return valides
}

// ---------------------------------------------------------------------------
// Répercussions — la fenêtre existante, mêmes régimes que le 12+
// ---------------------------------------------------------------------------

/**
 * Changement de niveau. Monter n'enlève rien. Baisser reprend ce que les
 * échelons quittés donnaient d'office — capacités de la classe, +Lutte,
 * +Dégâts — et la fenêtre les nomme un par un avant d'appliquer quoi que ce
 * soit. Aucun chiffre n'est écrit ici : tout vient de la table de la planche.
 */
export function changerNiveauEnfant(fiche: FicheCreation, nouveauNiveau: number): Changement {
  const choix = choixEnfant(fiche)
  const avant = normaliserNiveauEnfant(choix.niveau)
  const apres = normaliserNiveauEnfant(nouveauNiveau)
  const suite = avecChoixEnfant(fiche, { niveau: apres })
  if (apres >= avant) return { fiche: suite, retraits: [] }

  const retraits: string[] = []
  const gardees = new Set(capacitesEnfantAcquises(choix.classe, apres).map((c) => c.id))
  for (const capacite of capacitesEnfantAcquises(choix.classe, avant)) {
    if (gardees.has(capacite.id)) continue
    const nom = capacite.nom_affichage ?? capacite.nom
    retraits.push(`Ta capacité « ${nom} » (niveau ${capacite.niveau}) sera retirée.`)
  }
  for (const ligne of tableEvolutionEnfant()) {
    if (ligne.niv <= apres || ligne.niv > avant) continue
    if (ligne.lutte) retraits.push(`Ton +${ligne.lutte} en Lutte du niveau ${ligne.niv} sera retiré.`)
    if (ligne.degats) {
      retraits.push(`Ton +${ligne.degats} en Dégâts du niveau ${ligne.niv} sera retiré.`)
    }
  }
  return { fiche: suite, retraits }
}

/** Classes proposées : toutes, dans n'importe quelle faction (choix libre). */
export function classesProposeesEnfant() {
  return classesEnfant()
}

function nomDeLangueEnfant(id: string): string {
  return languesPigeablesEnfant().find((langue) => langue.id === id)?.nom ?? id
}

/**
 * Changement de métier. Choisir un métier différent n'a de répercussion que
 * lorsqu'on QUITTE Érudit avec des langues déjà choisies : la fenêtre les
 * nomme avant de les vider. Rejoindre Érudit, ou changer entre deux métiers
 * sans Érudit, s'applique tout de suite.
 */
export function changerMetierEnfant(fiche: FicheCreation, competenceId: string): Changement {
  const choix = choixEnfant(fiche)
  const langues = choix.langues ?? []
  const suite = avecChoixEnfant(fiche, {
    competence: competenceId,
    langues: competenceId === 'erudit' ? choix.langues : undefined,
  })
  if (choix.competence !== 'erudit' || competenceId === 'erudit' || langues.length === 0) {
    return { fiche: suite, retraits: [] }
  }
  return { fiche: suite, retraits: [`Langues : ${langues.map(nomDeLangueEnfant).join(', ')}`] }
}
