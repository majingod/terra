/**
 * D13 — ⛔ zéro texte de règle en dur dans le code.
 *
 * L'instrument : on découpe chaque texte de rules.json en fenêtres glissantes
 * de FENETRE caractères normalisés, et on vérifie qu'aucune de ces fenêtres
 * n'apparaît dans le CODE de l'app. Une phrase du Tome recopiée, même
 * partiellement, retombe donc rouge — pas seulement une copie intégrale.
 *
 * Ce que « le code » veut dire ici : tout SAUF les commentaires. Le critère
 * porte sur les littéraux — ce qui peut atteindre l'écran d'un joueur — et le
 * texte JSX en fait partie, donc il est balayé lui aussi. Un commentaire qui
 * cite une règle pour dire où elle vit n'atteint personne ; il sort du
 * balayage, et les citations relevées sont rapportées à part, pas corrigées
 * en douce.
 *
 * [CRITERE-PAR-LE-NOM] — le critère dit son dénominateur, et sa jumelle
 * prouve qu'il attrape : le même détecteur, lancé sur une source truquée qui
 * recopie un verbatim, doit la nommer.
 *
 * Normalisation (elle rend le critère PLUS strict, jamais plus laxiste) :
 * apostrophes et guillemets typographiques ramenés à l'ASCII, espaces
 * réduits, minuscules. Un copier-coller maquillé par la ponctuation est donc
 * attrapé lui aussi.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import rules from '../../data/rules.json'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SRC = join(RACINE, 'src')
/** Le fichier de données lui-même n'est pas « du code » : il est la maison. */
const DOSSIER_DONNEES = join(SRC, 'data')
/** Longueur d'une fenêtre : au-delà, une coïncidence de français cesse d'en être une. */
const FENETRE = 40

function normaliser(texte: string): string {
  return texte
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

interface TexteDeRegle {
  chemin: string
  texte: string
}

/** Toutes les chaînes du fichier de règles, hors `meta` (méta-texte du fichier). */
function textesDeRegles(valeur: unknown, chemin = ''): TexteDeRegle[] {
  if (Array.isArray(valeur)) {
    return valeur.flatMap((v, i) => textesDeRegles(v, `${chemin}[${i}]`))
  }
  if (typeof valeur === 'object' && valeur !== null) {
    return Object.entries(valeur).flatMap(([cle, v]) => textesDeRegles(v, `${chemin}.${cle}`))
  }
  return typeof valeur === 'string' ? [{ chemin, texte: valeur }] : []
}

const TOUS = textesDeRegles(rules).filter((t) => !t.chemin.startsWith('.meta'))
const BALAYES = TOUS.filter((t) => normaliser(t.texte).length >= FENETRE)
const TROP_COURTS = TOUS.length - BALAYES.length

function fenetresDe(texte: string): string[] {
  const n = normaliser(texte)
  const fenetres: string[] = []
  for (let i = 0; i + FENETRE <= n.length; i++) fenetres.push(n.slice(i, i + FENETRE))
  return fenetres
}

/**
 * Rend le fichier avec ses COMMENTAIRES blanchis, chaînes et gabarits
 * intacts. Automate à états : un « // » dans une chaîne (une URL) n'ouvre
 * pas de commentaire, et un « /* » dans une chaîne non plus.
 */
export function sansCommentaires(source: string): string {
  let sortie = ''
  let i = 0
  type Etat = 'code' | "'" | '"' | '`' | 'ligne' | 'bloc'
  let etat: Etat = 'code'
  while (i < source.length) {
    const c = source[i]
    const suivant = source[i + 1]
    if (etat === 'code') {
      if (c === '/' && suivant === '/') {
        etat = 'ligne'
        i += 2
        continue
      }
      if (c === '/' && suivant === '*') {
        etat = 'bloc'
        i += 2
        continue
      }
      if (c === "'" || c === '"' || c === '`') etat = c
      sortie += c
      i += 1
      continue
    }
    if (etat === 'ligne') {
      if (c === '\n') {
        etat = 'code'
        sortie += c
      } else {
        sortie += ' '
      }
      i += 1
      continue
    }
    if (etat === 'bloc') {
      if (c === '*' && suivant === '/') {
        etat = 'code'
        sortie += '  '
        i += 2
      } else {
        sortie += c === '\n' ? c : ' '
        i += 1
      }
      continue
    }
    // Dans une chaîne ou un gabarit : on recopie, on gère l'échappement.
    if (c === '\\') {
      sortie += source.slice(i, i + 2)
      i += 2
      continue
    }
    if (c === etat) etat = 'code'
    sortie += c
    i += 1
  }
  return sortie
}

function fichiersSources(dossier: string): string[] {
  const trouves: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (chemin === DOSSIER_DONNEES) continue
    if (statSync(chemin).isDirectory()) trouves.push(...fichiersSources(chemin))
    else if (/\.(ts|tsx|css|html|json)$/.test(chemin)) trouves.push(chemin)
  }
  return trouves
}

/**
 * Le détecteur. Rend un relevé nommé « chemin de la règle → fichier » pour
 * chaque texte de règle dont une fenêtre se retrouve dans une source.
 */
export function reglesRecopiees(sources: Record<string, string>): string[] {
  const index = new Map<string, string>()
  for (const [fichier, contenu] of Object.entries(sources)) {
    const n = normaliser(contenu)
    for (let i = 0; i + FENETRE <= n.length; i++) {
      const fenetre = n.slice(i, i + FENETRE)
      if (!index.has(fenetre)) index.set(fenetre, fichier)
    }
  }
  const releves: string[] = []
  for (const regle of BALAYES) {
    for (const fenetre of fenetresDe(regle.texte)) {
      const fichier = index.get(fenetre)
      if (fichier !== undefined) {
        releves.push(`${regle.chemin.slice(1)} → ${fichier}`)
        break
      }
    }
  }
  return releves
}

const SOURCES: Record<string, string> = Object.fromEntries(
  fichiersSources(SRC).map((chemin) => [
    relative(RACINE, chemin),
    sansCommentaires(readFileSync(chemin, 'utf8')),
  ]),
)

/**
 * Les champs de rules.json qui portent du TEXTE de règle. Rendre l'un d'eux
 * directement — `{don.verbatim}` — court-circuiterait D14 : la correction
 * d'affichage ne s'appliquerait pas. Tout doit passer par `TexteRegle`.
 */
const CHAMPS_DE_TEXTE = [
  'verbatim',
  'base',
  'avance',
  'intro',
  'regle_niv1',
  'echange',
  'code',
  'focus_requis',
  'restriction',
]

/** Retire les spans `source={...}` (accolades équilibrées) d'une source. */
export function sansPropSource(code: string): string {
  let sortie = ''
  let i = 0
  while (i < code.length) {
    if (!code.startsWith('source={', i)) {
      sortie += code[i]
      i += 1
      continue
    }
    let profondeur = 0
    let j = i + 'source='.length
    do {
      if (code[j] === '{') profondeur += 1
      else if (code[j] === '}') profondeur -= 1
      j += 1
    } while (j < code.length && profondeur > 0)
    i = j
  }
  return sortie
}

/** Textes de règle rendus SANS passer par le composant (D14 court-circuité). */
export function textesRendusHorsComposant(code: string): string[] {
  const reste = sansPropSource(sansCommentaires(code))
  const motif = new RegExp(`\\.(${CHAMPS_DE_TEXTE.join('|')})\\s*\\}`, 'g')
  return [...reste.matchAll(motif)].map((m) => m[0])
}

describe('D13 — zéro texte de règle en dur', () => {
  // GATE MODIFIÉE PAR LE LOT CORPUS 1.3.2 (t017, arbitrages Q7–Q13, 2026-08-26)
  it('dénominateur : 1110 textes dans rules.json, 347 assez longs pour être balayés', () => {
    // Les 584 autres font moins de 40 caractères normalisés (ids, noms,
    // libellés courts) : aucune fenêtre ne s'y forme, ils ne sont PAS balayés.
    // 1.1.0 a ajouté 17 champs « affichage » : tous assez longs pour être
    // balayés, d'où 832 → 849 et 253 → 270, à trop-courts constants.
    // 1.2.0 (D18) ajoute les deux champs `troc` — 17 caractères chacun, donc
    // trop courts pour former une fenêtre : 849 → 851 et 579 → 581, balayés
    // constants.
    // t012 transcrit le chapitre 4 au complet : 851 → 866. Douze des quinze
    // textes neufs sont assez longs pour former une fenêtre (270 → 282), les
    // trois autres non (581 → 584).
    // t014 (audit ch.5, 1.2.1) : 4 chaînes plates de heritage deviennent des
    // objets { verbatim, affichage } et p.20 est transcrite au complet : 17
    // textes neufs, 4 retirés, tous assez longs → 866 → 879, 282 → 295,
    // trop-courts constants.
    // 1.3.2 (t017) : 12 textes neufs (7 `effet_affichage` + 3 `affichage` +
    // 2 `note_affichage`) : 1098 → 1110, 336 → 347 ; un seul trop court
    // (« L'arme inflige des dégâts perce-armure. », 39 caractères), donc
    // trop-courts 762 → 763.
    expect(TOUS).toHaveLength(1110)
    expect(BALAYES).toHaveLength(347)
    expect(TROP_COURTS).toBe(763)
    expect(Object.keys(SOURCES).length).toBeGreaterThan(30)
  })

  it('encyclopedie_sans_texte_en_dur', () => {
    expect(reglesRecopiees(SOURCES)).toEqual([])
  })

  it('jumelle : le même détecteur nomme une source qui recopie un verbatim', () => {
    // Preuve que le critère attrape — la source truquée porte la phrase du
    // Tome, tirée des données au moment du test (rien n'est recopié ici).
    const temoin = BALAYES[0]
    const trucage = { 'src/faux.tsx': `const x = <p>${temoin.texte}</p>` }
    expect(reglesRecopiees(trucage)).toEqual([`${temoin.chemin.slice(1)} → src/faux.tsx`])
  })

  it('jumelle : un fragment de verbatim suffit à faire rougir', () => {
    const temoin = BALAYES.find((t) => normaliser(t.texte).length > FENETRE * 2)
    expect(temoin).toBeDefined()
    const morceau = temoin!.texte.slice(20, 20 + FENETRE + 10)
    expect(reglesRecopiees({ 'src/faux.tsx': morceau })).toContain(
      `${temoin!.chemin.slice(1)} → src/faux.tsx`,
    )
  })

  it('jumelle négative : une phrase qui n’est pas du Tome ne fait rien rougir', () => {
    expect(reglesRecopiees({ 'src/faux.tsx': 'Touche une carte pour la choisir.' })).toEqual([])
  })

  it('tout texte de règle de l’encyclopédie passe par le composant (D14)', () => {
    const page = readFileSync(join(SRC, 'pages', 'Encyclopedie.tsx'), 'utf8')
    expect(textesRendusHorsComposant(page)).toEqual([])
    // Jumelle : le compte de rendus par le composant n'est pas zéro.
    expect(page.split('<TexteRegle').length - 1).toBeGreaterThanOrEqual(10)
  })

  it('jumelle : un texte de règle rendu en direct est nommé', () => {
    expect(textesRendusHorsComposant('<p>{don.verbatim}</p>')).toEqual(['.verbatim}'])
    expect(textesRendusHorsComposant('<p>{competence.base}</p>')).toEqual(['.base}'])
    // Le même champ passé au composant ne compte pas.
    expect(textesRendusHorsComposant('<TexteRegle source={{ verbatim: c.base }} />')).toEqual([])
  })

  it('témoin de l’automate : un commentaire sort, une chaîne et le JSX restent', () => {
    const temoin = BALAYES[0].texte
    expect(reglesRecopiees({ 'src/faux.tsx': sansCommentaires(`// ${temoin}`) })).toEqual([])
    expect(
      reglesRecopiees({ 'src/faux.tsx': sansCommentaires(`/* ${temoin} */`) }),
    ).toEqual([])
    expect(
      reglesRecopiees({ 'src/faux.tsx': sansCommentaires(`const t = '${temoin}'`) }),
    ).toHaveLength(1)
    expect(
      reglesRecopiees({ 'src/faux.tsx': sansCommentaires(`<p>${temoin}</p>`) }),
    ).toHaveLength(1)
    // Un « // » DANS une chaîne n'ouvre pas de commentaire.
    expect(sansCommentaires(`const u = 'https://exemple'`)).toContain('https://exemple')
  })
})
