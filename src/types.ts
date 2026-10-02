/**
 * Notation .bjj : types publics. Aucune dépendance. Spécification : SPEC.md du repo bjj-flow-notation.
 */

export type Category = "position" | "submission" | "pass" | "defense" | "takedown";
export type Side = "top" | "bottom";
export type Mastery = "discover" | "gap" | "wip" | "solid";
export type EdgeKind = "success" | "reaction" | "counter";

/** Position dans le texte : ligne et colonne à partir de 1, offset à partir de 0. */
export interface Position {
  line: number;
  col: number;
  offset: number;
}

export interface Span {
  from: Position;
  to: Position;
}

export interface Diagnostic {
  severity: "error" | "warning";
  message: string;
  span: Span;
}

/** Une entrée du vocabulaire commun : `side_control` → « Side control », position, dessus. */
export interface VocabularyEntry {
  id: string;
  name: string;
  category: Category;
  side?: Side | undefined;
}

export interface Vocabulary {
  /** Entrée d'un identifiant tel qu'écrit dans le texte (synonymes compris). */
  get(id: string): VocabularyEntry | undefined;
  /** Identifiant d'une technique d'après son nom et sa catégorie, pour écrire le texte. */
  idOf(name: string, category: Category): string | undefined;
}

/** Un nœud du graphe. `key` : l'alias déclaré, ou l'identifiant suivi du côté (`mount.top`). */
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

/** Lignes (de 1 à n, incluses) où un nœud est déclaré ou ouvre un bloc `from`. */
export interface LineRange {
  start: number;
  end: number;
}

export type ParseResult =
  | {
      ok: true;
      graph: NotationGraph;
      warnings: Diagnostic[];
      /**
       * Lignes de chaque nœud, pour allumer celles du nœud sélectionné : sa déclaration et son bloc
       * `from`, sinon les flèches qui mènent à lui.
       */
      lines: Record<string, LineRange[]>;
      /** Lignes des flèches `-> x`, par cible : un clic sur la ligne sélectionne la technique. */
      mentions: Record<string, LineRange[]>;
      /** Positions sans sortie (« aucune sortie définie · trou ») et la ligne où le signaler. */
      gaps: { key: string; line: number }[];
    }
  | { ok: false; error: Diagnostic };
