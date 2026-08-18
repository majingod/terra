/**
 * Navigation par pastilles NOMMÉES : ✓ quand l'étape est complétée,
 * cliquable vers toute étape dont TOUTES les précédentes sont valides,
 * verrou sinon.
 */
import { ETAPES, etapesValides } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'

interface PastillesProps {
  fiche: FicheCreation
  etape: number
  onAller: (index: number) => void
}

export default function Pastilles({ fiche, etape, onAller }: PastillesProps) {
  const valides = etapesValides(fiche)
  return (
    <nav aria-label="Étapes de création" className="overflow-x-auto">
      <ol className="flex w-max gap-1 px-1 py-2">
        {ETAPES.map((definition, index) => {
          const accessible = valides.slice(0, index).every(Boolean)
          const courante = index === etape
          const complete = accessible && valides[index]
          return (
            <li key={definition.id}>
              <button
                type="button"
                disabled={!accessible}
                onClick={() => onAller(index)}
                aria-current={courante ? 'step' : undefined}
                className={`flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 font-titre text-sm font-semibold transition-colors ${
                  courante
                    ? 'border-or bg-or text-fond'
                    : complete
                      ? 'border-ok text-ok'
                      : accessible
                        ? 'border-ligne text-stone-200'
                        : 'border-ligne text-stone-500'
                }`}
              >
                {complete && !courante && <span aria-hidden>✓</span>}
                {!accessible && (
                  <span role="img" aria-label="verrouillée">
                    🔒
                  </span>
                )}
                <span>{definition.nom}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
