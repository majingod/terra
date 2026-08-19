/**
 * D14 — les coquilles se corrigent À L'AFFICHAGE ; le verbatim sous gate
 * reste intact. Le composant rend `affichage ?? verbatim`, et depuis
 * rules.json 1.1.0 les corrections vivent DANS LES DONNÉES : ce fichier
 * mesure les deux moitiés — le mécanisme, et les 17 corrections qui
 * l'empruntent — plus le ménage qu'elles ont permis (plus aucune correction
 * codée en dur dans src/).
 */
// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import rules from '../../../data/rules.json'
import { TexteRegle, texteAffiche } from '../ui'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
/** Le fichier de données porte les deux textes : c'est sa raison d'être. */
const DONNEES = join(SRC, 'data')

function fichiersDe(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom)
    return statSync(chemin).isDirectory() ? fichiersDe(chemin) : [chemin]
  })
}

/** Chaque couple (verbatim, affichage) du fichier de règles, avec son chemin. */
function relever(
  valeur: unknown,
  chemin = '',
): Array<{ chemin: string; verbatim: string; affichage: string }> {
  if (Array.isArray(valeur)) {
    return valeur.flatMap((v, i) => relever(v, `${chemin}[${i}]`))
  }
  if (typeof valeur !== 'object' || valeur === null) return []
  const entree = valeur as Record<string, unknown>
  const releves =
    typeof entree.affichage === 'string' && typeof entree.verbatim === 'string'
      ? [{ chemin, verbatim: entree.verbatim, affichage: entree.affichage }]
      : []
  return [
    ...releves,
    ...Object.entries(entree).flatMap(([cle, v]) => relever(v, `${chemin}.${cle}`)),
  ]
}

afterEach(cleanup)

/** Combien de clés « affichage » porte aujourd'hui le fichier de règles. */
function compterAffichages(valeur: unknown): number {
  if (Array.isArray(valeur)) return valeur.reduce<number>((n, v) => n + compterAffichages(v), 0)
  if (typeof valeur !== 'object' || valeur === null) return 0
  return Object.entries(valeur).reduce(
    (n, [cle, sous]) => n + (cle === 'affichage' ? 1 : 0) + compterAffichages(sous),
    0,
  )
}

describe('D14 — composant d’affichage de texte de règle', () => {
  it('sans champ « affichage », le verbatim est rendu tel quel', () => {
    render(<TexteRegle source={{ verbatim: 'Texte du Tome, faute incluse.' }} />)
    expect(screen.getByText(/Texte du Tome, faute incluse\./)).toBeTruthy()
  })

  it('jumelle : avec un champ « affichage », c’est lui qui est rendu', () => {
    render(
      <TexteRegle source={{ verbatim: 'Texte du Tome, faute incluse.', affichage: 'Corrigé.' }} />,
    )
    expect(screen.getByText(/Corrigé\./)).toBeTruthy()
    expect(screen.queryByText(/faute incluse/)).toBeNull()
  })

  it('le verbatim sous gate n’est jamais touché par la correction d’affichage', () => {
    const source = { verbatim: 'Original.', affichage: 'Corrigé.' }
    texteAffiche(source)
    expect(source.verbatim).toBe('Original.')
  })

  it('les_17_corrections_d_affichage_existent_et_different_du_verbatim', () => {
    // Témoin de données (rouge sur 1.0.3, qui n'en portait aucune) : les
    // corrections vivent dans le fichier, et chacune dit vraiment autre chose
    // que son verbatim — sinon le champ serait décoratif.
    expect(compterAffichages(rules)).toBe(17)
    const paires = relever(rules)
    expect(paires).toHaveLength(17)
    for (const { chemin, verbatim, affichage } of paires) {
      expect(affichage, chemin).not.toBe(verbatim)
      expect(affichage.trim().length, chemin).toBeGreaterThan(0)
    }
  })

  it('témoin nommé : A1 — le verbatim dit « tavernier », l’affichage dit « marchand »', () => {
    const diplomate = rules.competences.artisanats.liste[0].capacites[1] as {
      verbatim: string
      affichage: string
    }
    expect(diplomate.verbatim).toMatch(/tavernier/)
    expect(diplomate.affichage).not.toMatch(/tavernier/)
    // La correction ne touche QUE le mot arbitré : rien d'autre ne bouge.
    expect(diplomate.affichage).toBe(diplomate.verbatim.replace(/tavernier/g, 'marchand'))
    render(<TexteRegle source={diplomate} />)
    expect(screen.getByText(/marchand peut dire/)).toBeTruthy()
    expect(screen.queryByText(/tavernier peut dire/)).toBeNull()
  })

  it('jumelle du ménage : plus aucune correction codée en dur dans src/', () => {
    // A1 vivait dans un replace() de wizard/fiche.ts. Elle vit désormais dans
    // les données seules : le mot ne doit plus exister dans le CODE.
    const coupables = fichiersDe(SRC)
      .filter((chemin) => !chemin.startsWith(DONNEES) && !chemin.includes('__tests__'))
      .filter((chemin) => /tavernier/i.test(readFileSync(chemin, 'utf8')))
    expect(coupables).toEqual([])
  })
})
