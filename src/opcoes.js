(async function () {
  'use strict';
  const api = globalThis.browser ?? globalThis.chrome;
  const AM = globalThis.AlertaMaster;

  // Habilita o botão de relato de engano (abre uma issue já preenchida).
  const URL_REPOSITORIO = 'https://github.com/brunobarros2093/alerta-master';
  const ROTULO_ACAO = { esconder: 'Esconder', marcar: 'Só marcar', ignorar: 'Ignorar' };
  const ROTULO_ESCOPO = { post: 'só aquele post', site: 'no site', sempre: 'em todo lugar' };
  const ROTULO_TIPO = { pessoa: 'Pessoa', veiculo: 'Veículo de imprensa', empresa: 'Empresa' };
  const PERFIL = {
    x: (h) => `https://x.com/${h}`,
    instagram: (h) => `https://www.instagram.com/${h}/`,
    facebook: (h) => `https://www.facebook.com/${h}`,
    tiktok: (h) => `https://www.tiktok.com/@${h}`,
    youtube: (h) => `https://www.youtube.com/@${h}`,
    threads: (h) => `https://www.threads.net/@${h}`
  };

  const $ = (id) => document.getElementById(id);

  function el(tag, attrs, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'onclick') n.addEventListener('click', v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat()) if (f != null && f !== false) n.append(f);
    return n;
  }

  const estado = await api.runtime.sendMessage({ tipo: 'estado' });
  let config = estado.config;
  const lista = estado.lista;
  const porId = new Map(lista.envolvidos.map((e) => [e.id, e]));

  async function salvar() {
    await api.storage.sync.set({ config });
    $('salvo').textContent = 'Salvo.';
    setTimeout(() => ($('salvo').textContent = ''), 1500);
  }

  // ---------- configurações ----------
  $('aviso-lista').textContent = lista.aviso || '';
  $('ativo').checked = config.ativo;
  $('ativo').addEventListener('change', () => {
    config.ativo = $('ativo').checked;
    salvar();
  });

  $('alcance').value = config.alcance;
  $('alcance').addEventListener('change', () => {
    config.alcance = $('alcance').value;
    salvar();
  });

  for (const [chave, s] of Object.entries(AM.SITUACOES)) {
    const select = el('select', { id: `acao-${chave}` }, AM.ACOES.map((a) => el('option', { value: a, selected: config.acoes[chave] === a }, ROTULO_ACAO[a])));
    select.addEventListener('change', () => {
      config.acoes[chave] = select.value;
      salvar();
    });
    $('acoes').append(el('label', { for: `acao-${chave}` }, s.rotulo), select);
  }

  $('sites').value = config.sitesIgnorados.join('\n');
  $('sites').addEventListener('change', () => {
    config.sitesIgnorados = $('sites').value.split(/\s+/).map((s) => AM.hostBase(s.replace(/^https?:\/\//, '').split('/')[0])).filter(Boolean);
    $('sites').value = config.sitesIgnorados.join('\n');
    salvar();
  });

  $('url-lista').value = config.urlLista;
  $('url-lista').addEventListener('change', () => {
    const url = $('url-lista').value.trim();
    if (url && !url.startsWith('https://raw.githubusercontent.com/')) {
      $('estado-lista').textContent = 'Use um endereço https://raw.githubusercontent.com/… (o único domínio que a extensão pode baixar).';
      return;
    }
    config.urlLista = url;
    salvar();
  });

  $('atualizar').addEventListener('click', async () => {
    $('estado-lista').textContent = 'Atualizando…';
    const r = await api.runtime.sendMessage({ tipo: 'atualizar-lista' });
    const origem = r.origem === 'embutida' ? 'lista da própria extensão' : 'lista baixada';
    $('estado-lista').textContent = `${r.total} fichas, atualizada em ${r.atualizado_em} (${origem}). ${r.aviso || ''} Recarregue esta página para ver a lista nova.`;
  });

  // ---------- enganos ----------
  async function desenharEnganos() {
    const { enganos = [] } = await api.storage.local.get('enganos');
    const alvo = $('enganos');
    alvo.replaceChildren();
    if (!enganos.length) {
      alvo.append(el('p', { class: 'dica' }, 'Nenhum por enquanto. Use o botão "É engano" no aviso quando a extensão marcar algo errado.'));
      return enganos;
    }
    enganos.forEach((g, i) => {
      const ficha = porId.get(g.id);
      alvo.append(el('div', { class: 'engano-item' },
        el('strong', {}, ficha ? ficha.nome : g.id),
        el('span', {}, `${ROTULO_ESCOPO[g.escopo] || g.escopo}${g.host ? ` · ${g.host}` : ''}`),
        el('span', { class: 'dica' }, new Date(g.em).toLocaleDateString('pt-BR')),
        el('button', {
          type: 'button',
          onclick: async () => {
            enganos.splice(i, 1);
            await api.storage.local.set({ enganos });
            desenharEnganos();
          }
        }, 'Remover'),
        g.trecho ? el('span', { class: 'trecho' }, `"${g.trecho}"`) : null
      ));
    });
    return enganos;
  }

  function relatorio(enganos) {
    return JSON.stringify({ lista_atualizada_em: lista.atualizado_em, enganos: enganos.map(({ id, escopo, host, trecho, endereco }) => ({ id, escopo, host, trecho, endereco })) }, null, 2);
  }

  $('copiar-enganos').addEventListener('click', async () => {
    const { enganos = [] } = await api.storage.local.get('enganos');
    await navigator.clipboard.writeText(relatorio(enganos));
    $('copiar-enganos').textContent = 'Copiado!';
    setTimeout(() => ($('copiar-enganos').textContent = 'Copiar para relatar'), 1500);
  });

  if (URL_REPOSITORIO) {
    const { enganos = [] } = await api.storage.local.get('enganos');
    const corpo = `Enganos marcados na extensão:\n\n\`\`\`json\n${relatorio(enganos).slice(0, 6000)}\n\`\`\``;
    $('relatar').href = `${URL_REPOSITORIO}/issues/new?labels=engano&title=${encodeURIComponent('Engano na marcação')}&body=${encodeURIComponent(corpo)}`;
    $('relatar').hidden = false;
  }

  await desenharEnganos();

  // ---------- fichas ----------
  function desenharFicha(e) {
    const redes = Object.entries(e.redes || {}).flatMap(([rede, handles]) => handles.map((h) => el('a', { href: PERFIL[rede](h), target: '_blank', rel: 'noopener' }, `${rede}: @${h}`)));
    return el('article', { class: 'ficha', id: e.id, 'data-busca': AM.normalizar([e.nome, ...(e.apelidos || []), e.papel, ...(e.dominios || [])].join(' ')) },
      el('h4', {}, e.nome, el('span', { class: 'etiqueta' }, ROTULO_TIPO[e.tipo])),
      el('div', { class: 'papel' }, e.papel),
      el('p', {}, e.resumo),
      el('p', { class: 'defesa' }, el('strong', {}, 'Versão dele(a) ou da empresa: '), e.defesa),
      el('ul', {}, e.fontes.map((f) => el('li', {}, el('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.titulo), ` (${f.veiculo}${f.data ? `, ${f.data}` : ''})`))),
      redes.length || (e.dominios || []).length
        ? el('p', { class: 'meta' },
          redes.length ? ['Perfis: ', ...redes.flatMap((a, i) => (i ? [', ', a] : [a]))] : null,
          redes.length && (e.dominios || []).length ? ' · ' : null,
          (e.dominios || []).length ? `Sites: ${e.dominios.join(', ')}` : null,
          e.fonte_redes ? [' · ', el('a', { href: e.fonte_redes, target: '_blank', rel: 'noopener' }, 'fonte dos perfis')] : null)
        : null,
      el('p', { class: 'meta' }, `Conferido em ${e.verificado_em}`)
    );
  }

  $('resumo-lista').textContent = `${lista.envolvidos.length} fichas, lista atualizada em ${lista.atualizado_em}.`;

  for (const [chave, s] of Object.entries(AM.SITUACOES)) {
    const fichas = lista.envolvidos.filter((e) => e.situacao === chave).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!fichas.length) continue;
    $('fichas').append(el('div', { class: 'grupo', 'data-grupo': chave }, el('h3', {}, `${s.rotulo} (${fichas.length})`), fichas.map(desenharFicha)));
  }

  $('filtro').addEventListener('input', () => {
    const termo = AM.normalizar($('filtro').value);
    for (const ficha of document.querySelectorAll('.ficha')) ficha.hidden = termo && !ficha.dataset.busca.includes(termo);
    for (const grupo of document.querySelectorAll('.grupo')) grupo.hidden = ![...grupo.querySelectorAll('.ficha')].some((f) => !f.hidden);
  });

  if (location.hash) {
    let id = location.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // "#" malformado: tenta o texto cru.
    }
    const alvo = document.getElementById(id);
    if (alvo) alvo.scrollIntoView();
  }
})();
