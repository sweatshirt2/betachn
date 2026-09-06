// Generates PWA icons into public/icons (committed artifact — rerun after
// brand changes). Run: `pnpm --filter @chorify/web icons`.
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'public', 'icons');
await mkdir(target, { recursive: true });

function svg(size, padding, bg, fg) {
  const inner = size - padding * 2;
  const r = Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  const house = Math.round(inner * 0.34);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/><circle cx="${cx}" cy="${cy}" r="${house}" fill="${fg}"/></svg>`;
}

const jobs = [
  { file: 'icon-192.png', size: 192, padding: 24, bg: '#FAF6F0', fg: '#C96F4A' },
  { file: 'icon-512.png', size: 512, padding: 64, bg: '#FAF6F0', fg: '#C96F4A' },
  { file: 'icon-maskable-512.png', size: 512, padding: 128, bg: '#C96F4A', fg: '#FAF6F0' },
];

for (const job of jobs) {
  await sharp(Buffer.from(svg(job.size, job.padding, job.bg, job.fg)))
    .png()
    .toFile(join(target, job.file));
}
console.log(`icons written to ${target}`);
