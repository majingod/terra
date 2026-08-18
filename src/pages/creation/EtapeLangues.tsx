/**
 * Étape 7 — Langues (maquette A v3) : acquises en chips fixes, puis choix
 * en chips (✕ pour retirer, estompées quand le droit est atteint).
 * La Langue des morts n'est jamais proposée à la création.
 */
import { droitLangues, languesAcquises, languesProposables, listeLangues } from '../../rules/langues'
import { getRules } from '../../rules/load'
import { valeurCarac } from '../../rules/stats'
import { surplusLangues } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { ErreurNote, Note, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeLangues({ fiche, onMaj }: Props) {
  const esprit = valeurCarac(fiche, 'e')
  const acquises = languesAcquises(fiche.race, fiche.classe)
  const choix = fiche.langChoix ?? []
  const droit = droitLangues(esprit, fiche.comps ?? [])
  const surplus = surplusLangues(fiche)
  const pool = languesProposables(fiche.race, fiche.classe).filter((l) => !choix.includes(l.id))
  const erudit = (fiche.comps ?? []).includes('erudit')

  function nomDe(id: string): string {
    return listeLangues().find((l) => l.id === id)?.nom ?? id
  }

  return (
    <section>
      <h2 className="titre-etape">Tes langues</h2>
      <Tutoriel
        etapeId="langues"
        gestes={[
          'Ta race te donne ses langues d’office — rien à faire pour elles.',
          droit > 0 ? (
            <>
              Tu as <b>{droit} langue{droit > 1 ? 's' : ''}</b> de plus à choisir : touche-les
              dessous.
            </>
          ) : (
            'Tu n’as aucune langue supplémentaire à choisir — continue simplement.'
          ),
          'Envie de plus ? Esprit 3 donne +1 langue, et la compétence Érudit en ajoute.',
        ]}
        pourquoi={`« ${getRules().langues.regle} »`}
      />

      <p className="my-2 text-base text-muted-foreground">
        <b>Langues acquises</b>
      </p>
      <div className="flex flex-wrap gap-2">
        {acquises.map((id) => (
          <span key={id} className="chip chip-on pointer-events-none">
            {nomDe(id)}
          </span>
        ))}
      </div>

      {droit > 0 && (
        <p className="mb-1 mt-4 text-base text-muted-foreground">
          <b>À choisir</b> — {choix.length}/{droit}
          {esprit >= 3 ? ' · +1 d’Esprit 3' : ''}
          {erudit ? ` · +${esprit > 1 ? 2 : 1} d’Érudit` : ''}
        </p>
      )}
      {surplus > 0 && (
        <ErreurNote>
          Retire {surplus} langue{surplus > 1 ? 's' : ''} : ton droit a baissé.
        </ErreurNote>
      )}
      <div className="flex flex-wrap gap-2">
        {choix.map((id) => (
          <button
            key={id}
            type="button"
            className="chip chip-on"
            onClick={() => onMaj({ ...fiche, langChoix: choix.filter((l) => l !== id) })}
          >
            {nomDe(id)} ✕
          </button>
        ))}
        {pool.map((langue) => {
          const plein = choix.length >= droit
          return (
            <button
              key={langue.id}
              type="button"
              disabled={plein}
              className={`chip ${plein ? 'pointer-events-none opacity-40' : ''}`}
              onClick={() => onMaj({ ...fiche, langChoix: [...choix, langue.id] })}
            >
              {langue.nom}
            </button>
          )
        })}
      </div>
      <Note>
        Druidique est réservée aux druides (acquise d'office) ; la Langue des morts ne s'obtient
        jamais à la création (Tome p.7).
      </Note>
    </section>
  )
}
