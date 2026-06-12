import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceDir = path.join(root, "public/assets/tiny-ranch/source");
const runtimeDir = path.join(root, "public/assets/tiny-ranch/runtime");

const files = {
  animals: "TinyFarm_Animals.png",
  characters: "TinyFarm_Characters.png",
  crops: "TinyFarm_Crops.png",
  items: "TinyFarm_Items.png",
  decorations: "TinyFarm_MapDecorations.png",
  structures: "TinyFarm_Structures.png",
  tiles: "TinyFarm_Tiles.png",
};

for (const file of Object.values(files)) {
  await access(path.join(sourceDir, file));
}

await mkdir(runtimeDir, { recursive: true });

async function extract(file, name, left, top, width, height) {
  await sharp(path.join(sourceDir, file))
    .extract({ left, top, width, height })
    .png()
    .toFile(path.join(runtimeDir, name));
}

await Promise.all([
  extract(files.tiles, "grass.png", 0, 0, 8, 8),
  extract(files.tiles, "grass-flowers.png", 24, 0, 8, 8),
  extract(files.tiles, "soil.png", 0, 24, 8, 8),
  extract(files.tiles, "path.png", 16, 24, 8, 8),
  extract(files.tiles, "water.png", 64, 0, 8, 8),
  extract(files.structures, "fence.png", 0, 96, 16, 8),
]);

console.log(`Tiny Ranch runtime assets generated in ${runtimeDir}`);
