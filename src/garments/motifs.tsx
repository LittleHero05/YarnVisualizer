import type { ReactNode } from 'react';
import { adjust } from '../color/oklch';
import type { YarnTexture } from '../color/colorNames';
import { mulberry32 } from '../color/palettes';
import type { FiberId } from '../yarn/weights';
import type { MotifKind } from './paint';

// SVG <defs>: per-yarn fills with fiber/texture detail, and a knit-stitch overlay scaled to gauge.

export interface SlotLook {
  hex: string;
  texture: YarnTexture;
  accents: string[];
}

const TILE = 3; // inches

function textureMarks(look: SlotLook, seed: number): ReactNode[] {
  const r = mulberry32(seed);
  const shades = [adjust(look.hex, { l: 0.08 }), adjust(look.hex, { l: -0.08 }), adjust(look.hex, { l: 0.15, c: 0.6 })];
  const extra = look.accents.length ? look.accents : [adjust(look.hex, { h: 60 }), adjust(look.hex, { h: -90, l: 0.1 })];
  const out: ReactNode[] = [];
  const at = () => [r() * TILE, r() * TILE] as const;
  if (look.texture === 'heather') {
    for (let i = 0; i < 220; i++) {
      const [x, y] = at();
      out.push(<circle key={i} cx={x} cy={y} r={0.03 + r() * 0.03} fill={shades[i % 3]} opacity={0.7} />);
    }
  } else if (look.texture === 'tweed') {
    for (let i = 0; i < 26; i++) {
      const [x, y] = at();
      const c = i % 3 === 0 ? extra[i % extra.length] : ['#e9d9b0', '#5a3a2a', '#a33a2a', '#3a5a7a'][i % 4];
      out.push(<rect key={i} x={x} y={y} width={0.12 + r() * 0.12} height={0.05} fill={c} transform={`rotate(${r() * 180} ${x} ${y})`} />);
    }
    for (let i = 0; i < 90; i++) {
      const [x, y] = at();
      out.push(<circle key={`h${i}`} cx={x} cy={y} r={0.03} fill={shades[i % 2]} opacity={0.6} />);
    }
  } else if (look.texture === 'speckle') {
    const pal = [...extra, '#f2d14b', '#e4572e', '#2e86ab', '#7a4fa0'];
    for (let i = 0; i < 40; i++) {
      const [x, y] = at();
      out.push(<ellipse key={i} cx={x} cy={y} rx={0.06 + r() * 0.08} ry={0.05 + r() * 0.05} fill={pal[i % pal.length]} opacity={0.9} />);
    }
  } else if (look.texture === 'variegated') {
    const pal = [...extra, ...shades];
    for (let i = 0; i < 34; i++) {
      const [x, y] = at();
      out.push(<rect key={i} x={x} y={y} width={0.5 + r() * 1.2} height={0.16} rx={0.08} fill={pal[i % pal.length]} opacity={0.75} />);
    }
  }
  return out;
}

export function SlotPatterns({ looks, fiber }: { looks: SlotLook[]; fiber: FiberId }) {
  const sheen = fiber === 'cotton';
  return (
    <>
      {looks.map((look, i) => (
        <pattern key={i} id={`slot-${i}`} patternUnits="userSpaceOnUse" width={TILE} height={TILE}>
          <rect width={TILE} height={TILE} fill={look.hex} />
          {textureMarks(look, 1000 + i * 77 + look.hex.charCodeAt(2))}
          {sheen && <rect width={TILE} height={TILE} fill="url(#cotton-sheen)" />}
        </pattern>
      ))}
      <linearGradient id="cotton-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.08" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.05" />
      </linearGradient>
    </>
  );
}

/** Stockinette "V" overlay. One pattern cell per stitch, rotated per part so columns follow the knitting. */
export function StitchPatterns({ stPerIn, rowsPerIn, sleeveAngle, fiber }: { stPerIn: number; rowsPerIn: number; sleeveAngle: number; fiber: FiberId }) {
  const w = 1 / stPerIn, h = 1 / rowsPerIn;
  const soft = fiber === 'mohair' || fiber === 'alpaca';
  const crisp = fiber === 'cotton';
  const sw = w * (crisp ? 0.13 : 0.16);
  const v = (
    <>
      <path d={`M${w * 0.08} ${h * 0.05} Q${w * 0.3} ${h * 0.75} ${w * 0.5} ${h * 0.98}`} stroke="#000" strokeOpacity={soft ? 0.1 : 0.2} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d={`M${w * 0.92} ${h * 0.05} Q${w * 0.7} ${h * 0.75} ${w * 0.5} ${h * 0.98}`} stroke="#000" strokeOpacity={soft ? 0.1 : 0.2} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d={`M${w * 0.15} ${h * 0.1} Q${w * 0.32} ${h * 0.6} ${w * 0.47} ${h * 0.85}`} stroke="#fff" strokeOpacity={soft ? 0.12 : 0.18} strokeWidth={sw * 0.6} fill="none" strokeLinecap="round" />
      <path d={`M${w * 0.85} ${h * 0.1} Q${w * 0.68} ${h * 0.6} ${w * 0.53} ${h * 0.85}`} stroke="#fff" strokeOpacity={soft ? 0.12 : 0.18} strokeWidth={sw * 0.6} fill="none" strokeLinecap="round" />
    </>
  );
  return (
    <>
      <pattern id="st-body" patternUnits="userSpaceOnUse" width={w} height={h}>{v}</pattern>
      <pattern id="st-sleeveR" patternUnits="userSpaceOnUse" width={w} height={h} patternTransform={`rotate(${sleeveAngle - 90})`}>{v}</pattern>
      <pattern id="st-sleeveL" patternUnits="userSpaceOnUse" width={w} height={h} patternTransform={`rotate(${90 - sleeveAngle})`}>{v}</pattern>
      {/* k1p1 rib: knit columns alternate with recessed purl columns */}
      <pattern id="st-rib" patternUnits="userSpaceOnUse" width={w * 2} height={h}>
        {v}
        <rect x={w} y={0} width={w} height={h} fill="#000" opacity={0.22} />
      </pattern>
      <pattern id="st-ribR" patternUnits="userSpaceOnUse" width={w * 2} height={h} patternTransform={`rotate(${sleeveAngle - 90})`}>
        {v}
        <rect x={w} y={0} width={w} height={h} fill="#000" opacity={0.22} />
      </pattern>
      <pattern id="st-ribL" patternUnits="userSpaceOnUse" width={w * 2} height={h} patternTransform={`rotate(${90 - sleeveAngle})`}>
        {v}
        <rect x={w} y={0} width={w} height={h} fill="#000" opacity={0.22} />
      </pattern>
      <filter id="fuzz" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.12" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="halo" x="-10%" y="-10%" width="120%" height="120%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="0.12" result="d" />
        <feGaussianBlur in="d" stdDeviation="0.15" result="g" />
        <feFlood floodColor="#fff" floodOpacity="0.35" />
        <feComposite in2="g" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </>
  );
}

/** One stranded-colorwork motif centered at the origin, roughly `s` inches across. */
export function Motif({ kind, s, fill }: { kind: MotifKind; s: number; fill: string }) {
  const h = s / 2;
  switch (kind) {
    case 'peerie':
      return (
        <g fill={fill}>
          <rect x={-h * 0.25} y={-h * 0.25} width={h * 0.5} height={h * 0.5} transform="rotate(45)" />
        </g>
      );
    case 'star': {
      // Eight-pointed "selbu" star approximated by two rotated diamonds and a center.
      const pts = Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        const rr = i % 2 === 0 ? h : h * 0.42;
        return `${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)}`;
      }).join(' ');
      return <polygon points={pts} fill={fill} />;
    }
    case 'zigzag':
      return <polygon points={`${-h},${h * 0.5} 0,${-h * 0.5} ${h},${h * 0.5}`} fill={fill} />;
    case 'diamond':
      return (
        <g fill="none" stroke={fill} strokeWidth={h * 0.22}>
          <polygon points={`0,${-h * 0.7} ${h * 0.7},0 0,${h * 0.7} ${-h * 0.7},0`} />
        </g>
      );
  }
}
