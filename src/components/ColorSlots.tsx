import { inkOn } from '../color/oklch';
import { useProject } from '../state/project';
import { Disclaimer } from './Disclaimer';
import { OwnYarnForm } from './OwnYarnForm';
import { PaletteGenerator } from './PaletteGenerator';
import { SuggestedYarnCard } from './SuggestedYarnCard';
import { useSuggestion } from './useSuggestion';

export const SLOT_LETTERS = 'ABCDE';

export function ColorSlots() {
  const { slots, activeSlot, weight, fiber, pattern, set, updateSlot } = useProject();
  const suggestion = useSuggestion(weight, fiber, pattern?.packs ?? []);
  const slot = slots[activeSlot] ?? slots[0];

  return (
    <section className="panel">
      <h2><span className="step">3</span> Colors</h2>
      <div className="slot-tabs" role="tablist">
        {slots.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === activeSlot}
            className={i === activeSlot ? 'slot-tab active' : 'slot-tab'}
            style={{ background: s.hex, color: inkOn(s.hex) }}
            onClick={() => set({ activeSlot: i })}
          >
            {SLOT_LETTERS[i]}
            {s.locked && ' 🔒'}
          </button>
        ))}
      </div>

      <div className="slot-editor">
        <div className="seg" role="radiogroup" aria-label="Color source">
          <button role="radio" aria-checked={slot.mode === 'suggested'} className={slot.mode === 'suggested' ? 'on' : ''} onClick={() => updateSlot(activeSlot, { mode: 'suggested' })}>
            Suggest colors for me
          </button>
          <button role="radio" aria-checked={slot.mode === 'own'} className={slot.mode === 'own' ? 'on' : ''} onClick={() => updateSlot(activeSlot, { mode: 'own' })}>
            I have a yarn
          </button>
        </div>

        {slot.mode === 'own' ? (
          <OwnYarnForm key={slot.id} index={activeSlot} slot={slot} />
        ) : (
          <>
            <div className="row align-center">
              <label className="field narrow">
                <span>Color</span>
                <input type="color" value={slot.hex} onChange={(e) => updateSlot(activeSlot, { hex: e.target.value, source: 'manual' })} />
              </label>
              <label className="check">
                <input type="checkbox" checked={slot.locked} onChange={(e) => updateSlot(activeSlot, { locked: e.target.checked })} />
                Keep this color when shuffling
              </label>
            </div>
            <SuggestedYarnCard slot={slot} yarn={suggestion.yarn} loading={suggestion.loading} />
          </>
        )}
      </div>

      <PaletteGenerator />
      <Disclaimer />
    </section>
  );
}
