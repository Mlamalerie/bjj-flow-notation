/**
 * Public types of the .bjj notation. No dependency. Specification: spec/bjj-notation.md in the
 * bjj-notation repository.
 */
import type { DiagnosticCode, Locale, Params } from "./messages.ts";

export type Category = "position" | "submission" | "pass" | "defense" | "takedown";
export type Side = "top" | "bottom";
export type Mastery = "discover" | "gap" | "wip" | "solid";
export type EdgeKind = "success" | "reaction" | "counter";

/** A place in the text: line and column start at 1, offset at 0 (UTF-16 code units). */
export interface Position {
  line: number;
  col: number;
  offset: number;
}

export interface Span {
  from: Position;
  to: Position;
}

/** An error or a warning: a stable code, its parameters, and the message in the requested language. */
export interface Diagnostic {
  severity: "error" | "warning";
  code: DiagnosticCode;
  params: Params;
  message: string;
  span: Span;
}

/** A vocabulary entry: `side_control` → "Side control", a position, on top. */
export interface VocabularyEntry {
  id: string;
  name: string;
  category: Category;
  side?: Side | undefined;
}

export interface Vocabulary {
  /** Entry of an identifier as written in the text (synonyms included). */
  get(id: string): VocabularyEntry | undefined;
  /** Identifier of a technique from its name and category, to write text. */
  idOf(name: string, category: Category): string | undefined;
}

/** A node of the graph. `key`: the declared alias, or the identifier followed by its side (`mount.top`). */
export interface NotationNode {
  key: string;
  name: string;
  category: Category;
  side?: Side | undefined;
  mastery: Mastery;
  aGame: boolean;
  detail?: string | undefined;
  tags: string[];
}

export interface NotationEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  when?: string | undefined;
  leadsToFinish?: boolean | undefined;
}

export interface NotationGraph {
  name: string;
  nodes: NotationNode[];
  edges: NotationEdge[];
}

/** Lines (1 to n, inclusive). */
export interface LineRange {
  start: number;
  end: number;
}

export interface ParseOptions {
  /** Language of diagnostic messages. Codes do not change. Default: English. */
  locale?: Locale;
}

export type ParseResult =
  | {
      ok: true;
      graph: NotationGraph;
      warnings: Diagnostic[];
      /**
       * Lines of each node, to highlight the selected one: its declaration and its `from` block,
       * or else the arrows that lead to it.
       */
      lines: Record<string, LineRange[]>;
      /** Lines of each `-> x` arrow, by target. */
      mentions: Record<string, LineRange[]>;
      /** Nodes with no way out (gaps), and the line where to show them. Submissions excluded. */
      gaps: { key: string; line: number }[];
    }
  | { ok: false; error: Diagnostic };
