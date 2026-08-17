/**
 * GATE_FIDELITE_SPEC_v2 §Tests (a) — égalité verbatim par page source.
 *
 * Chaque `verbatim` de rules.json doit se retrouver mot pour mot dans le texte
 * de sa (ses) page(s) source de tome_extraits.json.
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
    if (typeof sousValeur === 'string' && (cle === 'verbatim' || cle.startsWith('verbatim_'))) {
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

  it("n'a qu'un seul verbatim hors gate, et il est identifié", () => {
    // Témoin de non-régression : ce verbatim est une citation de l'organisateur,
    // pas du Tome, donc sans page source. Toute NOUVELLE entrée sans page
    // source doit faire rougir ce test.
    expect(horsGate.map((releve) => releve.chemin)).toEqual(['.age_et_gates.seuil.verbatim_fred'])
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
