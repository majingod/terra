/**
 * Affichage de la fiche (étape 9 du wizard et page /fiche/:id).
 *
 * D4 : la fiche ne montre QUE l'acquis — capacités de base, voie au
 * niveau 1 seulement, dons, compétences, achats d'héritage.
 * D8-bis : la version des règles (meta.version, lue du fichier) s'affiche.
 */
import { capacitesDeBase, branchesDe } from '../../rules/branches'
import {
  desavantagesRpSeulement,
  budgetXp,
  depenseXp,
  listeDesavantages,
  xpDesavantage,
} from '../../rules/heritage'
import { languesAcquises, listeLangues } from '../../rules/langues'
import { getRules } from '../../rules/load'
import { classeSquelette, raceDe, statsDe, valeurCarac } from '../../rules/stats'
import { listeDons } from '../../rules/talents'
import { capaciteParId } from '../../wizard/capacites'
import { texteVersionRegles } from '../../wizard/fiche'
import type { FicheCreation } from '../../wizard/types'
import { Verbatim } from './ui'

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ligne bg-panneau p-3">
      <h2 className="font-titre text-lg font-bold text-or">{titre}</h2>
      <div className="mt-1 flex flex-col gap-2">{children}</div>
    </section>
  )
}

export default function FicheAffichage({ fiche }: { fiche: FicheCreation }) {
  const regles = getRules()
  const race = raceDe(fiche.race)
  const classe = classeSquelette(fiche.classe)
  const faction = regles.factions.liste.find((f) => f.id === fiche.faction)
  const voie = branchesDe(fiche.classe ?? '').find((b) => b.id === fiche.voie)
  const capNiveau1 = voie?.capacites.find((c) => c.niveau === 1)
  const stats = statsDe(fiche)
  const dons = listeDons()
  const desavantages = listeDesavantages()
  const rpSeulement = new Set(desavantagesRpSeulement(fiche.desavOrdre ?? []))
  const acquises = languesAcquises(fiche.race, fiche.classe)
  const simples = regles.competences.simples
  const artisanats = regles.competences.artisanats.liste
  const capsHeritage = Object.values(fiche.capChoix ?? {})
    .flat()
    .map((id) => capaciteParId(fiche.classe, id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  function nomLangue(id: string): string {
    return listeLangues().find((l) => l.id === id)?.nom ?? id
  }

  return (
    <div className="fiche-imprimable flex flex-col gap-3">
      <header className="rounded-xl border-2 border-or bg-panneau p-4 text-center">
        <div className="font-wordmark text-sm uppercase tracking-widest text-stone-400">
          Terra Mortis
        </div>
        <h1 className="font-titre text-3xl font-bold text-or">{fiche.nom || 'Sans nom'}</h1>
        <p className="mt-1">
          {[race?.nom, classe?.nom, voie ? `voie ${voie.nom}` : undefined, faction?.nom]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      {stats && (
        <Section titre="Stats">
          <div className="grid grid-cols-3 gap-2 text-center">
            {(stats.ressourceSpeciale
              ? ([[stats.ressourceSpeciale.nom, stats.ressourceSpeciale.valeur]] as Array<
                  [string, number]
                >)
              : ([
                  ['PV', stats.pv],
                  ['Mana', stats.mana],
                ] as Array<[string, number]>)
            )
              .concat([['Lutte', stats.lutte]])
              .map(([nom, valeur]) => (
                <div key={nom} className="rounded-lg border border-ligne p-2">
                  <div className="text-xs uppercase tracking-wide text-stone-400">{nom}</div>
                  <div className="font-titre text-2xl font-bold text-or">{valeur}</div>
                </div>
              ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {(
              [
                ['Puissance', valeurCarac(fiche, 'p')],
                ['Résistance', valeurCarac(fiche, 'r')],
                ['Esprit', valeurCarac(fiche, 'e')],
              ] as Array<[string, number]>
            ).map(([nom, valeur]) => (
              <div key={nom}>
                <span className="text-stone-400">{nom} </span>
                <span className="font-bold">{valeur}</span>
              </div>
            ))}
          </div>
          {stats.degats > 0 && <p className="text-sm">+{stats.degats} Dégât</p>}
          {stats.sauvegardes > 0 && <p className="text-sm">+{stats.sauvegardes} sauvegarde</p>}
          {stats.illettre && <Verbatim texte={regles.caracteristiques.illettre.verbatim} />}
        </Section>
      )}

      {classe && capacitesDeBase(classe.id).length > 0 && (
        <Section titre={`Capacités de base — ${classe.nom}`}>
          {capacitesDeBase(classe.id).map((capacite) => (
            <div key={capacite.id}>
              <span className="font-semibold">{capacite.nom}</span>
              <Verbatim texte={capacite.verbatim} />
            </div>
          ))}
          {classe.code && (
            <div>
              <span className="font-semibold">Code</span>
              <Verbatim texte={classe.code} />
            </div>
          )}
          {classe.ressource_speciale && (
            <div>
              <span className="font-semibold">{classe.ressource_speciale.nom}</span>
              <Verbatim texte={classe.ressource_speciale.verbatim} />
            </div>
          )}
        </Section>
      )}

      {voie && capNiveau1 && (
        <Section titre={`Voie ${voie.nom} — niveau 1`}>
          <div>
            <span className="font-semibold">{capNiveau1.nom}</span>
            <Verbatim texte={capNiveau1.verbatim} />
          </div>
        </Section>
      )}

      {capsHeritage.length > 0 && (
        <Section titre="Capacités d'héritage">
          {capsHeritage.map((capacite) => (
            <div key={capacite.id}>
              <span className="font-semibold">
                {capacite.nom}{' '}
                <span className="text-xs text-stone-400">(niveau {capacite.niveau})</span>
              </span>
              <Verbatim texte={capacite.verbatim} />
            </div>
          ))}
        </Section>
      )}

      {Object.keys(fiche.dons ?? {}).length > 0 && (
        <Section titre="Dons">
          {Object.entries(fiche.dons ?? {}).map(([id, n]) => {
            const don = dons.find((d) => d.id === id)
            if (!don) return null
            return (
              <div key={id}>
                <span className="font-semibold">
                  {don.nom}
                  {n > 1 ? ` ×${n}` : ''}
                </span>
                <Verbatim texte={don.verbatim} />
              </div>
            )
          })}
        </Section>
      )}

      {(fiche.comps ?? []).length > 0 && (
        <Section titre="Compétences">
          {(fiche.comps ?? []).map((id) => {
            const simple = simples.find((c) => c.id === id)
            if (simple) {
              return (
                <div key={id}>
                  <span className="font-semibold">{simple.nom}</span>
                  {simple.materiel && (
                    <p className="text-xs text-stone-400">Matériel : {simple.materiel}</p>
                  )}
                  <Verbatim texte={simple.base} />
                </div>
              )
            }
            const artisanat = artisanats.find((a) => a.id === id)
            if (!artisanat) return null
            return (
              <div key={id}>
                <span className="font-semibold">{artisanat.nom} (artisanat)</span>
                {artisanat.restriction && <Verbatim texte={artisanat.restriction} />}
                {artisanat.capacites.map((capacite) => (
                  <div key={capacite.nom} className="mt-1 pl-3">
                    <span className="text-sm font-semibold text-or">{capacite.nom}</span>
                    <Verbatim texte={capacite.verbatim} />
                  </div>
                ))}
              </div>
            )
          })}
        </Section>
      )}

      <Section titre="Langues">
        <p>
          {[...acquises, ...(fiche.langChoix ?? [])].map(nomLangue).join(', ') || '—'}
        </p>
      </Section>

      {(fiche.desavOrdre ?? []).length > 0 && (
        <Section titre="Désavantages">
          {(fiche.desavOrdre ?? []).map((id) => {
            const desavantage = desavantages.find((d) => d.id === id)
            if (!desavantage) return null
            const enRp = rpSeulement.has(id)
            const raceRefusee =
              desavantage.variante_xp !== undefined ? raceDe(fiche.racisteVar) : undefined
            return (
              <div key={id}>
                <span className="font-semibold">
                  {desavantage.nom}
                  {raceRefusee ? ` (${raceRefusee.nom})` : ''}
                </span>{' '}
                {enRp ? (
                  <span className="text-xs uppercase tracking-wide text-stone-400">
                    RP seulement
                  </span>
                ) : (
                  <span className="font-semibold text-or">
                    +{xpDesavantage(desavantage, fiche)} XP
                  </span>
                )}
                <Verbatim texte={desavantage.verbatim} />
              </div>
            )
          })}
        </Section>
      )}

      <Section titre="Héritage">
        <p>
          XP permanents du joueur : <span className="font-bold">{fiche.xpPerm ?? 0}</span> ·
          Budget total : <span className="font-bold">{budgetXp(fiche)}</span> · Dépensé :{' '}
          <span className="font-bold">{depenseXp(fiche.achats)}</span>
        </p>
        {Object.entries(fiche.achats ?? {}).length > 0 && (
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {Object.entries(fiche.achats ?? {}).map(([achat, n]) => (
              <li key={achat}>
                {achat}
                {n > 1 ? ` ×${n}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <footer className="pb-2 text-center text-sm text-stone-400">
        {texteVersionRegles()}
      </footer>
    </div>
  )
}
