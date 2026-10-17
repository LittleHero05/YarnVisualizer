import { nearestColorName } from '../color/colorNames';
import { useProject, type Slot } from '../state/project';
import { fmtYarn } from '../units';
import type { YarnInfo } from '../yarn/suggest';

export function SuggestedYarnCard({ slot, yarn, loading }: { slot: Slot; yarn: YarnInfo | null; loading: boolean }) {
  const hint = nearestColorName(slot.hex);
  const units = useProject((s) => s.units);
  return (
    <div className="suggested">
      {loading ? (
        <p className="muted small">Finding a yarn…</p>
      ) : yarn ? (
        <p className="small">
          Suggested yarn:{' '}
          {yarn.url ? <a href={yarn.url} target="_blank" rel="noreferrer">{yarn.company} {yarn.name}</a> : `${yarn.company ?? ''} ${yarn.name}`}
          {yarn.yardage ? <span className="muted"> · {fmtYarn(yarn.yardage, units)} / {yarn.grams ?? '?'} g</span> : null}
        </p>
      ) : (
        <p className="muted small">No Ravelry suggestion right now. The estimate uses a typical skein for this weight.</p>
      )}
      <p className="muted small">Look for a colorway like “{hint}”. Approximate, colors may vary.</p>
    </div>
  );
}
