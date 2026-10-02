import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_CODES, formatMessage, LOCALES } from "./messages.ts";
import { parseNotation } from "./index.ts";

const empty = { get: () => undefined, idOf: () => undefined };

describe("diagnostic messages", () => {
  it("every code has a message in every language", () => {
    const params = {
      char: "@",
      line: 3,
      token: "x",
      word: "from",
      suggestion: "x",
      category: "position",
      alias: "x",
      property: "when",
      ref: "mount",
      side: "top",
      ident: "x",
      name: "X",
      kept: "gap",
      dropped: "wip",
      tag: "x",
    };
    for (const locale of LOCALES) {
      for (const code of DIAGNOSTIC_CODES) {
        const message = formatMessage(code, params, locale);
        expect(message.length, `${locale} ${code}`).toBeGreaterThan(10);
        expect(message, `${locale} ${code}`).not.toMatch(/undefined|\$\{/);
      }
    }
  });

  it("the code stays the same, the message follows the language", () => {
    const text = 'plan "A" {\n  from mount\n}';
    const results = LOCALES.map((locale) => parseNotation(text, empty, { locale }));
    const errors = results.map((r) => (r.ok ? null : r.error));
    expect(new Set(errors.map((e) => e?.code))).toEqual(new Set(["from.missing_colon"]));
    expect(errors.map((e) => e?.message)).toEqual([
      "Missing : after “from mount”.",
      "Il manque : après « from mount ».",
      "Falta : depois de “from mount”.",
    ]);
    expect(errors[0]?.span.from).toMatchObject({ line: 2, col: 8 });
  });

  it("English by default", () => {
    const result = parseNotation("", empty);
    expect(!result.ok && result.error.message).toBe('A .bjj file starts with plan "Plan name" {');
  });
});
