import type { RavPattern, RavPatternSummary, RavYarn } from './types';

/** Small photo URL from either a search result or a detail response. */
export function yarnPhoto(y: RavYarn): string | undefined {
  const p = y.first_photo ?? y.photos?.[0];
  return p?.small_url ?? p?.square_url;
}

export class RavelryUnavailable extends Error {}

async function get<T>(path: string): Promise<T> {
  const res = await fetch('/api/ravelry' + path);
  if (res.status === 503) throw new RavelryUnavailable('Ravelry credentials are not configured.');
  if (!res.ok) throw new Error(`Ravelry request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function searchPatterns(query: string, garmentsOnly = true): Promise<RavPatternSummary[]> {
  const q = new URLSearchParams({ query, page_size: '12' });
  if (garmentsOnly) q.set('pc', 'sweater');
  const data = await get<{ patterns: RavPatternSummary[] }>(`/patterns/search.json?${q}`);
  return data.patterns;
}

export async function getPattern(id: number): Promise<RavPattern> {
  const data = await get<{ pattern: RavPattern }>(`/patterns/${id}.json`);
  return data.pattern;
}

export interface YarnQuery {
  query?: string;
  weight?: string; // Ravelry weight permalink, e.g. "worsted"
  fiber?: string; // Ravelry fiber permalink, e.g. "wool"
  pageSize?: number;
}

export async function searchYarns({ query = '', weight, fiber, pageSize = 10 }: YarnQuery): Promise<RavYarn[]> {
  const q = new URLSearchParams({ query, page_size: String(pageSize), sort: 'best' });
  if (weight) q.set('weight', weight);
  if (fiber) q.set('fiber', fiber); // 'fiberc' makes the API return 500
  const data = await get<{ yarns: RavYarn[] }>(`/yarns/search.json?${q}`);
  return data.yarns;
}

export async function getYarn(id: number): Promise<RavYarn> {
  const data = await get<{ yarn: RavYarn }>(`/yarns/${id}.json`);
  return data.yarn;
}

/** Ravelry photo URL rewritten through the dev proxy so it can be read from a canvas. */
export function proxiedImage(url: string | undefined): string | undefined {
  return url ? `/api/img?u=${encodeURIComponent(url)}` : undefined;
}
