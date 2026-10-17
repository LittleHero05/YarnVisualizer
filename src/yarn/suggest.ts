import { searchYarns, yarnPhoto } from '../api/ravelry';
import type { RavPack, RavYarn } from '../api/types';
import { weightFromRavelry, type FiberId, type WeightId } from './weights';

export interface YarnInfo {
  id?: number;
  name: string;
  company?: string;
  weight?: WeightId | null;
  yardage?: number | null;
  grams?: number | null;
  photo?: string;
  url?: string;
}

export function yarnInfoFromRavelry(y: RavYarn): YarnInfo {
  return {
    id: y.id,
    name: y.name,
    company: y.yarn_company_name,
    weight: weightFromRavelry(y.yarn_weight?.name),
    yardage: y.yardage,
    grams: y.grams,
    photo: yarnPhoto(y),
    url: y.permalink ? `https://www.ravelry.com/yarns/library/${y.permalink}` : undefined,
  };
}

/**
 * Choose the yarn to suggest for a requested weight + fiber.
 * Prefers a yarn the pattern designer used (if it matches the weight), then the best-rated,
 * still-available Ravelry match.
 */
export function pickSuggestion(
  weight: WeightId,
  packs: RavPack[],
  candidates: RavYarn[],
): YarnInfo | null {
  const packIds = new Set(packs.map((p) => p.yarn_id ?? p.yarn?.id).filter(Boolean));
  const ok = candidates.filter((y) => !y.discontinued && weightFromRavelry(y.yarn_weight?.name) === weight);
  const fromPattern = ok.find((y) => packIds.has(y.id));
  if (fromPattern) return yarnInfoFromRavelry(fromPattern);
  const scored = [...ok].sort(
    (a, b) => (b.rating_average ?? 0) * Math.log10(10 + (b.rating_count ?? 0)) - (a.rating_average ?? 0) * Math.log10(10 + (a.rating_count ?? 0)),
  );
  return scored[0] ? yarnInfoFromRavelry(scored[0]) : null;
}

const RAV_FIBER: Partial<Record<FiberId, string>> = {
  wool: 'wool', cotton: 'cotton', acrylic: 'acrylic', alpaca: 'alpaca', mohair: 'mohair',
};

export async function suggestYarn(weight: WeightId, fiber: FiberId, packs: RavPack[]): Promise<YarnInfo | null> {
  const candidates = await searchYarns({ weight, fiber: RAV_FIBER[fiber], pageSize: 20 });
  return pickSuggestion(weight, packs, candidates);
}
