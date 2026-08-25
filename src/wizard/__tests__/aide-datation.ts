/**
 * Fabriques des gates D19 ③ : une fiche dont on MAÎTRISE l'histoire de
 * l'Esprit — combien il en portait à la création, et à quels échelons ses
 * points sont tombés dessus.
 *
 * D5 : rien n'est recopié du Tome. La répartition, la table d'évolution, les
 * droits de dons, de compétences et de langues sont tous DÉDUITS de
 * rules.json — si le fichier bouge, la fabrique suit.
 *
 * ⚠️ Cette fabrique n'importe QUE des modules antérieurs au lot : les gates
 * qui s'en servent doivent pouvoir tourner (et ROUGIR par assertion) sur
 * `origin/main`.
 */
import { capacitesDeClasse } from '../../rules/capacites'
import { repartitionAttendue } from '../../rules/caracs'
import { droitLangues, languesProposables } from '../../rules/langues'
import { getRules } from '../../rules/load'
import { niveauxPossibles, normaliserNiveau, pointsCaracCumules } from '../../rules/niveau'
import { classeSquelette, racesPourFaction, valeurCarac } from '../../rules/stats'
import {
  droitCompetences,
  droitDons,
  listeCompetencesSimples,
  listeDons,
} from '../../rules/talents'
import { trancheQuiContinue } from '../validation'
import type { EntreeNiveau, FicheCreation } from '../types'

/** Dates fixes : une fabrique de test doit rendre deux fois la même fiche. */
const PREMIER_JOUR = 1_700_000_000_000

/**
 * Le seuil d'Esprit qui ouvre un don, LU de la table cumulative — jamais un
 * « 3 » écrit ici. Les gates s'en servent pour construire leurs libellés.
 */
export function seuilDuPalier(): number {
  const esprit = getRules().caracteristiques.table_cumulative.esprit
  return Object.entries(esprit)
    .map(([valeur, palier]) => ({ valeur: Number(valeur), dons: palier.dons }))
    .sort((a, b) => a.valeur - b.valeur)
    .filter((palier) => palier.dons > 0)[0].valeur
}

/** Les dons que la table cumulative ouvre à cette valeur d'Esprit. */
export function donsDuPalier(esprit: number): number {
  const palier = getRules().caracteristiques.table_cumulative.esprit[String(esprit)]
  return palier?.dons ?? 0
}

/** Les échelons de la table qui donnent un point de caractéristique. */
export function echelonsAPoint(): number[] {
  return niveauxPossibles().filter((n) => pointsCaracCumules(n) > pointsCaracCumules(n - 1))
}

export interface OptionsFicheDatee {
  classe?: string
  /** Le niveau du personnage — l'historique en porte tous les échelons. */
  niveau: number
  /** L'Esprit posé à la création (l'un des jetons de la répartition). */
  espritCreation: number
  /** Les échelons dont le point de caractéristique est tombé sur l'Esprit. */
  surEsprit?: number[]
  /** Achats « +1 Don » de l'héritage (D20 : ils n'existent qu'à la création). */
  achatsDon?: number
  /**
   * Laisse le droit du palier d'Esprit NON consommé : la fiche porte un don
   * de moins que son droit. C'est l'état EXACT dans lequel les fiches d'avant
   * D19 ③ se trouvent — le trou que ce lot vient boucher.
   */
  palierNonConsomme?: boolean
  /** L'ordre exact des dons dans l'agrégat (défaut : l'ordre du catalogue). */
  dons?: string[]
  nom?: string
}

/** Le libellé d'achat d'héritage qui donne un don, lu du fichier. */
export function achatDeDon(): string {
  return getRules()
    .heritage.avantages.liste.find((a) => /\bDon\b/i.test(a.achat))!.achat
}

/**
 * Une fiche 12+ entière et valide, dont l'histoire de l'Esprit est celle
 * qu'on demande. Les points de caractéristique qui ne vont pas sur l'Esprit
 * tombent sur la Puissance — le compte fait foi, pas la caractéristique visée.
 */
export function ficheDatee(options: OptionsFicheDatee): FicheCreation {
  const classeId = options.classe ?? getRules().classes_squelette.liste[0].id
  const classe = classeSquelette(classeId)
  if (!classe) throw new Error(`classe inconnue : ${classeId}`)
  const niveau = normaliserNiveau(options.niveau)
  const surEsprit = new Set(options.surEsprit ?? [])
  const achatsDon = options.achatsDon ?? 0

  const faction = classe.faction === 'toute' ? getRules().factions.liste[0].id : classe.faction
  const race = racesPourFaction(faction).find(
    (r) => !r.bonus.some((b) => typeof b === 'object' && 'choix' in b),
  )
  if (!race) throw new Error(`aucune race sans bonus au choix pour ${faction}`)

  // La répartition de création : l'Esprit demandé, le reste sur p et r.
  const jetons = repartitionAttendue().sort((a, b) => b - a)
  const index = jetons.indexOf(options.espritCreation)
  if (index < 0) {
    throw new Error(`Esprit ${options.espritCreation} hors de la répartition du fichier`)
  }
  const restants = jetons.filter((_, i) => i !== index)
  const caracs = { p: restants[0], r: restants[1], e: options.espritCreation }

  // L'historique daté : chaque échelon porte les points que la table donne,
  // sur l'Esprit ou sur la Puissance selon ce que la gate demande.
  const extras = { p: 0, r: 0, e: 0 }
  const historique: EntreeNiveau[] = niveauxPossibles()
    .filter((n) => n <= niveau)
    .map((n, rang) => {
      const points = pointsCaracCumules(n) - pointsCaracCumules(n - 1)
      const entree: EntreeNiveau = { niveau: n, le: PREMIER_JOUR + rang }
      if (points > 0) {
        const cle = surEsprit.has(n) ? 'e' : 'p'
        entree.caracs = { [cle]: points }
        extras[cle] += points
      }
      return entree
    })

  // Un emplacement de capacité par niveau, jamais deux fois la même.
  const arbre = capacitesDeClasse(classeId)
  const capNiveaux: Record<string, string> = {}
  for (const n of niveauxPossibles().filter((v) => v <= niveau)) {
    capNiveaux[String(n)] = arbre.find(
      (c) => c.niveau <= n && !Object.values(capNiveaux).includes(c.id),
    )!.id
  }

  const socle: FicheCreation = {
    trancheAge: trancheQuiContinue(),
    faction,
    race: race.id,
    classe: classeId,
    historique,
    capNiveaux,
    caracs,
    extras,
    nom: options.nom ?? 'Bob',
  }
  const achats = achatsDon > 0 ? { [achatDeDon()]: achatsDon } : undefined
  const avecAchats: FicheCreation = achats
    ? { ...socle, achats, xpPerm: 100 }
    : socle

  const esprit = valeurCarac(avecAchats, 'e')
  const droit = droitDons(esprit, achats, niveau) - (options.palierNonConsomme ? 1 : 0)
  const catalogue = options.dons ?? listeDons().map((d) => d.id)
  if (catalogue.length < droit) throw new Error('pas assez de dons au catalogue')
  const dons: Record<string, number> = {}
  for (const id of catalogue.slice(0, droit)) dons[id] = 1

  const comps = listeCompetencesSimples()
    .filter((c) => c.id !== 'erudit') // l'Érudit change le droit de langues
    .slice(0, droitCompetences(achats, niveau))
    .map((c) => c.id)
  const langChoix = languesProposables(race.id, classeId)
    .slice(0, droitLangues(esprit, comps))
    .map((l) => l.id)

  return { ...avecAchats, dons, comps, langChoix }
}
