/**
 * Étape — « Tes capacités » (D16). Elle remplace le choix de voie : la voie
 * n'est plus un enclos, c'est une étiquette portée par chaque capacité.
 *
 * Un emplacement par niveau du personnage. L'emplacement du niveau k s'ouvre
 * sur TOUT l'arbre de la classe jusqu'à l'échelon k — les trois voies, chaque
 * capacité avec son texte (D14 : `affichage ?? verbatim`, jamais réécrit à la
 * main), et ce qui est déjà pris ailleurs rayé.
 *
 * D5 : ni le nombre d'emplacements ni le plafond ne sont écrits ici — ils
 * viennent de la table d'évolution et du champ `niveau` des capacités.
 */
import { useState } from 'react'
import { niveauMax } from '../../rules/niveau'
import {
  capaciteParId,
  niveauxDeLaFiche,
  optionsDuNiveau,
  type CapaciteDeFiche,
  type OptionDeCapacite,
} from '../../wizard/capacites'
import type { FicheCreation } from '../../wizard/types'
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

/** Les options d'un emplacement, regroupées par voie, dans l'ordre de l'arbre. */
function groupesParVoie(options: OptionDeCapacite[]) {
  const groupes: Array<{ voieId: string; voieNom: string; options: OptionDeCapacite[] }> = []
  for (const option of options) {
    const dernier = groupes.find((g) => g.voieId === option.capacite.voieId)
    if (dernier) dernier.options.push(option)
    else
      groupes.push({
        voieId: option.capacite.voieId,
        voieNom: option.capacite.voieNom,
        options: [option],
      })
  }
  return groupes
}

export default function EtapeCapacites({ fiche, onMaj }: Props) {
  const niveaux = niveauxDeLaFiche(fiche)
  const premierVide = niveaux.find((niveau) => !fiche.capNiveaux?.[String(niveau)])
  const [ouvertBrut, setOuvert] = useState<number | null>(null)
  const ouvert = ouvertBrut ?? premierVide ?? null
  const plafond = niveauMax()

  function choisir(niveau: number, id: string) {
    const capNiveaux = { ...(fiche.capNiveaux ?? {}), [String(niveau)]: id }
    onMaj({ ...fiche, capNiveaux })
    const suivant = niveaux.find((n) => n !== niveau && !capNiveaux[String(n)])
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
          'Touche un emplacement : tout l’arbre de ta classe s’ouvre, voie par voie.',
          'Une capacité déjà prise ailleurs est rayée — jamais deux fois la même.',
          '« Changer » rouvre un emplacement déjà rempli.',
        ]}
        pourquoi="la voie n'est pas un enclos : elle nomme la capacité, elle ne t'enferme pas."
      />

      {niveaux.map((niveau) => {
        const id = fiche.capNiveaux?.[String(niveau)]
        const capacite = id ? capaciteParId(fiche.classe, id) : undefined
        const estOuvert = ouvert === niveau
        return (
          <div key={niveau} className="carte-choix my-2 rounded-lg border border-border/50 bg-card/50 p-3.5 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="m-0 font-sans text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Capacité du niveau {niveau}
              </h3>
              {capacite && !estOuvert && (
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

            {!capacite && !estOuvert && (
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
                {groupesParVoie(optionsDuNiveau(fiche, niveau)).map((groupe) => (
                  <div key={groupe.voieId} className="mt-2.5">
                    <h4 className="m-0 mb-1 border-b border-border/40 pb-1 font-sans text-[12.5px] font-semibold uppercase tracking-wide text-gold">
                      {groupe.voieNom}
                    </h4>
                    {groupe.options.map(({ capacite: option, dejaPrise, choisie }) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={dejaPrise}
                        aria-pressed={choisie}
                        onClick={() => choisir(niveau, option.id)}
                        className={`my-1 block w-full rounded-lg border p-2.5 text-left ${
                          choisie
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 bg-muted/40'
                        } ${dejaPrise ? 'cursor-not-allowed opacity-45' : ''}`}
                      >
                        {dejaPrise ? (
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <b className="text-[17px] line-through">{option.nom}</b>
                            <span className="text-[14.5px] italic text-muted-foreground">
                              déjà choisie
                            </span>
                          </span>
                        ) : (
                          <>
                            <LigneCapacite capacite={option} />
                            <TexteRegle source={option} />
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
                <Note>{texteAide(niveau, plafond)}</Note>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
