/**
 * GATE_FIDELITE_SPEC_v2 §Tests (a) — égalité verbatim par page source.
 *
 * Chaque verbatim de rules.json doit se retrouver mot pour mot dans le texte
 * de sa (ses) page(s) source de tome_extraits.json.
 *
 * Le CRITÈRE de couverture n'est pas écrit ici : il vit dans
 * `meta.champs_sous_gate` du fichier de données, et ce test le lit de là.
 * Toute clé dont le nom CONTIENT « verbatim » est sous gate — pas seulement
 * la clé nommée exactement « verbatim » : c'est ce qui avait laissé passer
 * `competences.artisanats.verbatim_interdiction` (29e écart, brief #02-a-ter).
 * Les exceptions sont elles aussi lues depuis ce champ, pas recopiées ici.
 *
 * Normalisation autorisée, et elle seule :
 *   - "\r\n" -> espace
 *   - U+0002 (césure) supprimé
 *   - espaces multiples réduits
 * AUCUNE correction de faute, aucune autre retouche.
 */
import { describe, expect, it } from 'vitest'
import rules from '../../data/rules.json'
import tome from '../../data/tome_extraits.json'

const pages = tome.tome_v1_2 as Record<string, string>

/** Le critère de couverture, tel que déclaré par les données elles-mêmes. */
const critere = rules.meta.champs_sous_gate

/** Une clé est sous gate si son nom contient « verbatim ». */
function estCleVerbatim(cle: string): boolean {
  return cle.includes('verbatim')
}

/**
 * Chemins exemptés, relevés dans le texte du critère (« meta.xxx », « a.b.c »).
 * Les lire évite qu'une exception vive à deux endroits et qu'ils divergent.
 */
const exceptions = (critere.match(/[a-z_]+(?:\.[a-z_]+)+/g) ?? []).filter((chemin) =>
  chemin.includes('verbatim'),
)

function normaliser(texte: string): string {
  return texte
    .replace(/\r\n/g, ' ')
    .replace(/\u0002/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Releve {
  chemin: string
  pages: number[]
  verbatim: string
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

/** Pages déclarées par un bloc `source` : { page } ou { pages }. */
function pagesDeSource(valeur: unknown): number[] | null {
  if (!estObjet(valeur)) return null
  if (typeof valeur.page === 'number') return [valeur.page]
  if (Array.isArray(valeur.pages)) return valeur.pages.filter((p): p is number => typeof p === 'number')
  return null
}

/**
 * Parcourt rules.json et relève chaque champ `verbatim` / `verbatim_*` avec
 * les pages source du bloc englobant le plus proche.
 */
function relever(valeur: unknown, chemin: string, heritees: number[]): Releve[] {
  if (Array.isArray(valeur)) {
    return valeur.flatMap((element, index) => relever(element, `${chemin}[${index}]`, heritees))
  }
  if (!estObjet(valeur)) return []

  const pagesLocales = pagesDeSource(valeur.source) ?? heritees
  const releves: Releve[] = []
  for (const [cle, sousValeur] of Object.entries(valeur)) {
    if (typeof sousValeur === 'string' && estCleVerbatim(cle)) {
      releves.push({ chemin: `${chemin}.${cle}`, pages: pagesLocales, verbatim: sousValeur })
    } else {
      releves.push(...relever(sousValeur, `${chemin}.${cle}`, pagesLocales))
    }
  }
  return releves
}

const releves = relever(rules, '', [])
const sousGate = releves.filter((releve) => releve.pages.length > 0)
const horsGate = releves.filter((releve) => releve.pages.length === 0)

describe('Gate de fidélité — verbatim vs Tome V1.2', () => {
  it('relève au moins un verbatim par section porteuse de règles', () => {
    expect(releves.length).toBeGreaterThan(0)
    expect(sousGate.length).toBeGreaterThan(0)
  })

  it('couvre 196 champs sous gate', () => {
    expect(sousGate).toHaveLength(196)
  })

  it("n'exempte que les deux exceptions nommées dans meta.champs_sous_gate", () => {
    // Toute NOUVELLE entrée sans page source doit faire rougir ce test.
    expect(exceptions).toHaveLength(2)
    expect(horsGate.map((releve) => releve.chemin.slice(1)).sort()).toEqual([...exceptions].sort())
  })

  it('témoin — meta.normalisation_verbatim est hors gate (méta-texte)', () => {
    // Décrit la normalisation appliquée par ce test ; ne vient pas du Tome.
    expect(exceptions).toContain('meta.normalisation_verbatim')
    expect(horsGate.map((releve) => releve.chemin)).toContain('.meta.normalisation_verbatim')
  })

  it("témoin — age_et_gates.seuil.verbatim_fred est hors gate (citation d'arbitrage)", () => {
    // Citation de l'organisateur, pas du Tome, donc sans page source.
    expect(exceptions).toContain('age_et_gates.seuil.verbatim_fred')
    expect(horsGate.map((releve) => releve.chemin)).toContain('.age_et_gates.seuil.verbatim_fred')
  })

  it('chaque page source citée existe dans tome_extraits.json', () => {
    const manquantes = sousGate
      .flatMap((releve) => releve.pages)
      .filter((page) => typeof pages[String(page)] !== 'string')
    expect([...new Set(manquantes)]).toEqual([])
  })

  it('chaque verbatim figure mot pour mot dans sa page source', () => {
    const ecarts = sousGate
      .filter((releve) => {
        const attendu = normaliser(releve.verbatim)
        return !releve.pages.some((page) => normaliser(pages[String(page)] ?? '').includes(attendu))
      })
      .map((releve) => `${releve.chemin} (p.${releve.pages.join('/')})`)

    expect(ecarts).toEqual([])
  })
})
