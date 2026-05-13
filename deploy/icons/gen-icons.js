// Run with: node gen-icons.js
// Design: dark purple #3d1a6e bg, two crossed golden swords, bright star on top
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
    raw.push(0);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerpI(a, b, t) { return Math.round(a + (b - a) * Math.max(0, Math.min(1, t))); }
function lerpF(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── Transform pixel to sword local coords ────────────────────────────────────
// thetaDeg: tilt from vertical, positive = leans right
// lx: along blade (positive = toward tip / up), ly: perpendicular
function swordLocal(px, py, scx, scy, thetaDeg) {
  const dx = px - scx, dy = py - scy;
  const θ  = thetaDeg * Math.PI / 180;
  const s  = Math.sin(θ), c = Math.cos(θ);
  return [dx * s - dy * c, dx * c + dy * s];
}

// ─── Check if pixel is in a sword; returns hit info or null ───────────────────
function inSword(px, py, scx, scy, thetaDeg, S) {
  const [lx, ly] = swordLocal(px, py, scx, scy, thetaDeg);

  const bladeHW   = 7.5 * S;
  const tipStart  = 48  * S;
  const tipEnd    = 72  * S;
  const bladeStart = -18 * S;
  const guardHW   = 24  * S;
  const guardLo   = -22 * S;
  const guardHi   = -10 * S;
  const handleHW  = 4.5 * S;
  const handleLo  = -48 * S;
  const pommelR   = 8.5 * S;
  const pommelLx  = -56 * S;

  // Tip (tapers to point)
  if (lx >= tipStart && lx <= tipEnd) {
    const t  = (lx - tipStart) / (tipEnd - tipStart);
    const hw = bladeHW * (1 - t);
    if (Math.abs(ly) <= hw) return { ly, halfW: hw, shine: false };
  }
  // Blade
  if (lx >= bladeStart && lx < tipStart && Math.abs(ly) <= bladeHW) {
    return { ly, halfW: bladeHW, shine: Math.abs(ly) < 1.5 * S };
  }
  // Guard (crossguard)
  if (lx >= guardLo && lx <= guardHi && Math.abs(ly) <= guardHW) {
    return { ly, halfW: guardHW, shine: false };
  }
  // Handle
  if (lx >= handleLo && lx < guardLo && Math.abs(ly) <= handleHW) {
    return { ly, halfW: handleHW, shine: false };
  }
  // Pommel (circle)
  const dlx = lx - pommelLx;
  if (dlx * dlx + ly * ly <= pommelR * pommelR) {
    return { ly, halfW: pommelR, shine: false };
  }
  return null;
}

// ─── Gold gradient color from perpendicular position ──────────────────────────
function goldColor(ly, halfW, shine) {
  const t = clamp((ly + halfW) / (2 * halfW), 0, 1); // 0=left/highlight, 1=right/shadow
  let r, g, b;
  if (t < 0.2) {
    const tt = t / 0.2;
    r = lerpI(255, 248, tt); g = lerpI(252, 205, tt); b = lerpI(215, 62, tt);
  } else if (t < 0.68) {
    const tt = (t - 0.2) / 0.48;
    r = lerpI(248, 215, tt); g = lerpI(205, 148, tt); b = lerpI(62, 18, tt);
  } else {
    const tt = (t - 0.68) / 0.32;
    r = lerpI(215, 128, tt); g = lerpI(148, 82, tt); b = lerpI(18, 0, tt);
  }
  if (shine) { r = Math.min(255, r + 22); g = Math.min(255, g + 16); b = Math.min(255, b + 30); }
  return [r, g, b];
}

// ─── 5-pointed star ───────────────────────────────────────────────────────────
function inStar(px, py, cx, cy, outerR, innerR) {
  const dx = px - cx, dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > outerR + 0.5) return false;
  if (dist < 1) return true;

  // angle from top (12 o'clock), clockwise
  let angle = Math.atan2(dx, -dy);
  if (angle < 0) angle += 2 * Math.PI;

  const sector = (2 * Math.PI) / 5;
  const half   = sector / 2;
  const pos    = angle % sector;
  // t=0 at outer point (tip), t=1 at inner valley
  const t = pos < half ? pos / half : (sector - pos) / half;
  const r = outerR + (innerR - outerR) * t;
  return dist <= r + 0.5;
}

function starColor(px, py, cx, cy, outerR) {
  const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  const t = clamp(dist / outerR, 0, 1);
  // center: near-white (#fffde8), tips: bright gold (#f7c520)
  return [lerpI(255, 247, t), lerpI(253, 197, t), lerpI(232, 32, t)];
}

// ─── Background: deep purple radial gradient ──────────────────────────────────
function bgColor(px, py, W, H) {
  const cx = W / 2, cy = H / 2;
  const dx = (px - cx) / (W * 0.6);
  const dy = (py - cy) / (H * 0.6);
  const d  = clamp(Math.sqrt(dx * dx + dy * dy), 0, 1);
  // center: #3d1a6e → edge: #180930
  return [lerpI(61, 24, d), lerpI(26, 9, d), lerpI(110, 48, d)];
}

// ─── Main pixel function ──────────────────────────────────────────────────────
function drawIcon(px, py, W, H) {
  const cx = W / 2, cy = H / 2;
  const S  = W / 192;

  // Swords: centered slightly below icon center so the star fits above
  const scx = cx, scy = cy + 14 * S;

  // Star position: top-center
  const starCx = cx, starCy = cy - 52 * S;
  const outerR  = 22 * S, innerR = 8.5 * S;

  // ── Star ──────────────────────────────────────────────────────────────────
  if (inStar(px, py, starCx, starCy, outerR, innerR)) {
    const [r, g, b] = starColor(px, py, starCx, starCy, outerR);
    return [r, g, b, 255];
  }

  // ── Crossed swords ────────────────────────────────────────────────────────
  const sA = inSword(px, py, scx, scy, +35, S); // leans right, tip upper-right
  const sB = inSword(px, py, scx, scy, -35, S); // leans left,  tip upper-left

  if (sA || sB) {
    let ly, halfW, shine;
    if (sA && sB) {
      // Overlap zone: use whichever gives a lighter (more central) shade
      ly    = Math.abs(sA.ly) < Math.abs(sB.ly) ? sA.ly : sB.ly;
      halfW = Math.max(sA.halfW, sB.halfW);
      shine = sA.shine || sB.shine;
    } else {
      const s = sA || sB;
      ({ ly, halfW, shine } = s);
    }
    const [r, g, b] = goldColor(ly, halfW, shine);
    return [r, g, b, 255];
  }

  // ── Background + glow ─────────────────────────────────────────────────────
  let [r, g, b] = bgColor(px, py, W, H);

  // Gold glow along each sword axis
  const [, lyA] = swordLocal(px, py, scx, scy, +35);
  const [, lyB] = swordLocal(px, py, scx, scy, -35);
  const distA   = Math.max(0, Math.abs(lyA) - 7.5 * S);
  const distB   = Math.max(0, Math.abs(lyB) - 7.5 * S);
  const minDist = Math.min(distA, distB);
  const glowR   = 16 * S;
  const swordGlow = minDist < glowR ? (1 - minDist / glowR) * 0.42 : 0;

  // Warm glow around star
  const sdist    = Math.sqrt((px - starCx) ** 2 + (py - starCy) ** 2);
  const starGlowR = outerR * 2.8;
  const starGlow  = sdist > outerR && sdist < starGlowR
    ? (1 - (sdist - outerR) / (starGlowR - outerR)) * 0.55 : 0;

  r = clamp(r + Math.round(swordGlow * 68 + starGlow * 80), 0, 255);
  g = clamp(g + Math.round(swordGlow * 28 + starGlow * 58), 0, 255);
  b = clamp(b + Math.round(swordGlow *  0 + starGlow * 10), 0, 255);

  return [r, g, b, 255];
}

// ─── Generate ─────────────────────────────────────────────────────────────────
const outDir = __dirname;
[192, 512].forEach(sz => {
  const buf = makePNG(sz, sz, drawIcon);
  fs.writeFileSync(path.join(outDir, `icon-${sz}.png`), buf);
  console.log(`✓ icon-${sz}.png  (${buf.length} bytes)`);
});
