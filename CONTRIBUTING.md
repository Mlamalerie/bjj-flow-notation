# Contributing

Thank you for helping jiu-jitsu get a common notation. Contributions in English, French or Portuguese
are all welcome.

## Propose a technique for the vocabulary

Open an issue with the **Vocabulary** template, or a pull request that edits
[`vocabulary/base.json`](vocabulary/base.json):

- `id`: lowercase English words joined by underscores (`single_leg_x`), unique.
- `category`: `position`, `submission`, `pass` (sweeps included), `defense` or `takedown`.
- `side`: `top` or `bottom` for positions that have one.
- `names`: the usual name in English, French and Portuguese, as people say it on the mat (many stay
  in English, like "Knee shield").

## Propose a change to the notation

1. Open an issue with the **Specification change** template: the problem first, then a proposal and
   an example of `.bjj` before and after.
2. Once discussed, a pull request changes, together: the English specification
   (`spec/bjj-notation.md`), its translations, the reference parser (`src/`), and the conformance
   cases (`conformance/`).
3. Every change is listed in [`CHANGELOG.md`](CHANGELOG.md).

## Work on the reference parser

```bash
bun install
bun run test        # unit tests, conformance suite, examples of the docs
bun run typecheck
```

- No runtime dependency, TypeScript strict.
- A new diagnostic gets a stable code and a message in every language of `src/messages.ts`.
- After a deliberate change of behaviour, `bun scripts/update-conformance.ts` rewrites the expected
  results: review the diff line by line before committing.

## Translate

Translations of the README and of the specification live next to the English file
(`README.pt.md`, `spec/bjj-notation.pt.md`). The English specification is normative; when it
changes, the translations follow in the same pull request or in an issue marked _translation_.
