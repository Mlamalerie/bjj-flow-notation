import { humanize } from "./graph.ts";
import { KEYWORDS, PROPERTIES } from "./lexer.ts";
import type { Category, EdgeKind, Mastery, Side, Vocabulary } from "./types.ts";

export interface SerializeNode {
  id: string;
  name: string;
  category: Category;
  side?: Side | undefined;
  mastery: Mastery;
  aGame: boolean;
  detail?: string | undefined;
  tags: string[];
}

export interface SerializeEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  when?: string | undefined;
  leadsToFinish?: boolean | undefined;
}

export interface SerializeInput {
  name: string;
  nodes: SerializeNode[];
  edges: SerializeEdge[];
}

const RESERVED_WORDS = new Set([...KEYWORDS, ...PROPERTIES, "top", "bottom"]);
const MASTERY_TAG: Partial<Record<Mastery, string>> = { gap: "GAP", wip: "WIP", solid: "SOLID" };
const IDENT = /^[a-z][a-z0-9_]*$/;

/** "Kesa gatame" → `kesa_gatame`: a valid identifier, without accents. */
export function slugIdent(name: string): string {
  let s = name
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!s) s = "technique";
  if (/^[0-9]/.test(s)) s = `n_${s}`;
  if (RESERVED_WORDS.has(s)) s = `${s}_1`;
  return s;
}

const quote = (text: string) =>
  `"${text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ")}"`;

/**
 * Writes a plan as .bjj text. Also returns the key of each node (id → key in the text), to map the
 * text back to the same nodes. Reading this text gives the same graph back, coordinates aside.
 */
export function serializeNotation(
  input: SerializeInput,
  vocabulary: Vocabulary,
): { text: string; keys: Map<string, string> } {
  const ids = new Set(input.nodes.map((n) => n.id));
  const edges = input.edges.filter(
    (e) => ids.has(e.source) && ids.has(e.target) && e.source !== e.target,
  );
  const outgoing = new Map<string, SerializeEdge[]>();
  const linked = new Set<string>();
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    linked.add(edge.source).add(edge.target);
  }
  const isGap = (node: SerializeNode) => node.category !== "submission" && !outgoing.has(node.id);

  /* Identifier of each node: the vocabulary's, or else derived from its name. */
  const idents = new Map<string, string>();
  const entries = new Map<string, ReturnType<Vocabulary["get"]>>();
  for (const node of input.nodes) {
    const known = vocabulary.idOf(node.name, node.category);
    let ident = known ?? slugIdent(node.name);
    // A custom technique never takes the identifier of a vocabulary entry.
    if (!known && vocabulary.get(ident)) ident = `${ident}_custom`;
    idents.set(node.id, ident);
    entries.set(node.id, known ? vocabulary.get(known) : undefined);
  }
  const allIdents = new Set(idents.values());

  interface Placed {
    node: SerializeNode;
    ident: string;
    alias?: string | undefined;
    ref: string;
    key: string;
  }

  /* Who needs a declaration? What differs from the vocabulary, or would appear nowhere. */
  const info = input.nodes.map((node) => {
    const ident = idents.get(node.id) ?? slugIdent(node.name);
    const entry = entries.get(node.id);
    const side = node.side ?? entry?.side;
    const needs =
      !entry ||
      node.name !== entry.name ||
      node.category !== entry.category ||
      node.mastery !== "discover" ||
      node.aGame ||
      node.detail !== undefined ||
      node.tags.length > 0 ||
      (!linked.has(node.id) && !isGap(node));
    return { node, ident, entry, plainKey: side ? `${ident}.${side}` : ident, needs };
  });
  // Two identical undeclared nodes: the second one gets a declaration.
  const plainKeys = new Set<string>();
  for (const item of info) {
    if (item.needs) continue;
    if (plainKeys.has(item.plainKey)) item.needs = true;
    else plainKeys.add(item.plainKey);
  }
  // An alias hides the identifier: if a node with the same identifier stays undeclared, the
  // declared ones take a numbered alias.
  const undeclaredIdents = new Set(info.filter((i) => !i.needs).map((i) => i.ident));
  const used = new Set(plainKeys);
  const uniqueAlias = (ident: string) => {
    for (let n = 2; ; n++) {
      const candidate = `${ident}_${n}`;
      if (!used.has(candidate) && !allIdents.has(candidate) && !vocabulary.get(candidate)) {
        return candidate;
      }
    }
  };

  const placed = new Map<string, Placed>();
  for (const { node, ident, entry, plainKey, needs } of info) {
    let alias: string | undefined;
    if (needs) {
      alias = !undeclaredIdents.has(ident) && !used.has(ident) ? ident : uniqueAlias(ident);
      used.add(alias);
    }
    const sideSuffix = node.side && node.side !== entry?.side ? `.${node.side}` : "";
    placed.set(node.id, {
      node,
      ident,
      alias,
      ref: alias ?? `${ident}${sideSuffix}`,
      key: alias ?? plainKey,
    });
  }

  const lines: string[] = [`plan ${quote(input.name)} {`];

  /* Declarations */
  const declarations: string[] = [];
  for (const { node, ident, alias } of placed.values()) {
    if (!alias) continue;
    const entry = entries.get(node.id);
    const sideSuffix = node.side && node.side !== entry?.side ? `.${node.side}` : "";
    const ref = alias !== ident || sideSuffix ? ` = ${ident}${sideSuffix}` : "";
    const props: string[] = [];
    const defaultName = entry?.name ?? humanize(ident);
    if (node.name !== defaultName) props.push(`name: ${quote(node.name)}`);
    if (node.detail !== undefined) props.push(`detail: ${quote(node.detail)}`);
    const tags = [
      ...(node.aGame ? ["a_game"] : []),
      ...(MASTERY_TAG[node.mastery] ? [MASTERY_TAG[node.mastery] ?? ""] : []),
      ...node.tags.filter((t) => IDENT.test(t) && !RESERVED_WORDS.has(t)),
    ];
    if (tags.length) props.push(`tag: ${tags.join(", ")}`);
    declarations.push(
      `  ${node.category} ${alias}${ref}${props.length ? ` { ${props.join("  ")} }` : ""}`,
    );
  }
  if (declarations.length) lines.push("", ...declarations);

  /* One `from` block per node with a way out, and one (empty) per gap. */
  for (const { node, ref } of placed.values()) {
    const exits = outgoing.get(node.id) ?? [];
    if (!exits.length && !isGap(node)) continue;
    lines.push("", `  from ${ref}:`);
    const targets = exits.map((edge) => placed.get(edge.target)?.ref ?? "");
    const width = Math.max(0, ...targets.map((t) => t.length));
    exits.forEach((edge, i) => {
      const target = targets[i] ?? "";
      const options: string[] = [];
      if (edge.kind !== "success") {
        if (edge.when !== undefined || edge.kind === "reaction") {
          options.push(`when: ${quote(edge.when ?? "")}`);
        }
      }
      if (edge.leadsToFinish) options.push("leads_to: FINISH");
      if (edge.kind === "counter") options.push("tag: COUNTER");
      lines.push(
        `    -> ${options.length ? `${target.padEnd(width)}   ${options.join("   ")}` : target}`,
      );
    });
  }
  lines.push("}", "");

  return {
    text: lines.join("\n"),
    keys: new Map([...placed.entries()].map(([id, p]) => [id, p.key])),
  };
}
