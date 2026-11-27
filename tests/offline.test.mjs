// The service worker must cache every file the app needs, or offline mode breaks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const files = JSON.parse(sw.match(/const FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

test('every cached file exists', () => {
  for (const f of files.filter((f) => f !== './')) assert.ok(existsSync(join(root, f)), `${f} is listed in sw.js but missing`);
});

test('every script, stylesheet, deck and icon is cached', () => {
  const need = [
    ...readdirSync(join(root, 'js')).map((f) => `js/${f}`),
    ...readdirSync(join(root, 'data/cards')).map((f) => `data/cards/${f}`),
    ...readdirSync(join(root, 'icons')).filter((f) => f !== 'maskable.svg').map((f) => `icons/${f}`),
    'css/styles.css', 'index.html', 'data/manifest.json', 'manifest.webmanifest'
  ];
  for (const f of need) assert.ok(files.includes(f), `${f} is not cached by sw.js`);
});

test('every deck in the manifest is cached', () => {
  const m = JSON.parse(readFileSync(join(root, 'data/manifest.json'), 'utf8'));
  for (const d of m.decks) assert.ok(files.includes(d.file), `${d.file} is not cached`);
});
