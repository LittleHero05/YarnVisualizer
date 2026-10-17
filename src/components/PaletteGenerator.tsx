import { useMemo } from 'react';
import { generatePalettes } from '../color/palettes';
import { useProject } from '../state/project';

/** Generated palettes; own-yarn and locked slots stay fixed and anchor the harmony. */
export function PaletteGenerator() {
  const { slots, seed, set, applyPalette } = useProject();
  const locked = slots.map((s) => (s.locked || s.mode === 'own' ? s.hex : null));
  const lockKey = locked.join(',');
  const palettes = useMemo(() => generatePalettes(slots.length, seed, locked), [slots.length, seed, lockKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (slots.every((s) => s.mode === 'own')) return null;

  return (
    <div className="palettes">
      <div className="row space-between align-center">
        <h3>Suggested palettes</h3>
        <button className="yellow small" onClick={() => set({ seed: seed + 1 })}>↻ Shuffle</button>
      </div>
      <ul>
        {palettes.map((p, i) => (
          <li key={`${seed}-${i}`}>
            <button className="wrapcard" onClick={() => applyPalette(p.colors)} title={`Apply ${p.name}`}>
              {wraps(p.colors).map((c, j) => <i key={j} style={{ backgroundColor: c }} />)}
              <b>{p.name}</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Five wraps per card, like yarn wound around cardboard: the first color twice as often. */
function wraps(colors: string[]): string[] {
  const seq = colors.length >= 5 ? colors.slice(0, 5) : [colors[0], ...colors, colors[0]].slice(0, 5);
  while (seq.length < 5) seq.push(colors[seq.length % colors.length]);
  return seq;
}
