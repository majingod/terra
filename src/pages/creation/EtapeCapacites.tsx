/**
 * Étape — « Tes capacités » (D16). Elle remplace le choix de voie : la voie
 * n'est plus un enclos, c'est une étiquette portée par chaque capacité.
 *
 * Un emplacement par niveau du personnage. L'emplacement du niveau k s'ouvre
 * sur TOUT l'arbre de la classe jusqu'à l'échelon k — les trois voies, en
 * accordéons fermés par défaut (maquette v5) ; ouvrir une voie montre chaque
 * capacité avec son texte complet (D14 : `affichage ?? verbatim`, jamais
 * réécrit à la main), et ce qui est déjà pris ailleurs rayé.
 *
 * D5 : ni le nombre d'emplacements ni le plafond ne sont écrits ici — ils
 * viennent de la table d'évolution et du champ `niveau` des capacités.
 *
 * D17 : le sélecteur en accordéons vit dans `SelecteurCapacites` — la montée
 * de niveau depuis la fiche réutilise EXACTEMENT le même écran de choix.
 */
import { useState } from 'react'
import { niveauMax } from '../../rules/niveau'
import { listeDons } from '../../rules/talents'
import { prendUnDonAuLieuDUneCapacite } from '../../rules/troc'
import {
  capaciteParId,
  niveauxDeLaFiche,
  optionsDuNiveau,
  type CapaciteDeFiche,
} from '../../wizard/capacites'
import { libelleTrocDuGuerrier, optionsDeTrocDon } from '../../wizard/troc'
import type { FicheCreation } from '../../wizard/types'
import SelecteurCapacites from './SelecteurCapacites'
import { Badge, Note, TexteRegle, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

/** Le nom d'une capacité, sa marche et sa voie — la même ligne partout. */
export function LigneCapacite({
  capacite,
  achatXp,
}: {
  capacite: CapaciteDeFiche['capacite']
  achatXp?: boolean
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <b className="text-[17px]">{capacite.nom}</b>
      <Badge>niv {capacite.niveau}</Badge>
      <i className="text-[14.5px] text-muted-foreground">{capacite.voieNom}</i>
      {achatXp && <span className="text-[14.5px] text-muted-foreground">· achat XP</span>}
    </span>
  )
}

/**
 * L'aide au bas d'un emplacement ouvert : ce jusqu'où CE choix peut aller,
 * et ce qui attend aux prochains niveaux. Trois formes, parce que le français
 * n'accorde pas comme les bornes d'un intervalle (libellés arbitrés par
 * l'organisateur, mot pour mot) :
 * - il reste plusieurs échelons au-dessus : « de niveau k+1 à N … prochains
 *   niveaux » ;
 * - il n'en reste qu'un : « de niveau N … au prochain niveau » ;
 * - au dernier échelon de la table, seule la première phrase a un sens.
 *
 * D5 : le plafond vient de la table d'évolution, jamais d'un 5 écrit ici.
 */
export function texteAide(niveauDuChoix: number, plafond: number): string {
  const premiere = `Ce choix-ci peut aller jusqu'au niveau ${niveauDuChoix}.`
  if (niveauDuChoix >= plafond) return premiere
  const suivant = niveauDuChoix + 1
  if (suivant === plafond) {
    return `${premiere} Les capacités de niveau ${plafond} t'attendent au prochain niveau.`
  }
  return `${premiere} Les capacités de niveau ${suivant} à ${plafond} t'attendent aux prochains niveaux.`
}

/** Le nom d'un don rangé dans un emplacement de capacité (D18). */
export function LigneDon({ nom, cumulable }: { nom: string; cumulable?: boolean }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <b className="text-[17px]">{nom}</b>
      <Badge>don</Badge>
      {cumulable && <Badge>cumulable</Badge>}
    </span>
  )
}

export default function EtapeCapacites({ fiche, onMaj }: Props) {
  const niveaux = niveauxDeLaFiche(fiche)
  const troque = prendUnDonAuLieuDUneCapacite(fiche.classe)
  const premierVide = niveaux.find(
    (niveau) => !fiche.capNiveaux?.[String(niveau)] && !fiche.donNiveaux?.[String(niveau)],
  )
  const [ouvertBrut, setOuvert] = useState<number | null>(null)
  const ouvert = ouvertBrut ?? premierVide ?? null
  const plafond = niveauMax()

  /**
   * Pose un choix dans l'emplacement du niveau k. D18 : l'emplacement porte
   * une capacité OU un don — poser l'un retire l'autre, et retoucher le choix
   * courant le désélectionne.
   */
  function poser(niveau: number, id: string, don: boolean) {
    const cle = String(niveau)
    const actuel = don ? fiche.donNiveaux?.[cle] : fiche.capNiveaux?.[cle]
    const capNiveaux = { ...(fiche.capNiveaux ?? {}) }
    const donNiveaux = { ...(fiche.donNiveaux ?? {}) }
    delete capNiveaux[cle]
    delete donNiveaux[cle]
    if (actuel !== id) {
      if (don) donNiveaux[cle] = id
      else capNiveaux[cle] = id
    }
    onMaj({ ...fiche, capNiveaux, donNiveaux })
    if (actuel === id) return
    const suivant = niveaux.find(
      (n) => n !== niveau && !capNiveaux[String(n)] && !donNiveaux[String(n)],
    )
    setOuvert(suivant ?? null)
  }

  return (
    <section>
      <h2 className="titre-etape">Tes capacités</h2>
      <p className="my-2 text-[15.5px] text-muted-foreground">
        À chaque niveau, tu as choisi 1 capacité de ta classe — n'importe quelle voie, de ce
        niveau ou d'un niveau plus bas. Jamais deux fois la même.
      </p>
      <Tutoriel
        etapeId="capacites"
        gestes={[
          'Touche un emplacement : les trois voies de ta classe apparaissent, repliées.',
          'Touche une voie pour l’ouvrir et voir ses capacités, texte complet.',
          'Une capacité déjà prise ailleurs est rayée — jamais deux fois la même.',
          'Retoucher la carte choisie la désélectionne ; « Changer » rouvre un emplacement rempli.',
          ...(troque
            ? ['Sous les voies, ta classe ouvre une voie de plus : un don à la place de la capacité.']
            : []),
        ]}
        pourquoi="la voie n'est pas un enclos : elle nomme la capacité, elle ne t'enferme pas."
      />

      {niveaux.map((niveau) => {
        const id = fiche.capNiveaux?.[String(niveau)]
        const capacite = id ? capaciteParId(fiche.classe, id) : undefined
        const donId = fiche.donNiveaux?.[String(niveau)]
        const don = donId ? listeDons().find((d) => d.id === donId) : undefined
        const rempli = capacite !== undefined || don !== undefined
        const estOuvert = ouvert === niveau
        return (
          <div key={niveau} className="carte-choix my-2 rounded-lg border border-border/50 bg-card/50 p-3.5 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="m-0 font-sans text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Capacité du niveau {niveau}
              </h3>
              {rempli && !estOuvert && (
                <button
                  type="button"
                  className="subsel-btn max-w-[8rem] flex-none"
                  onClick={() => setOuvert(niveau)}
                >
                  Changer
                </button>
              )}
            </div>

            {capacite && !estOuvert && (
              <div className="mt-1">
                <LigneCapacite capacite={capacite} />
                <TexteRegle source={capacite} />
              </div>
            )}

            {don && !estOuvert && (
              <div className="mt-1">
                <LigneDon nom={don.nom} cumulable={don.cumulable} />
                <TexteRegle source={don} />
              </div>
            )}

            {!rempli && !estOuvert && (
              <button
                type="button"
                className="subsel-btn mt-2 w-full"
                onClick={() => setOuvert(niveau)}
              >
                Choisir
              </button>
            )}

            {estOuvert && (
              <div className="mt-1">
                {/* `key` par emplacement : changer d'emplacement replie les
                    voies, comme la maquette v5 le demande. */}
                <SelecteurCapacites
                  key={niveau}
                  options={optionsDuNiveau(fiche, niveau)}
                  onChoisir={(id) => poser(niveau, id, false)}
                  troc={
                    troque
                      ? {
                          titre: libelleTrocDuGuerrier(),
                          options: optionsDeTrocDon(fiche, { niveau }),
                          onChoisir: (id) => poser(niveau, id, true),
                        }
                      : undefined
                  }
                />
                <Note>{texteAide(niveau, plafond)}</Note>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
