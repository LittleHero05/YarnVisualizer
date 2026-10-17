import { describe, expect, it } from 'vitest';
import { approximateColor, dominantColor, DEFAULT_YARN_HEX } from './approximate';
import { matchColorName, nearestColorName } from './colorNames';
import { hexToOklch, oklchToHex } from './oklch';
import { ensureContrast, generatePalettes, MIN_LIGHTNESS_GAP } from './palettes';

describe('oklch', () => {
  it('round-trips hex', () => {
    for (const h of ['#b3262e', '#1f2b48', '#d6c9b0', '#000000', '#ffffff']) {
      expect(oklchToHex(hexToOklch(h))).toBe(h);
    }
  });
});

describe('colorway names', () => {
  it('matches color words and textures', () => {
    const m = matchColorName('Oatmeal Heather')!;
    expect(m.matched).toEqual(['oatmeal']);
    expect(m.texture).toBe('heather');
    expect(matchColorName('Donegal Navy Tweed')!.texture).toBe('tweed');
    expect(matchColorName('Teal Feather')!.matched).toContain('teal');
    expect(matchColorName('Zzyzx')).toBeNull();
  });
  it('prefers multi-word phrases', () => {
    expect(matchColorName('Dusty Rose')!.matched).toEqual(['dusty rose']);
  });
  it('finds the nearest name', () => {
    expect(nearestColorName('#1f2b48')).toBe('Navy');
  });
});

describe('approximateColor fallback order', () => {
  const photo = { hex: '#123456', accents: [], texture: 'solid' as const };
  const rav = { hex: '#654321', accents: [], texture: 'solid' as const };
  it('uses the user photo first', () => {
    expect(approximateColor({ userPhoto: photo, colorwayName: 'Red', ravelryPhoto: rav }).source).toBe('photo');
  });
  it('then the colorway name', () => {
    const a = approximateColor({ colorwayName: 'Red', ravelryPhoto: rav });
    expect(a.source).toBe('name');
    expect(a.hex).toBe('#b3262e');
  });
  it('then the Ravelry photo, then a default', () => {
    expect(approximateColor({ colorwayName: 'Qwerty', ravelryPhoto: rav }).hex).toBe('#654321');
    expect(approximateColor({}).hex).toBe(DEFAULT_YARN_HEX);
  });
  it('applies lightness modifiers', () => {
    const base = hexToOklch(approximateColor({ colorwayName: 'Blue' }).hex).l;
    expect(hexToOklch(approximateColor({ colorwayName: 'Light Blue' }).hex).l).toBeGreaterThan(base);
  });
});

describe('dominantColor', () => {
  it('ignores a white background and finds the yarn color', () => {
    const px: number[] = [];
    for (let i = 0; i < 400; i++) px.push(...(i < 260 ? [180, 40, 50, 255] : [255, 255, 255, 255]));
    const r = dominantColor(px)!;
    const o = hexToOklch(r.hex);
    expect(o.c).toBeGreaterThan(0.1);
    expect(o.h).toBeGreaterThan(0);
    expect(o.h).toBeLessThan(40);
  });
});

describe('palettes', () => {
  it('returns the requested count and size, keeping locked colors', () => {
    const ps = generatePalettes(3, 42, [null, '#b3262e', null]);
    expect(ps).toHaveLength(6);
    for (const p of ps) {
      expect(p.colors).toHaveLength(3);
      expect(p.colors[1]).toBe('#b3262e');
    }
  });
  it('is deterministic per seed', () => {
    expect(generatePalettes(4, 7)).toEqual(generatePalettes(4, 7));
  });
  it('separates colors in lightness', () => {
    const out = ensureContrast(['#808080', '#828282', '#7e7e7e']);
    const ls = out.map((h) => hexToOklch(h).l).sort();
    expect(ls[1] - ls[0]).toBeGreaterThanOrEqual(MIN_LIGHTNESS_GAP - 0.01);
    expect(ls[2] - ls[1]).toBeGreaterThanOrEqual(MIN_LIGHTNESS_GAP - 0.01);
  });
});

describe('dominantColor shadows', () => {
  it('skips dark gaps between strands', () => {
    const px: number[] = [];
    for (let i = 0; i < 400; i++) px.push(...(i < 220 ? [20, 18, 12, 255] : [40, 110, 70, 255]));
    expect(hexToOklch(dominantColor(px)!.hex).l).toBeGreaterThan(0.4);
  });
  it('still reads a black yarn as black', () => {
    const px: number[] = [];
    for (let i = 0; i < 400; i++) px.push(20, 20, 22, 255);
    expect(hexToOklch(dominantColor(px)!.hex).l).toBeLessThan(0.25);
  });
});
