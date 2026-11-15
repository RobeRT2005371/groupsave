// Writes translations-review.csv: every text in the app with its English original and each language,
// plus a "needs translation" flag, so native speakers can review and correct it in a spreadsheet.
// Usage (from the project folder):  node tools/export-translations.mjs
import { build } from '../frontend/node_modules/esbuild/lib/main.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'frontend', '.dict-bundle.mjs');
await build({ entryPoints: [path.join(root, 'frontend/src/i18n.jsx')], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.jsx': 'jsx' }, external: ['react'], logLevel: 'error', absWorkingDir: path.join(root, 'frontend') });
const { DICT, LANGS } = await import(pathToFileURL(out).href);
fs.rmSync(out);

const langs = LANGS.filter(([c]) => c !== 'en'); // order matches the slots in each entry
const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const header = ['App text (English)', ...langs.map(([, n]) => n), 'Languages still in English'];
const rows = [];
const missingByLang = Object.fromEntries(langs.map(([c]) => [c, 0]));
for (const [en, packed] of Object.entries(DICT)) {
  const parts = packed.split('|');
  const gaps = [];
  langs.forEach(([c, n], i) => { if (!parts[i]) { gaps.push(n); missingByLang[c]++; } });
  rows.push([en, ...langs.map((_, i) => parts[i] || ''), gaps.join(', ')]);
}
rows.sort((a, b) => (b[b.length - 1] ? 1 : 0) - (a[a.length - 1] ? 1 : 0) || a[0].localeCompare(b[0]));
fs.writeFileSync(path.join(root, 'translations-review.csv'), '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n'));
console.log(`Wrote translations-review.csv: ${rows.length} texts.`);
for (const [c, n] of langs) console.log(`  ${n.padEnd(12)} ${rows.length - missingByLang[c]} translated, ${missingByLang[c]} still English`);
