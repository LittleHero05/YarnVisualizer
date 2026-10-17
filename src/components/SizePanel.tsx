import { EASE_OPTIONS, SIZE_CHART, type EaseId, type Measurements, type SizeId } from '../garments/sizing';
import { useProject } from '../state/project';
import { fmtEase, fmtLength, lengthFromInput, lengthUnit, lengthValue, type Units } from '../units';

// Input bounds in inches, shown in the user's unit.
const BUST = [24, 70], LENGTH = [6, 30];
const bound = (n: number, u: Units) => (u === 'metric' ? Math.round(lengthValue(n, u)) : n);

export function SizePanel({ m }: { m: Measurements }) {
  const { size, setSize, pattern, units } = useProject();
  const step = units === 'metric' ? 1 : 0.5;
  return (
    <section className="panel">
      <h2><span className="step">4</span> Size</h2>
      <div className="row">
        <label className="field">
          <span>Size</span>
          <select value={size.preset} onChange={(e) => setSize({ preset: e.target.value as SizeId | 'custom' })}>
            {SIZE_CHART.map((r) => <option key={r.id} value={r.id}>{r.id} ({fmtLength(r.bust, units, { trim: true })} bust)</option>)}
            <option value="custom">Custom…</option>
          </select>
        </label>
        <label className="field">
          <span>Fit</span>
          <select value={size.ease} onChange={(e) => setSize({ ease: e.target.value as EaseId })}>
            {EASE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.name} ({fmtEase(o.inches, units, 'from' in o ? o.from : undefined)})</option>)}
          </select>
        </label>
      </div>
      {size.preset === 'custom' && (
        <div className="row">
          <label className="field">
            <span>Bust ({lengthUnit(units)})</span>
            <input type="number" min={bound(BUST[0], units)} max={bound(BUST[1], units)} step={step} value={lengthValue(size.bust, units)} onChange={(e) => setSize({ bust: lengthFromInput(Number(e.target.value), units) })} />
          </label>
          <label className="field">
            <span>Underarm to hem ({lengthUnit(units)})</span>
            <input type="number" min={bound(LENGTH[0], units)} max={bound(LENGTH[1], units)} step={step} value={size.length ? lengthValue(size.length, units) : ''} placeholder="auto" onChange={(e) => setSize({ length: e.target.value ? lengthFromInput(Number(e.target.value), units) : undefined })} />
          </label>
        </div>
      )}
      <dl className="measures">
        <div><dt>Finished chest</dt><dd>{fmtLength(m.chest, units)}</dd></div>
        <div><dt>Length</dt><dd>{fmtLength(m.armDepth + m.bodyLength, units)}</dd></div>
        <div><dt>Upper arm</dt><dd>{fmtLength(m.upperArm, units)}</dd></div>
        <div><dt>Sleeve</dt><dd>{fmtLength(m.sleeveLength, units)}</dd></div>
      </dl>
      {pattern?.sizes && <p className="muted small">The pattern lists: {pattern.sizes}</p>}
    </section>
  );
}
