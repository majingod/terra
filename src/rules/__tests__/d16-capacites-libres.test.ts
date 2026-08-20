/**
 * D16 — la voie n'est pas un enclos.
 *
 * À chaque niveau, le personnage choisit 1 capacité dans TOUT l'arbre de sa
 * classe (les 3 voies confondues), de niveau ≤ l'échelon d'acquisition, et
 * jamais deux fois la même.
 *
 * D5 : aucun nom ni chiffre du Tome n'est écrit ici. Les capacités témoins,
 * les voies et les comptes attendus sont tous CALCULÉS depuis rules.json.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../branches'
import {
  capaciteDeClasseParId,
  capacitesDeClasse,
  capacitesDisponibles,
  choixValides,
  type ChoixCapacite,
} from '../capacites'
import { niveauxPossibles } from '../niveau'

const CLASSE = classesAvecBranches()[0].classe_id

/** Des choix témoins de niveaux donnés, pris chacun sur une capacité réelle. */
function choixDeNiveaux(niveaux: number[]): ChoixCapacite[] {
  const restants = [...capacitesDeClasse(CLASSE)]
  return niveaux.map((niveau) => {
    const index = restants.findIndex((c) => c.niveau === niveau)
    if (index < 0) throw new Error(`aucune capacité de niveau ${niveau} pour ${CLASSE}`)
    const [capacite] = restants.splice(index, 1)
    return { id: capacite.id, niveau: capacite.niveau }
  })
}

describe('D16 ① — le critère trié, sur cas nommés (niveau 3)', () => {
  const NIVEAU = 3

  it('[1,1,1] passe', () => {
    expect(choixValides(NIVEAU, choixDeNiveaux([1, 1, 1]))).toBe(true)
  })

  it('[1,2,3] passe', () => {
    expect(choixValides(NIVEAU, choixDeNiveaux([1, 2, 3]))).toBe(true)
  })

  it('[1,3,3] est refusé : le 2ᵉ choix trié dépasse 2', () => {
    expect(choixValides(NIVEAU, choixDeNiveaux([1, 3, 3]))).toBe(false)
  })

  it('[2,2,3] est refusé : le 1ᵉʳ choix trié dépasse 1', () => {
    expect(choixValides(NIVEAU, choixDeNiveaux([2, 2, 3]))).toBe(false)
  })

  it('deux fois le même id est refusé', () => {
    const [premier, deuxieme] = choixDeNiveaux([1, 2])
    expect(choixValides(NIVEAU, [premier, deuxieme, { ...premier }])).toBe(false)
  })

  it('l’ordre de saisie ne change rien : seul le multiensemble compte', () => {
    const choix = choixDeNiveaux([1, 2, 3])
    expect(choixValides(NIVEAU, [...choix].reverse())).toBe(true)
  })

  it('il faut autant de choix que de niveaux', () => {
    expect(choixValides(NIVEAU, choixDeNiveaux([1, 1]))).toBe(false)
  })
})

describe('D16 ② — jumelle positive, comptée depuis rules.json', () => {
  /**
   * Le compte est CALCULÉ, jamais épinglé à la main : pour chaque classe et
   * chaque niveau, on énumère les paires valides. Le témoin nommé du brief
   * (une classe au niveau 2 : C(6,2) − C(3,2) = 12) doit tomber tout seul.
   */
  function pairesValides(classeId: string, niveau: number): number {
    const bassin = capacitesDisponibles(classeId, niveau)
    let compte = 0
    for (let i = 0; i < bassin.length; i++) {
      for (let j = i + 1; j < bassin.length; j++) {
        const paire: ChoixCapacite[] = [
          { id: bassin[i].id, niveau: bassin[i].niveau },
          { id: bassin[j].id, niveau: bassin[j].niveau },
        ]
        if (choixValides(niveau, paire)) compte += 1
      }
    }
    return compte
  }

  it('au niveau 2, chaque classe offre exactement 12 paires valides', () => {
    // 6 capacités de niveau ≤ 2 (3 voies × 2 échelons) : C(6,2) = 15 paires,
    // moins les C(3,2) = 3 paires « tout niveau 2 ».
    const parClasse = classesAvecBranches().map((c) => [c.classe_id, pairesValides(c.classe_id, 2)])
    const attendu = classesAvecBranches().map((c) => {
      const bassin = capacitesDisponibles(c.classe_id, 2)
      const n = bassin.length
      const hauts = bassin.filter((cap) => cap.niveau === 2).length
      return [c.classe_id, (n * (n - 1)) / 2 - (hauts * (hauts - 1)) / 2]
    })
    expect(parClasse).toEqual(attendu)
    expect(parClasse.map(([, n]) => n)).toEqual(classesAvecBranches().map(() => 12))
  })
})

describe('D16 ③ — le bassin ignore les voies et retire le déjà-pris', () => {
  it('le bassin d’un choix couvre les TROIS voies, pas une seule', () => {
    const voies = new Set(capacitesDisponibles(CLASSE, 1).map((c) => c.voieId))
    expect(voies.size).toBe(branchesDe(CLASSE).length)
  })

  it('plafonné au niveau du choix : rien au-dessus n’entre', () => {
    for (const niveau of niveauxPossibles()) {
      const bassin = capacitesDisponibles(CLASSE, niveau)
      expect(bassin.every((c) => c.niveau <= niveau), `niveau ${niveau}`).toBe(true)
      expect(bassin).toHaveLength(
        capacitesDeClasse(CLASSE).filter((c) => c.niveau <= niveau).length,
      )
    }
  })

  it('une capacité déjà prise sort du bassin', () => {
    const prise = capacitesDisponibles(CLASSE, 3)[0]
    const apres = capacitesDisponibles(CLASSE, 3, [prise.id])
    expect(apres.map((c) => c.id)).not.toContain(prise.id)
    expect(apres).toHaveLength(capacitesDisponibles(CLASSE, 3).length - 1)
  })

  it('chaque entrée garde l’étiquette de sa voie (id et nom)', () => {
    const voies = branchesDe(CLASSE)
    for (const capacite of capacitesDeClasse(CLASSE)) {
      const voie = voies.find((v) => v.id === capacite.voieId)
      expect(voie, capacite.id).toBeDefined()
      expect(capacite.voieNom).toBe(voie!.nom)
    }
  })

  it('une classe inconnue rend un bassin vide, jamais une erreur', () => {
    expect(capacitesDisponibles('classe-qui-nexiste-pas', 5)).toEqual([])
    expect(capacitesDeClasse(undefined)).toEqual([])
    expect(capaciteDeClasseParId(CLASSE, 'capacite-qui-nexiste-pas')).toBeUndefined()
  })
})
