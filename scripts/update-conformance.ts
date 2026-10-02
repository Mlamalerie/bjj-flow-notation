/**
 * Writes the expected result (.json) of every conformance case (.bjj) with the reference parser.
 * Run it after a deliberate change of the notation, then REVIEW THE DIFF before committing: the
 * expected files are the definition of the behaviour, not a snapshot to accept blindly.
 *
 *   bun scripts/update-conformance.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import base from "../vocabulary/base.json" with { type: "json" };
import { createVocabulary, parseNotation, type VocabularyData } from "../src/index.ts";
import { expectedOf } from "../src/conformance.ts";

const vocabulary = createVocabulary(base as VocabularyData[]);
for (const kind of ["valid", "invalid"]) {
  const dir = join("conformance", kind);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".bjj"))) {
    const result = parseNotation(readFileSync(join(dir, file), "utf8"), vocabulary);
    writeFileSync(
      join(dir, file.replace(/\.bjj$/, ".json")),
      `${JSON.stringify(expectedOf(result), null, 2)}\n`,
    );
  }
}
console.log("Expected results written. Review the diff before committing.");
