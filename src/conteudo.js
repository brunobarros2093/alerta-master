// Roda em cada página: cobre os posts cujo AUTOR é um perfil da lista e avisa nos sites da lista.
// Não procura nomes no texto: uma resposta ou citação que menciona alguém não é post dele.
(async function () {
  'use strict';
  const api = globalThis.browser ?? globalThis.chrome;
  const AM = globalThis.AlertaMaster;
  if (!AM) return;

  // ALERTA_MASTER_HOST_TESTE só existe na página de teste (tests/pagina-teste.html). Na extensão o script roda
  // num mundo isolado e não enxerga variáveis da página, então um site não consegue forjar o próprio host.
  const host = AM.hostBase(globalThis.ALERTA_MASTER_HOST_TESTE || location.hostname);
  let estado;
  try {
    estado = await api.runtime.sendMessage({ tipo: 'estado' });
  } catch {
    return;
  }
  if (!estado || !estado.lista) return;

  let { config, enganos } = estado;
  let buscador = AM.criarBuscador(estado.lista.envolvidos, { alcance: config.alcance });

  // Em cada rede: o que é um post e onde fica o link do autor dele (o primeiro do bloco; o de um post
  // citado vem depois).
  const LEITORES = [
    { hosts: ['x.com', 'twitter.com'], posts: 'article[data-testid="tweet"]', autor: '[data-testid="User-Name"] a[href]' },
    { hosts: ['instagram.com'], posts: 'article', autor: 'header a[href]' },
    { hosts: ['facebook.com'], posts: '[role="article"]', autor: 'h2 a[href], h3 a[href], strong a[href]' },
    {
      hosts: ['youtube.com'],
      posts: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer',
      autor: 'ytd-channel-name a[href], #channel-name a[href]'
    }
  ];
  // Fora das redes, só listas de links para outros sites: o resultado some quando o link principal vai para um site da lista.
  const LISTAS_DE_LINKS = [
    { hosts: /(^|\.)google\.[a-z.]+$/, posts: 'div.g, div.MjjYud', link: (bloco) => (bloco.querySelector('a[href] h3') || {}).parentElement },
    { hosts: /(^|\.)reddit\.com$/, posts: 'shreddit-post[content-href]', link: (bloco) => ({ href: bloco.getAttribute('content-href') }) }
  ];
  const leitor = LEITORES.find((l) => l.hosts.includes(host));
  const lista = leitor ? null : LISTAS_DE_LINKS.find((l) => l.hosts.test(host));

  const ESTILO = `
    :host { all: initial; display: block; }
    /* O aviso flutua sobre o post (nunca entra no fluxo dele): no X o post é uma linha flex e o aviso virava uma coluna. */
    :host([data-modo="esconder"]) { position: absolute; inset: 0; z-index: 2147483000; }
    :host([data-modo="marcar"]) { position: absolute; top: 8px; right: 8px; z-index: 2147483000; max-width: min(380px, calc(100% - 16px)); }
    .cobertura { position: absolute; inset: 0; box-sizing: border-box; padding: 12px; display: flex; align-items: center;
      justify-content: center; background: rgba(15, 13, 8, .45); border-radius: inherit; }
    .cobertura .aviso { width: 100%; max-width: 480px; max-height: 100%; overflow: auto; overflow-x: hidden; box-sizing: border-box;
      margin: 0; flex-direction: column; align-items: center; text-align: center; padding: 14px 16px; gap: 6px; }
    /* Itens centralizados não encolhem sozinhos: limita a largura para as linhas de botões quebrarem. */
    .cobertura .aviso > * { max-width: 100%; box-sizing: border-box; }
    .cobertura .acoes { margin: 4px 0 0; justify-content: center; }
    /* No card em coluna, flex-basis viraria altura: volta ao tamanho do conteúdo. */
    .cobertura .nota, .cobertura .engano, .cobertura .origem { flex-basis: auto; }
    .cobertura .engano { width: 100%; justify-content: center; }
    .aviso { font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1f1a0e; background: #fff4d6;
      border: 1px solid #e0b84c; border-left: 4px solid #c7901a; border-radius: 8px; padding: 10px 12px; margin: 6px 0;
      display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
    .aviso.marcar { background: #f3f4f6; border-color: #c9ccd1; border-left-color: #6b7280; padding: 6px 10px; font-size: 13px; }
    .selo { font-weight: 700; }
    .nomes { font-weight: 600; }
    .origem { flex-basis: 100%; font-size: 13px; color: #5b5340; }
    .origem b { color: #1f1a0e; }
    .nota { color: #5b5340; font-size: 12px; flex-basis: 100%; }
    .marcar .nota { display: none; }
    .acoes { display: flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
    button { font: inherit; font-size: 12px; cursor: pointer; border-radius: 6px; padding: 3px 9px;
      border: 1px solid #b9a36a; background: #fff; color: #1f1a0e; }
    button:hover { background: #fdf0c8; }
    button:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 1px; }
    .engano { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; }
    [hidden] { display: none !important; }
    .pagina { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2147483647; width: min(680px, calc(100vw - 32px));
      margin: 0; box-shadow: 0 8px 30px rgba(0,0,0,.25); }
    @media (prefers-color-scheme: dark) {
      .aviso { background: #2b2412; color: #f5ecd4; border-color: #8a6a1f; border-left-color: #e0b84c; }
      .aviso.marcar { background: #23262b; color: #e5e7eb; border-color: #4b5563; border-left-color: #9ca3af; }
      .nota, .origem { color: #cbbf9c; }
      .origem b { color: #f5ecd4; }
      button { background: #1b1b1b; color: #f5ecd4; border-color: #8a6a1f; }
      button:hover { background: #3a3018; }
    }
  `;

  function el(tag, attrs, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'onclick') n.addEventListener('click', v);
      else n.setAttribute(k, v);
    }
    for (const f of filhos) if (f != null) n.append(f);
    return n;
  }

  function nomes(fichas) {
    const todos = fichas.map((f) => f.nome);
    return todos.length > 3 ? `${todos.slice(0, 3).join(', ')} e mais ${todos.length - 3}` : todos.join(', ');
  }

  // Monta o aviso dentro de um Shadow DOM para o CSS do site não bagunçar (nem ser bagunçado).
  // origem = de onde veio o bloqueio, ex.: { rotulo: 'Perfil', valor: '@CNNBrasil' }.
  function criarAviso({ decisao, origem, naPagina, aoMostrar, aoEngano }) {
    const hospedeiro = el('div', { class: 'am-host', 'data-am-host': '1', 'data-modo': naPagina ? 'pagina' : decisao.acao });
    // Sites como o X abrem o post com qualquer clique dentro dele; o clique nos botões do aviso para aqui.
    for (const tipo of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown']) {
      hospedeiro.addEventListener(tipo, (evento) => evento.stopPropagation());
    }
    const raiz = hospedeiro.attachShadow({ mode: 'closed' });
    const { acao, fichas } = decisao;
    const principal = fichas[0];
    const sujeito = fichas.length === 1 ? principal.nome : 'estes nomes';

    // As opções de engano tomam o lugar dos botões e da nota, para o card não crescer além do post.
    const alternarEngano = (aberto) => {
      engano.toggleAttribute('hidden', !aberto);
      acoes.toggleAttribute('hidden', aberto);
      nota.toggleAttribute('hidden', aberto);
    };
    const engano = el('div', { class: 'engano', hidden: '' },
      'Não marcar mais:',
      el('button', { onclick: () => aoEngano('post') }, naPagina ? 'só esta página' : 'só este post'),
      el('button', { onclick: () => aoEngano('site') }, `${sujeito} neste site`),
      el('button', { onclick: () => aoEngano('sempre') }, `${sujeito} em todo lugar`),
      el('button', { onclick: () => alternarEngano(false) }, 'Cancelar')
    );
    const acoes = el('span', { class: 'acoes' },
      acao === 'esconder' ? el('button', { onclick: aoMostrar }, naPagina ? 'Ver a página mesmo assim' : 'Mostrar') : null,
      el('button', { onclick: () => api.runtime.sendMessage({ tipo: 'abrir-ficha', id: principal.id }) }, 'Por quê?'),
      el('button', { onclick: () => alternarEngano(true) }, 'É engano')
    );
    const nota = el('span', { class: 'nota' }, principal.situacao === 'registro-indireto'
      ? 'Aparecer num registro (agenda, voo, doação, evento) não indica irregularidade. Veja qual é o registro em "Por quê?".'
      : 'Investigação não é condenação. Veja as fontes e a versão de cada um em "Por quê?".');

    const aviso = el('div', { class: `aviso ${acao}${naPagina ? ' pagina' : ''}`, role: 'note', 'aria-label': 'Alerta Master' },
      el('span', { class: 'selo' }, `⚠ ${AM.SITUACOES[principal.situacao].rotulo}:`),
      el('span', { class: 'nomes' }, nomes(fichas)),
      origem ? el('span', { class: 'origem' }, `${origem.rotulo}: `, el('b', {}, origem.valor)) : null,
      acoes,
      nota,
      engano
    );
    const cobre = !naPagina && acao === 'esconder';
    raiz.append(el('style', {}, ESTILO), cobre ? el('div', { class: 'cobertura' }, aviso) : aviso);
    return hospedeiro;
  }

  function registrarEngano(escopo, decisao, assinatura, trecho) {
    const registros = decisao.fichas.map((f) => ({ id: f.id, escopo, host, assinatura, trecho, endereco: location.href }));
    // Atualiza já a cópia local para o efeito ser imediato, sem esperar o storage.onChanged.
    enganos = enganos.concat(registros);
    api.runtime.sendMessage({ tipo: 'engano', registros });
  }

  // ---------- página inteira: site de um veículo (ou empresa) da lista ----------
  let avisoPagina = null;

  function avaliarPagina() {
    const achados = buscador.doSite(location.href);
    const assinatura = AM.assinatura(location.origin + location.pathname);
    const decisao = AM.decidir(achados, { config, enganos, host, assinatura });
    if (!decisao) return;
    const html = document.documentElement;
    avisoPagina = criarAviso({
      decisao,
      origem: { rotulo: 'Site', valor: host },
      naPagina: true,
      aoMostrar: liberarPagina,
      aoEngano: (escopo) => {
        registrarEngano(escopo, decisao, assinatura, document.title);
        liberarPagina();
      }
    });
    html.append(avisoPagina);
    if (decisao.acao === 'esconder') html.setAttribute('data-am-pagina', 'esconder');
  }

  function liberarPagina() {
    document.documentElement.removeAttribute('data-am-pagina');
    if (avisoPagina) avisoPagina.remove();
    avisoPagina = null;
  }

  // ---------- posts ----------
  let vistos = new WeakMap();

  // Devolve as fichas do autor do post (redes) ou do site para onde o resultado aponta (busca, Reddit).
  function quemPublicou(bloco) {
    if (leitor) {
      const link = bloco.querySelector(leitor.autor);
      const perfil = link && AM.perfilDaUrl(link.href);
      if (!perfil) return null;
      return { achados: buscador.doPerfil(perfil.rede, perfil.perfil), origem: { rotulo: 'Perfil', valor: `@${perfil.perfil}` } };
    }
    const link = lista.link(bloco);
    if (!link || !link.href) return null;
    let alvo;
    try {
      alvo = new URL(link.href, location.href);
    } catch {
      return null;
    }
    return { achados: buscador.doSite(alvo.href), origem: { rotulo: 'Site', valor: AM.hostBase(alvo.hostname) } };
  }

  function aplicar(bloco, { decisao, origem, assinatura, texto }) {
    bloco.setAttribute('data-am', decisao.acao);
    const aviso = criarAviso({
      decisao,
      origem,
      naPagina: false,
      aoMostrar: () => liberar(bloco),
      aoEngano: (escopo) => {
        // O storage.onChanged reavalia o resto da página quando o engano vale para o site todo.
        registrarEngano(escopo, decisao, assinatura, texto.replace(/\s+/g, ' ').trim().slice(0, 200));
        liberar(bloco);
      }
    });
    bloco.prepend(aviso);
  }

  function liberar(bloco) {
    bloco.setAttribute('data-am', 'liberado');
    const aviso = bloco.querySelector(':scope > .am-host');
    if (aviso) aviso.remove();
  }

  function varrer() {
    if (!config.ativo || (!leitor && !lista)) return;
    const candidatos = [];
    for (const bloco of document.querySelectorAll((leitor || lista).posts)) {
      if (bloco.closest('[data-am]') || bloco.querySelector('[data-am]')) continue;
      const texto = bloco.textContent || '';
      // Redes montam o post aos poucos: reavalia enquanto o texto cresce.
      if (vistos.get(bloco) === texto.length) continue;
      vistos.set(bloco, texto.length);
      const autoria = quemPublicou(bloco);
      if (!autoria || !autoria.achados.length) continue;
      const assinatura = AM.assinatura(texto);
      const decisao = AM.decidir(autoria.achados, { config, enganos, host, assinatura });
      if (decisao) candidatos.push([bloco, { decisao, origem: autoria.origem, assinatura, texto }]);
    }
    // Na busca do Google um resultado pode vir dentro de outro bloco: vale o mais interno.
    for (const [bloco, resultado] of candidatos) {
      if (candidatos.some(([outro]) => outro !== bloco && bloco.contains(outro))) continue;
      aplicar(bloco, resultado);
    }
  }

  function limparTudo() {
    for (const bloco of document.querySelectorAll('[data-am]')) {
      if (bloco.getAttribute('data-am') === 'liberado') continue;
      const aviso = bloco.querySelector(':scope > .am-host');
      if (aviso) aviso.remove();
      bloco.removeAttribute('data-am');
    }
    liberarPagina();
    vistos = new WeakMap();
  }

  function reavaliar() {
    limparTudo();
    if (!config.ativo || ignorado()) return;
    avaliarPagina();
    varrer();
  }

  function ignorado() {
    return config.sitesIgnorados.some((s) => host === s || host.endsWith('.' + s));
  }

  let agendado = null;
  function agendar() {
    if (agendado) return;
    agendado = setTimeout(() => {
      agendado = null;
      varrer();
    }, 500);
  }

  api.storage.onChanged.addListener((mudancas, area) => {
    if (area === 'sync' && mudancas.config) {
      config = AM.mesclarConfig(mudancas.config.newValue);
      buscador = AM.criarBuscador(estado.lista.envolvidos, { alcance: config.alcance });
    } else if (area === 'local' && mudancas.enganos) enganos = mudancas.enganos.newValue || [];
    else return;
    reavaliar();
  });

  if (!config.ativo || ignorado()) return;
  avaliarPagina();
  varrer();
  if (leitor || lista) new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  // Sites de página única trocam de "página" sem recarregar.
  let enderecoAnterior = location.href;
  setInterval(() => {
    if (location.href === enderecoAnterior) return;
    enderecoAnterior = location.href;
    liberarPagina();
    avaliarPagina();
  }, 1000);
})();
