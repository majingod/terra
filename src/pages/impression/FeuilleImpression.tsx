/**
 * La feuille de personnage TELLE QU'ELLE S'IMPRIME — la vraie feuille pleine
 * page du terrain, pré-remplie, pour les 8 classes.
 *
 * Deux vérités, jamais inversées :
 *  - la MISE EN PAGE vient du papier (maquette validée par l'organisateur,
 *    reprise dans `CSS_FEUILLE`) ;
 *  - le CONTENU vient du corpus (`src/data/rules.json`), jamais du papier.
 *    Quand un texte imprimé diffère de la feuille papier, c'est voulu : le
 *    papier porte des erreurs connues, le corpus est fidèle au livre.
 *
 * ⛔ UN SEUL GABARIT pour les 8 classes. Aucun `if (classeId === …)` : tout
 * ce qui varie d'une classe à l'autre se décide sur un CHAMP des données —
 * `focus_requis`, `echange`, `code`, `ressource_speciale`, `faction`.
 *
 * ⛔ Aucun calcul de règle n'est réimplémenté ici : les valeurs viennent de
 * `statsDe`, `valeurCarac`, `budgetXp`, `xpDesavantages`, `capacitesDeLaFiche`,
 * `donsPris`, `languesAcquises`, `languesProposables`, `niveauCourant`.
 *
 * ⛔ Aucun texte de règle n'est écrit ici : tout passe par `<Texte source=…>`,
 * qui applique `affichage ?? verbatim` (D14) comme `TexteRegle`. Les seules
 * chaînes de ce fichier sont les ÉTIQUETTES DE STRUCTURE de la feuille de
 * l'organisateur (« Nom du joueur », « Choix du … », « Coût N XP : … », les
 * deux notes de bas de colonnes) — reprises telles quelles, jamais reformulées.
 *
 * ⛔ Aucun bouton, aucune UI : la vue imprimée ne contient que la feuille.
 */
import { branchesDe, capacitesDeBase } from '../../rules/branches'
import { budgetXp, listeAchats, xpDesavantages } from '../../rules/heritage'
import { languesAcquises, languesProposables, listeLangues } from '../../rules/langues'
import { getRules, type BonusRace, type ClasseSquelette, type Race } from '../../rules/load'
import { tableEvolution } from '../../rules/niveau'
import { classeSquelette, statsDe, valeurCarac } from '../../rules/stats'
import { listeDons } from '../../rules/talents'
import { capacitesDeLaFiche } from '../../wizard/capacites'
import { niveauCourant } from '../../wizard/historique'
import { donsPris } from '../../wizard/troc'
import type { CleCarac, FicheCreation } from '../../wizard/types'
import { texteAffiche, type SourceDeTexte } from '../creation/ui'
import { CSS_PAGE } from './css'
import './polices.css'
import './feuille.css'

/**
 * Le seul rendu de texte de règle de la feuille : `affichage ?? verbatim`,
 * la même logique que `TexteRegle`, sans le `<p>` du wizard — la feuille
 * imprime en ligne, dans une cellule.
 */
function Texte({ source }: { source: SourceDeTexte }) {
  return <>{texteAffiche(source)}</>
}

/** Case à cocher de la feuille. Cochée = l'élément est un acquis du personnage. */
function Case() {
  return <span className="case" />
}

/**
 * La valeur d'une case CALCULÉE, ou rien. Une case sans équivalent calculé
 * (« Divers ») reste vide : c'est une case à crayon, le joueur l'écrit sur
 * le terrain.
 */
function Bx({ v }: { v?: number | string }) {
  return <td className="bx">{v}</td>
}

/**
 * Les races que la feuille de CETTE classe imprime. Le critère est la
 * `faction` de la classe : une classe ouverte à toutes les factions imprime
 * toutes les races ; les autres impriment celles de leur faction, plus celles
 * qu'aucune faction ne réserve.
 */
function racesDeLaFeuille(classe: ClasseSquelette): Race[] {
  const toutes = getRules().races.liste
  if (classe.faction === TOUTE) return toutes
  return toutes.filter((r) => r.faction === classe.faction || r.faction === TOUTE)
}

/**
 * La valeur du champ `faction` qui veut dire « toutes les factions ». Elle est
 * déjà nommée ainsi dans `src/rules/stats.ts` (classesPourFaction) : c'est une
 * valeur du schéma, pas un id de classe.
 */
const TOUTE = 'toute'

/**
 * Le nombre d'emplacements imprimés par don cumulable — une géométrie de la
 * feuille papier (5 paires de rangées), pas une règle du jeu : le corpus ne
 * plafonne pas les prises d'un don cumulable.
 */
const RANGEES_CUMUL = 5

/**
 * L'en-tête d'une voie : « Choix du Barbare », mais « Choix de l’Élémentaliste ».
 *
 * C'est une règle de GRAMMAIRE, appliquée partout de la même façon : jamais
 * un cas particulier par classe, jamais une liste de noms. Les accents
 * tombent avant le test — « É » est une voyelle comme « E ».
 *
 * Le h muet n'est pas traité : aucune voie du corpus ne commence par un h, et
 * la lettre seule ne dit pas s'il est muet (« de l'homme ») ou aspiré (« du
 * hasard »). Le jour où une voie en portera un, c'est un arbitrage, pas une
 * règle qu'on devine.
 */
function enTeteDeVoie(nom: string): string {
  const premiere = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0)
  return /[aeiouy]/i.test(premiere) ? `Choix de l’${nom}` : `Choix du ${nom}`
}

/** Le libellé imprimé d'un achat d'héritage : l'étiquette de la feuille + le corpus. */
function libelleAchat(cout: number, achat: string): string {
  return `Coût ${cout} XP : ${achat}`
}

interface Props {
  fiche: FicheCreation
  /**
   * Le vrai nom du joueur — D25, le SEUL vrai nom que l'app stocke. Il est
   * saisi volontairement, toujours optionnel, et vit sur l'appareil, sur cette
   * feuille et dans l'export JSON ; ⛔ jamais en ligne, jamais dans le dépôt.
   *
   * Absent, la case s'imprime vide et se remplit au crayon, comme avant lui.
   * Présent, il se rend sur UNE SEULE ligne, ellipse au-delà : la feuille est
   * une A4 qui ne se replie pas, et un nom long ne casse pas sa géométrie (le
   * `maxLength` de la saisie est la première garde, celle-ci la seconde).
   */
  nomDuJoueur?: string
}

export default function FeuilleImpression({ fiche, nomDuJoueur }: Props) {
  const regles = getRules()
  const classe = classeSquelette(fiche.classe)
  if (!classe) return null

  const faction = regles.factions.liste.find((f) => f.id === fiche.faction)
  const niveau = niveauCourant(fiche)
  const stats = statsDe(fiche)
  const caracs = regles.caracteristiques
  const branches = branchesDe(classe.id)
  const base = capacitesDeBase(classe.id)

  // Les acquis du personnage — chacun lu de la fiche par la fonction du métier
  // qui le connaît déjà. Rien n'est recompté ici.
  const capacitesAcquises = new Set(capacitesDeLaFiche(fiche).map((c) => c.capacite.id))
  const prisesDeDons = donsPris(fiche)
  const languesDuPersonnage = new Set([
    ...languesAcquises(fiche.race, fiche.classe),
    ...(fiche.langChoix ?? []),
  ])
  const languesOuvertes = new Set(languesProposables(fiche.race, fiche.classe).map((l) => l.id))
  const competencesAcquises = new Set(fiche.comps ?? [])
  const achats = fiche.achats ?? {}

  const dons = listeDons()
  const donsSimples = dons.filter((d) => !d.cumulable)
  const donsCumulables = dons.filter((d) => d.cumulable)
  const competences = [
    ...regles.competences.simples,
    ...regles.competences.artisanats.liste,
  ]
  const echelonsDeDon = tableEvolution().filter((l) => l.dons > 0).map((l) => l.niv)
  const echelonsDeCarac = tableEvolution().filter((l) => l.carac_points).map((l) => l.niv)

  /** Les trois lignes de la table des caractéristiques : total = base + niv. */
  const lignesCarac: Array<[string, CleCarac]> = [
    ['Puissance', 'p'],
    ['Résistance', 'r'],
    ['Esprit', 'e'],
  ]

  const palierP = caracs.table_cumulative.puissance[String(valeurCarac(fiche, 'p'))]
  const palierR = caracs.table_cumulative.resistance[String(valeurCarac(fiche, 'r'))]
  const palierE = caracs.table_cumulative.esprit[String(valeurCarac(fiche, 'e'))]

  return (
    <>
      <style>{CSS_PAGE}</style>
      <div className="tm-feuille">
        <div className="classe-tete">{classe.nom.toUpperCase()}</div>

        <div className="ident">
          <div className="ch" style={{ flex: 1.4 }}>
            <div className="l une-ligne">{nomDuJoueur}</div>
            <div className="e">Nom du joueur</div>
          </div>
          <div className="ch" style={{ flex: 1.5 }}>
            <div className="l">{fiche.nom}</div>
            <div className="e">Nom du Personnage</div>
          </div>
          <div className="ch" style={{ flex: 1.1 }}>
            <div className="l">{classe.nom}</div>
            <div className="e">Classe</div>
          </div>
          <div className="ch" style={{ flex: 0.9 }}>
            <div className="l">{faction?.nom}</div>
            <div className="e">Faction</div>
          </div>
          <div className="ch" style={{ flex: 0.35 }}>
            <div className="l">{niveau}</div>
            <div className="e">Niv</div>
          </div>
        </div>

        <div className="corps">
          {/* ---------------------------- GAUCHE ---------------------------- */}
          <div className="gauche">
            <div className="stat-zone">
              <div className="carac">
                <div className="carac-titre">
                  <span className="noir">Caractéristique</span>
                  <span className="n">
                    Base {caracs.creation.repartition.join('-')} dans
                    <br />
                    l’ordre choisie
                  </span>
                </div>
                <div className="mini b">+1 choix Niv{echelonsDeCarac.join('-')}</div>
                <table className="tcarac">
                  <tbody>
                    <tr className="mini">
                      <td />
                      <td>Total</td>
                      <td />
                      <td>Base</td>
                      <td />
                      <td>Niv</td>
                      <td />
                      <td>Divers</td>
                    </tr>
                    {lignesCarac.map(([nom, cle]) => (
                      <tr key={cle}>
                        <td className="lbl">{nom}</td>
                        <td className="bx b">{valeurCarac(fiche, cle)}</td>
                        <td>=</td>
                        <Bx v={fiche.caracs?.[cle]} />
                        <td>+</td>
                        <Bx v={fiche.extras?.[cle] || undefined} />
                        <td>+</td>
                        <Bx />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pvbloc">
                <table className="tpv">
                  <tbody>
                    <tr className="mini">
                      <td />
                      <td>Total</td>
                      <td />
                      <td>Base</td>
                      <td />
                      <td>Carac</td>
                      <td />
                      <td>Divers</td>
                    </tr>
                    <tr>
                      <td className="lbl">
                        PV <small>Point de vie</small>
                      </td>
                      <td className="bx b">
                        {stats?.pv} /{regles.plafonds.pv_max.valeur}
                      </td>
                      <td>=</td>
                      <td className="bx pb">{classe.pv_base}</td>
                      <td>+</td>
                      <Bx v={palierR?.pv || undefined} />
                      <td>+</td>
                      <Bx />
                    </tr>
                    <tr>
                      <td className="lbl">
                        PM <small>(Mana)</small>
                      </td>
                      <td className="bx b">{stats?.mana}</td>
                      <td>=</td>
                      <td className="bx pb">{classe.mana_base}</td>
                      <td>+</td>
                      <Bx v={palierE?.mana || undefined} />
                      <td>+</td>
                      <Bx />
                    </tr>
                  </tbody>
                </table>
                <table className="tpv" style={{ marginTop: '0.5mm' }}>
                  <tbody>
                    <tr className="mini">
                      <td />
                      <td>Total</td>
                      <td />
                      <td>Pui</td>
                      <td>Divers</td>
                      <td className="b" style={{ fontSize: '7pt' }}>
                        Bonus Dégâts
                      </td>
                      <Bx v={stats?.degats || undefined} />
                    </tr>
                    <tr>
                      <td className="lbl">Lutte</td>
                      <td className="bx b">{stats?.lutte}</td>
                      <td>=</td>
                      <Bx v={palierP?.lutte || undefined} />
                      <Bx />
                      <td className="b" style={{ fontSize: '7pt' }}>
                        Sauveguarde
                      </td>
                      <Bx v={stats?.sauvegardes || undefined} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* La bande grandit en hauteur au besoin : pas de boîte séparée. */}
            <div className="base">
              <div className="et">
                Capacité
                <br />
                de base
              </div>
              <div className="tx">
                {classe.focus_requis && (
                  <div data-focus>
                    <Texte source={{ verbatim: classe.focus_requis }} />
                  </div>
                )}
                {base.map((capacite) => (
                  <div key={capacite.id} className="acquis" data-base={capacite.id}>
                    <Case />
                    <span className="b u">{capacite.nom}</span>.{' '}
                    <Texte source={capacite} />
                  </div>
                ))}
                {classe.echange && (
                  <div data-troc>
                    <Texte source={{ verbatim: classe.echange }} />
                  </div>
                )}
                {classe.ressource_speciale && (
                  <div data-ressource-texte>
                    <span className="b u">{classe.ressource_speciale.nom}</span>.{' '}
                    <Texte source={classe.ressource_speciale} />
                  </div>
                )}
              </div>
            </div>

            <table className="voies">
              <tbody>
                <tr>
                  <th className="vide" />
                  {branches.map((branche) => (
                    <th key={branche.id} data-voie={branche.id}>
                      {enTeteDeVoie(branche.nom)}
                    </th>
                  ))}
                </tr>
                {[1, 2, 3, 4, 5].map((niv) => (
                  <tr key={niv}>
                    <td className="niv">
                      N<br />i<br />v<br />
                      <br />
                      {niv}
                    </td>
                    {branches.map((branche) => {
                      const capacite = branche.capacites.find((c) => c.niveau === niv)
                      if (!capacite) return <td key={branche.id} />
                      return (
                        <td
                          key={branche.id}
                          data-capacite={capacite.id}
                          className={capacitesAcquises.has(capacite.id) ? 'acquis' : undefined}
                        >
                          <Case />
                          <span className="nom">{capacite.nom}</span>.{' '}
                          <Texte source={capacite} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bas">
              <div className="xp">
                <div className="bloc">
                  <div className="et">
                    XP<small>Total</small>
                  </div>
                  <div className="v">{budgetXp(fiche)}</div>
                </div>
                <div className="bloc">
                  <div className="et">
                    XP<small>Permanent</small>
                  </div>
                  <div className="v">{fiche.xpPerm ?? 0}</div>
                </div>
                <div className="bloc">
                  <div className="et">
                    XP<small>Temporaire</small>
                  </div>
                  <div className="v">{xpDesavantages(fiche.desavOrdre ?? [], fiche)}</div>
                </div>
              </div>
              <div className="heritage">
                <h4>CAPACITÉ D’HÉRITAGE</h4>
                <div className="hgrille">
                  {listeAchats().map((avantage) => (
                    <div
                      key={avantage.achat}
                      data-achat={avantage.achat}
                      className={`achat${(achats[avantage.achat] ?? 0) > 0 ? ' acquis' : ''}`}
                    >
                      <Case />
                      {libelleAchat(avantage.cout_xp, avantage.achat)}
                      {avantage.max_achats !== undefined && (
                        <span className="mini"> (max {avantage.max_achats})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------- DROITE ---------------------------- */}
          <div className="droite">
            <h4>Race</h4>
            <table className="trace">
              <tbody>
                {racesDeLaFeuille(classe).map((r) => (
                  <tr
                    key={r.id}
                    data-race={r.id}
                    className={r.id === fiche.race ? 'acquis' : undefined}
                  >
                    <td className="rn">
                      <Case />
                      {r.nom}
                    </td>
                    <td>
                      <LigneDeRace race={r} choix={r.id === fiche.race ? fiche.humainChoix : undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {classe.ressource_speciale && (
              <div className="encart" data-ressource>
                <div className="et">{classe.ressource_speciale.nom.toUpperCase()}</div>
                <div className="v">
                  {stats?.ressourceSpeciale?.valeur} /{classe.ressource_speciale.max}
                </div>
              </div>
            )}

            {classe.code && (
              <div className="encart" data-code>
                <div className="et">CODE</div>
                <div className="tx">
                  <Texte source={{ verbatim: classe.code }} />
                </div>
              </div>
            )}

            <h4 className="espace">
              DONS <small>Niv {echelonsDeDon.join('-')}</small>
            </h4>
            <table className="tdons">
              <tbody>
                {donsSimples.map((don) => (
                  <tr
                    key={don.id}
                    data-don={don.id}
                    className={(prisesDeDons[don.id] ?? 0) > 0 ? 'acquis' : undefined}
                  >
                    <td className="ck">
                      <Case />
                    </td>
                    <td className="dn">{don.nom}</td>
                    <td>
                      <Texte source={don} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Les dons CUMULABLES : autant de colonnes que le corpus en porte,
                RANGEES_CUMUL emplacements chacun, comme sur le papier. */}
            <div className="cumul">
              {donsCumulables.map((don) => (
                <table className="tp" key={don.id}>
                  <tbody>
                    {Array.from({ length: RANGEES_CUMUL }, (_, i) => (
                      <tr
                        key={i}
                        data-don={i === 0 ? don.id : undefined}
                        className={i < (prisesDeDons[don.id] ?? 0) ? 'acquis' : undefined}
                      >
                        <td className="ck">
                          <Case />
                        </td>
                        <td className="dn">{don.nom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>

            <div className="listes">
              <div className="liste">
                <h4>LANGUES</h4>
                <table>
                  <tbody>
                    {listeLangues().map((langue) => {
                      const acquise = languesDuPersonnage.has(langue.id)
                      const ouverte = acquise || languesOuvertes.has(langue.id)
                      return (
                        <tr
                          key={langue.id}
                          data-langue={langue.id}
                          className={acquise ? 'acquis' : ouverte ? undefined : 'off'}
                        >
                          <td className="ck">{ouverte && <Case />}</td>
                          <td>{langue.nom}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="notef">Racial, +1 si 3 d’esprit, +1/2 si érudit</div>
              </div>
              <div className="liste">
                <h4>COMPÉTENCE</h4>
                <table>
                  <tbody>
                    {competences.map((competence) => (
                      <tr
                        key={competence.id}
                        data-competence={competence.id}
                        className={competencesAcquises.has(competence.id) ? 'acquis' : undefined}
                      >
                        <td className="ck">
                          <Case />
                        </td>
                        <td>{competence.nom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="notef">1 Niv 1, +1 si l’héritage</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** La ligne d'une race : ses bonus plats, ses bonus nommés, ses malus. */
function LigneDeRace({ race, choix }: { race: Race; choix?: string }) {
  const plats: string[] = []
  const nommes: Array<{ nom: string; verbatim: string }> = []
  let auChoix: string[] | undefined
  for (const bonus of race.bonus as BonusRace[]) {
    if (typeof bonus === 'string') plats.push(bonus)
    else if ('choix' in bonus) auChoix = bonus.choix
    else nommes.push(bonus)
  }
  // Les malus se lisent sur la même ligne que les bonus plats : la feuille
  // papier ne leur donne pas de case à part.
  for (const malus of race.malus ?? []) if (typeof malus === 'string') plats.push(malus)
  return (
    <>
      {auChoix?.map((option, i) => (
        <span key={option}>
          {i > 0 && <span className="u"> OU </span>}
          <span className="b">{option}</span>
        </span>
      ))}
      {choix && auChoix && <span className="mini"> (choisi : {choix})</span>}
      {plats.length > 0 && (
        <>
          {auChoix && ', '}
          <span className="b">{plats.join(', ')}</span>
        </>
      )}
      {nommes.map((bonus) => (
        <span key={bonus.nom}>
          {' '}
          <span className="u">{bonus.nom}</span> : <Texte source={bonus} />
        </span>
      ))}
    </>
  )
}
