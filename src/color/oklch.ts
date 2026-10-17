// sRGB hex ⇄ OKLab/OKLCH conversions (Björn Ottosson's matrices) plus a few helpers.

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.37
  h: number; // degrees
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}

export function isHex(s: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
}

export function rgbToOklab(r8: number, g8: number, b8: number): [number, number, number] {
  const r = toLinear(r8 / 255), g = toLinear(g8 / 255), b = toLinear(b8 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklabToHex(L: number, a: number, b: number): string {
  const [r, g, bl] = oklabToLinear(L, a, b);
  return rgbToHex(toGamma(clamp01(r)) * 255, toGamma(clamp01(g)) * 255, toGamma(clamp01(bl)) * 255);
}

export function hexToOklch(hex: string): Oklch {
  const [L, a, b] = rgbToOklab(...hexToRgb(hex));
  const c = Math.hypot(a, b);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** OKLCH → hex, reducing chroma until the color fits in sRGB. */
export function oklchToHex({ l, c, h }: Oklch): string {
  const L = clamp01(l);
  const rad = (h * Math.PI) / 180;
  const inGamut = (cc: number) =>
    oklabToLinear(L, cc * Math.cos(rad), cc * Math.sin(rad)).every((v) => v >= -0.0005 && v <= 1.0005);
  let lo = 0, hi = Math.max(0, c);
  if (!inGamut(hi)) {
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(mid)) lo = mid;
      else hi = mid;
    }
    hi = lo;
  }
  return oklabToHex(L, hi * Math.cos(rad), hi * Math.sin(rad));
}

/** Perceptual average of colors in OKLab. */
export function mixHex(hexes: string[], weights?: number[]): string {
  let L = 0, A = 0, B = 0, W = 0;
  hexes.forEach((h, i) => {
    const w = weights?.[i] ?? 1;
    const [l, a, b] = rgbToOklab(...hexToRgb(h));
    L += l * w; A += a * w; B += b * w; W += w;
  });
  return oklabToHex(L / W, A / W, B / W);
}

export function adjust(hex: string, d: { l?: number; c?: number; h?: number }): string {
  const o = hexToOklch(hex);
  return oklchToHex({ l: o.l + (d.l ?? 0), c: Math.max(0, o.c * (d.c ?? 1)), h: o.h + (d.h ?? 0) });
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Text color that reads on top of a swatch. */
export function inkOn(hex: string): string {
  return relativeLuminance(hex) > 0.35 ? '#1d1b18' : '#fbf8f3';
}
