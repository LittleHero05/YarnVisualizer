import { hexToRgb, rgbToOklab } from './oklch';
// Colorway-name → approximate hex. Yarn colorways are poetic ("Teal Feather", "Oatmeal Heather"),
// so lookup matches individual color words and phrases, then applies modifiers.

export type YarnTexture = 'solid' | 'heather' | 'tweed' | 'speckle' | 'variegated';

export const COLOR_NAMES: Record<string, string> = {
  // neutrals
  white: '#f4f2ec', 'natural white': '#f0ebde', snow: '#f5f5f2', ivory: '#efe8d6', cream: '#ece2c8', natural: '#e8dfca',
  ecru: '#ddd3bb', bone: '#e3dccb', vanilla: '#efe4c4', porcelain: '#ebe9e3', pearl: '#e4e0d8', linen: '#ddd2bd',
  oatmeal: '#d6c9b0', oat: '#d6c9b0', parchment: '#e2d6b8', sand: '#cdb894', wheat: '#d9c08f', straw: '#d8c27a',
  biscuit: '#cbb08a', camel: '#b98d5a', fawn: '#b9987a', taupe: '#8f8172', mushroom: '#a39585', stone: '#a7a094',
  pebble: '#9c968c', putty: '#b3a690', khaki: '#a49a6d', driftwood: '#9b8b77', flax: '#cdb98a', jute: '#b39b6e',
  grey: '#8f8f8d', gray: '#8f8f8d', 'light grey': '#c4c3c0', silver: '#bdbdbb', ash: '#a9a8a4', fog: '#c8c9c6',
  mist: '#d3d6d4', smoke: '#7e7d7b', slate: '#5f6872', pewter: '#7d7f80', graphite: '#4d4e50', charcoal: '#3e3e40',
  iron: '#535353', steel: '#6f7a83', granite: '#676561', black: '#1f1e1e', onyx: '#252424', jet: '#1a1a1c',
  ink: '#232836', soot: '#2b2a29', raven: '#24252a', licorice: '#1f1c1d',
  // browns
  brown: '#6b4a32', chocolate: '#4f3324', cocoa: '#6a4a3a', coffee: '#5a3e2e', espresso: '#3a2a22', mocha: '#7b5c49',
  chestnut: '#7c4227', walnut: '#5e4130', hazelnut: '#9a704c', toffee: '#9b6a3e', caramel: '#b07438', cinnamon: '#9e5b31',
  nutmeg: '#80533a', ginger: '#b76a2c', tobacco: '#6e5233', bark: '#5a4535', earth: '#6d5440', umber: '#5c4033',
  sepia: '#704f38', tan: '#b48e66', bronze: '#8c6239', copper: '#b06438', rust: '#a84a26', terracotta: '#b6603f',
  clay: '#a66a4d', sienna: '#a0522d', brick: '#9c3f2e', mahogany: '#6b2c22',
  // reds & pinks
  red: '#b3262e', scarlet: '#c22c2c', crimson: '#a51d34', cherry: '#a8202f', ruby: '#8f1d36', garnet: '#7a1f2b',
  cranberry: '#8b2238', wine: '#6a1f2e', burgundy: '#6b1e2f', merlot: '#5e1d2b', oxblood: '#5a1c1c', claret: '#6f1f33',
  poppy: '#d23c2f', tomato: '#cc4a32', cardinal: '#a3202f', lipstick: '#b1223f', raspberry: '#a6294f', strawberry: '#cf4155',
  coral: '#e2735f', salmon: '#e38e7b', peach: '#f0b896', apricot: '#eaa16b', melon: '#f2a98d', blush: '#e8b9b2',
  pink: '#e3a2b0', rose: '#c9707f', 'dusty rose': '#bb8a8c', 'old rose': '#b07d80', petal: '#efc6cc', ballet: '#f0cfd2',
  carnation: '#ea8ca0', bubblegum: '#ef8fb4', flamingo: '#ec7c95', fuchsia: '#b8336f', magenta: '#a8306f',
  cerise: '#b82a5b', peony: '#d9668a', mauve: '#a6808e', orchid: '#b37bb0', rosewood: '#7a3b42',
  // oranges & yellows
  orange: '#d9682a', tangerine: '#e47a2e', pumpkin: '#c8662a', persimmon: '#d25d32', marmalade: '#d98030',
  amber: '#c98a2a', saffron: '#e0a02c', marigold: '#e3a42e', mustard: '#c99a2e', ochre: '#b98b2e', gold: '#c9a227',
  honey: '#d0a04b', butterscotch: '#d29a46', turmeric: '#d29b28', sunflower: '#e9be31', yellow: '#e8c547',
  lemon: '#ecd85c', canary: '#f0d64d', butter: '#efdb8f', buttercup: '#efce5a', daffodil: '#f0d35a', citron: '#d6cc4a',
  corn: '#e6c45c', banana: '#f1df8e',
  // greens
  green: '#4b7a47', forest: '#2f4a35', pine: '#2d4a3a', fir: '#33473a', evergreen: '#2b4636', spruce: '#2f4e48',
  hunter: '#2f4d38', emerald: '#1f6e4e', jade: '#3e8e6e', bottle: '#24473a', moss: '#6b7a3e', olive: '#6b6a35',
  'army green': '#55573a', loden: '#555c3b', fern: '#5f8148', leaf: '#6a9a4a', grass: '#6d9a3f', kelly: '#2f8a3f',
  apple: '#8bb04a', lime: '#a6c13d', chartreuse: '#b3c23a', pistachio: '#b5c58f', celery: '#c6cf94', sage: '#9aa98a',
  eucalyptus: '#8ba497', mint: '#a9d4bb', seafoam: '#9ccfbd', celadon: '#aec7a8', lichen: '#a2a984', juniper: '#4e6b5c',
  artichoke: '#8a8f63', avocado: '#5e6b2e', basil: '#4c6a3a', thyme: '#6f7d5a', matcha: '#a3ae6a', pea: '#8fa35a',
  // blues & teals
  blue: '#3a5f9c', navy: '#1f2b48', midnight: '#1c2236', denim: '#3f5f82', indigo: '#2e3a68', cobalt: '#2a4fa0',
  royal: '#2b46a0', sapphire: '#22457f', azure: '#3a83c4', cornflower: '#6f8fd0', periwinkle: '#8e98d4',
  sky: '#94bfe0', 'baby blue': '#b5d0ea', powder: '#c3d6e8', ice: '#d6e4ea', glacier: '#a9c6d3', cloud: '#d8dee3',
  steelblue: '#4a6c8c', storm: '#55677a', 'storm blue': '#4f6378', 'slate blue': '#5a6b8c', chambray: '#7b93b0',
  cerulean: '#2f7fb4', ocean: '#2b6c8f', sea: '#3f7f8f', marine: '#264f74', lake: '#3d6f84', river: '#5a8ca0',
  teal: '#227a7a', peacock: '#1f6f7b', petrol: '#1f4e5a', aqua: '#5fbcbd', turquoise: '#3aa6a6', cyan: '#3fb0c4',
  lagoon: '#2f8c8f', duck: '#205a5e', 'duck egg': '#b8d4cc', robin: '#88c3c4', 'robin egg': '#9fd2d0', spa: '#bcdcd2',
  // purples
  purple: '#5d3b7a', violet: '#6a4c9c', lavender: '#b3a6d4', lilac: '#c4abd3', wisteria: '#a491c9', heather: '#9d86a6',
  plum: '#5e2f50', aubergine: '#3d2338', eggplant: '#3b2438', grape: '#5a2d63', amethyst: '#7b5a9e', iris: '#5d5aa0',
  thistle: '#bba6c2', mulberry: '#6e2c55', blackberry: '#3b2235', boysenberry: '#5e2347', damson: '#4b2a45',
  // misc evocative words common in colorway names
  feather: '#a7a59d', autumn: '#a6612f', winter: '#c8d2d8', spring: '#a9c87a', summer: '#e8b84a', dusk: '#6d6585',
  dawn: '#e6c3b4', sunset: '#d9733f', sunrise: '#eba465', twilight: '#4c4a6b', storm_: '#55677a', thunder: '#4e5359',
  rain: '#8a9aa4', frost: '#dce5e8', moonstone: '#c7cfd6', moon: '#d9d7cf', smokey: '#7e7d7b', peat: '#4d3e30',
  heath: '#86708a', moor: '#5c5a46', bramble: '#4b2c3a', berry: '#8a2b4b', blueberry: '#3b4a7a', cherry_: '#a8202f',
  wine_: '#6a1f2e', tea: '#b38b5d', chai: '#a77b55', latte: '#c2a184', cappuccino: '#a8876b', mocha_: '#7b5c49',
  sangria: '#7c1f36', paprika: '#a83c27', chili: '#9b2a22', cayenne: '#a8331f', lava: '#8a2f22', ember: '#b4442a',
  fire: '#c43b28', flame: '#d5502d', glow: '#efb06a', candle: '#efd69a', honeycomb: '#d39a3c', amberglow: '#c98a2a',
};

const TEXTURE_WORDS: [RegExp, YarnTexture][] = [
  [/\btweed|donegal|fleck/i, 'tweed'],
  [/\bspeckle|speckled|confetti|sprinkle|fleck/i, 'speckle'],
  [/\bvariegated|multi|rainbow|ombre|gradient|self[- ]?striping|painted|kettle/i, 'variegated'],
  [/\bheather|heathered|marl|melange|mélange/i, 'heather'],
];

const MODIFIERS: { re: RegExp; l?: number; c?: number }[] = [
  { re: /\b(light|pale|soft|pastel|baby)\b/i, l: 0.12, c: 0.7 },
  { re: /\b(dark|deep|midnight)\b/i, l: -0.14 },
  { re: /\b(dusty|muted|faded|vintage|antique)\b/i, c: 0.6 },
  { re: /\b(bright|vivid|neon|electric)\b/i, c: 1.4 },
];

export interface NameMatch {
  hexes: string[];
  matched: string[];
  texture: YarnTexture;
  lightness: number;
  chromaScale: number;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-zé\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Find color words in a colorway name. Multi-word phrases win over single words. */
export function matchColorName(name: string): NameMatch | null {
  const n = normalize(name);
  if (!n) return null;
  const texture = TEXTURE_WORDS.find(([re]) => re.test(n))?.[1] ?? 'solid';
  let lightness = 0, chromaScale = 1;
  for (const m of MODIFIERS) {
    if (m.re.test(n)) {
      lightness += m.l ?? 0;
      chromaScale *= m.c ?? 1;
    }
  }

  const keys = Object.keys(COLOR_NAMES)
    .filter((k) => !k.endsWith('_'))
    .sort((a, b) => b.length - a.length);
  let rest = ` ${n} `;
  const matched: string[] = [];
  for (const k of keys) {
    const needle = ` ${k} `;
    if (rest.includes(needle)) {
      matched.push(k);
      rest = rest.replace(needle, ' ');
    }
  }
  // "heather" as a texture word shouldn't also count as a purple when other colors are named.
  const colorWords = matched.length > 1 ? matched.filter((k) => k !== 'heather') : matched;
  if (!colorWords.length) return null;
  return { hexes: colorWords.map((k) => COLOR_NAMES[k]), matched: colorWords, texture, lightness, chromaScale };
}

/** Texture implied by a colorway or yarn name, even if no color word matched. */
export function textureFromName(name: string): YarnTexture {
  return TEXTURE_WORDS.find(([re]) => re.test(name))?.[1] ?? 'solid';
}

/** Closest named color, for "look for a colorway like …" hints. */
export function nearestColorName(hex: string): string {
  const [l0, a0, b0] = rgbToOklab(...hexToRgb(hex));
  let best = '', bd = Infinity;
  for (const [name, h] of Object.entries(COLOR_NAMES)) {
    if (name.endsWith('_')) continue;
    const [l, a, b] = rgbToOklab(...hexToRgb(h));
    const d = (l - l0) ** 2 + (a - a0) ** 2 + (b - b0) ** 2;
    if (d < bd) { bd = d; best = name; }
  }
  return best.replace(/\b\w/g, (c) => c.toUpperCase());
}
