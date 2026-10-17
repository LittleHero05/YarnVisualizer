import { describe, expect, it } from 'vitest';
import { effectiveGauge, yardsPerSqIn } from '../estimate/gauge';
import { detectStitch } from '../estimate/stitch';
import { estimateYardage, type EstimateOptions } from '../estimate/yardage';
import { weightInfo } from '../yarn/weights';
import { classifyPattern } from './classify';
import { buildLayout, zoneAt } from './geometry';
import type { PaintSpec } from './paint';
import { measurementsFor } from './sizing';
import { templateById, type TemplateId } from './templates';

const spec = (n = 2, extra: Partial<PaintSpec> = {}): PaintSpec => ({
  assign: { body: 0, sleeves: 0, yoke: 0, hemRib: 1, cuffs: 1, neckband: 1, buttonBand: 1 },
  stripes: { enabled: false, seq: [{ slot: 0, rows: 10 }, { slot: 1, rows: 10 }], rowsPerIn: 6 },
  colorworkYoke: false,
  slotCount: n,
  ...extra,
});

function run(t: TemplateId, preset: 'XS' | 'M' | '3XL', s = spec(), opts: Partial<EstimateOptions> = {}) {
  const m = measurementsFor({ preset, ease: 'classic' });
  const tpl = templateById(t);
  const w = weightInfo('worsted');
  return estimateYardage([buildLayout(tpl, m, 'front'), buildLayout(tpl, m, 'back')], s, {
    ydPerSqIn: yardsPerSqIn(w),
    stitchFactor: 1,
    skeinYards: [200, 200],
    ...opts,
  });
}
const yards = (...a: Parameters<typeof run>) => run(...a).slots;

describe('classify', () => {
  it('maps categories and attributes to templates', () => {
    expect(classifyPattern({ name: 'Flax', pattern_attributes: [{ permalink: 'raglan' }] }).templateId).toBe('raglan');
    expect(classifyPattern({ name: 'Ranunculus', pattern_categories: [{ name: 'Cardigan', permalink: 'cardigan' }] }).templateId).toBe('cardigan');
    const y = classifyPattern({ name: 'Stopover', pattern_attributes: [{ permalink: 'stranded' }, { permalink: 'yoke' }] });
    expect(y.templateId).toBe('yoke');
    expect(y.colorworkYoke).toBe(true);
    expect(classifyPattern({ name: 'Plain thing' }).confident).toBe(false);
  });
});

describe('sizing', () => {
  it('adds ease and grows with size', () => {
    const s = measurementsFor({ preset: 'S', ease: 'classic' });
    const l = measurementsFor({ preset: 'L', ease: 'classic' });
    expect(s.chest).toBe(38);
    expect(l.chest).toBeGreaterThan(s.chest);
    expect(l.upperArm).toBeGreaterThan(s.upperArm);
  });
  it('interpolates custom sizes', () => {
    const c = measurementsFor({ preset: 'custom', bust: 40, ease: 'fitted' });
    expect(c.chest).toBe(41);
    expect(c.armDepth).toBeGreaterThan(8);
    expect(c.armDepth).toBeLessThan(8.5);
  });
});

describe('geometry', () => {
  it('classifies points into zones', () => {
    const L = buildLayout(templateById('raglan'), measurementsFor({ preset: 'M', ease: 'classic' }), 'front');
    expect(zoneAt(L, [0, 12])?.zone).toBe('body');
    expect(zoneAt(L, [0, L.bbox.y + L.bbox.h - 2.5])?.zone).toBe('hemRib');
    expect(zoneAt(L, [0, -5])).toBeNull();
    const cuffTip = L.sleeveR[2];
    expect(zoneAt(L, [cuffTip[0] - 0.4, cuffTip[1] - 0.2])?.zone).toBe('cuffs');
  });
  it('adds a yoke and a button band where expected', () => {
    const m = measurementsFor({ preset: 'M', ease: 'classic' });
    expect(buildLayout(templateById('yoke'), m, 'front').yoke).toBeDefined();
    expect(buildLayout(templateById('cardigan'), m, 'front').zones.some((z) => z.zone === 'buttonBand')).toBe(true);
    expect(buildLayout(templateById('cardigan'), m, 'back').zones.some((z) => z.zone === 'buttonBand')).toBe(false);
  });
});

describe('yardage', () => {
  it('lands in a realistic range for a worsted M pullover', () => {
    const total = run('raglan', 'M').total;
    expect(total).toBeGreaterThan(950);
    expect(total).toBeLessThan(1600);
  });
  it('grows with size', () => {
    const t = (p: 'XS' | 'M' | '3XL') => yards('raglan', p).reduce((s, e) => s + e.yards, 0);
    expect(t('XS')).toBeLessThan(t('M'));
    expect(t('M')).toBeLessThan(t('3XL'));
  });
  it('splits stripes between colors and adds stranding for colorwork', () => {
    const striped = yards('raglan', 'M', spec(2, { assign: { ...spec().assign, hemRib: 0, cuffs: 0, neckband: 0 }, stripes: { enabled: true, seq: [{ slot: 0, rows: 10 }, { slot: 1, rows: 10 }], rowsPerIn: 6 } }));
    const ratio = striped[0].yards / striped[1].yards;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.25);
    const plain = yards('yoke', 'M').reduce((s, e) => s + e.yards, 0);
    const cw = yards('yoke', 'M', spec(2, { colorworkYoke: true })).reduce((s, e) => s + e.yards, 0);
    expect(cw).toBeGreaterThan(plain);
  });
  it('computes skeins from skein yardage', () => {
    const e = yards('raglan', 'M')[0];
    expect(e.skeins).toBe(Math.ceil(e.yards / 200));
  });
});

describe('gauge', () => {
  const worsted = weightInfo('worsted');
  it('reproduces typical yardage per area for standard weights', () => {
    expect(yardsPerSqIn(worsted)).toBeCloseTo(0.84, 1);
    expect(yardsPerSqIn(weightInfo('fingering'))).toBeCloseTo(1.32, 1);
  });
  it('prefers swatch, then pattern (same weight only), then typical', () => {
    const pattern = { sts: 18, rows: 22, per: 4 };
    expect(effectiveGauge({ pattern, patternWeight: 'worsted', weight: worsted })).toMatchObject({ stPerIn: 4.5, rowsPerIn: 5.5, source: 'pattern' });
    expect(effectiveGauge({ pattern, patternWeight: 'dk', weight: worsted }).source).toBe('typical');
    expect(effectiveGauge({ swatch: { sts: 20 }, pattern, patternWeight: 'worsted', weight: worsted })).toMatchObject({ stPerIn: 5, rowsPerIn: 6.5, source: 'swatch' });
  });
  it('a tighter gauge needs more yarn', () => {
    const loose = run('raglan', 'M', spec(), { ydPerSqIn: yardsPerSqIn({ stPerIn: 4, rowsPerIn: 5.5 }) }).total;
    const tight = run('raglan', 'M', spec(), { ydPerSqIn: yardsPerSqIn({ stPerIn: 5, rowsPerIn: 7 }) }).total;
    expect(tight).toBeGreaterThan(loose);
  });
});

describe('stitch patterns', () => {
  it('detects from Ravelry attributes', () => {
    expect(detectStitch(['cables', 'seamless'])).toBe('cables');
    expect(detectStitch(['textured', 'raglan-sleeve'])).toBe('texture');
    expect(detectStitch([], 'Brioche Pullover')).toBe('brioche');
    expect(detectStitch(['seamless'])).toBe('stockinette');
  });
  it('scales the estimate', () => {
    const base = run('raglan', 'M').total;
    const cabled = run('raglan', 'M', spec(), { stitchFactor: 1.25 }).total;
    expect(cabled / base).toBeCloseTo(1.25, 1);
  });
});

describe('pattern yardage', () => {
  it('uses the stated total and splits it by color area without a buffer', () => {
    const r = run('raglan', 'M', spec(), { patternTotal: 1200, stitchFactor: 1.6 });
    expect(r.basis).toBe('pattern');
    expect(Math.abs(r.total - 1200)).toBeLessThanOrEqual(1);
    expect(r.slots[0].yards).toBeGreaterThan(r.slots[1].yards);
  });
});
