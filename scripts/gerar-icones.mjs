// Gera os ícones PNG (triângulo de alerta) sem dependências. Uso: node scripts/gerar-icones.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const AMARELO = [232, 170, 36];
const ESCURO = [31, 26, 14];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function bloco(tipo, dados) {
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}

// Cobertura do pixel por amostragem 4x4, para bordas suaves.
function cor(x, y, n) {
  const amostras = 4;
  let tri = 0;
  let marca = 0;
  for (let i = 0; i < amostras; i++) {
    for (let j = 0; j < amostras; j++) {
      const px = (x + (i + 0.5) / amostras) / n;
      const py = (y + (j + 0.5) / amostras) / n;
      const topo = 0.06;
      const base = 0.92;
      const meia = ((py - topo) / (base - topo)) * 0.47;
      const dentro = py >= topo && py <= base && Math.abs(px - 0.5) <= meia;
      if (!dentro) continue;
      tri++;
      const haste = Math.abs(px - 0.5) <= 0.055 && py >= 0.36 && py <= 0.68;
      const ponto = (px - 0.5) ** 2 + (py - 0.79) ** 2 <= 0.065 ** 2;
      if (haste || ponto) marca++;
    }
  }
  const total = amostras * amostras;
  const alfa = Math.round((tri / total) * 255);
  const t = tri ? marca / tri : 0;
  const rgb = AMARELO.map((c, k) => Math.round(c * (1 - t) + ESCURO[k] * t));
  return [...rgb, alfa];
}

function png(n) {
  const linhas = [];
  for (let y = 0; y < n; y++) {
    const linha = [0];
    for (let x = 0; x < n; x++) linha.push(...cor(x, y, n));
    linhas.push(Buffer.from(linha));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(Buffer.concat(linhas))),
    bloco('IEND', Buffer.alloc(0))
  ]);
}

const pasta = fileURLToPath(new URL('../icones/', import.meta.url));
mkdirSync(pasta, { recursive: true });
for (const n of [16, 32, 48, 128]) writeFileSync(`${pasta}${n}.png`, png(n));
console.log('Ícones gerados em', pasta);
