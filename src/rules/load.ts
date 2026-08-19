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

export type BonusRace =
  | string
  | { nom: string; verbatim: string }
  | { choix: string[] }

export interface Race {
  id: string
  nom: string
  faction: string
  bonus: BonusRace[]
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
  variante_xp?: number
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

export interface PalierPuissance {
  lutte: number
  degats: number
}

export interface PalierResistance {
  pv: number
  sauvegardes: number
}

export interface PalierEsprit {
  mana: number
  dons: number
  langues: number
  illettre: boolean
}

export interface LigneEvolution {
  niv: number
  dons: number
  carac?: string
  competence?: number
}

export interface Faction {
  id: string
  nom: string
  verbatim: string
}

export interface ClasseSquelette {
  id: string
  nom: string
  faction: string
  pv_base: number
  mana_base: number
  branches: string[]
  code?: string
  echange?: string
  focus_requis?: string
  ressource_speciale?: { nom: string; verbatim: string; max?: number }
}

export interface Rules {
  meta: Meta
  caracteristiques: {
    creation: {
      repartition: number[]
      verbatim: string
      max: number
    }
    table: {
      puissance: Record<string, string>
      resistance: Record<string, string>
      esprit: Record<string, string>
    }
    table_cumulative: {
      regle: string
      puissance: Record<string, PalierPuissance>
      resistance: Record<string, PalierResistance>
      esprit: Record<string, PalierEsprit>
    }
    illettre: { verbatim: string }
  }
  evolution: {
    regles: { montee: string; au_dela_niv5: string }
    table: LigneEvolution[]
  }
  factions: {
    liste: Faction[]
    avantage_de_depart: { regle: string; critere: string; consequence_ui: string }
  }
  races: { liste: Race[] }
  langues: { regle: string; liste: Langue[] }
  dons: { intro: string; liste: Don[] }
  competences: {
    regle_niv1: string
    simples: CompetenceSimple[]
    artisanats: {
      verbatim_interdiction: string
      max_par_personnage: number
      interdit_tranche: string
      liste: Artisanat[]
    }
  }
  heritage: {
    regle_generale: string
    xp_permanent: string
    xp_temporaire: string
    desavantages: {
      regle_plafond: { verbatim: string; application_wizard: string }
      liste: Desavantage[]
    }
    avantages: { liste: AvantageHeritage[] }
  }
  classes_squelette: { liste: ClasseSquelette[] }
  plafonds: {
    pv_max: { valeur: number; verbatim: string; exception: string }
  }
  age_et_gates: {
    seuil: { enfant: string; joueur_regulier: string }
    regles_simplifiees_11_et_moins: { ligne_de_coupe: string }
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
