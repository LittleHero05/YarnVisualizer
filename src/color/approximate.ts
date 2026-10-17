import { matchColorName, textureFromName, type YarnTexture } from './colorNames';
import { adjust, hexToOklch, mixHex, oklabToHex, rgbToOklab } from './oklch';

export type ColorSource = 'photo' | 'name' | 'ravelry-photo' | 'manual' | 'generated' | 'default';

export interface Approximation {
  hex: string;
  texture: YarnTexture;
  source: ColorSource;
  /** Extra colors seen in a photo or name, used for speckle/variegated rendering. */
  accents: string[];
}

export const DEFAULT_YARN_HEX = '#b9ae9c';

export interface SampleResult {
  hex: string;
  accents: string[];
  texture: YarnTexture;
}

/**
 * Dominant yarn color from RGBA pixels (k-means in OKLab, k=3).
 * Near-white, near-black (shadow) and transparent pixels are skipped as background,
 * unless the yarn itself appears to be white or black.
 */
export function dominantColor(pixels: Uint8ClampedArray | number[], k = 3): SampleResult | null {
  const pts: [number, number, number][] = [];
  const pale: [number, number, number][] = [];
  const shadow: [number, number, number][] = []; // gaps between strands, dark backdrops
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const lab = rgbToOklab(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (lab[0] < 0.22) shadow.push(lab);
    else (lab[0] > 0.96 && Math.hypot(lab[1], lab[2]) < 0.02 ? pale : pts).push(lab);
  }
  // Fall back to pale/shadow pixels only when the yarn itself is white or black.
  const data = pts.length >= 20 ? pts : pts.concat(pale, shadow);
  if (!data.length) return null;

  // Deterministic init: spread across lightness.
  const sorted = [...data].sort((a, b) => a[0] - b[0]);
  let centers = Array.from({ length: Math.min(k, data.length) }, (_, i) =>
    sorted[Math.floor(((i + 0.5) / k) * sorted.length)].slice() as [number, number, number],
  );
  let assign = new Array<number>(data.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    assign = data.map((p) => {
      let best = 0, bd = Infinity;
      centers.forEach((c, ci) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bd) { bd = d; best = ci; }
      });
      return best;
    });
    centers = centers.map((c, ci) => {
      const mine = data.filter((_, i) => assign[i] === ci);
      if (!mine.length) return c;
      return [0, 1, 2].map((d) => mine.reduce((s, p) => s + p[d], 0) / mine.length) as [number, number, number];
    });
  }
  const sizes = centers.map((_, ci) => assign.filter((a) => a === ci).length);
  const order = centers.map((_, i) => i).sort((a, b) => sizes[b] - sizes[a]);
  const toHex = (c: [number, number, number]) => oklabToHex(c[0], c[1], c[2]);
  const main = toHex(centers[order[0]]);
  const accents = order.slice(1).filter((i) => sizes[i] > data.length * 0.08).map((i) => toHex(centers[i]));

  // Several clusters with clearly different hues → speckled/variegated yarn.
  const hues = [main, ...accents].map(hexToOklch).filter((o) => o.c > 0.04).map((o) => o.h);
  const spread = hues.length > 1 ? Math.max(...hues.map((h) => Math.min(...hues.map((g) => hueDist(h, g)).filter((d) => d > 0), 360))) : 0;
  const texture: YarnTexture = spread > 60 ? 'variegated' : 'solid';
  return { hex: main, accents, texture };
}

function hueDist(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export interface ApproximateInput {
  userPhoto?: SampleResult | null;
  colorwayName?: string;
  yarnName?: string;
  ravelryPhoto?: SampleResult | null;
}

/**
 * Approximate a yarn's color. Order: the user's own photo → color words in the colorway name →
 * the Ravelry yarn photo (that shows the line, not necessarily this colorway) → a neutral default.
 * A hex the user picks afterwards is stored as a manual override and isn't computed here.
 */
export function approximateColor({ userPhoto, colorwayName = '', yarnName = '', ravelryPhoto }: ApproximateInput): Approximation {
  const nameTexture = textureFromName(`${colorwayName} ${yarnName}`);
  if (userPhoto) {
    return {
      hex: userPhoto.hex,
      accents: userPhoto.accents,
      texture: nameTexture !== 'solid' ? nameTexture : userPhoto.texture,
      source: 'photo',
    };
  }
  const m = colorwayName ? matchColorName(colorwayName) : null;
  if (m) {
    let hex = m.hexes.length > 1 ? mixHex(m.hexes, m.hexes.map((_, i) => (i === m.hexes.length - 1 ? 2 : 1))) : m.hexes[0];
    if (m.lightness || m.chromaScale !== 1) hex = adjust(hex, { l: m.lightness, c: m.chromaScale });
    return { hex, accents: m.hexes.length > 1 ? m.hexes : [], texture: m.texture, source: 'name' };
  }
  if (ravelryPhoto) {
    return { hex: ravelryPhoto.hex, accents: ravelryPhoto.accents, texture: nameTexture !== 'solid' ? nameTexture : ravelryPhoto.texture, source: 'ravelry-photo' };
  }
  return { hex: DEFAULT_YARN_HEX, accents: [], texture: nameTexture, source: 'default' };
}

/** Browser-only: load an image (object URL or proxied Ravelry URL) and sample its dominant color. */
export async function sampleImage(src: string): Promise<SampleResult | null> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  // Center crop: yarn photos usually have the skein in the middle and background at the edges.
  const s = Math.min(img.naturalWidth, img.naturalHeight) * 0.7;
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
  return dominantColor(ctx.getImageData(0, 0, size, size).data);
}
