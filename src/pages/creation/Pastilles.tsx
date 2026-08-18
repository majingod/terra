/**
 * Progression (maquette A v3) : « Étape X sur 9 », barre, puis pastilles
 * NOMMÉES et numérotées — ✓ vert quand complétée et passée, orange pour la
 * courante, verrou (estompée) quand une étape précédente est invalide.
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
    <nav aria-label="Étapes de création" className="pb-1">
      <div className="flex justify-between px-1 font-sans text-sm text-muted-foreground">
        <span>
          Étape {etape + 1} sur {ETAPES.length}
        </span>
        <span>{ETAPES[etape].nom}</span>
      </div>
      <div className="mx-1 my-1.5 h-[7px] overflow-hidden rounded-full bg-muted">
        <i
          className="block h-full rounded-full bg-gradient-to-r from-gold to-primary"
          style={{ width: `${((etape + 1) / ETAPES.length) * 100}%` }}
        />
      </div>
      <ol className="flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
        {ETAPES.map((definition, index) => {
          const accessible = valides.slice(0, index).every(Boolean)
          const courante = index === etape
          const faite = valides[index] && index < etape
          return (
            <li key={definition.id} className="flex-none">
              <button
                type="button"
                disabled={!accessible}
                onClick={() => onAller(index)}
                aria-current={courante ? 'step' : undefined}
                className={`flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] py-1 pl-1.5 pr-3 font-sans text-[13px] ${
                  courante
                    ? 'border-primary bg-primary/10 text-white'
                    : faite
                      ? 'border-chart-4/50 bg-card/50 backdrop-blur-sm text-foreground'
                      : 'border-border/50 bg-card/50 backdrop-blur-sm text-muted-foreground'
                } ${!accessible ? 'opacity-45' : ''}`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] text-[11px] ${
                    courante
                      ? 'border-primary bg-primary text-white'
                      : faite
                        ? 'border-chart-4/60 bg-chart-4 text-white'
                        : 'border-border/50'
                  }`}
                >
                  {faite ? '✓' : index + 1}
                </span>
                {!accessible && (
                  <span role="img" aria-label="verrouillée" className="text-[10px]">
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
