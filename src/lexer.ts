import type { DiagnosticCode } from "./messages.ts";
import type { Position } from "./types.ts";

export type TokenType =
  | "keyword"
  | "property"
  | "arrow"
  | "ident"
  | "reserved"
  | "string"
  | "punct"
  | "comment"
  | "invalid";

export interface Token {
  type: TokenType;
  /** Useful value: a string without its quotes, a property name without its colon. */
  value: string;
  start: Position;
  end: Position;
  /** For an "invalid" token: why. */
  problem?: Extract<DiagnosticCode, `lex.${string}`>;
}

export const KEYWORDS = new Set([
  "plan",
  "position",
  "submission",
  "pass",
  "defense",
  "takedown",
  "from",
]);
export const PROPERTIES = new Set(["when", "leads_to", "tag", "name", "detail"]);
export const RESERVED = new Set(["FINISH", "GAP", "WIP", "SOLID", "COUNTER"]);
const PUNCT = new Set(["{", "}", "=", ",", ".", ":"]);

const IDENT_START = /[\p{L}\p{N}_]/u;
const IDENT_PART = /[\p{L}\p{N}_]/u;

/**
 * Splits the text into tokens. Never throws: an unknown character or an unclosed string become an
 * "invalid" token, which the parser turns into a diagnostic. Also used for syntax colouring, even
 * when the text is wrong.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let col = 1;
  const here = (): Position => ({ line, col, offset });
  const advance = (count = 1) => {
    for (let i = 0; i < count; i++) {
      if (text[offset] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      offset++;
    }
  };

  while (offset < text.length) {
    const ch = text[offset] ?? "";
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      advance();
      continue;
    }
    const start = here();

    if (ch === "#") {
      const end = text.indexOf("\n", offset);
      const stop = end === -1 ? text.length : end;
      const value = text.slice(offset, stop);
      advance(stop - offset);
      tokens.push({ type: "comment", value, start, end: here() });
      continue;
    }

    if (ch === '"') {
      advance();
      let value = "";
      let closed = false;
      while (offset < text.length) {
        const c = text[offset] ?? "";
        if (c === "\n") break;
        if (c === "\\" && (text[offset + 1] === '"' || text[offset + 1] === "\\")) {
          value += text[offset + 1];
          advance(2);
          continue;
        }
        advance();
        if (c === '"') {
          closed = true;
          break;
        }
        value += c;
      }
      tokens.push(
        closed
          ? { type: "string", value, start, end: here() }
          : { type: "invalid", value, start, end: here(), problem: "lex.unterminated_string" },
      );
      continue;
    }

    if (ch === "-" && text[offset + 1] === ">") {
      advance(2);
      tokens.push({ type: "arrow", value: "->", start, end: here() });
      continue;
    }

    if (IDENT_START.test(ch)) {
      let word = "";
      while (offset < text.length && IDENT_PART.test(text[offset] ?? "")) {
        word += text[offset];
        advance();
      }
      if (PROPERTIES.has(word) && text[offset] === ":") {
        advance();
        tokens.push({ type: "property", value: word, start, end: here() });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", value: word, start, end: here() });
      } else if (RESERVED.has(word)) {
        tokens.push({ type: "reserved", value: word, start, end: here() });
      } else {
        tokens.push({ type: "ident", value: word, start, end: here() });
      }
      continue;
    }

    if (PUNCT.has(ch)) {
      advance();
      tokens.push({ type: "punct", value: ch, start, end: here() });
      continue;
    }

    advance();
    tokens.push({ type: "invalid", value: ch, start, end: here(), problem: "lex.unexpected_char" });
  }
  return tokens;
}
