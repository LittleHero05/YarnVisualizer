// Extra yarn by stitch pattern, relative to stockinette. Rules of thumb, not measurements.

export type StitchId = 'stockinette' | 'texture' | 'garter' | 'cables' | 'slip' | 'brioche' | 'lace';

export const STITCHES: { id: StitchId; label: string; factor: number }[] = [
  { id: 'stockinette', label: 'Stockinette', factor: 1 },
  { id: 'texture', label: 'Some texture or small cables', factor: 1.08 },
  { id: 'garter', label: 'Mostly garter or seed stitch', factor: 1.15 },
  { id: 'slip', label: 'Slip-stitch or mosaic', factor: 1.15 },
  { id: 'cables', label: 'Allover cables', factor: 1.25 },
  { id: 'brioche', label: 'Brioche', factor: 1.6 },
  { id: 'lace', label: 'Lace', factor: 0.9 },
];

export function stitchFactor(id: StitchId): number {
  return STITCHES.find((s) => s.id === id)?.factor ?? 1;
}

/** Best guess from Ravelry attribute permalinks and the pattern name. Strongest effect wins. */
export function detectStitch(attrs: string[], name = ''): StitchId {
  const t = [...attrs, name].join(' ').toLowerCase();
  if (/brioche/.test(t)) return 'brioche';
  if (/\bcables?\b|cabled|\baran\b/.test(t)) return 'cables';
  if (/mosaic|slip-stitch|slipped/.test(t)) return 'slip';
  if (/garter|seed-stitch|moss/.test(t)) return 'garter';
  if (/textured|twisted-stitches|bobbles/.test(t)) return 'texture';
  if (/\blace\b|eyelets/.test(t)) return 'lace';
  return 'stockinette';
}
