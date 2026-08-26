/**
 * D20 lot 2 — la fenêtre de répercussions d'une correction
 * (MAQUETTE_FIL_D20_v3, validée par Fred le 2026-08-26).
 *
 * Elle s'ouvre AVANT que quoi que ce soit s'applique : « Annuler » ne touche
 * à rien, « Changer quand même » est le seul geste qui écrit. Les deux
 * moments — la dérivation et l'écriture — ne se mélangent jamais.
 *
 * ⛔ Cette fenêtre ne calcule RIEN. Elle rend ce que `wizard/cascade` a dérivé :
 * chaque perte porte son nom, sa nature, le niveau où elle avait été gagnée
 * et le droit disparu qui l'emporte. Une liste écrite à la main n'aurait pas
 * survécu à un changement de corpus ; celle-ci suit toute seule.
 */
import {
  libelleCeQueTuPerds,
  libelleCeQuiReste,
  libelleFenetre,
  libelleObtenuAu,
  libelleRaisonDeLaPerte,
  libelleReste,
  libelleSource,
  LIBELLE_ANNULER,
  LIBELLE_CHANGER,
  LIBELLE_PROVENANCE,
  type Correction,
  type Perte,
  type Reste,
} from '../../wizard/cascade'

/** L'étiquette de nature d'un acquis — un mot, jamais un texte de règle. */
const NATURE: Record<Perte['type'], string> = {
  don: 'Don',
  langue: 'Langue',
  capacite: 'Capacité',
}

function Etiquette({ children, or }: { children: React.ReactNode; or?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[12px] ${
        or ? 'border-gold-dark/60 text-gold' : 'border-border/50 text-muted-foreground'
      }`}
    >
      {children}
    </span>
  )
}

/** La carte rouge d'un acquis qui part — nommé, daté, avec sa raison. */
function CartePerte({ perte }: { perte: Perte }) {
  return (
    <div className="my-2 rounded-lg border border-destructive/50 bg-destructive/[0.07] p-2.5">
      <b className="font-titre text-[16.5px]">{perte.nom}</b>
      <div className="my-1.5 flex flex-wrap gap-1.5">
        <Etiquette>{NATURE[perte.type]}</Etiquette>
        <Etiquette>{libelleObtenuAu(perte)}</Etiquette>
        <Etiquette>{libelleSource(perte)}</Etiquette>
        {perte.gratuit && <Etiquette or>gratuit</Etiquette>}
      </div>
      <p className="m-0 text-[14px] text-muted-foreground">{libelleRaisonDeLaPerte(perte)}</p>
    </div>
  )
}

/** La carte verte d'un groupe qui survit, et la raison de sa survie. */
function CarteReste({ reste }: { reste: Reste }) {
  const { titre, raison } = libelleReste(reste)
  return (
    <div className="my-2 rounded-lg border border-chart-4/50 bg-chart-4/[0.07] p-2.5">
      <b className="font-titre text-[16.5px]">{titre}</b>
      <div className="my-1.5 flex flex-wrap gap-1.5">
        {reste.items.map((item, rang) => (
          <Etiquette key={`${item.nom}-${rang}`}>
            {item.niveau === undefined ? item.nom : `${item.nom} · niv ${item.niveau}`}
          </Etiquette>
        ))}
      </div>
      <p className="m-0 text-[14px] text-muted-foreground">{raison}</p>
    </div>
  )
}

interface Props {
  correction: Correction
  /** Ce que le point change — le chapeau de la fenêtre, dérivé du bilan. */
  chapeau: string
  onAnnuler: () => void
  onChanger: () => void
}

export default function FenetreRepercussions({
  correction,
  chapeau,
  onAnnuler,
  onChanger,
}: Props) {
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={libelleFenetre()}
      className="pas-a-imprimer my-3 rounded-lg border border-primary/60 bg-card p-3.5"
    >
      <h3 className="m-0 mb-1 font-titre text-xl font-bold text-gold">{libelleFenetre()}</h3>
      <p className="m-0 mb-2 text-[15px] text-muted-foreground">{chapeau}</p>

      <h4 className="m-0 mt-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-destructive-foreground">
        {libelleCeQueTuPerds(correction.pertes.length)}
      </h4>
      {correction.pertes.map((perte, rang) => (
        <CartePerte key={`${perte.type}-${perte.nom}-${rang}`} perte={perte} />
      ))}

      {correction.bilan.length > 0 && (
        <dl className="my-2.5 rounded-lg border border-border/50 bg-muted/30 p-2.5">
          {correction.bilan.map((ligne) => (
            <div key={ligne.quoi} className="flex items-baseline gap-2 py-0.5 text-[14.5px]">
              <dt className="flex-1">{ligne.quoi}</dt>
              <dd className="m-0 flex-none font-semibold">
                {ligne.avant} → {ligne.apres}
              </dd>
              {ligne.effets && (
                <dd className="m-0 flex-none text-[13.5px] italic text-muted-foreground">
                  {ligne.effets
                    .map((effet) => `${effet.quoi} ${effet.avant} → ${effet.apres}`)
                    .join(' · ')}
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}

      {correction.reste.length > 0 && (
        <>
          <h4 className="m-0 mt-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-chart-4">
            {libelleCeQuiReste()}
          </h4>
          {correction.reste.map((reste) => (
            <CarteReste key={reste.type} reste={reste} />
          ))}
        </>
      )}

      <div className="mt-3 flex gap-2.5">
        <button type="button" className="btn-ghost flex-none" onClick={onAnnuler}>
          {LIBELLE_ANNULER}
        </button>
        <button type="button" className="btn-cta" onClick={onChanger}>
          {LIBELLE_CHANGER}
        </button>
      </div>

      <p className="mt-2.5 rounded-md border border-dashed border-border/50 px-3 py-2 text-[13px] text-muted-foreground">
        {LIBELLE_PROVENANCE}
      </p>
    </section>
  )
}
