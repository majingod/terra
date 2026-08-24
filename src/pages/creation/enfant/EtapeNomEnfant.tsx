/**
 * Flux ≤11 — étape Nom : le nom du PERSONNAGE, et depuis D25 le vrai nom du
 * JOUEUR, optionnel.
 *
 * Les deux ne se confondent jamais. Le nom du personnage est celui du jeu ;
 * celui du joueur sert à retrouver sa fiche quand une famille en a plusieurs.
 * D27-bis : les ≤11 n'ont pas de feuille imprimée — pour eux le champ vaut à
 * l'écran et à l'export, et l'aide ne parle donc pas d'impression.
 *
 * Ni date de naissance ni âge exact ici, pas plus qu'ailleurs dans le flux.
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
        pourquoi="deux noms : celui de ton personnage pour le jeu, et le tien pour retrouver ta fiche. Ton vrai nom reste sur cet appareil — jamais en ligne."
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
        Le nom de ton <b>personnage</b> — celui que les autres joueurs connaissent.
      </p>
      {/* D25 — le vrai nom du joueur vit sur la fiche elle-même
          (`nomDuJoueur`), jamais sous les choix de la planche enfant : c'est le
          MÊME champ que dans le flux 12+. */}
      <label className="my-2 block text-[17px] font-semibold" htmlFor="inom-joueur-enfant">
        Ton nom à toi (le joueur —{' '}
        <span className="font-normal text-muted-foreground">optionnel</span>)
      </label>
      <input
        id="inom-joueur-enfant"
        type="text"
        value={fiche.nomDuJoueur ?? ''}
        onChange={(e) => onMaj({ ...fiche, nomDuJoueur: e.target.value })}
        className={CHAMP}
        placeholder="Ex. le vrai nom, ou laisse vide"
        autoComplete="off"
        maxLength={40}
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Pratique quand une famille a plusieurs fiches. Tu peux aussi le laisser vide.
      </p>
    </section>
  )
}
