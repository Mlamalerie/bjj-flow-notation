# Changelog

The notation follows semantic versioning. Before 1.0, a minor version may change the meaning of a file.

## 0.1.0 · October 2026

First public draft.

- Grammar: `plan`, declarations by category (`position`, `submission`, `pass`, `defense`,
  `takedown`), `from` blocks, arrows with `when:`, `leads_to:` and `tag:`, sides `.top` and
  `.bottom`, comments.
- Meaning: a condition makes a reaction, `COUNTER` makes a counter, `leads_to: FINISH` ends the fight;
  mastery tags `GAP`, `WIP`, `SOLID`; `a_game`; gaps.
- Base vocabulary: 91 positions and techniques with names in English, French and Portuguese.
- Diagnostics with stable codes and messages in English, French and Portuguese.
- Reference parser and serializer in TypeScript; language-neutral conformance suite.
