import { inkOn } from '../color/oklch';
import { TEMPLATES, ZONE_LABELS, templateById, zonesFor, type TemplateId } from '../garments/templates';
import { useProject } from '../state/project';
import { SLOT_LETTERS } from './ColorSlots';

export function GarmentOptions() {
  const { pattern, detected, shapeOverride, overrideShape, templateId, stripes, colorworkYoke, slots, assign, stripeSeq, set, assignZone } = useProject();
  const t = templateById(templateId);
  // With a confidently detected pattern, the shape follows the pattern unless the user unlocks it.
  const locked = Boolean(pattern && detected?.confident && !shapeOverride);
  const unsure = Boolean(pattern && !detected?.confident);

  function setStep(i: number, patch: Partial<{ slot: number; rows: number }>) {
    set({ stripeSeq: stripeSeq.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  }

  return (
    <section className="panel">
      <h2>Garment</h2>
      {locked ? (
        <div className="shape-locked">
          <div>
            <span className="muted small">From pattern</span>
            <div><strong>{t.name}</strong>{stripes && ' · stripes'}{t.construction === 'yoke' && colorworkYoke && ' · colorwork yoke'}</div>
            <span className="muted small">{t.blurb}</span>
          </div>
          <button className="link small" onClick={() => overrideShape(true)}>Doesn't look right?</button>
        </div>
      ) : (
        <>
          <label className="field">
            <span>Shape</span>
            <select value={templateId} onChange={(e) => set({ templateId: e.target.value as TemplateId })}>
              {TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <span className="muted small">{t.blurb}</span>
          </label>
          <div className="row">
            <label className="check">
              <input type="checkbox" checked={stripes} onChange={(e) => set({ stripes: e.target.checked })} /> Stripes
            </label>
            {t.construction === 'yoke' && (
              <label className="check">
                <input type="checkbox" checked={colorworkYoke} onChange={(e) => set({ colorworkYoke: e.target.checked })} /> Colorwork yoke
              </label>
            )}
          </div>
          {pattern && shapeOverride && (
            <p className="notice">
              You changed the shape, so the preview and yarn estimate may no longer match {pattern.name}.{' '}
              <button className="link small" onClick={() => overrideShape(false)}>Reset to pattern</button>
            </p>
          )}
          {unsure && !shapeOverride && (
            <p className="notice">Couldn't detect the shape from {pattern!.name}'s Ravelry details, so pick the closest one.</p>
          )}
        </>
      )}

      <h3>Parts</h3>
      <table className="zones">
        <tbody>
          {zonesFor(t).map((z) => (
            <tr key={z}>
              <th scope="row">{ZONE_LABELS[z]}{z === 'yoke' && colorworkYoke ? ' (background)' : ''}</th>
              <td>
                {slots.map((s, i) => (
                  <button
                    key={s.id}
                    className={assign[z] === i ? 'chip on' : 'chip'}
                    style={{ background: s.hex, color: inkOn(s.hex) }}
                    onClick={() => assignZone(z, i)}
                    aria-pressed={assign[z] === i}
                    aria-label={`${ZONE_LABELS[z]}: color ${SLOT_LETTERS[i]}`}
                  >
                    {SLOT_LETTERS[i]}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {stripes && (
        <>
          <h3>Stripe sequence</h3>
          <p className="muted small">Repeats over the body and sleeves, counted from the underarm so they line up.</p>
          <ol className="stripes">
            {stripeSeq.map((st, i) => (
              <li key={i}>
                <select value={st.slot} onChange={(e) => setStep(i, { slot: Number(e.target.value) })} aria-label="Stripe color">
                  {slots.map((_, j) => <option key={j} value={j}>{SLOT_LETTERS[j]}</option>)}
                </select>
                <span className="swatch sm" style={{ background: slots[st.slot]?.hex }} />
                <input type="number" min={1} max={200} value={st.rows} onChange={(e) => setStep(i, { rows: Math.max(1, Number(e.target.value)) })} aria-label="Rows" />
                <span className="muted small">rows</span>
                <button className="ghost small" onClick={() => set({ stripeSeq: stripeSeq.filter((_, j) => j !== i) })} disabled={stripeSeq.length < 2} aria-label="Remove stripe">✕</button>
              </li>
            ))}
          </ol>
          <button className="ghost" onClick={() => set({ stripeSeq: [...stripeSeq, { slot: ((stripeSeq.at(-1)?.slot ?? 0) + 1) % slots.length, rows: 4 }] })}>+ Add stripe</button>
        </>
      )}
    </section>
  );
}
