import { useProject } from '../state/project';
import { FIBERS, WEIGHTS, type FiberId, type WeightId } from '../yarn/weights';
import { CommonCombos } from './CommonCombos';

export function YarnTypeForm() {
  const { weight, fiber, slots, pattern, set, setSlotCount } = useProject();
  return (
    <section className="panel">
      <h2><span className="step">2</span> Yarn type</h2>
      <div className="row">
        <label className="field">
          <span>Weight</span>
          <select value={weight} onChange={(e) => set({ weight: e.target.value as WeightId })}>
            {WEIGHTS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}{pattern?.weight === w.id ? ' (pattern)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Fiber</span>
          <select value={fiber} onChange={(e) => set({ fiber: e.target.value as FiberId })}>
            {FIBERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label className="field narrow">
          <span>Colors</span>
          <select value={slots.length} onChange={(e) => setSlotCount(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <CommonCombos />
    </section>
  );
}
