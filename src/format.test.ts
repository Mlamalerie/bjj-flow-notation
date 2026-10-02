import { describe, expect, it } from "vitest";
import {
  parseNotation,
  serializeNotation,
  tokenize,
  type ParseResult,
  type Vocabulary,
} from "./index.ts";

/** Petit vocabulaire de test : le format ne dépend pas du catalogue de l'app. */
const entries = [
  { id: "mount", name: "Mount", category: "position", side: "top" },
  { id: "side_control", name: "Side control", category: "position", side: "top" },
  { id: "top_position", name: "Top position", category: "position", side: "top" },
  { id: "open_guard", name: "Garde ouverte", category: "position", side: "bottom" },
  { id: "in_guard", name: "Dans sa garde", category: "position", side: "top" },
  { id: "dogfight", name: "Dogfight", category: "position" },
  { id: "back", name: "Prise de dos", category: "position" },
  { id: "body_lock", name: "Body lock", category: "takedown" },
  { id: "knee_slice", name: "Knee slice", category: "pass" },
  { id: "torreando", name: "Torreando", category: "pass" },
  { id: "americana", name: "Americana", category: "submission" },
  { id: "armbar", name: "Armbar", category: "submission" },
] as const;
const vocabulary: Vocabulary = {
  get: (id) => entries.find((e) => e.id === (id === "his_guard" ? "in_guard" : id)),
  idOf: (name, category) => entries.find((e) => e.name === name && e.category === category)?.id,
};

const parse = (text: string) => parseNotation(text, vocabulary);
const ok = (result: ParseResult) => {
  if (!result.ok)
    throw new Error(
      `${result.error.span.from.line}:${result.error.span.from.col} ${result.error.message}`,
    );
  return result;
};

/** Exemple de la page notation (10.03), mot pour mot. */
const NOTATION_PAGE = `plan "A-game KL" {

  from mount:
    -> americana     leads_to: FINISH
    -> armbar
       when: "il tend le bras"
       leads_to: FINISH
    -> back
       when: "il se tourne sur le côté"
    -> his_guard.top  tag: COUNTER
       when: "il fait upa"

  from dogfight:
    # rien de prévu ici
    tag: GAP
}`;

/** Exemple de 07.01, avec la correction validée (takedown body_lock au lieu de standing.clinch). */
const TEXT_VIEW = `plan "A-game KL" {

  takedown body_lock { tag: a_game, GAP  detail: "départ debout" }
  position pulls_guard = open_guard.bottom { name: "Il tire garde" }

  from body_lock:
    -> top_position  tag: a_game
    -> pulls_guard
       when: "je perds le clinch"

  from top_position:
    -> knee_slice   leads_to: side_control   tag: a_game
    -> torreando    when: "garde ouverte"

  from side_control.top:
    -> mount        when: "il se tourne pour framer"
    -> americana    when: "bras lointain exposé"
                    leads_to: FINISH

  from mount.bottom:
}`;

describe("lecture des exemples des maquettes", () => {
  it("10.03 : réactions, contre, FINISH, trou", () => {
    const { graph, gaps, warnings } = ok(parse(NOTATION_PAGE));
    expect(warnings).toEqual([]);
    expect(graph.name).toBe("A-game KL");
    expect(graph.edges).toEqual([
      { source: "mount.top", target: "americana", kind: "success", leadsToFinish: true },
      {
        source: "mount.top",
        target: "armbar",
        kind: "reaction",
        when: "il tend le bras",
        leadsToFinish: true,
      },
      { source: "mount.top", target: "back", kind: "reaction", when: "il se tourne sur le côté" },
      { source: "mount.top", target: "his_guard.top", kind: "counter", when: "il fait upa" },
    ]);
    expect(graph.nodes.find((n) => n.key === "his_guard.top")?.name).toBe("Dans sa garde");
    expect(graph.nodes.find((n) => n.key === "dogfight")?.mastery).toBe("gap");
    expect(gaps.map((g) => g.key)).toEqual(["back", "his_guard.top", "dogfight"]);
    expect(gaps.find((g) => g.key === "dogfight")?.line).toBe(13);
  });

  it("07.01 : alias, côtés, leads_to, A-game, maîtrise, détail", () => {
    const { graph, lines, gaps } = ok(parse(TEXT_VIEW));
    const node = (key: string) => graph.nodes.find((n) => n.key === key);
    expect(node("body_lock")).toMatchObject({
      name: "Body lock",
      category: "takedown",
      mastery: "gap",
      aGame: true,
      detail: "départ debout",
    });
    expect(node("pulls_guard")).toMatchObject({ name: "Il tire garde", side: "bottom" });
    // side_control et side_control.top désignent le même nœud (dessus par défaut).
    expect(graph.nodes.filter((n) => n.name === "Side control")).toHaveLength(1);
    expect(node("mount.top")).toBeDefined();
    expect(node("mount.bottom")).toBeDefined();
    expect(graph.edges).toContainEqual({
      source: "knee_slice",
      target: "side_control.top",
      kind: "success",
    });
    expect(node("knee_slice")?.aGame).toBe(true);
    expect(lines["side_control.top"]).toEqual([{ start: 15, end: 18 }]);
    expect(gaps.map((g) => g.key)).toContain("mount.bottom");
  });
});

describe("erreurs : toujours une ligne, une colonne et une phrase", () => {
  const cases: [string, RegExp][] = [
    ["", /commence par plan/],
    ["plan A {", /entre guillemets/],
    ['plan "A"', /Il manque \{/],
    ['plan "A" {', /Il manque \} pour fermer le plan/],
    ['plan "A" { from mount }', /Il manque : après « from mount »/],
    ['plan "A" { from Mount: }', /minuscules : mount/],
    ['plan "A" { from défense: }', /sans accents : defense/],
    ['plan "A" { from mount: -> }', /Il manque la technique après ->/],
    ['plan "A" { from mount: -> armbar when: il }', /entre guillemets/],
    ['plan "A" { from mount: -> armbar when: "x }', /Guillemet fermant manquant/],
    ['plan "A" { from mount: -> armbar leads_to: }', /une position ou FINISH/],
    ['plan "A" { from mount.side: }', /\.top \(dessus\) ou \.bottom/],
    ['plan "A" { from mount: when: "x" }', /sous une flèche/],
    ['plan "A" { position x { foo } }', /name:, detail: ou tag:/],
    ['plan "A" { position x  position x }', /déjà déclaré ligne 1/],
    ['plan "A" { foo }', /inattendu/],
    ['plan "A" { } encore', /Rien n'est attendu après/],
    ['plan "A" { from mount: -> armbar tag: }', /au moins une étiquette/],
    ['plan "A" { position mount { tag: COUNTER } }', /COUNTER s'écrit sur une flèche/],
    ['plan "A" { from mount: @ }', /Caractère inattendu « @ »/],
    ['plan "A" { position x { name: "a" name: "b" } }', /déjà un nom/],
    ['plan "A" { from mount: -> armbar when: "a" when: "b" }', /déjà une condition/],
    ['plan "A" { position mount  from mount.bottom: }', /déclaré dessus/],
    ['plan "A" { from from: }', /mot réservé/],
    ['plan "A" { from mount: -> armbar tag: FINISH }', /après leads_to:/],
    ['plan "A" { position 2x }', /commence par une lettre/],
    ['plan "A" { from mount: -> armbar  name: "x" }', /dans la déclaration/],
    ['plan "A" { position x = }', /identifiant du vocabulaire/],
  ];

  it.each(cases)("%s", (text, message) => {
    const result = parse(text);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(message);
    expect(result.error.span.from.line).toBeGreaterThanOrEqual(1);
    expect(result.error.span.from.col).toBeGreaterThanOrEqual(1);
  });

  it("une valeur oubliée en fin de ligne : l'erreur pointe le mot resté seul", () => {
    const result = parse('plan "A" {\n  from mount:\n    -> armbar   leads_to:\n    -> kimura\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/une position ou FINISH/);
    expect(result.error.span.from).toMatchObject({ line: 3, col: 17 });
  });

  it("pointe la bonne ligne et la bonne colonne", () => {
    const result = parse('plan "A" {\n  from mount:\n    -> armbar   leads_to: 12\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.span.from).toMatchObject({ line: 3, col: 27 });
  });
});

describe("avertissements", () => {
  it("technique hors vocabulaire : une position, signalée une fois", () => {
    const { graph, warnings } = ok(
      parse('plan "A" { from mount: -> choke_du_club  -> choke_du_club }'),
    );
    expect(graph.nodes.find((n) => n.key === "choke_du_club")).toMatchObject({
      name: "Choke du club",
      category: "position",
    });
    expect(warnings).toHaveLength(2);
    expect(warnings[0]?.message).toMatch(/pas dans le vocabulaire/);
    expect(warnings[1]?.message).toMatch(/Flèche en double/);
  });
});

describe("aller-retour graphe → texte → graphe", () => {
  /** Relit le texte écrit et compare nœud par nœud, flèche par flèche, via les clés. */
  function roundTrip(text: string) {
    const first = ok(parse(text)).graph;
    const written = serializeNotation(
      {
        name: first.name,
        nodes: first.nodes.map((n) => ({ ...n, id: n.key })),
        edges: first.edges,
      },
      vocabulary,
    );
    const second = ok(parse(written.text)).graph;
    const key = (id: string) => written.keys.get(id) ?? "?";
    const byKey = new Map(second.nodes.map((n) => [n.key, n]));
    for (const node of first.nodes) {
      const back = byKey.get(key(node.key));
      expect(back, `${node.key} dans\n${written.text}`).toBeDefined();
      expect({ ...back, key: node.key }).toEqual(node);
    }
    expect(second.nodes).toHaveLength(first.nodes.length);
    // Un graphe : l'ordre des flèches ne compte pas.
    const sorted = <T extends { source: string; target: string }>(edges: T[]) =>
      [...edges].sort((a, b) => `${a.source}→${a.target}`.localeCompare(`${b.source}→${b.target}`));
    expect(sorted(second.edges)).toEqual(
      sorted(first.edges.map((e) => ({ ...e, source: key(e.source), target: key(e.target) }))),
    );
    return written.text;
  }

  it("10.03 et 07.01", () => {
    roundTrip(NOTATION_PAGE);
    roundTrip(TEXT_VIEW);
  });

  it("cas limites : doublons, perso, guillemets, réaction sans condition, nœud isolé", () => {
    const text = roundTrip(`plan "Cas \\"limites\\"" {
  submission americana_2 = americana { tag: SOLID }
  position mount_2 = mount.top { detail: "côté gauche" }
  submission mount_perso { name: "Mount" }
  submission americana
  position kesa_gatame { tag: WIP, gi }
  submission pass_1 { name: "Pass" }
  from mount:
    -> mount_2     when: ""
    -> kesa_gatame   tag: COUNTER
    -> mount.bottom
  from kesa_gatame:
    -> mount_perso   leads_to: FINISH
}`);
    expect(text).toContain('plan "Cas \\"limites\\"" {');
  });

  it("plan vide", () => {
    expect(roundTrip('plan "Vide" {\n}')).toBe('plan "Vide" {\n}\n');
  });
});

describe("jetons pour la coloration", () => {
  it("garde les commentaires et signale une chaîne non fermée sans planter", () => {
    const tokens = tokenize('plan "A" { # note\n from mount: -> x when: "oups\n}');
    expect(tokens.map((t) => t.type)).toEqual([
      "keyword",
      "string",
      "punct",
      "comment",
      "keyword",
      "ident",
      "punct",
      "arrow",
      "ident",
      "property",
      "invalid",
      "punct",
    ]);
  });
});
