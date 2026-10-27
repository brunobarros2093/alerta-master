// Roda em cada página: procura nomes, perfis e domínios da lista e cobre ou marca o trecho.
(async function () {
  'use strict';
  const api = globalThis.browser ?? globalThis.chrome;
  const AM = globalThis.AlertaMaster;
  if (!AM) return;

  const host = AM.hostBase(location.hostname);
  let estado;
  try {
    estado = await api.runtime.sendMessage({ tipo: 'estado' });
  } catch {
    return;
  }
  if (!estado || !estado.lista) return;

  let { config, enganos } = estado;
  const buscador = AM.criarBuscador(estado.lista.envolvidos);

  // Blocos que costumam ser "um post" ou "uma notícia". Quando dois casam, vale o mais interno.
  const SELETOR = [
    'article',
    '[role="article"]',
    '[data-testid="tweet"]',
    'div.g',
    'div.MjjYud',
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'shreddit-post',
    '[data-pagelet^="FeedUnit"]'
  ].join(',');

  const ESTILO = `
    :host { all: initial; display: block; }
    /* O aviso flutua sobre o post (nunca entra no fluxo dele): no X o post é uma linha flex e o aviso virava uma coluna. */
    :host([data-modo="esconder"]) { position: absolute; inset: 0; z-index: 2147483000; }
    :host([data-modo="marcar"]) { position: absolute; top: 8px; right: 8px; z-index: 2147483000; max-width: min(380px, calc(100% - 16px)); }
    .cobertura { position: absolute; inset: 0; box-sizing: border-box; padding: 12px; display: flex; align-items: center;
      justify-content: center; background: rgba(15, 13, 8, .45); border-radius: inherit; }
    .cobertura .aviso { width: 100%; max-width: 480px; max-height: 100%; overflow: auto; box-sizing: border-box; margin: 0;
      flex-direction: column; align-items: center; text-align: center; padding: 14px 16px; gap: 6px; }
    .cobertura .acoes { margin: 4px 0 0; justify-content: center; }
    /* No card em coluna, flex-basis viraria altura: volta ao tamanho do conteúdo. */
    .cobertura .nota, .cobertura .engano { flex-basis: auto; }
    /* Itens centralizados não encolhem sozinhos: limita a largura para as linhas de botões quebrarem. */
    .cobertura .aviso { overflow-x: hidden; }
    .cobertura .aviso > * { max-width: 100%; box-sizing: border-box; }
    .cobertura .engano { width: 100%; }
    .cobertura .engano { justify-content: center; }
    .aviso { font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1f1a0e; background: #fff4d6;
      border: 1px solid #e0b84c; border-left: 4px solid #c7901a; border-radius: 8px; padding: 10px 12px; margin: 6px 0;
      display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
    .aviso.marcar { background: #f3f4f6; border-color: #c9ccd1; border-left-color: #6b7280; padding: 6px 10px; font-size: 13px; }
    .selo { font-weight: 700; }
    .nomes { font-weight: 600; }
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
      .nota { color: #cbbf9c; }
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
    const lista = fichas.map((f) => f.nome);
    return lista.length > 3 ? `${lista.slice(0, 3).join(', ')} e mais ${lista.length - 3}` : lista.join(', ');
  }

  // Monta o aviso dentro de um Shadow DOM para o CSS do site não bagunçar (nem ser bagunçado).
  function criarAviso({ decisao, naPagina, aoMostrar, aoEngano }) {
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

  // ---------- página inteira (site, perfil ou manchete) ----------
  let avisoPagina = null;
  let manchete = null;

  function avaliarPagina() {
    manchete = document.querySelector('h1');
    const achados = buscador.naUrl(location.href, null).concat(buscador.noTexto(`${document.title}\n${manchete ? manchete.textContent : ''}`));
    const assinatura = AM.assinatura(location.origin + location.pathname);
    const decisao = AM.decidir(achados, { config, enganos, host, assinatura });
    if (!decisao) return;
    const html = document.documentElement;
    avisoPagina = criarAviso({
      decisao,
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

  // ---------- posts e notícias ----------
  let vistos = new WeakMap();

  function avaliarBloco(bloco) {
    const texto = bloco.textContent || '';
    let achados = buscador.noTexto(texto);
    for (const a of bloco.querySelectorAll('a[href]')) achados = achados.concat(buscador.naUrl(a.href, host));
    // Um link de perfil sozinho não passa pelas exceções de texto; aplica aqui também.
    achados = buscador.filtrarPorTexto(AM.semDuplicados(achados), AM.normalizar(texto));
    const assinatura = AM.assinatura(texto);
    return { decisao: AM.decidir(achados, { config, enganos, host, assinatura }), assinatura, texto };
  }

  function aplicar(bloco, { decisao, assinatura, texto }) {
    bloco.setAttribute('data-am', decisao.acao);
    const aviso = criarAviso({
      decisao,
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
    if (!config.ativo) return;
    const candidatos = [];
    for (const bloco of document.querySelectorAll(SELETOR)) {
      if (bloco.closest('[data-am]') || bloco.querySelector('[data-am]')) continue;
      if (manchete && avisoPagina && bloco.contains(manchete)) continue;
      const tamanho = (bloco.textContent || '').length;
      if (tamanho < 20 || vistos.get(bloco) === tamanho) continue;
      vistos.set(bloco, tamanho);
      const resultado = avaliarBloco(bloco);
      if (resultado.decisao) candidatos.push([bloco, resultado]);
    }
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
    if (area === 'sync' && mudancas.config) config = AM.mesclarConfig(mudancas.config.newValue);
    else if (area === 'local' && mudancas.enganos) enganos = mudancas.enganos.newValue || [];
    else return;
    reavaliar();
  });

  if (!config.ativo || ignorado()) return;
  avaliarPagina();
  varrer();
  new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  // Sites de página única trocam de "página" sem recarregar.
  let enderecoAnterior = location.href;
  setInterval(() => {
    if (location.href === enderecoAnterior) return;
    enderecoAnterior = location.href;
    liberarPagina();
    avaliarPagina();
  }, 1000);
})();
