import rules from '../data/rules.json'

export default function Encyclopedie() {
  const estVide = Object.keys(rules as Record<string, unknown>).length === 0

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-gold">Encyclopédie</h1>

      {estVide ? (
        <p className="carte text-secondary-foreground">
          Le contenu des règles n'a pas encore été livré. Cette page affichera bientôt les races,
          classes, capacités, dons et voies du jeu.
        </p>
      ) : (
        <pre className="carte overflow-x-auto text-sm text-secondary-foreground">
          {JSON.stringify(rules, null, 2)}
        </pre>
      )}
    </div>
  )
}
