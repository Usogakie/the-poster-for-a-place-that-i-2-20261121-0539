// AURELIA — The City Above the Clouds
// A vintage travel poster for a place that does not exist.
// Pure Node 22, standard library only (fs + zlib). No network, no assets.
// Renders a 1024x1024 poster and writes it to /output/entry.png
// (and to ./entry.png next to this file when run locally).
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------- palette ----------
// Deep indigo sky, warm sunset peach, gold sun, cream clouds,
// terracotta rooftops, deep teal bottom panel.
const SKY_TOP: RGB = [32, 54, 95];
const SKY_MID: RGB = [122, 94, 124];
const SKY_LOW: RGB = [233, 154, 92];
const HORIZON: RGB = [250, 214, 154];
const SUN: RGB = [247, 201, 72];
const SUN_CORE: RGB = [253, 226, 138];
const CREAM: RGB = [250, 240, 214];
const CLOUD: RGB = [255, 248, 232];
const CLOUD_SHADE: RGB = [232, 205, 172];
const ROCK: RGB = [122, 74, 58];
const ROCK_DARK: RGB = [84, 48, 40];
const GRASS: RGB = [94, 138, 86];
const WALL: RGB = [244, 224, 178];
const ROOF: RGB = [196, 84, 52];
const ROOF_DARK: RGB = [150, 58, 38];
const TEAL: RGB = [20, 50, 66];
const TEAL_DARK: RGB = [13, 36, 49];
const GOLD: RGB = [212, 164, 65];
const INK: RGB = [24, 32, 48];

type RGB = [number, number, number];

// ---------- canvas ----------
const px = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  const o = (iy * W + ix) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function blendPixel(x: number, y: number, c: RGB, a: number): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  const o = (iy * W + ix) * 3;
  px[o] = Math.round(px[o] * (1 - a) + c[0] * a);
  px[o + 1] = Math.round(px[o + 1] * (1 - a) + c[1] * a);
  px[o + 2] = Math.round(px[o + 2] * (1 - a) + c[2] * a);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

function fillRect(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) {
      setPixel(x, y, c);
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(x, y, c);
    }
  }
}

function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.floor(Math.min(x0, x1, x2));
  const maxX = Math.ceil(Math.max(x0, x1, x2));
  const minY = Math.floor(Math.min(y0, y1, y2));
  const maxY = Math.ceil(Math.max(y0, y1, y2));
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPixel(x, y, c);
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB, w: number): void {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lerp(x0, x1, t);
    const y = lerp(y0, y1, t);
    for (let dy = -w; dy <= w; dy++) {
      for (let dx = -w; dx <= w; dx++) setPixel(x + dx, y + dy, c);
    }
  }
}

function strokeRect(x0: number, y0: number, x1: number, y1: number, c: RGB, w: number): void {
  fillRect(x0, y0, x1, y0 + w, c);
  fillRect(x0, y1 - w, x1, y1, c);
  fillRect(x0, y0, x0 + w, y1, c);
  fillRect(x1 - w, y0, x1, y1, c);
}

// ---------- 5x7 bitmap font ----------
// Each glyph is 7 rows; each row is a 5-bit number, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  "-": [0, 0, 0, 14, 0, 0, 0],
  ":": [0, 12, 12, 0, 12, 12, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "•": [0, 4, 14, 14, 14, 4, 0],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(text: string, cx: number, y: number, scale: number, color: RGB): void {
  const total = textWidth(text, scale);
  let x = Math.round(cx - total / 2);
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          fillRect(x + col * scale, y + row * scale, x + (col + 1) * scale, y + (row + 1) * scale, color);
        }
      }
    }
    x += 6 * scale;
  }
}

function drawTextLeft(text: string, x: number, y: number, scale: number, color: RGB): void {
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          fillRect(cx + col * scale, y + row * scale, cx + (col + 1) * scale, y + (row + 1) * scale, color);
        }
      }
    }
    cx += 6 * scale;
  }
}

// ---------- scene helpers ----------
function drawCloud(cx: number, cy: number, s: number, shade: boolean): void {
  const base = shade ? CLOUD_SHADE : CLOUD;
  fillEllipse(cx, cy, 110 * s, 30 * s, base);
  fillEllipse(cx - 62 * s, cy + 8 * s, 68 * s, 24 * s, base);
  fillEllipse(cx + 62 * s, cy + 8 * s, 68 * s, 24 * s, base);
  fillEllipse(cx - 26 * s, cy - 18 * s, 52 * s, 26 * s, base);
  fillEllipse(cx + 30 * s, cy - 16 * s, 48 * s, 24 * s, base);
}

function drawBird(cx: number, cy: number, s: number, c: RGB): void {
  drawLine(cx - 12 * s, cy, cx, cy - 7 * s, c, 2);
  drawLine(cx, cy - 7 * s, cx + 12 * s, cy, c, 2);
}

function drawTower(x: number, baseY: number, w: number, h: number): void {
  // Stone tower with a terracotta pointed roof and lit windows.
  fillRect(x, baseY - h, x + w, baseY, WALL);
  fillTriangle(x - 4, baseY - h, x + w / 2, baseY - h - w * 0.9, x + w + 4, baseY - h, ROOF);
  fillRect(x + 4, baseY - h + 12, x + w - 4, baseY - h + 16, ROOF_DARK);
  for (let wy = baseY - h + 26; wy < baseY - 14; wy += 24) {
    fillRect(x + w / 2 - 4, wy, x + w / 2 + 4, wy + 12, SUN_CORE);
  }
}

function drawDome(x: number, baseY: number, w: number, h: number): void {
  fillRect(x, baseY - h, x + w, baseY, WALL);
  fillEllipse(x + w / 2, baseY - h, w * 0.62, w * 0.42, ROOF);
  fillRect(x + w / 2 - 2, baseY - h - w * 0.42 - 10, x + w / 2 + 2, baseY - h - w * 0.42, GOLD);
  fillCircle(x + w / 2, baseY - h - w * 0.42 - 12, 4, SUN);
  fillRect(x + w / 2 - 4, baseY - h + 18, x + w / 2 + 4, baseY - h + 32, SUN_CORE);
}

function drawIsland(cx: number, topY: number, w: number, depth: number, big: boolean): void {
  // Underside: a tapering rock cone, darker toward the tip.
  fillTriangle(cx - w / 2, topY, cx + w / 2, topY, cx, topY + depth, ROCK);
  fillTriangle(cx - w / 4, topY, cx + w / 2, topY, cx, topY + depth, ROCK_DARK);
  fillTriangle(cx - w / 2, topY, cx, topY, cx - w * 0.08, topY + depth * 0.62, ROCK_DARK);
  // Grassy cap.
  fillEllipse(cx, topY, w / 2, big ? 20 : 14, GRASS);
  fillRect(cx - w / 2, topY - 8, cx + w / 2, topY + 4, GRASS);
  // A thin waterfall spilling off the edge, one continuous stream.
  const fallX = cx + w * 0.32;
  fillRect(fallX - 5, topY + 10, fallX + 5, topY + 118, [168, 208, 226]);
  fillRect(fallX - 2, topY + 10, fallX + 2, topY + 118, [214, 236, 244]);
  fillRect(fallX - 6, topY + 118, fallX + 6, topY + 126, [168, 208, 226]);
}

function drawBalloon(cx: number, cy: number, s: number): void {
  // Striped hot-air balloon drifting in from the left.
  fillEllipse(cx, cy, 46 * s, 54 * s, ROOF);
  fillEllipse(cx, cy, 30 * s, 54 * s, SUN);
  fillEllipse(cx, cy, 14 * s, 54 * s, ROOF);
  fillRect(cx - 12 * s, cy + 62 * s, cx + 12 * s, cy + 80 * s, [96, 62, 40]);
  drawLine(cx - 22 * s, cy + 44 * s, cx - 10 * s, cy + 62 * s, INK, 1);
  drawLine(cx + 22 * s, cy + 44 * s, cx + 10 * s, cy + 62 * s, INK, 1);
  drawLine(cx, cy + 50 * s, cx, cy + 62 * s, INK, 1);
}

// ---------- sky ----------
for (let y = 0; y < H; y++) {
  let c: RGB;
  if (y < 340) c = mix(SKY_TOP, SKY_MID, y / 340);
  else if (y < 640) c = mix(SKY_MID, SKY_LOW, (y - 340) / 300);
  else c = mix(SKY_LOW, HORIZON, (y - 640) / 180);
  for (let x = 0; x < W; x++) setPixel(x, y, c);
}

// Stars high in the indigo sky.
const STARS: Array<[number, number, number]> = [
  [80, 90, 3], [150, 150, 2], [260, 70, 3], [330, 130, 2], [430, 60, 3],
  [560, 110, 2], [880, 80, 3], [950, 170, 2], [60, 230, 2], [480, 170, 2],
  [700, 60, 2], [920, 260, 2], [200, 210, 2], [380, 200, 2],
];
for (const [sx, sy, sr] of STARS) fillCircle(sx, sy, sr, CREAM);

// Sun with a soft blended halo, upper right.
for (let r = 128; r > 92; r -= 2) {
  const a = 0.16 * (1 - (r - 92) / 36);
  for (let y = Math.floor(238 - r); y <= Math.ceil(238 + r); y++) {
    for (let x = Math.floor(748 - r); x <= Math.ceil(748 + r); x++) {
      const dx = x - 748;
      const dy = y - 238;
      if (dx * dx + dy * dy <= r * r) blendPixel(x, y, SUN, a);
    }
  }
}
fillCircle(748, 238, 92, SUN);
fillCircle(748, 238, 66, SUN_CORE);
// Sun rays, short and flat like a vintage print.
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const x0 = 748 + Math.cos(a) * 100;
  const y0 = 238 + Math.sin(a) * 100;
  const x1 = 748 + Math.cos(a) * 120;
  const y1 = 238 + Math.sin(a) * 120;
  drawLine(x0, y0, x1, y1, SUN, 2);
}

// Distant wispy clouds.
drawCloud(180, 330, 0.7, false);
drawCloud(880, 420, 0.6, false);
drawCloud(430, 300, 0.45, false);

// Hot-air balloon, upper left, heading for the city.
drawBalloon(196, 196, 0.9);

// Birds.
drawBird(360, 250, 1, INK);
drawBird(420, 285, 0.8, INK);
drawBird(610, 190, 0.9, INK);
drawBird(880, 300, 0.8, INK);
drawBird(300, 330, 0.7, INK);

// ---------- floating islands ----------
// Small left island with one tower.
drawIsland(168, 560, 210, 150, false);
drawTower(138, 562, 34, 96);
fillTriangle(128, 466, 155, 430, 182, 466, ROOF);
// Small right island with a dome.
drawIsland(862, 528, 230, 165, false);
drawDome(828, 530, 58, 74);

// Main island, centre, carrying the city of Aurelia.
drawIsland(512, 496, 580, 260, true);
// City skyline on the main island.
drawTower(268, 500, 44, 150);
drawTower(330, 500, 36, 118);
drawDome(392, 500, 66, 92);
drawTower(472, 500, 48, 186);
drawTower(540, 500, 38, 132);
drawDome(596, 500, 62, 84);
drawTower(672, 500, 42, 148);
// A tall central spire with a golden flag.
fillRect(500, 268, 524, 500, WALL);
fillTriangle(494, 268, 512, 196, 530, 268, ROOF);
fillRect(512, 178, 514, 196, GOLD);
fillTriangle(514, 178, 556, 186, 514, 196, SUN);
fillRect(508, 300, 516, 316, SUN_CORE);
fillRect(508, 340, 516, 356, SUN_CORE);
fillRect(508, 380, 516, 396, SUN_CORE);
// Low houses between the towers.
fillRect(368, 470, 392, 500, WALL);
fillTriangle(364, 470, 380, 448, 396, 470, ROOF_DARK);
fillRect(588, 472, 600, 500, WALL);
fillTriangle(584, 472, 594, 452, 604, 472, ROOF_DARK);

// ---------- sea of clouds ----------
// A deep bank of clouds fills the lower sky, islands rising out of it.
drawCloud(120, 700, 1.15, true);
drawCloud(420, 730, 1.3, false);
drawCloud(760, 705, 1.2, true);
drawCloud(940, 760, 1.0, false);
drawCloud(60, 780, 0.9, false);
drawCloud(300, 790, 0.9, true);
drawCloud(620, 785, 1.0, false);
fillRect(0, 760, W, 812, CLOUD);
fillEllipse(180, 768, 220, 34, CLOUD);
fillEllipse(700, 772, 260, 36, CLOUD);

// ---------- bottom title panel ----------
// Deep teal panel, gold rules, cream lettering — the poster's anchor.
fillRect(0, 812, W, H, TEAL);
fillRect(0, 812, W, 818, GOLD);
fillRect(0, 812, W, 814, SUN_CORE);
drawText("VISIT THE IMPOSSIBLE", 512, 52, 3, GOLD);
drawText("AURELIA", 512, 836, 13, CREAM);
drawText("THE CITY ABOVE THE CLOUDS", 512, 942, 3, SUN);
drawText("EST. 1897  •  REACHED ONLY BY BALLOON  •  AURELIA TOURISM BOARD", 512, 972, 2, [176, 200, 214]);

// ---------- border ----------
// Double gold frame, vintage poster style.
strokeRect(16, 16, W - 16, H - 16, GOLD, 8);
strokeRect(34, 34, W - 34, H - 34, CREAM, 2);

// ---------- PNG encoder (zlib, filter 0) ----------
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const png = encodePNG();
fs.mkdirSync("/output", { recursive: true });
fs.writeFileSync("/output/entry.png", png);
fs.writeFileSync("entry.png", png);
console.log("wrote /output/entry.png and entry.png:", png.length, "bytes");
