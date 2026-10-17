import { useState } from 'react';
import type { Gauge } from '../estimate/gauge';
import { STITCHES, type StitchId } from '../estimate/stitch';
import type { EstimateResult } from '../estimate/yardage';
import { sizeKey, useProject } from '../state/project';
import { fmtGaugeSpan, fmtYarn, gaugeInUnits, gaugeSpan, setSwatchCount, yarnFromInput, yarnUnit, yarnValue } from '../units';
import type { WeightInfo } from '../yarn/weights';
import { SLOT_LETTERS } from './ColorSlots';
import { Disclaimer } from './Disclaimer';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const GAUGE_SOURCE = { swatch: 'your swatch', pattern: 'the pattern', typical: 'typical for this weight' } as const;

export function EstimatePanel({ result, gauge, weight, skeinGrams }: { result: EstimateResult; gauge: Gauge; weight: WeightInfo; skeinGrams: number[] }) {
  const { slots, pattern, size, stitch, swatch, patternYards, units, set } = useProject();
  // Open by default once a pattern is chosen; afterwards the user's toggle wins.
  const [open, setOpen] = useState(Boolean(pattern));
  const key = sizeKey(size);
  const staleYards = patternYards && patternYards.sizeKey !== key ? patternYards : null;
  const yv = (yd: number) => yarnValue(yd, units).toLocaleString();
  const range = pattern?.yardage ? (pattern.yardageMax && pattern.yardageMax !== pattern.yardage ? `${yv(pattern.yardage)}–${yv(pattern.yardageMax)}` : yv(pattern.yardage)) : null;
  // Gauge over 4" or 10 cm; the swatch is stored with its own span in `per`.
  const span = gaugeSpan(units), spanLabel = fmtGaugeSpan(units);
  const sw = gaugeInUnits(swatch, units);
  // In inches, the pattern's gauge reads as written (its own span); in cm it's rescaled.
  const patGauge = pattern?.gauge
    ? units === 'metric' ? { ...gaugeInUnits(pattern.gauge, units), per: spanLabel } : { sts: pattern.gauge.sts, rows: pattern.gauge.rows, per: `${pattern.gauge.per ?? 4}"` }
    : null;
  const setSwatch = (key: 'sts' | 'rows', v: string) => set({ swatch: setSwatchCount(swatch, key, v ? Number(v) : null, units) });

  return (
    <section className="panel">
      <h2>Yarn to buy</h2>
      <table className="estimate">
        <thead>
          <tr><th>Yarn</th><th>{units === 'metric' ? 'Meters' : 'Yards'}</th><th>Skeins</th></tr>
        </thead>
        <tbody>
          {result.slots.map((e) => {
            const s = slots[e.slot];
            if (!s) return null;
            const label = s.mode === 'own' ? [s.yarnName, s.colorway].filter(Boolean).join(' · ') || 'Your yarn' : 'Suggested';
            return (
              <tr key={s.id} className={e.yards ? '' : 'unused'}>
                <td>
                  <span className="swatch sm" style={{ background: s.hex }} /> <strong>{SLOT_LETTERS[e.slot]}</strong>{' '}
                  <span className="muted small">{label}</span>
                </td>
                <td>{e.yards ? yv(e.yards) : '—'}</td>
                <td title={`${fmtYarn(e.skeinYards, units)} / ${skeinGrams[e.slot]} g skeins`}>{e.skeins || '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr><th>Total</th><th>{yv(result.total)}</th><th /></tr>
        </tfoot>
      </table>
      <p className="muted small">
        {result.basis === 'pattern'
          ? "Total from the pattern's yardage for your size, split between colors by how much of the garment each one covers."
          : `Estimated from the garment's area at ${fmt(gauge.stPerIn * span)} sts × ${fmt(gauge.rowsPerIn * span)} rows / ${spanLabel} (${GAUGE_SOURCE[gauge.source]}), ${STITCHES.find((x) => x.id === stitch)?.label.toLowerCase()}, plus a 10% buffer.`}{' '}
        Skein sizes come from the yarn when known, otherwise a typical {fmtYarn(weight.skein.yards, units)} skein.
      </p>

      <details className="accuracy" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>Make this more accurate</summary>

        <label className="field">
          <span>Pattern yardage for your size</span>
          <input
            type="number"
            min={yarnValue(50, units)}
            max={yarnValue(10000, units)}
            step={10}
            placeholder={range ? `Pattern lists ${range} ${yarnUnit(units)} across sizes` : `From the pattern, e.g. ${yv(1250)}`}
            value={patternYards && !staleYards ? yarnValue(patternYards.yards, units) : ''}
            onChange={(e) => set({ patternYards: e.target.value ? { sizeKey: key, yards: yarnFromInput(Number(e.target.value), units) } : null })}
          />
          <span className="muted small">The most accurate option. Check the pattern's materials section.</span>
        </label>
        {staleYards && (
          <p className="notice small">
            You entered {fmtYarn(staleYards.yards, units)} for a different size.{' '}
            <button className="link small" onClick={() => set({ patternYards: { sizeKey: key, yards: staleYards.yards } })}>Use it for this size</button>
          </p>
        )}

        <fieldset className="gauge" disabled={result.basis === 'pattern'}>
          <legend className="muted small">Your gauge over {spanLabel} (optional)</legend>
          <div className="row align-center">
            <input type="number" min={4} max={60} step={0.5} aria-label={`Stitches per ${units === 'metric' ? '10 centimeters' : '4 inches'}`} placeholder={fmt(gauge.stPerIn * span)} value={sw.sts ?? ''} onChange={(e) => setSwatch('sts', e.target.value)} />
            <span className="muted small">sts ×</span>
            <input type="number" min={4} max={80} step={0.5} aria-label={`Rows per ${units === 'metric' ? '10 centimeters' : '4 inches'}`} placeholder={fmt(gauge.rowsPerIn * span)} value={sw.rows ?? ''} onChange={(e) => setSwatch('rows', e.target.value)} />
            <span className="muted small">rows</span>
            {(swatch.sts || swatch.rows) && <button className="link small" onClick={() => set({ swatch: {} })}>Clear</button>}
          </div>
          {pattern?.gauge?.sts && patGauge && (
            <span className="muted small">
              Pattern: {patGauge.sts} sts{patGauge.rows ? ` × ${patGauge.rows} rows` : ''} / {patGauge.per}{pattern.gaugeNote ? ` in ${pattern.gaugeNote}` : ''}
              {gauge.source === 'typical' && pattern.weight && pattern.weight !== weight.id ? '. Not used because you picked a different yarn weight.' : ''}
            </span>
          )}
        </fieldset>

        <label className="field">
          <span>Stitch pattern</span>
          <select value={stitch} disabled={result.basis === 'pattern'} onChange={(e) => set({ stitch: e.target.value as StitchId })}>
            {STITCHES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}{x.factor !== 1 ? ` (${x.factor > 1 ? '+' : '−'}${Math.round(Math.abs(x.factor - 1) * 100)}%)` : ''}{pattern?.stitch === x.id ? ' · from pattern' : ''}
              </option>
            ))}
          </select>
        </label>
      </details>
      <Disclaimer compact />
    </section>
  );
}
