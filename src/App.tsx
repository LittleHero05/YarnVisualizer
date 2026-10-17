import { useMemo } from 'react';
import { ColorSlots } from './components/ColorSlots';
import { Disclaimer } from './components/Disclaimer';
import { Scribble, Strand, TagString } from './components/Doodles';
import { EstimatePanel } from './components/EstimatePanel';
import { GarmentCanvas } from './components/GarmentCanvas';
import { GarmentOptions } from './components/GarmentOptions';
import { PatternPicker } from './components/PatternPicker';
import { SiteFooter } from './components/SiteFooter';
import { EmailSignup } from './components/EmailSignup';
import { ExportPanel } from './components/ExportPanel';
import { nearestColorName } from './color/colorNames';
import { STITCHES } from './estimate/stitch';
import type { CardSummary } from './export/card';
import { EASE_OPTIONS } from './garments/sizing';
import { SITE } from './site';
import { SizePanel } from './components/SizePanel';
import { YarnTypeForm } from './components/YarnTypeForm';
import { useSuggestion } from './components/useSuggestion';
import { effectiveGauge, yardsPerSqIn } from './estimate/gauge';
import { stitchFactor } from './estimate/stitch';
import { estimateYardage } from './estimate/yardage';
import { buildLayout } from './garments/geometry';
import type { PaintSpec } from './garments/paint';
import { measurementsFor } from './garments/sizing';
import { templateById } from './garments/templates';
import { sizeKey, useProject, type PreviewBg } from './state/project';
import { fmtGaugeSpan, fmtLength, fmtYarn, gaugeSpan } from './units';
import { weightInfo } from './yarn/weights';

const BACKGROUNDS: { id: PreviewBg; label: string }[] = [
  { id: 'ink', label: 'Ink' },
  { id: 'paper', label: 'Paper' },
  { id: 'cream', label: 'Cream' },
];

export default function App() {
  const s = useProject();
  const template = templateById(s.templateId);
  const baseWeight = weightInfo(s.weight);
  const gauge = effectiveGauge({ swatch: s.swatch, pattern: s.pattern?.gauge, patternWeight: s.pattern?.weight, weight: baseWeight });
  // Weight info with the effective gauge, so stitches and stripe heights follow it too.
  const weight = useMemo(() => ({ ...baseWeight, stPerIn: gauge.stPerIn, rowsPerIn: gauge.rowsPerIn }), [baseWeight, gauge.stPerIn, gauge.rowsPerIn]);
  const m = useMemo(() => measurementsFor(s.size), [s.size]);
  const layouts = useMemo(
    () => ({ front: buildLayout(template, m, 'front'), back: buildLayout(template, m, 'back') }),
    [template, m],
  );
  const suggestion = useSuggestion(s.weight, s.fiber, s.pattern?.packs ?? []);

  const spec: PaintSpec = useMemo(
    () => ({
      assign: s.assign,
      stripes: { enabled: s.stripes, seq: s.stripeSeq, rowsPerIn: weight.rowsPerIn },
      colorworkYoke: template.construction === 'yoke' && s.colorworkYoke,
      slotCount: s.slots.length,
    }),
    [s.assign, s.stripes, s.stripeSeq, weight.rowsPerIn, template.construction, s.colorworkYoke, s.slots.length],
  );

  const skeinYarn = s.slots.map((sl) => (sl.mode === 'own' ? sl.yarn : suggestion.yarn));
  const skeinYards = skeinYarn.map((y) => y?.yardage || weight.skein.yards);
  const skeinGrams = skeinYarn.map((y) => y?.grams || weight.skein.grams);
  const patternTotal = s.patternYards && s.patternYards.sizeKey === sizeKey(s.size) ? s.patternYards.yards : null;
  const estimate = useMemo(
    () =>
      estimateYardage([layouts.front, layouts.back], spec, {
        ydPerSqIn: yardsPerSqIn(gauge),
        stitchFactor: stitchFactor(s.stitch),
        skeinYards,
        patternTotal,
      }),
    [layouts, spec, gauge.stPerIn, gauge.rowsPerIn, s.stitch, patternTotal, skeinYards.join(',')], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const looks = s.slots.map((sl) => ({ hex: sl.hex, texture: sl.texture, accents: sl.accents }));
  const names = s.slots.map((sl) => (sl.mode === 'own' ? sl.colorway || sl.yarnName : ''));

  const sizeName = s.size.preset === 'custom' ? `${fmtLength(s.size.bust, s.units, { trim: true })} bust` : s.size.preset;
  const easeName = EASE_OPTIONS.find((e) => e.id === s.size.ease)?.name ?? '';
  const span = gaugeSpan(s.units);
  const cardSummary: CardSummary = {
    title: s.pattern?.name ?? template.name,
    subtitle: [s.view === 'front' ? 'Front' : 'Back', s.pattern?.designer && `by ${s.pattern.designer}`, template.name + (s.pattern && s.shapeOverride ? ' (changed)' : '')]
      .filter(Boolean)
      .join(' · '),
    specs: [
      ['Size', `${sizeName} · ${easeName.toLowerCase()} fit`],
      ['Finished chest', fmtLength(m.chest, s.units)],
      ['Length', fmtLength(m.armDepth + m.bodyLength, s.units)],
      ['Sleeve', fmtLength(m.sleeveLength, s.units)],
      ['Yarn', `${baseWeight.label} · ${s.fiber}`],
      ['Gauge', `${Math.round(gauge.stPerIn * span * 2) / 2} sts × ${Math.round(gauge.rowsPerIn * span * 2) / 2} rows / ${fmtGaugeSpan(s.units)}`],
      ['Stitch', STITCHES.find((x) => x.id === s.stitch)?.label ?? 'Stockinette'],
    ],
    colors: estimate.slots
      .filter((e) => e.yards > 0 && s.slots[e.slot])
      .map((e) => {
        const sl = s.slots[e.slot];
        const name = sl.mode === 'own' ? [sl.yarnName, sl.colorway].filter(Boolean).join(' · ') || 'Your yarn' : `${nearestColorName(sl.hex)} (suggested)`;
        return { letter: 'ABCDE'[e.slot], hex: sl.hex, name, amount: `${fmtYarn(e.yards, s.units)} · ${e.skeins} skein${e.skeins === 1 ? '' : 's'}` };
      }),
    total: fmtYarn(estimate.total, s.units) + (estimate.basis === 'pattern' ? ' (pattern)' : ''),
    footer: `Made with ${SITE.name}, an independent project by ${SITE.provider}. Pattern and yarn data via the Ravelry API; not affiliated with Ravelry.${s.pattern ? ` Pattern: ${s.pattern.url}` : ''}`,
    site: typeof window !== 'undefined' ? window.location.host : SITE.name,
  };
  const vb = layouts[s.view].bbox;
  const exportViewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  const exportFileName = `swatch-journal-${(s.pattern?.name ?? template.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${s.size.preset.toLowerCase()}.png`;

  const projectNo = String((s.pattern?.id ?? 0) % 1000).padStart(3, '0');

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="dot" aria-hidden="true" />
          <div>
            swatch journal
            <small>Yarn project visualizer</small>
          </div>
        </div>
      </header>
      <div className="meta">
        <span>No. {projectNo}</span>
        <span>Project: {s.pattern?.name ?? 'sweater'}</span>
      </div>
      <section className="hero">
        <span className="kicker">Before you buy yarn</span>
        <h1>
          Plan your sweater in <span className="circled"><Scribble />real</span> colors, <em>stitch by stitch</em>
        </h1>
        <p>Choose a Ravelry pattern, add your yarn or let us suggest a palette, and pick your size. We'll sketch the sweater and count the yards.</p>
        <Strand />
      </section>
      <main className="grid">
        <div className="col inputs">
          <PatternPicker />
          <YarnTypeForm />
          <ColorSlots />
        </div>
        <div className="col stage">
          <div className="stage-head">
            <div className="stage-tools">
              <div className="seg" role="radiogroup" aria-label="View">
                {(['front', 'back'] as const).map((v) => (
                  <button key={v} role="radio" aria-checked={s.view === v} className={s.view === v ? 'on' : ''} onClick={() => s.set({ view: v })}>
                    {v === 'front' ? 'Front' : 'Back'}
                  </button>
                ))}
              </div>
              <div className="bg-pick" role="group" aria-label="Preview background">
                {BACKGROUNDS.map((b) => (
                  <button key={b.id} className={`bg-swatch bg-${b.id}`} aria-label={`${b.label} background`} aria-pressed={s.previewBg === b.id} onClick={() => s.set({ previewBg: b.id })} />
                ))}
              </div>
              <div className="seg units" role="radiogroup" aria-label="Units">
                {(['imperial', 'metric'] as const).map((u) => (
                  <button key={u} role="radio" aria-checked={s.units === u} className={s.units === u ? 'on' : ''} onClick={() => s.set({ units: u })}>
                    {u === 'imperial' ? 'in · yd' : 'cm · m'}
                  </button>
                ))}
              </div>
            </div>
            <span className="stage-note">↙ that's your sweater, roughly!</span>
          </div>
          <div className="tag-wrap">
            <TagString />
            <span className="hole" aria-hidden="true" />
            <div className="tag">
              <div className="tag-label">
                <span>{s.pattern?.name ?? template.name}{s.pattern && s.shapeOverride ? ` · ${template.name}` : ''} · {s.size.preset === 'custom' ? `${fmtLength(s.size.bust, s.units, { trim: true })} bust` : s.size.preset}</span>
                <span>{weight.label} {s.fiber}</span>
              </div>
              <GarmentCanvas
            layout={layouts[s.view]}
            spec={spec}
            looks={looks}
            slotNames={names}
            fiber={s.fiber}
            weight={weight}
            activeSlot={s.activeSlot}
            background={s.previewBg}
                onAssign={(z) => s.assignZone(z, s.activeSlot)}
              />
            </div>
          </div>
          <Disclaimer />
          <GarmentOptions />
        </div>
        <div className="col side">
          <SizePanel m={m} />
          <EstimatePanel result={estimate} gauge={gauge} weight={baseWeight} skeinGrams={skeinGrams} />
          <ExportPanel summary={cardSummary} viewBox={exportViewBox} fileName={exportFileName} />
        </div>
      </main>
      <EmailSignup />
      <SiteFooter />
    </div>
  );
}
