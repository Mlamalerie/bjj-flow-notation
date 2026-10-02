# A notação `.bjj`

**Escrever o jiu-jitsu brasileiro.** O xadrez tem sua notação há séculos; o grappling nunca teve uma
comum. `.bjj` descreve suas posições, suas transições e as reações do seu adversário num texto que
você lê num relance, guarda no git e compartilha com seu professor.

[English](README.md) · [Français](README.fr.md)

```bjj
plan "A-game da montada" {

  position mount { tag: a_game, SOLID }

  from mount:
    -> americana      leads_to: FINISH
    -> armbar         when: "ele empurra meu peito"
                      leads_to: FINISH
    -> back           when: "ele vira de lado"
    -> his_guard.top  tag: COUNTER
                      when: "ele faz a ponte"

  from dogfight:
    # nada planejado aqui ainda
    tag: GAP
}
```

Leia em voz alta: _da montada, eu busco a americana, que finaliza. Se ele empurra meu peito, chave de
braço. Se ele vira de lado, pego as costas. Se ele faz a ponte, ele contra-ataca e eu caio na guarda
dele. No dogfight, ainda não tenho nada: é um buraco._

As palavras-chave (`from`, `when:`…) e os identificadores (`side_control`) ficam em inglês, como os
lances no xadrez. Os nomes, as condições, os comentários e as mensagens de erro ficam no seu idioma:
inglês, francês ou português.

## Neste repositório

| Caminho                                              | O quê                                                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`spec/bjj-notation.pt.md`](spec/bjj-notation.pt.md) | A especificação em português (a [versão em inglês](spec/bjj-notation.md) é a normativa) |
| [`spec/RATIONALE.md`](spec/RATIONALE.md)             | Por que a notação é assim (em inglês)                                                   |
| [`vocabulary/base.json`](vocabulary/base.json)       | 91 posições e técnicas, com nomes em inglês, francês e português                        |
| [`conformance/`](conformance/)                       | Casos de teste independentes de linguagem: textos `.bjj` e resultados esperados         |
| [`src/`](src/)                                       | O parser de referência, em TypeScript, sem dependências                                 |
| [`examples/`](examples/)                             | Planos completos para ler e copiar                                                      |

## Usar o parser

```ts
import { createVocabulary, parseNotation } from "bjj-notation";
import base from "bjj-notation/vocabulary/base.json" with { type: "json" };

const vocabulary = createVocabulary(base, { locale: "pt" });
const result = parseNotation(texto, vocabulary, { locale: "pt" });
// result.ok ? result.graph : result.error.message  → "Falta : depois de “from mount”."
```

Cada mensagem tem um código estável (`from.missing_colon`) e um texto no idioma pedido.

## Contribuir

Falta uma posição? Uma palavra-chave poderia ser mais clara? Abra uma issue: cada versão da
especificação é discutida em público. Veja [`CONTRIBUTING.md`](CONTRIBUTING.md) (em inglês, mas issues
em português são bem-vindas). Os nomes em português do vocabulário ainda precisam da revisão de
praticantes brasileiros: correções são muito bem-vindas.

## Licenças

Especificação: [CC BY 4.0](LICENSE-SPEC.md). Código, vocabulário e suíte de conformidade:
[MIT](LICENSE).
