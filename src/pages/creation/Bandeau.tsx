/**
 * Bandeau de stats vivant (maquette A v3) : PV · MANA · LUTTE · XP, fixé en
 * bas de l'écran au-dessus de la navigation, dès que la classe est choisie.
 * Caché sur l'étape Fiche (la fiche montre tout).
 */
import { statsDe } from '../../rules/stats'
import { xpRestant } from '../../rules/heritage'
import type { FicheCreation } from '../../wizard/types'

export default function Bandeau({ fiche }: { fiche: FicheCreation }) {
  const stats = statsDe(fiche)
  if (!stats) return null
  const restant = xpRestant(fiche)
  return (
    <div className="pas-a-imprimer pointer-events-none fixed inset-x-0 bottom-[76px] z-40">
      <div className="mx-auto max-w-[640px] px-4">
        <div className="flex justify-around rounded-xl border border-border/50 bg-popover/90 px-1.5 py-1.5 backdrop-blur-sm">
          {(
            [
              ['PV', String(stats.pv), 'text-chart-4'],
              ['MANA', String(stats.mana), 'text-sanctum-texte'],
              ['LUTTE', String(stats.lutte), 'text-gold'],
              ['XP', String(restant), restant < 0 ? 'text-destructive' : 'text-gold'],
            ] as Array<[string, string, string]>
          ).map(([nom, valeur, couleur]) => (
            <div key={nom} className="text-center font-sans">
              <b className={`block font-wordmark text-base ${couleur}`}>{valeur}</b>
              <small className="text-[10.5px] tracking-wide text-muted-foreground">{nom}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
