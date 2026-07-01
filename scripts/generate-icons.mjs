import fs from "node:fs";
import zlib from "node:zlib";

const sizes = [16, 32, 48, 128];

fs.mkdirSync("icons", { recursive: true });

for (const size of sizes) {
  const rgba = createIcon(size);
  fs.writeFileSync(`icons/icon${size}.png`, encodePng(size, size, rgba));
}

function createIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  drawPaletteBackground(rgba, size);

  const documentX = Math.round(size * 0.2);
  const documentY = Math.round(size * 0.18);
  const documentWidth = Math.round(size * 0.6);
  const documentHeight = Math.round(size * 0.64);
  const documentRadius = Math.max(1, Math.round(size * 0.06));
  const shadowOffset = Math.max(1, Math.round(size * 0.025));

  fillRoundedRect(
    rgba,
    size,
    documentX + shadowOffset,
    documentY + shadowOffset,
    documentWidth,
    documentHeight,
    documentRadius,
    [32, 33, 36, 88]
  );

  fillRoundedRect(
    rgba,
    size,
    documentX,
    documentY,
    documentWidth,
    documentHeight,
    documentRadius,
    [255, 255, 255, 255]
  );

  fillRoundedRect(
    rgba,
    size,
    Math.round(size * 0.28),
    Math.round(size * 0.34),
    Math.round(size * 0.44),
    Math.max(2, Math.round(size * 0.08)),
    Math.max(1, Math.round(size * 0.03)),
    [245, 158, 11, 255]
  );

  fillRoundedRect(
    rgba,
    size,
    Math.round(size * 0.28),
    Math.round(size * 0.5),
    Math.round(size * 0.32),
    Math.max(1, Math.round(size * 0.04)),
    Math.max(1, Math.round(size * 0.02)),
    [60, 64, 67, 255]
  );

  fillRoundedRect(
    rgba,
    size,
    Math.round(size * 0.28),
    Math.round(size * 0.62),
    Math.round(size * 0.36),
    Math.max(1, Math.round(size * 0.04)),
    Math.max(1, Math.round(size * 0.02)),
    [60, 64, 67, 255]
  );

  drawSparkle(rgba, size, Math.round(size * 0.76), Math.round(size * 0.28), Math.max(3, Math.round(size * 0.12)), [
    255,
    255,
    255,
    255
  ]);
  drawSparkle(rgba, size, Math.round(size * 0.23), Math.round(size * 0.76), Math.max(2, Math.round(size * 0.08)), [
    255,
    255,
    255,
    255
  ]);

  return rgba;
}

function drawPaletteBackground(rgba, size) {
  const radius = Math.max(3, Math.round(size * 0.2));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!insideRoundedRect(x, y, 0, 0, size, size, radius)) {
        continue;
      }

      const angleColor = googleBorderColor(x, y, 0, 0, size, size);
      const softCenter = [226, 235, 255, 255];
      const distanceFromCenter = Math.hypot(x - size / 2, y - size / 2) / (size * 0.66);
      const blendAmount = Math.max(0.55, Math.min(0.98, distanceFromCenter * 1.15));
      setPixel(rgba, size, x, y, mixColor(softCenter, angleColor, blendAmount));
    }
  }
}

function drawRainbowPillBorder(rgba, canvasSize, x, y, width, height, radius, border) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      const insideOuter = insideRoundedRect(xx, yy, x, y, width, height, radius);
      const insideInner = insideRoundedRect(
        xx,
        yy,
        x + border,
        y + border,
        width - border * 2,
        height - border * 2,
        radius - border
      );

      if (insideOuter && !insideInner) {
        blendPixel(rgba, canvasSize, xx, yy, googleBorderColor(xx, yy, x, y, width, height));
      }
    }
  }
}

function googleBorderColor(px, py, x, y, width, height) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const angle = Math.atan2(py - cy, px - cx);
  const t = (angle + Math.PI) / (Math.PI * 2);
  const colors = [
    { at: 0, color: [30, 142, 62, 255] },
    { at: 0.14, color: [245, 166, 0, 255] },
    { at: 0.28, color: [211, 47, 47, 255] },
    { at: 0.48, color: [30, 100, 230, 255] },
    { at: 0.78, color: [64, 145, 245, 255] },
    { at: 1, color: [30, 142, 62, 255] }
  ];

  for (let index = 1; index < colors.length; index += 1) {
    const previous = colors[index - 1];
    const next = colors[index];
    if (t <= next.at) {
      const amount = (t - previous.at) / (next.at - previous.at);
      return mixColor(previous.color, next.color, amount);
    }
  }

  return colors[colors.length - 1].color;
}

function drawAiLetters(rgba, size, x, y, width, height, color) {
  if (size < 24) {
    drawLine(
      rgba,
      size,
      Math.round(x + width * 0.52),
      Math.round(y + height * 0.5),
      Math.round(x + width * 0.73),
      Math.round(y + height * 0.5),
      Math.max(1, Math.round(size * 0.03)),
      color
    );
    return;
  }

  const top = Math.round(y + height * 0.33);
  const bottom = Math.round(y + height * 0.69);
  const letterHeight = bottom - top;
  const stroke = Math.max(1, Math.round(size * 0.027));
  const aLeft = Math.round(x + width * 0.48);
  const aWidth = Math.max(5, Math.round(width * 0.14));
  const iLeft = Math.round(x + width * 0.68);

  drawLine(rgba, size, aLeft, bottom, aLeft + Math.round(aWidth / 2), top, stroke, color);
  drawLine(rgba, size, aLeft + aWidth, bottom, aLeft + Math.round(aWidth / 2), top, stroke, color);
  drawLine(
    rgba,
    size,
    aLeft + Math.round(aWidth * 0.25),
    top + Math.round(letterHeight * 0.58),
    aLeft + Math.round(aWidth * 0.75),
    top + Math.round(letterHeight * 0.58),
    stroke,
    color
  );
  drawLine(rgba, size, iLeft, top, iLeft, bottom, stroke, color);
}

function fillRoundedRect(rgba, canvasSize, x, y, width, height, radius, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (insideRoundedRect(xx, yy, x, y, width, height, radius)) {
        blendPixel(rgba, canvasSize, xx, yy, color);
      }
    }
  }
}

function insideRoundedRect(px, py, x, y, width, height, radius) {
  const dx = Math.max(x - px + radius, 0, px - (x + width - radius - 1));
  const dy = Math.max(y - py + radius, 0, py - (y + height - radius - 1));

  return dx * dx + dy * dy <= radius * radius;
}

function drawSparkle(rgba, size, cx, cy, radius, color) {
  for (let yy = cy - radius; yy <= cy + radius; yy += 1) {
    for (let xx = cx - radius; xx <= cx + radius; xx += 1) {
      const distance = Math.abs(xx - cx) + Math.abs(yy - cy);
      if (distance <= radius) {
        blendPixel(rgba, size, xx, yy, color);
      }
    }
  }
}

function drawCircleStroke(rgba, size, cx, cy, radius, thickness, color) {
  for (let y = cy - radius - thickness; y <= cy + radius + thickness; y += 1) {
    for (let x = cx - radius - thickness; x <= cx + radius + thickness; x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance >= radius - thickness / 2 && distance <= radius + thickness / 2) {
        blendPixel(rgba, size, x, y, color);
      }
    }
  }
}

function drawLine(rgba, size, x1, y1, x2, y2, thickness, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);

  for (let step = 0; step <= steps; step += 1) {
    const amount = step / steps;
    const x = Math.round(x1 + (x2 - x1) * amount);
    const y = Math.round(y1 + (y2 - y1) * amount);
    fillCircle(rgba, size, x, y, Math.max(1, Math.round(thickness / 2)), color);
  }
}

function fillCircle(rgba, size, cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
        blendPixel(rgba, size, x, y, color);
      }
    }
  }
}

function mixColor(start, end, amount) {
  return [
    Math.round(start[0] + (end[0] - start[0]) * amount),
    Math.round(start[1] + (end[1] - start[1]) * amount),
    Math.round(start[2] + (end[2] - start[2]) * amount),
    Math.round(start[3] + (end[3] - start[3]) * amount)
  ];
}

function blendPixel(rgba, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const offset = (y * size + x) * 4;
  const alpha = color[3] / 255;
  const inverseAlpha = 1 - alpha;

  rgba[offset] = Math.round(color[0] * alpha + rgba[offset] * inverseAlpha);
  rgba[offset + 1] = Math.round(color[1] * alpha + rgba[offset + 1] * inverseAlpha);
  rgba[offset + 2] = Math.round(color[2] * alpha + rgba[offset + 2] * inverseAlpha);
  rgba[offset + 3] = Math.round(255 * alpha + rgba[offset + 3] * inverseAlpha);
}

function setPixel(rgba, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const offset = (y * size + x) * 4;
  rgba[offset] = color[0];
  rgba[offset + 1] = color[1];
  rgba[offset + 2] = color[2];
  rgba[offset + 3] = color[3];
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
