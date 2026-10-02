import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import base from "../vocabulary/base.json" with { type: "json" };
import { expectedOf } from "./conformance.ts";
import { createVocabulary, parseNotation, type VocabularyData } from "./index.ts";

const vocabulary = createVocabulary(base as VocabularyData[]);
const root = join(import.meta.dirname, "..", "conformance");

for (const kind of ["valid", "invalid"] as const) {
  const dir = join(root, kind);
  const cases = readdirSync(dir).filter((f) => f.endsWith(".bjj"));
  describe(`conformance: ${kind}`, () => {
    for (const file of cases)
      it(file, () => {
        const text = readFileSync(join(dir, file), "utf8");
        const expected: unknown = JSON.parse(
          readFileSync(join(dir, file.replace(/\.bjj$/, ".json")), "utf8"),
        );
        const result = parseNotation(text, vocabulary);
        expect(result.ok).toBe(kind === "valid");
        expect(expectedOf(result)).toEqual(expected);
      });
  });
}
