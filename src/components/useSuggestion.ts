import { useEffect, useState } from 'react';
import { noteRavelryResult } from '../api/status';
import type { RavPack } from '../api/types';
import { suggestYarn, type YarnInfo } from '../yarn/suggest';
import type { FiberId, WeightId } from '../yarn/weights';

const cache = new Map<string, YarnInfo | null>();

/** The Ravelry yarn suggested for a weight + fiber, preferring ones this pattern was knit in. */
export function useSuggestion(weight: WeightId, fiber: FiberId, packs: RavPack[]) {
  const key = `${weight}|${fiber}|${packs.map((p) => p.yarn_id ?? p.yarn?.id).join(',')}`;
  const [state, setState] = useState<{ key: string; yarn: YarnInfo | null; loading: boolean }>({
    key, yarn: cache.get(key) ?? null, loading: !cache.has(key),
  });

  useEffect(() => {
    if (cache.has(key)) return setState({ key, yarn: cache.get(key) ?? null, loading: false });
    let live = true;
    setState({ key, yarn: null, loading: true });
    suggestYarn(weight, fiber, packs)
      .then((y) => { cache.set(key, y); noteRavelryResult(); if (live) setState({ key, yarn: y, loading: false }); })
      .catch((e) => { noteRavelryResult(e); if (live) setState({ key, yarn: null, loading: false }); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state : { key, yarn: null, loading: true };
}
