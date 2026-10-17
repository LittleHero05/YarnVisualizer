// Body measurements loosely following the Craft Yarn Council standard (inches), plus ease.

export type SizeId = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL' | '5XL';

interface Row {
  id: SizeId;
  bust: number;
  bodyLength: number; // underarm to hem
  armDepth: number; // shoulder top to underarm
  upperArm: number;
  sleeveLength: number; // underarm to cuff
  wrist: number;
  neckWidth: number;
}

export const SIZE_CHART: Row[] = [
  { id: 'XS', bust: 30, bodyLength: 14, armDepth: 7, upperArm: 10, sleeveLength: 17, wrist: 6, neckWidth: 6.5 },
  { id: 'S', bust: 34, bodyLength: 14.5, armDepth: 7.5, upperArm: 11, sleeveLength: 17.5, wrist: 6.25, neckWidth: 7 },
  { id: 'M', bust: 38, bodyLength: 15, armDepth: 8, upperArm: 12, sleeveLength: 18, wrist: 6.5, neckWidth: 7 },
  { id: 'L', bust: 42, bodyLength: 15.5, armDepth: 8.5, upperArm: 13.5, sleeveLength: 18.5, wrist: 7, neckWidth: 7.5 },
  { id: 'XL', bust: 46, bodyLength: 16, armDepth: 9, upperArm: 15, sleeveLength: 18.5, wrist: 7.5, neckWidth: 7.5 },
  { id: '2XL', bust: 50, bodyLength: 16.5, armDepth: 9.5, upperArm: 16.5, sleeveLength: 18.5, wrist: 8, neckWidth: 8 },
  { id: '3XL', bust: 54, bodyLength: 17, armDepth: 10, upperArm: 18, sleeveLength: 18.5, wrist: 8.5, neckWidth: 8 },
  { id: '4XL', bust: 58, bodyLength: 17, armDepth: 10.5, upperArm: 19.5, sleeveLength: 18.5, wrist: 9, neckWidth: 8.5 },
  { id: '5XL', bust: 62, bodyLength: 17.5, armDepth: 11, upperArm: 21, sleeveLength: 18.5, wrist: 9.5, neckWidth: 8.5 },
];

// `name` and `from` let the label be rebuilt in other units; `from` marks a range (0–1").
export const EASE_OPTIONS = [
  { id: 'negative', name: 'Negative', label: 'Negative (−2")', inches: -2 },
  { id: 'fitted', name: 'Fitted', label: 'Fitted (0–1")', inches: 1, from: 0 },
  { id: 'classic', name: 'Classic', label: 'Classic (+4")', inches: 4 },
  { id: 'relaxed', name: 'Relaxed', label: 'Relaxed (+6")', inches: 6 },
  { id: 'oversized', name: 'Oversized', label: 'Oversized (+10")', inches: 10 },
] as const;
export type EaseId = (typeof EASE_OPTIONS)[number]['id'];

export interface SizeInput {
  preset: SizeId | 'custom';
  bust?: number; // body bust, custom only
  length?: number; // underarm-to-hem override
  ease: EaseId;
}

export interface Measurements {
  chest: number; // finished circumference
  bodyLength: number;
  armDepth: number;
  upperArm: number; // finished
  sleeveLength: number;
  wrist: number; // finished cuff
  neckWidth: number;
  hemRib: number;
  cuffRib: number;
  neckband: number;
}

/** Linear interpolation across the chart by bust, clamped to its ends. */
function rowForBust(bust: number): Omit<Row, 'id'> {
  const rows = SIZE_CHART;
  if (bust <= rows[0].bust) return rows[0];
  if (bust >= rows[rows.length - 1].bust) return rows[rows.length - 1];
  const i = rows.findIndex((r) => r.bust >= bust);
  const a = rows[i - 1], b = rows[i];
  const t = (bust - a.bust) / (b.bust - a.bust);
  const lerp = (k: keyof Omit<Row, 'id'>) => a[k] + (b[k] - a[k]) * t;
  return {
    bust, bodyLength: lerp('bodyLength'), armDepth: lerp('armDepth'), upperArm: lerp('upperArm'),
    sleeveLength: lerp('sleeveLength'), wrist: lerp('wrist'), neckWidth: lerp('neckWidth'),
  };
}

export function measurementsFor(input: SizeInput): Measurements {
  const base =
    input.preset === 'custom'
      ? rowForBust(input.bust ?? 38)
      : SIZE_CHART.find((r) => r.id === input.preset) ?? SIZE_CHART[2];
  const ease = EASE_OPTIONS.find((e) => e.id === input.ease)?.inches ?? 4;
  return {
    chest: base.bust + ease,
    bodyLength: input.length && input.length > 4 ? input.length : base.bodyLength,
    armDepth: base.armDepth + Math.max(0, ease) * 0.08,
    upperArm: base.upperArm + Math.max(1, ease * 0.45),
    sleeveLength: base.sleeveLength,
    wrist: base.wrist + 1.5,
    neckWidth: base.neckWidth,
    hemRib: 2,
    cuffRib: 2.5,
    neckband: 1,
  };
}
