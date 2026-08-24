/**
 * Fiche ≤11 (planche enfant) : Identité, Statistiques, « Ce que tu sais
 * faire » (seulement l'acquis — les pouvoirs au-dessus du niveau ne sont pas
 * listés), D24 « Ton métier » et « Tes langues » (absentes sur une fiche
 * d'avant le lot, sans `competence`), la règle maison, et la version du
 * corpus enfant lue du fichier.
 *
 * Tous les textes passent par TexteRegle (`affichage ?? verbatim`, D14).
 */
import {
  capacitesEnfantAcquises,
  classeEnfant,
  competenceEnfant,
  factionEnfant,
  getVersionKids,
  normaliserNiveauEnfant,
  raceEnfant,
  regleMaisonEnfant,
  statsEnfant,
} from '../../../rules/kids'
import { languesAcquisesEnfant, languesPigeablesEnfant } from '../../../rules/langues_kids'
import { choixEnfant } from '../../../wizard/enfant'
import type { FicheCreation } from '../../../wizard/types'
import { Badge, TexteRegle } from '../ui'

function Sheet({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-3.5">
      <h3 className="m-0 mb-2 font-titre text-xl font-bold text-gold">{titre}</h3>
      {children}
    </div>
  )
}

export default function FicheEnfantAffichage({ fiche }: { fiche: FicheCreation }) {
  const choix = choixEnfant(fiche)
  const classe = classeEnfant(choix.classe)
  const faction = factionEnfant(choix.faction)
  const niveau = normaliserNiveauEnfant(choix.niveau)
  const stats = statsEnfant(choix.classe, niveau)
  const capacites = capacitesEnfantAcquises(choix.classe, niveau)
  const regleMaison = regleMaisonEnfant()
  // D24 — absent sur une fiche d'avant le lot : la section entière s'efface,
  // rien ne casse, rien ne s'invente à sa place.
  const competence = competenceEnfant(choix.competence)
  const languesAcquises = languesAcquisesEnfant(choix.classe)
  const languesChoisies = (choix.langues ?? []).map(
    (id) => languesPigeablesEnfant().find((langue) => langue.id === id)?.nom ?? id,
  )

  const tuiles: Array<[string, number, string]> = stats
    ? [
        ['PV', stats.pv, 'text-chart-4'],
        ['Dégâts', stats.degats, 'text-legion-texte'],
        ['Lutte', stats.lutte, 'text-gold'],
      ]
    : []

  return (
    <div className="fiche-imprimable">
      <Sheet titre="Identité">
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Nom</div>
            <div className="text-[19px] font-semibold text-gold">{choix.nom || '—'}</div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Camp</div>
            <div
              className={`text-[19px] font-semibold ${
                choix.faction === 'legion' ? 'text-legion-texte' : 'text-sanctum-texte'
              }`}
            >
              {faction?.nom ?? '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Race</div>
            <div className="text-[19px] font-semibold">{raceEnfant().nom}</div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Classe</div>
            <div className="text-[19px] font-semibold">{classe?.nom ?? '—'}</div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Niveau</div>
            <div className="text-[19px] font-semibold">{niveau}</div>
          </div>
        </div>
      </Sheet>

      {stats && (
        <Sheet titre="Statistiques">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {tuiles.map(([nom, valeur, couleur]) => (
              <div key={nom}>
                <div className={`font-wordmark text-[26px] font-extrabold ${couleur}`}>
                  {valeur}
                </div>
                <div className="font-sans text-[12.5px] text-muted-foreground">{nom}</div>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {classe && (
        <Sheet titre="Ce que tu sais faire">
          {capacites.map((capacite) => (
            <div key={capacite.id} className="border-t border-border/30 py-2 first:border-t-0">
              <b>{capacite.nom_affichage ?? capacite.nom}</b>{' '}
              <Badge variante="gold">niveau {capacite.niveau}</Badge>
              <TexteRegle source={capacite} />
            </div>
          ))}
        </Sheet>
      )}

      {competence && (
        <Sheet titre="Ton métier">
          <p className="my-1 text-[17px] font-semibold">
            {competence.nom_affichage ?? competence.nom}
          </p>
          {competence.affichage ? (
            <TexteRegle source={{ affichage: competence.affichage }} />
          ) : (
            <>
              <TexteRegle source={{ verbatim: competence.description }} />
              <TexteRegle source={{ verbatim: competence.base }} />
            </>
          )}
          {competence.materiel && (
            <Badge>{`🎒 Apporte si tu peux : ${competence.materiel} — pas grave si tu n'en as pas.`}</Badge>
          )}
          <details className="mt-1.5 border-t border-border/30 pt-1.5">
            <summary className="cursor-pointer text-sm text-secondary-foreground">
              🔒 Avantage avancé — à l'atelier de faction rang 2
            </summary>
            <TexteRegle source={{ verbatim: competence.avance }} />
          </details>
        </Sheet>
      )}

      {competence && (
        <Sheet titre="Tes langues">
          <p className="my-1 text-[17px]">
            Commun
            {languesAcquises.includes('druidique') ? ' · (Druidique)' : ''}
            {languesChoisies.length > 0 ? ` · ${languesChoisies.join(', ')}` : ''}
          </p>
        </Sheet>
      )}

      <Sheet titre={regleMaison.nom}>
        <TexteRegle source={regleMaison} />
      </Sheet>

      {faction && (
        <Sheet titre={`Ton camp — ${faction.nom}`}>
          <TexteRegle source={faction} />
        </Sheet>
      )}

      <p className="my-4 text-center">
        <span className="inline-block rounded-full border border-border/50 bg-input px-2.5 py-1 font-sans text-xs text-secondary-foreground">
          Règles enfant v{getVersionKids()}
        </span>
      </p>
    </div>
  )
}
