/**
 * Le garde-fou du build en CI.
 *
 * Six assertions existantes (5 dans version-json.test.ts, 1 dans
 * t12-offline-fonts.test.ts) se sautent silencieusement quand `dist/`
 * n'existe pas. Elles ne rougissent donc jamais si la CI un jour inverse
 * `npm run build` et `npm test` — un test toujours vert ne garde rien.
 *
 * Ce fichier est la jumelle positive : en CI (`CI=true`), il exige que le
 * build ait bien eu lieu. En local, il ne fait rien — un développeur qui
 * lance `npm test` seul sans avoir buildé ne doit pas être puni.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(RACINE, 'dist')
const EN_CI = process.env.CI === 'true'

describe('build obligatoire avant les tests, en CI', () => {
  it.runIf(EN_CI)('dist/ existe : la CI doit lancer `npm run build` avant `npm test`', () => {
    expect(
      existsSync(DIST),
      'dist/ est absent en CI — le workflow doit lancer `npm run build` avant `npm test`',
    ).toBe(true)
  })

  it.runIf(EN_CI)('dist/sw.js existe', () => {
    expect(existsSync(join(DIST, 'sw.js'))).toBe(true)
  })

  it.runIf(EN_CI)('dist/version.json existe', () => {
    expect(existsSync(join(DIST, 'version.json'))).toBe(true)
  })
})
