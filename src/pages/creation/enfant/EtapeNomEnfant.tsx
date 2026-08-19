/**
 * Flux ≤11 — étape Nom. Le nom du PERSONNAGE, jamais le vrai nom du joueur.
 * C'est le seul champ libre de tout le flux enfant : ni date de naissance,
 * ni âge exact, ni histoire à écrire.
 */
import { avecChoixEnfant, choixEnfant } from '../../../wizard/enfant'
import type { FicheCreation } from '../../../wizard/types'
import { Tutoriel } from '../ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

const CHAMP =
  'w-full rounded-lg border-[1.5px] border-border/50 bg-input p-3 font-corps text-[16.5px] text-foreground focus:border-primary focus:outline-none'

export default function EtapeNomEnfant({ fiche, onMaj }: Props) {
  return (
    <section>
      <h2 className="titre-etape">Le nom de ton personnage</h2>
      <Tutoriel
        etapeId="enfant-nom"
        gestes={['Écris le nom de ton personnage.', 'Puis passe à ta fiche.']}
        pourquoi="c’est le nom de ton personnage dans le jeu — jamais ton vrai nom."
      />
      <label className="my-2 block text-[17px] font-semibold" htmlFor="inom-enfant">
        Nom de ton personnage
      </label>
      <input
        id="inom-enfant"
        type="text"
        value={choixEnfant(fiche).nom ?? ''}
        onChange={(e) => onMaj(avecChoixEnfant(fiche, { nom: e.target.value }))}
        className={CHAMP}
        placeholder="Ex. Brume, Tao, Griffe-de-Lune"
        autoComplete="off"
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Le nom de ton <b>personnage</b> — jamais ton vrai nom.
      </p>
    </section>
  )
}
