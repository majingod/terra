/**
 * Correctif PR-B — la vraie table d'évolution (Tome p.5, image relue en
 * zoom le 2026-08-19). La v1.0.2 portait « 1 don par échelon », erreur de
 * transcription de t003 : les tests bâtis dessus (niveau_5_donne_5_dons_cumules
 * et ses parents) sont remplacés par ceux-ci.
 *
 * La table réelle, seule source de ce fichier :
 *   niv 1 : +1 don, caracs 3-2-1, +1 compétence
 *   niv 2 : +1 caractéristique
 *   niv 3 : +1 don
 *   niv 4 : +1 caractéristique
 *   niv 5 : +1 don
 *
 * Le premier test est le témoin de DONNÉES : il rougit sur rules.json 1.0.2.
 */
import { describe, expect, it } from 'vitest'
import { getVersion } from '../load'
import {
  donsCumules,
  niveauxPossibles,
  pointsCaracCumules,
  tableEvolution,
} from '../niveau'
import { droitDons } from '../talents'

const NIVEAUX = niveauxPossibles()

describe('PR-B — evolution.table corrigée (données)', () => {
  it('la_table_donne_un_don_aux_niveaux_1_3_5_et_un_point_de_carac_aux_niveaux_2_4', () => {
    // ROUGIT sur rules.json 1.0.2 : la v1.0.2 donnait 1 don à CHAQUE échelon
    // et aucun point de caractéristique.
    const lue = tableEvolution().map((ligne) => ({
      niv: ligne.niv,
      dons: ligne.dons,
      carac_points: ligne.carac_points ?? 0,
    }))
    expect(lue).toEqual([
      { niv: 1, dons: 1, carac_points: 0 },
      { niv: 2, dons: 0, carac_points: 1 },
      { niv: 3, dons: 1, carac_points: 0 },
      { niv: 4, dons: 0, carac_points: 1 },
      { niv: 5, dons: 1, carac_points: 0 },
    ])
  })

  it('la correction est datée dans le fichier : version au-delà de 1.0.2', () => {
    expect(getVersion()).not.toBe('1.0.2')
    // 1.1.0 : les corrections d'affichage D14 s'ajoutent à la table corrigée.
    // 1.2.0 (D18) : le champ `troc` des classes s'y ajoute — la table, elle,
    // n'a pas bougé d'un octet.
    expect(getVersion()).toBe('1.3.1')
  })
})

describe('PR-B — dons et points de caractéristique cumulés', () => {
  it('niveau_5_donne_3_dons', () => {
    expect(donsCumules(5)).toBe(3)
  })

  it('niveau_2_donne_1_point_carac_et_aucun_don_neuf', () => {
    expect(pointsCaracCumules(2)).toBe(1)
    expect(donsCumules(2)).toBe(donsCumules(1))
    expect(donsCumules(2)).toBe(1)
  })

  it('niveau_4_donne_2_points_carac_cumules', () => {
    expect(pointsCaracCumules(4)).toBe(2)
  })

  it('cumul complet des cinq échelons : dons puis points de caractéristique', () => {
    expect(NIVEAUX.map(donsCumules)).toEqual([1, 1, 2, 2, 3])
    expect(NIVEAUX.map(pointsCaracCumules)).toEqual([0, 1, 1, 2, 2])
  })

  it('le droit de dons du wizard suit la table (Esprit 2, sans héritage)', () => {
    expect(NIVEAUX.map((niveau) => droitDons(2, undefined, niveau))).toEqual([1, 1, 2, 2, 3])
  })

  it('sans niveau donné, aucun point de caractéristique en plus (défaut niveau 1)', () => {
    expect(pointsCaracCumules(undefined)).toBe(0)
  })
})
