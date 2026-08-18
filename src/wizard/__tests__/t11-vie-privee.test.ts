/**
 * T11 — vie privée (D10) : plus aucune occurrence du marqueur d'époque
 * (« m·i·n·e·u·r », reconstruit ici pour ne pas exister littéralement) dans
 * le CODE de src/. Exclusion : src/data/ — le contenu du Tome est figé
 * octet pour octet (D5) et porte ce mot dans ses propres textes (dont la
 * profession de la mine, qui est une compétence du jeu).
 * Jumelle : `trancheAge` est présent et fonctionnel.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { problemesAge } from '../validation'

const MOT_INTERDIT = new RegExp(['m', 'i', 'n', 'e', 'u', 'r'].join(''), 'i')
const RACINE_SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DOSSIER_EXCLU = join(RACINE_SRC, 'data')

function fichiersDe(dossier: string): string[] {
  const resultats: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) {
      if (chemin === DOSSIER_EXCLU) continue
      resultats.push(...fichiersDe(chemin))
    } else {
      resultats.push(chemin)
    }
  }
  return resultats
}

describe('T11 — vie privée : tranche d’âge seulement', () => {
  it('zéro occurrence du marqueur d’époque dans src/ (hors données du Tome)', () => {
    const coupables = fichiersDe(RACINE_SRC).filter((chemin) =>
      MOT_INTERDIT.test(readFileSync(chemin, 'utf8')),
    )
    expect(coupables).toEqual([])
  })

  it('jumelle : trancheAge est présent dans le code', () => {
    const fichiers = fichiersDe(RACINE_SRC)
    const utilisateurs = fichiers.filter(
      (chemin) =>
        !chemin.includes('__tests__') && readFileSync(chemin, 'utf8').includes('trancheAge'),
    )
    expect(utilisateurs.length).toBeGreaterThan(0)
  })

  it('jumelle : trancheAge est fonctionnel (gate d’étape Âge)', () => {
    expect(problemesAge({ trancheAge: '12+' })).toEqual([])
    expect(problemesAge({ trancheAge: '≤11' })).not.toEqual([])
    expect(problemesAge({})).not.toEqual([])
  })
})
