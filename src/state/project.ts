import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RavPack, RavPattern } from '../api/types';
import { approximateColor, type ColorSource } from '../color/approximate';
import type { YarnTexture } from '../color/colorNames';
import { classifyPattern, type Classification } from '../garments/classify';
import type { GaugeSpec } from '../estimate/gauge';
import { detectStitch, type StitchId } from '../estimate/stitch';
import type { StripeStep } from '../garments/paint';
import type { EaseId, SizeId } from '../garments/sizing';
import type { TemplateId, ZoneId } from '../garments/templates';
import type { Units } from '../units';
import type { YarnInfo } from '../yarn/suggest';
import { weightFromRavelry, type FiberId, type WeightId } from '../yarn/weights';

export type SlotMode = 'own' | 'suggested';
export type PreviewBg = 'ink' | 'paper' | 'cream';

export interface Slot {
  id: string;
  mode: SlotMode;
  hex: string;
  texture: YarnTexture;
  accents: string[];
  source: ColorSource;
  colorway: string;
  yarnName: string;
  yarn?: YarnInfo | null;
  locked: boolean;
}

export interface PatternInfo {
  id: number;
  name: string;
  designer?: string;
  photo?: string;
  url: string;
  sizes?: string;
  yardage?: number | null;
  yardageMax?: number | null;
  weight?: WeightId | null;
  packs: RavPack[];
  gauge?: GaugeSpec | null;
  gaugeNote?: string | null;
  stitch?: StitchId;
}

/** Identifies the size a pattern-yardage entry was made for. */
export const sizeKey = (s: ProjectState['size']) => (s.preset === 'custom' ? `custom:${s.bust}:${s.length ?? ''}` : s.preset);

export interface ProjectState {
  pattern: PatternInfo | null;
  templateId: TemplateId;
  stripes: boolean;
  colorworkYoke: boolean;
  /** Shape detected from the chosen pattern; null without a pattern. */
  detected: Classification | null;
  /** The user unlocked the shape and changed it away from the pattern's. */
  shapeOverride: boolean;
  /** Stitch pattern used for the yarn estimate (defaults to the pattern's). */
  stitch: StitchId;
  /** The knitter's own swatch gauge over 4", overriding the pattern's. */
  swatch: GaugeSpec;
  /** The pattern's stated yardage, entered by the knitter for one size. */
  patternYards: { sizeKey: string; yards: number } | null;
  weight: WeightId;
  fiber: FiberId;
  slots: Slot[];
  activeSlot: number;
  assign: Record<ZoneId, number>;
  stripeSeq: StripeStep[];
  size: { preset: SizeId | 'custom'; bust: number; length?: number; ease: EaseId };
  view: 'front' | 'back';
  seed: number;
  /** Display units only; values stay in inches and yards. */
  units: Units;
  previewBg: PreviewBg;

  setPattern(p: RavPattern | null): void;
  overrideShape(on: boolean): void;
  set(partial: Partial<Pick<ProjectState, 'templateId' | 'stripes' | 'colorworkYoke' | 'weight' | 'fiber' | 'view' | 'seed' | 'activeSlot' | 'stripeSeq' | 'stitch' | 'swatch' | 'patternYards' | 'units' | 'previewBg'>>): void;
  setSize(s: Partial<ProjectState['size']>): void;
  setSlotCount(n: number): void;
  updateSlot(i: number, s: Partial<Slot>): void;
  applyPalette(colors: string[]): void;
  applyCombo(packs: RavPack[]): void;
  assignZone(z: ZoneId, slot: number): void;
}

let uid = 0;
const newId = () => `s${Date.now().toString(36)}${(uid++).toString(36)}`;

export function blankSlot(hex = '#b9ae9c', mode: SlotMode = 'suggested'): Slot {
  return { id: newId(), mode, hex, texture: 'solid', accents: [], source: 'generated', colorway: '', yarnName: '', yarn: null, locked: false };
}

const DEFAULT_COLORS = ['#d6c9b0', '#2f4a35', '#b5652b', '#1f2b48', '#e9be31'];

function defaultAssign(n: number): Record<ZoneId, number> {
  const trim = n > 1 ? 1 : 0;
  return { body: 0, sleeves: 0, yoke: 0, hemRib: trim, cuffs: trim, neckband: trim, buttonBand: trim };
}

function defaultStripes(n: number): StripeStep[] {
  if (n < 2) return [{ slot: 0, rows: 8 }];
  return Array.from({ length: n }, (_, i) => ({ slot: i, rows: i === 0 ? 12 : 4 }));
}

const clampAssign = (a: Record<ZoneId, number>, n: number) =>
  Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Math.min(v, n - 1)])) as Record<ZoneId, number>;

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => ({
      pattern: null,
      templateId: 'raglan',
      stripes: false,
      colorworkYoke: false,
      detected: null,
      shapeOverride: false,
      stitch: 'stockinette',
      swatch: {},
      patternYards: null,
      weight: 'worsted',
      fiber: 'wool',
      slots: DEFAULT_COLORS.slice(0, 2).map((c) => blankSlot(c)),
      activeSlot: 0,
      assign: defaultAssign(2),
      stripeSeq: defaultStripes(2),
      size: { preset: 'M', bust: 38, ease: 'classic' },
      view: 'front',
      seed: 1,
      units: 'imperial',
      previewBg: 'cream',

      setPattern(p) {
        if (!p) return set({ pattern: null, detected: null, shapeOverride: false });
        const c = classifyPattern(p);
        const weight = weightFromRavelry(p.yarn_weight?.name);
        const stitch = detectStitch((p.pattern_attributes ?? []).map((a) => a.permalink), p.name);
        set({
          pattern: {
            id: p.id,
            name: p.name,
            designer: p.designer?.name,
            photo: p.photos?.[0]?.medium_url ?? p.first_photo?.medium_url ?? p.first_photo?.small_url,
            url: `https://www.ravelry.com/patterns/library/${p.permalink}`,
            sizes: p.sizes_available,
            yardage: p.yardage,
            yardageMax: p.yardage_max,
            weight,
            packs: p.packs ?? [],
            gauge: p.gauge ? { sts: p.gauge, rows: p.row_gauge, per: p.gauge_divisor } : null,
            gaugeNote: p.gauge_pattern,
            stitch,
          },
          stitch,
          patternYards: null,
          templateId: c.templateId,
          stripes: c.stripes,
          colorworkYoke: c.colorworkYoke,
          detected: c,
          shapeOverride: false,
          ...(weight ? { weight } : {}),
        });
      },

      set: (partial) => set(partial),

      overrideShape(on) {
        const d = get().detected;
        // Turning the override off restores the pattern's shape and features.
        if (!on && d) set({ shapeOverride: false, templateId: d.templateId, stripes: d.stripes, colorworkYoke: d.colorworkYoke });
        else set({ shapeOverride: on });
      },

      setSize: (s) => set({ size: { ...get().size, ...s } }),

      setSlotCount(n) {
        const { slots, assign, stripeSeq } = get();
        const next = slots.slice(0, n);
        while (next.length < n) next.push(blankSlot(DEFAULT_COLORS[next.length % DEFAULT_COLORS.length]));
        const seq = stripeSeq.filter((s) => s.slot < n);
        set({
          slots: next,
          assign: n > slots.length && slots.length === 1 ? defaultAssign(n) : clampAssign(assign, n),
          stripeSeq: seq.length ? seq : defaultStripes(n),
          activeSlot: Math.min(get().activeSlot, n - 1),
        });
      },

      updateSlot(i, s) {
        set({ slots: get().slots.map((x, j) => (j === i ? { ...x, ...s } : x)) });
      },

      applyPalette(colors) {
        set({
          slots: get().slots.map((s, i) =>
            s.locked || s.mode === 'own' || !colors[i] ? s : { ...s, hex: colors[i], source: 'generated', texture: 'solid', accents: [] },
          ),
        });
      },

      applyCombo(packs) {
        const usable = packs.filter((p) => p.yarn_name || p.yarn?.name).slice(0, 5);
        if (!usable.length) return;
        const slots: Slot[] = usable.map((p) => {
          const colorway = p.colorway ?? '';
          const yarnName = [p.yarn?.yarn_company_name, p.yarn?.name ?? p.yarn_name].filter(Boolean).join(' ');
          const a = approximateColor({ colorwayName: colorway, yarnName });
          return {
            ...blankSlot(a.hex, 'own'),
            colorway,
            yarnName,
            texture: a.texture,
            accents: a.accents,
            source: a.source,
            yarn: { id: p.yarn?.id ?? p.yarn_id ?? undefined, name: p.yarn?.name ?? p.yarn_name ?? '', company: p.yarn?.yarn_company_name, weight: weightFromRavelry(p.yarn_weight?.name) },
          };
        });
        const w = weightFromRavelry(usable[0].yarn_weight?.name);
        set({
          slots,
          assign: defaultAssign(slots.length),
          stripeSeq: defaultStripes(slots.length),
          activeSlot: 0,
          ...(w ? { weight: w } : {}),
        });
      },

      assignZone(z, slot) {
        set({ assign: { ...get().assign, [z]: slot } });
      },
    }),
    {
      name: 'yarn-visualizer-project',
      version: 4,
      migrate: (state, version) => {
        const s = state as ProjectState;
        // v1 had no stored detection: treat an existing pattern's shape as unconfirmed.
        const v2 = version < 2 ? { detected: null, shapeOverride: false } : {};
        return { ...s, ...v2, stitch: s.stitch ?? 'stockinette', swatch: s.swatch ?? {}, patternYards: s.patternYards ?? null,
          // v4 added display units and the preview background.
          units: s.units ?? 'imperial', previewBg: s.previewBg ?? 'cream' };
      },
      partialize: (s) => ({
        pattern: s.pattern, templateId: s.templateId, stripes: s.stripes, colorworkYoke: s.colorworkYoke,
        detected: s.detected, shapeOverride: s.shapeOverride, stitch: s.stitch, swatch: s.swatch, patternYards: s.patternYards,
        weight: s.weight, fiber: s.fiber, slots: s.slots, assign: s.assign, stripeSeq: s.stripeSeq,
        size: s.size, view: s.view, seed: s.seed, units: s.units, previewBg: s.previewBg,
      }),
    },
  ),
);
