# La notation `.bjj`

**Écrire le jiu-jitsu brésilien.** Les échecs ont leur notation depuis des siècles ; le grappling n'en
avait pas de commune. `.bjj` décrit tes positions, tes enchaînements et les réactions de ton
adversaire dans un texte que tu lis d'un coup d'œil, que tu gardes dans git et que tu partages avec
ton coach.

[English](README.md) · [Português](README.pt.md)

```bjj
plan "A-game depuis la montée" {

  position mount { tag: a_game, SOLID }

  from mount:
    -> americana      leads_to: FINISH
    -> armbar         when: "il pousse sur ma poitrine"
                      leads_to: FINISH
    -> back           when: "il se tourne sur le côté"
    -> his_guard.top  tag: COUNTER
                      when: "il fait upa"

  from dogfight:
    # rien de prévu ici
    tag: GAP
}
```

À lire à voix haute : _depuis la montée, je vais chercher l'americana, qui termine. S'il pousse sur ma
poitrine, armbar. S'il se tourne, je prends le dos. S'il fait upa, il me contre et je me retrouve dans
sa garde. Dans le dogfight, je n'ai encore rien : c'est un trou._

Les mots-clés (`from`, `when:`…) et les identifiants (`side_control`) restent en anglais, comme les
coups aux échecs. Les noms, les conditions, les commentaires et les messages d'erreur sont dans ta
langue : anglais, français ou portugais.

## Dans ce repo

| Chemin                                               | Quoi                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`spec/bjj-notation.fr.md`](spec/bjj-notation.fr.md) | La spécification en français (la [version anglaise](spec/bjj-notation.md) fait foi) |
| [`spec/RATIONALE.md`](spec/RATIONALE.md)             | Pourquoi la notation est faite ainsi (en anglais)                                   |
| [`vocabulary/base.json`](vocabulary/base.json)       | 91 positions et techniques, nommées en anglais, français et portugais               |
| [`conformance/`](conformance/)                       | Cas de test indépendants du langage : textes `.bjj` et résultats attendus           |
| [`src/`](src/)                                       | Le parseur de référence, en TypeScript, sans dépendance                             |
| [`examples/`](examples/)                             | Des plans complets à lire et à copier                                               |

## Utiliser le parseur

```ts
import { createVocabulary, parseNotation } from "bjj-notation";
import base from "bjj-notation/vocabulary/base.json" with { type: "json" };

const vocabulary = createVocabulary(base, { locale: "fr" });
const result = parseNotation(texte, vocabulary, { locale: "fr" });
// result.ok ? result.graph : result.error.message  → « Il manque : après « from mount ». »
```

Chaque message a un code stable (`from.missing_colon`) et un texte dans la langue demandée.

## Contribuer

Une position manque ? Un mot-clé serait plus clair ? Ouvre une issue : chaque version de la
spécification se discute en public. Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) (en anglais, mais les
issues en français sont les bienvenues).

## Licences

Spécification : [CC BY 4.0](LICENSE-SPEC.md). Code, vocabulaire et suite de conformité :
[MIT](LICENSE).
