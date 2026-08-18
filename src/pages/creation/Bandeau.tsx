/**
 * Bandeau de stats vivant : PV · Mana · Lutte · XP restant, visible dès que
 * la classe est choisie (coupe interne ② si le temps manque — livré ici).
 */
import { statsDe } from '../../rules/stats'
import { xpRestant } from '../../rules/heritage'
import type { FicheCreation } from '../../wizard/types'

export default function Bandeau({ fiche }: { fiche: FicheCreation }) {
  const stats = statsDe(fiche)
  if (!stats) return null
  const restant = xpRestant(fiche)
  const cellules: Array<[string, string]> = stats.ressourceSpeciale
    ? [
        [stats.ressourceSpeciale.nom, String(stats.ressourceSpeciale.valeur)],
        ['Lutte', String(stats.lutte)],
        ['XP restant', String(restant)],
      ]
    : [
        ['PV', String(stats.pv)],
        ['Mana', String(stats.mana)],
        ['Lutte', String(stats.lutte)],
        ['XP restant', String(restant)],
      ]
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-px overflow-hidden rounded-xl border border-ligne bg-ligne text-center">
      {cellules.map(([nom, valeur]) => (
        <div key={nom} className="bg-panneau px-1 py-1.5">
          <div className="text-[11px] uppercase tracking-wide text-stone-400">{nom}</div>
          <div className={`font-titre text-lg font-bold ${nom === 'XP restant' && restant < 0 ? 'text-legion' : 'text-or'}`}>
            {valeur}
          </div>
        </div>
      ))}
    </div>
  )
}
