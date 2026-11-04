/**
 * MOCK_OFFLINE adapter - $0, no network.
 * Built-in fictional-brand samples return exact vector-derived masks and a
 * hand-authored Art Director payload. User uploads in this mode fall back to
 * the offline heuristics (colour-key segmentation + luminance analyzer).
 */
import type { ArtDirectorAnalysis, HierarchicalMasks } from '@/types/lumina';
import { renderSample } from '@/lib/samples/renderers';
import { MOCK_ANALYSES } from '@/lib/samples/mockAnalyses';
import { renderBackdrop, styleFromPrompt } from '@/lib/samples/backdrops';
import { sleep } from '@/lib/imaging/canvas';
import { segmentOffline } from './freeMasking';
import { analyzeHeuristic } from './freeArtDirector';
import type { LuminaProviderAdapter, PipelineInput, SampleId, SceneRequest, StepOutput } from './types';

const sampleCache = new Map<SampleId, HierarchicalMasks>();

export function getSampleMasks(id: SampleId): HierarchicalMasks {
  const cached = sampleCache.get(id);
  if (cached) return cached;
  const r = renderSample(id);
  const masks: HierarchicalMasks = {
    originalImageUrl: r.original.toDataURL('image/png'),
    productSilhouetteMaskUrl: r.silhouette.toDataURL('image/png'),
    brandSafeZoneMaskUrl: r.brandSafe.toDataURL('image/png'),
    boundingBox: r.boundingBox,
  };
  sampleCache.set(id, masks);
  return masks;
}

const jitter = (min: number, max: number) => sleep(min + Math.random() * (max - min));

export const mockOfflineAdapter: LuminaProviderAdapter = {
  mode: 'MOCK_OFFLINE',
  label: 'Mock · Offline',

  async segment(input: PipelineInput): Promise<StepOutput<HierarchicalMasks>> {
    if (input.sampleId) {
      await jitter(35, 75);
      return { data: getSampleMasks(input.sampleId), engine: 'Vector ground-truth masks', fallback: false, costUsd: 0 };
    }
    const out = await segmentOffline(input.imageUrl);
    return { ...out, note: 'Upload in MOCK mode → offline colour-key segmentation' };
  },

  async analyze(input: PipelineInput, masks: HierarchicalMasks): Promise<StepOutput<ArtDirectorAnalysis>> {
    if (input.sampleId) {
      await jitter(35, 75);
      return {
        data: structuredClone(MOCK_ANALYSES[input.sampleId]),
        engine: 'Mock Muse Spark payload',
        fallback: false,
        costUsd: 0,
      };
    }
    const data = await analyzeHeuristic(masks);
    return { data, engine: 'Luminance Gradient Analyzer', fallback: false, costUsd: 0 };
  },

  async generateScene(req: SceneRequest): Promise<StepOutput<string>> {
    await jitter(45, 90);
    const style = styleFromPrompt(req.prompt, req.presetId);

    // If running in browser, load the authentic high-resolution studio cyclorama backdrop
    if (typeof window !== 'undefined') {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/showcase/studio_cyclorama_backdrop.png';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
        });
        const c = document.createElement('canvas');
        c.width = 1600;
        c.height = 1600;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 1600, 1600);
          return {
            data: c.toDataURL('image/jpeg', 0.94),
            engine: 'Studio Cyclorama Backdrop',
            fallback: false,
            costUsd: 0,
          };
        }
      } catch {
        // Fall back to lighting-baked procedural backdrop
      }
    }

    const canvas = renderBackdrop(style, req.analysis.lightingVector, 1600, 1600, req.seed);
    return {
      data: canvas.toDataURL('image/jpeg', 0.92),
      engine: `Studio Backdrop · ${style}`,
      fallback: false,
      costUsd: 0,
    };
  },
};
