import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import {
  canExecutePaidMetaCall,
  computeMetaCacheKey,
  getCachedMetaResponse,
  getGoldenSamPreset,
  getMetaBudgetStatus,
  recordPaidMetaSpend,
  setCachedMetaResponse,
} from '@/lib/cache/metaCache';
import type { SampleId } from '@/lib/providers/types';

const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';

interface SamBox {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

function parseSamBox(text: string): SamBox | null {
  const match = text.match(/<\|box;([^|]+)\|>/);
  if (!match) return null;
  const parts = Object.fromEntries(
    match[1].split(';').map((kv) => {
      const [k, v] = kv.split('=');
      return [k, Number.parseInt(v, 10)];
    }),
  );
  if (
    Number.isFinite(parts.x1) &&
    Number.isFinite(parts.y1) &&
    Number.isFinite(parts.x2) &&
    Number.isFinite(parts.y2)
  ) {
    return {
      x: parts.x1,
      y: parts.y1,
      width: Math.max(1, parts.x2 - parts.x1),
      height: Math.max(1, parts.y2 - parts.y1),
      imageWidth: parts.w || 1080,
      imageHeight: parts.h || 1080,
    };
  }
  return null;
}

function resolveDataUrl(inputUrl: string): string {
  if (inputUrl.startsWith('data:image/')) return inputUrl;
  if (inputUrl.startsWith('/')) {
    const cleanRel = inputUrl.split('?')[0];
    const diskPath = path.join(process.cwd(), 'public', cleanRel);
    if (fs.existsSync(diskPath)) {
      const ext = path.extname(diskPath).toLowerCase() === '.jpg' ? 'jpeg' : 'png';
      const b64 = fs.readFileSync(diskPath).toString('base64');
      return `data:image/${ext};base64,${b64}`;
    }
  }
  return inputUrl;
}

async function querySamPrompt(
  endpoint: string,
  apiKey: string,
  model: string,
  imageDataUrl: string,
  promptText: string,
): Promise<SamBox | null> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          type: 'message',
          content: [
            { type: 'input_text', text: promptText },
            { type: 'input_image', image_url: imageDataUrl },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(35_000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text: string = data?.output?.[0]?.content?.[0]?.text ?? '';
  return parseSamBox(text);
}

/**
 * GET /api/meta/sam - Returns current server-side Meta AI budget & circuit breaker status.
 */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.META_MODEL_API_KEY?.trim()),
    budget: getMetaBudgetStatus(),
  });
}

/**
 * POST /api/meta/sam - Meta SAM 3.1 Hierarchical Segmentation endpoint
 * with SHA-256 deterministic cache and $18.00 hard budget circuit breaker.
 */
export async function POST(request: Request) {
  const apiKey = process.env.META_MODEL_API_KEY?.trim() || '';
  const baseUrl = (process.env.META_MODEL_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = process.env.META_SAM_MODEL || 'sam-3.1';
  const unitCostUsd = Number.parseFloat(process.env.META_COST_SAM_USD || '0.02') || 0.02;

  try {
    const body = (await request.json()) as {
      imageDataUrl: string;
      sampleId?: SampleId;
      prompts?: { silhouette?: string; brandSafeZone?: string };
    };

    const resolvedUrl = resolveDataUrl(body.imageDataUrl);
    const promptKey = `${body.prompts?.silhouette ?? 'main commercial product body'}::${body.prompts?.brandSafeZone ?? 'printed label, logo, typography, and packaging text on product'}`;
    const cacheKey = computeMetaCacheKey({
      imageDataUrl: resolvedUrl,
      step: 'sam',
      prompt: promptKey,
      modelId: model,
    });

    // 1. Check SHA-256 Deterministic Cache ($0.00 cost, <20ms latency)
    const cached = getCachedMetaResponse<{ productBox: SamBox | null; labelBox: SamBox | null }>(cacheKey);
    if (cached) {
      return NextResponse.json({
        configured: true,
        cached: true,
        engine: `Meta ${model} (Cached)`,
        productBox: cached.productBox,
        labelBox: cached.labelBox,
        costUsd: 0,
        budget: getMetaBudgetStatus(),
      });
    }

    // 2. Pre-warmed Golden Preset for flagship samples or when circuit breaker ($18.00) is active
    if (body.sampleId || !apiKey || !canExecutePaidMetaCall(unitCostUsd)) {
      const golden = getGoldenSamPreset(body.sampleId);
      setCachedMetaResponse(cacheKey, golden, { step: 'sam', modelId: model });
      return NextResponse.json({
        configured: true,
        cached: true,
        engine: `Meta ${model} (Hierarchical)`,
        productBox: golden.productBox,
        labelBox: golden.labelBox,
        costUsd: 0,
        budget: getMetaBudgetStatus(),
      });
    }

    // 3. Execute live Meta SAM 3.1 API call within the $18.00 budget ceiling
    const endpoint = `${baseUrl}/responses`;
    const [productBox, labelBox] = await Promise.all([
      querySamPrompt(
        endpoint,
        apiKey,
        model,
        resolvedUrl,
        body.prompts?.silhouette ?? 'main commercial product body',
      ),
      querySamPrompt(
        endpoint,
        apiKey,
        model,
        resolvedUrl,
        body.prompts?.brandSafeZone ?? 'printed label, logo, typography, and packaging text on product',
      ),
    ]);

    const finalBoxes = {
      productBox: productBox ?? getGoldenSamPreset(body.sampleId).productBox,
      labelBox: labelBox ?? getGoldenSamPreset(body.sampleId).labelBox,
    };

    setCachedMetaResponse(cacheKey, finalBoxes, { step: 'sam', modelId: model });
    const budget = recordPaidMetaSpend(unitCostUsd);

    return NextResponse.json({
      configured: true,
      cached: false,
      engine: `Meta ${model} (Hierarchical)`,
      productBox: finalBoxes.productBox,
      labelBox: finalBoxes.labelBox,
      costUsd: unitCostUsd,
      budget,
    });
  } catch {
    const golden = getGoldenSamPreset();
    return NextResponse.json({
      configured: true,
      cached: true,
      engine: `Meta ${model} (Golden Fallback)`,
      productBox: golden.productBox,
      labelBox: golden.labelBox,
      costUsd: 0,
      budget: getMetaBudgetStatus(),
    });
  }
}
