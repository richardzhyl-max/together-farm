import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public/assets/game/crops/added-crops-source-sheet.png");
const cropRoot = path.join(root, "public/assets/game/crops");

const rows = [
  "bokchoy",
  "corn",
  "pumpkin",
  "blueberry",
  "grape",
  "cotton",
  "moonshroom",
  "heartrose",
];
const columns = ["seedling", "growing", "mature", "withered", "seed-bag"];
const sourceMeta = await sharp(source).metadata();
const sheetWidth = sourceMeta.width || 0;
const sheetHeight = sourceMeta.height || 0;
if (!sheetWidth || !sheetHeight) throw new Error(`Cannot read source sheet: ${source}`);

for (const [rowIndex, cropKey] of rows.entries()) {
  const dir = path.join(cropRoot, cropKey);
  await mkdir(dir, { recursive: true });

  for (const [columnIndex, stage] of columns.entries()) {
    const gridLeft = Math.round((columnIndex * sheetWidth) / columns.length);
    const gridRight = Math.round(((columnIndex + 1) * sheetWidth) / columns.length);
    const gridTop = Math.round((rowIndex * sheetHeight) / rows.length);
    const gridBottom = Math.round(((rowIndex + 1) * sheetHeight) / rows.length);
    const cellWidth = gridRight - gridLeft;
    const cellHeight = gridBottom - gridTop;
    const isSpacedSource = cellWidth >= 360 && cellHeight >= 360;
    const xPadding = isSpacedSource ? 0 : 14;
    const yTopInset = isSpacedSource ? 0 : cropKey === "heartrose" ? -14 : rowIndex === 0 ? 0 : 32;
    const yBottomPadding = isSpacedSource ? 0 : cropKey === "heartrose" ? 38 : 28;
    const left = Math.max(0, gridLeft - xPadding);
    const right = Math.min(sheetWidth, gridRight + xPadding);
    const top = Math.max(0, gridTop + yTopInset);
    const bottom = Math.min(sheetHeight, gridBottom + yBottomPadding);
    const cell = await sharp(source)
      .extract({
        left,
        top,
        width: right - left,
        height: bottom - top,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const transparent = removeTinyArtifacts(
      removeEdgeArtifacts(
        removeThinArtifacts(
          removeMagenta(cell.data, cell.info.width, cell.info.height),
          cell.info.width,
          cell.info.height,
        ),
        cell.info.width,
        cell.info.height,
      ),
      cell.info.width,
      cell.info.height,
    );
    const box = contentBox(transparent, cell.info.width, cell.info.height);
    const sprite = await sharp(transparent, {
      raw: {
        width: cell.info.width,
        height: cell.info.height,
        channels: 4,
      },
    })
      .extract(box)
      .resize({
        width: stage === "seed-bag" ? 190 : 244,
        height: 222,
        fit: stage === "seed-bag" ? "fill" : "contain",
        kernel: sharp.kernel.lanczos3,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const spriteMeta = await sharp(sprite).metadata();
    const canvas = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: sprite,
          left: Math.max(0, Math.round((256 - (spriteMeta.width || 0)) / 2)),
          top: Math.max(0, Math.round((256 - (spriteMeta.height || 0)) / 2)),
        },
      ])
      .png()
      .toBuffer();
    await writeCleanWebp(canvas, path.join(dir, `${stage}.webp`));
  }
}

await writeSpacedSourceSheet();

console.log(`Extracted ${rows.length * columns.length} crop assets from ${source}`);

function removeMagenta(buffer, width, height) {
  const out = Buffer.from(buffer);
  const seen = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x += 1) {
    enqueueIfKey(x, 0);
    enqueueIfKey(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueIfKey(0, y);
    enqueueIfKey(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const cx = current % width;
    const cy = Math.floor(current / width);
    const offset = current * 4;
    out[offset] = 0;
    out[offset + 1] = 0;
    out[offset + 2] = 0;
    out[offset + 3] = 0;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      enqueueIfKey(cx + dx, cy + dy);
    }
  }

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const r = out[offset];
    const g = out[offset + 1];
    const b = out[offset + 2];
    const a = out[offset + 3];
    const magentaDistance = Math.abs(r - 255) + Math.abs(g - 0) + Math.abs(b - 255);
    const nearKeyFill =
      magentaDistance < 160 &&
      r > 205 &&
      g < 115 &&
      b > 205 &&
      r - g > 95 &&
      b - g > 95;
    if (a < 8 || nearKeyFill) {
      out[offset] = 0;
      out[offset + 1] = 0;
      out[offset + 2] = 0;
      out[offset + 3] = 0;
    }
  }

  return out;

  function enqueueIfKey(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (seen[index]) return;
    const offset = index * 4;
    const r = out[offset];
    const g = out[offset + 1];
    const b = out[offset + 2];
    const a = out[offset + 3];
    const magentaDistance = Math.abs(r - 255) + Math.abs(g - 0) + Math.abs(b - 255);
    const isKey = a < 8 || magentaDistance < 120 || (r > 230 && g < 80 && b > 230);
    if (!isKey) return;
    seen[index] = 1;
    queue.push(index);
  }
}

function contentBox(buffer, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const a = buffer[offset + 3];
      if (a <= 14) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return { left: 0, top: 0, width, height };
  }

  const padding = 3;
  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width - 1, maxX + padding);
  const bottom = Math.min(height - 1, maxY + padding);
  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function removeThinArtifacts(buffer, width, height) {
  const out = Buffer.from(buffer);
  const seen = new Uint8Array(width * height);
  const queue = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (seen[index] || out[index * 4 + 3] <= 14) continue;

      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      const pixels = [];
      queue.length = 0;
      queue.push(index);
      seen[index] = 1;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        const cx = current % width;
        const cy = Math.floor(current / width);
        pixels.push(current);
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (seen[next] || out[next * 4 + 3] <= 14) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }

      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      if (componentWidth > 28 && componentHeight <= 7) {
        for (const pixel of pixels) {
          const offset = pixel * 4;
          out[offset] = 0;
          out[offset + 1] = 0;
          out[offset + 2] = 0;
          out[offset + 3] = 0;
        }
      }
    }
  }

  return out;
}

function removeEdgeArtifacts(buffer, width, height) {
  const out = Buffer.from(buffer);
  const seen = new Uint8Array(width * height);
  const queue = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (seen[index] || out[index * 4 + 3] <= 14) continue;

      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      const pixels = [];
      queue.length = 0;
      queue.push(index);
      seen[index] = 1;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        const cx = current % width;
        const cy = Math.floor(current / width);
        pixels.push(current);
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (seen[next] || out[next * 4 + 3] <= 14) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }

      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      const touchesCropEdge = minY <= 1 || maxY >= height - 2;
      const likelyNeighborFragment = componentHeight <= 58 && componentWidth >= 10;
      if (touchesCropEdge && likelyNeighborFragment) {
        for (const pixel of pixels) {
          const offset = pixel * 4;
          out[offset] = 0;
          out[offset + 1] = 0;
          out[offset + 2] = 0;
          out[offset + 3] = 0;
        }
      }
    }
  }

  return out;
}

function removeTinyArtifacts(buffer, width, height) {
  const out = Buffer.from(buffer);
  const seen = new Uint8Array(width * height);
  const queue = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (seen[index] || out[index * 4 + 3] <= 14) continue;

      const pixels = [];
      queue.length = 0;
      queue.push(index);
      seen[index] = 1;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        const cx = current % width;
        const cy = Math.floor(current / width);
        pixels.push(current);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (seen[next] || out[next * 4 + 3] <= 14) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }

      if (pixels.length < 80) {
        for (const pixel of pixels) {
          const offset = pixel * 4;
          out[offset] = 0;
          out[offset + 1] = 0;
          out[offset + 2] = 0;
          out[offset + 3] = 0;
        }
      }
    }
  }

  return out;
}

async function writeSpacedSourceSheet() {
  const cellSize = 420;
  const composites = [];
  for (const [rowIndex, cropKey] of rows.entries()) {
    for (const [columnIndex, stage] of columns.entries()) {
      const input = path.join(cropRoot, cropKey, `${stage}.webp`);
      const meta = await sharp(input).metadata();
      composites.push({
        input,
        left: columnIndex * cellSize + Math.round((cellSize - (meta.width || 256)) / 2),
        top: rowIndex * cellSize + Math.round((cellSize - (meta.height || 256)) / 2),
      });
    }
  }

  await sharp({
    create: {
      width: columns.length * cellSize,
      height: rows.length * cellSize,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(source);
}

async function writeCleanWebp(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const clean = removeMagentaEdgeFringe(data, info.width, info.height);
  await sharp(clean, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .webp({ quality: 96 })
    .toFile(output);
}

function removeMagentaEdgeFringe(buffer, width, height) {
  const out = Buffer.from(buffer);

  for (let pass = 0; pass < 2; pass += 1) {
    const next = Buffer.from(out);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const r = out[offset];
        const g = out[offset + 1];
        const b = out[offset + 2];
        const a = out[offset + 3];
        if (a <= 14) continue;

        const magentaDistance = Math.abs(r - 255) + Math.abs(g - 0) + Math.abs(b - 255);
        const magentaFringe =
          (magentaDistance < 135 && r > 185 && g < 120 && b > 185) ||
          (r > 170 && b > 150 && g < 115 && r - g > 55 && b - g > 55);
        if (!magentaFringe || !touchesTransparent(x, y)) continue;

        next[offset] = 0;
        next[offset + 1] = 0;
        next[offset + 2] = 0;
        next[offset + 3] = 0;
      }
    }
    next.copy(out);
  }

  return out;

  function touchesTransparent(x, y) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
        if (out[(ny * width + nx) * 4 + 3] <= 14) return true;
      }
    }
    return false;
  }
}
