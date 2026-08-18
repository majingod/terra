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
        <div className="flex justify-around rounded-xl border border-ligne bg-[#0d1320ee] px-1.5 py-1.5 backdrop-blur-sm">
          {(
            [
              ['PV', String(stats.pv), 'text-[#7fd39a]'],
              ['MANA', String(stats.mana), 'text-[#8db8f2]'],
              ['LUTTE', String(stats.lutte), 'text-[#ecb060]'],
              ['XP', String(restant), restant < 0 ? 'text-[#e05252]' : 'text-or'],
            ] as Array<[string, string, string]>
          ).map(([nom, valeur, couleur]) => (
            <div key={nom} className="text-center font-sans">
              <b className={`block font-wordmark text-base ${couleur}`}>{valeur}</b>
              <small className="text-[10.5px] tracking-wide text-[#6b7688]">{nom}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
