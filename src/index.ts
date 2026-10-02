/**
 * Notation .bjj : lire (texte → graphe), écrire (graphe → texte), colorer (jetons).
 * Spécification : SPEC.md. Sans dépendance.
 */
export { humanize, parseNotation } from "./graph.ts";
export { tokenize, type Token, type TokenType } from "./lexer.ts";
export {
  serializeNotation,
  slugIdent,
  type SerializeEdge,
  type SerializeInput,
  type SerializeNode,
} from "./serialize.ts";
export type * from "./types.ts";
export { createVocabulary, type VocabularyData } from "./vocabulary.ts";
