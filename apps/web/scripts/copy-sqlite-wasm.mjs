// Copies the sqlite-wasm runtime assets into public/ so the device worker can
// fetch them at runtime. Generated output — never committed (see .gitignore).
// Run: `pnpm --filter @chorify/web wasm` (once per fresh clone, and after
// every @sqlite.org/sqlite-wasm upgrade).
import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..');
const require = createRequire(import.meta.url);
const dist = join(
  dirname(require.resolve('@sqlite.org/sqlite-wasm/package.json')),
  'dist',
);
const target = join(webRoot, 'public', 'sqlite3-wasm');

await mkdir(target, { recursive: true });
for (const file of ['sqlite3.wasm', 'sqlite3-opfs-async-proxy.js', 'sqlite3-worker1.mjs']) {
  await cp(join(dist, file), join(target, file));
}
console.log(`sqlite-wasm assets copied to ${target}`);
