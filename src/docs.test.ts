import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import base from "../vocabulary/base.json" with { type: "json" };
import { createVocabulary, parseNotation, type VocabularyData } from "./index.ts";

/** Every example shown to people must read without error or unknown technique. */
const vocabulary = createVocabulary(base as VocabularyData[]);
const root = join(import.meta.dirname, "..");

const blocks = (file: string) =>
  [...readFileSync(join(root, file), "utf8").matchAll(/```bjj\n([\s\S]*?)```/g)].map(
    (m) => m[1] ?? "",
  );

const sources: [string, string][] = [
  ...["README.md", "README.fr.md", "README.pt.md"].flatMap((f) =>
    blocks(f).map((text, i): [string, string] => [`${f} #${i + 1}`, text]),
  ),
  ...readdirSync(join(root, "spec"))
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) =>
      blocks(join("spec", f)).map((text, i): [string, string] => [`spec/${f} #${i + 1}`, text]),
    ),
  ...readdirSync(join(root, "examples")).map((f): [string, string] => [
    `examples/${f}`,
    readFileSync(join(root, "examples", f), "utf8"),
  ]),
];

describe("examples in the documentation", () => {
  it("there are examples to check", () => {
    expect(sources.length).toBeGreaterThanOrEqual(9);
  });
  for (const [where, text] of sources) {
    it(where, () => {
      const result = parseNotation(text, vocabulary);
      if (!result.ok) {
        throw new Error(
          `${result.error.span.from.line}:${result.error.span.from.col} ${result.error.message}`,
        );
      }
      expect(result.warnings.map((w) => w.message)).toEqual([]);
    });
  }
});
