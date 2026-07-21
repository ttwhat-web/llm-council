// Generate a 1024×1024 source icon for Operator Core with zero deps.
// Design: dark canvas + accent "Atlas ring" annulus + center dot + 4
// cardinal ticks. No copyrighted assets. Outputs brand/operator-core.png
// (RGB PNG), encoded via Node's built-in zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const S = 1024;
const cx = S / 2;
const cy = S / 2;

// palette (Operator.Center midnight + accent)
const BG = [6, 8, 13];
const ACCENT = [124, 155, 255];
const ACCENT_DIM = [60, 78, 140];

const ringOuter = 360;
const ringInner = 300;
const dotR = 70;
const tickInner = 380;
const tickOuter = 440;
const tickHalf = 16; // half-thickness of cardinal ticks

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

// raw RGB pixel buffer
const raw = Buffer.alloc(S * S * 3 + S); // + 1 filter byte per row
let p = 0;
for (let y = 0; y < S; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < S; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    let c = BG;

    // subtle radial vignette glow toward center
    const glow = Math.max(0, 1 - d / (S * 0.7));
    c = mix(BG, [12, 16, 30], glow * 0.6);

    // annulus ring with soft 2px edges
    if (d >= ringInner - 2 && d <= ringOuter + 2) {
      const edge =
        Math.min(d - (ringInner - 2), (ringOuter + 2) - d) / 4; // 0..1 falloff
      c = mix(c, ACCENT, Math.max(0, Math.min(1, edge)));
    }

    // center dot
    if (d <= dotR) {
      const edge = (dotR - d) / 4;
      c = mix(c, ACCENT, Math.max(0, Math.min(1, edge)));
    }

    // four cardinal ticks (N/S/E/W)
    const onVert = Math.abs(dx) <= tickHalf && Math.abs(dy) >= tickInner && Math.abs(dy) <= tickOuter;
    const onHorz = Math.abs(dy) <= tickHalf && Math.abs(dx) >= tickInner && Math.abs(dx) <= tickOuter;
    if (onVert || onHorz) {
      c = mix(c, ACCENT_DIM, 0.9);
    }

    raw[p++] = c[0];
    raw[p++] = c[1];
    raw[p++] = c[2];
  }
}

// ---- PNG container ----
const crcTable = (() => {
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type 2 = RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0))
]);

writeFileSync(new URL("./operator-core.png", import.meta.url), png);
console.log(`wrote brand/operator-core.png · ${S}×${S} · ${png.length} bytes`);
