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

**Não entra** (sozinho, não basta):

- número na agenda do celular de Vorcaro;
- estar no mesmo voo ou evento;
- nome num manuscrito sem prova de pagamento;
- doação eleitoral declarada à Justiça Eleitoral;
- voto, projeto de lei ou requerimento;
- reunião oficial;
- parentesco.

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
| `citado` | Os demais casos que cumprem as regras de entrada |

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

- **Pessoa** precisa de nome e sobrenome (uma palavra só, como "Ratinho", casaria com meio mundo).
- **Nome comum** (Augusto Lima, Paulo Henrique Costa): ponha `"exige_contexto": true`.
- **Perfis** (`redes`) só com `fonte_redes` comprovando: item do Wikidata ou link do site oficial. Nunca chute um
  @ e nunca ponha perfil de pessoa privada (parentes, funcionários).
- **Domínios** sem `https://` e sem `www.`.
- Nenhum nome, perfil ou domínio pode estar em duas fichas.
- Toda ficha tem `defesa`. Se a pessoa não falou, diga isso.

## "É engano"

Na tela de opções da extensão, *Copiar para relatar* gera um JSON com os enganos marcados. Abra uma issue com ele.
Se o mesmo engano aparece com frequência, a correção vai para a lista pública:

- homônimo: frase típica em `nao_e_quando` da ficha (ex.: `"basquete"` para o jogador Augusto Lima);
- nome que dispara fora do caso: `"exige_contexto": true`;
- perfil errado: remover de `redes`.

## Antes de abrir o pull request

```sh
npm test
```

No PR, diga o que mudou e cole as fontes. Uma pessoa revisora confere cada fonte antes do merge.

## Pedido de correção por quem está na lista

Quem está na lista pode pedir correção abrindo uma issue (ou pelo contato do repositório) com a fonte do fato novo:
decisão judicial, arquivamento, nota oficial. O pedido é tratado com prioridade.
