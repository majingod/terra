/**
 * T12 — offline-fonts (D11-ter) : aucun appel réseau de polices.
 * - Aucune référence aux deux hôtes de Google Fonts (voir HOTES_INTERDITS)
 *   dans les sources ni, s'il est présent, dans le build (`dist/`).
 * - Jumelles : Cinzel et Crimson Text sont servies localement (@fontsource,
 *   importées dans main.tsx, fichiers woff2 présents) et le service worker
 *   précache les woff2 (globPatterns) ; Cinzel Decorative ne se charge pas
 *   (défaut Manus nommé : jamais utilisée).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
// Hôtes interdits, reconstruits pour que ce fichier de test ne se signale
// pas lui-même au grep.
const HOTES_INTERDITS = new RegExp(
  ['fonts.google' + 'apis.com', 'fonts.g' + 'static.com']
    .map((hote) => hote.replace(/\./g, '\\.'))
    .join('|'),
)

function fichiersDe(dossier: string): string[] {
  const resultats: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) resultats.push(...fichiersDe(chemin))
    else resultats.push(chemin)
  }
  return resultats
}

function texteDe(chemin: string): string {
  return /\.(png|svg|ico|woff2?|ttf|eot)$/.test(chemin) ? '' : readFileSync(chemin, 'utf8')
}

describe('T12 — polices hors ligne', () => {
  it('zéro référence à Google Fonts dans les sources', () => {
    const sources = [
      ...fichiersDe(join(RACINE, 'src')),
      join(RACINE, 'index.html'),
      join(RACINE, 'vite.config.ts'),
      join(RACINE, 'package.json'),
    ]
    const coupables = sources.filter((chemin) => HOTES_INTERDITS.test(texteDe(chemin)))
    expect(coupables).toEqual([])
  })

  it('zéro référence à Google Fonts dans le build (dist/), quand il existe', () => {
    const dist = join(RACINE, 'dist')
    if (!existsSync(dist)) return // le build se vérifie après `npm run build`
    const coupables = fichiersDe(dist).filter((chemin) => HOTES_INTERDITS.test(texteDe(chemin)))
    expect(coupables).toEqual([])
  })

  it('jumelle : Cinzel et Crimson Text sont importées localement (@fontsource)', () => {
    const main = readFileSync(join(RACINE, 'src', 'main.tsx'), 'utf8')
    expect(main).toMatch(/@fontsource\/cinzel\//)
    expect(main).toMatch(/@fontsource\/crimson-text\//)
    // Les fichiers de police existent bien sur disque.
    expect(existsSync(join(RACINE, 'node_modules', '@fontsource', 'cinzel'))).toBe(true)
    expect(existsSync(join(RACINE, 'node_modules', '@fontsource', 'crimson-text'))).toBe(true)
  })

  it('jumelle : le service worker précache les woff2 (globPatterns)', () => {
    const viteConfig = readFileSync(join(RACINE, 'vite.config.ts'), 'utf8')
    expect(viteConfig).toMatch(/woff2/)
    const dist = join(RACINE, 'dist')
    if (existsSync(dist)) {
      const sw = readFileSync(join(dist, 'sw.js'), 'utf8')
      expect(sw).toMatch(/cinzel[^"']*\.woff2/)
      expect(sw).toMatch(/crimson-text[^"']*\.woff2/)
    }
  })

  it('Cinzel Decorative ne se charge pas', () => {
    const main = readFileSync(join(RACINE, 'src', 'main.tsx'), 'utf8')
    expect(main).not.toMatch(/cinzel-decorative/)
    const dependances = JSON.parse(
      readFileSync(join(RACINE, 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> }
    expect(Object.keys(dependances.dependencies ?? {})).not.toContain(
      '@fontsource/cinzel-decorative',
    )
  })
})
