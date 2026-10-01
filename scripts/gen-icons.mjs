// Generates PWA PNG icons from public/logo.svg using sharp.
//   npm run gen:icons
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'public/logo.svg'));

const targets = [
  { file: 'pwa-192.png', size: 192, pad: 0 },
  { file: 'pwa-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  // maskable: keep the mark inside the 80% safe zone on a solid background
  { file: 'pwa-maskable-512.png', size: 512, pad: 64 },
];

for (const t of targets) {
  const inner = t.size - t.pad * 2;
  const mark = await sharp(svg).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: t.size, height: t.size, channels: 4, background: '#0d0a13' } })
    .composite([{ input: mark, left: t.pad, top: t.pad }])
    .png()
    .toFile(resolve(root, 'public', t.file));
  console.log('wrote', t.file);
}
