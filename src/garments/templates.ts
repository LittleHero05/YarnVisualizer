export type Construction = 'raglan' | 'yoke' | 'drop';
export type TemplateId = 'raglan' | 'yoke' | 'drop' | 'cardigan';
export type ZoneId = 'body' | 'sleeves' | 'yoke' | 'hemRib' | 'cuffs' | 'neckband' | 'buttonBand';

export interface GarmentTemplate {
  id: TemplateId;
  name: string;
  construction: Construction;
  cardigan: boolean;
  blurb: string;
}

export const TEMPLATES: GarmentTemplate[] = [
  { id: 'raglan', name: 'Raglan pullover', construction: 'raglan', cardigan: false, blurb: 'Diagonal seams from underarm to neck' },
  { id: 'yoke', name: 'Round-yoke pullover', construction: 'yoke', cardigan: false, blurb: 'Circular yoke, often with colorwork' },
  { id: 'drop', name: 'Drop-shoulder sweater', construction: 'drop', cardigan: false, blurb: 'Boxy body, sleeves set below the shoulder' },
  { id: 'cardigan', name: 'Raglan cardigan', construction: 'raglan', cardigan: true, blurb: 'Open front with a button band' },
];

export const ZONE_LABELS: Record<ZoneId, string> = {
  body: 'Body',
  sleeves: 'Sleeves',
  yoke: 'Yoke',
  hemRib: 'Hem ribbing',
  cuffs: 'Cuffs',
  neckband: 'Neckband',
  buttonBand: 'Button band',
};

export function templateById(id: TemplateId): GarmentTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function zonesFor(t: GarmentTemplate): ZoneId[] {
  const z: ZoneId[] = ['body', 'sleeves'];
  if (t.construction === 'yoke') z.push('yoke');
  z.push('hemRib', 'cuffs', 'neckband');
  if (t.cardigan) z.push('buttonBand');
  return z;
}
