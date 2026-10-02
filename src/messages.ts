/**
 * Diagnostic messages in every supported language. A diagnostic carries a stable `code` and its
 * `params`; tools can show `message` as is, or translate the code themselves.
 */

export const LOCALES = ["en", "fr", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export type Params = Record<string, string | number>;
type Template = (p: Params) => string;

/** Words used inside messages that depend on the language (sides, mastery levels). */
const SIDE: Record<Locale, Record<string, string>> = {
  en: { top: "on top (.top)", bottom: "underneath (.bottom)", none: "without a side" },
  fr: { top: "dessus (.top)", bottom: "dessous (.bottom)", none: "sans côté" },
  pt: { top: "por cima (.top)", bottom: "por baixo (.bottom)", none: "sem lado" },
};
const MASTERY: Record<Locale, Record<string, string>> = {
  en: { discover: "to discover", gap: "GAP", wip: "WIP", solid: "SOLID" },
  fr: { discover: "à découvrir", gap: "GAP", wip: "WIP", solid: "SOLID" },
  pt: { discover: "a descobrir", gap: "GAP", wip: "WIP", solid: "SOLID" },
};

const s = (p: Params, key: string) => String(p[key] ?? "");

const en = {
  "lex.unexpected_char": (p) => `Unexpected character “${s(p, "char")}”.`,
  "lex.unterminated_string": () => "Missing closing quote.",
  "plan.expected": () => 'A .bjj file starts with plan "Plan name" {',
  "plan.name_unquoted": () => 'The plan name goes in quotes: plan "A-game" {',
  "plan.missing_open": () => "Missing { after the plan name.",
  "plan.missing_close": (p) => `Missing } to close the plan (opened on line ${s(p, "line")}).`,
  "plan.unexpected": (p) =>
    `Unexpected “${s(p, "token")}”: a line starts with from, position, submission, pass, defense, takedown or }.`,
  "plan.trailing": () => "Nothing is expected after the end of the plan.",
  "ident.reserved_word": (p) => `“${s(p, "word")}” is a reserved word of the notation.`,
  "ident.reserved_tag": (p) => `“${s(p, "word")}” is a reserved tag, not a technique name.`,
  "ident.accents": (p) => `Identifiers are written without accents: ${s(p, "suggestion")}.`,
  "ident.uppercase": (p) => `Identifiers are written in lowercase: ${s(p, "suggestion")}.`,
  "ident.leading": (p) => `An identifier starts with a letter: ${s(p, "suggestion")}.`,
  "side.invalid": () => "After the dot, the side: .top or .bottom.",
  "tags.missing": () => "After tag:, at least one tag: tag: a_game.",
  "tags.missing_after_comma": () => "After the comma, another tag: tag: a_game, GAP.",
  "tags.finish": () => "FINISH goes after leads_to:, not in tag:.",
  "decl.missing_name": (p) =>
    `Missing the name after “${s(p, "category")}”: ${s(p, "category")} side_control.`,
  "decl.missing_ref": () => "After =, write a vocabulary identifier, for example side_control.",
  "decl.unclosed": (p) => `Missing } to close “${s(p, "alias")}” (opened on line ${s(p, "line")}).`,
  "decl.arrow_property": (p) =>
    `${s(p, "property")}: goes under an arrow ->, not in a declaration.`,
  "decl.unknown_property": (p) => `“${s(p, "token")}”: inside { }, write name:, detail: or tag:.`,
  "decl.value_unquoted": (p) =>
    `After ${s(p, "property")}:, the text goes in quotes: ${s(p, "property")}: "…".`,
  "decl.duplicate_name": (p) => `“${s(p, "alias")}” already has a name.`,
  "decl.duplicate_detail": (p) => `“${s(p, "alias")}” already has a detail.`,
  "from.missing_ref": () => "Missing the position after from: from side_control:",
  "from.missing_colon": (p) => `Missing : after “from ${s(p, "ref")}”.`,
  "from.option_without_arrow": (p) => `${s(p, "property")}: goes under an arrow ->.`,
  "from.unexpected": (p) => `Unexpected “${s(p, "token")}”: an arrow starts with ->.`,
  "arrow.missing_target": () => "Missing the technique after ->: -> knee_slice",
  "arrow.declaration_property": (p) =>
    `${s(p, "property")}: goes in the technique's declaration, not on an arrow.`,
  "arrow.duplicate_when": (p) => `This arrow already has a condition (line ${s(p, "line")}).`,
  "arrow.when_unquoted": () =>
    'After when:, the condition goes in quotes: when: "he extends his arm".',
  "arrow.duplicate_leads_to": () => "This arrow already has a leads_to:.",
  "arrow.missing_leads_to": () => "After leads_to:, a position or FINISH.",
  "alias.duplicate": (p) => `“${s(p, "alias")}” is already declared on line ${s(p, "line")}.`,
  "alias.side_conflict": (p) =>
    `“${s(p, "alias")}” is declared ${SIDE.en[s(p, "side")] ?? ""} on line ${s(p, "line")}: write just ${s(p, "alias")}.`,
  "tag.counter_on_node": () => "COUNTER goes on an arrow ->: tag: COUNTER.",
  "warn.unknown_ident": (p) =>
    `“${s(p, "ident")}” is not in the vocabulary: it becomes a position named “${s(p, "name")}”. Declare it to choose its category.`,
  "warn.mastery_conflict": (p) =>
    `“${s(p, "name")}” has two mastery levels: ${MASTERY.en[s(p, "kept")] ?? ""} wins over ${MASTERY.en[s(p, "dropped")] ?? ""}.`,
  "warn.tag_ignored_on_arrow": (p) =>
    `Tag “${s(p, "tag")}” ignored: on an arrow, only a_game, GAP, WIP, SOLID and COUNTER count.`,
  "warn.self_loop": () => "A technique does not lead to itself: arrow ignored.",
  "warn.duplicate_arrow": () => "Duplicate arrow: only the first one counts.",
} satisfies Record<string, Template>;

export type DiagnosticCode = keyof typeof en;

const fr: Record<DiagnosticCode, Template> = {
  "lex.unexpected_char": (p) => `Caractère inattendu « ${s(p, "char")} ».`,
  "lex.unterminated_string": () => "Guillemet fermant manquant.",
  "plan.expected": () => 'Un fichier .bjj commence par plan "Nom du plan" {',
  "plan.name_unquoted": () => 'Le nom du plan s\'écrit entre guillemets : plan "A-game" {',
  "plan.missing_open": () => "Il manque { après le nom du plan.",
  "plan.missing_close": (p) => `Il manque } pour fermer le plan (ouvert ligne ${s(p, "line")}).`,
  "plan.unexpected": (p) =>
    `« ${s(p, "token")} » inattendu : une ligne commence par from, position, submission, pass, defense, takedown ou }.`,
  "plan.trailing": () => "Rien n'est attendu après la fin du plan.",
  "ident.reserved_word": (p) => `« ${s(p, "word")} » est un mot réservé de la notation.`,
  "ident.reserved_tag": (p) =>
    `« ${s(p, "word")} » est une étiquette réservée, pas un nom de technique.`,
  "ident.accents": (p) => `Les identifiants s'écrivent sans accents : ${s(p, "suggestion")}.`,
  "ident.uppercase": (p) => `Les identifiants s'écrivent en minuscules : ${s(p, "suggestion")}.`,
  "ident.leading": (p) => `Un identifiant commence par une lettre : ${s(p, "suggestion")}.`,
  "side.invalid": () => "Après le point, le côté : .top (dessus) ou .bottom (dessous).",
  "tags.missing": () => "Après tag:, au moins une étiquette : tag: a_game.",
  "tags.missing_after_comma": () => "Après la virgule, une autre étiquette : tag: a_game, GAP.",
  "tags.finish": () => "FINISH s'écrit après leads_to:, pas dans tag:.",
  "decl.missing_name": (p) =>
    `Il manque le nom après « ${s(p, "category")} » : ${s(p, "category")} side_control.`,
  "decl.missing_ref": () =>
    "Après =, écris un identifiant du vocabulaire, par exemple side_control.",
  "decl.unclosed": (p) =>
    `Il manque } pour fermer « ${s(p, "alias")} » (ouvert ligne ${s(p, "line")}).`,
  "decl.arrow_property": (p) =>
    `${s(p, "property")}: se place sous une flèche ->, pas dans une déclaration.`,
  "decl.unknown_property": (p) =>
    `« ${s(p, "token")} » : dans { }, on écrit name:, detail: ou tag:.`,
  "decl.value_unquoted": (p) =>
    `Après ${s(p, "property")}:, le texte s'écrit entre guillemets : ${s(p, "property")}: "…".`,
  "decl.duplicate_name": (p) => `« ${s(p, "alias")} » a déjà un nom.`,
  "decl.duplicate_detail": (p) => `« ${s(p, "alias")} » a déjà un détail.`,
  "from.missing_ref": () => "Il manque la position après from : from side_control:",
  "from.missing_colon": (p) => `Il manque : après « from ${s(p, "ref")} ».`,
  "from.option_without_arrow": (p) => `${s(p, "property")}: se place sous une flèche -> .`,
  "from.unexpected": (p) => `« ${s(p, "token")} » inattendu : une flèche commence par ->.`,
  "arrow.missing_target": () => "Il manque la technique après -> : -> knee_slice",
  "arrow.declaration_property": (p) =>
    `${s(p, "property")}: se place dans la déclaration de la technique, pas sur une flèche.`,
  "arrow.duplicate_when": (p) => `Cette flèche a déjà une condition (ligne ${s(p, "line")}).`,
  "arrow.when_unquoted": () =>
    'Après when:, la condition s\'écrit entre guillemets : when: "il tend le bras".',
  "arrow.duplicate_leads_to": () => "Cette flèche a déjà un leads_to:.",
  "arrow.missing_leads_to": () => "Après leads_to:, une position ou FINISH.",
  "alias.duplicate": (p) => `« ${s(p, "alias")} » est déjà déclaré ligne ${s(p, "line")}.`,
  "alias.side_conflict": (p) =>
    `« ${s(p, "alias")} » est déclaré ${SIDE.fr[s(p, "side")] ?? ""} ligne ${s(p, "line")} : écris ${s(p, "alias")} tout court.`,
  "tag.counter_on_node": () => "COUNTER s'écrit sur une flèche -> : tag: COUNTER.",
  "warn.unknown_ident": (p) =>
    `« ${s(p, "ident")} » n'est pas dans le vocabulaire : ce sera une position nommée « ${s(p, "name")} ». Déclare-la pour choisir sa catégorie.`,
  "warn.mastery_conflict": (p) =>
    `« ${s(p, "name")} » a deux niveaux de maîtrise : ${MASTERY.fr[s(p, "kept")] ?? ""} l'emporte sur ${MASTERY.fr[s(p, "dropped")] ?? ""}.`,
  "warn.tag_ignored_on_arrow": (p) =>
    `Étiquette « ${s(p, "tag")} » ignorée : sur une flèche, seules a_game, GAP, WIP, SOLID et COUNTER comptent.`,
  "warn.self_loop": () => "Une technique ne mène pas à elle-même : flèche ignorée.",
  "warn.duplicate_arrow": () => "Flèche en double : seule la première compte.",
};

const pt: Record<DiagnosticCode, Template> = {
  "lex.unexpected_char": (p) => `Caractere inesperado “${s(p, "char")}”.`,
  "lex.unterminated_string": () => "Faltam as aspas de fechamento.",
  "plan.expected": () => 'Um arquivo .bjj começa com plan "Nome do plano" {',
  "plan.name_unquoted": () => 'O nome do plano vai entre aspas: plan "A-game" {',
  "plan.missing_open": () => "Falta { depois do nome do plano.",
  "plan.missing_close": (p) => `Falta } para fechar o plano (aberto na linha ${s(p, "line")}).`,
  "plan.unexpected": (p) =>
    `“${s(p, "token")}” inesperado: uma linha começa com from, position, submission, pass, defense, takedown ou }.`,
  "plan.trailing": () => "Nada é esperado depois do fim do plano.",
  "ident.reserved_word": (p) => `“${s(p, "word")}” é uma palavra reservada da notação.`,
  "ident.reserved_tag": (p) =>
    `“${s(p, "word")}” é uma etiqueta reservada, não um nome de técnica.`,
  "ident.accents": (p) => `Os identificadores são escritos sem acentos: ${s(p, "suggestion")}.`,
  "ident.uppercase": (p) => `Os identificadores são escritos em minúsculas: ${s(p, "suggestion")}.`,
  "ident.leading": (p) => `Um identificador começa com uma letra: ${s(p, "suggestion")}.`,
  "side.invalid": () => "Depois do ponto, o lado: .top (por cima) ou .bottom (por baixo).",
  "tags.missing": () => "Depois de tag:, pelo menos uma etiqueta: tag: a_game.",
  "tags.missing_after_comma": () => "Depois da vírgula, outra etiqueta: tag: a_game, GAP.",
  "tags.finish": () => "FINISH vai depois de leads_to:, não em tag:.",
  "decl.missing_name": (p) =>
    `Falta o nome depois de “${s(p, "category")}”: ${s(p, "category")} side_control.`,
  "decl.missing_ref": () =>
    "Depois de =, escreva um identificador do vocabulário, por exemplo side_control.",
  "decl.unclosed": (p) =>
    `Falta } para fechar “${s(p, "alias")}” (aberto na linha ${s(p, "line")}).`,
  "decl.arrow_property": (p) =>
    `${s(p, "property")}: vai embaixo de uma seta ->, não numa declaração.`,
  "decl.unknown_property": (p) =>
    `“${s(p, "token")}”: dentro de { }, escreva name:, detail: ou tag:.`,
  "decl.value_unquoted": (p) =>
    `Depois de ${s(p, "property")}:, o texto vai entre aspas: ${s(p, "property")}: "…".`,
  "decl.duplicate_name": (p) => `“${s(p, "alias")}” já tem um nome.`,
  "decl.duplicate_detail": (p) => `“${s(p, "alias")}” já tem um detalhe.`,
  "from.missing_ref": () => "Falta a posição depois de from: from side_control:",
  "from.missing_colon": (p) => `Falta : depois de “from ${s(p, "ref")}”.`,
  "from.option_without_arrow": (p) => `${s(p, "property")}: vai embaixo de uma seta ->.`,
  "from.unexpected": (p) => `“${s(p, "token")}” inesperado: uma seta começa com ->.`,
  "arrow.missing_target": () => "Falta a técnica depois de ->: -> knee_slice",
  "arrow.declaration_property": (p) =>
    `${s(p, "property")}: vai na declaração da técnica, não numa seta.`,
  "arrow.duplicate_when": (p) => `Esta seta já tem uma condição (linha ${s(p, "line")}).`,
  "arrow.when_unquoted": () =>
    'Depois de when:, a condição vai entre aspas: when: "ele estica o braço".',
  "arrow.duplicate_leads_to": () => "Esta seta já tem um leads_to:.",
  "arrow.missing_leads_to": () => "Depois de leads_to:, uma posição ou FINISH.",
  "alias.duplicate": (p) => `“${s(p, "alias")}” já foi declarado na linha ${s(p, "line")}.`,
  "alias.side_conflict": (p) =>
    `“${s(p, "alias")}” foi declarado ${SIDE.pt[s(p, "side")] ?? ""} na linha ${s(p, "line")}: escreva só ${s(p, "alias")}.`,
  "tag.counter_on_node": () => "COUNTER vai numa seta ->: tag: COUNTER.",
  "warn.unknown_ident": (p) =>
    `“${s(p, "ident")}” não está no vocabulário: vira uma posição chamada “${s(p, "name")}”. Declare-a para escolher a categoria.`,
  "warn.mastery_conflict": (p) =>
    `“${s(p, "name")}” tem dois níveis de domínio: ${MASTERY.pt[s(p, "kept")] ?? ""} prevalece sobre ${MASTERY.pt[s(p, "dropped")] ?? ""}.`,
  "warn.tag_ignored_on_arrow": (p) =>
    `Etiqueta “${s(p, "tag")}” ignorada: numa seta, só a_game, GAP, WIP, SOLID e COUNTER contam.`,
  "warn.self_loop": () => "Uma técnica não leva a ela mesma: seta ignorada.",
  "warn.duplicate_arrow": () => "Seta duplicada: só a primeira conta.",
};

const MESSAGES: Record<Locale, Record<DiagnosticCode, Template>> = { en, fr, pt };

/** The message of a diagnostic code in the given language. */
export function formatMessage(
  code: DiagnosticCode,
  params: Params = {},
  locale: Locale = "en",
): string {
  return MESSAGES[locale][code](params);
}

export const DIAGNOSTIC_CODES = Object.keys(en) as DiagnosticCode[];
