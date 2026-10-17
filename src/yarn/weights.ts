// Yarn weight classes with typical stockinette gauge and skein size.
// Yardage per area comes from gauge (see estimate/gauge.ts).

export type WeightId = 'fingering' | 'sport' | 'dk' | 'worsted' | 'aran' | 'bulky' | 'super-bulky';
export type FiberId = 'wool' | 'cotton' | 'acrylic' | 'alpaca' | 'mohair' | 'blend';

export interface WeightInfo {
  id: WeightId;
  label: string;
  stPerIn: number;
  rowsPerIn: number;
  skein: { yards: number; grams: number };
}

export const WEIGHTS: WeightInfo[] = [
  { id: 'fingering', label: 'Fingering', stPerIn: 7, rowsPerIn: 9.5, skein: { yards: 400, grams: 100 } },
  { id: 'sport', label: 'Sport', stPerIn: 6, rowsPerIn: 8, skein: { yards: 330, grams: 100 } },
  { id: 'dk', label: 'DK', stPerIn: 5.5, rowsPerIn: 7.5, skein: { yards: 250, grams: 100 } },
  { id: 'worsted', label: 'Worsted', stPerIn: 4.5, rowsPerIn: 6, skein: { yards: 200, grams: 100 } },
  { id: 'aran', label: 'Aran', stPerIn: 4.25, rowsPerIn: 5.5, skein: { yards: 180, grams: 100 } },
  { id: 'bulky', label: 'Bulky', stPerIn: 3.25, rowsPerIn: 4.5, skein: { yards: 110, grams: 100 } },
  { id: 'super-bulky', label: 'Super bulky', stPerIn: 2.25, rowsPerIn: 3, skein: { yards: 80, grams: 100 } },
];

export const FIBERS: { id: FiberId; label: string }[] = [
  { id: 'wool', label: 'Wool' },
  { id: 'cotton', label: 'Cotton' },
  { id: 'acrylic', label: 'Acrylic' },
  { id: 'alpaca', label: 'Alpaca' },
  { id: 'mohair', label: 'Mohair' },
  { id: 'blend', label: 'Any / blend' },
];

export function weightInfo(id: WeightId): WeightInfo {
  return WEIGHTS.find((w) => w.id === id) ?? WEIGHTS[3];
}

/** Map a Ravelry weight name ("Worsted", "Light Fingering", "Super Bulky") to our ids. */
export function weightFromRavelry(name?: string | null): WeightId | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes('super bulky') || n.includes('jumbo')) return 'super-bulky';
  if (n.includes('bulky')) return 'bulky';
  if (n.includes('aran')) return 'aran';
  if (n.includes('worsted')) return 'worsted';
  if (n.includes('dk')) return 'dk';
  if (n.includes('sport')) return 'sport';
  if (n.includes('fingering') || n.includes('lace') || n.includes('thread') || n.includes('cobweb')) return 'fingering';
  return null;
}
