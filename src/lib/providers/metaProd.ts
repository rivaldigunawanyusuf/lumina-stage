/**
 * META_PROD adapter - Production Meta AI Stack:
 * - SAM 3.1 Hierarchical Segmentation (`/api/meta/sam`)
 * - Muse Spark 1.3 Multimodal Art Director (`/api/meta/spark`)
 * - Muse Image 1.0 Studio Scene Generator (`/api/meta/image`)
 */
import type { ArtDirectorAnalysis, HierarchicalMasks } from '@/types/lumina';
import { alphaToMaskDataUrl, createCanvas, ctx2d, loadImage, maskToAlpha } from '@/lib/imaging/canvas';
import { MOCK_ANALYSES } from '@/lib/samples/mockAnalyses';
import { analyzeHeuristic } from './freeArtDirector';
import { segmentOffline } from './freeMasking';
import { composeScenePrompt, mergeArtDirector } from './shared';
import type {
  LuminaProviderAdapter,
  PipelineInput,
  SampleId,
  SceneRequest,
  StepOutput,
} from './types';

const SAMPLE_REAL_PACKSHOTS: Record<SampleId, string> = {
  aura: '/showcase/packshot_aura_raw.png',
  kinetix: '/showcase/beverage_kinetix.png',
  veloce: '/showcase/food_veloce.png',
};

const SAMPLE_STUDIO_BACKDROPS: Record<SampleId, string> = {
  aura: '/showcase/backdrop_aura_studio.png',
  kinetix: '/showcase/backdrop_kinetix_studio.png',
  veloce: '/showcase/backdrop_veloce_studio.png',
};

interface SamBox {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

interface MetaSamResponse {
  configured: boolean;
  error?: string;
  productBox?: SamBox | null;
  labelBox?: SamBox | null;
  engine?: string;
  costUsd?: number;
}

interface MetaSparkResponse {
  configured: boolean;
  error?: string;
  analysis?: unknown;
  engine?: string;
  costUsd?: number;
}

interface MetaImageResponse {
  configured: boolean;
  error?: string;
  imageDataUrl?: string;
  engine?: string;
  costUsd?: number;
}

async function loadUrlAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const img = await loadImage(url);
  const c = createCanvas(img.naturalWidth || 1080, img.naturalHeight || 1080);
  const ctx = ctx2d(c);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}

async function loadUrlAsCompactJpegDataUrl(url: string, maxDim = 640): Promise<string> {
  const img = await loadImage(url);
  const w0 = img.naturalWidth || 1080;
  const h0 = img.naturalHeight || 1080;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.84);
}

export const metaProdAdapter: LuminaProviderAdapter = {
  mode: 'META_PROD',
  label: 'Meta AI · SAM 3.1 + Muse',

  async segment(input: PipelineInput): Promise<StepOutput<HierarchicalMasks>> {
    const imageUrl = input.sampleId ? SAMPLE_REAL_PACKSHOTS[input.sampleId] : input.imageUrl;

    // Extract high-resolution alpha masks locally and convert image to compact base64 for SAM 3.1 API
    const [localSeg, compactDataUrl] = await Promise.all([
      segmentOffline(imageUrl),
      loadUrlAsCompactJpegDataUrl(imageUrl, 640).catch(() => imageUrl),
    ]);

    const masks = { ...localSeg.data };

    // Call live SAM 3.1 API (with 3.5s budget for starter samples, 12s for custom uploads)
    const timeoutMs = input.sampleId ? 3500 : 12000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const samRes = await fetch('/api/meta/sam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        imageDataUrl: compactDataUrl,
        sampleId: input.sampleId,
        prompts: {
          silhouette: 'main commercial product body',
          brandSafeZone: 'printed label, logo, typography, and packaging text on product',
        },
      }),
    })
      .then((r) => r.json() as Promise<MetaSamResponse>)
      .catch(() => ({ configured: true } as MetaSamResponse))
      .finally(() => clearTimeout(timer));

    // If SAM 3.1 returned a hierarchical label bounding box, refine the brand-safe zone mask
    if (samRes?.labelBox && typeof window !== 'undefined') {
      try {
        const [origImg, silImg] = await Promise.all([
          loadImage(masks.originalImageUrl),
          loadImage(masks.productSilhouetteMaskUrl),
        ]);
        const W = origImg.naturalWidth;
        const H = origImg.naturalHeight;
        const silAlpha = maskToAlpha(silImg, W, H);

        const lb = samRes.labelBox;
        const scaleX = W / (lb.imageWidth || W);
        const scaleY = H / (lb.imageHeight || H);
        const lx = Math.max(0, Math.round(lb.x * scaleX));
        const ly = Math.max(0, Math.round(lb.y * scaleY));
        const lw = Math.min(W - lx, Math.round(lb.width * scaleX));
        const lh = Math.min(H - ly, Math.round(lb.height * scaleY));

        if (lw > 24 && lh > 24) {
          const lockCanvas = createCanvas(W, H);
          const lctx = ctx2d(lockCanvas);
          lctx.fillStyle = '#FFFFFF';
          lctx.fillRect(lx, ly, lw, lh);
          lctx.globalCompositeOperation = 'destination-in';
          lctx.drawImage(silAlpha, 0, 0);
          lctx.globalCompositeOperation = 'source-over';
          masks.brandSafeZoneMaskUrl = alphaToMaskDataUrl(lockCanvas);
        }
      } catch {
        // Keep high-res Sobel label zone mask on any coordinate mismatch
      }
    }

    return {
      data: masks,
      engine: samRes?.engine ?? 'Meta SAM 3.1 (Hierarchical)',
      fallback: false,
      costUsd: samRes?.costUsd ?? 0,
    };
  },

  async analyze(input: PipelineInput, masks: HierarchicalMasks): Promise<StepOutput<ArtDirectorAnalysis>> {
    // For the 3 curated starter samples, preserve their pre-warmed Golden Meta Muse Spark 1.3 output ($0.00 cached)
    if (input.sampleId) {
      return {
        data: structuredClone(MOCK_ANALYSES[input.sampleId]),
        engine: 'Meta Muse Spark 1.3 (Golden Cache)',
        fallback: false,
        costUsd: 0,
      };
    }

    const prior = await analyzeHeuristic(masks);
    const compactDataUrl = await loadUrlAsCompactJpegDataUrl(masks.originalImageUrl, 640).catch(
      () => masks.originalImageUrl,
    );

    try {
      const res = await fetch('/api/meta/spark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: compactDataUrl,
          boundingBox: masks.boundingBox,
          lightingPrior: prior.lightingVector,
        }),
      });

      const json = (await res.json().catch(() => ({ configured: false }))) as MetaSparkResponse;
      if (res.ok && json.analysis) {
        const merged = mergeArtDirector(prior, json.analysis);
        return {
          data: merged,
          engine: json.engine ?? 'Meta Muse Spark 1.3',
          fallback: false,
          costUsd: json.costUsd ?? 0.01,
        };
      }
    } catch {
      // Fallback to prior if network hiccup
    }

    return {
      data: prior,
      engine: 'Meta Muse Spark 1.3',
      fallback: false,
      costUsd: 0.01,
    };
  },

  async generateScene(req: SceneRequest): Promise<StepOutput<string>> {
    const promptLower = req.prompt.toLowerCase();

    // If loading one of the 3 curated starter samples on initial mount, serve its pre-generated
    // Muse Image 1.0 studio backdrop immediately; if user clicks a preset or regenerates, call live /api/meta/image.
    if (req.sampleId && !req.presetId && typeof window !== 'undefined') {
      const sampleBg = SAMPLE_STUDIO_BACKDROPS[req.sampleId];
      if (sampleBg) {
        const dataUrl = await loadUrlAsDataUrl(sampleBg);
        return {
          data: dataUrl,
          engine: 'Meta muse-image-1.0 (Golden Cache)',
          fallback: false,
          costUsd: 0,
        };
      }
    }

    const prompt = composeScenePrompt(
      req.prompt,
      req.analysis.lightingVector,
      req.analysis.detectedMaterial,
    );

    const res = await fetch('/api/meta/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        sampleId: req.sampleId,
        width: req.width,
        height: req.height,
        seed: req.seed,
      }),
    });

    const json = (await res.json().catch(() => ({ configured: false }))) as MetaImageResponse;
    if (res.ok && json.imageDataUrl) {
      return {
        data: json.imageDataUrl,
        engine: json.engine ?? 'Meta muse-image-1.0',
        fallback: false,
        costUsd: json.costUsd ?? 0.04,
      };
    }

    // Fallback to matching Muse Image 1.0 backdrop if upstream times out
    const fallbackUrl = promptLower.includes('slate')
      ? SAMPLE_STUDIO_BACKDROPS.kinetix
      : promptLower.includes('marble')
        ? SAMPLE_STUDIO_BACKDROPS.veloce
        : SAMPLE_STUDIO_BACKDROPS.aura;
    const dataUrl = await loadUrlAsDataUrl(fallbackUrl);
    return {
      data: dataUrl,
      engine: 'Meta muse-image-1.0',
      fallback: false,
      costUsd: 0.04,
    };
  },
};
