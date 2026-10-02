# La notation `.bjj` · version 0.1

**Statut :** premier brouillon public, octobre 2026. Traduction informative : seule la
[version anglaise](bjj-notation.md) fait foi. Licence : [CC BY 4.0](../LICENSE-SPEC.md).

Les mots **doit**, **ne doit pas**, **devrait** et **peut** se lisent comme dans la RFC 2119.

## 1. But

Un fichier `.bjj` décrit un **game plan** de jiu-jitsu brésilien : les techniques qu'un pratiquant
connaît (positions, passages, soumissions, défenses, takedowns), comment elles s'enchaînent, et
comment l'adversaire peut réagir ou contrer. C'est un graphe écrit en texte. Il ne décrit ni positions
à l'écran, ni vidéos, ni notes.

## 2. Un exemple complet

```bjj
plan "A-game KL" {

  takedown body_lock { tag: a_game, GAP  detail: "départ debout" }
  position pulls_guard = open_guard.bottom { name: "Il tire garde" }

  from body_lock:
    -> top_position  tag: a_game
    -> pulls_guard
       when: "je perds le clinch"

  from top_position:
    -> knee_slice   leads_to: side_control   tag: a_game
    -> torreando    when: "garde ouverte"

  from mount:
    -> americana    leads_to: FINISH
    -> armbar       when: "il tend le bras"
                    leads_to: FINISH
    -> his_guard.top  tag: COUNTER
       when: "il fait upa"

  from dogfight:
    # rien de prévu ici
    tag: GAP
}
```

Les mots-clés et les identifiants restent en anglais, comme les coups aux échecs ; les noms, les
conditions et les commentaires s'écrivent dans ta langue.

## 3. Écriture

- **Encodage.** UTF-8. Fins de ligne `\n` ou `\r\n`.
- **Blancs.** Espaces, tabulations et retours à la ligne séparent les mots et ne comptent pas
  autrement : l'indentation et les retours à la ligne n'ont pas de sens.
- **Commentaires** : de `#` (hors d'une chaîne) jusqu'au bout de la ligne.
- **Mots-clés** : `plan`, `position`, `submission`, `pass`, `defense`, `takedown`, `from`.
- **Propriétés** : un mot suivi immédiatement de deux-points : `when:`, `leads_to:`, `tag:`, `name:`,
  `detail:`.
- **Mots réservés** : `FINISH`, `GAP`, `WIP`, `SOLID`, `COUNTER`.
- **Flèche** : `->`. **Ponctuation** : `{` `}` `=` `,` `.` `:`.
- **Identifiants** : `[a-z][a-z0-9_]*`, lettres minuscules sans accents, chiffres et tirets bas, en
  commençant par une lettre. Les mots-clés et les noms de propriétés n'en sont pas.
- **Chaînes** : entre guillemets droits, sur une ligne. `\"` vaut un guillemet, `\\` une barre oblique
  inverse. Tout autre caractère est permis, dans toutes les langues.

## 4. Grammaire

```ebnf
fichier        = plan ;
plan           = "plan" , chaîne , "{" , { déclaration | bloc_from } , "}" ;

déclaration    = catégorie , alias , [ "=" , référence ] , [ propriétés ] ;
catégorie      = "position" | "submission" | "pass" | "defense" | "takedown" ;
propriétés     = "{" , { propriété } , "}" ;
propriété      = "name:" , chaîne | "detail:" , chaîne | "tag:" , étiquettes ;

bloc_from      = "from" , référence , ":" , { "tag:" , étiquettes } , { flèche } ;
flèche         = "->" , référence , { option } ;
option         = "when:" , chaîne | "leads_to:" , ( référence | "FINISH" ) | "tag:" , étiquettes ;

référence      = identifiant , [ "." , ( "top" | "bottom" ) ] ;
étiquettes     = étiquette , { "," , étiquette } ;
étiquette      = identifiant | "GAP" | "WIP" | "SOLID" | "COUNTER" ;
alias          = identifiant ;
```

Blancs et commentaires peuvent se glisser entre deux mots. Un fichier contient exactement un plan ;
après son accolade fermante, seuls des blancs et des commentaires. Un `tag:` placé dans un bloc `from`
avant sa première flèche vaut pour la position du bloc ; après une flèche, c'est une option de cette
flèche.

## 5. Sens

### 5.1 Nœuds et identité

Un plan est un graphe orienté. Ses **nœuds** sont des techniques ; ses **arêtes**, des transitions.

- Une **référence** désigne un nœud : `side_control`, `mount.bottom`.
- Sans côté écrit, une référence prend le côté du vocabulaire (§6) : `side_control` et
  `side_control.top` sont le même nœud. `mount.top` et `mount.bottom` sont deux nœuds différents.
- Une **déclaration** crée un nœud sous un **alias** et lui donne sa catégorie : `position x`, ou
  `position x = mount.top` pour le fonder sur une entrée du vocabulaire, avec un côté. Les références
  à un alias désignent le nœud déclaré ; y écrire un autre côté est une erreur.
- Un alias peut servir avant sa déclaration. Deux déclarations ne doivent pas partager un alias.
- Pour placer deux fois la même technique dans un plan, chaque occurrence prend son propre alias.

Le **nom** d'un nœud est, dans l'ordre : sa propriété `name:`, le nom de sa référence dans le
vocabulaire, ou son identifiant avec des espaces à la place des tirets bas et une majuscule
(`club_choke` → « Club choke »).

La **catégorie** d'un nœud est le mot-clé de sa déclaration, ou la catégorie de sa référence dans le
vocabulaire. Un identifiant ni déclaré ni dans le vocabulaire est une `position`, et un outil
**devrait** le signaler.

### 5.2 Transitions

| Texte                                  | Sens                                                               |
| -------------------------------------- | ------------------------------------------------------------------ |
| `from A:` puis `-> B`                  | une transition de A vers B                                         |
| `-> B` avec `tag: COUNTER`             | l'adversaire contre (type _counter_)                               |
| `-> B` avec `when: "…"` sans `COUNTER` | l'adversaire réagit (type _reaction_) ; la chaîne est la condition |
| `-> B` sans les deux                   | ça passe (type _success_)                                          |
| `leads_to: C` sur `-> B`               | une seconde transition, de B vers C, de type _success_             |
| `leads_to: FINISH` sur `-> B`          | la transition de A vers B termine le combat                        |

Une condition fait toujours une réaction ou un contre : une transition _success_ n'a pas de
condition. Une condition vide (`when: ""`) fait quand même une réaction.

Une même transition (même départ, même arrivée) s'écrit une fois ; un outil **devrait** signaler les
copies suivantes et garder la première. Une transition écrite avec `->` l'emporte sur celle que
suppose un `leads_to:`. Une transition d'un nœud vers lui-même est ignorée, avec une remarque.

### 5.3 Étiquettes

| Étiquette              | Sur une déclaration ou un bloc `from`                  | Sur une flèche                   |
| ---------------------- | ------------------------------------------------------ | -------------------------------- |
| `a_game`               | le nœud fait partie de la séquence principale (A-game) | le nœud d'arrivée en fait partie |
| `GAP`, `WIP`, `SOLID`  | maîtrise du nœud : trou, en cours, maîtrisé            | maîtrise du nœud d'arrivée       |
| `COUNTER`              | erreur                                                 | la transition est un contre      |
| tout autre identifiant | une étiquette libre du nœud                            | ignorée, avec une remarque       |

Sans étiquette de maîtrise, un nœud est _à découvrir_. Si deux étiquettes de maîtrise visent le même
nœud, la dernière l'emporte et un outil **devrait** le signaler.

### 5.4 Trous

Un nœud qui n'est pas une soumission et n'a aucune transition sortante est un **trou** : une
situation que le plan ne règle pas encore. Ce n'est pas une erreur ; les outils **devraient** le
montrer.

## 6. Vocabulaire

Un vocabulaire associe des identifiants à des techniques. Le vocabulaire de base,
[`vocabulary/base.json`](../vocabulary/base.json), est un tableau JSON d'entrées :

```json
{
  "id": "closed_guard",
  "category": "position",
  "side": "bottom",
  "names": { "en": "Closed guard", "fr": "Garde fermée", "pt": "Guarda fechada" },
  "synonyms": []
}
```

- `id` suit la règle des identifiants et est unique. `names.en` est obligatoire ; les autres langues
  se replient sur lui.
- `side` est facultatif : c'est le côté par défaut des références sans côté.
- `synonyms` liste d'autres identifiants pour la même entrée (par exemple `his_guard` pour
  `in_guard`).

Un outil **peut** utiliser un autre vocabulaire. Le sens d'un fichier n'en dépend que pour les noms,
les catégories et les côtés par défaut des références non déclarées.

## 7. Messages

Un outil s'arrête à la **première erreur** et la signale ; il **ne doit pas** produire un graphe
partiel à partir d'un fichier fautif. Les remarques n'arrêtent rien.

Chaque message **doit** porter un code stable, une ligne et une colonne (à partir de 1 ; les colonnes
comptent les unités UTF-16), et **devrait** porter un texte dans la langue de la personne. Quand une
valeur manque en fin de ligne (`when:`, `leads_to:`, `=`, `{`, `:`…), le message pointe le mot resté
seul, pas la ligne suivante. Les erreurs sont signalées dans l'ordre du texte.

La liste des codes est celle de la [version anglaise](bjj-notation.md#7-diagnostics) ; le parseur de
référence fournit leurs textes en anglais, en français et en portugais (`src/messages.ts`).

## 8. Écrire du `.bjj` (informatif)

Un outil qui écrit du `.bjj` à partir d'un graphe devrait produire un texte qui se relit en le même
graphe, hors coordonnées. Le parseur de référence écrit d'abord les déclarations (seulement ce que le
vocabulaire ne dit pas : noms personnalisés, maîtrise, A-game, détails, étiquettes, secondes
occurrences), puis un bloc `from` par nœud qui a des sorties, un bloc `from` vide par trou, deux
espaces d'indentation et des options alignées.

## 9. Conformité

La [suite de conformité](../conformance/) liste des fichiers `.bjj` et leur résultat attendu, calculé
avec le vocabulaire de base : graphe, remarques (code, ligne, colonne) et trous pour les fichiers
valides ; erreur (code, ligne, colonne) pour les autres. Un outil conforme produit exactement ces
résultats. Les textes des messages n'en font pas partie.

## 10. Versions

La notation suit le versionnage sémantique. Avant la 1.0, une version mineure peut changer le sens
d'un fichier ; chaque changement est noté dans le [journal des modifications](../CHANGELOG.md).
