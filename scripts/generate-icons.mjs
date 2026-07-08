import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const iconsetDir = path.join(assetsDir, 'icon.iconset');

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
};

const encodePng = (width, height, rgba) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const rowLength = width * 4 + 1;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * rowLength;
    raw[rawOffset] = 0;
    rgba.copy(raw, rawOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    pngSignature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

const mix = (from, to, amount) => Math.round(from + (to - from) * amount);

const blendPixel = (rgba, width, x, y, color, alpha) => {
  const offset = (y * width + x) * 4;
  const sourceAlpha = Math.max(0, Math.min(alpha, 1)) * color[3];
  const targetAlpha = rgba[offset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outputAlpha <= 0) {
    return;
  }

  rgba[offset] = Math.round((color[0] * sourceAlpha + rgba[offset] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
  rgba[offset + 1] = Math.round((color[1] * sourceAlpha + rgba[offset + 1] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
  rgba[offset + 2] = Math.round((color[2] * sourceAlpha + rgba[offset + 2] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
  rgba[offset + 3] = Math.round(outputAlpha * 255);
};

const isInsideRoundedRect = (x, y, left, top, right, bottom, radius) => {
  if (x < left || x > right || y < top || y > bottom) {
    return false;
  }

  const cornerX = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cornerY = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;
  const dx = x - cornerX;
  const dy = y - cornerY;
  return dx * dx + dy * dy <= radius * radius;
};

const distanceToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const amount = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const x = x1 + amount * dx;
  const y = y1 + amount * dy;
  return Math.hypot(px - x, py - y);
};

const drawShape = (rgba, width, height, colorForPixel, containsPoint) => {
  const samples = width <= 64 ? 4 : 3;
  const totalSamples = samples * samples;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let covered = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const sampleX = (x + (sx + 0.5) / samples) / width;
          const sampleY = (y + (sy + 0.5) / samples) / height;
          if (containsPoint(sampleX, sampleY)) {
            covered += 1;
          }
        }
      }

      if (covered > 0) {
        blendPixel(rgba, width, x, y, colorForPixel(x / width, y / height), covered / totalSamples);
      }
    }
  }
};

const drawRoundedRect = (rgba, width, height) => {
  drawShape(
    rgba,
    width,
    height,
    (_x, y) => {
      const amount = Math.max(0, Math.min(1, y));
      return [mix(28, 10, amount), mix(190, 158, amount), mix(100, 77, amount), 1];
    },
    (x, y) => isInsideRoundedRect(x, y, 0.08, 0.08, 0.92, 0.92, 0.19),
  );
};

const drawStroke = (rgba, width, height, x1, y1, x2, y2, strokeWidth, color) => {
  drawShape(
    rgba,
    width,
    height,
    () => color,
    (x, y) => distanceToSegment(x, y, x1, y1, x2, y2) <= strokeWidth / 2,
  );
};

const drawIcon = (size) => {
  const rgba = Buffer.alloc(size * size * 4);
  drawRoundedRect(rgba, size, size);

  const white = [255, 255, 255, 0.96];
  const softWhite = [255, 255, 255, 0.22];
  drawStroke(rgba, size, size, 0.2, 0.22, 0.8, 0.22, 0.035, softWhite);
  drawStroke(rgba, size, size, 0.28, 0.76, 0.72, 0.76, 0.028, softWhite);

  drawStroke(rgba, size, size, 0.34, 0.32, 0.5, 0.51, 0.07, white);
  drawStroke(rgba, size, size, 0.66, 0.32, 0.5, 0.51, 0.07, white);
  drawStroke(rgba, size, size, 0.5, 0.5, 0.5, 0.74, 0.075, white);
  drawStroke(rgba, size, size, 0.34, 0.55, 0.66, 0.55, 0.058, white);
  drawStroke(rgba, size, size, 0.37, 0.64, 0.63, 0.64, 0.052, white);

  return encodePng(size, size, rgba);
};

const writeIconset = (pngs) => {
  fs.mkdirSync(iconsetDir, { recursive: true });
  const iconsetFiles = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024],
  ];

  for (const [fileName, size] of iconsetFiles) {
    fs.writeFileSync(path.join(iconsetDir, fileName), pngs.get(size));
  }
};

const encodeIcns = (entries) => {
  const chunks = entries.map(([type, png]) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, 'ascii');
    header.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([header, png]);
  });
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 8);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);
  return Buffer.concat([header, ...chunks]);
};

const encodeIco = (entries) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const directory = [];
  for (const [size, png] of entries) {
    const item = Buffer.alloc(16);
    item[0] = size >= 256 ? 0 : size;
    item[1] = size >= 256 ? 0 : size;
    item[2] = 0;
    item[3] = 0;
    item.writeUInt16LE(1, 4);
    item.writeUInt16LE(32, 6);
    item.writeUInt32LE(png.length, 8);
    item.writeUInt32LE(offset, 12);
    directory.push(item);
    offset += png.length;
  }

  return Buffer.concat([header, ...directory, ...entries.map((entry) => entry[1])]);
};

fs.mkdirSync(assetsDir, { recursive: true });

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
const pngs = new Map(sizes.map((size) => [size, drawIcon(size)]));

writeIconset(pngs);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngs.get(1024));
fs.writeFileSync(
  path.join(assetsDir, 'icon.icns'),
  encodeIcns([
    ['icp4', pngs.get(16)],
    ['icp5', pngs.get(32)],
    ['icp6', pngs.get(64)],
    ['ic07', pngs.get(128)],
    ['ic08', pngs.get(256)],
    ['ic09', pngs.get(512)],
    ['ic10', pngs.get(1024)],
  ]),
);
fs.writeFileSync(
  path.join(assetsDir, 'icon.ico'),
  encodeIco([
    [16, pngs.get(16)],
    [32, pngs.get(32)],
    [48, pngs.get(48)],
    [64, pngs.get(64)],
    [128, pngs.get(128)],
    [256, pngs.get(256)],
  ]),
);

console.log('Generated app icons in assets/');
