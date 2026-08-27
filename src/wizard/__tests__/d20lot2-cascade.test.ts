/**
 * D20 lot 2 — GATES GL5, GL6, GL8 et GL10 : la cascade d'une correction.
 *
 * ⚠️ Neuf de ces tests sont des RESSUSCITÉS. #23 avait retiré la couverture de
 * la « baisse de niveau » parce que D20 supprimait la chose gardée : on ne naît
 * plus qu'au niveau 1, on monte, et une baisse n'avait plus d'objet. Le lot 2
 * rend un objet à la garde — pas la baisse, la CHIRURGIE : corriger un choix
 * d'une montée traversée, les niveaux au-dessus intacts. Chacun porte donc en
 * commentaire LE LIBELLÉ D'ORIGINE qu'il ressuscite : c'est ce libellé qui
 * porte l'arbitrage qui l'a fait naître, et il ne se réinvente pas.
 *
 * ⛔ Ce que ces gates gardent, et qui n'a jamais changé : rien ne quitte la
 * fiche sans être NOMMÉ, et rien ne s'écrit avant la confirmation.
 *
 * D5 : aucun nom, chiffre ni seuil de règle n'est écrit ici — la classe
 * témoin, les échelons, le seuil du palier et les droits sont tous déduits de
 * rules.json.
 */
import { describe, expect, it } from 'vitest'
import { depenseXp } from '../../rules/heritage'
import { droitLangues, languesAcquises, listeLangues } from '../../rules/langues'
import { gainsMontee } from '../../rules/montee'
import { niveauMax } from '../../rules/niveau'
import { valeurCarac } from '../../rules/stats'
import { droitDons, listeDons } from '../../rules/talents'
import { capacitesDeClasse } from '../../rules/capacites'
import type { Personnage } from '../../db'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import { corrigerChoix, choixDAlors, niveauCorrigeable } from '../cascade'
import { datesDesDons } from '../datation'
import { caracsDuNiveau, historiqueDe, niveauCourant } from '../historique'
import { miseAJourCorrection, miseAJourMontee } from '../montee'
import { donsPris } from '../troc'
import { consommationDonsDeLaFiche, etapesValides, problemesEtape } from '../validation'
import type { CleCarac, FicheCreation } from '../types'
import { echelonsAPoint, ficheDatee, seuilDuPalier } from './aide-datation'

const HAUT = niveauMax()
const SEUIL = seuilDuPalier()
/** L'échelon de montée dont le point pousse l'Esprit AU palier. */
const N = echelonsAPoint().filter((niveau) => niveau > 1)[0]
const POINTS = gainsMontee(N).caracPoints

/** La fiche témoin de la maquette : le point du niveau N posé sur l'Esprit. */
function ficheTemoin(achatsDon = 0): FicheCreation {
  return ficheDatee({
    niveau: HAUT,
    espritCreation: SEUIL - 1,
    surEsprit: [N],
    achatsDon,
  })
}

/** Le même personnage, mais avec le point posé sur la Puissance dès l'origine. */
function ficheJumelle(dons: string[]): FicheCreation {
  return ficheDatee({ niveau: HAUT, espritCreation: SEUIL - 1, surEsprit: [], dons })
}

function personnage(fiche: FicheCreation): Personnage {
  return { ...personnageDeLaFiche(fiche), id: 1 } as Personnage
}

/** La fiche telle que l'enregistrement la porte (elle y gagne `reglesVersion`). */
function creationDe(fiche: FicheCreation): FicheCreation {
  return personnage(fiche).creation as FicheCreation
}

/** Une capacité de l'arbre, de niveau ≤ N, que la fiche ne porte pas encore. */
function capaciteLibre(fiche: FicheCreation, niveau: number): string {
  const prises = new Set([
    ...Object.values(fiche.capNiveaux ?? {}),
    ...Object.values(fiche.capChoix ?? {}).flat(),
    ...Object.values(fiche.capDons ?? {}),
  ])
  return capacitesDeClasse(fiche.classe).find(
    (capacite) => capacite.niveau <= niveau && !prises.has(capacite.id),
  )!.id
}

describe('D20 lot 2 — témoins : la fiche de la maquette existe vraiment', () => {
  it('le point du niveau N pousse l’Esprit AU palier, et la fiche en profite', () => {
    const fiche = ficheTemoin()
    expect(POINTS, 'la table doit donner un point à cet échelon').toBeGreaterThan(0)
    expect(caracsDuNiveau(fiche, N)).toEqual({ e: POINTS })
    expect(valeurCarac(fiche, 'e')).toBe(SEUIL)
    // Le palier lui a donné UN don de plus, et UNE langue de plus.
    expect(datesDesDons(fiche).some((instance) => instance.source === 'palier')).toBe(true)
    expect(droitLangues(SEUIL, fiche.comps ?? [])).toBeGreaterThan(
      droitLangues(SEUIL - 1, fiche.comps ?? []),
    )
    expect(etapesValides(fiche).every(Boolean), problemesDeLaFiche(fiche)).toBe(true)
  })

  it('jumelle : seules les montées TRAVERSÉES se touchent — pas la création, pas « ici »', () => {
    const perso = personnage(ficheTemoin())
    const premier = historiqueDe(perso.creation)[0].niveau
    expect(niveauCorrigeable(perso, premier), 'la création n’est pas une montée').toBe(false)
    expect(niveauCorrigeable(perso, HAUT), '« ici » n’est pas une montée traversée').toBe(false)
    expect(niveauCorrigeable(perso, N)).toBe(true)
  })
})

/** Tous les problèmes d'une fiche, en une ligne lisible au diagnostic. */
function problemesDeLaFiche(fiche: FicheCreation): string {
  return etapesValides(fiche)
    .map((valide, rang) => ({ valide, rang }))
    .filter(({ valide }) => !valide)
    .map(({ rang }) => {
      // GATE MODIFIÉE PAR D20-bis (t017, Q23 A, 2026-08-26) — 'niveau' RETIRÉ de
      // ce miroir d'`ETAPES` (aide au diagnostic, aucune assertion) : l'étape
      // n'existe plus, et sans ça le rang nommerait la mauvaise étape.
      // ⚠️ Gate hors de la liste du brief : rapportée.
      const etape = (['age', 'camp', 'classe', 'capacites', 'destin', 'forces', 'talents', 'langues', 'nom', 'fiche'] as const)[rang]
      return `${etape} : ${problemesEtape(fiche, etape).join(' / ')}`
    })
    .join(' | ')
}

describe('D20 lot 2 · GL10 ① — RESSUSCITÉ de « baisser le niveau vide les emplacements en trop, chacun nommé »', () => {
  it('corriger un choix vide les acquis qui en dépendaient, chacun nommé', () => {
    const fiche = ficheTemoin()
    const { pertes, fiche: apres } = corrigerChoix(personnage(fiche), N, { carac: 'p' })

    // Deux acquis dépendaient du palier : un don et une langue.
    expect(pertes.map((perte) => perte.type).sort()).toEqual(['don', 'langue'])
    // ⛔ Chacun porte un NOM du corpus — jamais un id, jamais « 1 chose ».
    const nomsDeDons = new Set(listeDons().map((don) => don.nom))
    const nomsDeLangues = new Set(listeLangues().map((langue) => langue.nom))
    for (const perte of pertes) {
      expect(perte.nom.length, `perte sans nom : ${JSON.stringify(perte)}`).toBeGreaterThan(0)
      const catalogue = perte.type === 'don' ? nomsDeDons : nomsDeLangues
      expect(catalogue.has(perte.nom), `« ${perte.nom} » n’est pas un nom du corpus`).toBe(true)
      expect(perte.source, 'la perte ne dit pas de quel droit elle venait').toContain(String(SEUIL))
      expect(perte.gratuit, 'aucune perte de cascade ne coûte d’XP').toBe(true)
    }

    // …et ils ont VRAIMENT quitté la fiche.
    const don = pertes.find((perte) => perte.type === 'don')!
    const langue = pertes.find((perte) => perte.type === 'langue')!
    const idDon = listeDons().find((candidat) => candidat.nom === don.nom)!.id
    const idLangue = listeLangues().find((candidat) => candidat.nom === langue.nom)!.id
    expect(donsPris(apres)[idDon]).toBeUndefined()
    expect(apres.langChoix).not.toContain(idLangue)
  })
})

describe('D20 lot 2 · GL10 ② — RESSUSCITÉ de « jumelle : monter de niveau ne retire AUCUNE capacité — il en ouvre »', () => {
  it('inchangée dans l’esprit : une montée n’enlève rien', () => {
    const depart = N - 1
    const fiche = ficheDatee({ niveau: depart, espritCreation: SEUIL - 1 })
    const perso = personnage(fiche)
    const capacite = capaciteLibre(fiche, N)
    const maj = miseAJourMontee(perso, N, { capacite, carac: 'p' }, 1_700_000_999_000)

    // Rien n'a été retiré : les capacités d'avant sont toutes encore là.
    for (const id of perso.capacites) expect(maj.capacites).toContain(id)
    expect(maj.capacites!.length).toBe(perso.capacites.length + 1)
    // Ni les dons, ni les langues.
    for (const id of perso.dons) expect(maj.dons).toContain(id)
  })

  it('jumelle de la jumelle : une CORRECTION non plus ne retire jamais de capacité', () => {
    const fiche = ficheTemoin()
    const { pertes, reste } = corrigerChoix(personnage(fiche), N, { carac: 'p' })
    expect(pertes.some((perte) => perte.type === 'capacite')).toBe(false)
    // Elles viennent des NIVEAUX, pas de la caractéristique : elles restent,
    // et la fenêtre le dit noir sur blanc.
    const survivantes = reste.find((groupe) => groupe.type === 'capacite')!
    expect(survivantes.items.length).toBe(Object.keys(fiche.capNiveaux ?? {}).length)
  })
})

describe('D20 lot 2 · GL10 ③ — RESSUSCITÉ de « baisse_de_niveau_ouvre_repercussions »', () => {
  it('une correction avec pertes ouvre la fenêtre AVANT d’écrire', () => {
    const fiche = ficheTemoin()
    const perso = personnage(fiche)
    const avant = JSON.stringify(perso)

    const correction = corrigerChoix(perso, N, { carac: 'p' })
    expect(correction.pertes.length, 'sans perte, il n’y a pas de fenêtre à ouvrir').toBeGreaterThan(0)

    // ⛔ La dérivation n'a RIEN touché : ni le personnage, ni sa fiche.
    expect(JSON.stringify(perso), 'la dérivation a mordu sur le personnage').toBe(avant)
    expect(perso.creation).toEqual(creationDe(fiche))
    // La fiche candidate, elle, est bien une AUTRE fiche.
    expect(correction.fiche).not.toEqual(perso.creation)
  })

  it('le bilan ne montre QUE ce qui change vraiment — le mana ne bouge pas ici', () => {
    const { bilan } = corrigerChoix(personnage(ficheTemoin()), N, { carac: 'p' })
    for (const ligne of bilan) {
      expect(ligne.avant, `ligne de bilan sans changement : ${ligne.quoi}`).not.toBe(ligne.apres)
      for (const effet of ligne.effets ?? []) expect(effet.avant).not.toBe(effet.apres)
    }
    // Mesuré au corpus : la table cumulative donne le même mana à Esprit
    // SEUIL et à SEUIL − 1. La fenêtre ne le montre donc pas.
    const esprit = bilan.find((ligne) => ligne.quoi === 'Esprit')!
    expect((esprit.effets ?? []).map((effet) => effet.quoi)).not.toContain('Mana')
  })
})

describe('D20 lot 2 · GL10 ④ — RESSUSCITÉ de « jumelle : sans rien de consommé, une baisse n’ouvre aucune fenêtre »', () => {
  it('une correction sans perte s’applique sans fenêtre', () => {
    const fiche = ficheTemoin()
    const autre = capaciteLibre(fiche, N)
    const { pertes, fiche: apres } = corrigerChoix(personnage(fiche), N, { capacite: autre })
    expect(pertes, 'rien ne dépendait de cette capacité — aucune fenêtre').toEqual([])
    expect(apres.capNiveaux?.[String(N)]).toBe(autre)
    // Et le reste de la fiche n'a pas bougé d'un cheveu.
    expect({ ...apres, capNiveaux: undefined }).toEqual({
      ...creationDe(fiche),
      capNiveaux: undefined,
    })
  })
})

describe('D20 lot 2 · GL10 ⑤ — RESSUSCITÉ de « D16 — monter de niveau ne reprend RIEN à un achat »', () => {
  it('une correction ne touche JAMAIS un achat ni le budget XP', () => {
    const fiche = ficheTemoin(1)
    expect(Object.keys(fiche.achats ?? {}).length, 'la fiche témoin doit porter un achat').toBe(1)
    const { fiche: apres, pertes } = corrigerChoix(personnage(fiche), N, { carac: 'p' })

    expect(apres.achats).toEqual(fiche.achats)
    expect(apres.xpPerm).toBe(fiche.xpPerm)
    expect(depenseXp(apres.achats)).toBe(depenseXp(fiche.achats))
    expect(apres.desavOrdre).toEqual(fiche.desavOrdre)
    expect(apres.capChoix).toEqual(fiche.capChoix)
    // Mesuré au corpus 1.3.1 : aucun achat n'a de prérequis de
    // caractéristique — la cascade n'a donc AUCUN chemin vers eux.
    expect(pertes.some((perte) => !perte.gratuit)).toBe(false)
  })
})

describe('D20 lot 2 · GL5 / GL10 ⑥ — RESSUSCITÉ de « jumelle : une BAISSE, elle, vide les emplacements en trop et les nomme »', () => {
  it('⭐ le diff de la fiche corrigée = {le choix changé} ∪ {les pertes nommées}, et RIEN d’autre', () => {
    const fiche = creationDe(ficheTemoin())
    const { fiche: apres, pertes } = corrigerChoix(personnage(ficheTemoin()), N, { carac: 'p' })

    // La fiche ATTENDUE, reconstruite à la main depuis ce que la fenêtre a
    // nommé — et rien de plus.
    const idsPerdus = new Set(
      pertes
        .filter((perte) => perte.type === 'don')
        .map((perte) => listeDons().find((don) => don.nom === perte.nom)!.id),
    )
    const languesPerdues = new Set(
      pertes
        .filter((perte) => perte.type === 'langue')
        .map((perte) => listeLangues().find((langue) => langue.nom === perte.nom)!.id),
    )
    const dons: Record<string, number> = {}
    for (const [id, n] of Object.entries(fiche.dons ?? {})) {
      if (!idsPerdus.has(id)) dons[id] = n
    }
    const attendu: FicheCreation = {
      ...fiche,
      historique: historiqueDe(fiche).map((entree) =>
        entree.niveau === N ? { niveau: entree.niveau, le: entree.le, caracs: { p: POINTS } } : entree,
      ),
      extras: {
        p: fiche.extras!.p + POINTS,
        r: fiche.extras!.r,
        e: fiche.extras!.e - POINTS,
      },
      dons,
      langChoix: (fiche.langChoix ?? []).filter((id) => !languesPerdues.has(id)),
    }

    // Comparaison de clés EXHAUSTIVE — jamais un échantillon.
    expect(Object.keys(apres)).toEqual(Object.keys(attendu))
    expect(Object.keys(apres.dons ?? {}), 'l’ordre de l’agrégat a bougé').toEqual(
      Object.keys(attendu.dons ?? {}),
    )
    expect(apres).toEqual(attendu)
  })
})

describe('D20 lot 2 · GL10 ⑦ — RESSUSCITÉ de « baisse_de_niveau_reprend_les_points_de_carac »', () => {
  it('changer la caractéristique du point la reprend à l’une, la donne à l’autre', () => {
    const fiche = ficheTemoin()
    const { fiche: apres } = corrigerChoix(personnage(fiche), N, { carac: 'p' })

    expect(valeurCarac(apres, 'e')).toBe(valeurCarac(fiche, 'e') - POINTS)
    expect(valeurCarac(apres, 'p')).toBe(valeurCarac(fiche, 'p') + POINTS)
    expect(valeurCarac(apres, 'r')).toBe(valeurCarac(fiche, 'r'))
    // Le total posé ne bouge pas : un point déplacé n'est pas un point gagné.
    const total = (f: FicheCreation) => f.extras!.p + f.extras!.r + f.extras!.e
    expect(total(apres)).toBe(total(fiche))
    // …et le point reste ATTACHÉ à son échelon dans l'historique.
    expect(caracsDuNiveau(apres, N)).toEqual({ p: POINTS })
  })
})

describe('D20 lot 2 · GL10 ⑧ — RESSUSCITÉ de « jumelle : sans point posé, une baisse n’ouvre aucune fenêtre pour les caracs »', () => {
  it('un point rejoué sur la MÊME caractéristique ne change rien et n’ouvre rien', () => {
    const fiche = ficheTemoin()
    const alors = choixDAlors(personnage(fiche), N)
    expect(alors.carac, 'le témoin doit avoir posé son point sur l’Esprit').toBe<CleCarac>('e')

    const { pertes, fiche: apres, bilan } = corrigerChoix(personnage(fiche), N, { carac: 'e' })
    expect(pertes).toEqual([])
    expect(bilan).toEqual([])
    expect(apres).toEqual(creationDe(fiche))
  })
})

describe('D20 lot 2 · GL10 ⑨ — RESSUSCITÉ de « jumelle : remonter au même niveau rend la fiche de nouveau valide »', () => {
  it('après toute correction, la fiche reste valide, au même niveau', () => {
    const fiche = ficheTemoin()
    const { fiche: apres } = corrigerChoix(personnage(fiche), N, { carac: 'p' })

    expect(niveauCourant(apres)).toBe(niveauCourant(fiche))
    expect(etapesValides(apres).every(Boolean), problemesDeLaFiche(apres)).toBe(true)
    // Les droits sont exactement consommés — ni surplus, ni manque.
    expect(consommationDonsDeLaFiche(apres)).toBe(
      droitDons(valeurCarac(apres, 'e'), apres.achats, niveauCourant(apres)),
    )
    expect((apres.langChoix ?? []).length).toBe(
      droitLangues(valeurCarac(apres, 'e'), apres.comps ?? []),
    )
  })
})

describe('D20 lot 2 · GL6 — les pertes sortent de la DATATION, jamais d’une liste', () => {
  it('le don retiré est EXACTEMENT celui que la datation appariait au droit du palier', () => {
    const fiche = ficheTemoin()
    const duPalier = datesDesDons(fiche).find((instance) => instance.source === 'palier')!
    const attendu = listeDons().find((don) => don.id === duPalier.id)!

    const { pertes } = corrigerChoix(personnage(fiche), N, { carac: 'p' })
    const perteDeDon = pertes.find((perte) => perte.type === 'don')!
    expect(perteDeDon.nom).toBe(attendu.nom)
    // …et il porte le niveau où l'Esprit avait atteint le palier, pas celui du jour.
    expect(perteDeDon.niveau).toBe(duPalier.niveau)
    expect(perteDeDon.niveau).toBe(N)
  })

  it('après correction, la datation reste sans trou ni source fantôme', () => {
    const { fiche: apres } = corrigerChoix(personnage(ficheTemoin()), N, { carac: 'p' })
    const datees = datesDesDons(apres)
    expect(datees.length).toBe(consommationDonsDeLaFiche(apres))
    for (const instance of datees) {
      expect(instance.niveau, `don sans date : ${instance.id}`).toBeDefined()
      expect(instance.source, `source fantôme : ${instance.id}`).not.toBe('indatable')
      // ⛔ Plus aucun droit de palier : c'est lui qui vient de disparaître.
      expect(instance.source).not.toBe('palier')
    }
  })
})

describe('D20 lot 2 · GL8 — l’historique ne bouge pas d’un cran', () => {
  it('mêmes entrées, mêmes niveaux, mêmes dates — seul le `caracs` du niveau corrigé a bougé', () => {
    const fiche = ficheTemoin()
    const { fiche: apres } = corrigerChoix(personnage(fiche), N, { carac: 'p' })

    const avant = historiqueDe(fiche)
    const suite = historiqueDe(apres)
    expect(suite.length).toBe(avant.length)
    for (let rang = 0; rang < avant.length; rang++) {
      expect(suite[rang].niveau).toBe(avant[rang].niveau)
      expect(suite[rang].le, 'un horodatage a été réécrit').toBe(avant[rang].le)
      if (avant[rang].niveau !== N) expect(suite[rang]).toEqual(avant[rang])
    }
    expect(caracsDuNiveau(apres, N)).toEqual({ p: POINTS })
    expect(niveauCourant(apres)).toBe(niveauCourant(fiche))
  })

  it('jumelle : l’écriture ne change pas non plus le niveau de l’enregistrement', () => {
    const perso = personnage(ficheTemoin())
    const maj = miseAJourCorrection(perso, N, { carac: 'p' }, 1_700_000_999_000)
    expect(maj.niveau).toBe(perso.niveau)
    expect(maj.updatedAt).toBe(1_700_000_999_000)
    // Les langues de l'enregistrement suivent la fiche corrigée.
    expect(maj.langues).toEqual([
      ...languesAcquises(maj.creation!.race, maj.creation!.classe),
      ...(maj.creation!.langChoix ?? []),
    ])
  })

  it('jumelle : corriger un niveau qui n’est pas une montée traversée est REFUSÉ, et le dit', () => {
    const perso = personnage(ficheTemoin())
    expect(() => miseAJourCorrection(perso, HAUT, { carac: 'p' }, 0)).toThrow(/montée traversée/)
  })
})

describe('D20 lot 2 — une correction, puis une autre : la fiche tient', () => {
  it('corriger deux fois de suite laisse la fiche valide et l’agrégat en ordre', () => {
    const fiche = ficheTemoin()
    const perso = personnage(fiche)
    const premiere = corrigerChoix(perso, N, { carac: 'p' }).fiche
    const suite = { ...perso, creation: premiere }
    const seconde = corrigerChoix(suite, N, { carac: 'e' })

    // Revenir en arrière ne réinvente pas le don du palier : le droit se
    // rouvre, et c'est la carte de réclamation existante (#37) qui le sert.
    expect(seconde.pertes).toEqual([])
    expect(niveauCourant(seconde.fiche)).toBe(niveauCourant(fiche))
    expect(valeurCarac(seconde.fiche, 'e')).toBe(valeurCarac(fiche, 'e'))
    expect(Object.keys(seconde.fiche.dons ?? {})).toEqual(Object.keys(premiere.dons ?? {}))
  })

  it('jumelle : la fiche jumelle du départ existe bien, et se corrige dans l’autre sens', () => {
    const fiche = ficheTemoin()
    const idPalier = datesDesDons(fiche).find((instance) => instance.source === 'palier')!.id
    const jumelle = ficheJumelle(listeDons().map((don) => don.id).filter((id) => id !== idPalier))
    expect(valeurCarac(jumelle, 'e')).toBe(SEUIL - 1)
    expect(corrigerChoix(personnage(jumelle), N, { carac: 'e' }).pertes).toEqual([])
  })
})
