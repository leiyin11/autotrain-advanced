// Bundle the whole game into ONE self-contained index.html: inline the JS and
// CSS, drop external icon/manifest/SW references. The result needs no build,
// no assets folder, and no Jekyll config — ideal for uploading to a fresh repo.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const outDir = path.join(__dirname, '..', 'standalone');

let html = readFileSync(path.join(dist, 'index.html'), 'utf8');

// Inline the module script.
html = html.replace(
  /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/,
  (_m, src) => {
    const js = readFileSync(path.join(dist, src.replace(/^\.?\//, '')), 'utf8');
    const safe = js.replace(/<\/script>/g, '<\\/script>');
    return `<script type="module">\n${safe}\n</script>`;
  }
);

// Inline the stylesheet.
html = html.replace(
  /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>/,
  (_m, href) => {
    const css = readFileSync(path.join(dist, href.replace(/^\.?\//, '')), 'utf8');
    return `<style>\n${css}\n</style>`;
  }
);

// Remove external icon/manifest links (they would 404 in a single-file deploy).
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/g, '')
  .replace(/\s*<link rel="icon"[^>]*>/g, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '');

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'index.html'), html);

const kb = (html.length / 1024).toFixed(1);
// eslint-disable-next-line no-console
console.log(`standalone/index.html written (${kb} kB, fully self-contained)`);
