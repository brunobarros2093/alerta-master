# Segurança

A extensão roda em todas as páginas que a pessoa abre. Uma falha aqui afeta o navegador de todo mundo que a instalou,
então segurança vem antes de qualquer funcionalidade.

## Como relatar uma vulnerabilidade

**Não abra issue pública.** Use o relato privado do GitHub:
<https://github.com/brunobarros2093/alerta-master/security/advisories/new>

Diga o que encontrou, como reproduzir e o impacto. Respondemos em até 7 dias e combinamos a correção e a divulgação
com você.

## O que já está protegido

- **Nada sai do navegador.** A extensão lê só o link do autor de cada post e o endereço do site, localmente. Não há telemetria, conta, servidor
  próprio nem coleta de dados.
- **Única requisição de rede**: baixar `data/envolvidos.json` deste repositório. A lista baixada passa pela mesma
  validação dos testes (tipos, tamanhos, `https://` em todo link, teto de 2 MB e de 3.000 fichas) e não substitui a
  embutida se for mais antiga. Uma lista adulterada não consegue injetar código: todo texto é inserido como texto
  (`textContent`), nunca como HTML.
- **Permissões mínimas**: `storage`, `alarms` e acesso de rede só a `raw.githubusercontent.com`. Nenhuma página
  consegue falar com a extensão (sem `externally_connectable`).
- **Aviso isolado**: o aviso vive num Shadow DOM fechado; o site não lê nem altera os botões.
- **Repositório**: `main` protegida (PR com revisão do mantenedor, teste obrigatório, sem push forçado),
  CODEOWNERS, Actions fixadas por commit com permissão só de leitura, Dependabot, varredura de segredos.

## Escopo

Estão no escopo: execução de código, vazamento de dados da página, desvio da validação da lista, abuso das mensagens
entre página e extensão, e qualquer forma de terceiros alterarem o que a extensão marca.

Informação errada numa ficha **não** é vulnerabilidade: use a issue "Correção ou fato novo".
