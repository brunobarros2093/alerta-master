<div align="center">

<img src="icones/128.png" width="96" alt="">

# Alerta Master

**Saiba quem está ligado ao caso Banco Master enquanto navega, com fonte e a versão de cada um.**

[![testes](https://github.com/brunobarros2093/alerta-master/actions/workflows/testes.yml/badge.svg)](https://github.com/brunobarros2093/alerta-master/actions/workflows/testes.yml)
![licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)
![Chrome e Firefox](https://img.shields.io/badge/Chrome%20%7C%20Firefox-Manifest%20V3-orange)
![sem coleta de dados](https://img.shields.io/badge/dados%20coletados-nenhum-brightgreen)

[Instalar](#instalar) · [Como funciona](#como-funciona) · [Contribuir](#contribuir) · [Aviso legal](docs/aviso-legal.md) · [Segurança](SECURITY.md)

</div>

---

O Alerta Master é uma extensão gratuita e de código aberto. Quando um post, notícia, perfil ou site cita alguém
ligado ao caso Banco Master, ela mostra um aviso com **o que aconteceu**, **a fonte** e **a versão da pessoa ou
empresa**. Você decide se quer ver o conteúdo, só marcar ou ignorar.

> **Investigação não é condenação.** Até a data da lista, ninguém foi condenado no caso. A extensão informa; quem
> decide o que ler é você.

## Como funciona

| | |
|---|---|
| 🧾 **Posts e notícias** | Em X, Facebook, Instagram, Reddit, YouTube, Google e sites de notícia, o post que cita alguém da lista fica coberto por um card com a situação, o nome e o botão **Mostrar**. No modo *Só marcar*, vira um selo pequeno no canto. |
| 👤 **Perfis e sites** | Abriu o perfil (pelo @) ou o site de alguém da lista? Aparece um aviso no topo da página. |
| ❓ **Por quê?** | Abre a ficha: resumo, versão do citado, fontes e data da última conferência. |
| 🙅 **É engano** | Tira a marcação só daquele post, daquele nome no site, ou em todo lugar. Fica só no seu navegador; enganos recorrentes viram correção para todos. |
| ⚙️ **Você manda** | Para cada situação: *Esconder*, *Só marcar* ou *Ignorar*. Dá para desligar em sites específicos. |
| 🔒 **Privacidade** | Nada sai do seu navegador. A única requisição é baixar a lista deste repositório. |

### As situações

Da mais grave à mais leve. Cada ficha usa a mais grave que **já aconteceu**, nunca mais do que a fonte sustenta.

| Situação | Padrão |
|---|---|
| Foi preso no caso Master | Esconder |
| Alvo de operação da PF | Esconder |
| Investigado | Esconder |
| Recebeu pagamentos apontados como suspeitos | Esconder |
| Fez delação | Esconder |
| Empresa liquidada pelo Banco Central | Esconder |
| Recebeu publicidade ou patrocínio declarado | Esconder |
| Citado no caso | Esconder |
| Aparece em registros ligados a Vorcaro (agenda, voo, doação declarada, votação, encontro) | Esconder |

Veículos de imprensa são reconhecidos pelo **site e pelos perfis**, nunca pelo nome escrito no texto: "segundo o
Estadão" não ganha selo. Nomes comuns só disparam quando o texto também fala do caso.

## Instalar

As versões nas lojas ainda não foram publicadas. Para usar agora:

**Chrome, Edge ou Brave**

1. Baixe o projeto (*Code → Download ZIP*) e descompacte.
2. Abra `chrome://extensions` e ligue o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta.

**Firefox**

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária** e escolha o `manifest.json`.

Clique no ícone ⚠ para abrir as opções e a lista completa.

## Contribuir

A lista cresce com a ajuda de quem acompanha o caso. Toda contribuição passa por revisão antes de entrar.

| Quero... | Como |
|---|---|
| Sugerir alguém novo | [Issue "Sugerir ficha nova"](https://github.com/brunobarros2093/alerta-master/issues/new?template=nova-ficha.yml) |
| Corrigir ou atualizar uma ficha | [Issue "Correção ou fato novo"](https://github.com/brunobarros2093/alerta-master/issues/new?template=correcao.yml) |
| Relatar marcação errada | [Issue "Engano na marcação"](https://github.com/brunobarros2093/alerta-master/issues/new?template=engano.yml) |
| Editar a lista ou o código | Fork → branch → pull request (o modelo do PR traz a checklist) |
| Relatar falha de segurança | [Relato privado](https://github.com/brunobarros2093/alerta-master/security/advisories/new), nunca issue pública |

Antes de editar a lista, leia o **[guia de contribuição](CONTRIBUTING.md)**. Ele explica quem entra, que situação
usar e como escrever uma ficha. Resumo das regras:

- ✅ fato publicado por veículo identificável, com link;
- ✅ versão do citado em toda ficha;
- ✅ perfis só com prova (Wikidata ou site oficial);
- ❌ opinião, adjetivo, rumor, print sem origem ou conversa vazada;
- ❌ dados de pessoas privadas (parentes, funcionários).

### Rodando localmente

Sem dependências; precisa de Node 20 ou mais novo.

```sh
npm test        # valida a lista e roda os testes
npm run validar # só a lista, com resumo por situação
```

Para ver o aviso funcionando sem instalar a extensão, sirva a pasta (`python -m http.server 8765`) e abra
`http://127.0.0.1:8765/tests/pagina-teste.html`.

<details>
<summary><b>Estrutura do projeto</b></summary>

| Caminho | O que é |
|---|---|
| `data/envolvidos.json` | A lista: fichas com situação, resumo, defesa, fontes, perfis e sites |
| `src/nucleo.js` | Busca de nomes, perfis e domínios, decisão e validação (usado pela extensão e pelos testes) |
| `src/conteudo.js`, `src/conteudo.css` | O que roda nas páginas (aviso em Shadow DOM) |
| `src/fundo.js` | Guarda a lista e os enganos, baixa a lista atualizada |
| `src/opcoes.*` | Configurações, enganos e a lista com as fontes |
| `tests/` | Testes do núcleo e página de teste manual |
| `scripts/` | Validador da lista e gerador de ícones |

</details>

<details>
<summary><b>Campos de uma ficha</b></summary>

| Campo | Para quê |
|---|---|
| `nome`, `apelidos` | Nomes que disparam o aviso (sem diferença de acento ou maiúscula) |
| `redes`, `fonte_redes` | Perfis em X, Instagram, Facebook, TikTok, YouTube e Threads, e o link que os comprova |
| `dominios` | Sites do veículo ou da empresa |
| `situacao` | Uma das nove situações acima |
| `resumo`, `defesa`, `fontes` | O que aconteceu, a versão do citado e onde foi publicado |
| `exige_contexto` | Nome comum: só dispara se o trecho também falar do caso |
| `nao_e_quando` | Frases que indicam homônimo (ex.: "basquete" para o jogador Augusto Lima) |
| `casar_nome` | `false` para não casar pelo nome no texto |

</details>

## Segurança

A extensão roda em todas as páginas, então o código que entra é revisado com rigor: `main` protegida, revisão
obrigatória, testes em todo PR, Actions fixadas por commit, lista remota validada e com teto de tamanho, e nenhum
texto inserido como HTML. Detalhes em [SECURITY.md](SECURITY.md).

## Aviso legal

O projeto reúne fatos já publicados, sempre com fonte e com a versão de cada citado, e respeita a presunção de
inocência. Quem está na lista pode pedir correção, com prioridade. Princípios editoriais, LGPD e processo de
correção: [docs/aviso-legal.md](docs/aviso-legal.md).

## Licença

Código sob [MIT](LICENSE). As matérias citadas pertencem aos seus veículos.
