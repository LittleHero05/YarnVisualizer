import { useEffect, useRef, useState } from 'react';
import { proxiedImage, searchYarns, yarnPhoto } from '../api/ravelry';
import { noteRavelryResult, useRavelryStatus } from '../api/status';
import type { RavYarn } from '../api/types';
import { approximateColor, sampleImage, type SampleResult } from '../color/approximate';
import type { YarnTexture } from '../color/colorNames';
import { useProject, type Slot } from '../state/project';
import { fmtYarn } from '../units';
import { yarnInfoFromRavelry } from '../yarn/suggest';
import { useDebounced } from './useDebounced';

const SOURCE_TEXT: Record<string, string> = {
  photo: 'from your photo',
  name: 'from the colorway name',
  'ravelry-photo': "from the yarn's Ravelry photo, which may show a different colorway. Enter yours above",
  manual: 'picked by you',
  default: 'no color info yet, so a neutral placeholder',
  generated: 'generated',
};

export function OwnYarnForm({ index, slot }: { index: number; slot: Slot }) {
  const updateSlot = useProject((s) => s.updateSlot);
  const units = useProject((s) => s.units);
  const available = useRavelryStatus((s) => s.available);
  const [yarnQuery, setYarnQuery] = useState(slot.yarnName);
  const [results, setResults] = useState<RavYarn[]>([]);
  const [open, setOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState<SampleResult | null>(null);
  const [ravPhoto, setRavPhoto] = useState<SampleResult | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const q = useDebounced(yarnQuery.trim());
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep the field in sync when the yarn is set from elsewhere (e.g. "Use" on a pattern yarn).
  useEffect(() => setYarnQuery(slot.yarnName), [slot.yarnName]);

  useEffect(() => {
    if (!open || q.length < 2 || available === false) return setResults([]);
    let live = true;
    searchYarns({ query: q, pageSize: 8 })
      .then((r) => { noteRavelryResult(); if (live) setResults(r); })
      .catch((e) => { noteRavelryResult(e); if (live) setResults([]); });
    return () => { live = false; };
  }, [q, open, available]);

  // Recompute the approximation whenever an input changes (a manual pick sticks until then).
  function recompute(next: { colorway?: string; yarnName?: string; userPhoto?: SampleResult | null; ravPhoto?: SampleResult | null }) {
    const a = approximateColor({
      colorwayName: next.colorway ?? slot.colorway,
      yarnName: next.yarnName ?? slot.yarnName,
      userPhoto: next.userPhoto !== undefined ? next.userPhoto : userPhoto,
      ravelryPhoto: next.ravPhoto !== undefined ? next.ravPhoto : ravPhoto,
    });
    updateSlot(index, { hex: a.hex, texture: a.texture, accents: a.accents, source: a.source });
  }

  async function pickYarn(y: RavYarn) {
    const info = yarnInfoFromRavelry(y);
    const yarnName = [info.company, info.name].filter(Boolean).join(' ');
    setYarnQuery(yarnName);
    setOpen(false);
    updateSlot(index, { yarn: info, yarnName });
    let rp: SampleResult | null = null;
    const src = proxiedImage(yarnPhoto(y));
    if (src) rp = await sampleImage(src).catch(() => null);
    setRavPhoto(rp);
    recompute({ yarnName, ravPhoto: rp });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    const s = await sampleImage(url).catch(() => null);
    setUserPhoto(s);
    recompute({ userPhoto: s });
  }

  function clearPhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(undefined);
    setUserPhoto(null);
    if (fileRef.current) fileRef.current.value = '';
    recompute({ userPhoto: null });
  }

  return (
    <div className="own-yarn">
      <label className="field combo-field">
        <span>Yarn</span>
        <input
          value={yarnQuery}
          placeholder="Brand and line, e.g. Malabrigo Rios"
          onChange={(e) => { setYarnQuery(e.target.value); setOpen(true); }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
            if (yarnQuery !== slot.yarnName) {
              updateSlot(index, { yarnName: yarnQuery, yarn: slot.yarn?.name && yarnQuery.includes(slot.yarn.name) ? slot.yarn : null });
              recompute({ yarnName: yarnQuery });
            }
          }}
        />
        {open && results.length > 0 && (
          <ul className="dropdown">
            {results.map((y) => (
              <li key={y.id}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => pickYarn(y)}>
                  {y.yarn_company_name} {y.name}
                  <span className="muted small"> · {y.yarn_weight?.name}{y.yardage ? ` · ${fmtYarn(y.yardage, units)}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>
      <label className="field">
        <span>Colorway</span>
        <input
          value={slot.colorway}
          placeholder="e.g. Teal Feather, Oatmeal Heather"
          onChange={(e) => updateSlot(index, { colorway: e.target.value })}
          onBlur={(e) => recompute({ colorway: e.target.value })}
        />
      </label>
      <div className="row align-end">
        <label className="field">
          <span>Photo of the yarn (optional)</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
        {photoUrl && (
          <span className="photo-preview">
            <img src={photoUrl} alt="Your yarn" />
            <button className="ghost small" onClick={clearPhoto}>Remove</button>
          </span>
        )}
      </div>
      <div className="row align-center">
        <label className="field narrow">
          <span>Color</span>
          <input type="color" value={slot.hex} onChange={(e) => updateSlot(index, { hex: e.target.value, source: 'manual' })} />
        </label>
        <label className="field narrow">
          <span>Texture</span>
          <select value={slot.texture} onChange={(e) => updateSlot(index, { texture: e.target.value as YarnTexture })}>
            {['solid', 'heather', 'tweed', 'speckle', 'variegated'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <p className="muted small grow">
          Approximate color {SOURCE_TEXT[slot.source] ?? ''}. Colors may vary.
        </p>
      </div>
    </div>
  );
}
