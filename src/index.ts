/**
 * The .bjj notation: read (text → graph), write (graph → text), colour (tokens), in English, French
 * or Portuguese. Specification: spec/bjj-notation.md in the bjj-notation repository. No dependency.
 */
export { humanize, parseNotation } from "./graph.ts";
export { tokenize, type Token, type TokenType } from "./lexer.ts";
export {
  DIAGNOSTIC_CODES,
  formatMessage,
  LOCALES,
  type DiagnosticCode,
  type Locale,
  type Params,
} from "./messages.ts";
export {
  serializeNotation,
  slugIdent,
  type SerializeEdge,
  type SerializeInput,
  type SerializeNode,
} from "./serialize.ts";
export type * from "./types.ts";
export { createVocabulary, type VocabularyData } from "./vocabulary.ts";
