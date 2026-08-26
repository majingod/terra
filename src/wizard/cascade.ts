/**
 * D20 lot 2 — CORRIGER un choix d'une montée déjà traversée, et nommer tout
 * ce qui en dépend AVANT que quoi que ce soit s'applique.
 *
 * Le besoin de table : « mon point du niveau 2 aurait dû aller en Puissance ».
 * Jusqu'ici le seul chemin était de supprimer la fiche et de tout recommencer.
 * Ici le joueur touche la pastille du niveau fautif, change son choix, et la
 * fenêtre de répercussions lui montre ce qui part. Les niveaux au-dessus
 * RESTENT — c'est une chirurgie, pas une démolition.
 *
 * ⛔ Dérivation PURE, zéro écriture. Ce module rend une fiche CANDIDATE et la
 * liste nommée de ce qu'elle perd ; rien ne s'applique avant que l'appelant ne
 * confirme (`miseAJourCorrection`, dans `wizard/montee.ts` — où vivent déjà
 * les écritures). « Annuler » ne touche à rien : il n'y a rien à défaire.
 *
 * ⛔ Jamais une liste de pertes écrite à la main. Les dons qui tombent se
 * trouvent par la DATATION (D19) : un point retiré qui fait retomber l'Esprit
 * sous son palier retire le droit du palier — et le don que la datation
 * appariait à ce droit est la perte, nommée. Les langues en trop se retirent
 * de la FIN de `langChoix`, `droitLangues` recomptant le droit.
 *
 * ⛔ Les achats d'héritage et le budget XP ne sont JAMAIS touchés : mesuré au
 * corpus 1.3.1, aucun achat n'a de prérequis de caractéristique. La cascade
 * n'a donc aucun chemin vers eux.
 *
 * ⛔ L'historique ne gagne ni ne perd d'entrée : l'entrée du niveau corrigé
 * garde son `niveau` et son `le`, seul son `caracs` change quand le point
 * bouge de colonne. Le niveau du personnage ne bouge pas d'un cran.
 *
 * ⚠️ L'ordre d'un `Record` JS est son ordre d'insertion — c'est l'invariant
 * dont la datation se sert pour apparier les prises aux droits. Une correction
 * qui retire un don le retire de SA place ; une qui le remplace le remplace à
 * SA place. On travaille donc sur la liste ORDONNÉE des instances, jamais par
 * `delete` puis ajout au bout.
 *
 * ⚠️ Le don CUMULABLE garde la place de sa première prise (limite documentée
 * de `datation.ts`) : corriger une de ses prises décrémente sans déplacer,
 * parce que la reconstruction compte par id dans l'ordre des instances.
 */
import { droitLangues, languesAcquises, listeLangues } from '../rules/langues'
import { getRules } from '../rules/load'
import { gainsMontee } from '../rules/montee'
import { statsDe, valeurCarac } from '../rules/stats'
import { consommationDons, listeDons } from '../rules/talents'
import type { Personnage } from '../db'
import {
  capacitesDeLaFiche,
  optionsDuNiveau,
  prisesAilleurs,
  type OptionDeCapacite,
} from './capacites'
import {
  datesDesDons,
  donsDuPalierEsprit,
  niveauPalierEsprit3,
  type DonDate,
} from './datation'
import { caracsDuNiveau, historiqueDe, niveauCourant } from './historique'
import {
  donsPris,
  optionsDeTrocCapacite,
  optionsDeTrocDon,
  type OptionDeDon,
} from './troc'
import type { CleCarac, EntreeNiveau, FicheCreation } from './types'
import type { ChoixMontee, EmplacementDeDon } from './montee'

// ---------------------------------------------------------------------------
// Ce que la fenêtre montre
// ---------------------------------------------------------------------------

/** La nature d'un acquis — ce que l'étiquette de la carte porte. */
export type TypeAcquis = 'don' | 'langue' | 'capacite'

/**
 * Un acquis qui PART parce que le droit dont il venait n'existe plus. Chacun
 * est nommé : ⛔ rien d'innommé ne quitte jamais la fiche.
 */
export interface Perte {
  /** Le nom lu du corpus (⛔ jamais un id à l'écran). */
  nom: string
  type: TypeAcquis
  /** Le niveau du personnage où il avait été gagné — la datation le dit. */
  niveau?: number
  /** Le droit disparu, dit en clair : « Esprit 3 ». */
  source: string
  /** Vrai quand il n'a rien coûté au budget XP (il ne vient pas d'un achat). */
  gratuit: boolean
}

/** Ce qui SURVIT, groupé par nature — les cartes vertes de la fenêtre. */
export interface Reste {
  type: TypeAcquis
  items: Array<{ nom: string; niveau?: number }>
}

/** Un effet de table qui bouge avec la caractéristique qui le porte. */
export interface EffetDeTable {
  quoi: string
  avant: number
  apres: number
}

/** Une ligne du bilan — ⛔ seulement ce qui change VRAIMENT. */
export interface LigneBilan {
  quoi: string
  avant: number
  apres: number
  /** Ce que la table cumulative fait bouger avec elle (Lutte, PV, Mana…). */
  effets?: EffetDeTable[]
}

/** Le résultat entier d'une correction — candidat, jamais écrit. */
export interface Correction {
  /** La fiche telle qu'elle serait. */
  fiche: FicheCreation
  pertes: Perte[]
  reste: Reste[]
  bilan: LigneBilan[]
}

// ---------------------------------------------------------------------------
// Libellés (arbitrés sur la maquette MAQUETTE_FIL_D20_v3, validée)
// ---------------------------------------------------------------------------

/** Le titre de l'écran rouvert : « Montée 1 → 2 ». */
export function libelleMonteeRouverte(niveau: number): string {
  return `Montée ${niveau - 1} → ${niveau}`
}

/** Ce que le titre porte en second : d'où viennent les choix pré-remplis. */
export function libelleChoixDAlors(): string {
  return 'tes choix d’alors'
}

/** Le titre de la fenêtre de répercussions. */
export function libelleFenetre(): string {
  return 'Si tu changes ce choix'
}

/** L'en-tête du groupe rouge, avec son compte exact. */
export function libelleCeQueTuPerds(nombre: number): string {
  return `Ce que tu perds — ${nombre} chose${nombre > 1 ? 's' : ''}`
}

/** L'en-tête du groupe vert. */
export function libelleCeQuiReste(): string {
  return 'Ce qui reste'
}

/** Le bouton qui écrit. ⛔ Rien ne s'applique avant lui. */
export const LIBELLE_CHANGER = 'Changer quand même'
/** Le bouton qui ne touche à rien. */
export const LIBELLE_ANNULER = 'Annuler'

/** L'étiquette « obtenu au niveau N » d'une carte de perte. */
export function libelleObtenuAu(perte: Perte): string {
  const accord = perte.type === 'langue' ? 'obtenue' : 'obtenu'
  if (perte.niveau === undefined) return `${accord} à la création`
  return `${accord} au niveau ${perte.niveau}`
}

/** L'étiquette « source : … » d'une carte de perte. */
export function libelleSource(perte: Perte): string {
  return `source : ${perte.source}`
}

/** La phrase d'explication d'une carte de perte — dérivée, jamais recopiée. */
export function libelleRaisonDeLaPerte(perte: Perte): string {
  if (perte.type === 'langue') return `« ${perte.source} » n’ouvre plus cette langue.`
  if (perte.type === 'capacite') return `« ${perte.source} » n’ouvre plus cette capacité.`
  return `« ${perte.source} » n’ouvre plus ce don.`
}

/** Le titre d'une carte verte, et la raison de sa survie. */
export function libelleReste(reste: Reste): { titre: string; raison: string } {
  const pluriel = reste.items.length > 1
  if (reste.type === 'capacite') {
    return {
      titre: pluriel ? 'Tes capacités' : 'Ta capacité',
      raison: 'Elles viennent de tes niveaux, pas de ta caractéristique.',
    }
  }
  if (reste.type === 'langue') {
    return {
      titre: pluriel ? 'Tes autres langues' : 'Ton autre langue',
      raison: 'Elles ne viennent pas de la caractéristique qui bouge.',
    }
  }
  return {
    titre: pluriel ? 'Tes autres dons' : 'Ton autre don',
    raison: 'Ils viennent du niveau ou d’un achat, pas de la caractéristique.',
  }
}

/**
 * Le chapeau de la fenêtre : ce que le geste change, dit en une phrase. Le
 * NOM des caractéristiques est celui de l'étape Forces — jamais une clé.
 */
export function libelleChangementDuPoint(
  niveau: number,
  ancienne: CleCarac | undefined,
  nouvelle: CleCarac | undefined,
): string {
  if (!ancienne || !nouvelle || ancienne === nouvelle) {
    return `Ce choix du niveau ${niveau} changerait.`
  }
  return `Le point du niveau ${niveau} passerait de ${NOMS_CARAC[ancienne]} à ${NOMS_CARAC[nouvelle]}.`
}

/** La ligne de pied : d'où sort chaque ligne de cette fenêtre. */
export const LIBELLE_PROVENANCE =
  'Chaque ligne se calcule depuis la datation des dons et le graphe de dépendances — jamais une liste écrite à la main. Rien ne s’applique avant « Changer quand même ».'

// ---------------------------------------------------------------------------
// Les noms et les tables, lus du corpus
// ---------------------------------------------------------------------------

function nomDuDon(id: string): string {
  return listeDons().find((don) => don.id === id)?.nom ?? id
}

function nomDeLaLangue(id: string): string {
  return listeLangues().find((langue) => langue.id === id)?.nom ?? id
}

/** La table cumulative qui décrit chaque caractéristique. */
const TABLES: Record<CleCarac, 'puissance' | 'resistance' | 'esprit'> = {
  p: 'puissance',
  r: 'resistance',
  e: 'esprit',
}

/** Le nom d'affichage d'une caractéristique (les mêmes trois qu'à l'étape Forces). */
const NOMS_CARAC: Record<CleCarac, string> = {
  p: 'Puissance',
  r: 'Résistance',
  e: 'Esprit',
}

/** Le nom d'affichage d'un effet de table, par clé du corpus. */
const NOMS_EFFET: Record<string, string> = {
  lutte: 'Lutte',
  degats: 'Dégâts',
  pv: 'PV',
  sauvegardes: 'Sauvegardes',
  mana: 'Mana',
}

/**
 * Les effets que la table cumulative d'une caractéristique porte — lus des
 * CLÉS du corpus, jamais d'une liste recopiée. Un champ que le corpus
 * ajouterait demain apparaîtrait tout seul, nommé par sa clé.
 */
function effetsDeLaTable(carac: CleCarac): string[] {
  const table = getRules().caracteristiques.table_cumulative[TABLES[carac]]
  const cles = new Set<string>()
  for (const palier of Object.values(table)) {
    for (const [cle, valeur] of Object.entries(palier)) {
      if (typeof valeur === 'number') cles.add(cle)
    }
  }
  return [...cles]
}

// ---------------------------------------------------------------------------
// L'agrégat des dons, vu comme une LISTE ORDONNÉE d'instances
// ---------------------------------------------------------------------------

/** Les instances de `fiche.dons`, dans l'ordre où la fiche les porte. */
function instancesDeLAgregat(fiche: FicheCreation): string[] {
  const instances: string[] = []
  for (const [id, n] of Object.entries(fiche.dons ?? {})) {
    for (let i = 0; i < n; i++) instances.push(id)
  }
  return instances
}

/**
 * L'agrégat reconstruit depuis la liste d'instances : chaque id garde la
 * place de sa PREMIÈRE instance, et les reprises d'un cumulable s'y comptent.
 * C'est l'invariant d'ordre de la datation, tenu par construction.
 */
function agregatDesInstances(instances: readonly string[]): Record<string, number> {
  const dons: Record<string, number> = {}
  for (const id of instances) dons[id] = (dons[id] ?? 0) + 1
  return dons
}

/** Les instances de l'agrégat, DATÉES — la même liste, chacune avec son droit. */
function instancesDatees(fiche: FicheCreation): DonDate[] {
  return datesDesDons(fiche).slice(0, consommationDons(fiche.dons ?? {}))
}

/** Les rangs des instances qui répondent du droit d'échelon de ce niveau. */
function rangsDeLEchelon(datees: readonly DonDate[], niveau: number): number[] {
  return datees
    .map((instance, rang) => ({ instance, rang }))
    .filter(({ instance }) => instance.source === 'echelon' && instance.niveau === niveau)
    .map(({ rang }) => rang)
}

/** Les rangs des instances qui répondent d'un droit de palier. */
function rangsDuPalier(datees: readonly DonDate[]): number[] {
  return datees
    .map((instance, rang) => ({ instance, rang }))
    .filter(({ instance }) => instance.source === 'palier')
    .map(({ rang }) => rang)
}

/**
 * Le rang qu'un droit d'échelon de ce niveau occupe parmi les droits triés
 * par date — la place que son don doit prendre dans l'agrégat quand
 * l'emplacement en reçoit un pour la première fois (retour d'un troc D18).
 *
 * Même invariant que `rangDuDroitDePalier` : la fiche range ses prises dans
 * l'ordre des droits qu'elles consomment.
 */
function rangDuDroitDEchelon(datees: readonly DonDate[], niveau: number): number {
  const apres = datees.findIndex(
    (instance) =>
      instance.niveau === undefined ||
      instance.niveau > niveau ||
      (instance.niveau === niveau && instance.source !== 'echelon'),
  )
  return apres < 0 ? datees.length : apres
}

// ---------------------------------------------------------------------------
// Les emplacements d'un niveau : ce qu'il porte, et ce qu'on y pose
// ---------------------------------------------------------------------------

/** La clé d'un `Record` rangé par niveau, posée à son RANG numérique. */
function avecCle<T>(
  record: Readonly<Record<string, T>>,
  cle: string,
  valeur: T | undefined,
): Record<string, T> {
  if (valeur === undefined) {
    const suite = { ...record }
    delete suite[cle]
    return suite
  }
  // Déjà présente : elle garde sa place (l'ordre d'insertion ne bouge pas).
  if (Object.prototype.hasOwnProperty.call(record, cle)) return { ...record, [cle]: valeur }
  const suite: Record<string, T> = {}
  let posee = false
  for (const [autre, porte] of Object.entries(record)) {
    if (!posee && Number(autre) > Number(cle)) {
      suite[cle] = valeur
      posee = true
    }
    suite[autre] = porte
  }
  if (!posee) suite[cle] = valeur
  return suite
}

function ficheDe(personnage: Personnage): FicheCreation {
  return personnage.creation ?? {}
}

/**
 * Les choix D'ALORS d'une montée traversée, retrouvés des DONNÉES — jamais
 * d'un champ qui les aurait stockés (il n'en existe pas, et D7 interdit d'en
 * ajouter un). C'est ce qui pré-remplit l'écran rouvert.
 */
export function choixDAlors(personnage: Personnage, niveau: number): ChoixMontee {
  const fiche = ficheDe(personnage)
  const cle = String(niveau)
  const choix: ChoixMontee = {}

  const capacite = fiche.capNiveaux?.[cle]
  if (capacite) choix.capacite = capacite
  const donTroque = fiche.donNiveaux?.[cle]
  if (donTroque) choix.donTroque = donTroque
  const capTroquee = fiche.capDons?.[cle]
  if (capTroquee) choix.capTroquee = capTroquee

  const datees = instancesDatees(fiche)
  const echelon = rangsDeLEchelon(datees, niveau)
  if (echelon.length > 0) choix.don = datees[echelon[0]].id

  // Le don du palier n'appartient à CE niveau que si c'est là que l'Esprit a
  // atteint son palier — sinon il vit sous un autre échelon, qu'on ne touche pas.
  if (niveauPalierEsprit3(fiche) === niveau) {
    const palier = rangsDuPalier(datees)
    if (palier.length > 0) choix.donPalier = datees[palier[0]].id
  }

  const carac = (Object.keys(caracsDuNiveau(fiche, niveau)) as CleCarac[])[0]
  if (carac) choix.carac = carac

  return choix
}

/**
 * Les choix d'alors, RETOUCHÉS par ce que le joueur pose. Les emplacements
 * exclusifs (D18) ne portent jamais les deux : poser un don dans
 * l'emplacement de capacité en retire la capacité, et réciproquement.
 */
export function fusionnerChoix(alors: ChoixMontee, neuf: ChoixMontee): ChoixMontee {
  const choix: ChoixMontee = { ...alors, ...neuf }
  if (neuf.capacite !== undefined) delete choix.donTroque
  if (neuf.donTroque !== undefined) delete choix.capacite
  if (neuf.don !== undefined) delete choix.capTroquee
  if (neuf.capTroquee !== undefined) delete choix.don
  return choix
}

interface OptionsApplique {
  /** L'emplacement de don qu'on VIDE (pour juger un bassin sans qu'il se réponde). */
  sauf?: EmplacementDeDon
  /** Faux : on pose les choix sans faire tomber ce qui en dépend. */
  cascade: boolean
}

/**
 * Le cœur : la fiche telle que les choix la feraient, et ce qu'elle perd.
 *
 * Un seul passage sur la liste ordonnée des instances — les emplacements du
 * niveau y sont REMPLACÉS à leur place, et les droits disparus y sont
 * RETIRÉS de la leur. Les deux se décident sur la fiche D'AVANT : elle seule
 * sait encore à quel droit chaque prise répond.
 */
function appliquer(
  avant: FicheCreation,
  niveau: number,
  choix: ChoixMontee,
  options: OptionsApplique,
): { fiche: FicheCreation; pertes: Perte[] } {
  const cle = String(niveau)
  const gains = gainsMontee(niveau)
  const datees = instancesDatees(avant)
  const instances = instancesDeLAgregat(avant)
  const pertes: Perte[] = []

  // ── Les emplacements de l'échelon ────────────────────────────────────────
  const capNiveaux = avecCle(avant.capNiveaux ?? {}, cle, choix.capacite)
  const donNiveaux = avecCle(
    avant.donNiveaux ?? {},
    cle,
    options.sauf === 'donTroque' ? undefined : choix.donTroque,
  )
  const capTroquee = options.sauf === 'don' ? undefined : choix.capTroquee
  const capDons = avecCle(avant.capDons ?? {}, cle, capTroquee)

  const remplaces = new Map<number, string | undefined>()
  const rangsEchelon = gains.dons > 0 ? rangsDeLEchelon(datees, niveau) : []
  const poseEchelon =
    gains.dons > 0 && capTroquee === undefined && options.sauf !== 'don' ? choix.don : undefined
  for (const rang of rangsEchelon) remplaces.set(rang, poseEchelon)

  // ── L'emplacement du palier, quand il est daté de CE niveau ──────────────
  const rangsPalier = rangsDuPalier(datees)
  if (niveauPalierEsprit3(avant) === niveau) {
    const posePalier = options.sauf === 'donPalier' ? undefined : choix.donPalier
    if (posePalier !== undefined || options.sauf === 'donPalier') {
      for (const rang of rangsPalier) remplaces.set(rang, posePalier)
    }
  }

  // ── La cascade : le droit de palier que le point retiré emporte ──────────
  // ⚠️ Elle se décide sur l'Esprit d'AVANT et celui d'APRÈS, jamais sur la
  // fiche corrigée : une fois le point déplacé, le droit a déjà disparu et
  // plus aucune instance ne porte la source `palier`.
  const ancienne = (Object.keys(caracsDuNiveau(avant, niveau)) as CleCarac[])[0]
  const espritAvant = valeurCarac(avant, 'e')
  const espritApres =
    espritAvant -
    (caracsDuNiveau(avant, niveau).e ?? 0) +
    (choix.carac === 'e' ? gains.caracPoints : 0)
  const source = ancienne ? `${NOMS_CARAC[ancienne]} ${valeurCarac(avant, ancienne)}` : ''
  const perdus = options.cascade
    ? Math.max(0, donsDuPalierEsprit(espritAvant) - donsDuPalierEsprit(espritApres))
    : 0
  // Les DERNIERS droits de palier tombent en premier — même convention que
  // `droitsPourAppariement`, pour que l'appariement reste juste après coup.
  const tombes = perdus > 0 ? rangsPalier.slice(-perdus) : []
  for (const rang of tombes) {
    const instance = datees[rang]
    remplaces.set(rang, undefined)
    pertes.push({
      nom: nomDuDon(instance.id),
      type: 'don',
      niveau: instance.niveau,
      source,
      gratuit: instance.source !== 'achat',
    })
  }

  // ── La liste ordonnée, en un passage ─────────────────────────────────────
  let suite = instances
    .map((id, rang) => (remplaces.has(rang) ? remplaces.get(rang) : id))
    .filter((id): id is string => id !== undefined)

  // L'échelon n'avait aucune instance (son droit était parti dans une
  // capacité troquée) et il reçoit un don : il s'insère à SON rang.
  if (poseEchelon !== undefined && rangsEchelon.length === 0) {
    const brut = rangDuDroitDEchelon(datees, niveau)
    const retiresAvant = [...remplaces.entries()].filter(
      ([rang, pose]) => pose === undefined && rang < brut,
    ).length
    const ou = Math.max(0, brut - retiresAvant)
    suite = [
      ...suite.slice(0, ou),
      ...Array.from({ length: gains.dons }, () => poseEchelon),
      ...suite.slice(ou),
    ]
  }

  // ⛔ La correction ne fait pas APPARAÎTRE de clé que la fiche n'avait pas :
  // un emplacement de troc resté vide reste absent, comme avant. C'est ce qui
  // rend le diff exactement égal à « le choix changé ∪ les pertes nommées ».
  const fiche: FicheCreation = { ...avant }
  fiche.historique = historiqueCorrige(avant, niveau, choix.carac, gains.caracPoints)
  poser(fiche, avant, 'capNiveaux', capNiveaux)
  poser(fiche, avant, 'donNiveaux', donNiveaux)
  poser(fiche, avant, 'capDons', capDons)
  poser(fiche, avant, 'dons', agregatDesInstances(suite))
  if (avant.extras !== undefined || gains.caracPoints > 0) {
    fiche.extras = extrasCorriges(avant, niveau, choix.carac, gains.caracPoints)
  }

  // ── Les langues en trop : le droit se RECOMPTE, la fin de la liste part ──
  if (options.cascade) {
    const langChoix = [...(fiche.langChoix ?? [])]
    const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])
    const enTrop = Math.max(0, langChoix.length - droit)
    if (enTrop > 0) {
      const retirees = langChoix.splice(langChoix.length - enTrop, enTrop)
      fiche.langChoix = langChoix
      for (const id of retirees) {
        pertes.push({
          nom: nomDeLaLangue(id),
          type: 'langue',
          niveau: niveauPalierEsprit3(avant),
          source,
          gratuit: true,
        })
      }
    }
  }

  return { fiche, pertes }
}

/**
 * Pose un `Record` sur la fiche corrigée — et l'EFFACE quand il est vide et
 * que la fiche d'avant ne le portait pas. Une clé déjà là garde sa place :
 * l'ordre d'insertion d'un objet JS ne bouge pas quand on réaffecte une clé.
 */
function poser<C extends 'capNiveaux' | 'donNiveaux' | 'capDons' | 'dons'>(
  fiche: FicheCreation,
  avant: FicheCreation,
  cle: C,
  valeur: NonNullable<FicheCreation[C]>,
): void {
  if (Object.keys(valeur).length === 0 && avant[cle] === undefined) {
    delete fiche[cle]
    return
  }
  fiche[cle] = valeur as FicheCreation[C]
}

/**
 * L'historique corrigé : l'entrée du niveau garde son `niveau` et son `le` —
 * seul son `caracs` change quand le point bouge de colonne. ⛔ Aucune entrée
 * ajoutée ni retirée.
 */
function historiqueCorrige(
  fiche: FicheCreation,
  niveau: number,
  carac: CleCarac | undefined,
  points: number,
): EntreeNiveau[] {
  return historiqueDe(fiche).map((entree) => {
    if (entree.niveau !== niveau) return entree
    const suite: EntreeNiveau = { niveau: entree.niveau, le: entree.le }
    if (points > 0 && carac) suite.caracs = { [carac]: points }
    return suite
  })
}

/** Les points en plus, repris à l'une et donnés à l'autre — jamais inventés. */
function extrasCorriges(
  fiche: FicheCreation,
  niveau: number,
  carac: CleCarac | undefined,
  points: number,
): { p: number; r: number; e: number } {
  const extras = { p: 0, r: 0, e: 0, ...(fiche.extras ?? {}) }
  if (points <= 0) return extras
  for (const [cle, n] of Object.entries(caracsDuNiveau(fiche, niveau))) {
    extras[cle as CleCarac] -= n
  }
  if (carac) extras[carac] += points
  return extras
}

// ---------------------------------------------------------------------------
// La correction, en entier
// ---------------------------------------------------------------------------

/**
 * La correction d'un choix d'une montée traversée : la fiche candidate, ce
 * qu'elle perd (chacun nommé), ce qui reste, et le bilan de ce qui change
 * vraiment.
 *
 * `nouveauChoix` RETOUCHE les choix d'alors : un emplacement qu'il ne nomme
 * pas garde ce qu'il portait. Une montée n'a pas d'emplacement vide — on
 * corrige un choix, on ne le retire pas.
 */
export function corrigerChoix(
  personnage: Personnage,
  niveau: number,
  nouveauChoix: ChoixMontee,
): Correction {
  const avant = ficheDe(personnage)
  const choix = fusionnerChoix(choixDAlors(personnage, niveau), nouveauChoix)
  const { fiche, pertes } = appliquer(avant, niveau, choix, { cascade: true })
  return { fiche, pertes, reste: resteDe(fiche, pertes), bilan: bilanDe(avant, fiche) }
}

/**
 * Ce qui SURVIT, et qu'on montre pour le dire : les capacités (elles viennent
 * des niveaux, pas des caractéristiques), les dons qui gardent leur droit, et
 * — quand une langue tombe — celles qui restent.
 *
 * ⛔ Dérivé de la fiche corrigée, jamais énuméré à la main.
 */
function resteDe(fiche: FicheCreation, pertes: readonly Perte[]): Reste[] {
  const reste: Reste[] = []

  const capacites = capacitesDeLaFiche(fiche).map(({ capacite }) => ({
    nom: capacite.nom,
    niveau: capacite.niveau,
  }))
  if (capacites.length > 0) reste.push({ type: 'capacite', items: capacites })

  const datees = datesDesDons(fiche)
  const dons = Object.entries(donsPris(fiche)).map(([id, n]) => ({
    nom: n > 1 ? `${nomDuDon(id)} ×${n}` : nomDuDon(id),
    niveau: datees.find((instance) => instance.id === id)?.niveau,
  }))
  if (dons.length > 0) reste.push({ type: 'don', items: dons })

  if (pertes.some((perte) => perte.type === 'langue')) {
    const langues = [
      ...languesAcquises(fiche.race, fiche.classe),
      ...(fiche.langChoix ?? []),
    ].map((id) => ({ nom: nomDeLaLangue(id) }))
    if (langues.length > 0) reste.push({ type: 'langue', items: langues })
  }

  return reste
}

/** Le nombre de prises de don que la fiche porte, trocs compris. */
function nombreDeDons(fiche: FicheCreation): number {
  return consommationDons(donsPris(fiche))
}

/** Le nombre de langues du personnage : celles d'office et celles au choix. */
function nombreDeLangues(fiche: FicheCreation): number {
  return languesAcquises(fiche.race, fiche.classe).length + (fiche.langChoix ?? []).length
}

/**
 * Le bilan : ⛔ SEULEMENT ce qui change vraiment. Une caractéristique qui ne
 * bouge pas n'a pas de ligne ; un effet de table qui reste au même chiffre
 * n'en a pas non plus (mesuré au corpus 1.3.1 : le mana ne bouge pas entre
 * Esprit 2 et Esprit 3 — la fenêtre ne le montre alors pas).
 */
function bilanDe(avant: FicheCreation, apres: FicheCreation): LigneBilan[] {
  const bilan: LigneBilan[] = []
  const statsAvant = statsDe(avant) as unknown as Record<string, number> | undefined
  const statsApres = statsDe(apres) as unknown as Record<string, number> | undefined

  for (const cle of ['p', 'r', 'e'] as CleCarac[]) {
    const a = valeurCarac(avant, cle)
    const b = valeurCarac(apres, cle)
    if (a === b) continue
    const effets: EffetDeTable[] = []
    for (const champ of effetsDeLaTable(cle)) {
      const valeurAvant = statsAvant?.[champ]
      const valeurApres = statsApres?.[champ]
      if (typeof valeurAvant !== 'number' || typeof valeurApres !== 'number') continue
      if (valeurAvant === valeurApres) continue
      effets.push({ quoi: NOMS_EFFET[champ] ?? champ, avant: valeurAvant, apres: valeurApres })
    }
    const ligne: LigneBilan = { quoi: NOMS_CARAC[cle], avant: a, apres: b }
    if (effets.length > 0) ligne.effets = effets
    bilan.push(ligne)
  }

  const donsAvant = nombreDeDons(avant)
  const donsApres = nombreDeDons(apres)
  if (donsAvant !== donsApres) bilan.push({ quoi: 'Dons', avant: donsAvant, apres: donsApres })

  const languesAvant = nombreDeLangues(avant)
  const languesApres = nombreDeLangues(apres)
  if (languesAvant !== languesApres) {
    bilan.push({ quoi: 'Langues', avant: languesAvant, apres: languesApres })
  }

  return bilan
}

// ---------------------------------------------------------------------------
// Ce que l'écran rouvert propose — les bassins, jamais réimplémentés
// ---------------------------------------------------------------------------

/**
 * La fiche telle que les choix EN COURS la feraient, cascade comprise. C'est
 * elle qu'on interroge pour les bassins : l'anti-doublon porte alors sur
 * TOUTES les prises conservées de la fiche, pas seulement celles ≤ N.
 */
export function ficheDeLaCorrection(
  personnage: Personnage,
  niveau: number,
  choix: ChoixMontee = {},
): FicheCreation {
  return corrigerChoix(personnage, niveau, choix).fiche
}

/**
 * Ce que le sélecteur de capacités montre pour l'emplacement du niveau
 * corrigé : le bassin D16 — capacités de la classe de niveau ≤ N, ce qui est
 * pris ailleurs rayé. ⛔ Rien n'est réimplémenté : c'est `optionsDuNiveau`,
 * exactement comme la création et la montée.
 */
export function optionsDeLaCorrection(
  personnage: Personnage,
  niveau: number,
  choix: ChoixMontee = {},
): OptionDeCapacite[] {
  return optionsDuNiveau(ficheDeLaCorrection(personnage, niveau, choix), niveau)
}

/** D18 — les dons offerts DANS l'emplacement de capacité (troc du guerrier). */
export function optionsDeTrocDeLaCorrection(
  personnage: Personnage,
  niveau: number,
  choix: ChoixMontee = {},
): OptionDeDon[] {
  return optionsDeTrocDon(ficheDeLaCorrection(personnage, niveau, choix), { niveau })
}

/** D18 — les capacités offertes DANS l'emplacement de don (troc du mage). */
export function optionsDeTrocDeDonDeLaCorrection(
  personnage: Personnage,
  niveau: number,
  choix: ChoixMontee = {},
): OptionDeCapacite[] {
  const fiche = ficheDeLaCorrection(personnage, niveau, choix)
  return optionsDeTrocCapacite(fiche, niveau, prisesAilleurs(fiche, { echelonDon: niveau }))
}

/**
 * Ce don peut-il occuper CET emplacement de la correction ? La règle n'est
 * pas réécrite : c'est celle de `refusDons` — un don non cumulable ne se
 * prend qu'une fois — appliquée à la fiche PRIVÉE du contenu de cet
 * emplacement, sinon le don déjà posé se répondrait « déjà pris » à lui-même.
 */
export function donPrenableALaCorrection(
  personnage: Personnage,
  niveau: number,
  id: string,
  choix: ChoixMontee = {},
  emplacement: EmplacementDeDon = 'don',
): boolean {
  const don = listeDons().find((candidat) => candidat.id === id)
  if (!don) return false
  const complet = fusionnerChoix(choixDAlors(personnage, niveau), choix)
  const { fiche } = appliquer(ficheDe(personnage), niveau, complet, {
    sauf: emplacement,
    cascade: false,
  })
  return don.cumulable || (donsPris(fiche)[id] ?? 0) === 0
}

/** Vrai quand chaque emplacement du niveau corrigé porte bien un choix. */
export function correctionComplete(
  personnage: Personnage,
  niveau: number,
  choix: ChoixMontee = {},
): boolean {
  return manquesDeLaCorrection(personnage, niveau, choix).length === 0
}

/** Le même critère, mais qui NOMME ce qui manque (diagnostic des gates). */
export function manquesDeLaCorrection(
  personnage: Personnage,
  niveau: number,
  choix: ChoixMontee = {},
): string[] {
  const complet = fusionnerChoix(choixDAlors(personnage, niveau), choix)
  const gains = gainsMontee(niveau)
  const manques: string[] = []
  if (!complet.capacite && !complet.donTroque) manques.push('capacité non choisie')
  if (complet.capacite && complet.donTroque) {
    manques.push('capacité et don dans le même emplacement')
  }
  if (gains.dons > 0 && !complet.don && !complet.capTroquee) manques.push('don non choisi')
  if (complet.don && complet.capTroquee) manques.push('don et capacité dans le même emplacement')
  if (gains.caracPoints > 0 && !complet.carac) manques.push('caractéristique non choisie')
  return manques
}

/**
 * Le niveau demandé est-il CORRIGEABLE ?
 *
 * Ligne de coupe 1 : seules les montées TRAVERSÉES se touchent — la création
 * (le premier échelon de la table) n'en est pas une, et le niveau courant non
 * plus. ⚠️ ≤11 : le niveau s'y déclare, il n'y a ni montée ni historique —
 * rien n'y est corrigeable.
 */
export function niveauCorrigeable(personnage: Personnage, niveau: number): boolean {
  const fiche = ficheDe(personnage)
  if (fiche.enfant) return false
  if (!Array.isArray(fiche.historique)) return false
  const premier = historiqueDe(fiche)[0]?.niveau
  if (premier === undefined || niveau <= premier) return false
  return niveau < niveauCourant(fiche)
}
