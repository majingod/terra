/**
 * Fiche (maquette A v3, maquette D16 v2) : Identité, Statistiques,
 * « Capacités », « Ce que tu as acquis » (capacités de base, dons,
 * compétences), Désavantages, Héritage — et la version des règles
 * (meta.version, lue du fichier — D8-bis).
 *
 * D16 : l'en-tête ne porte plus de voie. La voie vit SUR CHAQUE CAPACITÉ, en
 * italique après le niveau — lisible aussi en noir et blanc à l'impression.
 * Les capacités sont triées par niveau croissant, les achats d'héritage
 * marqués « · achat XP », et chacune porte son texte (D14).
 */
import { capacitesDeBase } from '../../rules/branches'
import { niveauCourant } from '../../wizard/historique'
import {
  depenseXp,
  listeAchats,
  listeDesavantages,
  plafondDesavantagesXp,
  xpDesavantages,
} from '../../rules/heritage'
import { languesAcquises, listeLangues } from '../../rules/langues'
import { getRules } from '../../rules/load'
import { classeSquelette, raceDe, statsDe, valeurCarac } from '../../rules/stats'
import { capacitesDeLaFiche } from '../../wizard/capacites'
import { libelleNiveauDuDon } from '../../wizard/datation'
import { donsDeLaFiche } from '../../wizard/troc'
import { texteVersionRegles } from '../../wizard/fiche'
import type { FicheCreation } from '../../wizard/types'
import { LigneCapacite } from './EtapeCapacites'
import { Badge, TexteRegle } from './ui'

function Sheet({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-3.5">
      <h3 className="m-0 mb-2 font-titre text-xl font-bold text-gold">{titre}</h3>
      {children}
    </div>
  )
}

function Acquis({
  nom,
  badge,
  badgeOr,
  /** D19 ③ — le badge de datation, à droite du badge de provenance. */
  niveau,
  verbatim,
}: {
  nom: string
  badge: string
  badgeOr?: boolean
  niveau?: string
  verbatim?: string
}) {
  return (
    <div className="border-t border-border/30 py-2 first:border-t-0">
      <b>{nom}</b> <Badge variante={badgeOr ? 'gold' : undefined}>{badge}</Badge>
      {niveau && <Badge>{niveau}</Badge>}
      {verbatim && <TexteRegle source={{ verbatim }} />}
    </div>
  )
}

/** Étiquette du Tome (ex. « V1.2 »), extraite de meta.source. */
function etiquetteTome(): string {
  const source = getRules().meta.source
  const version = source.match(/V\d+(?:\.\d+)*/)
  return version ? ` — Tome ${version[0]}` : ''
}

export default function FicheAffichage({
  fiche,
  datation = false,
  sousIdentite,
}: {
  fiche: FicheCreation
  /**
   * D19 ③ (Q12 : A, Fred 2026-08-24) — le badge « niv N » près de chaque don
   * acquis. L'écran Fiche l'allume ; le wizard, non (à la création tout date
   * du niveau 1, le badge n'y apprendrait rien) et la feuille imprimée ne le
   * connaît même pas — elle vit dans `src/pages/impression/`, intouché.
   */
  datation?: boolean
  /**
   * t017 (Q24 A, Fred 2026-08-26) — l'emplacement JUSTE SOUS le bandeau
   * d'identité, avant les Statistiques. L'écran Fiche y pose « Tes niveaux » et
   * Monter ; le wizard n'y pose rien.
   *
   * ⚠️ C'est un EMPLACEMENT, pas un contenu : ce composant ne sait pas ce qu'on
   * y met et ne décide de rien à sa place. Sans lui, l'ordre demandé (bandeau →
   * Tes niveaux → Statistiques) serait impossible depuis `Fiche.tsx` seul —
   * Identité et Statistiques sont deux sœurs D'ICI, pas de là-bas.
   *
   * ⛔ Ce qu'on y pose reste `pas-a-imprimer` : la zone est dans
   * `fiche-imprimable`, et c'est l'appelant qui garantit que rien n'y entre
   * dans la feuille (@media print éteint `pas-a-imprimer` avant toute couleur).
   */
  sousIdentite?: React.ReactNode
}) {
  const regles = getRules()
  const race = raceDe(fiche.race)
  const classe = classeSquelette(fiche.classe)
  const faction = regles.factions.liste.find((f) => f.id === fiche.faction)
  const niveau = niveauCourant(fiche)
  const capacites = capacitesDeLaFiche(fiche)
  const stats = statsDe(fiche)
  const dons = donsDeLaFiche(fiche)
  const desavantages = listeDesavantages()
  const plafond = plafondDesavantagesXp()
  const langues = [...languesAcquises(fiche.race, fiche.classe), ...(fiche.langChoix ?? [])].map(
    (id) => listeLangues().find((l) => l.id === id)?.nom ?? id,
  )
  const depense = depenseXp(fiche.achats)
  const comps = fiche.comps ?? []
  const simples = regles.competences.simples
  const artisanats = regles.competences.artisanats.liste

  function nomComp(id: string): string {
    return (
      simples.find((c) => c.id === id)?.nom ?? artisanats.find((a) => a.id === id)?.nom ?? id
    )
  }

  const tuiles: Array<[string, number, string]> = [
    ['PV max', stats?.pv ?? 0, 'text-chart-4'],
    ['Mana max', stats?.mana ?? 0, 'text-sanctum-texte'],
    ['Lutte', stats?.lutte ?? 0, 'text-gold'],
    ['Puissance', valeurCarac(fiche, 'p'), 'text-legion-texte'],
    ['Résistance', valeurCarac(fiche, 'r'), 'text-chart-4'],
    ['Esprit', valeurCarac(fiche, 'e'), 'text-sanctum-texte'],
  ]

  return (
    <div className="fiche-imprimable">
      <Sheet titre="Identité">
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Nom</div>
            <div className="text-[19px] font-semibold text-gold">{fiche.nom || '—'}</div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Faction</div>
            <div
              className={`text-[19px] font-semibold ${
                fiche.faction === 'legion' ? 'text-legion-texte' : 'text-sanctum-texte'
              }`}
            >
              {faction?.nom ?? '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Race</div>
            <div className="text-[19px] font-semibold">{race?.nom ?? '—'}</div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Classe</div>
            <div className="text-[19px] font-semibold">{classe?.nom ?? '—'}</div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Niveau</div>
            <div className="text-[19px] font-semibold">{niveau}</div>
          </div>
          <div>
            <div className="font-sans text-[13.5px] text-muted-foreground">Langues</div>
            <div className="text-base font-semibold">{langues.join(', ') || '—'}</div>
          </div>
        </div>
        {fiche.histoire && (
          <p className="mb-0 mt-2 text-[15px] italic text-secondary-foreground">{fiche.histoire}</p>
        )}
      </Sheet>

      {sousIdentite}

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
          <p className="mb-0 mt-2">
            {stats.degats > 0 && <Badge variante="lutte">+{stats.degats} dégât</Badge>}
            {stats.sauvegardes > 0 && <Badge>+{stats.sauvegardes} sauvegarde</Badge>}
            {stats.illettre && <Badge variante="xp">Illettré</Badge>}
            {stats.ressourceSpeciale && (
              <Badge variante="gold">
                {stats.ressourceSpeciale.nom} {stats.ressourceSpeciale.valeur}
              </Badge>
            )}
          </p>
        </Sheet>
      )}

      {classe && capacites.length > 0 && (
        <Sheet titre="Capacités">
          {capacites.map(({ capacite, achatXp }) => (
            <div key={capacite.id} className="border-t border-border/30 py-2 first:border-t-0">
              <LigneCapacite capacite={capacite} achatXp={achatXp} />
              <TexteRegle source={capacite} />
            </div>
          ))}
        </Sheet>
      )}

      {classe && (
        <Sheet titre="Ce que tu as acquis">
          {/* Même grammaire que « Archimage · niv 1 » : le badge nomme d'où
              vient la capacité, pas sa catégorie. */}
          {capacitesDeBase(classe.id).map((capacite) => (
            <Acquis
              key={capacite.id}
              nom={capacite.nom}
              badge={`${classe.nom} · de base`}
              verbatim={capacite.verbatim}
            />
          ))}
          {/* D18 : les dons troqués se rangent ici comme les autres — la
              fiche et l'impression ne font aucune différence artificielle. */}
          {dons.map(({ don, n }) => (
            <Acquis
              key={don.id}
              nom={`${don.nom}${n > 1 ? ` ×${n}` : ''}`}
              badge="don"
              niveau={datation ? libelleNiveauDuDon(fiche, don.id) : undefined}
              verbatim={don.verbatim}
            />
          ))}
          {comps.map((id) => (
            <Acquis key={id} nom={nomComp(id)} badge="compétence" />
          ))}
        </Sheet>
      )}

      {(fiche.desavOrdre ?? []).length > 0 && (
        <Sheet titre={`Désavantages (+${xpDesavantages(fiche.desavOrdre ?? [], fiche)} XP)`}>
          <p className="m-0">
            {(fiche.desavOrdre ?? []).map((id, index) => {
              const desavantage = desavantages.find((d) => d.id === id)
              if (!desavantage) return null
              return (
                <Badge key={id} variante={index < plafond ? 'xp' : undefined}>
                  {desavantage.nom}
                  {index >= plafond ? ' · RP' : ''}
                </Badge>
              )
            })}
          </p>
        </Sheet>
      )}

      {depense > 0 && (
        <Sheet titre={`Héritage (${depense} XP dépensés)`}>
          <p className="m-0">
            {listeAchats().map((achat) => {
              const n = fiche.achats?.[achat.achat] ?? 0
              if (n === 0) return null
              return (
                <Badge key={achat.achat} variante="gold">
                  {achat.achat}
                  {n > 1 ? ` ×${n}` : ''}
                </Badge>
              )
            })}
          </p>
        </Sheet>
      )}

      <p className="my-4 text-center">
        <span className="inline-block rounded-full border border-border/50 bg-input px-2.5 py-1 font-sans text-xs text-secondary-foreground">
          {texteVersionRegles()}
          {etiquetteTome()}
        </span>
      </p>
    </div>
  )
}
