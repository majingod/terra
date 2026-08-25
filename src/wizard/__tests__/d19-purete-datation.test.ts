/**
 * D19 ③ GD4 — GATE : la dérivation N'ÉCRIT RIEN.
 *
 * Même philosophie que le niveau calculé (D20) : une date de don est un fait
 * qui se dérive, jamais un champ qu'on range. Trois preuves :
 *  - la fiche passée à la dérivation est GELÉE (`Object.freeze` en
 *    profondeur) : la moindre écriture lèverait ;
 *  - l'export JSON est identique OCTET POUR OCTET avant et après une
 *    dérivation complète ;
 *  - le snapshot `creation` ne porte AUCUN champ hors de la forme connue de
 *    `FicheCreation` — la liste ci-dessous est l'audit, pas une paraphrase.
 */
import { describe, expect, it } from 'vitest'
import { niveauMax, niveauMin } from '../../rules/niveau'
import { listeDons } from '../../rules/talents'
import { capacitesDeClasse } from '../../rules/capacites'
import { getVersion } from '../../rules/load'
import {
  datesDesDons,
  libelleNiveauDuDon,
  niveauPalierEsprit3,
  niveauxDuDon,
  palierNonConsomme,
} from '../datation'
import { miseAJourMontee, miseAJourReclamationPalier } from '../montee'
import type { FicheCreation } from '../types'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import { echelonsAPoint, ficheDatee, seuilDuPalier } from './aide-datation'

const SEUIL = seuilDuPalier()
const PLAFOND = niveauMax()
const A_POINT = echelonsAPoint().filter((n) => n > niveauMin())

/**
 * La forme connue de `FicheCreation` (src/wizard/types.ts), champs d'époque
 * compris. ⛔ Ce lot n'a le droit d'en ajouter AUCUN : une date de don ne se
 * stocke pas. Si cette liste doit grandir, c'est un arbitrage — pas un effet
 * de bord.
 */
const CHAMPS_CONNUS = [
  'trancheAge',
  'nomDuJoueur',
  'faction',
  'race',
  'humainChoix',
  'classe',
  'voie',
  'niveau',
  'historique',
  'cible',
  'caracs',
  'extras',
  'dons',
  'comps',
  'langChoix',
  'desavOrdre',
  'racisteVar',
  'xpPerm',
  'achats',
  'capChoix',
  'capNiveaux',
  'donNiveaux',
  'capDons',
  'nom',
  'histoire',
  'reglesVersion',
  'enfant',
] as const

/** Gèle un objet et tout ce qu'il contient — l'écriture y devient impossible. */
function gelerEnProfondeur<T>(valeur: T): T {
  if (valeur && typeof valeur === 'object') {
    for (const enfant of Object.values(valeur)) gelerEnProfondeur(enfant)
    Object.freeze(valeur)
  }
  return valeur
}

/** Une fiche qui exerce TOUTES les sources de datation d'un coup. */
function ficheTemoin(): FicheCreation {
  return ficheDatee({
    niveau: PLAFOND,
    espritCreation: SEUIL - A_POINT.length,
    surEsprit: A_POINT,
    achatsDon: 1,
  })
}

/** Tout ce que la dérivation sait faire, sur une fiche donnée. */
function toutDeriver(fiche: FicheCreation) {
  datesDesDons(fiche)
  niveauPalierEsprit3(fiche)
  palierNonConsomme(fiche)
  for (const don of listeDons()) {
    niveauxDuDon(fiche, don.id)
    libelleNiveauDuDon(fiche, don.id)
  }
}

describe('D19 ③ GD4 — la dérivation n’écrit rien', () => {
  it('elle tourne sur une fiche GELÉE en profondeur', () => {
    const fiche = gelerEnProfondeur(ficheTemoin())
    expect(() => toutDeriver(fiche)).not.toThrow()
    // Et elle rend bien quelque chose : une gate qui ne dérive rien ne garde rien.
    expect(datesDesDons(fiche).length).toBeGreaterThan(0)
    expect(niveauPalierEsprit3(fiche)).toBe(A_POINT[A_POINT.length - 1])
  })

  it('l’export JSON est identique OCTET POUR OCTET avant et après', () => {
    const fiche = ficheTemoin()
    const personnage = { ...personnageDeLaFiche(fiche), id: 1 }
    const avant = JSON.stringify({ ...personnage, versionJeu: getVersion() }, null, 2)
    toutDeriver(personnage.creation as FicheCreation)
    const apres = JSON.stringify({ ...personnage, versionJeu: getVersion() }, null, 2)
    expect(apres).toBe(avant)
  })
})

describe('D19 ③ GD4 — aucun champ neuf dans la fiche', () => {
  function champsDe(fiche: FicheCreation): string[] {
    return Object.keys(fiche).filter((cle) => !CHAMPS_CONNUS.includes(cle as never))
  }

  it('la fabrique de fiche ne porte que des champs connus', () => {
    expect(champsDe(ficheTemoin())).toEqual([])
  })

  it('la montée qui consomme le palier n’ajoute aucun champ', () => {
    const avant = ficheDatee({
      niveau: A_POINT[A_POINT.length - 1],
      espritCreation: SEUIL - A_POINT.length,
      surEsprit: A_POINT,
      palierNonConsomme: true,
    })
    const libres = listeDons().filter((d) => !(avant.dons ?? {})[d.id])
    const prises = new Set(Object.values(avant.capNiveaux ?? {}))
    const capacite = capacitesDeClasse(avant.classe).find(
      (c) => c.niveau <= PLAFOND && !prises.has(c.id),
    )!.id
    const maj = miseAJourMontee(
      { ...personnageDeLaFiche(avant), id: 1 },
      PLAFOND,
      { capacite, don: libres[0].id, donPalier: libres[1].id },
      1,
    )
    expect(champsDe(maj.creation as FicheCreation)).toEqual([])
  })

  it('la réclamation hors montée n’ajoute aucun champ, et ne touche pas l’historique', () => {
    const fiche = ficheDatee({
      niveau: PLAFOND,
      espritCreation: SEUIL - A_POINT.length,
      surEsprit: A_POINT,
      palierNonConsomme: true,
    })
    const personnage = { ...personnageDeLaFiche(fiche), id: 1 }
    const libre = listeDons().find((d) => !(fiche.dons ?? {})[d.id])!
    const maj = miseAJourReclamationPalier(personnage, libre.id, 1)
    const apres = maj.creation as FicheCreation
    expect(champsDe(apres)).toEqual([])
    // ⛔ Aucun niveau gagné : l'historique est le MÊME objet, à l'octet.
    expect(JSON.stringify(apres.historique)).toBe(JSON.stringify(fiche.historique))
    expect(palierNonConsomme(apres)).toBe(0)
    // Et le don réclamé porte la date du palier, pas celle du jour.
    expect(niveauxDuDon(apres, libre.id)).toEqual([A_POINT[A_POINT.length - 1]])
  })
})
