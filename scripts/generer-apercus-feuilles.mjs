/**
 * `npm run apercus:feuilles` — écrit dans `apercus/` un fichier HTML AUTONOME
 * par classe : la feuille de personnage telle qu'elle s'imprime, remplie avec
 * une fiche d'exemple de niveau 3 aux noms manifestement fictifs.
 *
 * C'est la sortie de recette du lot. La géométrie ne se teste pas en jsdom :
 * elle se teste à l'impression, et c'est l'architecte du projet qui fait
 * passer la gate d'impression (chaque classe = 1 page A4) sur ces 8 fichiers.
 *
 * ⛔ `apercus/` est git-ignoré et n'entre JAMAIS dans `dist/` ni au precache :
 * ces fichiers vivent hors du bundle, ils ne partent pas sur l'appareil.
 *
 * Le module TSX se charge par le `ssrLoadModule` de Vite — la même chaîne que
 * l'app, aucune dépendance de plus.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = join(RACINE, 'apercus')

/**
 * `width=790` : à l'écran, la page ne se replie pas — elle se met à l'échelle
 * d'un bloc. C'est la même règle que dans l'app (transform: scale), dite ici
 * avec le seul levier d'un fichier autonome.
 */
const PAGE = (titre, css, corps) => `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=790">
<title>${titre}</title>
<style>html{background:#e8e6e0}body{display:flex;justify-content:center;padding:8px;margin:0}
@media print{html{background:#fff}body{display:block;padding:0}}
${css}</style>
</head>
<body>
${corps}
</body>
</html>
`

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  // Le composant importe sa feuille de style ; en SSR, Vite ne l'injecte pas.
  // L'aperçu autonome l'inline donc depuis LA MÊME source sur disque.
  const { CSS_PAGE } = await vite.ssrLoadModule('/src/pages/impression/css.ts')
  // La police embarquée (D27-ter) : même déclaration que dans l'app, mais avec
  // des chemins absolus — l'aperçu vit hors du bundle, Vite ne résout rien.
  const polices = readFileSync(join(RACINE, 'src/pages/impression/polices.css'), 'utf8').replace(
    /url\(\.\/polices\//g,
    `url(file://${join(RACINE, 'src/pages/impression/polices')}/`,
  )
  // D27-quater — l'aperçu embarque le CSS CONSTRUIT de l'app (Tailwind, polices,
  // resets) : la feuille imprimée hérite de cette cascade (`line-height` de
  // `html`, entre autres) et une gate qui la mesure sans elle mesure autre chose.
  const dist = join(RACINE, 'dist/assets')
  const feuilleCss = existsSync(dist) ? readdirSync(dist).find((f) => /^index-.*\.css$/.test(f)) : undefined
  if (!feuilleCss) throw new Error('dist/assets/index-*.css introuvable : `npm run build` d’abord')
  const cssApp = readFileSync(join(dist, feuilleCss), 'utf8').replace(/url\(\/assets\//g, `url(file://${dist}/`)
  const css =
    cssApp + CSS_PAGE + polices + readFileSync(join(RACINE, 'src/pages/impression/feuille.css'), 'utf8')
  const { classesSquelette } = await vite.ssrLoadModule('/src/rules/stats.ts')
  const { ficheExemple } = await vite.ssrLoadModule('/src/pages/impression/exemples.ts')
  const { default: FeuilleImpression } = await vite.ssrLoadModule(
    '/src/pages/impression/FeuilleImpression.tsx',
  )

  mkdirSync(DOSSIER, { recursive: true })
  const ecrits = []
  for (const classe of classesSquelette()) {
    const corps = renderToStaticMarkup(
      createElement(FeuilleImpression, { fiche: ficheExemple(classe.id) }),
    )
    const fichier = join(DOSSIER, `feuille-${classe.id}.html`)
    writeFileSync(fichier, PAGE(`Feuille 12+ — ${classe.nom}`, css, corps), 'utf8')
    ecrits.push(fichier)
  }
  console.log(`${ecrits.length} aperçus écrits dans apercus/ :`)
  for (const fichier of ecrits) console.log('  ', fichier.slice(RACINE.length + 1))
} finally {
  await vite.close()
}
