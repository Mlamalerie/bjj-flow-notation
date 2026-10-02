import { tokenize, type Token } from "./lexer.ts";
import type { DiagnosticCode, Params } from "./messages.ts";
import type { Category, Position, Side, Span } from "./types.ts";

/* ---------- Syntax tree ---------- */

export interface Ref {
  ident: string;
  side?: Side | undefined;
  span: Span;
}

export interface Tag {
  value: string;
  span: Span;
}

export interface Declaration {
  type: "declaration";
  category: Category;
  alias: string;
  aliasSpan: Span;
  ref?: Ref | undefined;
  name?: string | undefined;
  detail?: string | undefined;
  tags: Tag[];
  span: Span;
}

export interface Arrow {
  target: Ref;
  when?: { value: string; span: Span } | undefined;
  leadsTo?: { ref: Ref } | { finish: true; span: Span } | undefined;
  tags: Tag[];
  span: Span;
}

export interface FromBlock {
  type: "from";
  source: Ref;
  tags: Tag[];
  arrows: Arrow[];
  span: Span;
}

export interface PlanAst {
  name: string;
  items: (Declaration | FromBlock)[];
}

/** A mistake in the text: a code, its parameters and where it is. Turned into a Diagnostic. */
export class NotationError extends Error {
  constructor(
    readonly code: DiagnosticCode,
    readonly params: Params,
    readonly span: Span,
  ) {
    super(code);
    this.name = "NotationError";
  }
}

const CATEGORIES: readonly Category[] = ["position", "submission", "pass", "defense", "takedown"];
const IDENT = /^[a-z][a-z0-9_]*$/;

const shown = (token: Token): string =>
  token.type === "string"
    ? `"${token.value}"`
    : token.type === "property"
      ? `${token.value}:`
      : token.value;

/** A badly written identifier without accents or capitals, to suggest the right spelling. */
function suggest(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");
}

/**
 * Reads a .bjj text into its syntax tree. At the first mistake, throws a NotationError with a code,
 * a line and a column: never a raw exception.
 */
export function parseAst(text: string): PlanAst {
  const all = tokenize(text);
  const tokens = all.filter((t) => t.type !== "comment");
  let i = 0;

  const endOfText = (): Span => {
    const last = all.at(-1);
    const pos: Position = last ? last.end : { line: 1, col: 1, offset: 0 };
    return { from: pos, to: pos };
  };
  /** An unreadable token is reported when the parser reaches it: mistakes come in text order. */
  const checked = (token: Token | undefined): Token | undefined => {
    if (token?.type === "invalid") {
      throw new NotationError(
        token.problem ?? "lex.unexpected_char",
        { char: token.value },
        span(token),
      );
    }
    return token;
  };
  const peek = (ahead = 0): Token | undefined => checked(tokens[i + ahead]);
  const next = (): Token | undefined => checked(tokens[i++]);
  const is = (token: Token | undefined, type: Token["type"], value?: string): boolean =>
    token !== undefined && token.type === type && (value === undefined || token.value === value);
  function fail(code: DiagnosticCode, at: Token | Span | undefined, params: Params = {}): never {
    const where = at === undefined ? endOfText() : "type" in at ? span(at) : at;
    throw new NotationError(code, params, where);
  }

  /* plan "Name" { … } */
  const first = next();
  if (!is(first, "keyword", "plan")) fail("plan.expected", first);
  const name = next();
  if (!is(name, "string")) fail("plan.name_unquoted", name);
  const open = next();
  if (!is(open, "punct", "{")) fail("plan.missing_open", blame(name as Token, open));

  const items: (Declaration | FromBlock)[] = [];
  for (;;) {
    const token = peek();
    if (token === undefined) fail("plan.missing_close", undefined, { line: open?.start.line ?? 1 });
    if (is(token, "punct", "}")) {
      i++;
      break;
    }
    if (is(token, "keyword", "from")) items.push(parseFrom());
    else if (token.type === "keyword" && CATEGORIES.includes(token.value as Category)) {
      items.push(parseDeclaration());
    } else {
      fail("plan.unexpected", token, { token: shown(token) });
    }
  }
  const extra = peek();
  if (extra) fail("plan.trailing", extra);
  return { name: name?.value ?? "", items };

  /* ---------- Rules ---------- */

  /**
   * A value missing after "when:", "leads_to:", "="…: if the next token is on another line or is
   * part of the structure, the error points at the word left alone, not at the next line.
   */
  function blame(owner: Token, following: Token | undefined): Token {
    const structural =
      following === undefined ||
      following.type === "property" ||
      following.type === "arrow" ||
      (following.type === "punct" && following.value !== ".");
    return structural || following.start.line !== owner.start.line ? owner : following;
  }

  function identifier(
    token: Token | undefined,
    missing: DiagnosticCode,
    params: Params = {},
  ): string {
    if (
      token === undefined ||
      token.type === "punct" ||
      token.type === "string" ||
      token.type === "arrow"
    ) {
      fail(missing, token, params);
    }
    if (token.type === "keyword" || token.type === "property") {
      fail("ident.reserved_word", token, { word: token.value });
    }
    if (token.type === "reserved") fail("ident.reserved_tag", token, { word: token.value });
    const word = token.value;
    if (!IDENT.test(word)) {
      const better = suggest(word);
      if (/[^ -~]/.test(word)) fail("ident.accents", token, { suggestion: better });
      if (/[A-Z]/.test(word)) fail("ident.uppercase", token, { suggestion: better });
      fail("ident.leading", token, {
        suggestion: better.replace(/^[^a-z]+/, "") || "side_control",
      });
    }
    return word;
  }

  function parseRef(missing: DiagnosticCode, owner?: Token): Ref {
    if (owner && blame(owner, peek()) === owner) fail(missing, owner);
    const head = next();
    const ident = identifier(head, missing);
    let side: Side | undefined;
    let last = head as Token;
    if (is(peek(), "punct", ".")) {
      i++;
      const sideToken = next();
      if (
        !is(sideToken, "ident") ||
        (sideToken?.value !== "top" && sideToken?.value !== "bottom")
      ) {
        fail("side.invalid", sideToken);
      }
      side = (sideToken as Token).value as Side;
      last = sideToken as Token;
    }
    return { ident, side, span: { from: (head as Token).start, to: last.end } };
  }

  function parseTags(after: Token): Tag[] {
    const tags: Tag[] = [];
    let owner = after;
    for (;;) {
      const token = next();
      if (!token || (token.type !== "ident" && token.type !== "reserved")) {
        fail(tags.length === 0 ? "tags.missing" : "tags.missing_after_comma", blame(owner, token));
      }
      if (token.value === "FINISH") fail("tags.finish", token);
      if (token.type === "ident" && !IDENT.test(token.value)) identifier(token, "tags.missing");
      tags.push({ value: token.value, span: span(token) });
      if (!is(peek(), "punct", ",")) return tags;
      owner = next() as Token;
    }
  }

  function parseDeclaration(): Declaration {
    const keyword = next() as Token;
    const category = keyword.value as Category;
    if (blame(keyword, peek()) === keyword) fail("decl.missing_name", keyword, { category });
    const aliasToken = next();
    const alias = identifier(aliasToken, "decl.missing_name", { category });
    let ref: Ref | undefined;
    let end = (aliasToken as Token).end;
    if (is(peek(), "punct", "=")) {
      const equals = next() as Token;
      ref = parseRef("decl.missing_ref", equals);
      end = ref.span.to;
    }
    const declaration: Declaration = {
      type: "declaration",
      category,
      alias,
      aliasSpan: span(aliasToken as Token),
      ref,
      tags: [],
      span: { from: keyword.start, to: end },
    };
    if (is(peek(), "punct", "{")) {
      const brace = next() as Token;
      for (;;) {
        const token = next();
        if (token === undefined)
          fail("decl.unclosed", undefined, { alias, line: brace.start.line });
        if (is(token, "punct", "}")) {
          declaration.span = { from: keyword.start, to: token.end };
          break;
        }
        if (token.type === "property" && (token.value === "when" || token.value === "leads_to")) {
          fail("decl.arrow_property", token, { property: token.value });
        }
        if (token.type !== "property")
          fail("decl.unknown_property", token, { token: shown(token) });
        if (token.value === "tag") {
          declaration.tags.push(...parseTags(token));
          continue;
        }
        const value = next();
        if (!is(value, "string")) {
          fail("decl.value_unquoted", blame(token, value), { property: token.value });
        }
        const key = token.value as "name" | "detail";
        if (declaration[key] !== undefined) {
          fail(key === "name" ? "decl.duplicate_name" : "decl.duplicate_detail", token, { alias });
        }
        declaration[key] = (value as Token).value;
      }
    }
    return declaration;
  }

  function parseFrom(): FromBlock {
    const keyword = next() as Token;
    const source = parseRef("from.missing_ref", keyword);
    const colon = next();
    if (!is(colon, "punct", ":")) {
      // Forgotten at the end of the line: point at the position, not at the next line.
      const sameLine = colon !== undefined && colon.start.line === source.span.to.line;
      fail("from.missing_colon", sameLine ? colon : source.span, {
        ref: `${source.ident}${source.side ? `.${source.side}` : ""}`,
      });
    }
    const block: FromBlock = {
      type: "from",
      source,
      tags: [],
      arrows: [],
      span: { from: keyword.start, to: (colon as Token).end },
    };
    for (;;) {
      const token = peek();
      if (token === undefined || is(token, "punct", "}") || token.type === "keyword") return block;
      if (token.type === "arrow") {
        const arrow = parseArrow();
        block.arrows.push(arrow);
        block.span = { from: block.span.from, to: arrow.span.to };
        continue;
      }
      if (is(token, "property", "tag") && block.arrows.length === 0) {
        i++;
        const tags = parseTags(token);
        block.tags.push(...tags);
        const lastTag = tags.at(-1);
        if (lastTag) block.span = { from: block.span.from, to: lastTag.span.to };
        continue;
      }
      if (token.type === "property") {
        fail("from.option_without_arrow", token, { property: token.value });
      }
      fail("from.unexpected", token, { token: shown(token) });
    }
  }

  function parseArrow(): Arrow {
    const arrowToken = next() as Token;
    const target = parseRef("arrow.missing_target", arrowToken);
    const arrow: Arrow = { target, tags: [], span: { from: arrowToken.start, to: target.span.to } };
    for (;;) {
      const token = peek();
      if (!token || token.type !== "property") return arrow;
      if (token.value === "name" || token.value === "detail") {
        fail("arrow.declaration_property", token, { property: token.value });
      }
      i++;
      if (token.value === "when") {
        if (arrow.when) fail("arrow.duplicate_when", token, { line: arrow.when.span.from.line });
        const value = next();
        if (!is(value, "string")) fail("arrow.when_unquoted", blame(token, value));
        const when = value as Token;
        arrow.when = { value: when.value, span: span(when) };
        arrow.span = { from: arrow.span.from, to: when.end };
      } else if (token.value === "leads_to") {
        if (arrow.leadsTo) fail("arrow.duplicate_leads_to", token);
        if (is(peek(), "reserved", "FINISH")) {
          const finish = next() as Token;
          arrow.leadsTo = { finish: true, span: span(finish) };
          arrow.span = { from: arrow.span.from, to: finish.end };
        } else {
          const ref = parseRef("arrow.missing_leads_to", token);
          arrow.leadsTo = { ref };
          arrow.span = { from: arrow.span.from, to: ref.span.to };
        }
      } else {
        const tags = parseTags(token);
        arrow.tags.push(...tags);
        const lastTag = tags.at(-1);
        if (lastTag) arrow.span = { from: arrow.span.from, to: lastTag.span.to };
      }
    }
  }
}

function span(token: Token): Span {
  return { from: token.start, to: token.end };
}
