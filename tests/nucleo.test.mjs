import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AM = require('../src/nucleo.js');
const lista = JSON.parse(readFileSync(new URL('../data/envolvidos.json', import.meta.url), 'utf8'));
const buscador = AM.criarBuscador(lista.envolvidos);
const ids = (achados) => achados.map((e) => e.id).sort();

test('a lista publicada passa na validação', () => {
  assert.deepEqual(AM.validarLista(lista), []);
});

test('acha nome sem depender de acento nem de caixa', () => {
  assert.deepEqual(ids(buscador.noTexto('Defesa de DANIEL vorcaro recorre ao STF')), ['daniel-vorcaro']);
  assert.deepEqual(ids(buscador.noTexto('O ex-governador Claudio Castro falou hoje')), ['claudio-castro']);
});

test('não acha nome dentro de outra palavra', () => {
  assert.deepEqual(buscador.noTexto('jaques wagnerismo é um termo inventado'), []);
});

test('acha o perfil pelo @ no texto', () => {
  assert.deepEqual(ids(buscador.noTexto('Resposta a @HugoMottaPB sobre a pauta')), ['hugo-motta']);
});

test('nome comum só dispara com contexto do caso', () => {
  assert.deepEqual(buscador.noTexto('Augusto Lima venceu o torneio de xadrez da escola'), []);
  assert.deepEqual(ids(buscador.noTexto('Augusto Lima, ex-sócio do Master, depõe à PF')), ['augusto-lima']);
});

test('exceção global (nao_e_quando) evita o homônimo', () => {
  assert.deepEqual(buscador.noTexto('Augusto Lima faz 20 pontos no basquete e a PF não tem nada com isso'), []);
});

test('veículo não casa pelo nome no texto, só pelo domínio', () => {
  assert.deepEqual(buscador.noTexto('Segundo o Estadão, a votação fica para amanhã'), []);
  assert.deepEqual(ids(buscador.naUrl('https://www.estadao.com.br/politica/algo', 'g1.globo.com')), ['estadao']);
  assert.deepEqual(ids(buscador.naUrl('https://valor.globo.com/financas/x', 'google.com')), ['valor-economico']);
});

test('link interno do próprio portal não conta como link para o domínio', () => {
  assert.deepEqual(buscador.naUrl('https://www.metropoles.com/brasil/x', 'metropoles.com'), []);
});

test('acha perfil em links de redes sociais', () => {
  assert.deepEqual(ids(buscador.naUrl('https://x.com/HugoMottaPB/status/123', 'x.com')), ['hugo-motta']);
  assert.deepEqual(ids(buscador.naUrl('https://www.instagram.com/hugomottapb/', 'instagram.com')), ['hugo-motta']);
  assert.deepEqual(ids(buscador.naUrl('https://twitter.com/estadao', 'x.com')), ['estadao']);
  assert.deepEqual(buscador.naUrl('https://x.com/home', 'x.com'), []);
});

test('decidir respeita gravidade, ações configuradas e enganos', () => {
  const config = AM.configPadrao();
  const porId = (id) => lista.envolvidos.find((e) => e.id === id);
  const base = { config, enganos: [], host: 'exemplo.com', assinatura: 'abc' };

  const r = AM.decidir([porId('hugo-motta'), porId('daniel-vorcaro')], base);
  assert.equal(r.acao, 'esconder');
  assert.equal(r.fichas[0].id, 'daniel-vorcaro');

  assert.equal(AM.decidir([porId('hugo-motta')], base).acao, 'esconder');

  const soMarcando = { ...base, config: AM.mesclarConfig({ acoes: { citado: 'marcar' } }) };
  assert.equal(AM.decidir([porId('hugo-motta')], soMarcando).acao, 'marcar');
  assert.equal(AM.decidir([porId('hugo-motta'), porId('daniel-vorcaro')], soMarcando).acao, 'esconder');

  const ignorando = { ...base, config: AM.mesclarConfig({ acoes: { citado: 'ignorar' } }) };
  assert.equal(AM.decidir([porId('hugo-motta')], ignorando), null);

  const noPost = { ...base, enganos: [{ id: 'hugo-motta', escopo: 'post', assinatura: 'abc' }] };
  assert.equal(AM.decidir([porId('hugo-motta')], noPost), null);
  assert.ok(AM.decidir([porId('hugo-motta')], { ...noPost, assinatura: 'outro' }));

  const noSite = { ...base, enganos: [{ id: 'hugo-motta', escopo: 'site', host: 'exemplo.com' }] };
  assert.equal(AM.decidir([porId('hugo-motta')], noSite), null);
  assert.ok(AM.decidir([porId('hugo-motta')], { ...noSite, host: 'outro.com' }));
});

test('toda situação esconde por padrão e o rótulo é o da mais grave', () => {
  const config = AM.configPadrao();
  const porId = (id) => lista.envolvidos.find((e) => e.id === id);
  const base = { config, enganos: [], host: 'exemplo.com', assinatura: 'x' };
  for (const acao of Object.values(config.acoes)) assert.equal(acao, 'esconder');
  assert.deepEqual(ids(buscador.noTexto('Arthur Lira e Nikolas Ferreira votaram hoje')), ['arthur-lira', 'nikolas-ferreira']);
  assert.equal(AM.decidir([porId('arthur-lira')], base).acao, 'esconder');
  assert.equal(AM.decidir([porId('arthur-lira'), porId('ciro-nogueira')], base).fichas[0].id, 'ciro-nogueira');
});

test('nome ambíguo de registro indireto exige contexto', () => {
  assert.deepEqual(buscador.noTexto('Rui Costa vence etapa do ciclismo em Portugal'), []);
  assert.deepEqual(ids(buscador.noTexto('Rui Costa assinou o decreto do Credcesta; PF analisa o caso Master')), ['rui-costa']);
});

test('mesclarConfig descarta ação inválida e completa as que faltam', () => {
  const c = AM.mesclarConfig({ acoes: { 'foi-preso': 'apagar', citado: 'marcar' } });
  assert.equal(c.acoes['foi-preso'], 'esconder');
  assert.equal(c.acoes.citado, 'marcar');
  assert.equal(c.acoes.patrocinado, 'esconder');
  assert.equal(c.ativo, true);
});

test('validação recusa ficha sem fonte, nome de uma palavra e termo repetido', () => {
  const ruim = {
    atualizado_em: '2026-10-27',
    envolvidos: [
      { id: 'a', tipo: 'pessoa', nome: 'Ratinho', apelidos: [], papel: 'x', situacao: 'citado', resumo: 'resumo com mais de vinte letras', defesa: 'x', fontes: [], verificado_em: '2026-10-27' },
      { id: 'b', tipo: 'pessoa', nome: 'Fulano de Tal', apelidos: [], papel: 'x', situacao: 'citado', resumo: 'resumo com mais de vinte letras', defesa: 'x', redes: { x: ['fulano'] }, fontes: [{ veiculo: 'v', titulo: 't', url: 'https://a.b' }], verificado_em: '2026-10-27' },
      { id: 'c', tipo: 'pessoa', nome: 'Fulano de Tal', apelidos: [], papel: 'x', situacao: 'condenado', resumo: 'resumo com mais de vinte letras', defesa: 'x', fontes: [{ veiculo: 'v', titulo: 't', url: 'http://a.b' }], verificado_em: '2026-10-27' }
    ]
  };
  const erros = AM.validarLista(ruim).join('\n');
  assert.match(erros, /a: precisa de ao menos uma fonte/);
  assert.match(erros, /a: "Ratinho" precisa ter nome e sobrenome/);
  assert.match(erros, /b: fonte_redes/);
  assert.match(erros, /c: situacao precisa ser/);
  assert.match(erros, /c: "fulano de tal" já é usado por b/);
  assert.match(erros, /c: fonte sem url https/);
});

test('endereço com % solto não derruba a busca', () => {
  assert.deepEqual(buscador.naUrl('https://x.com/%E0%A4%A/status/1', 'x.com'), []);
});

test('validação recusa lista com campos gigantes ou de tipo errado', () => {
  const base = { id: 'a', tipo: 'pessoa', nome: 'Fulano de Tal', apelidos: [], papel: 'x', situacao: 'citado', resumo: 'resumo com mais de vinte letras', defesa: 'x', fontes: [{ veiculo: 'v', titulo: 't', url: 'https://a.b' }], verificado_em: '2026-10-27' };
  const erros = (ficha, extra = {}) => AM.validarLista({ atualizado_em: '2026-10-27', ...extra, envolvidos: [ficha] }).join('\n');
  assert.match(erros({ ...base, apelidos: Array.from({ length: 11 }, (_, i) => `Nome Numero ${i}`) }), /apelidos passa de 10/);
  assert.match(erros({ ...base, defesa: 'x'.repeat(601) }), /defesa passa de 600/);
  assert.match(erros({ ...base, redes: 'x' }), /redes precisa ser um objeto/);
  assert.match(erros({ ...base, redes: { x: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'] }, fonte_redes: 'https://w.d' }), /passa de 5 perfis/);
  assert.match(erros(base, { aviso: 'x'.repeat(601) }), /aviso precisa ser texto/);
  assert.match(AM.validarLista({ atualizado_em: '2026-10-27', envolvidos: [null] }).join('\n'), /ficha precisa ser um objeto/);
  assert.match(AM.validarLista({ atualizado_em: '2026-10-27', envolvidos: new Array(3001).fill(base) }).join('\n'), /passa de 3000 fichas/);
});

test('assinatura é estável e ignora acento e espaços', () => {
  assert.equal(AM.assinatura('Olá  mundo'), AM.assinatura('ola mundo'));
  assert.notEqual(AM.assinatura('um post'), AM.assinatura('outro post'));
});
