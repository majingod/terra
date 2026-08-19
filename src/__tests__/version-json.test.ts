/**
 * version.json — la fiche d'identité publique du site déployé.
 *
 * Ce test lit le `version.json` RÉELLEMENT GÉNÉRÉ par le build et exige que
 * ses numéros de version soient égaux à ceux lus dans les fichiers de règles
 * eux-mêmes. Une version recopiée à la main dans la config créerait une
 * deuxième maison de la vérité : c'est ce que ce test interdit.
 *
 * Comme T12 (polices hors ligne), les assertions qui portent sur `dist/` ne
 * s'exécutent qu'après `npm run build` — sans build, il n'y a rien à mesurer.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(RACINE, 'dist')

// Les champs attendus, et EXACTEMENT ceux-là : le fichier est public, il ne
// porte aucun nom, aucune donnée de joueur, aucune PII.
const CHAMPS = ['commit', 'branche', 'date', 'rules', 'rules_kids'] as const

function versionDuCorpus(fichier: string): string {
  const corpus = JSON.parse(
    readFileSync(join(RACINE, 'src', 'data', fichier), 'utf8'),
  ) as { meta: { version: string } }
  return corpus.meta.version
}

function ficheGeneree(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(DIST, 'version.json'), 'utf8')) as Record<
    string,
    unknown
  >
}

describe('version.json — fiche d’identité du site déployé', () => {
  it('le build produit dist/version.json', () => {
    if (!existsSync(DIST)) return // se vérifie après `npm run build`
    expect(existsSync(join(DIST, 'version.json'))).toBe(false) // TEMP: contre-preuve CI — cassé volontairement
  })

  it('sa version de règles est celle lue dans rules.json', () => {
    if (!existsSync(DIST)) return
    expect(ficheGeneree().rules).toBe(versionDuCorpus('rules.json'))
  })

  it('sa version de règles enfant est celle lue dans rules_kids.json', () => {
    if (!existsSync(DIST)) return
    expect(ficheGeneree().rules_kids).toBe(versionDuCorpus('rules_kids.json'))
  })

  it('elle porte exactement les cinq champs prévus, et rien d’autre', () => {
    if (!existsSync(DIST)) return
    expect(Object.keys(ficheGeneree()).sort()).toEqual([...CHAMPS].sort())
  })

  it('jumelle : version.json est exclu du precache du service worker', () => {
    if (!existsSync(DIST)) return
    expect(readFileSync(join(DIST, 'sw.js'), 'utf8')).not.toContain('version.json')
  })
})
