/**
 * Encyclopédie (D13) — vue DÉRIVÉE de rules.json, en tables, lue au rendu.
 *
 * ⛔ Zéro texte de règle en dur ici : chaque phrase du Tome affichée sort du
 * fichier de données et passe par `TexteRegle` (D14 : `affichage ?? verbatim`).
 * Les seuls littéraux de ce fichier sont des libellés d'écran (titres de
 * sections, en-têtes de colonnes) — jamais une règle.
 *
 * D9-bis ① : quatre sections et rien d'autre — classes/voies/capacités, dons,
 * compétences, désavantages. L'entrée se fait par la barre du bas existante
 * (⛔ pas de menu burger).
 */
import { useState } from 'react'
import ArbreVoie from '../components/ArbreVoie'
import { branchesDe, capacitesDeBase } from '../rules/branches'
import { listeDesavantages, plafondDesavantagesXp } from '../rules/heritage'
import { getRules } from '../rules/load'
import { classesSquelette } from '../rules/stats'
import { listeCompetencesSimples, listeDons, maxArtisanats } from '../rules/talents'
import { Badge, TexteRegle } from './creation/ui'

/** Les quatre sections de D9-bis ①. Libellés d'écran, pas des règles. */
export const SECTIONS = [
  { id: 'classes', nom: 'Classes & voies' },
  { id: 'dons', nom: 'Dons' },
  { id: 'competences', nom: 'Compétences' },
  { id: 'desavantages', nom: 'Désavantages' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

function Tableau({ colonnes, children }: { colonnes: string[]; children: React.ReactNode }) {
  return (
    <div className="tableau-cadre">
      <table className="tableau-regles">
        <thead>
          <tr>
            {colonnes.map((colonne) => (
              <th key={colonne} scope="col">
                {colonne}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function SectionClasses() {
  const regles = getRules()
  return (
    <>
      <Tableau colonnes={['Classe', 'Base']}>
        {classesSquelette().map((classe) => (
          <tr key={classe.id}>
            <td className="cellule-nom">{classe.nom}</td>
            <td>
              <Badge variante="pv">{classe.pv_base} PV</Badge>
              <Badge variante="mana">{classe.mana_base} Mana</Badge>
              <Badge>
                {regles.factions.liste.find((f) => f.id === classe.faction)?.nom ?? classe.faction}
              </Badge>
            </td>
          </tr>
        ))}
      </Tableau>

      {classesSquelette().map((classe) => (
        <section key={classe.id}>
          <h3 className="titre-mini !text-[20px]">{classe.nom}</h3>
          <Tableau colonnes={['Capacité de classe', 'Ce qu’elle fait']}>
            {capacitesDeBase(classe.id).map((capacite) => (
              <tr key={capacite.id}>
                <td className="cellule-nom">{capacite.nom}</td>
                <td>
                  <TexteRegle source={capacite} />
                </td>
              </tr>
            ))}
            {classe.echange && (
              <tr>
                <td className="cellule-nom">{classe.nom}</td>
                <td>
                  <TexteRegle source={{ verbatim: classe.echange }} />
                </td>
              </tr>
            )}
            {classe.code && (
              <tr>
                <td className="cellule-nom">Code</td>
                <td>
                  <TexteRegle source={{ verbatim: classe.code }} />
                </td>
              </tr>
            )}
            {classe.focus_requis && (
              <tr>
                <td className="cellule-nom">Focus</td>
                <td>
                  <TexteRegle source={{ verbatim: classe.focus_requis }} />
                </td>
              </tr>
            )}
            {classe.ressource_speciale && (
              <tr>
                <td className="cellule-nom">{classe.ressource_speciale.nom}</td>
                <td>
                  <TexteRegle source={classe.ressource_speciale} />
                </td>
              </tr>
            )}
          </Tableau>

          <Tableau colonnes={['Voie', 'Ses cinq échelons']}>
            {branchesDe(classe.id).map((voie) => (
              <tr key={voie.id}>
                <td className="cellule-nom">{voie.nom}</td>
                <td>
                  <ArbreVoie capacites={voie.capacites} />
                </td>
              </tr>
            ))}
          </Tableau>
        </section>
      ))}
    </>
  )
}

function SectionDons() {
  return (
    <>
      <TexteRegle source={{ verbatim: getRules().dons.intro }} />
      <Tableau colonnes={['Don', 'Ce qu’il fait']}>
        {listeDons().map((don) => (
          <tr key={don.id}>
            <td className="cellule-nom">
              {don.nom}
              {don.cumulable && <Badge>cumulable</Badge>}
            </td>
            <td>
              <TexteRegle source={don} />
            </td>
          </tr>
        ))}
      </Tableau>
    </>
  )
}

function SectionCompetences() {
  const artisanats = getRules().competences.artisanats
  return (
    <>
      <TexteRegle source={{ verbatim: getRules().competences.regle_niv1 }} />
      <Tableau colonnes={['Compétence', 'Base', 'Avancé']}>
        {listeCompetencesSimples().map((competence) => (
          <tr key={competence.id}>
            <td className="cellule-nom">
              {competence.nom}
              {competence.materiel && <Badge>{competence.materiel}</Badge>}
            </td>
            <td>
              <TexteRegle source={{ verbatim: competence.base }} />
            </td>
            <td>
              <TexteRegle source={{ verbatim: competence.avance }} />
            </td>
          </tr>
        ))}
      </Tableau>

      <h3 className="titre-mini !text-[20px]">Artisanats</h3>
      <TexteRegle source={{ verbatim: artisanats.verbatim_interdiction }} />
      <p className="my-1">
        <Badge variante="gold">max {maxArtisanats()}</Badge>
      </p>
      <Tableau colonnes={['Artisanat', 'Ses capacités']}>
        {artisanats.liste.map((artisanat) => (
          <tr key={artisanat.id}>
            <td className="cellule-nom">
              {artisanat.nom}
              {artisanat.materiel && <Badge>{artisanat.materiel}</Badge>}
            </td>
            <td>
              {artisanat.capacites.map((capacite) => (
                <TexteRegle key={capacite.nom} gras={capacite.nom} source={capacite} />
              ))}
              {artisanat.restriction && (
                <TexteRegle source={{ verbatim: artisanat.restriction }} />
              )}
            </td>
          </tr>
        ))}
      </Tableau>
    </>
  )
}

function SectionDesavantages() {
  const regles = getRules()
  const nomClasse = (id: string) =>
    regles.classes_squelette.liste.find((c) => c.id === id)?.nom ?? id
  return (
    <>
      <TexteRegle source={regles.heritage.desavantages.regle_plafond} />
      <p className="my-1">
        <Badge variante="xp">{plafondDesavantagesXp()} avec XP</Badge>
      </p>
      <Tableau colonnes={['Désavantage', 'XP', 'Ce qu’il coûte']}>
        {listeDesavantages().map((desavantage) => (
          <tr key={desavantage.id}>
            <td className="cellule-nom">{desavantage.nom}</td>
            <td>
              <Badge variante="xp">
                +{desavantage.xp}
                {desavantage.variante_xp !== undefined ? ` à +${desavantage.variante_xp}` : ''}
              </Badge>
            </td>
            <td>
              <TexteRegle source={desavantage} />
              {(desavantage.interdit_classes ?? []).length > 0 && (
                <p className="my-1">
                  {(desavantage.interdit_classes ?? []).map((id) => (
                    <Badge key={id}>{nomClasse(id)}</Badge>
                  ))}
                </p>
              )}
            </td>
          </tr>
        ))}
      </Tableau>
    </>
  )
}

const CONTENUS: Record<SectionId, () => JSX.Element> = {
  classes: SectionClasses,
  dons: SectionDons,
  competences: SectionCompetences,
  desavantages: SectionDesavantages,
}

export default function Encyclopedie() {
  const [section, setSection] = useState<SectionId>(SECTIONS[0].id)
  const Contenu = CONTENUS[section]

  return (
    <div>
      <h1 className="titre-etape">Encyclopédie</h1>
      <p className="text-muted-foreground">
        Les règles du Tome, telles qu’elles vivent dans l’app. Hors ligne, sur le terrain.
      </p>

      <nav aria-label="Sections de l’encyclopédie" className="my-3 flex flex-wrap gap-2">
        {SECTIONS.map((definition) => (
          <button
            key={definition.id}
            type="button"
            aria-pressed={section === definition.id}
            onClick={() => setSection(definition.id)}
            className={`chip ${section === definition.id ? 'chip-on' : ''}`}
          >
            {definition.nom}
          </button>
        ))}
      </nav>

      <Contenu />

      <p className="note">Règles v{getRules().meta.version}.</p>
    </div>
  )
}
