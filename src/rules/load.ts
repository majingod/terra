/**
 * Chargement des règles — D5 : une règle vit dans src/data/rules.json et
 * nulle part ailleurs. Ce module ne recopie AUCUN nom ni AUCUN chiffre de
 * règle : il ne fait que typer et exposer le contenu du fichier.
 *
 * Les interfaces ci-dessous décrivent la FORME du fichier (noms de champs du
 * schéma), jamais son contenu. L'affectation de conformité en bas du module
 * fait vérifier par tsc que rules.json respecte bien cette forme.
 */
import rulesJson from '../data/rules.json'

export interface Source {
  page?: number
  pages?: number[]
  section?: string
}

export interface Meta {
  fichier: string
  version: string
  date: string
  compose_de: string
  corrections_vs_lot1: string
  source: string
  normalisation_verbatim: string
  regle_maison: string
  version_affichee: string
}

export interface Langue {
  id: string
  nom: string
  restriction?: string
}

export interface Race {
  id: string
  nom: string
  faction: string
  bonus: unknown[]
  malus?: unknown[]
  description_physique: string
  langues_depart: string[]
}

export interface Don {
  id: string
  nom: string
  verbatim: string
  cumulable?: boolean
}

export interface CompetenceSimple {
  id: string
  nom: string
  materiel?: string
  base: string
  avance: string
}

export interface CapaciteArtisanat {
  nom: string
  verbatim: string
  note?: string
}

export interface Artisanat {
  id: string
  nom: string
  alias_possible?: string
  materiel?: string
  restriction?: string
  capacites: CapaciteArtisanat[]
}

export interface Desavantage {
  id: string
  nom: string
  xp: number
  verbatim: string
  note?: string
  variante_xp?: unknown
  interdit_classes?: string[]
}

export interface AvantageHeritage {
  achat: string
  cout_xp: number
  max_achats?: number
  restriction?: string
}

export interface Capacite {
  id: string
  niveau: number
  nom: string
  verbatim: string
}

export interface CapaciteDeBase {
  id: string
  nom: string
  verbatim: string
}

export interface Branche {
  id: string
  nom: string
  capacites: Capacite[]
}

export interface ClasseBranches {
  classe_id: string
  source: Source
  capacites_de_base: CapaciteDeBase[]
  branches: Branche[]
}

export interface Rules {
  meta: Meta
  caracteristiques: {
    creation: {
      repartition: number[]
      verbatim: string
      max: number
    }
  }
  races: { liste: Race[] }
  langues: { liste: Langue[] }
  dons: { liste: Don[] }
  competences: {
    simples: CompetenceSimple[]
    artisanats: {
      max_par_personnage: number
      interdit_tranche: string
      liste: Artisanat[]
    }
  }
  heritage: {
    desavantages: { liste: Desavantage[] }
    avantages: { liste: AvantageHeritage[] }
  }
  branches_de_classes: { classes: ClasseBranches[] }
}

/**
 * Conformité vérifiée à la compilation : si rules.json cesse de respecter la
 * forme déclarée ci-dessus, `npx tsc --noEmit` échoue ici.
 */
const rules: Rules = rulesJson

export function getRules(): Rules {
  return rules
}

/**
 * Version des règles, lue DEPUIS le fichier (meta.version). Jamais une
 * constante recopiée. Sera affichée dans la fiche au brief #02-b.
 */
export function getVersion(): string {
  return getRules().meta.version
}
