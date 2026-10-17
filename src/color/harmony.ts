import { oklchToHex, type Oklch } from './oklch';

// Color-harmony generators in OKLCH. Lightness and chroma are kept in yarn-plausible ranges
// (most dyed wool is far less saturated than screen primaries).

export type HarmonyKind = 'analogous' | 'complementary' | 'split' | 'triadic' | 'monochrome' | 'neutral-accent';

export const HARMONY_LABELS: Record<HarmonyKind, string> = {
  analogous: 'Analogous',
  complementary: 'Complementary',
  split: 'Split complementary',
  triadic: 'Triadic',
  monochrome: 'Tonal',
  'neutral-accent': 'Neutrals + pop',
};

/** Lightness steps spread from dark to light so colorwork stays readable. */
function lightnessLadder(n: number, lo = 0.32, hi = 0.88): number[] {
  if (n === 1) return [0.6];
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

export function harmony(kind: HarmonyKind, n: number, baseHue: number, rand: () => number): string[] {
  const ladder = lightnessLadder(n);
  // Shuffle which lightness goes to which hue so palettes aren't always dark→light by hue.
  const order = ladder.map((_, i) => i).sort(() => rand() - 0.5);
  const chroma = () => 0.05 + rand() * 0.08;
  const out: Oklch[] = [];

  const hueOffsets: Record<Exclude<HarmonyKind, 'monochrome' | 'neutral-accent'>, number[]> = {
    analogous: [0, 25, -25, 50, -50],
    complementary: [0, 180, 15, 195, -15],
    split: [0, 150, 210, 30, 180],
    triadic: [0, 120, 240, 60, 180],
  };

  for (let i = 0; i < n; i++) {
    const l = ladder[order[i]];
    if (kind === 'monochrome') {
      out.push({ l, c: 0.03 + rand() * 0.07, h: baseHue + (rand() - 0.5) * 12 });
    } else if (kind === 'neutral-accent') {
      // One saturated accent, the rest warm or cool neutrals.
      const isAccent = i === n - 1 && n > 1;
      const warm = rand() > 0.5 ? 70 : 250;
      out.push(isAccent ? { l: 0.55 + rand() * 0.15, c: 0.13, h: baseHue } : { l, c: 0.012 + rand() * 0.02, h: warm });
    } else {
      out.push({ l, c: chroma(), h: baseHue + hueOffsets[kind][i % 5] });
    }
  }
  return out.map((o) => oklchToHex({ ...o, h: ((o.h % 360) + 360) % 360 }));
}
