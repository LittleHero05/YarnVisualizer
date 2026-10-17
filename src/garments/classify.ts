import type { RavPattern } from '../api/types';
import type { TemplateId } from './templates';

export interface Classification {
  templateId: TemplateId;
  stripes: boolean;
  colorworkYoke: boolean;
  /** False when nothing in the pattern pointed at a specific construction. */
  confident: boolean;
}

/** Map a Ravelry pattern to the closest garment template using categories, attributes and its name. */
export function classifyPattern(p: Pick<RavPattern, 'name' | 'pattern_categories' | 'pattern_attributes'>): Classification {
  const cats = (p.pattern_categories ?? []).flatMap((c) => [c.permalink, c.parent?.permalink, c.parent?.parent?.permalink]);
  const attrs = (p.pattern_attributes ?? []).map((a) => a.permalink);
  const text = [p.name, ...cats, ...attrs].filter(Boolean).join(' ').toLowerCase();

  const cardigan = /cardigan|jacket/.test(text);
  const yoke = /yoke/.test(text) && !/raglan/.test(text);
  const raglan = /raglan/.test(text);
  const drop = /drop[- ]?shoulder|boxy|oversized/.test(text);
  const stranded = /stranded|fair[- ]?isle|colorwork|colourwork|lopapeysa|icelandic/.test(text);
  const stripes = /stripe/.test(text);

  let templateId: TemplateId = 'raglan';
  if (cardigan) templateId = 'cardigan';
  else if (yoke || (stranded && !raglan && !drop)) templateId = 'yoke';
  else if (drop) templateId = 'drop';

  return {
    templateId,
    stripes,
    colorworkYoke: templateId === 'yoke' && (stranded || yoke),
    confident: cardigan || yoke || raglan || drop || stranded,
  };
}
