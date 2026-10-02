# A notação `.bjj` · versão 0.1

**Status:** primeiro rascunho público, outubro de 2026. Tradução informativa: só a
[versão em inglês](bjj-notation.md) é normativa. Licença: [CC BY 4.0](../LICENSE-SPEC.md).

As palavras **deve**, **não deve**, **deveria** e **pode** são lidas como na RFC 2119.

## 1. Objetivo

Um arquivo `.bjj` descreve um **game plan** de jiu-jitsu brasileiro: as técnicas que um praticante
conhece (posições, passagens, finalizações, defesas, quedas), como elas se encadeiam e como o
adversário pode reagir ou contra-atacar. É um grafo escrito em texto. Não descreve posições na tela,
vídeos nem anotações.

## 2. Um exemplo completo

```bjj
plan "A-game KL" {

  takedown body_lock { tag: a_game, GAP  detail: "começando em pé" }
  position pulls_guard = open_guard.bottom { name: "Ele puxa para a guarda" }

  from body_lock:
    -> top_position  tag: a_game
    -> pulls_guard
       when: "eu perco o clinch"

  from top_position:
    -> knee_slice   leads_to: side_control   tag: a_game
    -> torreando    when: "guarda aberta"

  from mount:
    -> americana    leads_to: FINISH
    -> armbar       when: "ele estica o braço"
                    leads_to: FINISH
    -> his_guard.top  tag: COUNTER
       when: "ele faz a ponte"

  from dogfight:
    # nada planejado aqui ainda
    tag: GAP
}
```

As palavras-chave e os identificadores ficam em inglês, como os lances no xadrez; os nomes, as
condições e os comentários são escritos no seu idioma.

## 3. Escrita

- **Codificação.** UTF-8. Quebras de linha `\n` ou `\r\n`.
- **Espaços.** Espaços, tabulações e quebras de linha separam as palavras e não têm outro sentido:
  indentação e quebras de linha não significam nada.
- **Comentários**: de `#` (fora de uma string) até o fim da linha.
- **Palavras-chave**: `plan`, `position`, `submission`, `pass`, `defense`, `takedown`, `from`.
- **Propriedades**: uma palavra seguida imediatamente de dois-pontos: `when:`, `leads_to:`, `tag:`,
  `name:`, `detail:`.
- **Palavras reservadas**: `FINISH`, `GAP`, `WIP`, `SOLID`, `COUNTER`.
- **Seta**: `->`. **Pontuação**: `{` `}` `=` `,` `.` `:`.
- **Identificadores**: `[a-z][a-z0-9_]*`, letras minúsculas sem acento, dígitos e sublinhados,
  começando por uma letra. Palavras-chave e nomes de propriedades não são identificadores.
- **Strings**: entre aspas duplas, numa só linha. `\"` vale uma aspa, `\\` uma barra invertida.
  Qualquer outro caractere é permitido, em qualquer idioma.

## 4. Gramática

```ebnf
arquivo        = plan ;
plan           = "plan" , string , "{" , { declaração | bloco_from } , "}" ;

declaração     = categoria , alias , [ "=" , referência ] , [ propriedades ] ;
categoria      = "position" | "submission" | "pass" | "defense" | "takedown" ;
propriedades   = "{" , { propriedade } , "}" ;
propriedade    = "name:" , string | "detail:" , string | "tag:" , etiquetas ;

bloco_from     = "from" , referência , ":" , { "tag:" , etiquetas } , { seta } ;
seta           = "->" , referência , { opção } ;
opção          = "when:" , string | "leads_to:" , ( referência | "FINISH" ) | "tag:" , etiquetas ;

referência     = identificador , [ "." , ( "top" | "bottom" ) ] ;
etiquetas      = etiqueta , { "," , etiqueta } ;
etiqueta       = identificador | "GAP" | "WIP" | "SOLID" | "COUNTER" ;
alias          = identificador ;
```

Espaços e comentários podem aparecer entre duas palavras quaisquer. Um arquivo contém exatamente um
plano; depois da chave de fechamento, só espaços e comentários. Um `tag:` num bloco `from` antes da
primeira seta vale para a posição do bloco; depois de uma seta, é uma opção dessa seta.

## 5. Significado

### 5.1 Nós e identidade

Um plano é um grafo orientado. Os **nós** são técnicas; as **arestas**, transições.

- Uma **referência** designa um nó: `side_control`, `mount.bottom`.
- Sem lado escrito, uma referência usa o lado do vocabulário (§6): `side_control` e
  `side_control.top` são o mesmo nó. `mount.top` e `mount.bottom` são dois nós diferentes.
- Uma **declaração** cria um nó com um **alias** e dá a ele sua categoria: `position x`, ou
  `position x = mount.top` para baseá-lo numa entrada do vocabulário, com um lado. Referências a um
  alias designam o nó declarado; escrever outro lado nelas é um erro.
- Um alias pode ser usado antes da sua declaração. Duas declarações não devem ter o mesmo alias.
- Para colocar a mesma técnica duas vezes num plano, cada ocorrência recebe seu próprio alias.

O **nome** de um nó é, nesta ordem: sua propriedade `name:`, o nome da sua referência no vocabulário,
ou o identificador com espaços no lugar dos sublinhados e a primeira letra maiúscula (`club_choke` →
"Club choke").

A **categoria** de um nó é a palavra-chave da sua declaração, ou a categoria da sua referência no
vocabulário. Um identificador que não foi declarado nem está no vocabulário é uma `position`, e uma
ferramenta **deveria** avisar.

### 5.2 Transições

| Texto                                | Significado                                                 |
| ------------------------------------ | ----------------------------------------------------------- |
| `from A:` e depois `-> B`            | uma transição de A para B                                   |
| `-> B` com `tag: COUNTER`            | o adversário contra-ataca (tipo _counter_)                  |
| `-> B` com `when: "…"` sem `COUNTER` | o adversário reage (tipo _reaction_); a string é a condição |
| `-> B` sem os dois                   | funciona (tipo _success_)                                   |
| `leads_to: C` em `-> B`              | uma segunda transição, de B para C, do tipo _success_       |
| `leads_to: FINISH` em `-> B`         | a transição de A para B termina a luta                      |

Uma condição sempre gera uma reação ou um contra-ataque: uma transição _success_ não tem condição. Uma
condição vazia (`when: ""`) ainda gera uma reação.

A mesma transição (mesma origem, mesmo destino) é escrita uma vez; uma ferramenta **deveria** avisar
sobre as cópias seguintes e manter a primeira. Uma transição escrita com `->` prevalece sobre a que um
`leads_to:` sugere. Uma transição de um nó para ele mesmo é ignorada, com um aviso.

### 5.3 Etiquetas

| Etiqueta                     | Numa declaração ou num bloco `from`            | Numa seta                      |
| ---------------------------- | ---------------------------------------------- | ------------------------------ |
| `a_game`                     | o nó faz parte da sequência principal (A-game) | o nó de destino faz parte dela |
| `GAP`, `WIP`, `SOLID`        | domínio do nó: buraco, em andamento, dominado  | domínio do nó de destino       |
| `COUNTER`                    | erro                                           | a transição é um contra-ataque |
| qualquer outro identificador | uma etiqueta livre do nó                       | ignorada, com um aviso         |

Sem etiqueta de domínio, um nó está _a descobrir_. Se duas etiquetas de domínio valem para o mesmo
nó, a última prevalece e uma ferramenta **deveria** avisar.

### 5.4 Buracos

Um nó que não é uma finalização e não tem nenhuma transição de saída é um **buraco**: uma situação que
o plano ainda não resolve. Não é um erro; as ferramentas **deveriam** mostrá-lo.

## 6. Vocabulário

Um vocabulário associa identificadores a técnicas. O vocabulário de base,
[`vocabulary/base.json`](../vocabulary/base.json), é uma lista JSON de entradas:

```json
{
  "id": "closed_guard",
  "category": "position",
  "side": "bottom",
  "names": { "en": "Closed guard", "fr": "Garde fermée", "pt": "Guarda fechada" },
  "synonyms": []
}
```

- `id` segue a regra dos identificadores e é único. `names.en` é obrigatório; os outros idiomas usam
  o inglês quando faltam.
- `side` é opcional: é o lado padrão das referências sem lado.
- `synonyms` lista outros identificadores para a mesma entrada (por exemplo `his_guard` para
  `in_guard`).

Uma ferramenta **pode** usar outro vocabulário. O significado de um arquivo só depende dele para os
nomes, as categorias e os lados padrão das referências não declaradas.

## 7. Mensagens

Uma ferramenta para no **primeiro erro** e o informa; ela **não deve** produzir um grafo parcial a
partir de um arquivo com erro. Avisos não interrompem nada.

Cada mensagem **deve** ter um código estável, uma linha e uma coluna (a partir de 1; as colunas contam
unidades UTF-16), e **deveria** ter um texto no idioma da pessoa. Quando falta um valor no fim de uma
linha (`when:`, `leads_to:`, `=`, `{`, `:`…), a mensagem aponta a palavra que ficou sozinha, não a
linha seguinte. Os erros são informados na ordem do texto.

A lista de códigos é a da [versão em inglês](bjj-notation.md#7-diagnostics); o parser de referência
fornece os textos em inglês, francês e português (`src/messages.ts`).

## 8. Escrever `.bjj` (informativo)

Uma ferramenta que escreve `.bjj` a partir de um grafo deveria produzir um texto que, lido de novo,
dá o mesmo grafo, coordenadas à parte. O parser de referência escreve primeiro as declarações (só o
que o vocabulário não diz: nomes próprios, domínio, A-game, detalhes, etiquetas, segundas
ocorrências), depois um bloco `from` por nó com saídas, um bloco `from` vazio por buraco, dois espaços
de indentação e opções alinhadas.

## 9. Conformidade

A [suíte de conformidade](../conformance/) lista arquivos `.bjj` e o resultado esperado, calculado com
o vocabulário de base: grafo, avisos (código, linha, coluna) e buracos para os arquivos válidos; erro
(código, linha, coluna) para os outros. Uma ferramenta conforme produz exatamente esses resultados. Os
textos das mensagens não fazem parte dela.

## 10. Versões

A notação segue o versionamento semântico. Antes da 1.0, uma versão menor pode mudar o significado de
um arquivo; cada mudança está no [registro de alterações](../CHANGELOG.md).
