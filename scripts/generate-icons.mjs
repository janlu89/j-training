// Generates the app icons from one drawing: `node scripts/generate-icons.mjs`.
// The artwork repeats the header mark (orange bar) next to a "J" drawn as a path, so the result
// does not depend on the fonts installed. PNGs are rendered by Playwright's Chromium.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'public', 'icons');
const NAVY = '#14213d';
const NAVY_LIGHT = '#1e3a5f';
const ORANGE = '#f97316';

/** The mark on a 512 × 512 canvas, centred. */
const ARTWORK = `
  <rect x="118" y="132" width="44" height="248" rx="10" fill="${ORANGE}"/>
  <path d="M 366 132 V 308 A 62 62 0 0 1 242 308" fill="none" stroke="#ffffff"
        stroke-width="60" stroke-linecap="round"/>`;

/**
 * `rounded`: an app icon with transparent corners. `maskable`: full bleed, the mark scaled into
 * the safe zone (the launcher may cut the icon to a circle).
 */
function svg({ rounded, scale }) {
  const offset = (512 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${NAVY_LIGHT}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${ARTWORK}
  </g>
</svg>
`;
}

const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true, scale: 1 },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 1 },
  { file: 'icon-maskable-192.png', size: 192, rounded: false, scale: 0.72 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, scale: 0.72 },
  // iOS rounds the corners itself and wants no transparency.
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.8 },
  { file: 'favicon-32.png', size: 32, rounded: true, scale: 1 },
];

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'icon.svg'), svg({ rounded: true, scale: 1 }));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, rounded, scale } of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:transparent">
      <div style="width:${size}px;height:${size}px">${svg({ rounded, scale })}</div>
    </body>`,
  );
  await page.locator('svg').evaluate((el) => el.setAttribute('width', '100%'));
  await page.screenshot({ path: join(OUT, file), omitBackground: true });
  console.log(`${file} (${size} × ${size})`);
}
await browser.close();
