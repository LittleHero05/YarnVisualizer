// Hand-picked palettes in the spirit of popular knitting colorways. Approximate hexes.

export interface CuratedPalette {
  name: string;
  colors: string[];
}

export const CURATED: CuratedPalette[] = [
  { name: 'Oatmeal & Charcoal', colors: ['#d9cdb8', '#4a4846', '#8c7f6f', '#f1ebe0', '#a39886'] },
  { name: 'Nordic Classic', colors: ['#f2ede3', '#b3262e', '#1f2d4b', '#8b8f96', '#d9b46a'] },
  { name: 'Heathered Earth', colors: ['#7a5a3c', '#a9824f', '#5d6b48', '#c9b79c', '#3d3027'] },
  { name: 'Sea Glass', colors: ['#a8cfc6', '#4f8a8b', '#e8ece6', '#2d4f5c', '#c5b9a6'] },
  { name: 'Berry Jewel', colors: ['#6e1f47', '#b0496b', '#2e3a68', '#e2b5c0', '#4c2d55'] },
  { name: 'Soft Pastels', colors: ['#f2c9cf', '#c7d9ef', '#f4e3b5', '#cfe5cf', '#ddd0ea'] },
  { name: 'Autumn Forest', colors: ['#2f4a35', '#b5652b', '#d9a441', '#6b3a2a', '#e7dcc6'] },
  { name: 'Mustard & Navy', colors: ['#d8a530', '#1f2b48', '#ece4d4', '#7a8aa3', '#5a4632'] },
  { name: 'Moody Plum', colors: ['#3b2a3f', '#7b5a7e', '#c7a8b8', '#1e1e24', '#a8885c'] },
  { name: 'Rust & Sage', colors: ['#a64b2a', '#9aa98a', '#efe6d6', '#5b3a29', '#d6b38a'] },
  { name: 'Ocean Depths', colors: ['#16324f', '#2b6c8f', '#7fb3c8', '#e9f0f1', '#c9a227'] },
  { name: 'Candy Pop', colors: ['#ef5b8a', '#ffd166', '#06a77d', '#f7f3ee', '#3a86ff'] },
];
