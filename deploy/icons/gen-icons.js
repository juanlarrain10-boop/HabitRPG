// Run with: node gen-icons.js
// Generates icon-192.png and icon-512.png
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// ─── PNG encoder ──────────────────────────────────────────────────────────────
function makePNG(w, h, getPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter None
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = getPixel(x, y, w, h);
      raw.push(r & 255, g & 255, b & 255, a & 255);
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Pixel helper ─────────────────────────────────────────────────────────────
function lerp(a, b, t) { return Math.round(a + (b - a) * Math.max(0, Math.min(1, t))); }

// ─── Icon design: bold sword on deep purple ────────────────────────────────────
// Designed to be clearly visible at 48×48dp (Android) and 60×60pt (iOS)
// Uses a thick sword, strong contrast, padded safe zone for maskable use
function drawIcon(x, y, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  const S  = W / 192; // scale

  // ── Background: rich purple radial gradient ──────────────────────────────
  const dx = (x - cx) / (W * 0.6);
  const dy = (y - cy) / (H * 0.6);
  const d  = Math.min(Math.sqrt(dx * dx + dy * dy), 1);

  // Center: #3b1578 (mid purple), edge: #0a0614 (near black)
  const bgR = lerp(59, 10, d);
  const bgG = lerp(21, 6, d);
  const bgB = lerp(120, 20, d);

  // ── Sword geometry (thicker, bolder — minimum 20px blade at 192px) ──────
  const bladeW  = Math.round(20 * S);   // thick blade
  const tipTop  = Math.round(20 * S);   // top of tip
  const bladeT  = Math.round(40 * S);   // top of straight blade
  const bladeB  = Math.round(120 * S);  // bottom of blade
  const guardW  = Math.round(72 * S);   // wide guard
  const guardH  = Math.round(14 * S);   // tall guard
  const guardY1 = bladeB;
  const guardY2 = guardY1 + guardH;
  const handleW = Math.round(16 * S);   // thick handle
  const handleH = Math.round(36 * S);
  const handleY1 = guardY2;
  const handleY2 = handleY1 + handleH;
  const pommelR = Math.round(14 * S);   // round pommel radius
  const pommelCY = handleY2 + pommelR;

  const bx1 = cx - bladeW / 2, bx2 = cx + bladeW / 2;
  const gx1 = cx - guardW / 2, gx2 = cx + guardW / 2;
  const hx1 = cx - handleW / 2, hx2 = cx + handleW / 2;

  // Tip: tapers from bladeW at bladeT to 0 at tipTop
  let inTip = false;
  if (y >= tipTop && y < bladeT) {
    const progress = (y - tipTop) / (bladeT - tipTop);
    const hw = (bladeW / 2) * progress;
    inTip = x >= cx - hw && x <= cx + hw;
  }

  const inBlade  = x >= bx1 && x <= bx2 && y >= bladeT && y <= bladeB;
  const inGuard  = x >= gx1 && x <= gx2 && y >= guardY1 && y <= guardY2;
  const inHandle = x >= hx1 && x <= hx2 && y >= handleY1 && y <= handleY2;

  // Round pommel using circle test
  const pdx = x - cx, pdy = y - pommelCY;
  const inPommel = (pdx * pdx + pdy * pdy) <= pommelR * pommelR;

  const isSword = inTip || inBlade || inGuard || inHandle || inPommel;

  if (isSword) {
    // Gold palette: highlight (left 30%), mid gold, dark edge
    let localX, width;
    if (inBlade || inTip) { localX = x - bx1; width = bladeW; }
    else if (inGuard)     { localX = x - gx1; width = guardW; }
    else if (inHandle)    { localX = x - hx1; width = handleW; }
    else                  { localX = x - (cx - pommelR); width = pommelR * 2; }

    const t = width > 0 ? (localX / width) : 0.5;

    // Three-stop gradient: highlight (t<0.25) → gold (t<0.75) → shadow (t>=0.75)
    let r, g, b;
    if (t < 0.25) {
      // highlight: #fff6c0 → #f0c040
      const tt = t / 0.25;
      r = lerp(255, 240, tt); g = lerp(246, 192, tt); b = lerp(192, 64, tt);
    } else if (t < 0.75) {
      // gold: #f0c040 → #c8890a
      const tt = (t - 0.25) / 0.5;
      r = lerp(240, 200, tt); g = lerp(192, 137, tt); b = lerp(64, 10, tt);
    } else {
      // shadow: #c8890a → #7a5200
      const tt = (t - 0.75) / 0.25;
      r = lerp(200, 122, tt); g = lerp(137, 82, tt); b = lerp(10, 0, tt);
    }

    // Add a subtle center line shine on blade
    if ((inBlade || inTip) && Math.abs(x - cx) <= S) {
      r = Math.min(255, r + 30); g = Math.min(255, g + 20); b = Math.min(255, b + 40);
    }

    return [r, g, b, 255];
  }

  // ── Purple glow around sword ─────────────────────────────────────────────
  // Distance to nearest sword pixel (simplified: distance to blade center column)
  const distToSword = Math.max(0, Math.abs(x - cx) - bladeW / 2 - 2 * S);
  const glowRadius  = 18 * S;
  const glow        = distToSword < glowRadius ? (1 - distToSword / glowRadius) * 0.55 : 0;

  const r = Math.min(255, bgR + Math.round(glow * 80));
  const g = Math.min(255, bgG + Math.round(glow * 20));
  const b = Math.min(255, bgB + Math.round(glow * 120));
  return [r, g, b, 255];
}

// ─── Generate ─────────────────────────────────────────────────────────────────
const outDir = __dirname;
[192, 512].forEach(sz => {
  const buf = makePNG(sz, sz, drawIcon);
  fs.writeFileSync(path.join(outDir, `icon-${sz}.png`), buf);
  console.log(`✓ icon-${sz}.png  (${buf.length} bytes)`);
});
