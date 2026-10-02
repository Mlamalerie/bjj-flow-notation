import type { Category, Side, Vocabulary, VocabularyEntry } from "./types.ts";

/** Une entrée telle qu'écrite dans vocabulary/*.json : identifiant, nom, catégorie, côté, synonymes. */
export interface VocabularyData {
  id: string;
  name: string;
  category: Category;
  side?: Side;
  synonyms?: string[];
}

/** Minuscules, sans accents, espaces unifiés : pour retrouver une technique d'après son nom. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
}

/** Construit le vocabulaire attendu par parseNotation et serializeNotation. */
export function createVocabulary(data: readonly VocabularyData[]): Vocabulary {
  const byId = new Map<string, VocabularyEntry>();
  const byName = new Map<string, string>();
  for (const { synonyms = [], ...entry } of data) {
    const value: VocabularyEntry = {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      ...(entry.side ? { side: entry.side } : {}),
    };
    byId.set(entry.id, value);
    for (const synonym of synonyms) if (!byId.has(synonym)) byId.set(synonym, value);
    const key = `${entry.category}:${normalize(entry.name)}`;
    if (!byName.has(key)) byName.set(key, entry.id);
  }
  return {
    get: (id) => byId.get(id),
    idOf: (name, category) => byName.get(`${category}:${normalize(name)}`),
  };
}
