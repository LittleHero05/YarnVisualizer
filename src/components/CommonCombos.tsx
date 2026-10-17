import { useState } from 'react';
import { getYarn, proxiedImage, yarnPhoto } from '../api/ravelry';
import type { RavPack } from '../api/types';
import { approximateColor, sampleImage } from '../color/approximate';
import { useProject } from '../state/project';
import { yarnInfoFromRavelry, type YarnInfo } from '../yarn/suggest';
import { weightFromRavelry } from '../yarn/weights';
import { SLOT_LETTERS } from './ColorSlots';

const packName = (p: RavPack) => [p.yarn?.yarn_company_name, (p.yarn?.name ?? p.yarn_name ?? '').trim()].filter(Boolean).join(' ');

/**
 * Yarns knit for this pattern (Ravelry "packs"). Often these are alternatives for one color,
 * so each can be applied to the active color slot. When several packs name colorways,
 * they read as a color combo and can be applied all at once.
 */
export function CommonCombos() {
  const pattern = useProject((s) => s.pattern);
  const activeSlot = useProject((s) => s.activeSlot);
  const applyCombo = useProject((s) => s.applyCombo);
  const updateSlot = useProject((s) => s.updateSlot);
  const [busy, setBusy] = useState<number | null>(null);
  const packs = (pattern?.packs ?? []).filter((p) => p.yarn_name || p.yarn?.name);
  if (!pattern) return null;
  if (!packs.length) return <p className="muted small">Ravelry doesn't list the yarns used for this pattern.</p>;
  const isCombo = packs.filter((p) => p.colorway).length >= 2;

  async function useForSlot(p: RavPack) {
    setBusy(p.id);
    const colorway = p.colorway ?? '';
    const name = packName(p);
    let info: YarnInfo = { id: p.yarn?.id, name: p.yarn?.name ?? p.yarn_name ?? '', company: p.yarn?.yarn_company_name, weight: weightFromRavelry(p.yarn_weight?.name) };
    let ravelryPhoto = null;
    const id = p.yarn?.id ?? p.yarn_id;
    if (id) {
      try {
        const y = await getYarn(id);
        info = yarnInfoFromRavelry(y);
        const src = proxiedImage(yarnPhoto(y));
        if (src) ravelryPhoto = await sampleImage(src).catch(() => null);
      } catch {
        // Keep the pack's basic info if the yarn lookup fails.
      }
    }
    const a = approximateColor({ colorwayName: colorway, yarnName: name, ravelryPhoto });
    updateSlot(activeSlot, { mode: 'own', yarn: info, yarnName: name, colorway, hex: a.hex, texture: a.texture, accents: a.accents, source: a.source });
    setBusy(null);
  }

  return (
    <div className="combos">
      <h3>{isCombo ? 'Color combo used in this pattern' : 'Yarns knit for this pattern'}</h3>
      <ul>
        {packs.slice(0, 8).map((p) => {
          const a = approximateColor({ colorwayName: p.colorway ?? '', yarnName: packName(p) });
          return (
            <li key={p.id}>
              {p.colorway ? <span className="swatch sm" style={{ background: a.hex }} /> : <span className="swatch sm empty" />}
              <span className="grow">
                {packName(p)}
                {p.colorway && <span className="muted"> · {p.colorway}</span>}
                {p.yarn_weight?.name && <span className="muted small"> ({p.yarn_weight.name})</span>}
              </span>
              <button className="ghost small" disabled={busy !== null} onClick={() => useForSlot(p)}>
                {busy === p.id ? '…' : `Use for ${SLOT_LETTERS[activeSlot]}`}
              </button>
            </li>
          );
        })}
      </ul>
      {isCombo && <button onClick={() => applyCombo(packs)}>Use the whole combo</button>}
    </div>
  );
}
