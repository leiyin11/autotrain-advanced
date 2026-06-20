// Zero-dependency PNG icon generator. Renders the Nebula Knights gem emblem at
// several sizes into public/ so the game is installable as a PWA (incl. iOS).

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public');

// --- minimal PNG encoder (RGBA, 8-bit) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // rows with a leading filter byte (0 = none)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = Math.hypot(cx, cy);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      // Radial background gradient: cyan core -> deep space.
      const r = Math.hypot(dx, dy) / maxR;
      let R = lerp(46, 11, Math.min(1, r * 1.2));
      let G = lerp(120, 16, Math.min(1, r * 1.2));
      let B = lerp(220, 38, Math.min(1, r * 1.2));

      // Layered diamond gem (Manhattan distance).
      const md = Math.abs(dx) + Math.abs(dy);
      if (md < size * 0.42) {
        R = 255; G = 255; B = 255; // white outer
      }
      if (md < size * 0.32) {
        R = 255; G = 106; B = 213; // magenta
      }
      if (md < size * 0.2) {
        R = 70; G = 227; B = 255; // cyan core
      }
      const i = (y * size + x) * 4;
      buf[i] = R;
      buf[i + 1] = G;
      buf[i + 2] = B;
      buf[i + 3] = 255;
    }
  }
  return encodePng(size, size, buf);
}

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 64],
]) {
  writeFileSync(path.join(OUT, name), render(size));
  // eslint-disable-next-line no-console
  console.log('wrote', name, size + 'x' + size);
}
