/**
 * t012 — LA JUMELLE de la gate de fidélité : couverture du Tome, page par page.
 *
 * `gate-verbatim.test.ts` prouve `rules.json ⊆ Tome` : tout ce qui est
 * transcrit l'est mot pour mot. Elle ne dit RIEN de ce qui MANQUE — c'est
 * exactement pour ça que le chapitre 4 a pu rester amputé pendant des mois
 * sans qu'un seul test rougisse. Ce fichier prouve l'autre sens :
 * `Tome ⊆ rules.json`, page par page.
 *
 * Le CRITÈRE n'est pas écrit ici : il vit dans `meta.couverture_pages` du
 * fichier de données, et ce test le lit de là. Les seules pages sous jumelle
 * sont celles que les données déclarent ; les autres chapitres viendront avec
 * leurs propres lots.
 *
 * L'instrument : on découpe la page du Tome en groupes de 5 mots consécutifs
 * et on compte lesquels se retrouvent dans le corpus. C'est un PLANCHER, pas
 * une égalité — le corpus a le droit de s'enrichir sans faire rougir la gate.
 *
 * Les zones volontairement non transcrites se déclarent par un marqueur de
 * coupe (`coupe_a`), jamais par une liste de lignes écrite à la main.
 *
 * Normalisation : la même que la gate de fidélité, et pas une autre.
 *
 * ── Témoins mesurés (pas des assertions à figer) ────────────────────────────
 *   p.17 : 284/452 = 62,8 %   plancher 55
 *   p.18 : 337/502 = 67,1 %   plancher 62   (page coupée à « RESSOURCES ET VALEUR »)
 *   p.20 : 379/640 = 59,2 %   plancher 55   (t014, corpus 1.2.1)
 *
 * ── Preuve que la jumelle sert à quelque chose (corpus d'avant t012) ────────
 *   p.17 :  96/452 = 21,2 %  <  plancher 55   → ROUGE
 *   p.18 : 296/502 = 59,0 %  <  plancher 62   → ROUGE
 *   p.20 : 300/640 = 46,9 %  <  plancher 55   → ROUGE  (corpus 1.2.0, mesuré t014)
 */
import { describe, expect, it } from 'vitest'
import rules from '../../data/rules.json'
import tome from '../../data/tome_extraits.json'

const pages = tome.tome_v1_2 as Record<string, string>

/** Une page sous jumelle, telle que les données la déclarent. */
interface PageSousJumelle {
  page: number
  plancher: number
  coupe_a?: string
  raison_coupe?: string
}

/** Le critère de couverture, tel que déclaré par les données elles-mêmes. */
const critere: PageSousJumelle[] = rules.meta.couverture_pages

/** Longueur d'un groupe : au-delà, une coïncidence de français cesse d'en être une. */
const GROUPE = 5

/** Identique à celle de la gate de fidélité — aucune autre retouche. */
function normaliser(texte: string): string {
  return texte
    .replace(/\r\n/g, ' ')
    .replace(/\u0002/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Les groupes de 5 mots consécutifs d'un texte, en minuscules. */
function groupes(texte: string): Set<string> {
  const mots = normaliser(texte).toLowerCase().split(' ').filter(Boolean)
  const sortie = new Set<string>()
  for (let i = 0; i + GROUPE <= mots.length; i += 1) {
    sortie.add(mots.slice(i, i + GROUPE).join(' '))
  }
  return sortie
}

/**
 * Le texte de la page, tronqué à son marqueur de coupe s'il en porte un.
 * Marqueur absent = page entière : une coupe qui ne mord plus ne doit pas
 * faire disparaître silencieusement la fin de la page du dénominateur.
 */
function texteDeLaPage(entree: PageSousJumelle): string {
  const texte = normaliser(pages[String(entree.page)] ?? '')
  if (entree.coupe_a === undefined) return texte
  const i = texte.indexOf(entree.coupe_a)
  return i === -1 ? texte : texte.slice(0, i)
}

/** Tout le contenu du corpus, passé au même découpage. */
const groupesDuCorpus = groupes(JSON.stringify(rules))

interface Mesure {
  communs: number
  total: number
  pourcentage: number
}

function mesurer(entree: PageSousJumelle): Mesure {
  const groupesDeLaPage = groupes(texteDeLaPage(entree))
  let communs = 0
  for (const groupe of groupesDeLaPage) {
    if (groupesDuCorpus.has(groupe)) communs += 1
  }
  const total = groupesDeLaPage.size
  return { communs, total, pourcentage: (communs / total) * 100 }
}

describe('Jumelle de la gate de fidélité — couverture du Tome V1.2', () => {
  it('le critère vit dans les données, et il porte au moins une page', () => {
    // Un critère vidé ferait passer la gate sur zéro page : ce serait vert
    // pour de mauvaises raisons.
    expect(Array.isArray(critere)).toBe(true)
    expect(critere.length).toBeGreaterThan(0)
    for (const entree of critere) {
      expect(typeof entree.page, `page de ${JSON.stringify(entree)}`).toBe('number')
      expect(typeof entree.plancher, `plancher de p.${entree.page}`).toBe('number')
    }
  })

  it('chaque page citée par le critère existe dans tome_extraits.json', () => {
    const manquantes = critere
      .map((entree) => entree.page)
      .filter((page) => typeof pages[String(page)] !== 'string')
    expect([...new Set(manquantes)]).toEqual([])
  })

  it('aucune page sous jumelle ne se réduit à zéro groupe mesurable', () => {
    // Une page vide, ou coupée à son tout début, donnerait 0/0 = NaN — et un
    // NaN ne fait pas rougir un `toBeGreaterThanOrEqual` de la bonne façon.
    for (const entree of critere) {
      expect(groupes(texteDeLaPage(entree)).size, `p.${entree.page}`).toBeGreaterThan(0)
    }
  })

  for (const entree of critere) {
    const coupe = entree.coupe_a === undefined ? '' : ` (coupée à « ${entree.coupe_a} »)`
    it(`p.${entree.page} — au moins ${entree.plancher} % du Tome se retrouve dans le corpus${coupe}`, () => {
      const { communs, total, pourcentage } = mesurer(entree)
      expect(
        pourcentage,
        `p.${entree.page} : ${communs}/${total} groupes de ${GROUPE} mots retrouvés, ` +
          `soit ${pourcentage.toFixed(1)} % — plancher ${entree.plancher} %. ` +
          `Cette page du Tome s'est appauvrie : un texte a disparu de rules.json, ` +
          `ou une coupe l'a masqué. On ne descend pas le plancher, on retranscrit.`,
      ).toBeGreaterThanOrEqual(entree.plancher)
    })
  }
})
