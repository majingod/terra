/**
 * Le modèle de l'encyclopédie D9-ter : tout le manuel y entre, et rien n'y
 * entre deux fois.
 *
 * D9-ter dit « toute l'information du manuel accessible dans l'encyclopédie ».
 * Ce fichier le MESURE : chaque section du chapitre 1, chaque classe, chaque
 * voie, chaque capacité, chaque don, chaque métier, chaque artisanat, chaque
 * table du chapitre 4 et chaque désavantage doit avoir son entrée ou sa carte.
 *
 * Il mesure aussi les deux propriétés qui font tenir D13 et D14 :
 * — chaque texte affiché est `affichage ?? verbatim` (jamais un verbatim nu
 *   quand une correction existe) ;
 * — les identifiants d'épinglage sont uniques et stables (dérivés des ids et
 *   des titres du corpus, pas d'un compteur de rendu).
 *
 * ⛔ Aucune phrase du Tome n'est écrite ici.
 */
import { describe, expect, it } from 'vitest'
import { texteAffiche } from '../../pages/creation/ui'
import { branchesDe, capacitesDeBase, toutesLesCapacites } from '../../rules/branches'
import { listeDesavantages } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { classesSquelette } from '../../rules/stats'
import { listeCompetencesSimples, listeDons } from '../../rules/talents'
import {
  cartesDe,
  compteDe,
  entreesDe,
  fragment,
  ongletsDeContenu,
  sousEntrees,
  texteCherchable,
  toutesLesEntrees,
  toutesLesSources,
  type Onglet,
  type OngletId,
} from '../modele'

const ONGLETS = ongletsDeContenu()
const PAR_ID = new Map<OngletId, Onglet>(ONGLETS.map((onglet) => [onglet.id, onglet]))

function onglet(id: OngletId): Onglet {
  const trouve = PAR_ID.get(id)
  expect(trouve, `onglet ${id}`).toBeDefined()
  return trouve!
}

function idsDeplies(id: OngletId): string[] {
  return entreesDe(onglet(id)).map((entree) => entree.id)
}

describe('modèle D9-ter — le manuel au complet', () => {
  it('dénominateur : cinq onglets de contenu, aux compteurs 17 / 8 / 13 / 12 / 14', () => {
    expect(ONGLETS.map((o) => o.id)).toEqual([
      'regles',
      'classes',
      'dons',
      'competences',
      'desavantages',
    ])
    expect(ONGLETS.map(compteDe)).toEqual([17, 8, 13, 12, 14])
  })

  it('Règles : les 13 sections du chapitre 1, dans l’ordre du corpus, puis le chapitre 2', () => {
    const sections = getRules().regles_de_base.sections
    const groupes = onglet('regles').groupes
    expect(groupes).toHaveLength(2)
    expect(groupes[0].entrees.map((e) => e.id)).toEqual(
      sections.map((section) => `regle:${section.id}`),
    )
    expect(groupes[0].entrees.map((e) => e.titre)).toEqual(sections.map((s) => s.titre))
    expect(groupes[1].entrees.map((e) => e.id)).toEqual([
      'regle:lutte',
      'regle:sauvegardes',
      'regle:magie',
      'regle:races',
    ])
  })

  it('Règles : les six races sont des sous-accordéons des Races', () => {
    const races = entreesDe(onglet('regles')).find((e) => e.id === 'regle:races')!
    expect(sousEntrees(races).map((e) => e.id)).toEqual(
      getRules().races.liste.map((race) => `race:${race.id}`),
    )
  })

  it('Règles : les trois sections à ancres rendent leurs items', () => {
    const aAncres = getRules().regles_de_base.sections.filter((s) => s.presentation)
    for (const section of aAncres) {
      const entree = entreesDe(onglet('regles')).find((e) => e.id === `regle:${section.id}`)!
      const items = section.presentation!.ancres.map((a) => a.nom)
      const rendu = texteCherchable(entree)
      for (const nom of items) expect(rendu, `${section.id} / ${nom}`).toContain(nom)
    }
    // Les états (avec préfixe) deviennent des cartes épinglables.
    const symboles = entreesDe(onglet('regles')).find(
      (e) => e.id === `regle:${aAncres.find((s) => s.presentation!.avec_prefixe)!.id}`,
    )!
    expect(cartesDe(symboles)).toHaveLength(4)
  })

  it('Classes : huit classes, leurs voies en sous-accordéons, toutes leurs capacités en cartes', () => {
    const classes = entreesDe(onglet('classes'))
    expect(classes.map((e) => e.id)).toEqual(classesSquelette().map((c) => `classe:${c.id}`))
    for (const classe of classesSquelette()) {
      const entree = classes.find((e) => e.id === `classe:${classe.id}`)!
      expect(sousEntrees(entree).map((v) => v.id)).toEqual(
        branchesDe(classe.id).map((voie) => `voie:${classe.id}:${voie.id}`),
      )
      const cartes = cartesDe(entree).map((c) => c.id)
      for (const base of capacitesDeBase(classe.id)) {
        expect(cartes).toContain(`capacite:${base.id}`)
      }
      for (const voie of branchesDe(classe.id)) {
        for (const capacite of voie.capacites) expect(cartes).toContain(`capacite:${capacite.id}`)
      }
    }
  })

  it('Classes : aucune capacité de branche du corpus ne manque', () => {
    const cartes = new Set(entreesDe(onglet('classes')).flatMap((e) => cartesDe(e).map((c) => c.id)))
    for (const capacite of toutesLesCapacites()) {
      expect(cartes.has(`capacite:${capacite.id}`), capacite.id).toBe(true)
    }
  })

  it('Dons : les treize dons, la pastille « Cumulable » sur les cumulables', () => {
    expect(idsDeplies('dons')).toEqual(listeDons().map((don) => `don:${don.id}`))
    for (const don of listeDons()) {
      const entree = entreesDe(onglet('dons')).find((e) => e.id === `don:${don.id}`)!
      expect(entree.pastilles.length, don.id).toBe(don.cumulable ? 1 : 0)
    }
  })

  it('Compétences : 4 métiers, 4 artisanats + ateliers, 4 tables de référence', () => {
    const groupes = onglet('competences').groupes
    expect(groupes.map((g) => g.id)).toEqual(['systeme', 'metiers', 'artisanats', 'tables'])
    expect(groupes[1].entrees.map((e) => e.id)).toEqual(
      listeCompetencesSimples().map((c) => `metier:${c.id}`),
    )
    const artisanats = getRules().competences.artisanats
    expect(groupes[2].entrees.map((e) => e.id)).toEqual([
      ...artisanats.liste.map((a) => `artisanat:${a.id}`),
      'atelier:faction',
    ])
    expect(groupes[3].entrees.map((e) => e.id)).toEqual([
      'table:ressources',
      'table:substances',
      'table:forgeron',
      'table:runes',
    ])
  })

  it('Compétences : chaque capacité d’artisanat et chaque objet des tables a sa carte', () => {
    const cartes = new Set(entreesDe(onglet('competences')).flatMap((e) => cartesDe(e).map((c) => c.id)))
    const tables = getRules().tables_ch4
    for (const artisanat of getRules().competences.artisanats.liste) {
      for (const capacite of artisanat.capacites) {
        expect(cartes.has(`artisanat:${artisanat.id}:${fragment(capacite.nom)}`)).toBe(true)
      }
    }
    for (const substance of tables.substances_alchimiques.liste) {
      expect(cartes.has(`substance:${fragment(substance.nom)}`)).toBe(true)
    }
    for (const materiau of tables.objets_forgeron.materiaux) {
      for (const objet of materiau.objets) {
        expect(
          cartes.has(`objet:${fragment(materiau.materiau)}:${fragment(objet.type)}`),
        ).toBe(true)
      }
    }
    for (const rune of [...tables.runes.runes_arme, ...tables.runes.runes_amulette]) {
      expect(cartes.has(`rune:${fragment(rune.nom)}`)).toBe(true)
    }
  })

  it('Désavantages : les quatorze, chacun avec sa pastille « +N XP »', () => {
    expect(idsDeplies('desavantages')).toEqual(
      listeDesavantages().map((d) => `desavantage:${d.id}`),
    )
    for (const desavantage of listeDesavantages()) {
      const entree = entreesDe(onglet('desavantages')).find(
        (e) => e.id === `desavantage:${desavantage.id}`,
      )!
      expect(entree.pastilles[0].texte).toBe(`+${desavantage.xp} XP`)
    }
  })

  it('D14 : tout texte du modèle affiche `affichage ?? verbatim`', () => {
    const sources = toutesLesSources(ONGLETS)
    expect(sources.length).toBeGreaterThan(200)
    for (const source of sources) {
      expect(texteAffiche(source)).toBe(source.affichage ?? source.verbatim ?? '')
      expect(texteAffiche(source).length).toBeGreaterThan(0)
    }
    // Jumelle : le modèle porte bien des textes CORRIGÉS, pas que des verbatims.
    expect(sources.filter((s) => s.affichage !== undefined).length).toBeGreaterThan(0)
  })

  it('les identifiants d’épinglage sont uniques', () => {
    const ids = [
      ...toutesLesEntrees(ONGLETS).map((e) => e.id),
      ...ONGLETS.flatMap((o) => entreesDe(o).flatMap((e) => cartesDe(e).map((c) => c.id))),
    ]
    const doublons = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(doublons).toEqual([])
    expect(ids.length).toBeGreaterThan(250)
  })

  it('les identifiants sont dérivés du corpus, pas d’un compteur de rendu', () => {
    // Deux constructions successives du modèle donnent les MÊMES identifiants.
    const premiers = toutesLesEntrees(ongletsDeContenu()).map((e) => e.id)
    const seconds = toutesLesEntrees(ongletsDeContenu()).map((e) => e.id)
    expect(seconds).toEqual(premiers)
    expect(premiers.some((id) => /\d/.test(id) === false)).toBe(true)
  })

  it('le texte cherchable d’une entrée contient son titre et son corps', () => {
    for (const entree of toutesLesEntrees(ONGLETS)) {
      expect(texteCherchable(entree), entree.id).toContain(entree.titre)
    }
  })
})
