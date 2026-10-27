import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AM = require('../src/nucleo.js');
const lista = JSON.parse(readFileSync(new URL('../data/envolvidos.json', import.meta.url), 'utf8'));
const soVeiculos = AM.criarBuscador(lista.envolvidos);
const todos = AM.criarBuscador(lista.envolvidos, { alcance: 'todos' });
const ids = (achados) => achados.map((e) => e.id).sort();
const porId = (id) => lista.envolvidos.find((e) => e.id === id);

test('a lista publicada passa na validação', () => {
  assert.deepEqual(AM.validarLista(lista), []);
});

test('perfil do autor: acha o veículo sem depender de maiúscula nem de @', () => {
  assert.deepEqual(ids(soVeiculos.doPerfil('x', 'CNNBrasil')), ['cnn-brasil']);
  assert.deepEqual(ids(soVeiculos.doPerfil('x', '@estadao')), ['estadao']);
  assert.deepEqual(ids(soVeiculos.doPerfil('instagram', 'metropoles')), ['metropoles']);
  assert.deepEqual(soVeiculos.doPerfil('x', 'g1'), []);
});

test('por padrão só veículos: perfil de pessoa da lista não esconde nada', () => {
  assert.deepEqual(soVeiculos.doPerfil('x', 'HugoMottaPB'), []);
  assert.deepEqual(ids(todos.doPerfil('x', 'HugoMottaPB')), ['hugo-motta']);
});

test('link de perfil: lê rede e perfil do endereço', () => {
  assert.deepEqual(AM.perfilDaUrl('https://x.com/CNNBrasil/status/123'), { rede: 'x', perfil: 'cnnbrasil' });
  assert.deepEqual(AM.perfilDaUrl('https://twitter.com/estadao'), { rede: 'x', perfil: 'estadao' });
  assert.deepEqual(AM.perfilDaUrl('https://www.instagram.com/metropoles/'), { rede: 'instagram', perfil: 'metropoles' });
  assert.deepEqual(AM.perfilDaUrl('https://www.youtube.com/@estadao'), { rede: 'youtube', perfil: 'estadao' });
  assert.equal(AM.perfilDaUrl('https://g1.globo.com/x'), null);
  assert.equal(AM.perfilDaUrl('javascript:alert(1)'), null);
  assert.deepEqual(ids(soVeiculos.doLinkDePerfil('https://x.com/CNNBrasil/status/1')), ['cnn-brasil']);
});

test('endereço com % solto não derruba a leitura do perfil', () => {
  assert.deepEqual(AM.perfilDaUrl('https://x.com/%E0%A4%A/status/1'), { rede: 'x', perfil: '%e0%a4%a' });
});

test('site: acha o veículo pelo domínio, inclusive subdomínio', () => {
  assert.deepEqual(ids(soVeiculos.doSite('https://www.estadao.com.br/politica/algo')), ['estadao']);
  assert.deepEqual(ids(soVeiculos.doSite('https://valor.globo.com/financas/x')), ['valor-economico']);
  assert.deepEqual(ids(soVeiculos.doSite('https://politica.estadao.com.br/x')), ['estadao']);
  assert.deepEqual(soVeiculos.doSite('https://g1.globo.com/x'), []);
  assert.deepEqual(soVeiculos.doSite('https://naoestadao.com.br/'), []);
});

test('decidir respeita gravidade, ações configuradas e enganos', () => {
  const config = AM.configPadrao();
  const base = { config, enganos: [], host: 'x.com', assinatura: 'abc' };

  const r = AM.decidir([porId('cnn-brasil'), porId('metropoles')], base);
  assert.equal(r.acao, 'esconder');
  assert.equal(r.fichas[0].id, 'metropoles');

  const soMarcando = { ...base, config: AM.mesclarConfig({ acoes: { patrocinado: 'marcar' } }) };
  assert.equal(AM.decidir([porId('cnn-brasil')], soMarcando).acao, 'marcar');

  const ignorando = { ...base, config: AM.mesclarConfig({ acoes: { patrocinado: 'ignorar' } }) };
  assert.equal(AM.decidir([porId('cnn-brasil')], ignorando), null);

  const noPost = { ...base, enganos: [{ id: 'cnn-brasil', escopo: 'post', assinatura: 'abc' }] };
  assert.equal(AM.decidir([porId('cnn-brasil')], noPost), null);
  assert.ok(AM.decidir([porId('cnn-brasil')], { ...noPost, assinatura: 'outro' }));

  const noSite = { ...base, enganos: [{ id: 'cnn-brasil', escopo: 'site', host: 'x.com' }] };
  assert.equal(AM.decidir([porId('cnn-brasil')], noSite), null);
  assert.ok(AM.decidir([porId('cnn-brasil')], { ...noSite, host: 'instagram.com' }));
});

test('padrão: toda situação esconde e o alcance é só veículos', () => {
  const config = AM.configPadrao();
  for (const acao of Object.values(config.acoes)) assert.equal(acao, 'esconder');
  assert.equal(config.alcance, 'veiculos');
});

test('mesclarConfig descarta valor inválido e completa o que falta', () => {
  const c = AM.mesclarConfig({ acoes: { 'foi-preso': 'apagar', citado: 'marcar' }, alcance: 'tudo' });
  assert.equal(c.acoes['foi-preso'], 'esconder');
  assert.equal(c.acoes.citado, 'marcar');
  assert.equal(c.acoes.patrocinado, 'esconder');
  assert.equal(c.alcance, 'veiculos');
  assert.equal(c.ativo, true);
  assert.equal(AM.mesclarConfig({ alcance: 'todos' }).alcance, 'todos');
});

test('validação recusa ficha sem fonte, perfil repetido e veículo sem perfil nem site', () => {
  const ficha = (extra) => ({ apelidos: [], papel: 'x', situacao: 'citado', resumo: 'resumo com mais de vinte letras', defesa: 'x', fontes: [{ veiculo: 'v', titulo: 't', url: 'https://a.b' }], verificado_em: '2026-10-27', ...extra });
  const ruim = {
    atualizado_em: '2026-10-27',
    envolvidos: [
      ficha({ id: 'a', tipo: 'pessoa', nome: 'Fulano', fontes: [] }),
      ficha({ id: 'b', tipo: 'pessoa', nome: 'Beltrano', redes: { x: ['beltrano'] } }),
      ficha({ id: 'c', tipo: 'pessoa', nome: 'Ciclano', situacao: 'condenado', redes: { x: ['Beltrano'] }, fonte_redes: 'https://w.d', fontes: [{ veiculo: 'v', titulo: 't', url: 'http://a.b' }] }),
      ficha({ id: 'd', tipo: 'veiculo', nome: 'Jornal Sem Endereço' })
    ]
  };
  const erros = AM.validarLista(ruim).join('\n');
  assert.match(erros, /a: precisa de ao menos uma fonte/);
  assert.match(erros, /b: fonte_redes/);
  assert.match(erros, /c: situacao precisa ser/);
  assert.match(erros, /c: "x:beltrano" já é usado por b/);
  assert.match(erros, /c: fonte sem url https/);
  assert.match(erros, /d: veículo precisa de perfil/);
});

test('validação recusa lista com campos gigantes ou de tipo errado', () => {
  const base = { id: 'a', tipo: 'pessoa', nome: 'Fulano de Tal', apelidos: [], papel: 'x', situacao: 'citado', resumo: 'resumo com mais de vinte letras', defesa: 'x', fontes: [{ veiculo: 'v', titulo: 't', url: 'https://a.b' }], verificado_em: '2026-10-27' };
  const erros = (ficha, extra = {}) => AM.validarLista({ atualizado_em: '2026-10-27', ...extra, envolvidos: [ficha] }).join('\n');
  assert.match(erros({ ...base, apelidos: Array.from({ length: 11 }, (_, i) => `Nome ${i}`) }), /apelidos passa de 10/);
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
