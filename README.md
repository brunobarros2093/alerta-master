# Alerta Master

Extensão gratuita e de código aberto para Chrome e Firefox que **marca ou cobre** posts, notícias, perfis e sites
ligados ao caso Banco Master. Cada aviso diz o que aconteceu ("Foi preso", "Alvo de operação da PF", "Citado"...),
leva às fontes e mostra a versão da pessoa ou empresa.

> Investigação não é condenação. Até a data da lista, ninguém foi condenado no caso Master. A extensão informa;
> quem decide o que ler é você.

## O que ela faz

- **Posts e notícias**: em feeds (X, Facebook, Instagram, Reddit, YouTube, Google e sites de notícia), o bloco
  que cita alguém da lista ganha um aviso. Nas situações mais graves o conteúdo fica borrado, com o botão
  **Mostrar**; nas outras aparece só um selo.
- **Perfis e sites**: ao abrir o perfil de alguém da lista (pelo @) ou o site de um veículo/empresa da lista, um
  aviso aparece no topo da página.
- **Por quê?**: abre a ficha com o resumo, a versão do citado, as fontes e a data da última conferência.
- **É engano**: tira a marcação só daquele post, daquele nome naquele site, ou daquele nome em todo lugar. Fica
  salvo só no seu navegador. Na tela de opções dá para remover ou **copiar para relatar** ao projeto; enganos que
  se repetem viram exceção para todo mundo na lista pública.
- **Você decide a ação**: para cada situação, escolha *Esconder*, *Só marcar* ou *Ignorar*. Dá para desligar
  a extensão em sites específicos.

Padrão: esconde quem foi preso, é alvo de operação, é investigado ou recebeu pagamento apontado como suspeito;
só marca delação, empresa liquidada, publicidade/patrocínio declarado e quem foi apenas citado.

## Como a lista funciona

Tudo está em [`data/envolvidos.json`](data/envolvidos.json). Cada ficha tem:

| Campo | Para quê |
|---|---|
| `nome`, `apelidos` | Nomes que disparam o aviso (sem diferença de acento ou maiúscula) |
| `redes` | Perfis (@) em X, Instagram, Facebook, TikTok, YouTube e Threads, com `fonte_redes` comprovando |
| `dominios` | Sites do veículo ou da empresa |
| `situacao` | O fato mais grave até agora: `foi-preso`, `alvo-de-operacao`, `investigado`, `pagamento-suspeito`, `delator`, `liquidada`, `patrocinado`, `citado` |
| `resumo`, `defesa`, `fontes` | O que aconteceu, a versão do citado e onde foi publicado |
| `exige_contexto` | Nome comum: só dispara se o trecho também falar de Master, Vorcaro, BRB, PF... |
| `nao_e_quando` | Exceções globais: frases que indicam homônimo (ex.: o jogador de basquete Augusto Lima) |
| `casar_nome` | `false` para não casar pelo nome no texto (veículos já nascem assim: "segundo o Estadão" não leva selo) |

Veículos de imprensa casam pelo **domínio e pelos perfis**, não pelo nome escrito no texto.

A extensão já vem com a lista. Opcionalmente, nas opções, ela pode baixar a versão mais nova do repositório
(endereço `raw.githubusercontent.com`); a lista baixada só é usada se passar na mesma validação dos testes.

## Instalar para testar

**Chrome / Edge / Brave**: abra `chrome://extensions`, ligue o *Modo do desenvolvedor*, clique em *Carregar sem
compactação* e escolha esta pasta.

**Firefox**: abra `about:debugging#/runtime/this-firefox`, clique em *Carregar extensão temporária* e escolha o
`manifest.json`.

Clique no ícone da extensão para abrir as opções e a lista completa.

## Desenvolvimento

Sem dependências; precisa só de Node 20 ou mais novo.

```sh
npm test                 # valida a lista e roda os testes do núcleo
npm run validar          # só a validação da lista, com resumo por situação
node scripts/gerar-icones.mjs
```

Estrutura:

- `src/nucleo.js`: busca de nomes, perfis e domínios, decisão e validação (usado pela extensão e pelos testes)
- `src/conteudo.js` e `src/conteudo.css`: o que roda nas páginas (aviso em Shadow DOM, para não brigar com o CSS do site)
- `src/fundo.js`: guarda a lista e os enganos, atualiza a lista remota
- `src/opcoes.*`: configurações, enganos e a lista com as fontes

## Privacidade

A extensão não coleta nada. Ela lê o texto das páginas **no seu navegador** para procurar os nomes; nada sai da
sua máquina. A única requisição de rede é baixar a lista do GitHub, e só se você configurar isso.

## Contribuir

Novas acusações, atualizações (arquivamento, denúncia, absolvição), perfis e enganos: veja
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE).
