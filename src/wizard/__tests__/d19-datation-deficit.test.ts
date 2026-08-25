/**
 * D19 ③ finitions (t016) — GN2 / GN3 : les deux défauts mesurés sur `392c30f`
 * pour la population que #36 vient sauver — les fiches d'avant #36 dont
 * l'Esprit a atteint le palier pendant une montée sans qu'aucun emplacement
 * ne s'ouvre.
 *
 * **GN2 (lecteur).** Sur une fiche qui PORTE un droit de palier non
 * consommé, `datesDesDons` ne doit plus voler la place d'un don d'échelon
 * pour la donner au palier — un droit non consommé n'a encore AUCUNE
 * instance qui lui réponde.
 *
 * **GN3 (écrivain).** Quand la montée rattrape ce droit en souffrance
 * (GD5 de #36), le don du palier s'insère à SON rang dans l'agrégat, sans
 * permuter les dons d'échelon déjà là.
 *
 * D5 : rien du corpus n'est recopié — la fiche témoin est bâtie à partir des
 * échelons à point (`echelonsAPoint`) et du seuil (`seuilDuPalier`), lus de
 * rules.json comme le fait déjà `aide-datation.ts`.
 */
import { describe, expect, it } from 'vitest'
import { capacitesDeClasse } from '../../rules/capacites'
import { niveauMax, niveauMin, tableEvolution } from '../../rules/niveau'
import { listeDons } from '../../rules/talents'
import { datesDesDons, niveauPalierEsprit3, palierNonConsomme } from '../datation'
import { miseAJourMontee } from '../montee'
import type { FicheCreation } from '../types'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import { echelonsAPoint, ficheDatee, seuilDuPalier } from './aide-datation'

const PLAFOND = niveauMax()
const SEUIL = seuilDuPalier()
/** Les échelons de montée dont le point peut pousser l'Esprit au palier. */
const A_POINT = echelonsAPoint().filter((n) => n > niveauMin())
/** Le premier de ces échelons : l'Esprit y atteint le seuil tôt, laissant un
 *  échelon de don ENTRE lui et le plafond — le terrain du défaut. */
const PREMIER_A_POINT = A_POINT[0]
/** Le niveau de la fiche témoin : juste avant le plafond, comme S du brief. */
const NIVEAU_S = PLAFOND - 1

/** Les échelons qui donnent un don, jusqu'au niveau demandé — sans le palier. */
function echelonsDeDon(niveau: number): number[] {
  return tableEvolution()
    .filter((ligne) => ligne.niv <= niveau && ligne.dons > 0)
    .flatMap((ligne) => Array.from({ length: ligne.dons }, () => ligne.niv))
}

/**
 * La fiche témoin S : au niveau `NIVEAU_S`, l'Esprit a atteint le seuil dès
 * `PREMIER_A_POINT`, et le don que ce palier ouvre est resté NON consommé —
 * l'état exact des fiches d'avant D19 ③.
 */
function ficheS(): FicheCreation {
  return ficheDatee({
    niveau: NIVEAU_S,
    espritCreation: SEUIL - 1,
    surEsprit: [PREMIER_A_POINT],
    palierNonConsomme: true,
  })
}

/** Une capacité de l'arbre de la classe, de niveau ≤ N, pas encore prise. */
function capaciteLibre(fiche: FicheCreation, niveau: number): string {
  const prises = new Set(Object.values(fiche.capNiveaux ?? {}))
  return capacitesDeClasse(fiche.classe).find(
    (c) => c.niveau <= niveau && !prises.has(c.id),
  )!.id
}

describe('D19 ③ — témoin : la fiche S porte bien le déficit du brief', () => {
  it('un droit de palier en souffrance, atteint avant le plafond de la table', () => {
    expect(NIVEAU_S).toBeGreaterThan(PREMIER_A_POINT)
    const S = ficheS()
    expect(palierNonConsomme(S)).toBeGreaterThan(0)
    expect(niveauPalierEsprit3(S)).toBe(PREMIER_A_POINT)
    expect(Object.values(S.dons ?? {}).reduce((a, b) => a + b, 0)).toBe(
      echelonsDeDon(NIVEAU_S).length,
    )
  })
})

describe('D19 ③ — GN2 : le lecteur n’apparie plus une instance d’échelon au palier', () => {
  it('chaque instance de l’agrégat date de SON échelon — aucune ne porte « palier »', () => {
    const S = ficheS()
    const datees = datesDesDons(S)
    expect(
      datees.map((d) => d.source),
      `sources vues : ${datees.map((d) => d.source).join(', ')}`,
    ).toEqual(echelonsDeDon(NIVEAU_S).map(() => 'echelon'))
    expect(datees.map((d) => d.niveau)).toEqual(echelonsDeDon(NIVEAU_S))
    expect(datees.some((d) => d.source === 'palier')).toBe(false)
  })
})

describe('D19 ③ — GN3 : l’écrivain insère le don du palier à son rang, pas en fin', () => {
  it('le palier, l’ancien don d’échelon et le nouveau don ne se permutent plus', () => {
    const S = ficheS()
    const idsAvant = Object.keys(S.dons ?? {})
    // Le dernier don déjà porté par S : celui du dernier échelon AVANT le
    // plafond — « le don d'échelon 3 » du brief, générique ici.
    const idAncienEchelon = idsAvant[idsAvant.length - 1]
    const echelons = echelonsDeDon(NIVEAU_S)
    const niveauAncienEchelon = echelons[echelons.length - 1]

    const libres = listeDons().filter((d) => !(S.dons ?? {})[d.id])
    const donPalier = libres[0]
    const donEchelon = libres[1]
    const capacite = capaciteLibre(S, PLAFOND)

    const personnage = { ...personnageDeLaFiche(S), id: 1 }
    const maj = miseAJourMontee(
      personnage,
      PLAFOND,
      { capacite, don: donEchelon.id, donPalier: donPalier.id },
      1,
    )
    const apres = maj.creation as FicheCreation
    const datees = datesDesDons(apres)
    const parId = (id: string) => datees.find((d) => d.id === id)

    expect(
      parId(donPalier.id),
      `dons datés : ${datees.map((d) => `${d.id}@${d.niveau}/${d.source}`).join(', ')}`,
    ).toEqual({ id: donPalier.id, niveau: PREMIER_A_POINT, source: 'palier' })
    expect(parId(idAncienEchelon)).toEqual({
      id: idAncienEchelon,
      niveau: niveauAncienEchelon,
      source: 'echelon',
    })
    expect(parId(donEchelon.id)).toEqual({
      id: donEchelon.id,
      niveau: PLAFOND,
      source: 'echelon',
    })
    expect(palierNonConsomme(apres)).toBe(0)
  })
})
