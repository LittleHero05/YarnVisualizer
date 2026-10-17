import type { WeightId, WeightInfo } from '../yarn/weights';

// Gauge drives yardage: yarn per square inch ≈ k · √(stitches/in × rows/in).
// k is fit to typical stockinette sweater yardages for each weight class
// (worsted 4.5×6 → ~0.84 yd/in², fingering 7×9.5 → ~1.32 yd/in²).
export const YARN_PER_STITCH_K = 0.162;
/** Typical rows-to-stitches ratio in stockinette, used when a pattern omits row gauge. */
export const ROW_RATIO = 1.3;

export type GaugeSource = 'swatch' | 'pattern' | 'typical';

export interface Gauge {
  stPerIn: number;
  rowsPerIn: number;
  source: GaugeSource;
}

/** Gauge as knitters write it: stitches (and rows) over `per` inches, usually 4. */
export interface GaugeSpec {
  sts?: number | null;
  rows?: number | null;
  per?: number | null;
}

export function toPerInch(g: GaugeSpec, source: GaugeSource): Gauge | null {
  const per = g.per && g.per > 0 ? g.per : 4;
  if (!g.sts || g.sts <= 0) return null;
  const stPerIn = g.sts / per;
  const rowsPerIn = g.rows && g.rows > 0 ? g.rows / per : stPerIn * ROW_RATIO;
  return { stPerIn, rowsPerIn, source };
}

/**
 * Gauge to use: the knitter's swatch, then the pattern's (only while the chosen weight
 * matches the pattern's, since another weight knits to a different gauge), then the weight's typical gauge.
 */
export function effectiveGauge(opts: {
  swatch?: GaugeSpec | null;
  pattern?: GaugeSpec | null;
  patternWeight?: WeightId | null;
  weight: WeightInfo;
}): Gauge {
  const sw = opts.swatch ? toPerInch(opts.swatch, 'swatch') : null;
  if (sw) return sw;
  const pat = opts.pattern && (!opts.patternWeight || opts.patternWeight === opts.weight.id) ? toPerInch(opts.pattern, 'pattern') : null;
  if (pat) return pat;
  return { stPerIn: opts.weight.stPerIn, rowsPerIn: opts.weight.rowsPerIn, source: 'typical' };
}

export function yardsPerSqIn(g: Pick<Gauge, 'stPerIn' | 'rowsPerIn'>): number {
  return YARN_PER_STITCH_K * Math.sqrt(g.stPerIn * g.rowsPerIn);
}
