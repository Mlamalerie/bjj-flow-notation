import { describe, expect, it } from "vitest";
import base from "../vocabulary/base.json" with { type: "json" };
import { parseNotation, serializeNotation } from "./index.ts";
import { createVocabulary, type VocabularyData } from "./vocabulary.ts";

const vocabulary = createVocabulary(base as VocabularyData[]);

describe("vocabulaire de base", () => {
  it("donne nom français, catégorie et côté", () => {
    expect(vocabulary.get("closed_guard")).toEqual({
      id: "closed_guard",
      name: "Garde fermée",
      category: "position",
      side: "bottom",
    });
    expect(vocabulary.idOf("garde fermee", "position")).toBe("closed_guard");
  });

  it("lit les synonymes des exemples (his_guard → Dans sa garde)", () => {
    expect(vocabulary.get("his_guard")?.name).toBe("Dans sa garde");
  });

  it("aller-retour avec le vrai vocabulaire", () => {
    const first = parseNotation(
      `plan "Mount" {
  position mount { tag: SOLID }
  from mount:
    -> americana   leads_to: FINISH
    -> back        when: "il se tourne"
}`,
      vocabulary,
    );
    if (!first.ok) throw new Error(first.error.message);
    const written = serializeNotation(
      { ...first.graph, nodes: first.graph.nodes.map((n) => ({ ...n, id: n.key })) },
      vocabulary,
    );
    const second = parseNotation(written.text, vocabulary);
    expect(second.ok && second.graph.edges).toEqual(first.graph.edges);
  });
});
