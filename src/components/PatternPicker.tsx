import { useEffect, useState } from 'react';
import { getPattern, searchPatterns } from '../api/ravelry';
import { noteRavelryResult, useRavelryStatus } from '../api/status';
import type { RavPatternSummary } from '../api/types';
import { useProject } from '../state/project';
import { useDebounced } from './useDebounced';

export function PatternPicker() {
  const pattern = useProject((s) => s.pattern);
  const setPattern = useProject((s) => s.setPattern);
  const available = useRavelryStatus((s) => s.available);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RavPatternSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const q = useDebounced(query.trim());

  useEffect(() => {
    if (q.length < 2) return setResults([]);
    let live = true;
    setLoading(true);
    searchPatterns(q)
      .then((r) => { if (live) { setResults(r); setError(''); noteRavelryResult(); } })
      .catch((e) => { if (live) { setResults([]); setError(String(e.message ?? e)); noteRavelryResult(e); } })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [q]);

  async function choose(id: number) {
    setLoading(true);
    try {
      setPattern(await getPattern(id));
      setQuery('');
      setResults([]);
    } catch (e) {
      setError(String((e as Error).message));
      noteRavelryResult(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h2><span className="step">1</span> Pattern</h2>
      {pattern && (
        <div className="chosen-pattern">
          {pattern.photo && <img src={pattern.photo} alt="" />}
          <div>
            <a href={pattern.url} target="_blank" rel="noreferrer"><strong>{pattern.name}</strong></a>
            {pattern.designer && <div className="muted">by {pattern.designer}</div>}
            {pattern.sizes && <div className="muted small">Sizes: {pattern.sizes}</div>}
          </div>
          <button className="ghost" onClick={() => setPattern(null)} aria-label="Clear pattern">✕</button>
        </div>
      )}
      <label className="field">
        <span>{pattern ? 'Search for a different pattern' : 'Search Ravelry sweaters'}</span>
        <input
          type="search"
          placeholder="e.g. Flax, Ranunculus, Stopover"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={available === false}
        />
      </label>
      {available === false && (
        <p className="notice">
          Ravelry isn't connected. Add a read-only key to <code>.env</code> (see <code>.env.example</code>) and restart the dev server. You can still pick a garment shape below.
        </p>
      )}
      {error && available !== false && <p className="notice error">{error}</p>}
      {loading && <p className="muted small">Searching…</p>}
      {results.length > 0 && (
        <ul className="results">
          {results.map((p) => (
            <li key={p.id}>
              <button onClick={() => choose(p.id)}>
                {p.first_photo?.square_url ? <img src={p.first_photo.square_url} alt="" /> : <span className="thumb" />}
                <span>
                  <strong>{p.name}</strong>
                  <span className="muted small">{p.designer?.name}{p.free ? ' · free' : ''}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
