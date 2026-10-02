# The `.bjj` notation

**Write Brazilian jiu-jitsu down.** Chess has had a notation for centuries; grappling never had a
common one. `.bjj` describes your positions, your transitions and your opponent's reactions in plain
text you can read at a glance, keep in git and share with your coach.

[Français](README.fr.md) · [Português](README.pt.md)

```bjj
plan "Mount A-game" {

  position mount { tag: a_game, SOLID }

  from mount:
    -> americana      leads_to: FINISH
    -> armbar         when: "he pushes my chest"
                      leads_to: FINISH
    -> back           when: "he turns to his side"
    -> his_guard.top  tag: COUNTER
                      when: "he bridges"

  from dogfight:
    # nothing planned here yet
    tag: GAP
}
```

Read it aloud: _from mount, I go for the americana, which finishes. If he pushes my chest, armbar. If
he turns to his side, I take the back. If he bridges, he counters and I end up in his guard. From the
dogfight, I have nothing yet: that is a gap._

## Why

- **Readable by people.** Six words to learn, one line per option. No symbols to decode.
- **Readable by machines.** A strict grammar, a reference parser, a test suite any implementation can
  run. Tools and AI models read and write it without guessing.
- **Yours.** Plain text: no account, no lock-in. It outlives any app, including the one it was born in.
- **International.** Keywords and identifiers are short English words, like `from` or `side_control`;
  names, conditions and error messages come in English, French and Portuguese.

## What is in this repository

| Path                                           | What                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`spec/bjj-notation.md`](spec/bjj-notation.md) | The specification (normative, English). [Français](spec/bjj-notation.fr.md) · [Português](spec/bjj-notation.pt.md) |
| [`spec/RATIONALE.md`](spec/RATIONALE.md)       | Why the notation looks the way it does, and the open questions for 1.0                                             |
| [`vocabulary/base.json`](vocabulary/base.json) | 91 positions and techniques, with names in English, French and Portuguese                                          |
| [`conformance/`](conformance/)                 | Language-neutral test cases: `.bjj` inputs and their expected results                                              |
| [`src/`](src/)                                 | The reference implementation, TypeScript, no runtime dependency                                                    |
| [`examples/`](examples/)                       | Complete plans to read and copy                                                                                    |

## Use the reference parser

```ts
import { createVocabulary, parseNotation, serializeNotation } from "bjj-notation";
import base from "bjj-notation/vocabulary/base.json" with { type: "json" };

const vocabulary = createVocabulary(base, { locale: "en" }); // or "fr", "pt"
const result = parseNotation(text, vocabulary, { locale: "en" });

if (result.ok) {
  result.graph; // { name, nodes, edges }
  result.warnings; // unknown technique, ignored tag… each with a code and a position
  result.gaps; // positions with no way out
} else {
  result.error; // { code: "from.missing_colon", message, span: { from: { line, col } } }
}

const { text } = serializeNotation(graph, vocabulary); // graph → .bjj, lossless
```

Every diagnostic has a stable `code` (for tools) and a `message` in the requested language (for
people). The parser never throws on bad input.

## Implement it in another language

The [conformance suite](conformance/) is the contract: for each `.bjj` input, it gives the expected
graph, warnings and gaps, or the expected error code with its line and column. An implementation that
passes all cases reads the notation exactly like the reference. A Python package is planned once the
specification reaches 1.0; contributions in other languages are welcome.

## Contribute

A missing position? A keyword that could be clearer? Open an issue: every version of the
specification is discussed in public. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

```bash
bun install
bun run test        # unit tests and the conformance suite
bun run typecheck
```

## Status

Version **0.1** (October 2026): first public draft. The notation may still change before 1.0; every
change is listed in the [changelog](CHANGELOG.md).

## License

- Specification (`spec/`): [CC BY 4.0](LICENSE-SPEC.md).
- Code (`src/`), vocabulary and conformance suite: [MIT](LICENSE).

The notation was born in Plan B, a game plan editor for jiu-jitsu, but belongs to no app: any tool,
any coach can use it.
