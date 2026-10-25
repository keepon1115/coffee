// アイコンPNGを生成する（外部ライブラリなし）。 node tools/make-icons.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'icons');
fs.mkdirSync(out, { recursive: true });

const BG = [0x85, 0x60, 0x47], CREAM = [0xff, 0xfc, 0xf6], STEAM = [0xe9, 0xd2, 0xa5];

const inRRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

// 512座標系の絵。scale / offset で余白を調整する
function sample(x, y, rounded) {
  if (rounded && !inRRect(x, y, 0, 0, 512, 512, 104)) return null;
  let c = BG;
  // 湯気
  for (let t = 0; t <= 1; t += 0.01) {
    const px = 244 + 16 * Math.sin(t * 6.28), py = 200 - t * 96;
    if ((x - px) ** 2 + (y - py) ** 2 <= 49) { c = STEAM; break; }
  }
  // カップ本体（上辺は水平）
  if (y >= 216 && inRRect(x, y, 136, 150, 352, 372, 62)) c = CREAM;
  // 取っ手
  const d = Math.hypot(x - 366, y - 280);
  if (x > 340 && d <= 52 && d >= 30) c = CREAM;
  // ソーサー
  if (inRRect(x, y, 104, 384, 384, 404, 10)) c = CREAM;
  // カップ内の水面（細い線）
  if (y >= 232 && y <= 240 && x >= 156 && x <= 332) c = [0xd9, 0xc8, 0xb4];
  return c;
}

function render(size, { rounded, zoom }) {
  const px = Buffer.alloc(size * size * 4);
  const SS = 3;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
      const u = ((i + (si + 0.5) / SS) / size - 0.5) / zoom * 512 + 256;
      const v = ((j + (sj + 0.5) / SS) / size - 0.5) / zoom * 512 + 256;
      const c = (u < 0 || v < 0 || u > 512 || v > 512) ? (rounded ? null : BG) : sample(u, v, rounded);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
    }
    const n = SS * SS, k = (j * size + i) * 4;
    px[k] = a ? r / (a / 255) : 0; px[k + 1] = a ? g / (a / 255) : 0; px[k + 2] = a ? b / (a / 255) : 0; px[k + 3] = a / n;
  }
  return png(size, px);
}

function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const T = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

fs.writeFileSync(path.join(out, 'icon-192.png'), render(192, { rounded: true, zoom: 1 }));
fs.writeFileSync(path.join(out, 'icon-512.png'), render(512, { rounded: true, zoom: 1 }));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), render(512, { rounded: false, zoom: 0.78 }));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), render(180, { rounded: false, zoom: 0.9 }));
fs.writeFileSync(path.join(out, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="104" fill="#856047"/><path d="M244 200c16-24-16-40 0-96" fill="none" stroke="#E9D2A5" stroke-width="14" stroke-linecap="round"/><path d="M136 216h216v94a62 62 0 0 1-62 62h-92a62 62 0 0 1-62-62z" fill="#FFFCF6"/><path d="M352 250a41 41 0 0 1 0 60" fill="none" stroke="#FFFCF6" stroke-width="22"/><rect x="104" y="384" width="280" height="20" rx="10" fill="#FFFCF6"/><rect x="156" y="232" width="176" height="8" fill="#D9C8B4"/></svg>\n`);
console.log('icons written to', out);
