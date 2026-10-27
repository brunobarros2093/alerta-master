// Lógica compartilhada pela extensão (conteúdo, fundo e opções) e pelos testes em Node.
// Não toca em DOM nem em APIs do navegador.
(function (raiz) {
  'use strict';

  // A ordem define qual rótulo aparece quando um mesmo post casa com várias fichas: vale a mais grave.
  const SITUACOES = {
    'foi-preso': { ordem: 0, rotulo: 'Foi preso no caso Master', acao: 'esconder' },
    'alvo-de-operacao': { ordem: 1, rotulo: 'Alvo de operação da PF no caso Master', acao: 'esconder' },
    'investigado': { ordem: 2, rotulo: 'Investigado no caso Master', acao: 'esconder' },
    'pagamento-suspeito': { ordem: 3, rotulo: 'Recebeu do Banco Master pagamentos apontados como suspeitos', acao: 'esconder' },
    'delator': { ordem: 4, rotulo: 'Fez delação no caso Master', acao: 'esconder' },
    'liquidada': { ordem: 5, rotulo: 'Liquidada pelo Banco Central no caso Master', acao: 'esconder' },
    'patrocinado': { ordem: 6, rotulo: 'Recebeu publicidade ou patrocínio do Banco Master', acao: 'esconder' },
    'citado': { ordem: 7, rotulo: 'Citado no caso Master', acao: 'esconder' },
    // Agenda, voo, manuscrito, doação declarada, votação ou encontro: o registro existe, mas sozinho não indica irregularidade.
    'registro-indireto': { ordem: 8, rotulo: 'Aparece em registros ligados a Vorcaro', acao: 'esconder' }
  };
  const ACOES = ['esconder', 'marcar', 'ignorar'];
  const TIPOS = ['pessoa', 'veiculo', 'empresa'];
  const ESCOPOS_ENGANO = ['post', 'site', 'sempre'];
  // Quais fichas a extensão procura: só veículos de imprensa (padrão) ou todas as que têm perfil ou site.
  const ALCANCES = ['veiculos', 'todos'];
  const REDES = {
    x: ['x.com', 'twitter.com'],
    instagram: ['instagram.com'],
    facebook: ['facebook.com'],
    tiktok: ['tiktok.com'],
    youtube: ['youtube.com'],
    threads: ['threads.net']
  };
  const REDE_POR_HOST = {};
  for (const [rede, hosts] of Object.entries(REDES)) for (const h of hosts) REDE_POR_HOST[h] = rede;

  const DATA = /^\d{4}-\d{2}(-\d{2})?$/;
  const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const HANDLE = /^[A-Za-z0-9_.]{2,40}$/;
  const DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
  // Tetos para uma lista baixada (ou um PR) não conseguir travar o navegador de quem usa a extensão.
  const LIMITES = {
    fichas: 3000,
    apelidos: 10,
    perfisPorRede: 5,
    dominios: 10,
    fontes: 10,
    texto: { nome: 120, papel: 200, resumo: 600, defesa: 600, aviso: 600, titulo: 300, veiculo: 120, url: 500, termo: 120 }
  };
  const TAMANHO_MAXIMO_LISTA = 2 * 1024 * 1024;

  function normalizar(texto) {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function hostBase(host) {
    return String(host).toLowerCase().replace(/^(www|m|mobile|web)\./, '');
  }

  function lerUrl(href) {
    try {
      const url = new URL(href);
      return /^https?:$/.test(url.protocol) ? url : null;
    } catch {
      return null;
    }
  }

  // Perfil de rede social a partir do link dele: https://x.com/CNNBrasil/status/1 → { rede: 'x', perfil: 'cnnbrasil' }.
  function perfilDaUrl(href) {
    const url = lerUrl(href);
    if (!url) return null;
    const rede = REDE_POR_HOST[hostBase(url.hostname)];
    if (!rede) return null;
    let perfil = url.pathname.split('/').filter(Boolean)[0] || '';
    try {
      perfil = decodeURIComponent(perfil);
    } catch {
      // "%" solto no endereço: segue com o texto cru em vez de derrubar a varredura da página.
    }
    perfil = perfil.replace(/^@/, '').toLowerCase();
    return perfil ? { rede, perfil } : null;
  }

  // Assinatura curta de um trecho, para o "é engano" valer só para aquele post.
  function assinatura(texto) {
    const t = normalizar(texto).slice(0, 500);
    let h = 0x811c9dc5;
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  // A extensão não procura nomes no texto (marcaria toda resposta ou citação): só o AUTOR do post
  // (perfil na rede social) e o SITE de destino.
  function criarBuscador(envolvidos, { alcance = 'veiculos' } = {}) {
    const porPerfil = {};
    const dominios = [];
    for (const e of envolvidos) {
      if (alcance === 'veiculos' && e.tipo !== 'veiculo') continue;
      for (const [rede, perfis] of Object.entries(e.redes || {})) {
        porPerfil[rede] = porPerfil[rede] || new Map();
        for (const p of perfis) porPerfil[rede].set(p.toLowerCase(), e);
      }
      for (const d of e.dominios || []) dominios.push([d, e]);
    }

    function doPerfil(rede, perfil) {
      const e = porPerfil[rede] && porPerfil[rede].get(String(perfil).replace(/^@/, '').toLowerCase());
      return e ? [e] : [];
    }

    function doLinkDePerfil(href) {
      const p = perfilDaUrl(href);
      return p ? doPerfil(p.rede, p.perfil) : [];
    }

    function doSite(href) {
      const url = lerUrl(href);
      if (!url) return [];
      const host = hostBase(url.hostname);
      return dominios.filter(([d]) => host === d || host.endsWith('.' + d)).map(([, e]) => e);
    }

    return { doPerfil, doLinkDePerfil, doSite };
  }

  function semDuplicados(achados) {
    return [...new Map(achados.map((e) => [e.id, e])).values()];
  }

  function maisGrave(achados) {
    return achados.reduce((pior, e) => (!pior || SITUACOES[e.situacao].ordem < SITUACOES[pior.situacao].ordem ? e : pior), null);
  }

  function enganado(e, enganos, host, assin) {
    return enganos.some((g) => g.id === e.id && (g.escopo === 'sempre' || (g.escopo === 'site' && g.host === host) || (g.escopo === 'post' && g.assinatura === assin)));
  }

  // Decide o que fazer com um trecho: devolve { acao, fichas } ou null.
  function decidir(achados, { config, enganos, host, assinatura: assin }) {
    const fichas = semDuplicados(achados).filter((e) => !enganado(e, enganos, host, assin) && config.acoes[e.situacao] !== 'ignorar');
    if (!fichas.length) return null;
    fichas.sort((a, b) => SITUACOES[a.situacao].ordem - SITUACOES[b.situacao].ordem);
    const acao = fichas.some((e) => config.acoes[e.situacao] === 'esconder') ? 'esconder' : 'marcar';
    return { acao, fichas };
  }

  function configPadrao() {
    const acoes = {};
    for (const [k, s] of Object.entries(SITUACOES)) acoes[k] = s.acao;
    return { ativo: true, alcance: 'veiculos', acoes, sitesIgnorados: [], urlLista: '' };
  }

  function mesclarConfig(salva) {
    const padrao = configPadrao();
    const c = Object.assign({}, padrao, salva || {});
    c.acoes = Object.assign({}, padrao.acoes, (salva && salva.acoes) || {});
    for (const k of Object.keys(c.acoes)) if (!ACOES.includes(c.acoes[k])) c.acoes[k] = padrao.acoes[k];
    if (!ALCANCES.includes(c.alcance)) c.alcance = padrao.alcance;
    return c;
  }

  function validarLista(dados) {
    const erros = [];
    if (!dados || typeof dados !== 'object') return ['a lista não é um objeto JSON'];
    if (!DATA.test(dados.atualizado_em || '')) erros.push('atualizado_em precisa ser AAAA-MM-DD');
    if (!Array.isArray(dados.envolvidos)) return erros.concat('envolvidos precisa ser uma lista');
    if (dados.envolvidos.length > LIMITES.fichas) return erros.concat(`a lista passa de ${LIMITES.fichas} fichas`);
    if ('aviso' in dados && (typeof dados.aviso !== 'string' || dados.aviso.length > LIMITES.texto.aviso)) erros.push(`aviso precisa ser texto de até ${LIMITES.texto.aviso} caracteres`);
    const ids = new Set();
    const termos = new Map();
    const usar = (chave, id) => {
      if (termos.has(chave) && termos.get(chave) !== id) erros.push(`${id}: "${chave}" já é usado por ${termos.get(chave)}`);
      termos.set(chave, id);
    };
    for (let [i, e] of dados.envolvidos.entries()) {
      if (!e || typeof e !== 'object' || Array.isArray(e)) {
        erros.push(`#${i}: ficha precisa ser um objeto`);
        continue;
      }
      const id = typeof e.id === 'string' ? e.id.slice(0, 60) : `#${i}`;
      const erro = (msg) => erros.push(`${id}: ${msg}`);
      for (const campo of ['nome', 'papel', 'resumo', 'defesa']) {
        if (typeof e[campo] === 'string' && e[campo].length > LIMITES.texto[campo]) erro(`${campo} passa de ${LIMITES.texto[campo]} caracteres`);
      }
      const teto = (campo, max) => {
        if (Array.isArray(e[campo]) && e[campo].length > max) erro(`${campo} passa de ${max} itens`);
      };
      teto('apelidos', LIMITES.apelidos);
      teto('dominios', LIMITES.dominios);
      teto('fontes', LIMITES.fontes);
      for (const t of Array.isArray(e.apelidos) ? e.apelidos : []) {
        if (typeof t !== 'string' || t.length > LIMITES.texto.termo) erro(`apelido precisa ser texto de até ${LIMITES.texto.termo} caracteres`);
      }
      if ('redes' in e && (typeof e.redes !== 'object' || e.redes === null || Array.isArray(e.redes))) {
        erro('redes precisa ser um objeto { rede: [perfis] }');
        e = { ...e, redes: {} };
      }
      if ('dominios' in e && !Array.isArray(e.dominios)) {
        erro('dominios precisa ser uma lista');
        e = { ...e, dominios: [] };
      }
      if (!ID.test(e.id || '')) erro('id precisa ser minúsculo-com-hifens');
      if (ids.has(e.id)) erro('id repetido');
      ids.add(e.id);
      if (!TIPOS.includes(e.tipo)) erro(`tipo precisa ser ${TIPOS.join(', ')}`);
      if (!SITUACOES[e.situacao]) erro(`situacao precisa ser ${Object.keys(SITUACOES).join(', ')}`);
      for (const campo of ['nome', 'papel', 'defesa']) if (typeof e[campo] !== 'string' || !e[campo].trim()) erro(`${campo} é obrigatório`);
      if (typeof e.resumo !== 'string' || e.resumo.length < 20 || e.resumo.length > 600) erro('resumo precisa ter de 20 a 600 caracteres');
      if (!DATA.test(e.verificado_em || '')) erro('verificado_em precisa ser AAAA-MM-DD');
      if (!Array.isArray(e.apelidos)) erro('apelidos precisa ser uma lista (pode ser vazia)');
      if (typeof e.nome === 'string') usar(`nome:${normalizar(e.nome)}`, e.id);
      const redes = e.redes || {};
      for (const [rede, handles] of Object.entries(redes)) {
        if (!REDES[rede]) erro(`rede desconhecida: ${rede} (use ${Object.keys(REDES).join(', ')})`);
        if (!Array.isArray(handles)) {
          erro(`redes.${rede} precisa ser uma lista`);
          continue;
        }
        if (handles.length > LIMITES.perfisPorRede) erro(`redes.${rede} passa de ${LIMITES.perfisPorRede} perfis`);
        for (const h of handles) {
          if (!HANDLE.test(h)) erro(`perfil inválido em ${rede}: ${h} (sem @, sem link)`);
          else usar(`${rede}:${h.toLowerCase()}`, e.id);
        }
      }
      if (Object.keys(redes).length && !/^https:\/\//.test(e.fonte_redes || '')) erro('fonte_redes (link que comprova os perfis) é obrigatório quando há redes');
      for (const d of e.dominios || []) {
        if (!DOMINIO.test(d)) erro(`domínio inválido: ${d} (sem https://, sem www.)`);
        else usar(`dominio:${d}`, e.id);
      }
      // Veículo sem perfil nem site nunca seria encontrado pela extensão.
      if (e.tipo === 'veiculo' && !Object.keys(redes).length && !(e.dominios || []).length) erro('veículo precisa de perfil (redes) ou site (dominios)');
      if (!Array.isArray(e.fontes) || !e.fontes.length) erro('precisa de ao menos uma fonte');
      else {
        for (const f of e.fontes) {
          if (!/^https:\/\//.test((f && f.url) || '')) erro('fonte sem url https');
          if (!f || !f.veiculo || !f.titulo) erro('fonte precisa de veiculo e titulo');
          for (const campo of ['url', 'veiculo', 'titulo']) {
            if (f && typeof f[campo] === 'string' && f[campo].length > LIMITES.texto[campo]) erro(`${campo} da fonte passa de ${LIMITES.texto[campo]} caracteres`);
          }
          if (f && f.data && !DATA.test(f.data)) erro(`data da fonte inválida: ${f.data}`);
        }
      }
    }
    return erros;
  }

  const api = {
    SITUACOES, ACOES, TIPOS, REDES, ESCOPOS_ENGANO, ALCANCES, LIMITES, TAMANHO_MAXIMO_LISTA,
    normalizar, hostBase, perfilDaUrl, assinatura, criarBuscador, decidir, maisGrave, semDuplicados,
    configPadrao, mesclarConfig, validarLista
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  raiz.AlertaMaster = api;
})(globalThis);
