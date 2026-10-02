import type { ParseResult } from "./types.ts";

/**
 * The language-neutral expected result of a conformance case: what any implementation must
 * produce. Messages are left out (they depend on the language); codes, lines and columns stay.
 */
export function expectedOf(result: ParseResult): unknown {
  if (!result.ok) {
    const { code, span } = result.error;
    return { error: { code, line: span.from.line, col: span.from.col } };
  }
  return {
    graph: result.graph,
    warnings: result.warnings.map((w) => ({
      code: w.code,
      line: w.span.from.line,
      col: w.span.from.col,
    })),
    gaps: result.gaps.map((g) => g.key),
  };
}
