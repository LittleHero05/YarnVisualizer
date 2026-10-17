import { CURATED } from './curated';
import { harmony, HARMONY_LABELS, type HarmonyKind } from './harmony';
import { hexToOklch, oklchToHex } from './oklch';

export interface Palette {
  name: string;
  colors: string[];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Minimum OKLab lightness gap between any two colors, so stripes and colorwork stay legible. */
export const MIN_LIGHTNESS_GAP = 0.08;

/** Nudge unlocked colors apart in lightness until every pair is at least MIN_LIGHTNESS_GAP apart. */
export function ensureContrast(colors: string[], locked: boolean[] = []): string[] {
  const o = colors.map(hexToOklch);
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < o.length; i++) {
      for (let j = i + 1; j < o.length; j++) {
        const gap = Math.abs(o[i].l - o[j].l);
        if (gap >= MIN_LIGHTNESS_GAP) continue;
        // Move whichever is unlocked; push toward the side with more room.
        const idx = !locked[j] ? j : !locked[i] ? i : -1;
        if (idx < 0) continue;
        const other = idx === j ? o[i] : o[j];
        const dir = o[idx].l >= other.l ? 1 : -1;
        let next = other.l + dir * (MIN_LIGHTNESS_GAP + 0.01);
        if (next > 0.95 || next < 0.2) next = other.l - dir * (MIN_LIGHTNESS_GAP + 0.01);
        o[idx] = { ...o[idx], l: Math.min(0.95, Math.max(0.2, next)) };
        moved = true;
      }
    }
    if (!moved) break;
  }
  return o.map((c, i) => (locked[i] ? colors[i] : oklchToHex(c)));
}

/**
 * Generate palettes of `n` colors. `locked[i]` (a hex) keeps that slot fixed in every palette;
 * the harmony is then built around the first locked color's hue.
 */
export function generatePalettes(n: number, seed: number, locked: (string | null)[] = [], count = 6): Palette[] {
  const rand = mulberry32(seed);
  const lockedFlags = Array.from({ length: n }, (_, i) => Boolean(locked[i]));
  const anchor = locked.find(Boolean);
  const baseHue = anchor ? hexToOklch(anchor).h : rand() * 360;
  const kinds = Object.keys(HARMONY_LABELS) as HarmonyKind[];

  const fill = (colors: string[]) =>
    ensureContrast(
      Array.from({ length: n }, (_, i) => locked[i] ?? colors[i % colors.length]),
      lockedFlags,
    );

  const out: Palette[] = [];
  // Two curated palettes (rotated by seed) plus generated harmonies.
  for (let k = 0; k < 2; k++) {
    const c = CURATED[Math.floor(rand() * CURATED.length)];
    if (out.some((p) => p.name === c.name)) continue;
    out.push({ name: c.name, colors: fill(c.colors) });
  }
  for (let i = 0; out.length < count; i++) {
    const kind = kinds[(Math.floor(rand() * kinds.length) + i) % kinds.length];
    const hue = baseHue + (i === 0 ? 0 : (rand() - 0.5) * 40);
    out.push({ name: HARMONY_LABELS[kind], colors: fill(harmony(kind, n, hue, rand)) });
  }
  return out;
}
