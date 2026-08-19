/**
 * t006 / D12 — niveau de départ.
 *
 * Tout ce qui est attendu ici se lit de rules.json : la table d'évolution
 * pour les dons cumulés, le champ `niveau` des capacités de branche pour les
 * échelons acquis. Aucun chiffre du Tome n'est recopié dans ce fichier —
 * les dénominateurs sont mesurés, puis épinglés pour qu'une donnée qui
 * bouge fasse rougir.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches, toutesLesCapacites } from '../branches'
import {
  capacitesAcquises,
  competencesCumulees,
  donsCumules,
  niveauMax,
  niveauMin,
  niveauxPossibles,
  normaliserNiveau,
  regleAuDelaDuPlafond,
  tableEvolution,
} from '../niveau'
import { droitCompetences, droitDons } from '../talents'

const NIVEAUX = niveauxPossibles()

describe('t006 — dons cumulés par niveau', () => {
  it('dénominateur : la table d’évolution porte 5 échelons, de 1 à 5', () => {
    expect(NIVEAUX).toEqual([1, 2, 3, 4, 5])
    expect(niveauMin()).toBe(1)
    expect(niveauMax()).toBe(5)
    expect(tableEvolution()).toHaveLength(5)
  })

  // Les dons par niveau vivent désormais dans t007-table-evolution.test.ts :
  // la spec « niveau N ⇒ N dons » du brief t006 était fausse (correctif
  // PR-B, table p.5 relue le 2026-08-19).

  it('les dons cumulés se relisent ligne à ligne depuis la table', () => {
    const attendus = NIVEAUX.map((niveau) =>
      tableEvolution()
        .filter((ligne) => ligne.niv <= niveau)
        .reduce((somme, ligne) => somme + ligne.dons, 0),
    )
    expect(NIVEAUX.map(donsCumules)).toEqual(attendus)
  })

  it('le droit de dons suit la table (Esprit et héritage neutres)', () => {
    // Esprit 2 : la table cumulative n'ajoute aucun don — le niveau seul parle.
    expect(NIVEAUX.map((niveau) => droitDons(2, undefined, niveau))).toEqual(
      NIVEAUX.map((niveau) => donsCumules(niveau)),
    )
  })

  it('sans niveau donné, le droit est celui du niveau minimum (défaut 1)', () => {
    expect(droitDons(2)).toBe(droitDons(2, undefined, niveauMin()))
    expect(donsCumules(undefined)).toBe(donsCumules(niveauMin()))
  })

  it('la compétence, elle, ne bouge pas avec le niveau (une seule ligne en porte)', () => {
    const lignesAvecCompetence = tableEvolution().filter((l) => (l.competence ?? 0) > 0)
    expect(lignesAvecCompetence).toHaveLength(1)
    expect(NIVEAUX.map(competencesCumulees)).toEqual(NIVEAUX.map(() => 1))
    expect(NIVEAUX.map((n) => droitCompetences(undefined, n))).toEqual(NIVEAUX.map(() => 1))
  })

  it('le wizard plafonne au dernier échelon de la table et cite le Tome au-delà', () => {
    expect(normaliserNiveau(6)).toBe(niveauMax())
    expect(normaliserNiveau(99)).toBe(niveauMax())
    expect(normaliserNiveau(0)).toBe(niveauMin())
    expect(normaliserNiveau(undefined)).toBe(niveauMin())
    expect(regleAuDelaDuPlafond().length).toBeGreaterThan(0)
  })
})

describe('t006 — capacités acquises par niveau', () => {
  const voies = classesAvecBranches().flatMap((classe) =>
    branchesDe(classe.classe_id).map((voie) => ({ classeId: classe.classe_id, voie })),
  )

  it('dénominateur : 8 classes, 24 voies, 120 capacités de branche', () => {
    expect(classesAvecBranches()).toHaveLength(8)
    expect(voies).toHaveLength(24)
    expect(toutesLesCapacites()).toHaveLength(120)
  })

  it('niveau_3_donne_capacites_echelons_1_a_3', () => {
    const { classeId, voie } = voies[0]
    const acquises = capacitesAcquises(classeId, voie.id, 3)
    expect(acquises.map((c) => c.niveau)).toEqual([1, 2, 3])
    expect(acquises.map((c) => c.id)).toEqual(
      voie.capacites.filter((c) => c.niveau <= 3).map((c) => c.id),
    )
  })

  it('jumelle : sur les 24 voies et les 5 niveaux, l’acquis = les échelons ≤ N', () => {
    const ecarts = voies.flatMap(({ classeId, voie }) =>
      NIVEAUX.filter((niveau) => {
        const acquises = capacitesAcquises(classeId, voie.id, niveau)
        const attendus = voie.capacites.filter((c) => c.niveau <= niveau)
        return (
          acquises.length !== attendus.length ||
          acquises.some((c) => c.niveau > niveau) ||
          acquises.length !== niveau
        )
      }).map((niveau) => `${voie.id}@${niveau}`),
    )
    expect(ecarts).toEqual([])
  })

  it('sans classe ou sans voie, rien n’est acquis d’office', () => {
    expect(capacitesAcquises(undefined, undefined, 5)).toEqual([])
    expect(capacitesAcquises(voies[0].classeId, undefined, 5)).toEqual([])
  })
})
