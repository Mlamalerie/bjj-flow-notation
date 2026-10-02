import type { Locale } from "./messages.ts";
import type { Category, Side, Vocabulary, VocabularyEntry } from "./types.ts";

/** An entry as written in vocabulary/*.json: identifier, category, side, names, synonyms. */
export interface VocabularyData {
  id: string;
  category: Category;
  side?: Side;
  /** Name in each language; English is required, the others fall back to it. */
  names: { en: string } & Partial<Record<Locale, string>>;
  synonyms?: string[];
}

/** Lowercase, no accents, unified spaces: to find a technique from its name. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
}

/**
 * Builds the vocabulary expected by parseNotation and serializeNotation. Names come in the requested
 * language; a name in any language finds its identifier back.
 */
export function createVocabulary(
  data: readonly VocabularyData[],
  { locale = "en" }: { locale?: Locale } = {},
): Vocabulary {
  const byId = new Map<string, VocabularyEntry>();
  const byName = new Map<string, string>();
  for (const { synonyms = [], ...entry } of data) {
    const value: VocabularyEntry = {
      id: entry.id,
      name: entry.names[locale] ?? entry.names.en,
      category: entry.category,
      ...(entry.side ? { side: entry.side } : {}),
    };
    byId.set(entry.id, value);
    for (const synonym of synonyms) if (!byId.has(synonym)) byId.set(synonym, value);
    for (const name of Object.values(entry.names)) {
      const key = `${entry.category}:${normalize(name)}`;
      if (!byName.has(key)) byName.set(key, entry.id);
    }
  }
  return {
    get: (id) => byId.get(id),
    idOf: (name, category) => byName.get(`${category}:${normalize(name)}`),
  };
}
