// Página de fundo: guarda a lista, os enganos locais e responde às páginas.
// No Chrome roda como service worker (importScripts); no Firefox o manifest já carrega nucleo.js antes.
if (typeof importScripts === 'function' && !globalThis.AlertaMaster) importScripts('nucleo.js');

const api = globalThis.browser ?? globalThis.chrome;
const AM = globalThis.AlertaMaster;

// Lista pública mais nova; só substitui a embutida se passar na validação e não for mais antiga.
// A pessoa pode trocar por outra (ex.: um fork) nas opções.
const URL_LISTA_PADRAO = 'https://raw.githubusercontent.com/brunobarros2093/alerta-master/main/data/envolvidos.json';
const HORAS_ENTRE_ATUALIZACOES = 12;

async function listaEmbutida() {
  const resposta = await fetch(api.runtime.getURL('data/envolvidos.json'));
  return resposta.json();
}

async function lerConfig() {
  const { config } = await api.storage.sync.get('config');
  return AM.mesclarConfig(config);
}

async function atualizarLista() {
  const embutida = await listaEmbutida();
  const config = await lerConfig();
  const url = config.urlLista || URL_LISTA_PADRAO;
  let lista = embutida;
  let origem = 'embutida';
  let aviso = '';
  if (url) {
    try {
      const resposta = await fetch(url, { cache: 'no-store' });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const texto = await resposta.text();
      if (texto.length > AM.TAMANHO_MAXIMO_LISTA) throw new Error('lista remota grande demais');
      const remota = JSON.parse(texto);
      const erros = AM.validarLista(remota);
      if (erros.length) aviso = `Lista remota recusada: ${erros[0]}`;
      else if (remota.atualizado_em < embutida.atualizado_em) aviso = 'Lista remota é mais antiga que a da extensão; mantida a da extensão.';
      else {
        lista = remota;
        origem = url;
      }
    } catch (erro) {
      aviso = `Não foi possível baixar a lista remota (${erro.message}); mantida a da extensão.`;
    }
  }
  await api.storage.local.set({ lista, origemLista: origem, listaBaixadaEm: new Date().toISOString() });
  return { total: lista.envolvidos.length, atualizado_em: lista.atualizado_em, origem, aviso };
}

async function estado() {
  let { lista, enganos } = await api.storage.local.get(['lista', 'enganos']);
  if (!lista) {
    await atualizarLista();
    ({ lista } = await api.storage.local.get('lista'));
  }
  return { lista, enganos: enganos || [], config: await lerConfig() };
}

async function registrarEnganos(registros) {
  const { enganos = [] } = await api.storage.local.get('enganos');
  const chave = (g) => [g.id, g.escopo, g.host || '', g.assinatura || ''].join('|');
  const existentes = new Set(enganos.map(chave));
  for (const r of registros) {
    if (!AM.ESCOPOS_ENGANO.includes(r.escopo) || typeof r.id !== 'string') continue;
    const limpo = {
      id: r.id,
      escopo: r.escopo,
      host: String(r.host || ''),
      assinatura: String(r.assinatura || ''),
      trecho: String(r.trecho || '').slice(0, 200),
      endereco: String(r.endereco || '').slice(0, 300),
      em: new Date().toISOString()
    };
    if (!existentes.has(chave(limpo))) {
      enganos.push(limpo);
      existentes.add(chave(limpo));
    }
  }
  await api.storage.local.set({ enganos });
  return enganos.length;
}

api.runtime.onInstalled.addListener(() => {
  atualizarLista();
  api.alarms.create('atualizar-lista', { periodInMinutes: HORAS_ENTRE_ATUALIZACOES * 60 });
});
api.runtime.onStartup.addListener(atualizarLista);
api.alarms.onAlarm.addListener((alarme) => {
  if (alarme.name === 'atualizar-lista') atualizarLista();
});
api.action.onClicked.addListener(() => api.runtime.openOptionsPage());

api.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (!msg || typeof msg.tipo !== 'string') return false;
  if (msg.tipo === 'estado') {
    estado().then(responder);
    return true;
  }
  if (msg.tipo === 'engano') {
    registrarEnganos(Array.isArray(msg.registros) ? msg.registros : []).then((total) => responder({ total }));
    return true;
  }
  if (msg.tipo === 'atualizar-lista') {
    atualizarLista().then(responder);
    return true;
  }
  if (msg.tipo === 'abrir-ficha') {
    api.tabs.create({ url: api.runtime.getURL('src/opcoes.html') + '#' + encodeURIComponent(String(msg.id || '')) });
  }
  return false;
});
