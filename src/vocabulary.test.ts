import { describe, expect, it } from "vitest";
import base from "../vocabulary/base.json" with { type: "json" };
import { parseNotation, serializeNotation } from "./index.ts";
import { createVocabulary, type VocabularyData } from "./vocabulary.ts";

const data = base as VocabularyData[];

describe("base vocabulary", () => {
  it("every entry has a unique id and a name in English, French and Portuguese", () => {
    expect(new Set(data.map((e) => e.id)).size).toBe(data.length);
    for (const entry of data) {
      expect(entry.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(entry.names.en && entry.names.fr && entry.names.pt, entry.id).toBeTruthy();
    }
  });

  it("gives the name in the requested language, category and side", () => {
    expect(createVocabulary(data).get("closed_guard")).toEqual({
      id: "closed_guard",
      name: "Closed guard",
      category: "position",
      side: "bottom",
    });
    expect(createVocabulary(data, { locale: "fr" }).get("closed_guard")?.name).toBe("Garde fermée");
    expect(createVocabulary(data, { locale: "pt" }).get("closed_guard")?.name).toBe(
      "Guarda fechada",
    );
  });

  it("finds an identifier from a name in any language", () => {
    const vocabulary = createVocabulary(data);
    expect(vocabulary.idOf("garde fermee", "position")).toBe("closed_guard");
    expect(vocabulary.idOf("Guarda fechada", "position")).toBe("closed_guard");
    expect(vocabulary.idOf("Mata-leão", "submission")).toBe("rear_naked_choke");
  });

  it("reads the synonyms used in the examples (his_guard → in_guard)", () => {
    expect(createVocabulary(data).get("his_guard")?.id).toBe("in_guard");
  });

  it("round trip with the real vocabulary, in Portuguese", () => {
    const vocabulary = createVocabulary(data, { locale: "pt" });
    const first = parseNotation(
      `plan "Montada" {
  position mount { tag: SOLID }
  from mount:
    -> americana   leads_to: FINISH
    -> back        when: "ele vira de lado"
}`,
      vocabulary,
      { locale: "pt" },
    );
    if (!first.ok) throw new Error(first.error.message);
    expect(first.graph.nodes.map((n) => n.name)).toEqual([
      "Montada",
      "Americana",
      "Pegada nas costas",
    ]);
    const written = serializeNotation(
      { ...first.graph, nodes: first.graph.nodes.map((n) => ({ ...n, id: n.key })) },
      vocabulary,
    );
    const second = parseNotation(written.text, vocabulary);
    expect(second.ok && second.graph.edges).toEqual(first.graph.edges);
  });
});
