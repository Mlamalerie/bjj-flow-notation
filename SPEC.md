# La notation `.bjj` · v0.1

Une façon d'écrire le jiu-jitsu brésilien : tes positions, tes enchaînements et les réactions de ton
adversaire, dans un texte que tu lis d'un coup d'œil, que tu versionnes sur git et que tu partages.

Spécification sous licence [CC BY 4.0](LICENSE-SPEC.md). Le parseur de référence (TypeScript, MIT) est
dans `src/`.

## Un exemple

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

## Les mots

| Mot | Sens | Exemple |
|---|---|---|
| `plan` | Le plan et son nom. | `plan "A-game KL" {` |
| `position`, `submission`, `pass`, `defense`, `takedown` | Déclare une technique, sa catégorie, et ce qui la distingue. | `position mount_2 = mount.top` |
| `from … :` | Ouvre la liste de ce que tu fais depuis une position. | `from side_control.top:` |
| `->` | Une technique ou une transition. Une ligne, une option. | `-> knee_slice` |
| `when:` | La condition : ce que fait l'adversaire pour que tu choisisses cette branche. | `when: "il met un knee shield"` |
| `leads_to:` | Où tu arrives. `FINISH` si le combat s'arrête là. | `leads_to: side_control` |
| `tag:` | Des étiquettes libres, et des étiquettes réservées. | `tag: a_game, GAP` |
| `name:`, `detail:` | Nom affiché et détail court, dans une déclaration. | `{ name: "Il tire garde" }` |
| `.top`, `.bottom` | Le côté : dessus, dessous. | `mount.bottom` |
| `#` | Un commentaire, jusqu'au bout de la ligne. | `# rien de prévu ici` |

Étiquettes réservées : `a_game` (ta séquence principale), `GAP` (un trou), `WIP` (en cours), `SOLID`
(maîtrisé), `COUNTER` (sur une flèche : l'adversaire contre).

## Grammaire (EBNF)

```ebnf
fichier        = { vide } , plan , { vide } ;
plan           = "plan" , chaîne , "{" , { élément } , "}" ;
élément        = déclaration | bloc_from | vide ;

déclaration    = catégorie , alias , [ "=" , référence ] , [ propriétés ] ;
catégorie      = "position" | "submission" | "pass" | "defense" | "takedown" ;
propriétés     = "{" , { propriété | vide } , "}" ;
propriété      = "name:" , chaîne | "detail:" , chaîne | "tag:" , étiquettes ;

bloc_from      = "from" , référence , ":" , { étiquette_from | flèche | vide } ;
étiquette_from = "tag:" , étiquettes ;   (* avant la première flèche : vaut pour la position de départ *)
flèche         = "->" , référence , { option } ;
option         = "when:" , chaîne | "leads_to:" , ( référence | "FINISH" ) | "tag:" , étiquettes ;

référence      = ident , [ "." , ( "top" | "bottom" ) ] ;
étiquettes     = étiquette , { "," , étiquette } ;
étiquette      = ident | "GAP" | "WIP" | "SOLID" | "COUNTER" ;
alias          = ident ;
ident          = minuscule , { minuscule | chiffre | "_" } ;
chaîne         = '"' , { tout caractère sauf '"' | '\"' | '\\' } , '"' ;
vide           = blanc | fin_de_ligne | commentaire ;
commentaire    = "#" , { tout caractère sauf fin_de_ligne } ;
```

Les retours à la ligne et l'indentation ne comptent pas : une option se rattache à la dernière flèche
écrite. Tout sur une ligne, ou une option par ligne : les deux se valent. Les mots-clés et les propriétés
(`when`, `leads_to`, `tag`, `name`, `detail`) ne peuvent pas servir d'identifiant.

## Ce que le texte veut dire

| Texte | Sens |
|---|---|
| `from A:` puis `-> B` | une transition de A vers B |
| `-> B` avec `tag: COUNTER` | l'adversaire contre (« Il contre ») |
| `-> B` avec `when: "…"` | l'adversaire réagit (« Il réagit »), la condition est le texte |
| `-> B` sans les deux | ça passe (« Ça passe ») |
| `leads_to: C` sur `-> B` | une transition de B vers C, qui passe |
| `leads_to: FINISH` sur `-> B` | la transition A → B termine le combat |
| `tag: a_game` (déclaration ou flèche) | la technique fait partie de l'A-game |
| `tag: GAP` / `WIP` / `SOLID` | maîtrise : trou / en cours / maîtrisé ; sans rien : à découvrir |
| autre étiquette sur une déclaration | étiquette libre de la technique |
| autre étiquette sur une flèche | ignorée, avec une remarque |

- **Une condition fait une réaction.** « Ça passe » n'a pas de condition.
- **Identité.** Une même référence désigne une même technique du plan. Sans côté écrit, une référence
  prend le côté du vocabulaire : `side_control` et `side_control.top` sont la même. Pour placer deux
  fois la même technique, chacune prend un alias : `position mount_2 = mount.top`.
- **Vocabulaire.** Un identifiant connu (`side_control`, `knee_slice`, `americana`…) apporte son nom et
  sa catégorie : voir `vocabulary/base.json`. Un identifiant inconnu et non déclaré devient une position
  nommée d'après lui (`choke_du_club` → « Choke du club »), avec une remarque. Déclare-le pour choisir
  sa catégorie.
- **Trous.** Une technique sans transition sortante, hors soumission, est un trou : les outils le
  signalent (« aucune sortie définie »), sans rien changer au plan.
- **Erreurs.** Un parseur conforme indique toujours une ligne, une colonne et une phrase claire. Une
  valeur oubliée en fin de ligne est signalée sur le mot resté seul, pas sur la ligne suivante.

## Ce que le texte ne contient pas

Les coordonnées des techniques à l'écran (un outil les recalcule), les vidéos et les notes. Le `.bjj`
décrit un jeu, pas une sauvegarde complète d'une application.

## Aller-retour

Écrire un plan en `.bjj` puis le relire redonne le même graphe : techniques, catégories, côtés,
maîtrise, A-game, détails, étiquettes, transitions et conditions. C'est testé dans `src/`.

## Versions

- **0.1** (octobre 2026) : première version publique.
