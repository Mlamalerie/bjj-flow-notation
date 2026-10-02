# Notation `.bjj`

Les échecs ont leur notation depuis des siècles. Le grappling n'en avait pas. La notation `.bjj` décrit
tes positions, tes enchaînements et les réactions de ton adversaire, dans un texte que tu lis d'un coup
d'œil.

```bjj
plan "A-game KL" {
  from mount:
    -> americana     leads_to: FINISH
    -> armbar        when: "il tend le bras"
    -> his_guard.top tag: COUNTER
                     when: "il fait upa"
}
```

- **La spécification** : [`SPEC.md`](SPEC.md) (CC BY 4.0).
- **Le parseur** : `src/`, TypeScript sans dépendance (MIT). Il lit un texte en graphe, écrit un graphe en
  texte, et signale chaque faute avec sa ligne et sa colonne.
- **Le vocabulaire** : [`vocabulary/base.json`](vocabulary/base.json), les positions et techniques de
  base, identifiants en anglais, noms en français.

La notation n'appartient à aucune application : n'importe quel outil, n'importe quel coach peut
l'utiliser. Elle est née dans Plan B, un éditeur de game plan de jiu-jitsu.

## Utiliser le parseur

```ts
import { createVocabulary, parseNotation, serializeNotation } from "./src/index.ts";
import base from "./vocabulary/base.json" with { type: "json" };

const vocabulary = createVocabulary(base);
const result = parseNotation(texte, vocabulary);
if (result.ok) {
  result.graph; // { name, nodes, edges }
  result.warnings; // remarques : technique hors vocabulaire, étiquette ignorée…
  result.gaps; // positions sans sortie
} else {
  result.error; // { message, span: { from: { line, col }, to } }
}
```

## Contribuer

Il manque une position ? Un mot-clé serait plus clair ? Ouvre une issue : chaque version de la
spécification est discutée en public.

| Commande | Rôle |
|---|---|
| `bun install` | Dépendances (TypeScript, Vitest) |
| `bun run test` | Tests du parseur |
| `bun run typecheck` | Vérification des types |

## Licences

- Spécification (`SPEC.md`) : [CC BY 4.0](LICENSE-SPEC.md).
- Code (`src/`) et vocabulaire (`vocabulary/`) : [MIT](LICENSE).
