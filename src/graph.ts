import { formatMessage, type DiagnosticCode, type Locale, type Params } from "./messages.ts";
import {
  NotationError,
  parseAst,
  type Declaration,
  type PlanAst,
  type Ref,
  type Tag,
} from "./parser.ts";
import type {
  Diagnostic,
  LineRange,
  Mastery,
  NotationEdge,
  NotationNode,
  ParseOptions,
  ParseResult,
  Side,
  Span,
  Vocabulary,
} from "./types.ts";

const MASTERY_TAGS: Record<string, Mastery> = { GAP: "gap", WIP: "wip", SOLID: "solid" };

/** `choke_du_club` → "Choke du club": the name of a technique outside the vocabulary. */
export function humanize(ident: string): string {
  const words = ident.replace(/_+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const diagnostic = (
  severity: Diagnostic["severity"],
  code: DiagnosticCode,
  params: Params,
  span: Span,
  locale: Locale,
): Diagnostic => ({ severity, code, params, message: formatMessage(code, params, locale), span });

/**
 * Reads a .bjj text into a graph. Never throws: a mistake gives `{ ok: false, error }` with a code, a
 * line, a column and a message in the requested language (English by default).
 */
export function parseNotation(
  text: string,
  vocabulary: Vocabulary,
  { locale = "en" }: ParseOptions = {},
): ParseResult {
  try {
    return build(parseAst(text), vocabulary, locale);
  } catch (error) {
    if (error instanceof NotationError) {
      return {
        ok: false,
        error: diagnostic("error", error.code, error.params, error.span, locale),
      };
    }
    throw error;
  }
}

function build(ast: PlanAst, vocabulary: Vocabulary, locale: Locale): ParseResult {
  const warnings: Diagnostic[] = [];
  const warn = (code: DiagnosticCode, params: Params, span: Span) =>
    warnings.push(diagnostic("warning", code, params, span, locale));
  const nodes = new Map<string, NotationNode>();
  const lines: Record<string, LineRange[]> = {};
  const mentions: Record<string, LineRange[]> = {};
  const firstLine = new Map<string, number>();
  const fromLine = new Map<string, number>();
  const unknown = new Set<string>();
  const edges = new Map<string, NotationEdge & { explicit: boolean }>();

  const addLines = (key: string, span: Span) =>
    (lines[key] ??= []).push({ start: span.from.line, end: span.to.line });
  const mention = (key: string, line: number) => {
    if (!firstLine.has(key)) firstLine.set(key, line);
  };

  /* Aliases first: they can be used before their declaration. */
  const aliases = new Map<string, { declaration: Declaration; side: Side | undefined }>();
  for (const item of ast.items) {
    if (item.type !== "declaration") continue;
    const previous = aliases.get(item.alias);
    if (previous) {
      throw new NotationError(
        "alias.duplicate",
        { alias: item.alias, line: previous.declaration.span.from.line },
        item.aliasSpan,
      );
    }
    const side = item.ref?.side ?? vocabulary.get(item.ref?.ident ?? item.alias)?.side;
    aliases.set(item.alias, { declaration: item, side });
  }

  const declare = (alias: string): NotationNode => {
    const existing = nodes.get(alias);
    if (existing) return existing;
    const found = aliases.get(alias);
    if (!found) throw new Error(`unknown alias ${alias}`);
    const { declaration, side } = found;
    const refIdent = declaration.ref?.ident ?? alias;
    const entry = vocabulary.get(refIdent);
    const node: NotationNode = {
      key: alias,
      name: declaration.name ?? entry?.name ?? humanize(refIdent),
      category: declaration.category,
      side,
      mastery: "discover",
      aGame: false,
      tags: [],
      ...(declaration.detail !== undefined ? { detail: declaration.detail } : {}),
    };
    nodes.set(alias, node);
    return node;
  };

  const resolve = (ref: Ref): string => {
    const alias = aliases.get(ref.ident);
    if (alias) {
      if (ref.side && ref.side !== alias.side) {
        throw new NotationError(
          "alias.side_conflict",
          { alias: ref.ident, side: alias.side ?? "none", line: alias.declaration.span.from.line },
          ref.span,
        );
      }
      declare(ref.ident);
      mention(ref.ident, ref.span.from.line);
      return ref.ident;
    }
    const entry = vocabulary.get(ref.ident);
    const side = ref.side ?? entry?.side;
    const key = side ? `${ref.ident}.${side}` : ref.ident;
    if (!nodes.has(key)) {
      if (!entry && !unknown.has(ref.ident)) {
        unknown.add(ref.ident);
        warn("warn.unknown_ident", { ident: ref.ident, name: humanize(ref.ident) }, ref.span);
      }
      nodes.set(key, {
        key,
        name: entry?.name ?? humanize(ref.ident),
        category: entry?.category ?? "position",
        side,
        mastery: "discover",
        aGame: false,
        tags: [],
      });
    }
    mention(key, ref.span.from.line);
    return key;
  };

  const applyTags = (node: NotationNode, tags: Tag[], onArrow: boolean) => {
    for (const tag of tags) {
      const mastery = MASTERY_TAGS[tag.value];
      if (tag.value === "a_game") node.aGame = true;
      else if (mastery) {
        if (node.mastery !== "discover" && node.mastery !== mastery) {
          warn(
            "warn.mastery_conflict",
            { name: node.name, kept: mastery, dropped: node.mastery },
            tag.span,
          );
        }
        node.mastery = mastery;
      } else if (tag.value === "COUNTER") {
        throw new NotationError("tag.counter_on_node", {}, tag.span);
      } else if (onArrow) {
        warn("warn.tag_ignored_on_arrow", { tag: tag.value }, tag.span);
      } else if (!node.tags.includes(tag.value)) {
        node.tags.push(tag.value);
      }
    }
  };

  const addEdge = (edge: NotationEdge, explicit: boolean, span: Span) => {
    if (edge.source === edge.target) {
      warn("warn.self_loop", {}, span);
      return;
    }
    const id = `${edge.source}→${edge.target}`;
    const existing = edges.get(id);
    if (existing) {
      if (existing.explicit && explicit) warn("warn.duplicate_arrow", {}, span);
      else if (explicit) edges.set(id, { ...edge, explicit });
      return;
    }
    edges.set(id, { ...edge, explicit });
  };

  for (const item of ast.items) {
    if (item.type === "declaration") {
      const node = declare(item.alias);
      applyTags(node, item.tags, false);
      mention(item.alias, item.span.from.line);
      addLines(item.alias, item.span);
      continue;
    }
    const source = resolve(item.source);
    if (!fromLine.has(source)) fromLine.set(source, item.span.from.line);
    addLines(source, item.span);
    const sourceNode = nodes.get(source);
    if (sourceNode) applyTags(sourceNode, item.tags, false);

    for (const arrow of item.arrows) {
      const target = resolve(arrow.target);
      (mentions[target] ??= []).push({ start: arrow.span.from.line, end: arrow.span.to.line });
      const counter = arrow.tags.some((t) => t.value === "COUNTER");
      const finish = arrow.leadsTo !== undefined && "finish" in arrow.leadsTo;
      addEdge(
        {
          source,
          target,
          kind: counter ? "counter" : arrow.when ? "reaction" : "success",
          ...(arrow.when ? { when: arrow.when.value } : {}),
          ...(finish ? { leadsToFinish: true } : {}),
        },
        true,
        arrow.span,
      );
      const targetNode = nodes.get(target);
      if (targetNode) {
        applyTags(
          targetNode,
          arrow.tags.filter((t) => t.value !== "COUNTER"),
          true,
        );
      }
      if (arrow.leadsTo && "ref" in arrow.leadsTo) {
        const next = resolve(arrow.leadsTo.ref);
        addEdge({ source: target, target: next, kind: "success" }, false, arrow.leadsTo.ref.span);
      }
    }
  }

  const edgeList: NotationEdge[] = [...edges.values()].map((edge) => {
    const { explicit, ...rest } = edge;
    void explicit;
    return rest;
  });
  const exits = new Set(edgeList.map((e) => e.source));
  const gaps = [...nodes.values()]
    .filter((n) => n.category !== "submission" && !exits.has(n.key))
    .map((n) => ({ key: n.key, line: fromLine.get(n.key) ?? firstLine.get(n.key) ?? 1 }));

  for (const key of nodes.keys()) {
    if (!lines[key]?.length && mentions[key]) lines[key] = mentions[key];
  }

  return {
    ok: true,
    graph: { name: ast.name, nodes: [...nodes.values()], edges: edgeList },
    warnings,
    lines,
    mentions,
    gaps,
  };
}
