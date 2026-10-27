# Como contribuir com a lista

A lista é o coração do projeto e também o maior risco: marcar alguém errado prejudica uma pessoa real e expõe o
projeto. Por isso toda mudança segue as regras abaixo, e `npm test` recusa o que estiver fora delas.

## Quem entra

Entra quem tem **pelo menos um** destes, publicado por veículo identificável:

1. **Medida formal no caso**: prisão, busca e apreensão, inquérito aberto, delação, liquidação pelo Banco Central.
2. **Dinheiro ou benefício do Master/Vorcaro**: pagamento, contrato, empréstimo, viagem, imóvel, publicidade ou
   patrocínio.
3. **Decisão pública a favor do Master que está sob investigação** (ex.: aplicação de fundo de previdência
   investigada pela PF).

**Registro indireto** (situação `registro-indireto`, rótulo "Aparece em registros ligados a Vorcaro", com aviso
próprio dizendo que o registro não indica irregularidade). Para quem aparece **apenas** em:

- número na agenda do celular de Vorcaro;
- mesmo voo ou evento pago por ele;
- nome num manuscrito apreendido, sem prova de pagamento;
- doação eleitoral declarada feita por alguém do grupo;
- voto, projeto de lei ou requerimento de interesse do Master;
- encontro com Vorcaro.

Nesses casos o resumo diz **exatamente qual é o registro** e que ele não demonstra irregularidade. Nunca use uma
situação mais grave do que a fonte sustenta.

**Não entra**: parentesco sozinho e menção sem fonte identificável.

## Escolha a situação mais grave que **já aconteceu**

| `situacao` | Use quando |
|---|---|
| `foi-preso` | Houve prisão (mesmo que a pessoa já tenha sido solta) |
| `alvo-de-operacao` | Foi alvo de busca e apreensão ou de outra medida da PF |
| `investigado` | Há investigação formal apontada, sem operação contra a pessoa |
| `pagamento-suspeito` | Recebeu do Master pagamento apontado como suspeito (Coaf, PF, mensagens) |
| `delator` | Fechou acordo de colaboração |
| `liquidada` | Empresa liquidada pelo Banco Central no caso |
| `patrocinado` | Publicidade, patrocínio ou contrato **declarado** |
| `citado` | Dinheiro, benefício ou decisão investigada que não se encaixa acima |
| `registro-indireto` | Só agenda, voo, manuscrito, doação declarada, votação ou encontro |

Se surgir denúncia, condenação, arquivamento ou absolvição, **atualize o resumo e a situação** (ou proponha a
remoção). Vale sempre o fato mais recente.

## Ficha mínima

```json
{
  "id": "nome-sobrenome",
  "tipo": "pessoa",
  "nome": "Nome Sobrenome",
  "apelidos": [],
  "papel": "Cargo ou função",
  "situacao": "citado",
  "resumo": "O que aconteceu, com datas e valores, sem adjetivos.",
  "defesa": "O que a pessoa diz. Se não achou: Sem manifestação pública localizada nas fontes consultadas.",
  "fontes": [{ "veiculo": "Veículo", "titulo": "Título da matéria", "url": "https://...", "data": "2026-10" }],
  "verificado_em": "2026-10-27"
}
```

Regras que os testes conferem:

- **A extensão só reconhece perfis e sites**, nunca nomes no texto. Um veículo sem `redes` nem `dominios` é
  recusado, porque nunca seria encontrado.
- **Perfis** (`redes`) só com `fonte_redes` comprovando: o site oficial (o rodapé lista as redes) ou o item do
  Wikidata. Nunca chute um @ e nunca ponha perfil de pessoa privada (parentes, funcionários).
- **Domínios** sem `https://` e sem `www.`.
- Nenhum nome, perfil ou domínio pode estar em duas fichas.
- Toda ficha tem `defesa`. Se a pessoa não falou, diga isso.

## "É engano"

Na tela de opções da extensão, *Copiar para relatar* gera um JSON com os enganos marcados. Abra uma issue com ele.
Se o mesmo engano aparece com frequência, a correção vai para a lista pública:

- perfil ou site que não é do veículo: remover de `redes` ou `dominios`;
- post de um perfil certo coberto no lugar errado (ex.: estrutura nova do X): issue de código, com print.

## Antes de abrir o pull request

```sh
npm test
```

No PR, diga o que mudou e cole as fontes. Uma pessoa revisora confere cada fonte antes do merge.

## Pedido de correção por quem está na lista

Quem está na lista pode pedir correção abrindo uma issue (ou pelo contato do repositório) com a fonte do fato novo:
decisão judicial, arquivamento, nota oficial. O pedido é tratado com prioridade.
