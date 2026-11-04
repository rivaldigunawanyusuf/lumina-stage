import type { ArtDirectorAnalysis } from '@/types/lumina';
import type { SampleId } from '@/lib/providers/types';

export interface SampleMeta {
  id: SampleId;
  brand: string;
  product: string;
  tagline: string;
  swatch: string;
}

export const SAMPLE_CATALOG: SampleMeta[] = [
  { id: 'aura', brand: 'Botanical Serum', product: 'Dropper Bottle', tagline: 'Original photo → Warm stone table', swatch: '#B8661C' },
  { id: 'kinetix', brand: 'Nitro Cold Brew', product: 'Beverage Can', tagline: 'Original photo → Dark stone surface', swatch: '#1C2744' },
  { id: 'veloce', brand: 'Wildflower Honey', product: 'Hexagonal Jar', tagline: 'Original photo → White marble counter', swatch: '#DE9420' },
];

export const STUDIO_PRESETS = {
  linen: {
    id: 'linen-sweep',
    title: 'Warm Travertine Sun',
    prompt:
      'Warm beige travertine stone pedestal block, soft botanical leaf shadows on sunlit plaster wall, natural morning window key light, empty tabletop surface, photorealistic, no products, no text',
  },
  marble: {
    id: 'marble-podium',
    title: 'Carrara Marble Counter',
    prompt:
      'Bright Carrara marble countertop against a soft cream plaster wall, gentle morning light, minimal luxury kitchen, empty surface, photorealistic product photography backdrop, no products, no text',
  },
  slate: {
    id: 'slate-night',
    title: 'Dark Slate Cold Mist',
    prompt:
      'Dark slate stone surface with subtle wet reflections, moody charcoal backdrop, coloured rim light glow and soft bokeh, energetic beverage commercial, empty surface, photorealistic, no products, no text',
  },
} as const;

const PRESET_LIST = [STUDIO_PRESETS.linen, STUDIO_PRESETS.marble, STUDIO_PRESETS.slate].map((p) => ({
  id: p.id,
  title: p.title,
  prompt: p.prompt,
}));

/** Curated Art Director payloads paired with the 3 starter samples. */
export const MOCK_ANALYSES: Record<SampleId, ArtDirectorAnalysis> = {
  aura: {
    productCategory: 'Skincare · Botanical Serum',
    detectedMaterial: 'Amber borosilicate glass, cream paper label, matte black dropper cap',
    lightingVector: { azimuthDegrees: 140, elevationDegrees: 48, intensity: 0.82, warmthHex: '#FFE6C4' },
    spatialScenePrompt: STUDIO_PRESETS.linen.prompt,
    suggestedPresets: PRESET_LIST,
    adCopy: {
      headline: 'Glow, Botanically.',
      subheadline: 'Botanical facial serum for overnight radiance.',
      ctaText: 'Shop the Ritual',
      accentColorHex: '#4F7A55',
    },
  },
  kinetix: {
    productCategory: 'Beverage · Nitro Cold Brew',
    detectedMaterial: 'Matte navy aluminium can, crisp white and orange typography',
    lightingVector: { azimuthDegrees: 38, elevationDegrees: 34, intensity: 0.9, warmthHex: '#D6E4FF' },
    spatialScenePrompt: STUDIO_PRESETS.slate.prompt,
    suggestedPresets: [PRESET_LIST[2], PRESET_LIST[1], PRESET_LIST[0]],
    adCopy: {
      headline: 'Cold Brew. Full Throttle.',
      subheadline: 'Smooth nitrogen-infused cold brew coffee.',
      ctaText: 'Order Now',
      accentColorHex: '#FF6A2B',
    },
  },
  veloce: {
    productCategory: 'Culinary · Wildflower Honey',
    detectedMaterial: 'Clear hexagonal glass jar, raw golden honey, cream paper label, matte black lid',
    lightingVector: { azimuthDegrees: 150, elevationDegrees: 56, intensity: 0.76, warmthHex: '#FFD9A0' },
    spatialScenePrompt: STUDIO_PRESETS.marble.prompt,
    suggestedPresets: [PRESET_LIST[1], PRESET_LIST[0], PRESET_LIST[2]],
    adCopy: {
      headline: 'Liquid Gold, Raw.',
      subheadline: 'Small-batch wildflower honey harvested by hand.',
      ctaText: 'Order Fresh',
      accentColorHex: '#B8741A',
    },
  },
};
