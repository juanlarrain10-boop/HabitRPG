// Run with: node gen-icons.js
// Generates icon-192.png and icon-512.png using pure Node.js (no deps)
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── CRC32 ───────────────────────────────────────────────────────────────────
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

// ─── PNG encoder ─────────────────────────────────────────────────────────────
function makePNG(w, h, getPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=6; // RGBA
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter None
    for (let x = 0; x < w; x++) {
      const [r,g,b,a] = getPixel(x, y, w, h);
      raw.push(r&255, g&255, b&255, a&255);
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 6 });
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon pixel function ──────────────────────────────────────────────────────
function drawHabitRPG(x, y, W, H) {
  const cx = W / 2, cy = H / 2;
  const S  = W / 192; // scale factor

  // ── Background: radial gradient, deep purple ──
  const dx = (x - cx) / cx, dy = (y - cy) / cy;
  const dist = Math.sqrt(dx*dx + dy*dy); // 0 (center) … ~1.41 (corner)
  const t = Math.min(dist / 1.1, 1);
  const bgR = Math.round(40 * (1-t) + 6  * t);
  const bgG = Math.round(15 * (1-t) + 6  * t);
  const bgB = Math.round(80 * (1-t) + 14 * t);

  // ── Sword geometry (scaled to W) ──
  // Blade: centered column with pointed tip
  const bladeW  = Math.round(10 * S);
  const bladeT  = Math.round(30 * S);   // top of straight part
  const bladeB  = Math.round(110 * S);  // bottom of straight part
  const tipT    = Math.round(14 * S);   // tip apex
  const bx1 = cx - bladeW/2, bx2 = cx + bladeW/2;

  // Guard: horizontal bar
  const guardW  = Math.round(50 * S);
  const guardH  = Math.round(9  * S);
  const guardY1 = bladeB;
  const guardY2 = guardY1 + guardH;
  const gx1 = cx - guardW/2, gx2 = cx + guardW/2;

  // Handle
  const handleW = Math.round(9  * S);
  const handleH = Math.round(32 * S);
  const handleY1 = guardY2;
  const handleY2 = handleY1 + handleH;
  const hx1 = cx - handleW/2, hx2 = cx + handleW/2;

  // Pommel
  const pommelW = Math.round(16 * S);
  const pommelH = Math.round(11 * S);
  const pommelY1 = handleY2;
  const pommelY2 = pommelY1 + pommelH;
  const px1 = cx - pommelW/2, px2 = cx + pommelW/2;

  // Tip check (tapered above bladeT down to point at tipT)
  let inTip = false;
  if (y >= tipT && y < bladeT) {
    const progress = (y - tipT) / (bladeT - tipT);
    const hw = (bladeW / 2) * progress;
    inTip = x >= cx - hw && x <= cx + hw;
  }
  const inBlade  = x >= bx1 && x <= bx2 && y >= bladeT && y <= bladeB;
  const inGuard  = x >= gx1 && x <= gx2 && y >= guardY1 && y <= guardY2;
  const inHandle = x >= hx1 && x <= hx2 && y >= handleY1 && y <= handleY2;
  const inPommel = x >= px1 && x <= px2 && y >= pommelY1 && y <= pommelY2;
  const isSword  = inTip || inBlade || inGuard || inHandle || inPommel;

  if (isSword) {
    // Gold sword: highlight on left edge
    const leftEdge = inBlade ? bx1 : (inGuard ? gx1 : hx1);
    const ww = inBlade ? bladeW : (inGuard ? guardW : handleW);
    const highlight = (x - leftEdge) / ww < 0.3;
    if (highlight) return [255, 236, 160, 255];
    return [218, 162, 28, 255];
  }

  // ── Purple glow around sword ──
  // Distance from nearest sword pixel (approximate by proximity to guide lines)
  const dBlade  = (x >= bx1 && x <= bx2) ? Math.min(Math.abs(y-bladeT), Math.abs(y-bladeB)) : Math.hypot(Math.max(bx1-x, 0, x-bx2), Math.max(bladeT-y, 0, y-bladeB));
  const dGuard  = (x >= gx1 && x <= gx2) ? Math.min(Math.abs(y-guardY1), Math.abs(y-guardY2)) : Math.hypot(Math.max(gx1-x, 0, x-gx2), Math.max(guardY1-y, 0, y-guardY2));
  const nearDist = Math.min(dBlade, dGuard);
  const glow = Math.max(0, 1 - nearDist / (18 * S));

  const r = Math.min(255, Math.round(bgR + glow * 100));
  const g = Math.min(255, Math.round(bgG + glow * 30));
  const b = Math.min(255, Math.round(bgB + glow * 140));
  return [r, g, b, 255];
}

// ─── Generate ─────────────────────────────────────────────────────────────────
const outDir = __dirname;
[192, 512].forEach(sz => {
  const buf = makePNG(sz, sz, drawHabitRPG);
  fs.writeFileSync(path.join(outDir, `icon-${sz}.png`), buf);
  console.log(`✓ icon-${sz}.png  (${buf.length} bytes)`);
});
