# Design notes

Why the `.bjj` notation looks the way it does. Informative, not part of the specification.

## Text first

A game plan is a small graph, but people think about it as sentences: _from mount, if he bridges, I…_.
Text is what you can write in a notebook, paste in a chat, diff in git, print before a competition and
feed to a language model. Every visual tool can draw a graph from text; the reverse needs a format
anyway.

## Few words, real words

`plan`, `from`, `->`, `when:`, `leads_to:`, `tag:`: six things to learn, all ordinary English, all
visible in the first example. No symbols to decode, unlike stenographic notations. Keywords stay in
English so that one file reads the same in Paris, Rio and Tokyo, the way chess moves do; everything a
person writes (names, conditions, comments) can be in any language, and tools translate the
vocabulary names and the error messages.

## Identifiers, not names

`side_control`, not "Side control" or "Cem quilos". Identifiers are stable, language-neutral and easy
to type; the vocabulary turns them into names in each language. A technique that is not in the
vocabulary still works: its identifier becomes its name, and a declaration can give it a category and
a proper name.

## A condition is a reaction

Grappling plans are mostly about what the opponent does. A transition that _just works_ needs no
condition; as soon as you write "when he…", you describe a reaction. Making this a rule (instead of a
third independent field) keeps files short and guarantees that a graph written as text reads back the
same.

## No coordinates, no media

Where a box sits on a screen, a link to a video, private notes: these belong to an app, not to the
game. Leaving them out keeps files portable between tools and readable by people.

## Errors that teach

Most people writing `.bjj` will not be programmers. Every error has a line, a column and a sentence
that says what to write instead (`After when:, the condition goes in quotes: when: "…"`). A missing
value is reported where it is missing, not on the next line. Codes stay stable so that tools can
translate them.

## Prior art and inspiration

Chess notation (algebraic notation, PGN) shows that a sport can be written down compactly and read by
both people and programs. Dance notations (Labanotation) show how hard it is when the body itself must
be described; `.bjj` deliberately stays at the level of positions and decisions, not limbs. Graph
description languages (DOT, Mermaid) show the value of plain-text graphs. If you know of an earlier
grappling notation, please open an issue: it should be cited here.

## Open questions before 1.0

- Several plans in one file, or plans that include others (`use "closed-guard.bjj"`).
- Versioned vocabularies, and how a file says which one it expects.
- Positional context beyond top and bottom (standing, gi or no-gi rules, points).
- Probabilities or success rates on transitions, collected from training.
- A canonical formatting, so that two tools write the same text for the same graph.
