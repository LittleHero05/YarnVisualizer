import type { Measurements } from './sizing';
import type { GarmentTemplate, ZoneId } from './templates';

// Flat-lay garment geometry in inches. Origin: center of the neck line, y grows downward.
// Every zone is a polygon so rendering and yardage sampling use the exact same shapes.

export type Pt = [number, number];
export type View = 'front' | 'back';
export type Part = 'body' | 'sleeveL' | 'sleeveR';

export interface ZoneShape {
  zone: ZoneId;
  part: Part;
  poly: Pt[];
}

export interface SleeveAxis {
  origin: Pt; // underarm point
  dir: Pt; // unit vector toward the cuff
}

export interface YokeShape {
  cx: number;
  cy: number;
  rInner: number;
  rOuter: number;
}

export interface Layout {
  view: View;
  body: Pt[];
  sleeveL: Pt[];
  sleeveR: Pt[];
  /** Zones in paint order; later entries sit on top. */
  zones: ZoneShape[];
  underarmY: number;
  axes: { sleeveL: SleeveAxis; sleeveR: SleeveAxis };
  yoke?: YokeShape;
  buttons: Pt[];
  bbox: { x: number; y: number; w: number; h: number };
}

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mirror = (poly: Pt[]): Pt[] => poly.map(([x, y]) => [-x, y] as Pt).reverse();

function neckCurve(halfW: number, depth: number, steps = 16): Pt[] {
  // Left to right along the bottom of the neck opening.
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = -halfW + (2 * halfW * i) / steps;
    const t = Math.min(1, Math.abs(x) / halfW);
    return [x, depth * Math.sqrt(1 - t * t)] as Pt;
  });
}

interface SleeveSpec {
  topStart: Pt; // where the sleeve's upper edge meets the body
  underarm: Pt; // where its lower edge meets the body
  width: number; // flat width at the underarm (perpendicular to axis)
  length: number;
  cuff: number; // flat cuff width
  cuffRib: number;
  angleDeg: number;
}

function buildSleeveR(s: SleeveSpec): { poly: Pt[]; cuff: Pt[]; axis: SleeveAxis } {
  const th = (s.angleDeg * Math.PI) / 180;
  const d: Pt = [Math.cos(th), Math.sin(th)];
  const p: Pt = [Math.sin(th), -Math.cos(th)]; // perpendicular, toward the top edge
  const mid0 = add(s.underarm, mul(p, s.width / 2));
  const mid1 = add(mid0, mul(d, s.length));
  const c1 = add(mid1, mul(p, -s.cuff / 2)); // lower cuff corner
  const c2 = add(mid1, mul(p, s.cuff / 2)); // upper cuff corner
  const u = add(s.underarm, mul(p, s.width)); // top of sleeve at underarm level
  const poly: Pt[] = s.topStart[0] === s.underarm[0] && s.topStart[1] < s.underarm[1]
    ? [s.topStart, c2, c1, s.underarm] // drop shoulder: sleeve hangs from a vertical seam
    : [s.topStart, u, c2, c1, s.underarm];
  const t0 = 1 - s.cuffRib / s.length;
  const upperEdgeStart = poly.length === 4 ? s.topStart : u;
  const cuff: Pt[] = [lerp(s.underarm, c1, t0), lerp(upperEdgeStart, c2, t0), c2, c1];
  return { poly, cuff, axis: { origin: s.underarm, dir: d } };
}

export function buildLayout(t: GarmentTemplate, m: Measurements, view: View): Layout {
  const W = m.chest / 4;
  const n = m.neckWidth / 2;
  const neckDepth = view === 'front' ? (t.cardigan ? 3.25 : 2.75) : 1;
  const hemY = m.armDepth + m.bodyLength;
  const drop = t.construction === 'drop';

  // Shoulder geometry differs by construction.
  const shoulderY = drop ? 1 : 0;
  const underarm: Pt = drop ? [W, m.armDepth + 1] : [W, m.armDepth];
  const neck = neckCurve(n, neckDepth);

  const bodyR: Pt[] = drop ? [[n, 0], [W, shoulderY], underarm, [W, hemY]] : [[n, 0], underarm, [W, hemY]];
  // Clean loop: neck (left→right), right side down, across the hem, left side up.
  const bodyLoop: Pt[] = [...neck, ...bodyR.slice(1), ...mirror(bodyR).slice(0, -1)];

  const sleeveSpec: SleeveSpec = drop
    ? {
        topStart: [W, shoulderY],
        underarm,
        width: underarm[1] - shoulderY,
        // The dropped body already covers part of the arm.
        length: Math.max(8, m.sleeveLength - Math.max(0, W - 7.5)),
        cuff: m.wrist / 2,
        cuffRib: m.cuffRib,
        angleDeg: 52,
      }
    : {
        topStart: [n, 0],
        underarm,
        width: m.upperArm / 2,
        length: m.sleeveLength,
        cuff: m.wrist / 2,
        cuffRib: m.cuffRib,
        angleDeg: 42,
      };
  const sr = buildSleeveR(sleeveSpec);
  const sleeveR = sr.poly;
  const sleeveL = mirror(sleeveR);
  const cuffR = sr.cuff;
  const cuffL = mirror(cuffR);

  const hemRib: Pt[] = [[-W, hemY - m.hemRib], [W, hemY - m.hemRib], [W, hemY], [-W, hemY]];
  const bandOuter = neckCurve(n + 0.35, neckDepth + m.neckband);
  const neckband: Pt[] = [...neckCurve(n, neckDepth), ...bandOuter.reverse()];

  const zones: ZoneShape[] = [
    { zone: 'sleeves', part: 'sleeveL', poly: sleeveL },
    { zone: 'sleeves', part: 'sleeveR', poly: sleeveR },
    { zone: 'body', part: 'body', poly: bodyLoop },
    { zone: 'cuffs', part: 'sleeveL', poly: cuffL },
    { zone: 'cuffs', part: 'sleeveR', poly: cuffR },
    { zone: 'hemRib', part: 'body', poly: hemRib },
    { zone: 'neckband', part: 'body', poly: neckband },
  ];

  const buttons: Pt[] = [];
  if (t.cardigan && view === 'front') {
    const bw = 0.7;
    zones.push({ zone: 'buttonBand', part: 'body', poly: [[-bw, neckDepth], [bw, neckDepth], [bw, hemY], [-bw, hemY]] });
    const count = Math.max(5, Math.round((hemY - neckDepth) / 3.2));
    for (let i = 0; i < count; i++) {
      buttons.push([0, neckDepth + 0.9 + ((hemY - neckDepth - 1.8) * i) / (count - 1)]);
    }
  }

  let yoke: YokeShape | undefined;
  if (t.construction === 'yoke') {
    const cy = -1.5;
    yoke = { cx: 0, cy, rInner: neckDepth + m.neckband - cy, rOuter: m.armDepth + 1.25 - cy };
  }

  const all = zones.flatMap((z) => z.poly);
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const pad = 1.5;
  const bbox = {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };

  return {
    view,
    body: bodyLoop,
    sleeveL,
    sleeveR,
    zones,
    underarmY: underarm[1],
    axes: { sleeveR: sr.axis, sleeveL: { origin: [-underarm[0], underarm[1]], dir: [-sr.axis.dir[0], sr.axis.dir[1]] } },
    yoke,
    buttons,
    bbox,
  };
}

export function pointInPoly([x, y]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function polyToPath(poly: Pt[]): string {
  return poly.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(' ') + ' Z';
}

/** Topmost zone at a point, or null if outside the garment. Yoke overrides body/sleeves inside its disk. */
export function zoneAt(layout: Layout, pt: Pt): ZoneShape | null {
  for (let i = layout.zones.length - 1; i >= 0; i--) {
    const z = layout.zones[i];
    if (!pointInPoly(pt, z.poly)) continue;
    if ((z.zone === 'body' || z.zone === 'sleeves') && layout.yoke && inYoke(layout.yoke, pt)) {
      return { ...z, zone: 'yoke' };
    }
    return z;
  }
  return null;
}

export function inYoke(y: YokeShape, [x, py]: Pt): boolean {
  return Math.hypot(x - y.cx, py - y.cy) <= y.rOuter;
}

/** Distance (inches) used for stripe sequencing: measured from the underarm, so body and sleeve stripes line up. */
export function stripeDistance(layout: Layout, part: Part, pt: Pt): number {
  if (part === 'body') return pt[1] - layout.underarmY;
  const a = layout.axes[part];
  return (pt[0] - a.origin[0]) * a.dir[0] + (pt[1] - a.origin[1]) * a.dir[1];
}
