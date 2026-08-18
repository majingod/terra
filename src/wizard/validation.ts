/**
 * Validation des 9 étapes du wizard et fenêtre de répercussions.
 *
 * Deux régimes (spec t004) :
 * - « l'impossible se retire tout seul et la fenêtre le nomme » :
 *   changerFaction / changerClasse / changerVoie rendent la fiche corrigée
 *   ET la liste nommée des retraits (la fenêtre l'affiche, Annuler restaure) ;
 * - « le surplus se retire par le joueur » : surplusDons / surplusLangues /
 *   surplusCompetences alimentent les bandeaux rouges « retire N », la
 *   navigation avant restant verrouillée par les validateurs.
 */
import { TRANCHES_AGE, type TrancheAge } from '../rules/age'
import { branchesDe } from '../rules/branches'
import { validerRepartition } from '../rules/caracs'
import {
  compteAchats,
  desavantagesDisponibles,
  desavantagesInterditsPour,
  effetAchat,
  listeAchats,
  listeDesavantages,
  totalAchats,
  validerAchats,
} from '../rules/heritage'
import { droitLangues, refusLangues } from '../rules/langues'
import { getRules } from '../rules/load'
import {
  classesPourFaction,
  racesPourFaction,
  raceDe,
  valeurCarac,
} from '../rules/stats'
import {
  consommationDons,
  droitCompetences,
  droitDons,
  refusCompetences,
  refusDons,
} from '../rules/talents'
import { bassinCapacites, capaciteParId } from './capacites'
import type { FicheCreation } from './types'

export const ETAPES = [
  { id: 'age', nom: 'Âge' },
  { id: 'camp', nom: 'Camp' },
  { id: 'classe', nom: 'Classe' },
  { id: 'destin', nom: 'Destin' },
  { id: 'forces', nom: 'Forces' },
  { id: 'talents', nom: 'Talents' },
  { id: 'langues', nom: 'Langues' },
  { id: 'nom', nom: 'Nom' },
  { id: 'fiche', nom: 'Fiche' },
] as const

export type EtapeId = (typeof ETAPES)[number]['id']

/** Tranche d'âge qui poursuit le wizard (l'autre est renvoyée à l'accueil). */
export function trancheQuiContinue(): TrancheAge {
  const interdite = getRules().competences.artisanats.interdit_tranche
  const restantes = TRANCHES_AGE.filter((t) => t !== interdite)
  return restantes[0]
}

// ---------------------------------------------------------------------------
// Validateurs d'étapes — [] = étape valide
// ---------------------------------------------------------------------------

export function problemesAge(fiche: FicheCreation): string[] {
  if (!fiche.trancheAge) return ["tranche d'âge non choisie"]
  if (fiche.trancheAge !== trancheQuiContinue()) {
    return ['tranche renvoyée vers la feuille enfant']
  }
  return []
}

export function problemesCamp(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const faction = getRules().factions.liste.find((f) => f.id === fiche.faction)
  if (!faction) return ['faction non choisie']
  const race = racesPourFaction(faction.id).find((r) => r.id === fiche.race)
  if (!race) {
    problemes.push('race non choisie')
    return problemes
  }
  const choix = race.bonus.find(
    (b): b is { choix: string[] } => typeof b === 'object' && 'choix' in b,
  )
  if (choix && (!fiche.humainChoix || !choix.choix.includes(fiche.humainChoix))) {
    problemes.push('bonus au choix non choisi')
  }
  return problemes
}

export function problemesClasse(fiche: FicheCreation): string[] {
  if (!fiche.faction) return ['faction manquante']
  const classe = classesPourFaction(fiche.faction).find((c) => c.id === fiche.classe)
  if (!classe) return ['classe non choisie']
  if (!fiche.voie || !branchesDe(classe.id).some((b) => b.id === fiche.voie)) {
    return ['voie non choisie']
  }
  return []
}

export function problemesDestin(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const ordre = fiche.desavOrdre ?? []
  const disponibles = new Set(desavantagesDisponibles(fiche.classe).map((d) => d.id))
  const vus = new Set<string>()
  for (const id of ordre) {
    if (vus.has(id)) problemes.push(`désavantage en double : ${id}`)
    vus.add(id)
    if (!disponibles.has(id)) problemes.push(`désavantage indisponible : ${id}`)
  }
  const aVariante = listeDesavantages().filter((d) => d.variante_xp !== undefined)
  for (const desavantage of aVariante) {
    if (ordre.includes(desavantage.id)) {
      const raceRefusee = raceDe(fiche.racisteVar)
      if (!raceRefusee) problemes.push(`sous-choix obligatoire : ${desavantage.nom}`)
    }
  }
  const xpPerm = fiche.xpPerm ?? 0
  if (!Number.isInteger(xpPerm) || xpPerm < 0) problemes.push('XP permanent invalide')
  problemes.push(...validerAchats(fiche))
  // Achats de capacité : autant de choix que d'achats, tous dans le bassin.
  const niveaux = new Set<number>()
  for (const achat of listeAchats()) {
    const effet = effetAchat(achat.achat)
    if (effet.type === 'capacite') niveaux.add(effet.niveau)
  }
  for (const niveau of niveaux) {
    const attendus = compteAchats(fiche.achats, 'capacite', niveau)
    const choisis = fiche.capChoix?.[String(niveau)] ?? []
    if (choisis.length !== attendus) {
      problemes.push(`capacités de niveau ${niveau} : ${choisis.length}/${attendus} choisies`)
    }
    const bassin = new Set(bassinCapacites(fiche.classe, fiche.voie, niveau).map((c) => c.id))
    for (const id of choisis) {
      if (!bassin.has(id)) problemes.push(`capacité hors bassin : ${id}`)
    }
    if (new Set(choisis).size !== choisis.length) {
      problemes.push(`capacités de niveau ${niveau} en double`)
    }
  }
  return problemes
}

export function problemesForces(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const { p, r, e } = fiche.caracs ?? {}
  if (p === undefined || r === undefined || e === undefined) {
    return ['jetons non tous posés']
  }
  if (!validerRepartition([p, r, e])) {
    problemes.push('répartition refusée : il faut exactement les jetons du fichier')
  }
  const extras = fiche.extras ?? { p: 0, r: 0, e: 0 }
  const pointsAchetes = totalAchats(fiche.achats, 'carac')
  const distribues = extras.p + extras.r + extras.e
  if (extras.p < 0 || extras.r < 0 || extras.e < 0) problemes.push('point d’héritage négatif')
  if (distribues !== pointsAchetes) {
    problemes.push(`points d'héritage : ${distribues}/${pointsAchetes} posés`)
  }
  const max = getRules().caracteristiques.creation.max
  for (const carac of ['p', 'r', 'e'] as const) {
    if (valeurCarac(fiche, carac) > max) {
      problemes.push(`caractéristique au-delà de ${max}`)
    }
  }
  return problemes
}

export function problemesTalents(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const esprit = valeurCarac(fiche, 'e')
  const dons = fiche.dons ?? {}
  problemes.push(...refusDons(dons))
  const droit = droitDons(esprit, fiche.achats)
  const pris = consommationDons(dons)
  if (pris !== droit) problemes.push(`dons : ${pris}/${droit}`)
  const comps = fiche.comps ?? []
  problemes.push(...refusCompetences(comps, fiche.trancheAge))
  const droitComps = droitCompetences(fiche.achats)
  if (comps.length !== droitComps) problemes.push(`compétences : ${comps.length}/${droitComps}`)
  return problemes
}

export function problemesLangues(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const langChoix = fiche.langChoix ?? []
  problemes.push(...refusLangues(langChoix, fiche.race, fiche.classe))
  const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])
  if (langChoix.length !== droit) problemes.push(`langues : ${langChoix.length}/${droit}`)
  return problemes
}

export function problemesNom(fiche: FicheCreation): string[] {
  if (!fiche.nom || fiche.nom.trim().length === 0) return ['nom du personnage manquant']
  return []
}

const VALIDATEURS: Record<EtapeId, (fiche: FicheCreation) => string[]> = {
  age: problemesAge,
  camp: problemesCamp,
  classe: problemesClasse,
  destin: problemesDestin,
  forces: problemesForces,
  talents: problemesTalents,
  langues: problemesLangues,
  nom: problemesNom,
  fiche: () => [],
}

export function problemesEtape(fiche: FicheCreation, etape: EtapeId): string[] {
  return VALIDATEURS[etape](fiche)
}

export function etapeValide(fiche: FicheCreation, etape: EtapeId): boolean {
  return problemesEtape(fiche, etape).length === 0
}

/** La fiche (étape 9) est valide ssi toutes les précédentes le sont. */
export function etapesValides(fiche: FicheCreation): boolean[] {
  const valides = ETAPES.map((etape) => etapeValide(fiche, etape.id))
  const precedentes = valides.slice(0, -1).every(Boolean)
  valides[valides.length - 1] = precedentes
  return valides
}

/**
 * Une étape est accessible ssi TOUTES les précédentes sont valides
 * (pastilles : ✓ cliquable, 🔒 sinon).
 */
export function etapeAccessible(fiche: FicheCreation, index: number): boolean {
  const valides = etapesValides(fiche)
  return valides.slice(0, index).every(Boolean)
}

// ---------------------------------------------------------------------------
// Surplus (régime « le joueur retire ») — bandeaux rouges « retire N »
// ---------------------------------------------------------------------------

export function surplusDons(fiche: FicheCreation): number {
  const droit = droitDons(valeurCarac(fiche, 'e'), fiche.achats)
  return Math.max(0, consommationDons(fiche.dons ?? {}) - droit)
}

export function surplusCompetences(fiche: FicheCreation): number {
  return Math.max(0, (fiche.comps ?? []).length - droitCompetences(fiche.achats))
}

export function surplusLangues(fiche: FicheCreation): number {
  const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])
  return Math.max(0, (fiche.langChoix ?? []).length - droit)
}

// ---------------------------------------------------------------------------
// Répercussions (régime « l'impossible se retire tout seul »)
// ---------------------------------------------------------------------------

export interface Changement {
  fiche: FicheCreation
  /** Retraits automatiques, nommés pour la fenêtre de répercussions. */
  retraits: string[]
}

function nomVoie(classeId: string | undefined, voieId: string | undefined): string {
  const voie = branchesDe(classeId ?? '').find((b) => b.id === voieId)
  return voie ? voie.nom : (voieId ?? '')
}

/** Retire les choix de capacités devenus impossibles ; nomme chaque retrait. */
function retirerCapChoixInvalides(fiche: FicheCreation, retraits: string[]): FicheCreation {
  if (!fiche.capChoix) return fiche
  const capChoix: Record<string, string[]> = {}
  const achats = { ...(fiche.achats ?? {}) }
  for (const [niveau, ids] of Object.entries(fiche.capChoix)) {
    const bassin = new Set(
      bassinCapacites(fiche.classe, fiche.voie, Number(niveau)).map((c) => c.id),
    )
    const gardes: string[] = []
    for (const id of ids) {
      if (bassin.has(id)) {
        gardes.push(id)
        continue
      }
      const capacite = capaciteParId(fiche.classe, id)
      const libelle = capacite ? `« ${capacite.nom} »` : id
      // L'achat en conflit est retiré AVEC son choix (spec répercussions).
      const achatDuNiveau = listeAchats().find((a) => {
        const effet = effetAchat(a.achat)
        return effet.type === 'capacite' && effet.niveau === Number(niveau)
      })
      if (achatDuNiveau && (achats[achatDuNiveau.achat] ?? 0) > 0) {
        achats[achatDuNiveau.achat] -= 1
        if (achats[achatDuNiveau.achat] === 0) delete achats[achatDuNiveau.achat]
        retraits.push(`Achat « ${achatDuNiveau.achat} » retiré avec son choix ${libelle}`)
      } else {
        retraits.push(`Choix de capacité ${libelle} retiré`)
      }
    }
    if (gardes.length > 0) capChoix[niveau] = gardes
  }
  return { ...fiche, capChoix, achats }
}

/** Retire les désavantages interdits à la classe ; nomme chaque retrait. */
function retirerDesavantagesInterdits(fiche: FicheCreation, retraits: string[]): FicheCreation {
  if (!fiche.classe || !fiche.desavOrdre) return fiche
  const interdits = desavantagesInterditsPour(fiche.classe)
  const idsInterdits = new Set(interdits.map((d) => d.id))
  const gardes = fiche.desavOrdre.filter((id) => !idsInterdits.has(id))
  for (const desavantage of interdits) {
    if (fiche.desavOrdre.includes(desavantage.id)) {
      retraits.push(`Désavantage « ${desavantage.nom} » décoché (interdit à cette classe)`)
    }
  }
  return { ...fiche, desavOrdre: gardes }
}

export function changerVoie(fiche: FicheCreation, nouvelleVoie: string): Changement {
  if (fiche.voie === nouvelleVoie) return { fiche, retraits: [] }
  const retraits: string[] = []
  let suite: FicheCreation = { ...fiche, voie: nouvelleVoie }
  suite = retirerCapChoixInvalides(suite, retraits)
  return { fiche: suite, retraits }
}

export function changerClasse(fiche: FicheCreation, nouvelleClasse: string): Changement {
  if (fiche.classe === nouvelleClasse) return { fiche, retraits: [] }
  const retraits: string[] = []
  let suite: FicheCreation = { ...fiche, classe: nouvelleClasse }
  if (fiche.voie) {
    retraits.push(`Voie « ${nomVoie(fiche.classe, fiche.voie)} » retirée`)
    suite = { ...suite, voie: undefined }
  }
  suite = retirerDesavantagesInterdits(suite, retraits)
  suite = retirerCapChoixInvalides(suite, retraits)
  return { fiche: suite, retraits }
}

export function changerFaction(fiche: FicheCreation, nouvelleFaction: string): Changement {
  if (fiche.faction === nouvelleFaction) return { fiche, retraits: [] }
  const retraits: string[] = []
  let suite: FicheCreation = { ...fiche, faction: nouvelleFaction }
  if (fiche.race && !racesPourFaction(nouvelleFaction).some((r) => r.id === fiche.race)) {
    const race = raceDe(fiche.race)
    retraits.push(`Race « ${race?.nom ?? fiche.race} » retirée`)
    suite = { ...suite, race: undefined, humainChoix: undefined }
  }
  if (fiche.classe && !classesPourFaction(nouvelleFaction).some((c) => c.id === fiche.classe)) {
    const classe = getRules().classes_squelette.liste.find((c) => c.id === fiche.classe)
    retraits.push(`Classe « ${classe?.nom ?? fiche.classe} » retirée`)
    if (fiche.voie) retraits.push(`Voie « ${nomVoie(fiche.classe, fiche.voie)} » retirée`)
    suite = { ...suite, classe: undefined, voie: undefined }
    suite = retirerCapChoixInvalides(suite, retraits)
  }
  return { fiche: suite, retraits }
}
