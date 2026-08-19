/**
 * Correctif PR-B — les points de caractéristique que les échelons pairs
 * ajoutent (+1 aux niveaux 2 et 4) se placent librement à l'étape Forces,
 * sous le plafond du fichier (caracteristiques.creation.max), et une BAISSE
 * de niveau les reprend par la fenêtre de répercussions existante : elle
 * NOMME ce qu'il y a en trop, le joueur choisit lesquels retirer.
 *
 * Le plafond et le libellé d'achat d'héritage sont lus du fichier ; les
 * chiffres de la table viennent du correctif PR-B (image p.5).
 */
import { describe, expect, it } from 'vitest'
import { effetAchat, listeAchats } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { niveauMax, niveauMin, pointsCaracCumules } from '../../rules/niveau'
import {
  changerNiveau,
  pointsCaracAPlacer,
  problemesForces,
  surplusPointsCarac,
} from '../validation'
import type { FicheCreation } from '../types'

const MAX = getRules().caracteristiques.creation.max
const HAUT = niveauMax()
const BAS = niveauMin()
const ACHAT_CARAC = listeAchats().find((a) => effetAchat(a.achat).type === 'carac')!
/** Répartition de création, la plus haute valeur sur la Puissance. */
const REPARTITION = { p: 3, r: 2, e: 1 } as const

describe('PR-B — points de caractéristique de niveau à l’étape Forces', () => {
  it('témoin : au niveau haut, le droit à placer est celui de la table', () => {
    expect(ACHAT_CARAC).toBeDefined()
    expect(pointsCaracAPlacer({ niveau: HAUT })).toBe(pointsCaracCumules(HAUT))
    expect(pointsCaracCumules(HAUT)).toBe(2)
  })

  it('les points de niveau et ceux d’héritage se cumulent dans le même droit', () => {
    expect(pointsCaracAPlacer({ niveau: HAUT, achats: { [ACHAT_CARAC.achat]: 1 } })).toBe(
      pointsCaracCumules(HAUT) + 1,
    )
  })

  it('placés librement : le compte fait foi, pas la caractéristique visée', () => {
    const points = pointsCaracCumules(HAUT)
    expect(
      problemesForces({
        caracs: { ...REPARTITION },
        extras: { p: 0, r: points, e: 0 },
        niveau: HAUT,
      }),
    ).toEqual([])
    expect(
      problemesForces({
        caracs: { ...REPARTITION },
        extras: { p: 1, r: points - 1, e: 0 },
        niveau: HAUT,
      }),
    ).toEqual([])
  })

  it('tous les points doivent être posés pour quitter l’étape', () => {
    const problemes = problemesForces({
      caracs: { ...REPARTITION },
      extras: { p: 0, r: 0, e: 0 },
      niveau: HAUT,
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
      niveau: HAUT,
      achats: { [ACHAT_CARAC.achat]: 1 },
    }
    expect(surplusPointsCarac(fiche)).toBe(0)
    expect(problemesForces(fiche).some((p) => p.includes(`au-delà de ${MAX}`))).toBe(true)
  })

  it('jumelle : au plafond exact, les mêmes points passent', () => {
    const fiche: FicheCreation = {
      caracs: { ...REPARTITION },
      extras: { p: MAX - REPARTITION.p, r: 0, e: 0 },
      niveau: HAUT,
    }
    expect(fiche.extras!.p).toBe(pointsCaracCumules(HAUT))
    expect(problemesForces(fiche)).toEqual([])
  })
})

describe('PR-B — une baisse de niveau reprend les points de caractéristique', () => {
  /** Fiche au niveau haut, tous ses points de niveau posés. */
  function ficheAuPlafond(): FicheCreation {
    return {
      caracs: { ...REPARTITION },
      extras: { p: pointsCaracCumules(HAUT), r: 0, e: 0 },
      niveau: HAUT,
    }
  }

  it('baisse_de_niveau_reprend_les_points_de_carac', () => {
    const enTrop = pointsCaracCumules(HAUT) - pointsCaracCumules(BAS)
    const { fiche, retraits } = changerNiveau(ficheAuPlafond(), BAS)
    expect(fiche.niveau).toBe(BAS)
    // Le surplus est NOMMÉ et chiffré ; il n'est pas retiré à la place du
    // joueur — c'est lui qui choisit lesquels retirer.
    expect(
      retraits.some((r) => r.includes(String(enTrop)) && r.includes('caractéristique')),
    ).toBe(true)
    expect(fiche.extras).toEqual({ p: pointsCaracCumules(HAUT), r: 0, e: 0 })
    expect(surplusPointsCarac(fiche)).toBe(enTrop)
    expect(problemesForces(fiche).some((p) => p.includes('points de caractéristique'))).toBe(
      true,
    )
  })

  it('jumelle : sans point posé, une baisse n’ouvre aucune fenêtre pour les caracs', () => {
    const { retraits } = changerNiveau(
      { caracs: { ...REPARTITION }, extras: { p: 0, r: 0, e: 0 }, niveau: HAUT },
      BAS,
    )
    expect(retraits.filter((r) => r.includes('caractéristique'))).toEqual([])
  })

  it('jumelle : remonter au même niveau rend la fiche de nouveau valide', () => {
    const { fiche } = changerNiveau(ficheAuPlafond(), BAS)
    const { fiche: remontee } = changerNiveau(fiche, HAUT)
    expect(surplusPointsCarac(remontee)).toBe(0)
    expect(problemesForces(remontee)).toEqual([])
  })
})
