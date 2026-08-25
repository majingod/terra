// Lot corpus 1.3.0 — ch.1 complet, ch.2 complété, tables ch.4, arbitrages A8/A9/A10.
// Chaque verbatim est TRANCHÉ du témoin (tome_extraits.json) par ancres — jamais tapé.
// Déterministe : même entrée => même sortie, empreinte SHA-256 imprimée à la fin.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const RACINE = process.argv[2] ?? '.'
const rules = JSON.parse(readFileSync(`${RACINE}/src/data/rules.json`, 'utf8'))
const tome = JSON.parse(readFileSync(`${RACINE}/src/data/tome_extraits.json`, 'utf8'))

// La normalisation de la gate de fidélité — elle et aucune autre.
// G-CC : pas de séquence \uXXXX littérale dans ce fichier — l'éditeur de CC les réécrit.
const CESURE = new RegExp(String.fromCharCode(2), 'g')
const normaliser = (t) => t.replace(/\r\n/g, ' ').replace(CESURE, '').replace(/\s+/g, ' ').trim()
const pages = {}
for (const [k, v] of Object.entries(tome.tome_v1_2)) pages[k] = normaliser(v)

let nbTranches = 0
/** Tranche [debut, fin) dans la page normalisée. Les deux ancres DOIVENT exister. */
function tranche(page, debut, fin) {
  const texte = pages[String(page)]
  const i = texte.indexOf(debut)
  if (i === -1) throw new Error(`p.${page} : ancre de début introuvable : « ${debut} »`)
  let j
  if (fin === null) {
    j = texte.length
  } else {
    j = texte.indexOf(fin, i + debut.length)
    if (j === -1) throw new Error(`p.${page} : ancre de fin introuvable après le début : « ${fin} »`)
  }
  nbTranches += 1
  return texte.slice(i, j).trim()
}

// ── Chapitre 1 (p.2-4) ───────────────────────────────────────────────────────
const reglesDeBase = {
  source: { pages: [2, 3, 4], section: 'Chapitre 1 : les règles de base' },
  sections: [
    { id: 'conduite', titre: 'Les règles de conduite', source: { page: 2 },
      verbatim: tranche(2, 'En plus des lois normales', ' Point de vie et dégâts') },
    { id: 'pv_et_degats', titre: 'Point de vie et dégâts', source: { page: 2 },
      verbatim: tranche(2, 'Chaque personnage a un certain nombre', ' Combat : Considéré') },
    { id: 'combat', titre: 'Combat', source: { page: 2 },
      verbatim: tranche(2, 'Considéré en combat :', ' Fouille : Fouiller') },
    { id: 'fouille', titre: 'Fouille', source: { page: 2 },
      verbatim: tranche(2, 'Fouiller une personne :', null) },
    { id: 'objet_porte', titre: 'Objet porté', source: { page: 3 },
      verbatim: tranche(3, 'Un personnage ne peut porter qu’une arme magique', ' Symboles universels') },
    { id: 'symboles_universels', titre: 'Symboles universels', source: { page: 3 },
      verbatim: tranche(3, 'Certaines capacités et pouvoirs placent', ' Lexique.') },
    { id: 'lexique', titre: 'Lexique', source: { page: 3 },
      verbatim: tranche(3, 'RP. Abréviation', null) },
    { id: 'armes_corps_a_corps', titre: 'Armes de corps à corps', source: { page: 4 },
      verbatim: tranche(4, 'Les Armes à 1 main infligent', ' Armes à distance :') },
    { id: 'armes_a_distance', titre: 'Armes à distance', source: { page: 4 },
      verbatim: tranche(4, 'Les Armes de jet (Dague', ' Mana et armures :') },
    { id: 'mana_et_armures', titre: 'Mana et armures', source: { page: 4 },
      verbatim: tranche(4, 'Un personnage peut porter n’importe quelle armure', ' Port d’Armures :') },
    { id: 'port_armures', titre: 'Port d’Armures', source: { page: 4 },
      verbatim: tranche(4, 'Pour fonctionner, une armure doit', ' Système monétaire') },
    { id: 'monnaie', titre: 'Système monétaire', source: { page: 4 },
      verbatim: tranche(4, 'L’argent qui circule prend la forme', ' ARMURES Pièces d’armure') },
    { id: 'tableau_armures', titre: 'Tableau des armures', source: { page: 4 },
      colonnes: ['Pièces d’armure', 'Montant de bloque'],
      lignes: [
        { piece: 'Plastron de métal (avec le dos)', bloc: '3' },
        { piece: 'Plastron de cuir (avec le dos)', bloc: '2' },
        { piece: 'Bracelet/jambières', bloc: '1 pour 2' },
        { piece: 'Tacets/épaulettes', bloc: '1 pour 4' },
        { piece: 'Casque', bloc: '1 ou 2' },
      ] },
  ],
}

// ── Chapitre 2 — blocs manquants ─────────────────────────────────────────────
const lutte = { source: { page: 5, section: 'Lutte' },
  verbatim: tranche(5, 'N’importe quel personnage peut tenter', ' Sauvegardes :') }
const sauvegardes = { source: { page: 5, section: 'Sauvegardes' },
  verbatim: tranche(5, 'Les sauvegardes sont obtenues', ' Illettré :') }
const magie = { source: { page: 8, section: 'La Magie' },
  verbatim: tranche(8, 'Certaines capacités de classes ou pouvoir obtenu en jeu', null) }

// Lore des races (p.6-7), tranché et posé sur chaque race existante.
const lore = {
  humain: tranche(6, "L'humain est la race la plus polyvalente", ' Faction : Tous'),
  elfe: tranche(6, 'Les elfes aiment la musique', ' Faction : Sanctum'),
  nain: tranche(6, 'Ils sont trapus et costauds.', ' Faction : Sanctum'),
  orc: tranche(6, 'Les orcs sont prompts à la colère', ' Faction :'),
  drow: tranche(7, 'Tueurs sans pitié', ' Faction : Légion'),
  gobelin: tranche(7, 'Les Gobelins tuent par plaisir', ' Faction :'),
}
rules.races.intro_verbatim = tranche(6, 'Voici la liste des races de base', ' Humains ')
for (const race of rules.races.liste) {
  if (!(race.id in lore)) throw new Error(`race sans lore prévu : ${race.id}`)
  race.lore_verbatim = lore[race.id]
}
if (rules.races.liste.length !== Object.keys(lore).length) throw new Error('compte de races inattendu')

// ── Chapitre 4 — les 4 tables (A11 : A) ──────────────────────────────────────
const effet = (page, debut, fin) => tranche(page, debut, fin)
const tablesCh4 = {
  source: { pages: [18, 19], section: 'Chapitre 4 — tables (Ressources, Substances, Forgeron, Runes)' },
  ressources: {
    source: { page: 18 }, titre: 'Ressources et valeur',
    lignes: [
      { ressource: 'Alchimite', valeur: '3 Pc' },
      { ressource: 'Arcanite', valeur: '1 Po' },
      { ressource: 'Adamantium', valeur: '1 Po' },
      { ressource: 'Aurorium', valeur: '3 Pa' },
      { ressource: 'Mythril', valeur: '2 Pa' },
    ] },
  substances_alchimiques: {
    source: { page: 18 }, titre: 'Substances alchimiques',
    liste: [
      { nom: 'Potion de soins', couleur: 'Rouge', compo: '1 Alchimite', valeur: '6 Pc',
        effet_verbatim: effet(18, 'Le buveur récupère tous ses PV', ' Potion de Mana') },
      { nom: 'Potion de Mana', couleur: 'Bleu', compo: '1 Alchimite', valeur: '6 Pc',
        effet_verbatim: effet(18, 'Le buveur récupère tous ses points de Mana', ' Poison Couleur') },
      { nom: 'Poison', couleur: 'Vert', compo: '1 Alchimite', valeur: '6 Pc',
        effet_verbatim: effet(18, 'Verser sur une arme inflige', null) },
    ] },
  objets_forgeron: {
    source: { page: 19 }, titre: 'Objets spéciaux du Forgeron',
    materiaux: [
      { materiau: 'Adamantium', valeur_base: '1 Po', objets: [
        { type: 'arme', materiel: '1 Adamantium +1 Pa', valeur: '2 Po',
          effet_verbatim: effet(19, 'L’arme inflige des dégâts percearmure.', ' Matériel :') },
        { type: 'armure', materiel: '2 Adamantium +1 Pa', valeur: '4 Po',
          effet_verbatim: effet(19, 'L’armure ignore le perce-armure.', ' Matériel :') },
        { type: 'bouclier', materiel: '1 Adamantium +1 Pa', valeur: '2 Po',
          effet_verbatim: effet(19, 'Requière 2 brise-bouclier', ' Matériel :') },
      ] },
      { materiau: 'Aurorium', valeur_base: '3 Pa', objets: [
        { type: 'arme', materiel: '1 Aurorium +1 Pa', valeur: '6 Pa',
          effet_verbatim: effet(19, 'L’arme peu se briser pour faire un Critique', ' Matériel :') },
        { type: 'armure', materiel: '2 Aurorium +1 Pa', valeur: '12 Pa',
          effet_verbatim: effet(19, 'L’armure peu se briser pour donner 1 sauvegarde', ' Matériel :') },
        { type: 'bouclier', materiel: '1 Aurorium +1 Pa', valeur: '6 Pa',
          effet_verbatim: effet(19, 'Le bouclier peu se briser pour donner', ' Matériel :') },
      ] },
      { materiau: 'Mythril', valeur_base: '2 Pa', objets: [
        { type: 'arme', materiel: '1 Mythril +1 Pa', valeur: '4 Pa',
          effet_verbatim: effet(19, 'L’arme confère +1 de Mana au porteur', ' Matériel :') },
        { type: 'armure', materiel: '2 Mythril +1 Pa', valeur: '8 Pa',
          effet_verbatim: effet(19, 'L’armure ne retire aucun point de Mana', ' Matériel :') },
        { type: 'bouclier', materiel: '1 Mythril +1 Pa', valeur: '4 Pa',
          effet_verbatim: effet(19, 'Le bouclier peut bloquer les flèches', ' Matériel :') },
      ] },
    ] },
  runes: {
    source: { page: 19 },
    verbatim: tranche(19, 'OBJET MAGIQUE DE L’ARCANISTE', ' Rune d’arme'),
    affichage: 'Objet magique du Runiste',
    note_affichage: 'A8/Q4 (2026-08-24) : « arcaniste » n’existe pas — l’artisanat est le Runiste.',
    runes_arme: [
      { nom: 'Arme de feu', materiel: '1 Arcanite +1 Po', valeur: '3 Po',
        effet_verbatim: effet(19, 'L’arme inflige +1 dégât de feu.', ' Matériel :') },
      { nom: 'Arme de givre', compo: '1 Arcanite +1 Po', valeur: '3 Po',
        effet_verbatim: effet(19, 'L’arme inflige +1 dégât de froid.', ' Compo :') },
      { nom: 'Arme de foudre', materiel: '1 Arcanite +1 Po', valeur: '3 Po',
        effet_verbatim: effet(19, 'L’arme inflige +1 dégât magique.', ' Matériel :') },
      { nom: 'Arme acide', compo: '1 Arcanite +1 Po', valeur: '3 Po',
        effet_verbatim: effet(19, 'L’arme inflige +1 dégât de poison.', ' Compo :') },
      { nom: 'Arme massive', materiel: '1 Arcanites +1 Po', valeur: '3 Po',
        effet_verbatim: effet(19, 'L’arme est toujours considérée comme une arme à 2 mains', ' Matériel :') },
      { nom: 'Arme vicieuse', materiel: '2 Arcanites +1 Po', valeur: '5 Po',
        effet_verbatim: effet(19, 'L’arme inflige +1 dégât et le premier coup', ' Matériel :') },
    ],
    runes_amulette: [
      { nom: 'Amulette de camouflage', materiel: '1 Arcanite +1 Pa', valeur: '2 Po',
        effet_verbatim: effet(19, 'Lorsque le porteur n’est pas observé', ' Matériel :') },
      { nom: 'Amulette de force', compo: '1 Arcanite +1 Pa', valeur: '2 Po',
        effet_verbatim: effet(19, 'Le porteur obtient +1 de lutte.', ' Compo:') },
      { nom: 'Amulette de récupération', materiel: '1 Arcanite +1 Pa', valeur: '2 Po',
        effet_verbatim: effet(19, 'Après 1 minute hors combat', ' Matériel :') },
      { nom: 'Amulette de Téléportation', compo: '1 Arcanite +1 Pa', valeur: '2 Po',
        effet_verbatim: effet(19, 'Permets de faire 10 pas de course', ' Compo:') },
      { nom: 'Amulette d’endurance', materiel: '1 Arcanite +1 Pa', valeur: '2 Po',
        effet_verbatim: effet(19, 'Confère au porteur +2 PV.', ' Matériel :') },
      { nom: 'Amulette de Mana', materiel: '1 Arcanite +1 Pa', valeur: '2 Po',
        effet_verbatim: effet(19, 'Confère au porteur +2 Mana.', ' Matériel :') },
    ] },
}

// ── Arbitrages A8/A9/A10 dans le bloc ateliers existant ─────────────────────
function trouverAteliers(noeud) {
  if (Array.isArray(noeud)) { for (const e of noeud) { const t = trouverAteliers(e); if (t) return t } return null }
  if (noeud && typeof noeud === 'object') {
    if (noeud.laboratoire && noeud.poste_de_traite) return noeud
    for (const v of Object.values(noeud)) { const t = trouverAteliers(v); if (t) return t }
  }
  return null
}
const ateliers = trouverAteliers(rules)
if (!ateliers) throw new Error('bloc ateliers introuvable')
if (!ateliers.laboratoire.verbatim.includes('tavernier')) throw new Error('verbatim laboratoire inattendu')
ateliers.laboratoire.affichage = ateliers.laboratoire.verbatim.replace('tavernier', 'marchand')
ateliers.laboratoire.note_affichage =
  'A8/Q3 (2026-08-24, Fred) : « tavernier » est un terme oublié du manuel — lire « marchand ».'
ateliers.application_app =
  'AFFICHER seulement. L’app n’accorde jamais un avantage avancé — c’est le rang de l’atelier de faction ' +
  'qui l’ouvre, hors app (D24 ⑤-bis). Arbitrages 2026-08-24 : A8 tavernier = marchand (affichage) · ' +
  'A9 l’app n’affiche que le verbatim, zéro logique d’avantage avancé · A10 rang 1 = l’état de base ' +
  'd’un atelier remis en état, « pour avancer » = rang 2.'

// ── Assemblage dans l’ordre voulu ────────────────────────────────────────────
const sortie = {}
for (const [cle, valeur] of Object.entries(rules)) {
  sortie[cle] = valeur
  if (cle === 'meta') sortie.regles_de_base = reglesDeBase
  if (cle === 'caracteristiques') { sortie.lutte = lutte; sortie.sauvegardes = sauvegardes }
  if (cle === 'dons') sortie.magie = magie
  if (cle === 'competences') sortie.tables_ch4 = tablesCh4
}

// ── Meta : version, note de lot, couverture ──────────────────────────────────
sortie.meta.version = '1.3.0'
sortie.meta.date = '2026-08-24'
sortie.meta.lot_130 =
  'Ch.1 complet (p.2-4 : conduite, PV/dégâts, combat, fouille, objet porté, symboles, lexique, ' +
  'armes/armures, monnaie), ch.2 complété (Lutte, Sauvegardes, La Magie, lore des 6 races), ' +
  'les 4 tables du ch.4 (p.18-19 — A11 : A). Arbitrages Fred 2026-08-24 : A8 tavernier = marchand · ' +
  'A9 verbatim seul, zéro logique · A10 rang 1 = état de base. Chaque verbatim tranché du témoin par script.'

// Couverture : mesurer avec l’instrument de la GATE sur l’objet fini, puis fixer les planchers.
const grammes = (t) => {
  const mots = normaliser(t).toLowerCase().split(' ').filter(Boolean)
  const s = new Set()
  for (let i = 0; i + 5 <= mots.length; i += 1) s.add(mots.slice(i, i + 5).join(' '))
  return s
}
const anciennes = new Map(sortie.meta.couverture_pages.map((e) => [e.page, e]))
anciennes.delete(18) // la coupe tombe : les tables sont transcrites
const nouvelles = [2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20]
const mesureFinale = () => {
  const corpus = grammes(JSON.stringify(sortie))
  return nouvelles.map((p) => {
    const g = grammes(pages[String(p)])
    let c = 0
    for (const x of g) if (corpus.has(x)) c += 1
    return { page: p, pct: (100 * c) / g.size, communs: c, total: g.size }
  })
}
// Deux passes : les planchers écrits changent les octets, pas les mesures de pages.
sortie.meta.couverture_pages = nouvelles.map((p) => anciennes.get(p) ?? { page: p, plancher: 0 })
const mesures = mesureFinale()
sortie.meta.couverture_pages = mesures.map(({ page, pct }) => {
  const ancienne = anciennes.get(page)
  const plancher = ancienne ? ancienne.plancher : Math.max(1, Math.floor(pct) - 5)
  const entree = { page, plancher }
  if (ancienne?.coupe_a) { entree.coupe_a = ancienne.coupe_a; entree.raison_coupe = ancienne.raison_coupe }
  return entree
})

// ── Écriture : l’encodage de rules.json et aucun autre ───────────────────────
const texte = JSON.stringify(sortie, null, 1)
writeFileSync(`${RACINE}/src/data/rules.json`, texte)
const sha = createHash('sha256').update(texte).digest('hex')
console.log('tranches découpées :', nbTranches)
for (const m of mesures) console.log(`p.${m.page} : ${m.communs}/${m.total} = ${m.pct.toFixed(1)} %`)
console.log('octets :', Buffer.byteLength(texte, 'utf8'))
console.log('sha256 :', sha)
