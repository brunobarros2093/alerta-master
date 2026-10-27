// Valida data/envolvidos.json (ou o arquivo passado) e mostra o resumo por situação.
// Uso: node scripts/validar-lista.mjs [caminho]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { validarLista, SITUACOES } = require('../src/nucleo.js');

const caminho = process.argv[2] || fileURLToPath(new URL('../data/envolvidos.json', import.meta.url));
const dados = JSON.parse(readFileSync(caminho, 'utf8'));
const erros = validarLista(dados);

if (erros.length) {
  console.error(`${erros.length} problema(s) em ${caminho}:`);
  for (const e of erros) console.error(`  - ${e}`);
  process.exit(1);
}

const contagem = {};
for (const e of dados.envolvidos) contagem[e.situacao] = (contagem[e.situacao] || 0) + 1;
console.log(`Lista válida: ${dados.envolvidos.length} fichas, atualizada em ${dados.atualizado_em}.`);
for (const s of Object.keys(SITUACOES)) if (contagem[s]) console.log(`  ${String(contagem[s]).padStart(3)}  ${SITUACOES[s].rotulo}`);
