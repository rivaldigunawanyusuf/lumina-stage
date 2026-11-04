import type { ProviderMode } from '@/types/lumina';
import { metaProdAdapter } from './metaProd';
import type { LuminaProviderAdapter } from './types';

export const PROVIDERS: Record<ProviderMode, LuminaProviderAdapter> = {
  MOCK_OFFLINE: metaProdAdapter,
  FREE_DEV: metaProdAdapter,
  META_PROD: metaProdAdapter,
};

export function getProvider(mode: ProviderMode): LuminaProviderAdapter {
  return PROVIDERS[mode] ?? metaProdAdapter;
}

export interface ProviderMeta {
  mode: ProviderMode;
  shortLabel: string;
  badge: string;
  costLabel: string;
  description: string;
  stackSummary: string;
}

export const PROVIDER_META: Record<ProviderMode, ProviderMeta> = {
  MOCK_OFFLINE: {
    mode: 'META_PROD',
    shortLabel: 'Meta AI · Live',
    badge: 'SAM 3.1 + Muse',
    costLabel: 'Live API',
    description:
      'Production Meta AI stack: SAM 3.1 hierarchical segmentation, Muse Spark 1.3 multimodal art direction, and Muse Image 1.0 studio generation.',
    stackSummary: 'SAM 3.1 Hierarchical · Muse Spark 1.3 · Muse Image 1.0 · WebGL Compositor',
  },
  FREE_DEV: {
    mode: 'META_PROD',
    shortLabel: 'Meta AI · Live',
    badge: 'SAM 3.1 + Muse',
    costLabel: 'Live API',
    description:
      'Production Meta AI stack: SAM 3.1 hierarchical segmentation, Muse Spark 1.3 multimodal art direction, and Muse Image 1.0 studio generation.',
    stackSummary: 'SAM 3.1 Hierarchical · Muse Spark 1.3 · Muse Image 1.0 · WebGL Compositor',
  },
  META_PROD: {
    mode: 'META_PROD',
    shortLabel: 'Meta AI · Live',
    badge: 'SAM 3.1 + Muse',
    costLabel: 'Live API',
    description:
      'Production Meta AI stack: SAM 3.1 hierarchical segmentation, Muse Spark 1.3 multimodal art direction, and Muse Image 1.0 studio generation.',
    stackSummary: 'SAM 3.1 Hierarchical · Muse Spark 1.3 · Muse Image 1.0 · WebGL Compositor',
  },
};
