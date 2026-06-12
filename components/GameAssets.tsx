import type { CSSProperties } from "react";

type AssetProps = {
  className?: string;
  style?: CSSProperties;
};

type SpriteStyle = CSSProperties & Record<`--${string}`, string>;

const cropRows: Record<string, number> = {
  starflower: 0,
  tomato: 2,
  strawberry: 3,
  wheat: 8,
  radish: 9,
};

const petColumns: Record<string, number> = {
  dog: 10,
  cat: 13,
  rabbit: 15,
  fairy: 7,
};

const decorationFrames: Record<string, [string, number, number, number, number]> = {
  path: ["items", 16, 16, 8, 8],
  flowerbed: ["decorations", 0, 0, 16, 16],
  swing: ["structures", 0, 40, 24, 24],
  lamp: ["structures", 32, 40, 16, 24],
  heartarch: ["structures", 48, 40, 16, 24],
};

function framePosition(offset: number, sheet: number, frame: number) {
  return `${(offset / (sheet - frame)) * 100}%`;
}

export function CoinIcon({ className = "" }: AssetProps) {
  return <span className={`pixel-ui-icon coin ${className}`} aria-hidden="true" />;
}

export function HeartIcon({ className = "" }: AssetProps) {
  return <span className={`pixel-ui-icon heart ${className}`} aria-hidden="true" />;
}

export function EnvelopeIcon({ className = "" }: AssetProps) {
  return <span className={`pixel-ui-icon envelope ${className}`} aria-hidden="true" />;
}

export function WateringCan({ className = "" }: AssetProps) {
  const style: SpriteStyle = {
    "--sprite-x": framePosition(40, 56, 8),
    "--sprite-y": framePosition(16, 32, 8),
  };
  return <span className={`pixel-item-sprite ${className}`} style={style} aria-hidden="true" />;
}

export function BasketIcon({ className = "" }: AssetProps) {
  const style: SpriteStyle = {
    "--sprite-x": framePosition(48, 56, 8),
    "--sprite-y": framePosition(16, 32, 8),
  };
  return <span className={`pixel-item-sprite ${className}`} style={style} aria-hidden="true" />;
}

export function CropArt({
  cropKey,
  stage = "mature",
  className = "",
}: {
  cropKey?: string | null;
  stage?: "young" | "mid" | "mature" | "withered";
  className?: string;
}) {
  const row = cropRows[cropKey || "radish"] ?? cropRows.radish;
  const column = stage === "young" ? 3 : stage === "mid" ? 5 : 6;
  const style: SpriteStyle = {
    "--sprite-x": `${(column / 6) * 100}%`,
    "--sprite-y": `${(row / 9) * 100}%`,
  };
  return (
    <span
      className={`pixel-crop-sprite ${stage === "withered" ? "is-withered" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SeedBagArt({ cropKey, className = "" }: { cropKey: string; className?: string }) {
  const row = cropRows[cropKey] ?? cropRows.radish;
  const style: SpriteStyle = {
    "--sprite-x": `${100 / 6}%`,
    "--sprite-y": `${(row / 9) * 100}%`,
  };
  return <span className={`pixel-crop-sprite ${className}`} style={style} aria-hidden="true" />;
}

export function FarmHouse({ className = "" }: AssetProps) {
  const style: SpriteStyle = {
    "--sprite-x": "0%",
    "--sprite-y": "0%",
  };
  return <span className={`pixel-structure house ${className}`} style={style} aria-hidden="true" />;
}

export function TreeArt({ className = "", style }: AssetProps) {
  const spriteStyle: SpriteStyle = {
    ...style,
    "--sprite-x": framePosition(16, 64, 16),
    "--sprite-y": framePosition(16, 48, 24),
  };
  return <span className={`pixel-decoration-sprite tree ${className}`} style={spriteStyle} aria-hidden="true" />;
}

export function FenceArt({ className = "" }: AssetProps) {
  return <span className={`pixel-fence-sprite ${className}`} aria-hidden="true" />;
}

export function DecorationArt({
  decorationKey,
  className = "",
}: {
  decorationKey: string;
  className?: string;
}) {
  if (decorationKey === "fence") return <FenceArt className={className} />;
  const [sheet, left, top, width, height] =
    decorationFrames[decorationKey] || decorationFrames.flowerbed;
  const sizes = sheet === "structures" ? [64, 128] : sheet === "items" ? [56, 32] : [64, 48];
  const style: SpriteStyle = {
    "--sprite-sheet": `url("/assets/tiny-ranch/source/TinyFarm_${
      sheet === "structures" ? "Structures" : sheet === "items" ? "Items" : "MapDecorations"
    }.png")`,
    "--sprite-size-x": `${(sizes[0] / width) * 100}%`,
    "--sprite-size-y": `${(sizes[1] / height) * 100}%`,
    "--sprite-x": framePosition(left, sizes[0], width),
    "--sprite-y": framePosition(top, sizes[1], height),
    "--sprite-ratio": `${width} / ${height}`,
  };
  return <span className={`pixel-free-sprite ${className}`} style={style} aria-hidden="true" />;
}

export function PetArt({ petKey, className = "" }: { petKey: string; className?: string }) {
  const column = petColumns[petKey] ?? petColumns.dog;
  const from = `${(column / 15) * 100}%`;
  const to = `${(Math.min(15, column + 1) / 15) * 100}%`;
  const style: SpriteStyle = {
    "--pet-from": from,
    "--pet-to": to,
    "--pet-y": "0%",
  };
  return <span className={`pixel-pet-sprite ${className}`} style={style} aria-hidden="true" />;
}
