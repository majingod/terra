/**
 * Correctif PR-B — les points de caractéristique que les échelons pairs
 * ajoutent (+1 aux niveaux 2 et 4) se placent librement à l'étape Forces,
 * sous le plafond du fichier (caracteristiques.creation.max).
 *
 * ⚠️ GATE MODIFIÉE PAR D20, avec sa raison. Le second volet gardait la reprise
 * de ces points par une BAISSE de niveau. D20 supprime la baisse à la création
 * (on naît au niveau 1, on monte), donc `changerNiveau` n'existe plus. Le
 * volet est remplacé par ce que D20 met à sa place, et qui est plus fort : le
 * point d'un échelon reste ATTACHÉ à son niveau dans l'historique daté — c'est
 * ce que D19 lot 3 réclamait et n'avait pas. La reprise rétroactive revient au
 * lot 2, sur l'historique.
 *
 * Le niveau des fiches témoins vient de leur HISTORIQUE : `niveau` est un
 * champ d'époque depuis D20, une fiche témoin qui l'écrirait mentirait.
 *
 * Le plafond et le libellé d'achat d'héritage sont lus du fichier ; les
 * chiffres de la table viennent du correctif PR-B (image p.5).
 */
import { describe, expect, it } from 'vitest'
import { effetAchat, listeAchats } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { niveauMax, niveauMin, niveauxPossibles, pointsCaracCumules } from '../../rules/niveau'
import { pointsCaracAPlacer, problemesForces, surplusPointsCarac } from '../validation'
import { caracsDuNiveau, niveauCourant } from '../historique'
import { gainsMontee } from '../../rules/montee'
import { miseAJourMontee } from '../montee'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { listeDons } from '../../rules/talents'
import type { FicheCreation } from '../types'
import { ficheComplete, historiqueJusquA } from './aide-fiche-complete'

const MAX = getRules().caracteristiques.creation.max
const HAUT = niveauMax()
const BAS = niveauMin()
const ACHAT_CARAC = listeAchats().find((a) => effetAchat(a.achat).type === 'carac')!
/** Répartition de création, la plus haute valeur sur la Puissance. */
const REPARTITION = { p: 3, r: 2, e: 1 } as const

describe('PR-B — points de caractéristique de niveau à l’étape Forces', () => {
  it('témoin : au niveau haut, le droit à placer est celui de la table', () => {
    expect(ACHAT_CARAC).toBeDefined()
    expect(pointsCaracAPlacer({ historique: historiqueJusquA(HAUT) })).toBe(pointsCaracCumules(HAUT))
    expect(pointsCaracCumules(HAUT)).toBe(2)
  })

  it('les points de niveau et ceux d’héritage se cumulent dans le même droit', () => {
    expect(pointsCaracAPlacer({ historique: historiqueJusquA(HAUT), achats: { [ACHAT_CARAC.achat]: 1 } })).toBe(
      pointsCaracCumules(HAUT) + 1,
    )
  })

  it('placés librement : le compte fait foi, pas la caractéristique visée', () => {
    const points = pointsCaracCumules(HAUT)
    expect(
      problemesForces({
        caracs: { ...REPARTITION },
        extras: { p: 0, r: points, e: 0 },
        historique: historiqueJusquA(HAUT),
      }),
    ).toEqual([])
    expect(
      problemesForces({
        caracs: { ...REPARTITION },
        extras: { p: 1, r: points - 1, e: 0 },
        historique: historiqueJusquA(HAUT),
      }),
    ).toEqual([])
  })

  it('tous les points doivent être posés pour quitter l’étape', () => {
    const problemes = problemesForces({
      caracs: { ...REPARTITION },
      extras: { p: 0, r: 0, e: 0 },
      historique: historiqueJusquA(HAUT),
    })
    expect(problemes.some((p) => p.includes('points de caractéristique'))).toBe(true)
  })

  it('carac_plafonnee_a_5_meme_avec_points_de_niveau', () => {
    // Niveau haut (2 points de niveau) + 1 point d'héritage = 3 points ; tout
    // empiler sur la Puissance donnerait 3 + 3 = 6, au-delà du plafond du
    // fichier. Le compte est bon, seul le plafond refuse.
    const fiche: FicheCreation = {
      caracs: { ...REPARTITION },
      extras: { p: pointsCaracCumules(HAUT) + 1, r: 0, e: 0 },
      historique: historiqueJusquA(HAUT),
      achats: { [ACHAT_CARAC.achat]: 1 },
    }
    expect(surplusPointsCarac(fiche)).toBe(0)
    expect(problemesForces(fiche).some((p) => p.includes(`au-delà de ${MAX}`))).toBe(true)
  })

  it('jumelle : au plafond exact, les mêmes points passent', () => {
    const fiche: FicheCreation = {
      caracs: { ...REPARTITION },
      extras: { p: MAX - REPARTITION.p, r: 0, e: 0 },
      historique: historiqueJusquA(HAUT),
    }
    expect(fiche.extras!.p).toBe(pointsCaracCumules(HAUT))
    expect(problemesForces(fiche)).toEqual([])
  })
})

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)

/** Une capacité par échelon 1..niveau, prise dans une voie tournante. */
function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n, index) => {
      choix[String(n)] = VOIES[index % VOIES.length].capacites.find((c) => c.niveau === n)!.id
    })
  return choix
}

describe('D20 — le point d’un échelon reste attaché à SON niveau', () => {
  /** L'échelon de montée qui donne un point de caractéristique. */
  const VERS_CARAC = niveauxPossibles()
    .filter((n) => n > BAS && gainsMontee(n).caracPoints > 0)[0]

  it('la montée date le point avec le niveau où il a été gagné', () => {
    const depart = VERS_CARAC - 1
    const personnage = {
      ...personnageDeLaFiche(ficheComplete(CLASSE, depart, capNiveaux(depart), 'Bob')),
      id: 1,
    }
    const capacite = VOIES[0].capacites.find(
      (c) => c.niveau <= VERS_CARAC && !Object.values(capNiveaux(depart)).includes(c.id),
    )!
    const maj = miseAJourMontee(
      personnage,
      VERS_CARAC,
      { capacite: capacite.id, carac: 'e' },
      1_700_000_999_000,
    )

    // Le niveau de l'enregistrement est DÉRIVÉ de l'historique, pas saisi.
    expect(niveauCourant(maj.creation)).toBe(VERS_CARAC)
    expect(maj.niveau).toBe(VERS_CARAC)

    // Et le point est retrouvable AVEC son niveau — c'est ce que D19 réclamait.
    expect(caracsDuNiveau(maj.creation, VERS_CARAC)).toEqual({
      e: gainsMontee(VERS_CARAC).caracPoints,
    })
  })

  it('jumelle : un échelon qui ne donne aucun point n’en date aucun', () => {
    const sansCarac = niveauxPossibles().filter(
      (n) => n > BAS && gainsMontee(n).caracPoints === 0,
    )[0]
    expect(sansCarac, 'la table doit porter un échelon sans point').toBeDefined()
    const depart = sansCarac - 1
    const personnage = {
      ...personnageDeLaFiche(ficheComplete(CLASSE, depart, capNiveaux(depart), 'Bob')),
      id: 1,
    }
    const capacite = VOIES[0].capacites.find(
      (c) => c.niveau <= sansCarac && !Object.values(capNiveaux(depart)).includes(c.id),
    )!
    // Un don cumulable : il reste prenable quoi que la fiche porte déjà.
    const don = listeDons().find((d) => d.cumulable)!
    const choix =
      gainsMontee(sansCarac).dons > 0
        ? { capacite: capacite.id, don: don.id }
        : { capacite: capacite.id }
    const maj = miseAJourMontee(personnage, sansCarac, choix, 1_700_000_999_000)
    expect(caracsDuNiveau(maj.creation, sansCarac)).toEqual({})
  })
})
