"use client";

import { useEffect, useState } from "react";
import {
  CROP_VARIANT_ASSETS,
  type CropVariantType,
} from "@/lib/crop-variants";
import { FARM_VISUAL_ASSETS } from "@/lib/visual-layout";

export default function CropVariantVisual({
  cropKey,
  cropName,
  variantType,
}: {
  cropKey: string;
  cropName: string;
  variantType: CropVariantType;
}) {
  const [useFallback, setUseFallback] = useState(variantType === "normal");
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const cropAsset =
    FARM_VISUAL_ASSETS.crops[cropKey as keyof typeof FARM_VISUAL_ASSETS.crops]?.mature;
  const variantAsset =
    variantType === "normal"
      ? null
      : CROP_VARIANT_ASSETS[cropKey as keyof typeof CROP_VARIANT_ASSETS]?.[variantType];
  const src = useFallback || !variantAsset ? cropAsset?.src : variantAsset;
  const shouldProcessFallback = Boolean(src && useFallback && variantType !== "normal");

  useEffect(() => {
    if (!shouldProcessFallback || !src) {
      setProcessedSrc(null);
      return;
    }

    let active = true;
    const image = new window.Image();
    image.onload = () => {
      if (!active) return;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      recolorVariantPixels(frame.data, canvas.width, canvas.height, variantType);
      context.putImageData(frame, 0, 0);
      setProcessedSrc(canvas.toDataURL("image/webp", 0.92));
    };
    image.onerror = () => {
      if (active) setProcessedSrc(null);
    };
    image.src = src;

    return () => {
      active = false;
    };
  }, [shouldProcessFallback, src, variantType]);

  if (!src) {
    return <span className="crop-variant-missing">?</span>;
  }

  return (
    <span className={`crop-variant-visual variant-${variantType} ${useFallback ? "uses-fallback" : ""}`}>
      <img
        src={processedSrc || src}
        alt={`${cropName}${variantType === "golden" ? "金色变异" : "炫彩变异"}`}
        onError={() => setUseFallback(true)}
        draggable={false}
      />
    </span>
  );
}

function recolorVariantPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  variantType: CropVariantType,
) {
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 16) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const hsl = rgbToHsl(red, green, blue);
    if (!isRecolorableCropBody(red, green, blue, hsl)) continue;

    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const shade = Math.max(0.22, Math.min(1.18, hsl.l * 1.1 + hsl.s * 0.18));

    const next =
      variantType === "golden"
        ? goldPixel(x, y, width, height, shade, hsl.l)
        : rainbowPixel(x, y, width, height, shade);
    data[index] = next[0];
    data[index + 1] = next[1];
    data[index + 2] = next[2];
  }
}

function isRecolorableCropBody(
  red: number,
  green: number,
  blue: number,
  hsl: { h: number; s: number; l: number },
) {
  const isGreenLeaf =
    hsl.h >= 58 &&
    hsl.h <= 172 &&
    green > red * 0.78 &&
    green > blue * 1.08;
  const isNearlyNeutral = hsl.s < 0.12;
  const isVeryDarkLine = hsl.l < 0.12;

  return !isGreenLeaf && !isNearlyNeutral && !isVeryDarkLine;
}

function goldPixel(
  x: number,
  y: number,
  width: number,
  height: number,
  shade: number,
  lightness: number,
): [number, number, number] {
  const nx = x / Math.max(1, width);
  const ny = y / Math.max(1, height);
  const diagonal = 1 - Math.min(1, Math.abs(nx + ny * 0.72 - 0.74) * 3.2);
  const topGlow = Math.max(0, 1 - ny * 1.85) * 0.28;
  const specular = Math.max(0, diagonal) * 0.38 + Math.max(0, lightness - 0.52) * 0.56 + topGlow;
  const base = mixRgb([146, 87, 20], [245, 178, 42], Math.min(1, shade));
  const warm = mixRgb(base, [255, 216, 95], Math.min(0.55, specular));
  return mixRgb(warm, [255, 246, 188], Math.min(0.36, Math.max(0, specular - 0.38)));
}

function rainbowPixel(
  x: number,
  y: number,
  width: number,
  height: number,
  shade: number,
): [number, number, number] {
  const nx = x / Math.max(1, width);
  const ny = y / Math.max(1, height);
  const hue = ((nx * 210 + ny * 92 + 184) % 360);
  const crystal = Math.max(0, 1 - Math.abs(nx - ny * 0.62 - 0.18) * 4.5);
  const lightness = Math.min(0.86, 0.63 + shade * 0.12 + crystal * 0.1);
  const [red, green, blue] = hslToRgb(hue, 0.54, lightness);
  const pearly = mixRgb([red, green, blue], [242, 250, 255], 0.2 + crystal * 0.22);
  return mixRgb(pearly, [255, 228, 250], Math.max(0, 0.14 - ny * 0.12));
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: lightness };

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  return { h: hue * 60, s: saturation, l: lightness };
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hp = hue / 60;
  const x = chroma * (1 - Math.abs((hp % 2) - 1));
  const match = lightness - chroma / 2;
  const [r, g, b] =
    hp < 1 ? [chroma, x, 0] :
    hp < 2 ? [x, chroma, 0] :
    hp < 3 ? [0, chroma, x] :
    hp < 4 ? [0, x, chroma] :
    hp < 5 ? [x, 0, chroma] :
    [chroma, 0, x];
  return [
    clampChannel((r + match) * 255),
    clampChannel((g + match) * 255),
    clampChannel((b + match) * 255),
  ];
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mixRgb(
  first: [number, number, number],
  second: [number, number, number],
  amount: number,
): [number, number, number] {
  const ratio = Math.max(0, Math.min(1, amount));
  return [
    clampChannel(first[0] + (second[0] - first[0]) * ratio),
    clampChannel(first[1] + (second[1] - first[1]) * ratio),
    clampChannel(first[2] + (second[2] - first[2]) * ratio),
  ];
}
