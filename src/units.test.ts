import { describe, expect, it } from 'vitest';
import { toPerInch } from './estimate/gauge';
import {
  cmToIn, fmtEase, fmtGaugeSpan, fmtLength, fmtYarn, gaugeInUnits, gaugeSpan, inToCm, lengthFromInput, lengthValue,
  mToYd, roundCm, setSwatchCount, yarnFromInput, yarnValue, ydToM,
} from './units';

describe('conversions', () => {
  it('converts inches and centimeters', () => {
    expect(inToCm(1)).toBe(2.54);
    expect(inToCm(42)).toBeCloseTo(106.68);
    expect(cmToIn(inToCm(37.5))).toBeCloseTo(37.5);
  });
  it('converts yards and meters', () => {
    expect(ydToM(1)).toBe(0.9144);
    expect(ydToM(1335)).toBeCloseTo(1220.724);
    expect(mToYd(ydToM(812))).toBeCloseTo(812);
  });
  it('rounds cm to whole numbers, one decimal under 10 cm', () => {
    expect(roundCm(106.68)).toBe(107);
    expect(roundCm(2.54)).toBe(2.5);
    expect(roundCm(-5.08)).toBe(-5.1);
  });
});

describe('formatters', () => {
  it('formats lengths', () => {
    expect(fmtLength(42, 'imperial')).toBe('42.0"');
    expect(fmtLength(42, 'metric')).toBe('107 cm');
    expect(fmtLength(38, 'imperial', { trim: true })).toBe('38"');
    expect(fmtLength(38.5, 'imperial', { trim: true })).toBe('38.5"');
    expect(fmtLength(1, 'metric')).toBe('2.5 cm');
  });
  it('formats yarn lengths', () => {
    expect(fmtYarn(1335, 'imperial')).toBe(`${(1335).toLocaleString()} yd`);
    expect(fmtYarn(1335, 'metric')).toBe(`${(1221).toLocaleString()} m`);
    expect(fmtYarn(140, 'imperial')).toBe('140 yd');
    expect(fmtYarn(140, 'metric')).toBe('128 m');
  });
  it('formats ease like the original labels in inches', () => {
    expect(fmtEase(-2, 'imperial')).toBe('−2"');
    expect(fmtEase(4, 'imperial')).toBe('+4"');
    expect(fmtEase(1, 'imperial', 0)).toBe('0–1"');
    expect(fmtEase(10, 'metric')).toBe('+25 cm');
    expect(fmtEase(-2, 'metric')).toBe('−5.1 cm');
    expect(fmtEase(1, 'metric', 0)).toBe('0–2.5 cm');
  });
  it('labels the gauge span', () => {
    expect(fmtGaugeSpan('imperial')).toBe('4"');
    expect(fmtGaugeSpan('metric')).toBe('10 cm');
    expect(gaugeSpan('metric')).toBeCloseTo(3.937, 3);
  });
});

describe('inputs', () => {
  it('round-trips lengths through the input', () => {
    expect(lengthValue(38, 'metric')).toBe(97);
    expect(lengthFromInput(97, 'metric')).toBeCloseTo(38.19, 2);
    expect(lengthFromInput(38, 'imperial')).toBe(38);
  });
  it('round-trips yardage through the input', () => {
    expect(yarnValue(yarnFromInput(1250, 'metric'), 'metric')).toBe(1250);
    expect(yarnFromInput(1250, 'imperial')).toBe(1250);
  });
});

describe('gauge', () => {
  it('shows a per-4" gauge per 10 cm', () => {
    expect(gaugeInUnits({ sts: 18, rows: 24 }, 'imperial')).toEqual({ sts: 18, rows: 24 });
    expect(gaugeInUnits({ sts: 18, rows: 24 }, 'metric')).toEqual({ sts: 17.7, rows: 23.6 });
  });
  it('stores a metric swatch with its span so the gauge per inch is unchanged', () => {
    const g = setSwatchCount({}, 'sts', 20, 'metric');
    expect(g.per).toBeCloseTo(10 / 2.54);
    expect(toPerInch(g, 'swatch')!.stPerIn).toBeCloseTo(20 / (10 / 2.54));
    // Same physical gauge entered in inches gives the same result.
    const imp = setSwatchCount({}, 'sts', (20 * 4) / (10 / 2.54), 'imperial');
    expect(toPerInch(imp, 'swatch')!.stPerIn).toBeCloseTo(toPerInch(g, 'swatch')!.stPerIn);
  });
  it('rescales the other count when the span changes', () => {
    const g = setSwatchCount({ sts: 18, rows: 24 }, 'sts', 18, 'metric');
    expect(toPerInch(g, 'swatch')!.rowsPerIn).toBeCloseTo(6);
    expect(gaugeInUnits(g, 'imperial')).toEqual({ sts: 18.3, rows: 24 });
  });
});
