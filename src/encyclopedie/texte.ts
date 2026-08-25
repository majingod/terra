/**
 * Aération et découpe des longs textes du Tome — deux fonctions PURES,
 * testables sans DOM.
 *
 * ⛔ Zéro texte de règle ici : ces fonctions ne connaissent que la GRAMMAIRE
 * des étiquettes internes du Tome (« Mana. », « Fouiller une personne : »),
 * jamais un mot précis. Les ancres de découpe, elles, viennent toutes de
 * `presentation` dans rules.json (lot corpus 1.3.1).
 *
 * ⚠️ Le marqueur de coupe est obtenu par `String.fromCharCode(1)` : aucune
 * séquence d'échappement littérale ne doit apparaître dans ce fichier.
 */
import type { SourceDeTexte } from '../pages/creation/ui'

/** Marqueur de coupe interne, hors du jeu de caractères du Tome. */
const MARQUE = String.fromCharCode(1)

/** La ponctuation qui ferme une phrase : seule une coupe après elle est permise. */
const FIN_DE_PHRASE = '[.!?)»]'

/** Une majuscule (accentuées comprises) : ce qui suit une phrase-étiquette. */
const MAJUSCULE = '[A-ZÀ-ÖØ-Þ]'

/**
 * Une étiquette du Tome ne porte pas de virgule : ce serait une proposition,
 * pas une étiquette. La virgule et le point-virgule ferment donc le motif.
 */
const HORS_ETIQUETTE = ',;'

/**
 * Les « mots » d'une étiquette. Le signe qui la termine (« : » ou « . ») est
 * exclu des mots : l'étiquette s'arrête donc au PREMIER signe rencontré.
 */
function suite(signe: string, deplus: number): string {
  return `(?:\\s+[^\\s${signe}${HORS_ETIQUETTE}]+){0,${deplus}}`
}

/** Une étiquette qui commence par une majuscule : 1 mot, puis `deplus` au plus. */
function etiquetteMajuscule(signe: string, deplus: number): string {
  return `${MAJUSCULE}[^\\s${signe}${HORS_ETIQUETTE}]*${suite(signe, deplus)}`
}

/**
 * Motif ① — coupe avant « Étiquette : » (1 à 4 mots, initiale majuscule)
 * précédée d'une fin de phrase.
 */
const COUPE_DEUX_POINTS = new RegExp(
  `(${FIN_DE_PHRASE})\\s+(?=${etiquetteMajuscule(':', 3)}\\s*:)`,
  'g',
)

/**
 * Motif ② — coupe avant une phrase-étiquette de 1 à 2 mots capitalisés
 * terminée par un point et suivie d'une majuscule (« Mana. », « Signe. »).
 */
const COUPE_POINT = new RegExp(
  `(${FIN_DE_PHRASE})\\s+(?=${etiquetteMajuscule('.', 1)}\\.\\s+${MAJUSCULE})`,
  'g',
)

/**
 * Les mêmes étiquettes, reconnues cette fois en TÊTE d'un morceau. En tête,
 * la phrase-étiquette n'a plus à commencer par une majuscule ni à tenir en
 * deux mots : rien n'y est coupé en deux, le texte s'ouvre simplement sur son
 * étiquette (« -1 de Mana permanent. », « 1 Mana. »).
 */
const TETE_DEUX_POINTS = new RegExp(`^(${etiquetteMajuscule(':', 3)}\\s*:)\\s+([\\s\\S]+)$`)
const TETE_POINT = new RegExp(
  `^([^\\s.${HORS_ETIQUETTE}]+${suite('.', 3)}\\.)\\s+(${MAJUSCULE}[\\s\\S]*)$`,
)

/** Un paragraphe aéré : son étiquette en gras, quand le Tome en porte une. */
export interface Paragraphe {
  etiquette?: string
  texte: string
}

function etiqueter(morceau: string): Paragraphe {
  const deuxPoints = morceau.match(TETE_DEUX_POINTS)
  if (deuxPoints) return { etiquette: deuxPoints[1], texte: deuxPoints[2] }
  const point = morceau.match(TETE_POINT)
  if (point) return { etiquette: point[1], texte: point[2] }
  return { texte: morceau }
}

/**
 * Coupe un long texte du Tome en paragraphes, sur ses étiquettes internes.
 *
 * Rien n'est ajouté, rien n'est retiré : seuls des blancs sont normalisés.
 * `recomposer(enParagraphes(t))` redonne `t` à l'espace près (gate GU3).
 */
export function enParagraphes(texte: string): Paragraphe[] {
  return texte
    .replace(COUPE_DEUX_POINTS, `$1${MARQUE}`)
    .replace(COUPE_POINT, `$1${MARQUE}`)
    .split(MARQUE)
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0)
    .map(etiqueter)
}

/** Recolle des paragraphes aérés : l'inverse d'`enParagraphes`, aux blancs près. */
export function recomposer(paragraphes: readonly Paragraphe[]): string {
  return paragraphes
    .map((p) => (p.etiquette ? `${p.etiquette} ${p.texte}` : p.texte))
    .join(' ')
}

/** Blancs réduits à un espace : la mesure « à l'espace près » de GU3 et GU4. */
export function auxBlancsPres(texte: string): string {
  return texte.replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Découpe par ancres (rules.json 1.3.1, champ `presentation`)
// ---------------------------------------------------------------------------

export interface Ancre {
  nom: string
  debut: string
}

export interface Presentation {
  mode: string
  avec_prefixe: boolean
  ancres: Ancre[]
}

export interface ItemAncre {
  nom: string
  texte: string
}

export interface DecoupeAncres {
  /** Ce qui précède le premier item : l'intro de la section, souvent vide. */
  avant: string
  items: ItemAncre[]
}

/**
 * Tranche un verbatim sur les ancres que le corpus lui a posées — mêmes
 * règles que le script du lot 1.3.1 : ancres présentes, dans l'ordre, préfixe
 * retiré quand `avec_prefixe`, et découpe SANS PERTE.
 *
 * Rend `null` si l'une de ces conditions tombe : l'écran retombe alors sur
 * l'aération ordinaire plutôt que de casser, et la gate GU4 rougit.
 */
export function decoupeParAncres(
  texte: string,
  presentation: Presentation,
): DecoupeAncres | null {
  const reperes: Array<Ancre & { i: number }> = []
  for (const ancre of presentation.ancres) {
    const i = texte.indexOf(ancre.debut)
    if (i === -1) return null
    reperes.push({ ...ancre, i })
  }
  if (reperes.length === 0) return null
  for (let k = 1; k < reperes.length; k += 1) {
    if (reperes[k].i <= reperes[k - 1].i) return null
  }
  const avant = texte.slice(0, reperes[0].i).trim()
  const items: ItemAncre[] = []
  for (let k = 0; k < reperes.length; k += 1) {
    const fin = k + 1 < reperes.length ? reperes[k + 1].i : texte.length
    let morceau = texte.slice(reperes[k].i, fin).trim()
    if (presentation.avec_prefixe) {
      if (!morceau.startsWith(reperes[k].nom)) return null
      morceau = morceau.slice(reperes[k].nom.length).trim()
    }
    items.push({ nom: reperes[k].nom, texte: morceau })
  }
  const morceaux = [avant]
  for (const item of items) {
    if (presentation.avec_prefixe) morceaux.push(item.nom)
    morceaux.push(item.texte)
  }
  if (auxBlancsPres(morceaux.filter(Boolean).join(' ')) !== auxBlancsPres(texte)) return null
  return { avant, items }
}

/**
 * La source d'un item tranché : le texte est une PART du verbatim de sa
 * section, jamais une chaîne recopiée dans le code.
 */
export function sourceDItem(item: ItemAncre): SourceDeTexte {
  return { verbatim: item.texte }
}
