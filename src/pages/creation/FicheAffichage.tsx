/**
 * Fiche (maquette A v3) : Identité, Statistiques, « Ce que tu as acquis »
 * (D4-bis : la fiche ne montre QUE l'acquis — capacités de base, échelons de
 * la voie ≤ niveau du personnage, capacités d'héritage, dons, compétences),
 * Désavantages, Héritage — et la version des règles (meta.version, lue du
 * fichier — D8-bis).
 */
import { branchesDe, capacitesDeBase } from '../../rules/branches'
import { capacitesAcquises, normaliserNiveau } from '../../rules/niveau'
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
import { listeDons } from '../../rules/talents'
import { capaciteParId } from '../../wizard/capacites'
import { texteVersionRegles } from '../../wizard/fiche'
import type { FicheCreation } from '../../wizard/types'
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
  verbatim,
}: {
  nom: string
  badge: string
  badgeOr?: boolean
  verbatim?: string
}) {
  return (
    <div className="border-t border-border/30 py-2 first:border-t-0">
      <b>{nom}</b> <Badge variante={badgeOr ? 'gold' : undefined}>{badge}</Badge>
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

export default function FicheAffichage({ fiche }: { fiche: FicheCreation }) {
  const regles = getRules()
  const race = raceDe(fiche.race)
  const classe = classeSquelette(fiche.classe)
  const faction = regles.factions.liste.find((f) => f.id === fiche.faction)
  const voie = branchesDe(fiche.classe ?? '').find((b) => b.id === fiche.voie)
  const niveau = normaliserNiveau(fiche.niveau)
  const capsDeVoie = capacitesAcquises(fiche.classe, fiche.voie, niveau)
  const stats = statsDe(fiche)
  const dons = listeDons()
  const desavantages = listeDesavantages()
  const plafond = plafondDesavantagesXp()
  const langues = [...languesAcquises(fiche.race, fiche.classe), ...(fiche.langChoix ?? [])].map(
    (id) => listeLangues().find((l) => l.id === id)?.nom ?? id,
  )
  const capsHeritage = Object.entries(fiche.capChoix ?? {}).flatMap(([niveau, ids]) =>
    ids
      .map((id) => ({ capacite: capaciteParId(fiche.classe, id), nivAchat: niveau }))
      .filter((x): x is { capacite: NonNullable<typeof x.capacite>; nivAchat: string } =>
        Boolean(x.capacite),
      ),
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
            <div className="text-[19px] font-semibold">
              {classe?.nom ?? '—'}
              {voie ? ` — ${voie.nom}` : ''}
            </div>
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

      {classe && (
        <Sheet titre="Ce que tu as acquis">
          {capacitesDeBase(classe.id).map((capacite) => (
            <Acquis key={capacite.id} nom={capacite.nom} badge="classe" verbatim={capacite.verbatim} />
          ))}
          {voie &&
            capsDeVoie.map((capacite) => (
              <Acquis
                key={capacite.id}
                nom={capacite.nom}
                badge={`${voie.nom} · niv ${capacite.niveau}`}
                verbatim={capacite.verbatim}
              />
            ))}
          {capsHeritage.map(({ capacite }) => (
            <Acquis
              key={capacite.id}
              nom={capacite.nom}
              badge={`héritage · ${capacite.voieNom} niv ${capacite.niveau}`}
              badgeOr
              verbatim={capacite.verbatim}
            />
          ))}
          {Object.entries(fiche.dons ?? {}).map(([id, n]) => {
            const don = dons.find((d) => d.id === id)
            if (!don) return null
            return (
              <Acquis
                key={id}
                nom={`${don.nom}${n > 1 ? ` ×${n}` : ''}`}
                badge="don"
                verbatim={don.verbatim}
              />
            )
          })}
          {comps.map((id) => (
            <Acquis key={id} nom={nomComp(id)} badge="compétence" />
          ))}
          <p className="mb-0 mt-2 rounded-lg border border-border/50 border-l-[3px] border-l-primary/60 bg-card/50 backdrop-blur-sm px-3 py-2 text-[14px] text-muted-foreground">
            Affichage progressif : les capacités au-delà du niveau {niveau} apparaîtront quand tu
            les auras réellement acquises.
          </p>
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
