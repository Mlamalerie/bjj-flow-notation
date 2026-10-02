import { tokenize, type Token } from "./lexer.ts";
import type { Category, Diagnostic, Position, Side, Span } from "./types.ts";

/* ---------- Arbre de syntaxe ---------- */

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

export class NotationError extends Error {
  readonly diagnostic: Diagnostic;
  constructor(message: string, span: Span) {
    super(message);
    this.name = "NotationError";
    this.diagnostic = { severity: "error", message, span };
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

/** Version sans accents ni majuscules d'un identifiant mal écrit, pour la suggestion. */
function suggest(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");
}

/**
 * Lit un texte .bjj et renvoie son arbre de syntaxe. À la première faute, lève une NotationError
 * avec ligne, colonne et une phrase en français : jamais d'exception brute.
 */
export function parseAst(text: string): PlanAst {
  const all = tokenize(text);
  const invalid = all.find((t) => t.type === "invalid");
  if (invalid) throw new NotationError(invalid.problem ?? "Texte illisible.", span(invalid));
  const tokens = all.filter((t) => t.type !== "comment");
  let i = 0;

  const endOfText = (): Span => {
    const last = all.at(-1);
    const pos: Position = last ? last.end : { line: 1, col: 1, offset: 0 };
    return { from: pos, to: pos };
  };
  const peek = (ahead = 0): Token | undefined => tokens[i + ahead];
  const next = (): Token | undefined => tokens[i++];
  const is = (token: Token | undefined, type: Token["type"], value?: string) =>
    token !== undefined && token.type === type && (value === undefined || token.value === value);
  function fail(message: string, at: Token | undefined): never {
    throw new NotationError(message, at ? span(at) : endOfText());
  }

  /* plan "Nom" { … } */
  const first = next();
  if (!is(first, "keyword", "plan")) {
    fail('Un fichier .bjj commence par plan "Nom du plan" {', first);
  }
  const name = next();
  if (!is(name, "string")) {
    fail('Le nom du plan s\'écrit entre guillemets : plan "A-game" {', name);
  }
  const open = next();
  if (!is(open, "punct", "{")) fail("Il manque { après le nom du plan.", open);

  const items: (Declaration | FromBlock)[] = [];
  for (;;) {
    const token = peek();
    if (token === undefined) {
      fail(`Il manque } pour fermer le plan (ouvert ligne ${open?.start.line ?? 1}).`, undefined);
    }
    if (is(token, "punct", "}")) {
      i++;
      break;
    }
    if (is(token, "keyword", "from")) items.push(parseFrom());
    else if (token && token.type === "keyword" && CATEGORIES.includes(token.value as Category)) {
      items.push(parseDeclaration());
    } else {
      fail(
        `« ${token ? shown(token) : ""} » inattendu : une ligne commence par from, position, submission, pass, defense, takedown ou }.`,
        token,
      );
    }
  }
  const extra = peek();
  if (extra) fail("Rien n'est attendu après la fin du plan.", extra);
  return { name: name?.value ?? "", items };

  /* ---------- Règles ---------- */

  /**
   * Valeur absente après « when: », « leads_to: », « = »… : si le jeton suivant est d'une autre
   * ligne ou fait partie de la structure, l'erreur pointe le mot resté seul, pas la ligne d'après.
   */
  function blame(owner: Token, next: Token | undefined): Token {
    const structural =
      next === undefined ||
      next.type === "property" ||
      next.type === "arrow" ||
      (next.type === "punct" && next.value !== ".");
    return structural || next.start.line !== owner.start.line ? owner : next;
  }

  function identifier(token: Token | undefined, missing: string): string {
    if (token === undefined || token.type === "punct" || token.type === "string") {
      fail(missing, token);
    }
    if (token?.type === "keyword" || token?.type === "property") {
      fail(`« ${token.value} » est un mot réservé de la notation.`, token);
    }
    if (token?.type === "reserved") {
      fail(`« ${token.value} » est une étiquette réservée, pas un nom de technique.`, token);
    }
    if (token?.type === "arrow") fail(missing, token);
    const word = token?.value ?? "";
    if (!IDENT.test(word)) {
      const better = suggest(word);
      fail(
        /[^ -~]/.test(word)
          ? `Les identifiants s'écrivent sans accents : ${better}.`
          : /[A-Z]/.test(word)
            ? `Les identifiants s'écrivent en minuscules : ${better}.`
            : `Un identifiant commence par une lettre : ${better.replace(/^[^a-z]+/, "") || "side_control"}.`,
        token,
      );
    }
    return word;
  }

  function parseRef(missing: string, owner?: Token): Ref {
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
        fail("Après le point, le côté : .top (dessus) ou .bottom (dessous).", sideToken);
      }
      side = sideToken?.value;
      last = sideToken;
    }
    return { ident, side, span: { from: (head as Token).start, to: last.end } };
  }

  function parseTags(after: Token): Tag[] {
    const tags: Tag[] = [];
    let owner = after;
    for (;;) {
      const token = next();
      if (!token || (token.type !== "ident" && token.type !== "reserved")) {
        fail(
          tags.length === 0
            ? "Après tag:, au moins une étiquette : tag: a_game."
            : "Après la virgule, une autre étiquette : tag: a_game, GAP.",
          blame(owner, token),
        );
      }
      const t = token;
      if (t.value === "FINISH") fail("FINISH s'écrit après leads_to:, pas dans tag:.", t);
      if (t.type === "ident" && !IDENT.test(t.value)) identifier(t, "");
      tags.push({ value: t.value, span: span(t) });
      if (!is(peek(), "punct", ",")) return tags;
      owner = next() as Token;
    }
  }

  function parseDeclaration(): Declaration {
    const keyword = next() as Token;
    const category = keyword.value as Category;
    if (blame(keyword, peek()) === keyword) {
      fail(`Il manque le nom après « ${category} » : ${category} side_control.`, keyword);
    }
    const aliasToken = next();
    const alias = identifier(
      aliasToken,
      `Il manque le nom après « ${category} » : ${category} side_control.`,
    );
    let ref: Ref | undefined;
    let end = (aliasToken as Token).end;
    if (is(peek(), "punct", "=")) {
      const equals = next() as Token;
      ref = parseRef(
        "Après =, écris un identifiant du vocabulaire, par exemple side_control.",
        equals,
      );
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
        if (token === undefined) {
          fail(
            `Il manque } pour fermer « ${alias} » (ouvert ligne ${brace.start.line}).`,
            undefined,
          );
        }
        const t = token;
        if (is(t, "punct", "}")) {
          declaration.span = { from: keyword.start, to: t.end };
          break;
        }
        if (t.type !== "property" || t.value === "when" || t.value === "leads_to") {
          fail(
            t.type === "property"
              ? `${t.value}: se place sous une flèche ->, pas dans une déclaration.`
              : `« ${shown(t)} » : dans { }, on écrit name:, detail: ou tag:.`,
            t,
          );
        }
        if (t.value === "tag") {
          declaration.tags.push(...parseTags(t));
          continue;
        }
        const value = next();
        if (!is(value, "string")) {
          fail(
            `Après ${t.value}:, le texte s'écrit entre guillemets : ${t.value}: "…".`,
            blame(t, value),
          );
        }
        if (declaration[t.value as "name" | "detail"] !== undefined) {
          fail(`« ${alias} » a déjà un ${t.value === "name" ? "nom" : "détail"}.`, t);
        }
        declaration[t.value as "name" | "detail"] = value?.value;
      }
    }
    return declaration;
  }

  function parseFrom(): FromBlock {
    const keyword = next() as Token;
    const source = parseRef("Il manque la position après from : from side_control:", keyword);
    const colon = next();
    if (!is(colon, "punct", ":")) {
      fail(
        `Il manque : après « from ${source.ident}${source.side ? `.${source.side}` : ""} ».`,
        colon ?? undefined,
      );
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
        fail(`${token.value}: se place sous une flèche -> .`, token);
      }
      fail(`« ${shown(token)} » inattendu : une flèche commence par ->.`, token);
    }
  }

  function parseArrow(): Arrow {
    const arrowToken = next() as Token;
    const target = parseRef("Il manque la technique après -> : -> knee_slice", arrowToken);
    const arrow: Arrow = { target, tags: [], span: { from: arrowToken.start, to: target.span.to } };
    for (;;) {
      const token = peek();
      if (!token || token.type !== "property") return arrow;
      if (token.value === "name" || token.value === "detail") {
        fail(
          `${token.value}: se place dans la déclaration de la technique, pas sur une flèche.`,
          token,
        );
      }
      i++;
      if (token.value === "when") {
        if (arrow.when)
          fail(`Cette flèche a déjà une condition (ligne ${arrow.when.span.from.line}).`, token);
        const value = next();
        if (!is(value, "string")) {
          fail(
            'Après when:, la condition s\'écrit entre guillemets : when: "il tend le bras".',
            blame(token, value),
          );
        }
        arrow.when = { value: value?.value ?? "", span: span(value as Token) };
        arrow.span = { from: arrow.span.from, to: (value as Token).end };
      } else if (token.value === "leads_to") {
        if (arrow.leadsTo) fail("Cette flèche a déjà un leads_to:.", token);
        if (is(peek(), "reserved", "FINISH")) {
          const finish = next() as Token;
          arrow.leadsTo = { finish: true, span: span(finish) };
          arrow.span = { from: arrow.span.from, to: finish.end };
        } else {
          const ref = parseRef("Après leads_to:, une position ou FINISH.", token);
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
