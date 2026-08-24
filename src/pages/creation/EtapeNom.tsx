/**
 * Étape 8 — Nom (maquette A v3) : le nom du PERSONNAGE, l'histoire optionnelle
 * — et, depuis D25, le vrai nom du JOUEUR.
 *
 * Deux noms, deux champs, jamais confondus. Celui du personnage est celui du
 * jeu ; celui du joueur sert à retrouver à qui est la feuille quand une famille
 * en imprime trois. Le second est TOUJOURS optionnel : jamais exigé, jamais
 * pré-rempli, et vide il ne laisse rien en magasin (`wizard/nomDuJoueur`).
 */
import { Tutoriel } from './ui'
import type { FicheCreation } from '../../wizard/types'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

const CHAMP =
  'w-full rounded-lg border-[1.5px] border-border/50 bg-input p-3 font-corps text-[16.5px] text-foreground focus:border-primary focus:outline-none'

export default function EtapeNom({ fiche, onMaj }: Props) {
  return (
    <section>
      <h2 className="titre-etape">Ton personnage</h2>
      <Tutoriel
        etapeId="nom"
        gestes={[
          'Donne un nom à ton personnage.',
          'Ajoute son histoire si tu veux — c’est optionnel.',
        ]}
        pourquoi="deux noms : celui de ton personnage pour le jeu, et le tien pour retrouver à qui est la feuille. Ton vrai nom reste sur cet appareil et sur la feuille imprimée — jamais en ligne."
      />
      <label className="my-2 block text-[17px] font-semibold" htmlFor="inom">
        Nom de ton personnage
      </label>
      <input
        id="inom"
        type="text"
        value={fiche.nom ?? ''}
        onChange={(e) => onMaj({ ...fiche, nom: e.target.value })}
        className={CHAMP}
        placeholder="Ex. Kaelen Sombrelame"
        autoComplete="off"
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Le nom de ton <b>personnage</b> — celui que les autres joueurs connaissent.
      </p>
      {/* D25 — le vrai nom du joueur. La saisie garde ses blancs telle quelle :
          c'est l'enregistrement qui trime (sinon on ne pourrait pas taper
          l'espace entre un prénom et un nom). */}
      <label className="my-2 block text-[17px] font-semibold" htmlFor="inom-joueur">
        Ton nom à toi (le joueur —{' '}
        <span className="font-normal text-muted-foreground">optionnel</span>)
      </label>
      <input
        id="inom-joueur"
        type="text"
        value={fiche.nomDuJoueur ?? ''}
        onChange={(e) => onMaj({ ...fiche, nomDuJoueur: e.target.value })}
        className={CHAMP}
        placeholder="Ex. le vrai nom, ou laisse vide"
        autoComplete="off"
        maxLength={40}
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Pratique quand une famille imprime plusieurs feuilles. Tu peux aussi le laisser vide et
        l’écrire au crayon sur la feuille.
      </p>
      <label className="my-2 block text-[17px] font-semibold" htmlFor="ihist">
        Histoire (optionnel)
      </label>
      <textarea
        id="ihist"
        rows={4}
        value={fiche.histoire ?? ''}
        onChange={(e) => onMaj({ ...fiche, histoire: e.target.value })}
        className={CHAMP}
        placeholder="Son passé, ses motivations…"
      />
    </section>
  )
}
