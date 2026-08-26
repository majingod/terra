/**
 * L'encyclopédie D9-ter, en MODÈLE : six onglets, leurs groupes, leurs
 * entrées, dérivés de rules.json et de rien d'autre.
 *
 * ⛔ Zéro texte de règle ici. Tout ce que ce module écrit en clair, ce sont
 * des LIBELLÉS D'ÉCRAN (« Tout ouvrir », « Avantage de base : », « Niveau 3 »)
 * — jamais une phrase du Tome. Chaque texte du Tome voyage sous la forme
 * `SourceDeTexte` (D14 : `affichage ?? verbatim`), et c'est `TexteRegle` qui
 * le rend.
 *
 * Le modèle sert trois choses d'un coup : l'affichage, la recherche (le texte
 * cherchable d'une entrée s'en déduit) et les liens croisés (la table des
 * cibles s'en déduit aussi). Rien n'est écrit deux fois.
 */
import { texteAffiche, type SourceDeTexte } from '../pages/creation/ui'
import { getRules } from '../rules/load'
import type {
  Artisanat,
  BonusRace,
  ClasseSquelette,
  CompetenceSimple,
  Desavantage,
  Don,
  Race,
  Rune,
  SectionDeRegle,
  Substance,
} from '../rules/load'
import { branchesDe, capacitesDeBase } from '../rules/branches'
import { listeDesavantages } from '../rules/heritage'
import { classesSquelette } from '../rules/stats'
import { listeCompetencesSimples, listeDons } from '../rules/talents'
import { decoupeParAncres, sourceDItem } from './texte'

// ---------------------------------------------------------------------------
// Libellés d'écran — permis par D13, ce ne sont pas des règles.
// ---------------------------------------------------------------------------

export const LIBELLES = {
  epingles: '☆ Épinglés',
  regles: 'Règles',
  classes: 'Classes & voies',
  dons: 'Dons',
  competences: 'Compétences',
  desavantages: 'Désavantages',
  chapitre1: 'Chapitre 1 — Les règles de base',
  chapitre2: 'Chapitre 2 — Progression commune',
  lutte: 'Lutte',
  sauvegardes: 'Sauvegardes',
  magie: 'La Magie',
  races: 'Les Races',
  lesClasses: 'Les huit classes',
  lesDons: 'Les Dons',
  leSysteme: 'Compétences',
  metiers: 'Métiers',
  artisanats: 'Artisanats',
  tables: 'Tables de référence',
  desavantagesGroupe: 'Désavantages d’héritage',
  mesEpingles: 'Tes épinglés',
  capacitesDeBase: 'Capacités de base',
  bonus: 'Bonus',
  avantageBase: 'Avantage de base :',
  avantageAvance: 'Avantage avancé :',
  focus: 'Focus :',
  materiel: 'Matériel :',
  valeur: 'Valeur :',
  couleur: 'Couleur :',
  composition: 'Compo :',
  langues: 'Langues :',
  code: 'Code :',
  echange: 'Échange :',
  auChoix: 'Au choix :',
  toutesFactions: 'Toutes factions',
  voie: 'Voie :',
  niveau: 'Niveau',
  cumulable: 'Cumulable',
  runesArme: 'Runes d’arme',
  runesAmulette: 'Runes d’amulette',
  valeurDeBase: 'valeur de base',
  restriction: 'Restriction :',
  ateliers: 'Ateliers de faction',
} as const

/** « Interdit aux 11 ans et moins » — le nombre vient du corpus, pas du code. */
export function libelleInterdiction(): string {
  const tranche = getRules().competences.artisanats.interdit_tranche.replace(/[^0-9]/g, '')
  return `Interdit aux ${tranche} ans et moins`
}

// ---------------------------------------------------------------------------
// Formes du modèle
// ---------------------------------------------------------------------------

export type Ton = 'or' | 'rouge' | 'sanctum' | 'legion'

export interface Pastille {
  texte: string
  ton?: Ton
}

export interface Carte {
  id: string
  nom: string
  pastilles: Pastille[]
  source?: SourceDeTexte
  /** Pastilles posées SOUS le texte (matériel, valeur…). */
  meta: Pastille[]
}

/**
 * Les blocs disent CE QUE MONTRE un corps d'accordéon, dans les termes de la
 * maquette v3.1 : un texte aéré, un lore en italique, les deux avantages d'un
 * métier, le bonus nommé d'une race… L'écran a un rendu par bloc, et un seul.
 */
export type Bloc =
  /** Un long texte du Tome, aéré sur ses étiquettes internes. */
  | { genre: 'texte'; source: SourceDeTexte }
  /** L'ouverture d'un groupe : un paragraphe, sans étiquette interne. */
  | { genre: 'intro'; source: SourceDeTexte }
  /** La couleur d'une race, d'un métier, d'un artisanat. */
  | { genre: 'lore'; source: SourceDeTexte }
  /** Une note encadrée : plafond d'XP, interdiction d'artisanat. */
  | { genre: 'note'; source: SourceDeTexte }
  /** Les deux avantages d'un métier (p.15-16). */
  | { genre: 'avantages'; avantageBase: SourceDeTexte; avantageAvance: SourceDeTexte }
  /** Le bonus NOMMÉ d'une race (« Transfère. », « Esquive. »). */
  | { genre: 'bonusNomme'; nom: string; source: SourceDeTexte }
  /** Un trait de classe sous son libellé d'écran (Code, Échange, ressource). */
  | { genre: 'trait'; etiquette: string; source: SourceDeTexte }
  /** La restriction d'un artisanat. */
  | { genre: 'restriction'; source: SourceDeTexte }
  | { genre: 'pastilles'; pastilles: Pastille[] }
  | { genre: 'titre'; titre: string }
  | { genre: 'definitions'; items: Array<{ nom: string; source: SourceDeTexte }> }
  | { genre: 'cartes'; cartes: Carte[]; metaAvant?: boolean }
  | { genre: 'tableau'; colonnes: string[]; lignes: string[][] }
  | { genre: 'sous'; entrees: Entree[] }

export interface Entree {
  id: string
  titre: string
  pastilles: Pastille[]
  blocs: Bloc[]
  /**
   * Entrée d'appoint (intro, annexe) : elle s'affiche, mais ne compte pas
   * dans le compteur de l'onglet, qui dit le nombre d'entrées du catalogue.
   */
  horsCompte?: boolean
}

export interface Groupe {
  id: string
  titre: string
  /** Ce qui précède les accordéons du groupe : intro, note de plafond… */
  entete: Bloc[]
  entrees: Entree[]
}

export type OngletId = 'epingles' | 'regles' | 'classes' | 'dons' | 'competences' | 'desavantages'

export interface Onglet {
  id: OngletId
  nom: string
  groupes: Groupe[]
}

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------

/** Les diacritiques Unicode, sans écrire la moindre séquence d'échappement. */
const DIACRITIQUES = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  'g',
)

/** Un fragment d'identifiant stable, tiré d'un nom du corpus. */
export function fragment(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Une source de texte du Tome, à partir de ses deux champs (D14). */
function source(verbatim?: string, affichage?: string): SourceDeTexte | undefined {
  if (affichage !== undefined) return { verbatim, affichage }
  if (verbatim !== undefined) return { verbatim }
  return undefined
}

function texte(verbatim?: string, affichage?: string): Bloc[] {
  const s = source(verbatim, affichage)
  return s ? [{ genre: 'texte', source: s }] : []
}

function intro(verbatim?: string, affichage?: string): Bloc[] {
  const s = source(verbatim, affichage)
  return s ? [{ genre: 'intro', source: s }] : []
}

function pastille(texteDeLaPastille: string, ton?: Ton): Pastille {
  return ton ? { texte: texteDeLaPastille, ton } : { texte: texteDeLaPastille }
}

/** Le ton d'une faction : sa peau visuelle, jamais un texte de règle. */
function tonDeFaction(factionId: string): Ton | undefined {
  if (factionId === 'sanctum') return 'sanctum'
  if (factionId === 'legion') return 'legion'
  return undefined
}

function pastilleDeFaction(factionId: string): Pastille {
  const faction = getRules().factions.liste.find((f) => f.id === factionId)
  return pastille(faction ? faction.nom : LIBELLES.toutesFactions, tonDeFaction(factionId))
}

/** Le nom d'une langue, lu du corpus ; à défaut, son identifiant. */
function nomDeLangue(id: string): string {
  return getRules().langues.liste.find((l) => l.id === id)?.nom ?? id
}

function lignesDeTableau(
  colonnes: string[],
  lignes: Array<Record<string, string>>,
): string[][] {
  return lignes.map((ligne) => {
    const valeurs = Object.values(ligne)
    return colonnes.map((_, i) => valeurs[i] ?? '')
  })
}

// ---------------------------------------------------------------------------
// Onglet « Règles »
// ---------------------------------------------------------------------------

/** Une section du chapitre 1 : tableau, items tranchés par ancres, ou texte. */
function blocsDeSection(section: SectionDeRegle): Bloc[] {
  if (section.colonnes && section.lignes) {
    return [
      { genre: 'tableau', colonnes: section.colonnes, lignes: lignesDeTableau(section.colonnes, section.lignes) },
    ]
  }
  const affiche = section.verbatim === undefined && section.affichage === undefined
    ? undefined
    : texteAffiche({ verbatim: section.verbatim, affichage: section.affichage } as SourceDeTexte)
  if (affiche === undefined) return []
  if (section.presentation) {
    const decoupe = decoupeParAncres(affiche, section.presentation)
    if (decoupe) {
      const intro: Bloc[] = decoupe.avant ? [{ genre: 'texte', source: { verbatim: decoupe.avant } }] : []
      if (section.presentation.avec_prefixe) {
        return [
          ...intro,
          {
            genre: 'cartes',
            cartes: decoupe.items.map((item) => ({
              id: `etat:${fragment(item.nom)}`,
              nom: item.nom,
              pastilles: [],
              meta: [],
              source: sourceDItem(item),
            })),
          },
        ]
      }
      return [
        ...intro,
        {
          genre: 'definitions',
          items: decoupe.items.map((item) => ({ nom: item.nom, source: sourceDItem(item) })),
        },
      ]
    }
  }
  return [{ genre: 'texte', source: { verbatim: affiche } }]
}

function bonusDeRace(bonus: BonusRace): Bloc {
  if (typeof bonus === 'string') {
    return { genre: 'pastilles', pastilles: [pastille(bonus, 'or')] }
  }
  if ('choix' in bonus) {
    return {
      genre: 'pastilles',
      pastilles: [
        pastille(LIBELLES.auChoix),
        ...bonus.choix.map((valeur) => pastille(valeur, 'or')),
      ],
    }
  }
  return { genre: 'bonusNomme', nom: bonus.nom, source: { verbatim: bonus.verbatim } }
}

function entreeDeRace(race: Race): Entree {
  const langues = race.langues_depart.map(nomDeLangue).join(', ')
  return {
    id: `race:${race.id}`,
    titre: race.nom,
    pastilles: [pastilleDeFaction(race.faction)],
    blocs: [
      ...(race.lore_verbatim ? [{ genre: 'lore' as const, source: { verbatim: race.lore_verbatim } }] : []),
      {
        genre: 'pastilles',
        pastilles: [
          pastilleDeFaction(race.faction),
          pastille(race.description_physique),
          pastille(`${LIBELLES.langues} ${langues}`),
        ],
      },
      { genre: 'titre', titre: LIBELLES.bonus },
      ...race.bonus.map(bonusDeRace),
    ],
  }
}

function ongletRegles(): Onglet {
  const regles = getRules()
  const ch1: Entree[] = regles.regles_de_base.sections.map((section) => ({
    id: `regle:${section.id}`,
    titre: section.titre,
    pastilles: [],
    blocs: blocsDeSection(section),
  }))
  const ch2: Entree[] = [
    { id: 'regle:lutte', titre: LIBELLES.lutte, pastilles: [], blocs: texte(regles.lutte.verbatim, regles.lutte.affichage) },
    {
      id: 'regle:sauvegardes',
      titre: LIBELLES.sauvegardes,
      pastilles: [],
      blocs: texte(regles.sauvegardes.verbatim, regles.sauvegardes.affichage),
    },
    { id: 'regle:magie', titre: LIBELLES.magie, pastilles: [], blocs: texte(regles.magie.verbatim, regles.magie.affichage) },
    {
      id: 'regle:races',
      titre: LIBELLES.races,
      pastilles: [],
      blocs: [
        ...texte(regles.races.intro_verbatim),
        { genre: 'sous', entrees: regles.races.liste.map(entreeDeRace) },
      ],
    },
  ]
  return {
    id: 'regles',
    nom: LIBELLES.regles,
    groupes: [
      { id: 'ch1', titre: LIBELLES.chapitre1, entete: [], entrees: ch1 },
      { id: 'ch2', titre: LIBELLES.chapitre2, entete: [], entrees: ch2 },
    ],
  }
}

// ---------------------------------------------------------------------------
// Onglet « Classes & voies »
// ---------------------------------------------------------------------------

function entreeDeClasse(classe: ClasseSquelette): Entree {
  const focus = classe.focus_requis
  const cartesDeBase: Carte[] = capacitesDeBase(classe.id).map((capacite) => ({
    id: `capacite:${capacite.id}`,
    nom: capacite.nom,
    pastilles: [],
    meta: [],
    source: source(capacite.verbatim, capacite.affichage),
  }))
  const voies: Entree[] = branchesDe(classe.id).map((voie) => ({
    id: `voie:${classe.id}:${voie.id}`,
    titre: `${LIBELLES.voie} ${voie.nom}`,
    pastilles: [],
    blocs: [
      {
        genre: 'cartes',
        cartes: voie.capacites.map((capacite) => ({
          id: `capacite:${capacite.id}`,
          nom: capacite.nom,
          pastilles: [pastille(`${LIBELLES.niveau} ${capacite.niveau}`, 'or')],
          meta: [],
          source: source(capacite.verbatim, capacite.affichage),
        })),
      },
    ],
  }))
  return {
    id: `classe:${classe.id}`,
    titre: classe.nom,
    pastilles: [
      pastilleDeFaction(classe.faction),
      pastille(`${classe.pv_base} PV`),
      pastille(`${classe.mana_base} Mana`),
    ],
    blocs: [
      ...(focus ? [{ genre: 'pastilles' as const, pastilles: [pastille(`${LIBELLES.focus} ${texteAffiche({ verbatim: focus })}`)] }] : []),
      ...(classe.echange
        ? [{ genre: 'trait' as const, etiquette: LIBELLES.echange, source: { verbatim: classe.echange } }]
        : []),
      ...(classe.code
        ? [{ genre: 'trait' as const, etiquette: LIBELLES.code, source: { verbatim: classe.code } }]
        : []),
      ...(classe.ressource_speciale
        ? [
            {
              genre: 'trait' as const,
              etiquette: `${classe.ressource_speciale.nom} :`,
              source: { verbatim: classe.ressource_speciale.verbatim },
            },
          ]
        : []),
      { genre: 'titre', titre: LIBELLES.capacitesDeBase },
      { genre: 'cartes', cartes: cartesDeBase },
      { genre: 'sous', entrees: voies },
    ],
  }
}

function ongletClasses(): Onglet {
  return {
    id: 'classes',
    nom: LIBELLES.classes,
    groupes: [
      {
        id: 'classes',
        titre: LIBELLES.lesClasses,
        entete: [],
        entrees: classesSquelette().map(entreeDeClasse),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Onglet « Dons »
// ---------------------------------------------------------------------------

function entreeDeDon(don: Don): Entree {
  return {
    id: `don:${don.id}`,
    titre: don.nom,
    pastilles: don.cumulable ? [pastille(LIBELLES.cumulable, 'or')] : [],
    blocs: texte(don.verbatim, don.affichage),
  }
}

function ongletDons(): Onglet {
  return {
    id: 'dons',
    nom: LIBELLES.dons,
    groupes: [
      {
        id: 'dons',
        titre: LIBELLES.lesDons,
        entete: intro(getRules().dons.intro),
        entrees: listeDons().map(entreeDeDon),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Onglet « Compétences »
// ---------------------------------------------------------------------------

function entreeDeMetier(metier: CompetenceSimple): Entree {
  return {
    id: `metier:${metier.id}`,
    titre: metier.nom,
    pastilles: [],
    blocs: [
      ...(metier.description
        ? [{ genre: 'lore' as const, source: { verbatim: metier.description } }]
        : []),
      {
        genre: 'avantages',
        avantageBase: { verbatim: metier.base },
        avantageAvance: { verbatim: metier.avance },
      },
      ...(metier.materiel
        ? [{ genre: 'pastilles' as const, pastilles: [pastille(`${LIBELLES.materiel} ${metier.materiel}`)] }]
        : []),
    ],
  }
}

function entreeDArtisanat(artisanat: Artisanat): Entree {
  return {
    id: `artisanat:${artisanat.id}`,
    titre: artisanat.nom,
    pastilles: [pastille(libelleInterdiction(), 'rouge')],
    blocs: [
      ...(artisanat.description
        ? [{ genre: 'lore' as const, source: { verbatim: artisanat.description } }]
        : []),
      {
        genre: 'cartes',
        cartes: artisanat.capacites.map((capacite) => ({
          id: `artisanat:${artisanat.id}:${fragment(capacite.nom)}`,
          nom: capacite.nom,
          pastilles: [],
          meta: [],
          source: source(capacite.verbatim, capacite.affichage),
        })),
      },
      ...(artisanat.restriction
        ? [{ genre: 'restriction' as const, source: { verbatim: artisanat.restriction } }]
        : []),
      ...(artisanat.materiel
        ? [{ genre: 'pastilles' as const, pastilles: [pastille(`${LIBELLES.materiel} ${artisanat.materiel}`)] }]
        : []),
    ],
  }
}

function entreeDesAteliers(): Entree {
  const ateliers = getRules().competences.artisanats.ateliers
  return {
    id: 'atelier:faction',
    titre: LIBELLES.ateliers,
    pastilles: [],
    horsCompte: true,
    blocs: [
      ...texte(ateliers.verbatim, ateliers.affichage),
      ...texte(ateliers.poste_de_traite.verbatim, ateliers.poste_de_traite.affichage),
      ...texte(ateliers.laboratoire.verbatim, ateliers.laboratoire.affichage),
    ],
  }
}

function carteDeSubstance(substance: Substance): Carte {
  return {
    id: `substance:${fragment(substance.nom)}`,
    nom: substance.nom,
    pastilles: [],
    meta: [
      pastille(`${LIBELLES.couleur} ${substance.couleur}`),
      pastille(`${LIBELLES.composition} ${substance.compo}`),
      pastille(`${LIBELLES.valeur} ${substance.valeur}`),
    ],
    source: { verbatim: substance.effet_verbatim },
  }
}

function carteDeRune(rune: Rune): Carte {
  const materiel = rune.materiel ?? rune.compo
  return {
    id: `rune:${fragment(rune.nom)}`,
    nom: rune.nom,
    pastilles: [],
    meta: [
      ...(materiel ? [pastille(`${LIBELLES.materiel} ${materiel}`)] : []),
      pastille(`${LIBELLES.valeur} ${rune.valeur}`),
    ],
    source: source(rune.effet_verbatim, rune.effet_affichage),
  }
}

function entreesDesTables(): Entree[] {
  const tables = getRules().tables_ch4
  const ressources = tables.ressources
  const colonnes = Object.keys(ressources.lignes[0] ?? {}).map(
    (cle) => cle.charAt(0).toUpperCase() + cle.slice(1),
  )
  return [
    {
      id: 'table:ressources',
      titre: ressources.titre,
      pastilles: [],
      blocs: [{ genre: 'tableau', colonnes, lignes: lignesDeTableau(colonnes, ressources.lignes) }],
    },
    {
      id: 'table:substances',
      titre: tables.substances_alchimiques.titre,
      pastilles: [],
      blocs: [
        {
          genre: 'cartes',
          metaAvant: true,
          cartes: tables.substances_alchimiques.liste.map(carteDeSubstance),
        },
      ],
    },
    {
      id: 'table:forgeron',
      titre: tables.objets_forgeron.titre,
      pastilles: [],
      blocs: [
        {
          genre: 'sous',
          entrees: tables.objets_forgeron.materiaux.map((materiau) => ({
            id: `materiau:${fragment(materiau.materiau)}`,
            titre: `${materiau.materiau} — ${LIBELLES.valeurDeBase} ${materiau.valeur_base}`,
            pastilles: [],
            blocs: [
              {
                genre: 'cartes',
                cartes: materiau.objets.map((objet) => ({
                  id: `objet:${fragment(materiau.materiau)}:${fragment(objet.type)}`,
                  nom: objet.type,
                  pastilles: [],
                  meta: [
                    pastille(`${LIBELLES.materiel} ${objet.materiel}`),
                    pastille(`${LIBELLES.valeur} ${objet.valeur}`),
                  ],
                  source: source(objet.effet_verbatim, objet.effet_affichage),
                })),
              },
            ],
          })),
        },
      ],
    },
    {
      id: 'table:runes',
      titre: texteAffiche({ verbatim: tables.runes.verbatim, affichage: tables.runes.affichage }),
      pastilles: [],
      blocs: [
        {
          genre: 'sous',
          entrees: [
            {
              id: 'runes:arme',
              titre: LIBELLES.runesArme,
              pastilles: [],
              blocs: [{ genre: 'cartes', cartes: tables.runes.runes_arme.map(carteDeRune) }],
            },
            {
              id: 'runes:amulette',
              titre: LIBELLES.runesAmulette,
              pastilles: [],
              blocs: [{ genre: 'cartes', cartes: tables.runes.runes_amulette.map(carteDeRune) }],
            },
          ],
        },
      ],
    },
  ]
}

function ongletCompetences(): Onglet {
  const artisanats = getRules().competences.artisanats
  return {
    id: 'competences',
    nom: LIBELLES.competences,
    groupes: [
      {
        id: 'systeme',
        titre: LIBELLES.leSysteme,
        entete: intro(getRules().competences.intro),
        entrees: [],
      },
      {
        id: 'metiers',
        titre: LIBELLES.metiers,
        entete: [],
        entrees: listeCompetencesSimples().map(entreeDeMetier),
      },
      {
        id: 'artisanats',
        titre: LIBELLES.artisanats,
        entete: [{ genre: 'note', source: { verbatim: artisanats.verbatim_interdiction } }],
        entrees: [...artisanats.liste.map(entreeDArtisanat), entreeDesAteliers()],
      },
      { id: 'tables', titre: LIBELLES.tables, entete: [], entrees: entreesDesTables() },
    ],
  }
}

// ---------------------------------------------------------------------------
// Onglet « Désavantages »
// ---------------------------------------------------------------------------

function entreeDeDesavantage(desavantage: Desavantage): Entree {
  return {
    id: `desavantage:${desavantage.id}`,
    titre: desavantage.nom,
    pastilles: [pastille(`+${desavantage.xp} XP`, 'or')],
    blocs: texte(desavantage.verbatim, desavantage.affichage),
  }
}

function ongletDesavantages(): Onglet {
  const heritage = getRules().heritage.desavantages
  return {
    id: 'desavantages',
    nom: LIBELLES.desavantages,
    groupes: [
      {
        id: 'desavantages',
        titre: LIBELLES.desavantagesGroupe,
        entete: [
          ...intro(heritage.intro.verbatim, heritage.intro.affichage),
          { genre: 'note', source: { verbatim: heritage.regle_plafond.verbatim } },
        ],
        entrees: listeDesavantages().map(entreeDeDesavantage),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Assemblage
// ---------------------------------------------------------------------------

/** Les cinq onglets de contenu, dans l'ordre D9-ter (après « ☆ Épinglés »). */
export function ongletsDeContenu(): Onglet[] {
  return [ongletRegles(), ongletClasses(), ongletDons(), ongletCompetences(), ongletDesavantages()]
}

/** L'ordre D9-ter des six chips : ☆ Épinglés d'abord, Règles à l'atterrissage. */
export const ORDRE_DES_ONGLETS: OngletId[] = [
  'epingles',
  'regles',
  'classes',
  'dons',
  'competences',
  'desavantages',
]

/** L'onglet d'atterrissage : un accueil vide serait ingrat. */
export const ONGLET_INITIAL: OngletId = 'regles'

/** Toutes les entrées de premier niveau d'un onglet. */
export function entreesDe(onglet: Onglet): Entree[] {
  return onglet.groupes.flatMap((groupe) => groupe.entrees)
}

/** Le compteur discret d'un onglet : ses entrées de catalogue. */
export function compteDe(onglet: Onglet): number {
  return entreesDe(onglet).filter((entree) => !entree.horsCompte).length
}

/** Les sous-entrées d'une entrée (voies, races, matériaux…). */
export function sousEntrees(entree: Entree): Entree[] {
  return entree.blocs.flatMap((bloc) => (bloc.genre === 'sous' ? bloc.entrees : []))
}

/** Les cartes d'une entrée, sous-entrées comprises. */
export function cartesDe(entree: Entree): Carte[] {
  return entree.blocs.flatMap((bloc) => {
    if (bloc.genre === 'cartes') return bloc.cartes
    if (bloc.genre === 'sous') return bloc.entrees.flatMap(cartesDe)
    return []
  })
}

/** Tout le texte d'un bloc, mis à plat — la matière de la recherche. */
function texteDeBloc(bloc: Bloc): string {
  switch (bloc.genre) {
    case 'texte':
    case 'intro':
    case 'lore':
    case 'note':
    case 'restriction':
      return texteAffiche(bloc.source)
    case 'avantages':
      return `${texteAffiche(bloc.avantageBase)} ${texteAffiche(bloc.avantageAvance)}`
    case 'bonusNomme':
      return `${bloc.nom} ${texteAffiche(bloc.source)}`
    case 'trait':
      return `${bloc.etiquette} ${texteAffiche(bloc.source)}`
    case 'pastilles':
      return bloc.pastilles.map((p) => p.texte).join(' ')
    case 'titre':
      return bloc.titre
    case 'definitions':
      return bloc.items.map((item) => `${item.nom} ${texteAffiche(item.source)}`).join(' ')
    case 'cartes':
      return bloc.cartes
        .map((carte) =>
          [
            carte.nom,
            ...carte.pastilles.map((p) => p.texte),
            ...carte.meta.map((p) => p.texte),
            carte.source ? texteAffiche(carte.source) : '',
          ].join(' '),
        )
        .join(' ')
    case 'tableau':
      return [...bloc.colonnes, ...bloc.lignes.flat()].join(' ')
    case 'sous':
      return bloc.entrees.map(texteCherchable).join(' ')
  }
}

/** Le texte cherchable d'une entrée : son titre, ses pastilles, son corps. */
export function texteCherchable(entree: Entree): string {
  return [
    entree.titre,
    ...entree.pastilles.map((p) => p.texte),
    ...entree.blocs.map(texteDeBloc),
  ].join(' ')
}

// ---------------------------------------------------------------------------
// Relevés — de quoi mesurer le modèle sans le rendre
// ---------------------------------------------------------------------------

/** Les sources d'un bloc, et celles de ses sous-blocs. */
function sourcesDeBloc(bloc: Bloc, aereesSeulement: boolean): SourceDeTexte[] {
  switch (bloc.genre) {
    case 'texte':
      return [bloc.source]
    case 'intro':
    case 'lore':
    case 'note':
    case 'restriction':
    case 'bonusNomme':
    case 'trait':
      return aereesSeulement ? [] : [bloc.source]
    case 'avantages':
      return aereesSeulement ? [] : [bloc.avantageBase, bloc.avantageAvance]
    case 'definitions':
      return aereesSeulement ? [] : bloc.items.map((item) => item.source)
    case 'cartes':
      return bloc.cartes.flatMap((carte) => (carte.source ? [carte.source] : []))
    case 'sous':
      return bloc.entrees.flatMap((entree) =>
        entree.blocs.flatMap((sousBloc) => sourcesDeBloc(sousBloc, aereesSeulement)),
      )
    default:
      return []
  }
}

function releverSources(onglets: readonly Onglet[], aereesSeulement: boolean): SourceDeTexte[] {
  return onglets.flatMap((onglet) =>
    onglet.groupes.flatMap((groupe) => [
      ...groupe.entete.flatMap((bloc) => sourcesDeBloc(bloc, aereesSeulement)),
      ...groupe.entrees.flatMap((entree) =>
        entree.blocs.flatMap((bloc) => sourcesDeBloc(bloc, aereesSeulement)),
      ),
    ]),
  )
}

/**
 * Les textes que l'écran passe à `enParagraphes` : les blocs `texte` et le
 * texte de chaque carte. GU3 les recompose TOUS, sans exception.
 */
export function sourcesAerees(onglets: readonly Onglet[]): SourceDeTexte[] {
  return releverSources(onglets, true)
}

/** Tout texte du Tome que le modèle porte, quel que soit son bloc. */
export function toutesLesSources(onglets: readonly Onglet[]): SourceDeTexte[] {
  return releverSources(onglets, false)
}

/** Toutes les entrées épinglables : entrées de premier niveau et sous-entrées. */
export function toutesLesEntrees(onglets: readonly Onglet[]): Entree[] {
  const plates: Entree[] = []
  const poser = (entree: Entree) => {
    plates.push(entree)
    for (const sous of sousEntrees(entree)) poser(sous)
  }
  for (const onglet of onglets) for (const entree of entreesDe(onglet)) poser(entree)
  return plates
}
