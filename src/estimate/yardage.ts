import type { Layout } from '../garments/geometry';
import { slotsAt, type PaintSpec } from '../garments/paint';

export const BUFFER = 0.1;

export interface SlotEstimate {
  slot: number;
  areaSqIn: number;
  yards: number;
  skeins: number;
  skeinYards: number;
}

export interface EstimateResult {
  slots: SlotEstimate[];
  total: number;
  /** 'pattern': the designer's total split by color; 'model': computed from area and gauge. */
  basis: 'pattern' | 'model';
}

export interface EstimateOptions {
  ydPerSqIn: number;
  stitchFactor: number;
  skeinYards: number[];
  /** The pattern's stated yardage for this size. When set it is the total, split by color area. */
  patternTotal?: number | null;
}

/**
 * Fabric area per slot by sampling both flat-lay views on a grid.
 * Front view + back view together cover all the fabric (each view shows one layer of each sleeve).
 * Areas are already weighted for ribbing and stranded colorwork.
 */
export function areaBySlot(layouts: Layout[], spec: PaintSpec, step = 0.25): number[] {
  const area = new Array<number>(spec.slotCount).fill(0);
  const cell = step * step;
  for (const L of layouts) {
    const { x, y, w, h } = L.bbox;
    for (let py = y + step / 2; py < y + h; py += step) {
      for (let px = x + step / 2; px < x + w; px += step) {
        for (const s of slotsAt(L, spec, [px, py])) {
          if (s.slot < area.length) area[s.slot] += s.w * cell;
        }
      }
    }
  }
  return area;
}

export function estimateYardage(layouts: Layout[], spec: PaintSpec, opts: EstimateOptions): EstimateResult {
  const areas = areaBySlot(layouts, spec);
  const totalArea = areas.reduce((s, a) => s + a, 0) || 1;
  const fromPattern = Boolean(opts.patternTotal && opts.patternTotal > 0);
  const slots = areas.map((a, slot) => {
    // The designer's figure already includes their own allowance, so no extra buffer on it.
    const yards = Math.round(
      fromPattern ? (opts.patternTotal! * a) / totalArea : a * opts.ydPerSqIn * opts.stitchFactor * (1 + BUFFER),
    );
    const sy = opts.skeinYards[slot] || 200;
    return { slot, areaSqIn: Math.round(a), yards, skeinYards: sy, skeins: yards > 0 ? Math.ceil(yards / sy) : 0 };
  });
  return { slots, total: slots.reduce((s, e) => s + e.yards, 0), basis: fromPattern ? 'pattern' : 'model' };
}
