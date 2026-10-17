import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { polyToPath, type Layout, type Part, type Pt, type ZoneShape } from '../garments/geometry';
import { Motif, SlotPatterns, StitchPatterns, type SlotLook } from '../garments/motifs';
import { yokeBands, type PaintSpec } from '../garments/paint';
import { ZONE_LABELS, type ZoneId } from '../garments/templates';
import type { PreviewBg } from '../state/project';
import type { FiberId, WeightInfo } from '../yarn/weights';
import { SLOT_LETTERS } from './ColorSlots';

interface Props {
  layout: Layout;
  spec: PaintSpec;
  looks: SlotLook[];
  slotNames: string[];
  fiber: FiberId;
  weight: WeightInfo;
  activeSlot: number;
  background: PreviewBg;
  onAssign(zone: ZoneId): void;
}

const RIB_ZONES: ZoneId[] = ['hemRib', 'cuffs', 'neckband', 'buttonBand'];

/** Stripe bands between two distances from the underarm. */
function bands(spec: PaintSpec, d0: number, d1: number): { a: number; b: number; slot: number }[] {
  const { seq, rowsPerIn } = spec.stripes;
  const total = seq.reduce((s, x) => s + Math.max(0, x.rows), 0) / rowsPerIn;
  if (!total) return [];
  const out: { a: number; b: number; slot: number }[] = [];
  let start = Math.floor(d0 / total) * total;
  for (let guard = 0; start < d1 && guard < 400; guard++) {
    for (const st of seq) {
      const w = st.rows / rowsPerIn;
      if (w <= 0) continue;
      if (start + w > d0 && start < d1) out.push({ a: start, b: start + w, slot: st.slot });
      start += w;
    }
  }
  return out;
}

export function GarmentCanvas({ layout, spec, looks, slotNames, fiber, weight, activeSlot, background, onAssign }: Props) {
  const [hover, setHover] = useState<ZoneId | null>(null);
  const touch = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, []);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<Pt>([layout.bbox.x + layout.bbox.w / 2, layout.bbox.y + layout.bbox.h / 2]);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; c: Pt; moved: boolean } | null>(null);

  // Re-center when the garment changes size.
  const bkey = `${layout.bbox.w.toFixed(1)}x${layout.bbox.h.toFixed(1)}`;
  useEffect(() => {
    setCenter([layout.bbox.x + layout.bbox.w / 2, layout.bbox.y + layout.bbox.h / 2]);
    setZoom(1);
  }, [bkey]); // eslint-disable-line react-hooks/exhaustive-deps

  const vw = layout.bbox.w / zoom, vh = layout.bbox.h / zoom;
  const viewBox = `${center[0] - vw / 2} ${center[1] - vh / 2} ${vw} ${vh}`;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(12, Math.max(1, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function onPointerDown(e: RPointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, c: center, moved: false };
  }
  function onPointerMove(e: RPointerEvent) {
    const d = drag.current;
    if (!d || !svgRef.current) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 4) d.moved = true;
    if (!d.moved || zoom === 1) return;
    const k = vw / svgRef.current.clientWidth;
    setCenter([d.c[0] - dx * k, d.c[1] - dy * k]);
  }
  function onPointerUp() {
    setTimeout(() => (drag.current = null), 0);
  }
  const click = (z: ZoneId) => {
    if (drag.current?.moved) return;
    onAssign(z);
  };

  const soft = fiber === 'mohair' || fiber === 'alpaca';
  const sleeveAngle = (Math.atan2(layout.axes.sleeveR.dir[1], layout.axes.sleeveR.dir[0]) * 180) / Math.PI;
  const partPoly: Record<Part, Pt[]> = { body: layout.body, sleeveL: layout.sleeveL, sleeveR: layout.sleeveR };
  const stitchFor = (z: ZoneShape) =>
    RIB_ZONES.includes(z.zone)
      ? z.part === 'sleeveR' ? 'st-ribR' : z.part === 'sleeveL' ? 'st-ribL' : 'st-rib'
      : `st-${z.part}`;

  const yokeView = useMemo(() => yokeBands(layout, spec), [layout, spec]);

  function renderStripes(z: ZoneShape, key: string) {
    if (z.part === 'body') {
      const ys = z.poly.map((p) => p[1]);
      const d0 = Math.min(...ys) - layout.underarmY, d1 = Math.max(...ys) - layout.underarmY;
      return (
        <g key={key} clipPath="url(#clip-body)">
          {bands(spec, d0, d1).map((b, i) => (
            <rect key={i} x={layout.bbox.x} width={layout.bbox.w} y={layout.underarmY + b.a} height={b.b - b.a + 0.01} fill={`url(#slot-${b.slot})`} />
          ))}
        </g>
      );
    }
    const ax = layout.axes[z.part];
    const ang = (Math.atan2(ax.dir[1], ax.dir[0]) * 180) / Math.PI;
    return (
      <g key={key} clipPath={`url(#clip-${z.part})`}>
        <g transform={`translate(${ax.origin[0]} ${ax.origin[1]}) rotate(${ang})`}>
          {bands(spec, -15, 30).map((b, i) => (
            <rect key={i} x={b.a} width={b.b - b.a + 0.01} y={-20} height={40} fill={`url(#slot-${b.slot})`} />
          ))}
        </g>
      </g>
    );
  }

  function renderYoke() {
    const y = layout.yoke;
    if (!y) return null;
    return (
      <g clipPath="url(#clip-yoke)">
        {yokeView.map((b, i) => (
          <g key={i}>
            <path
              d={`M${y.cx - b.r1} ${y.cy} a${b.r1} ${b.r1} 0 1 0 ${b.r1 * 2} 0 a${b.r1} ${b.r1} 0 1 0 ${-b.r1 * 2} 0 Z M${y.cx - b.r0} ${y.cy} a${b.r0} ${b.r0} 0 1 1 ${b.r0 * 2} 0 a${b.r0} ${b.r0} 0 1 1 ${-b.r0 * 2} 0 Z`}
              fill={`url(#slot-${b.bg})`}
              fillRule="evenodd"
            />
            {b.motif && (() => {
              const r = (b.r0 + b.r1) / 2, size = (b.r1 - b.r0) * 0.85;
              const count = Math.max(8, Math.floor((2 * Math.PI * r) / (size * (b.motif.kind === 'zigzag' ? 1 : 1.25))));
              const fill = looks[b.motif.slot]?.hex ?? '#000';
              return Array.from({ length: count }, (_, k) => {
                const a = (k / count) * Math.PI * 2;
                const deg = (a * 180) / Math.PI - 90;
                return (
                  <g key={k} transform={`translate(${y.cx + Math.cos(a) * r} ${y.cy + Math.sin(a) * r}) rotate(${deg})`}>
                    <Motif kind={b.motif!.kind} s={size} fill={fill} />
                  </g>
                );
              });
            })()}
          </g>
        ))}
        {(['body', 'sleeveL', 'sleeveR'] as Part[]).map((p) => (
          <path key={p} d={polyToPath(partPoly[p])} fill={`url(#st-${p})`} />
        ))}
      </g>
    );
  }

  const paintOrder = layout.zones;
  const bodyIdx = paintOrder.findIndex((z) => z.zone === 'body');

  return (
    <div className="canvas-wrap" data-bg={background}>
      <svg
        ref={svgRef}
        className="garment"
        viewBox={viewBox}
        role="img"
        aria-label={`Approximate ${layout.view} view of the garment in the chosen colors`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { setHover(null); onPointerUp(); }}
        style={{ cursor: zoom > 1 ? 'grab' : 'pointer' }}
      >
        <defs>
          <SlotPatterns looks={looks} fiber={fiber} />
          <StitchPatterns stPerIn={weight.stPerIn} rowsPerIn={weight.rowsPerIn} sleeveAngle={sleeveAngle} fiber={fiber} />
          {(['body', 'sleeveL', 'sleeveR'] as Part[]).map((p) => (
            <clipPath key={p} id={`clip-${p}`}><path d={polyToPath(partPoly[p])} /></clipPath>
          ))}
          {layout.yoke && (
            <clipPath id="clip-yoke">
              <circle cx={layout.yoke.cx} cy={layout.yoke.cy} r={layout.yoke.rOuter} clipPath="url(#clip-silhouette)" />
            </clipPath>
          )}
          <clipPath id="clip-silhouette">
            {(['body', 'sleeveL', 'sleeveR'] as Part[]).map((p) => <path key={p} d={polyToPath(partPoly[p])} />)}
          </clipPath>
        </defs>

        <g filter={soft ? 'url(#halo)' : undefined}>
          {paintOrder.map((z, i) => {
            const key = `${z.zone}-${z.part}-${i}`;
            const striped = spec.stripes.enabled && (z.zone === 'body' || z.zone === 'sleeves');
            const fill = striped ? renderStripes(z, key) : <path key={key} d={polyToPath(z.poly)} fill={`url(#slot-${spec.assign[z.zone]})`} />;
            return (
              <g key={key} filter={soft ? 'url(#fuzz)' : undefined}>
                {fill}
                <path d={polyToPath(z.poly)} fill={`url(#${stitchFor(z)})`} />
                {i === bodyIdx && renderYoke()}
              </g>
            );
          })}
          {layout.buttons.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={0.38} fill="#d8cfc2" stroke="#00000040" strokeWidth={0.05} />
              <circle cx={x - 0.1} cy={y} r={0.05} fill="#00000060" />
              <circle cx={x + 0.1} cy={y} r={0.05} fill="#00000060" />
            </g>
          ))}
          {(['body', 'sleeveL', 'sleeveR'] as Part[]).map((p) => (
            <path key={p} d={polyToPath(partPoly[p])} className="part-outline" fill="none" strokeWidth={0.06} />
          ))}
        </g>

        {/* hit areas + hover outline */}
        <g>
          {paintOrder.map((z, i) => (
            <g key={i}>
              <path
                d={polyToPath(z.poly)}
                fill="transparent"
                className={hover === z.zone ? 'zone hovered' : 'zone'}
                onPointerEnter={() => setHover(z.zone)}
                onClick={() => click(z.zone)}
              />
              {i === bodyIdx && layout.yoke && (
                <circle
                  cx={layout.yoke.cx}
                  cy={layout.yoke.cy}
                  r={layout.yoke.rOuter}
                  clipPath="url(#clip-silhouette)"
                  fill="transparent"
                  className={hover === 'yoke' ? 'zone hovered' : 'zone'}
                  onPointerEnter={() => setHover('yoke')}
                  onClick={() => click('yoke')}
                />
              )}
            </g>
          ))}
        </g>
      </svg>

      <div className="canvas-hud">
        <span className="hud-label">
          {hover
            ? `${ZONE_LABELS[hover]}: ${zoneSummary(hover, spec, slotNames)}. ${touch ? 'Tap' : 'Click'} to use ${SLOT_LETTERS[activeSlot]}`
            : `${touch ? 'Tap' : 'Click'} a part to color it with ${SLOT_LETTERS[activeSlot]}. ${touch ? 'Zoom with + and −.' : 'Scroll to zoom.'}`}
        </span>
        <span className="zoom-btns">
          <button className="ghost" onClick={() => setZoom((z) => Math.max(1, z / 1.4))} aria-label="Zoom out">−</button>
          <button className="ghost" onClick={() => { setZoom(1); setCenter([layout.bbox.x + layout.bbox.w / 2, layout.bbox.y + layout.bbox.h / 2]); }}>Fit</button>
          <button className="ghost" onClick={() => setZoom((z) => Math.min(12, z * 1.4))} aria-label="Zoom in">+</button>
        </span>
      </div>
    </div>
  );
}

function zoneSummary(z: ZoneId, spec: PaintSpec, names: string[]): string {
  if ((z === 'body' || z === 'sleeves') && spec.stripes.enabled) {
    const slots = [...new Set(spec.stripes.seq.map((s) => s.slot))];
    return `stripes in ${slots.map((s) => SLOT_LETTERS[s]).join(', ')}`;
  }
  if (z === 'yoke' && spec.colorworkYoke && spec.slotCount > 1) return `colorwork on ${SLOT_LETTERS[spec.assign.yoke]}`;
  const s = spec.assign[z];
  return `${SLOT_LETTERS[s]}${names[s] ? ` (${names[s]})` : ''}`;
}

