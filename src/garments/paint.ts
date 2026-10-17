import { stripeDistance, zoneAt, type Layout, type Pt } from './geometry';
import type { ZoneId } from './templates';

// How zones map to yarn slots. Shared by the SVG renderer and the yardage estimate.

export interface StripeStep {
  slot: number;
  rows: number;
}

export interface PaintSpec {
  assign: Record<ZoneId, number>;
  stripes: { enabled: boolean; seq: StripeStep[]; rowsPerIn: number };
  colorworkYoke: boolean;
  slotCount: number;
}

export type MotifKind = 'peerie' | 'star' | 'zigzag' | 'diamond';

export interface YokeBand {
  r0: number;
  r1: number;
  /** Background slot for the band; motif slot when `motif` is set. */
  bg: number;
  motif?: { kind: MotifKind; slot: number };
}

/** Concentric yoke bands from the neckband outward. Plain when colorwork is off or only one yarn. */
export function yokeBands(layout: Layout, spec: PaintSpec): YokeBand[] {
  const y = layout.yoke;
  if (!y) return [];
  const bg = spec.assign.yoke;
  if (!spec.colorworkYoke || spec.slotCount < 2) return [{ r0: y.rInner, r1: y.rOuter, bg }];
  const others = Array.from({ length: spec.slotCount }, (_, i) => i).filter((i) => i !== bg);
  const motifSlot = (k: number) => others[k % others.length];
  const span = y.rOuter - y.rInner;
  // Fractions of the yoke depth: [start, end, motif?]
  const plan: [number, number, MotifKind | null][] = [
    [0, 0.12, null],
    [0.12, 0.24, 'peerie'],
    [0.24, 0.34, null],
    [0.34, 0.62, 'star'],
    [0.62, 0.7, null],
    [0.7, 0.82, 'zigzag'],
    [0.82, 0.88, null],
    [0.88, 0.97, 'diamond'],
    [0.97, 1, null],
  ];
  let k = 0;
  return plan.map(([a, b, kind]) => ({
    r0: y.rInner + span * a,
    r1: y.rInner + span * b,
    bg,
    motif: kind ? { kind, slot: motifSlot(k++) } : undefined,
  }));
}

export function stripeSlotAt(spec: PaintSpec, dist: number): number | null {
  const { seq, rowsPerIn } = spec.stripes;
  const total = seq.reduce((s, st) => s + Math.max(0, st.rows), 0);
  if (!total) return null;
  const rows = dist * rowsPerIn;
  let r = ((rows % total) + total) % total;
  for (const st of seq) {
    if (r < st.rows) return st.slot;
    r -= st.rows;
  }
  return seq[seq.length - 1].slot;
}

/** Share of a stranded motif band knit in the motif color (the rest is background). */
export const MOTIF_SHARE = 0.4;
/** Stranded colorwork uses extra yarn for floats. */
export const STRANDED_FACTOR = 1.5;
/** Ribbing is denser than stockinette. */
export const RIB_FACTOR = 1.1;

/**
 * Slots knit at a point, with weights summing to the yarn multiplier for that patch of fabric.
 * Returns an empty list outside the garment.
 */
export function slotsAt(layout: Layout, spec: PaintSpec, pt: Pt): { slot: number; w: number }[] {
  const z = zoneAt(layout, pt);
  if (!z) return [];
  if (z.zone === 'yoke' && layout.yoke) {
    const r = Math.hypot(pt[0] - layout.yoke.cx, pt[1] - layout.yoke.cy);
    const band = yokeBands(layout, spec).find((b) => r >= b.r0 && r < b.r1);
    if (band?.motif) {
      return [
        { slot: band.bg, w: (1 - MOTIF_SHARE) * STRANDED_FACTOR },
        { slot: band.motif.slot, w: MOTIF_SHARE * STRANDED_FACTOR },
      ];
    }
    return [{ slot: spec.assign.yoke, w: 1 }];
  }
  if ((z.zone === 'body' || z.zone === 'sleeves') && spec.stripes.enabled) {
    const s = stripeSlotAt(spec, stripeDistance(layout, z.part, pt));
    if (s !== null) return [{ slot: s, w: 1 }];
  }
  const rib = z.zone === 'hemRib' || z.zone === 'cuffs' || z.zone === 'neckband' || z.zone === 'buttonBand';
  return [{ slot: spec.assign[z.zone], w: rib ? RIB_FACTOR : 1 }];
}
