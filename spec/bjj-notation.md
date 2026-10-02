# The `.bjj` notation · version 0.1

**Status:** first public draft, October 2026. This English text is normative; the
[French](bjj-notation.fr.md) and [Portuguese](bjj-notation.pt.md) translations are informative.
License: [CC BY 4.0](../LICENSE-SPEC.md).

The key words **must**, **must not**, **should** and **may** are to be read as in RFC 2119.

## 1. Purpose

A `.bjj` file describes one Brazilian jiu-jitsu **game plan**: the techniques a practitioner
knows (positions, passes, submissions, defenses, takedowns), how they lead to one another, and how
the opponent may react or counter. It is a graph written as text. It does not describe screen
coordinates, videos or notes.

## 2. A complete example

```bjj
plan "A-game KL" {

  takedown body_lock { tag: a_game, GAP  detail: "from standing" }
  position pulls_guard = open_guard.bottom { name: "He pulls guard" }

  from body_lock:
    -> top_position  tag: a_game
    -> pulls_guard
       when: "I lose the clinch"

  from top_position:
    -> knee_slice   leads_to: side_control   tag: a_game
    -> torreando    when: "open guard"

  from mount:
    -> americana    leads_to: FINISH
    -> armbar       when: "he extends his arm"
                    leads_to: FINISH
    -> his_guard.top  tag: COUNTER
       when: "he bridges"

  from dogfight:
    # nothing planned here yet
    tag: GAP
}
```

## 3. Lexical structure

- **Encoding.** A file is UTF-8 text. Line ends are `\n` or `\r\n`.
- **Blanks.** Spaces, tabs and line ends separate tokens and are otherwise ignored: indentation and
  line breaks carry no meaning.
- **Comments** start with `#` outside a string and run to the end of the line.
- **Keywords:** `plan`, `position`, `submission`, `pass`, `defense`, `takedown`, `from`.
- **Properties** are a word immediately followed by a colon: `when:`, `leads_to:`, `tag:`, `name:`,
  `detail:`.
- **Reserved words:** `FINISH`, `GAP`, `WIP`, `SOLID`, `COUNTER`.
- **Arrow:** `->`. **Punctuation:** `{` `}` `=` `,` `.` `:`.
- **Identifiers** match `[a-z][a-z0-9_]*`: lowercase ASCII letters, digits and underscores, starting
  with a letter. Keywords and property names are not identifiers.
- **Strings** are enclosed in double quotes, on one line. Inside, `\"` stands for a quote and `\\` for
  a backslash. Strings may contain any other character, in any language.

## 4. Grammar

```ebnf
file           = plan ;
plan           = "plan" , string , "{" , { declaration | from_block } , "}" ;

declaration    = category , alias , [ "=" , reference ] , [ properties ] ;
category       = "position" | "submission" | "pass" | "defense" | "takedown" ;
properties     = "{" , { property } , "}" ;
property       = "name:" , string | "detail:" , string | "tag:" , tags ;

from_block     = "from" , reference , ":" , { "tag:" , tags } , { arrow } ;
arrow          = "->" , reference , { option } ;
option         = "when:" , string | "leads_to:" , ( reference | "FINISH" ) | "tag:" , tags ;

reference      = identifier , [ "." , ( "top" | "bottom" ) ] ;
tags           = tag , { "," , tag } ;
tag            = identifier | "GAP" | "WIP" | "SOLID" | "COUNTER" ;
alias          = identifier ;
```

Blanks and comments may appear between any two tokens. A file contains exactly one plan; nothing but
blanks and comments may follow its closing brace. A `tag:` placed in a `from` block before its first
arrow applies to the position of the block; after an arrow, it is an option of that arrow.

## 5. Meaning

### 5.1 Nodes and identity

A plan is a directed graph. Its **nodes** are techniques; its **edges** are transitions.

- A **reference** names a node: `side_control`, `mount.bottom`.
- Without a side, a reference takes the side given by the vocabulary (§6): `side_control` and
  `side_control.top` are the same node. `mount.top` and `mount.bottom` are two different nodes.
- A **declaration** creates a node under an **alias** and gives it its category: `position x`, or
  `position x = mount.top` to base it on a vocabulary entry with a side. References to an alias
  designate the declared node; writing a different side on an alias is an error.
- An alias may be used before its declaration. Two declarations must not share an alias.
- To place the same technique twice in a plan, each occurrence takes its own alias.

The **name** of a node is, in order: its `name:` property, the vocabulary name of its reference, or
its identifier with underscores turned into spaces and a capital first letter (`club_choke` →
"Club choke").

The **category** of a node is the keyword of its declaration, or the vocabulary category of its
reference. An identifier that is neither declared nor in the vocabulary is a `position`, and a
processor **should** warn about it.

### 5.2 Transitions

| Text                                          | Meaning                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `from A:` then `-> B`                         | a transition from A to B                                           |
| `-> B` with `tag: COUNTER`                    | the opponent counters (kind _counter_)                             |
| `-> B` with `when: "…"` and without `COUNTER` | the opponent reacts (kind _reaction_); the string is the condition |
| `-> B` with neither                           | it works (kind _success_)                                          |
| `leads_to: C` on `-> B`                       | a second transition, from B to C, of kind _success_                |
| `leads_to: FINISH` on `-> B`                  | the transition from A to B ends the fight                          |

A condition always makes a reaction or a counter: a _success_ transition has no condition. An empty
condition (`when: ""`) still makes a reaction.

The same transition (same source, same target) is written once; a processor **should** warn about
later copies and keep the first. A transition written explicitly with `->` takes precedence over one
implied by `leads_to:`. A transition from a node to itself is ignored with a warning.

### 5.3 Tags

| Tag                   | On a declaration or a `from` block              | On an arrow                           |
| --------------------- | ----------------------------------------------- | ------------------------------------- |
| `a_game`              | the node belongs to the main sequence (A-game)  | the target node belongs to the A-game |
| `GAP`, `WIP`, `SOLID` | mastery of the node: gap, in progress, mastered | mastery of the target node            |
| `COUNTER`             | error                                           | the transition is a counter           |
| any other identifier  | a free tag of the node                          | ignored, with a warning               |

Without a mastery tag, a node is _to discover_. If two mastery tags apply to one node, the last one
wins and a processor **should** warn.

### 5.4 Gaps

A node that is not a submission and has no outgoing transition is a **gap**: something the plan does
not answer yet. Gaps are not errors. Tools **should** show them.

## 6. Vocabulary

A vocabulary maps identifiers to techniques. The base vocabulary,
[`vocabulary/base.json`](../vocabulary/base.json), is a JSON array of entries:

```json
{
  "id": "closed_guard",
  "category": "position",
  "side": "bottom",
  "names": { "en": "Closed guard", "fr": "Garde fermée", "pt": "Guarda fechada" },
  "synonyms": []
}
```

- `id` follows the identifier rule and is unique. `names.en` is required; other languages fall back
  to it.
- `side` is optional: it is the default side of references without one.
- `synonyms` are other identifiers that designate the same entry (for example `his_guard` for
  `in_guard`).

A processor **may** use another vocabulary. The meaning of a file depends on the vocabulary only for
names, categories and default sides of references that are not declared.

## 7. Diagnostics

A processor stops at the **first error** and reports it; it **must not** produce a partial graph from
an erroneous file. Warnings do not stop processing.

Every diagnostic **must** carry a stable code, a line and a column (both starting at 1; columns count
UTF-16 code units), and **should** carry a message in the user's language. When a value is missing at
the end of a line (`when:`, `leads_to:`, `=`, `{`, `:`…), the diagnostic points at the word left
alone, not at the next line. Errors are reported in text order.

| Code                                                | Meaning                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| `lex.unexpected_char`                               | a character that cannot start any token                             |
| `lex.unterminated_string`                           | a string without its closing quote on the same line                 |
| `plan.expected`                                     | the file does not start with `plan`                                 |
| `plan.name_unquoted`                                | the plan name is not a string                                       |
| `plan.missing_open`                                 | `{` missing after the plan name                                     |
| `plan.missing_close`                                | `}` missing at the end of the plan                                  |
| `plan.unexpected`                                   | a line that does not start with `from`, a category or `}`           |
| `plan.trailing`                                     | content after the closing brace                                     |
| `ident.reserved_word`                               | a keyword or property used as an identifier                         |
| `ident.reserved_tag`                                | a reserved word used as an identifier                               |
| `ident.accents`                                     | an identifier with accents or non-ASCII letters                     |
| `ident.uppercase`                                   | an identifier with capital letters                                  |
| `ident.leading`                                     | an identifier that does not start with a letter                     |
| `side.invalid`                                      | a side other than `top` or `bottom`                                 |
| `tags.missing`                                      | `tag:` without a tag                                                |
| `tags.missing_after_comma`                          | a comma without a following tag                                     |
| `tags.finish`                                       | `FINISH` used as a tag                                              |
| `decl.missing_name`                                 | a category keyword without an alias                                 |
| `decl.missing_ref`                                  | `=` without a reference                                             |
| `decl.unclosed`                                     | `{` of a declaration without its `}`                                |
| `decl.arrow_property`                               | `when:` or `leads_to:` inside a declaration                         |
| `decl.unknown_property`                             | anything other than `name:`, `detail:`, `tag:` inside a declaration |
| `decl.value_unquoted`                               | `name:` or `detail:` without a string                               |
| `decl.duplicate_name` / `decl.duplicate_detail`     | a property given twice                                              |
| `from.missing_ref`                                  | `from` without a reference                                          |
| `from.missing_colon`                                | `:` missing after `from …`                                          |
| `from.option_without_arrow`                         | `when:` or `leads_to:` before any arrow of the block                |
| `from.unexpected`                                   | something other than an arrow inside a `from` block                 |
| `arrow.missing_target`                              | `->` without a reference                                            |
| `arrow.declaration_property`                        | `name:` or `detail:` on an arrow                                    |
| `arrow.duplicate_when` / `arrow.duplicate_leads_to` | an option given twice on one arrow                                  |
| `arrow.when_unquoted`                               | `when:` without a string                                            |
| `arrow.missing_leads_to`                            | `leads_to:` without a reference or `FINISH`                         |
| `alias.duplicate`                                   | two declarations with the same alias                                |
| `alias.side_conflict`                               | a reference to an alias with another side than declared             |
| `tag.counter_on_node`                               | `COUNTER` on a declaration or a `from` block                        |

| Warning                     | Meaning                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| `warn.unknown_ident`        | an identifier neither declared nor in the vocabulary (it becomes a position) |
| `warn.mastery_conflict`     | two mastery tags on one node                                                 |
| `warn.tag_ignored_on_arrow` | a free tag on an arrow                                                       |
| `warn.self_loop`            | a transition from a node to itself                                           |
| `warn.duplicate_arrow`      | the same transition written twice                                            |

## 8. Writing `.bjj` (informative)

A processor that writes `.bjj` from a graph should produce text that reads back to the same graph,
coordinates aside. The reference implementation writes declarations first (only for what the
vocabulary cannot tell: custom names, mastery, A-game, details, tags, second occurrences), then one
`from` block per node with outgoing transitions, an empty `from` block per gap, two spaces of
indentation and aligned options.

## 9. Conformance

The [conformance suite](../conformance/) lists `.bjj` inputs with their expected results, computed
with the base vocabulary: the graph, warnings (code, line, column) and gaps of valid files; the error
(code, line, column) of invalid ones. A conforming processor produces exactly these results.
Messages are not part of conformance.

## 10. Versions

The notation follows semantic versioning. Before 1.0, a minor version may change the meaning of a
file; every change is listed in the [changelog](../CHANGELOG.md).
