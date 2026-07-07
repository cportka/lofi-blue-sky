/**
 * Generate a palette reference sheet (assets/palettes/palettes.svg) straight from the curated
 * ramps in the core. Deterministic, no browser — run after `npm run build:core`.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTES } from '../packages/core/dist/palettes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const to255 = (c) => Math.round(Math.min(1, Math.max(0, c)) * 255);
const rgb = (c) => `rgb(${to255(c[0])},${to255(c[1])},${to255(c[2])})`;

const W = 720;
const rowH = 44;
const padTop = 56;
const labelW = 150;
const barX = labelW + 16;
const barW = W - barX - 20;
const H = padTop + PALETTES.length * rowH + 20;

let defs = '';
let rows = '';
PALETTES.forEach((p, i) => {
  const gid = `g${i}`;
  const stops = p.stops.map((s) => `<stop offset="${(s.t * 100).toFixed(1)}%" stop-color="${rgb(s.c)}"/>`).join('');
  defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>`;
  const y = padTop + i * rowH;
  rows +=
    `<text x="20" y="${y + 26}" class="lbl">${p.name}</text>` +
    `<text x="20" y="${y + 38}" class="fam">${p.family}</text>` +
    `<rect x="${barX}" y="${y + 6}" width="${barW}" height="${rowH - 16}" rx="4" fill="url(#${gid})" stroke="rgba(0,0,0,0.25)"/>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="#0b0a12"/>
<text x="20" y="34" fill="#ece6d6" font-family="ui-monospace,Menlo,monospace" font-size="18">lofi blue sky — palette DNA</text>
<style>
  .lbl { fill:#ece6d6; font-family:ui-monospace,Menlo,monospace; font-size:12px; }
  .fam { fill:#a9a294; font-family:ui-monospace,Menlo,monospace; font-size:10px; }
</style>
${rows}
</svg>
`;

await mkdir(path.join(ROOT, 'assets/palettes'), { recursive: true });
await writeFile(path.join(ROOT, 'assets/palettes/palettes.svg'), svg);
await writeFile(
  path.join(ROOT, 'assets/palettes/palettes.json'),
  JSON.stringify(
    PALETTES.map((p) => ({ id: p.id, name: p.name, family: p.family, stops: p.stops })),
    null,
    2,
  ) + '\n',
);
console.log(`Wrote assets/palettes/palettes.svg (${PALETTES.length} ramps) + palettes.json`);
