/**
 * D20 lot 2 — GATE GL2, l'ÉQUIVALENCE : la gate maîtresse du lot.
 *
 * Une correction n'est juste que si elle mène EXACTEMENT là où le bon choix
 * aurait mené dès le départ. On bâtit donc deux fiches jumelles — A avec le
 * mauvais choix (le point du niveau N sur l'Esprit, le palier réclamé, la
 * langue prise), B avec le bon — et on corrige A. Les deux doivent alors être
 * strictement égales : mêmes clés, même ORDRE dans l'agrégat des dons (la
 * datation de B et celle de A-corrigée coïncident), même validation verte.
 *
 * ⚠️ C'est l'ORDRE qui fait la force de cette gate. `fiche.dons` est un
 * `Record` : son ordre d'insertion EST l'invariant dont la datation se sert
 * pour apparier chaque prise à son droit. Une correction qui retirerait un don
 * par `delete` puis reconstruirait au bout passerait toutes les gates de
 * contenu et échouerait ici. Elle tue d'un coup toutes les permutations.
 *
 * GL7 — le SENS INVERSE : un point qui AMÈNE l'Esprit au palier n'est pas une
 * perte. Aucune fenêtre ne s'ouvre ; le droit se rouvre simplement, et c'est
 * la carte de réclamation EXISTANTE (#37, à tout niveau) qui le sert. Rien à
 * bâtir — cette gate le prouve, et prouve qu'il n'y a pas de double porte.
 *
 * D5 : aucun seuil ni échelon écrit ici — tout est déduit de rules.json.
 */
import { describe, expect, it } from 'vitest'
import { capacitesDeClasse } from '../../rules/capacites'
import { gainsMontee } from '../../rules/montee'
import { niveauMax } from '../../rules/niveau'
import { valeurCarac } from '../../rules/stats'
import { listeDons } from '../../rules/talents'
import { droitLangues } from '../../rules/langues'
import type { Personnage } from '../../db'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import { corrigerChoix } from '../cascade'
import { datesDesDons, palierNonConsomme } from '../datation'
import { historiqueDe } from '../historique'
import { miseAJourCorrection, miseAJourMontee, miseAJourReclamationPalier } from '../montee'
import { etapesValides } from '../validation'
import type { FicheCreation } from '../types'
import { echelonsAPoint, ficheDatee, seuilDuPalier } from './aide-datation'

const HAUT = niveauMax()
const SEUIL = seuilDuPalier()
/** L'échelon dont le point pousse l'Esprit AU palier. */
const N = echelonsAPoint().filter((niveau) => niveau > 1)[0]
const POINTS = gainsMontee(N).caracPoints
const CATALOGUE = listeDons().map((don) => don.id)

function personnage(fiche: FicheCreation): Personnage {
  return { ...personnageDeLaFiche(fiche), id: 1 } as Personnage
}

/** La fiche telle que l'enregistrement la porte (elle y gagne `reglesVersion`). */
function creationDe(fiche: FicheCreation): FicheCreation {
  return personnage(fiche).creation as FicheCreation
}

/** A — le MAUVAIS choix : le point du niveau N posé sur l'Esprit. */
function ficheA(): FicheCreation {
  return ficheDatee({ niveau: HAUT, espritCreation: SEUIL - 1, surEsprit: [N], dons: CATALOGUE })
}

/** L'id du don que la datation de A appariait au droit du palier. */
function donDuPalier(): string {
  return datesDesDons(ficheA()).find((instance) => instance.source === 'palier')!.id
}

/**
 * B — le BON choix dès le départ : le point sur la Puissance, donc aucun droit
 * de palier, donc un don de moins. Les autres dons sont ceux de A, dans le
 * même ordre : les deux fiches ne diffèrent QUE par le choix qu'on corrige.
 */
function ficheB(): FicheCreation {
  return ficheDatee({
    niveau: HAUT,
    espritCreation: SEUIL - 1,
    surEsprit: [],
    dons: CATALOGUE.filter((id) => id !== donDuPalier()),
  })
}

/** Les horodatages `le` de l'historique — les seuls écarts tolérés par GL2. */
function sansLesDates(fiche: FicheCreation): FicheCreation {
  return {
    ...fiche,
    historique: historiqueDe(fiche).map((entree) => ({ ...entree, le: 0 })),
  }
}

describe('D20 lot 2 · GL2 — témoins : les deux jumelles diffèrent bien par CE choix', () => {
  it('A porte le point sur l’Esprit, B sur la Puissance — et A a un don de plus', () => {
    const a = ficheA()
    const b = ficheB()
    expect(valeurCarac(a, 'e')).toBe(SEUIL)
    expect(valeurCarac(b, 'e')).toBe(SEUIL - 1)
    expect(valeurCarac(b, 'p')).toBe(valeurCarac(a, 'p') + POINTS)
    expect(Object.keys(a.dons ?? {}).length).toBe(Object.keys(b.dons ?? {}).length + 1)
    // A a réclamé son palier : il ne lui reste aucun droit en souffrance.
    expect(palierNonConsomme(a)).toBe(0)
    // …et A a bien pris la langue que l'Esprit au palier lui ouvrait.
    expect((a.langChoix ?? []).length).toBe(droitLangues(SEUIL, a.comps ?? []))
    expect((b.langChoix ?? []).length).toBe(droitLangues(SEUIL - 1, b.comps ?? []))
    expect(etapesValides(a).every(Boolean)).toBe(true)
    expect(etapesValides(b).every(Boolean)).toBe(true)
  })
})

describe('D20 lot 2 · GL2 — ⭐ A corrigée EST B, à l’horodatage près', () => {
  it('mêmes clés, même contenu — la comparaison est exhaustive', () => {
    const corrigee = corrigerChoix(personnage(ficheA()), N, { carac: 'p' }).fiche
    const attendue = creationDe(ficheB())
    expect(Object.keys(corrigee)).toEqual(Object.keys(attendue))
    expect(sansLesDates(corrigee)).toEqual(sansLesDates(attendue))
  })

  it('⭐ même ORDRE d’agrégat de dons : les deux datations coïncident', () => {
    const corrigee = corrigerChoix(personnage(ficheA()), N, { carac: 'p' }).fiche
    const attendue = creationDe(ficheB())
    // L'ordre des clés, d'abord : c'est LUI l'invariant de la datation.
    expect(
      Object.keys(corrigee.dons ?? {}),
      'l’agrégat a été reconstruit au bout au lieu d’être corrigé en place',
    ).toEqual(Object.keys(attendue.dons ?? {}))
    // …et la datation qui en découle, ensuite : mêmes ids, mêmes niveaux,
    // mêmes sources, dans le même ordre.
    expect(datesDesDons(corrigee)).toEqual(datesDesDons(attendue))
  })

  it('même validation verte, et le même niveau', () => {
    const corrigee = corrigerChoix(personnage(ficheA()), N, { carac: 'p' }).fiche
    expect(etapesValides(corrigee)).toEqual(etapesValides(creationDe(ficheB())))
    expect(etapesValides(corrigee).every(Boolean)).toBe(true)
  })

  it('jumelle : l’ÉCRITURE mène au même endroit que la dérivation', () => {
    const maj = miseAJourCorrection(personnage(ficheA()), N, { carac: 'p' }, 1_700_000_999_000)
    const attendue = creationDe(ficheB())
    expect(sansLesDates(maj.creation as FicheCreation)).toEqual(sansLesDates(attendue))
    // L'enregistrement suit : dons, caracs et niveau redérivés de la fiche.
    expect(maj.dons!.sort()).toEqual(Object.keys(attendue.dons ?? {}).sort())
    expect(maj.caracs).toEqual({
      puissance: valeurCarac(attendue, 'p'),
      resistance: valeurCarac(attendue, 'r'),
      esprit: valeurCarac(attendue, 'e'),
    })
    expect(maj.capacites!.sort()).toEqual(
      personnage(ficheB()).capacites.sort(),
    )
  })
})

describe('D20 lot 2 · GL2 / GL7 — le sens inverse : B corrigée vers l’Esprit', () => {
  it('aucune perte, aucune fenêtre — un droit s’OUVRE, il ne se ferme pas', () => {
    const correction = corrigerChoix(personnage(ficheB()), N, { carac: 'e' })
    expect(correction.pertes, 'un droit qui s’ouvre n’est pas une perte').toEqual([])
    expect(valeurCarac(correction.fiche, 'e')).toBe(SEUIL)
  })

  it('la fiche corrigée offre la carte de réclamation EXISTANTE (#37) — rien à bâtir', () => {
    const corrigee = corrigerChoix(personnage(ficheB()), N, { carac: 'e' }).fiche
    expect(palierNonConsomme(corrigee), 'le droit du palier devrait être en souffrance').toBe(1)
  })

  it('⭐ réclamer par cette carte rend EXACTEMENT l’agrégat de A, dans son ordre', () => {
    const corrigee = corrigerChoix(personnage(ficheB()), N, { carac: 'e' }).fiche
    const perso = { ...personnage(ficheB()), creation: corrigee }
    const maj = miseAJourReclamationPalier(perso, donDuPalier(), 1_700_000_999_000)
    const attendue = creationDe(ficheA())

    expect(Object.keys(maj.creation!.dons ?? {})).toEqual(Object.keys(attendue.dons ?? {}))
    expect(datesDesDons(maj.creation as FicheCreation)).toEqual(datesDesDons(attendue))
    expect(palierNonConsomme(maj.creation as FicheCreation)).toBe(0)
  })

  it('jumelle : aucune DOUBLE PORTE — le droit réclamé ne se redemande pas', () => {
    const corrigee = corrigerChoix(personnage(ficheB()), N, { carac: 'e' }).fiche
    const perso = { ...personnage(ficheB()), creation: corrigee }
    const maj = miseAJourReclamationPalier(perso, donDuPalier(), 1_700_000_999_000)
    expect(palierNonConsomme(maj.creation as FicheCreation)).toBe(0)
    // …et une seconde réclamation est refusée, en le disant.
    expect(() =>
      miseAJourReclamationPalier({ ...perso, ...maj } as Personnage, donDuPalier(), 0),
    ).toThrow(/aucun droit de palier/)
  })

  /**
   * ⚠️ ÉCART MESURÉ, rapporté et NON corrigé ici. Le sens inverse rouvre AUSSI
   * un droit de LANGUE (la table cumulative ouvre don et langue au même
   * palier). Le don a sa porte (#37) ; la langue n'en a pas — et n'en avait
   * pas non plus AVANT ce lot : une montée normale qui pousse l'Esprit au
   * palier laisse déjà ce droit en souffrance, exactement pareil. La
   * correction n'introduit donc aucun comportement neuf ; elle hérite d'un
   * trou d'avant elle, qui appartient à un autre lot.
   */
  it('témoin de l’écart : la MONTÉE normale laisse déjà le droit de langue en souffrance', () => {
    const depart = N - 1
    const fiche = ficheDatee({ niveau: depart, espritCreation: SEUIL - 1 })
    const perso = personnage(fiche)
    const libre = listeDons().find((don) => !(fiche.dons ?? {})[don.id])!
    const maj = miseAJourMontee(
      perso,
      N,
      { carac: 'e', capacite: choisirCapaciteLibre(fiche, N), donPalier: libre.id },
      1_700_000_999_000,
    )
    const apres = maj.creation as FicheCreation
    expect(valeurCarac(apres, 'e')).toBe(SEUIL)
    // Le droit de langue a grandi… et `langChoix` n'a pas bougé d'un cran.
    expect(droitLangues(valeurCarac(apres, 'e'), apres.comps ?? [])).toBeGreaterThan(
      (apres.langChoix ?? []).length,
    )
    expect(apres.langChoix).toEqual(fiche.langChoix)

    // La CORRECTION se comporte exactement pareil — aucun comportement neuf.
    const parCorrection = corrigerChoix(personnage(ficheB()), N, { carac: 'e' }).fiche
    expect(droitLangues(valeurCarac(parCorrection, 'e'), parCorrection.comps ?? [])).toBeGreaterThan(
      (parCorrection.langChoix ?? []).length,
    )
  })
})

/** Une capacité de l'arbre de la classe, de niveau ≤ N, encore libre. */
function choisirCapaciteLibre(fiche: FicheCreation, niveau: number): string {
  const prises = new Set(Object.values(fiche.capNiveaux ?? {}))
  return capacitesDeClasse(fiche.classe).find(
    (capacite) => capacite.niveau <= niveau && !prises.has(capacite.id),
  )!.id
}
