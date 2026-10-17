// Display units. Everything is stored and computed in inches and yards;
// these helpers convert only for display and input.
import type { GaugeSpec } from './estimate/gauge';

export type Units = 'imperial' | 'metric';

export const CM_PER_IN = 2.54;
export const M_PER_YD = 0.9144;

export const inToCm = (inches: number) => inches * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const ydToM = (yards: number) => yards * M_PER_YD;
export const mToYd = (m: number) => m / M_PER_YD;

const round1 = (n: number) => Math.round(n * 10) / 10;
/** Normalizes -0 so it never prints as "-0". */
const clean = (n: number) => (Object.is(n, -0) ? 0 : n);

/** Centimeters, whole numbers, or one decimal under 10 cm. */
export function roundCm(cm: number): number {
  return clean(Math.abs(cm) < 10 ? round1(cm) : Math.round(cm));
}

export const lengthUnit = (u: Units) => (u === 'metric' ? 'cm' : 'in');
export const yarnUnit = (u: Units) => (u === 'metric' ? 'm' : 'yd');

/** Inches as the user's unit. `trim` drops a trailing ".0" in inches (38" rather than 38.0"). */
export function fmtLength(inches: number, u: Units, opts: { trim?: boolean } = {}): string {
  if (u === 'metric') return `${roundCm(inToCm(inches))} cm`;
  return `${opts.trim ? clean(round1(inches)) : clean(round1(inches)).toFixed(1)}"`;
}

/** Inches as a number in the user's unit, rounded for an input field. */
export const lengthValue = (inches: number, u: Units) => (u === 'metric' ? roundCm(inToCm(inches)) : clean(round1(inches)));
/** An input value in the user's unit, back to inches. */
export const lengthFromInput = (v: number, u: Units) => (u === 'metric' ? cmToIn(v) : v);

/** Yards as a whole number in the user's unit. */
export const yarnValue = (yards: number, u: Units) => clean(Math.round(u === 'metric' ? ydToM(yards) : yards));
/** An input value in the user's unit, back to yards. */
export const yarnFromInput = (v: number, u: Units) => (u === 'metric' ? mToYd(v) : v);

export function fmtYarn(yards: number, u: Units): string {
  return `${yarnValue(yards, u).toLocaleString()} ${yarnUnit(u)}`;
}

/** The span gauge is written over, in inches: 4" or 10 cm. */
export const gaugeSpan = (u: Units) => (u === 'metric' ? cmToIn(10) : 4);
export const fmtGaugeSpan = (u: Units) => (u === 'metric' ? '10 cm' : '4"');

/** A stitch or row count over `fromPer` inches, rescaled to `toPer` inches. */
export const respanCount = (count: number, fromPer: number, toPer: number) => (count * toPer) / fromPer;

/** A gauge spec's counts over the user's span, rounded to 0.1 for display. */
export function gaugeInUnits(g: GaugeSpec, u: Units): { sts: number | null; rows: number | null } {
  const from = g.per && g.per > 0 ? g.per : 4;
  const to = gaugeSpan(u);
  const conv = (n?: number | null) => (n ? round1(respanCount(n, from, to)) : null);
  return { sts: conv(g.sts), rows: conv(g.rows) };
}

/** Sets one count of a swatch entered over the user's span, rescaling the other to match. */
export function setSwatchCount(g: GaugeSpec, key: 'sts' | 'rows', value: number | null, u: Units): GaugeSpec {
  const from = g.per && g.per > 0 ? g.per : 4;
  const to = gaugeSpan(u);
  const other = key === 'sts' ? 'rows' : 'sts';
  const o = g[other];
  return { [key]: value, [other]: o ? respanCount(o, from, to) : o ?? null, per: to };
}

/** Ease as a signed amount (−2", +10 cm), or a range from `from` (0–2.5 cm). */
export function fmtEase(inches: number, u: Units, from?: number): string {
  const num = (n: number) => lengthValue(Math.abs(n), u);
  const unit = u === 'metric' ? ' cm' : '"';
  if (from !== undefined) return `${num(from)}–${num(inches)}${unit}`;
  return `${inches < 0 ? '−' : '+'}${num(inches)}${unit}`;
}
