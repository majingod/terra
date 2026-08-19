/**
 * Arbre d'une voie : ses échelons, du plus bas au plus haut, chacun avec son
 * texte de règle complet (D4-bis). Un seul composant sert les deux écrans —
 * le choix de voie dans le wizard et l'encyclopédie.
 *
 * `acquises` est optionnel : le wizard le fournit (et l'échelon acquis se
 * marque, les autres s'estompent) ; l'encyclopédie ne le fournit pas — elle
 * ne parle d'aucun personnage, donc elle ne promet ni n'estompe rien.
 */
import type { Capacite } from '../rules/load'
import { Badge, TexteRegle } from '../pages/creation/ui'

interface Props {
  capacites: readonly Capacite[]
  acquises?: ReadonlySet<string>
}

export default function ArbreVoie({ capacites, acquises }: Props) {
  const marque = acquises !== undefined
  return (
    <ol className="m-0 list-none p-0">
      {[...capacites]
        .sort((a, b) => a.niveau - b.niveau)
        .map((capacite) => {
          const acquise = acquises?.has(capacite.id) ?? false
          return (
            <li
              key={capacite.id}
              className={`border-t border-border/30 py-1.5 first:border-t-0 ${
                marque && !acquise ? 'opacity-70' : ''
              }`}
            >
              <Badge variante={acquise ? 'gold' : undefined}>
                Niv {capacite.niveau}
                {acquise ? ' · acquis' : ''}
              </Badge>
              <TexteRegle gras={capacite.nom} source={capacite} />
            </li>
          )
        })}
    </ol>
  )
}
