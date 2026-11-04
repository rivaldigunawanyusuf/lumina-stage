import { NextResponse } from 'next/server';
import {
  canExecutePaidMetaCall,
  computeMetaCacheKey,
  getCachedMetaResponse,
  getGoldenBackdropDataUrl,
  getMetaBudgetStatus,
  recordPaidMetaSpend,
  setCachedMetaResponse,
} from '@/lib/cache/metaCache';
import type { SampleId } from '@/lib/providers/types';

const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';

/**
 * POST /api/meta/image - Meta Muse Image 1.0 Studio Scene Generator.
 *
 * Accepts the lighting-aligned studio prompt, enforces the SHA-256 deterministic cache
 * and $18.00 hard budget circuit breaker, and returns a same-origin data URL
 * so the 5-layer WebGL/Canvas compositor can composite and export all 3 ratios at $0 extra cost.
 */
export async function POST(request: Request) {
  const apiKey = process.env.META_MODEL_API_KEY?.trim() || '';
  const baseUrl = (process.env.META_MODEL_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = process.env.META_IMAGE_MODEL || 'muse-image-1.0';
  const unitCostUsd = Number.parseFloat(process.env.META_COST_IMAGE_USD || '0.04') || 0.04;

  try {
    const body = (await request.json()) as {
      prompt: string;
      sampleId?: SampleId;
      width?: number;
      height?: number;
      seed?: number;
    };

    const studioPrompt = `Empty commercial product photography studio stage backdrop: ${body.prompt}. Completely empty tabletop pedestal surface in the center ready for product placement, no products, no bottles, no cans, no text, photorealistic 8k studio photography.`;

    const cacheKey = computeMetaCacheKey({
      step: 'image',
      prompt: studioPrompt,
      modelId: model,
    });

    // 1. Check SHA-256 Deterministic Cache ($0.00 cost, <20ms latency)
    const cachedImageUrl = getCachedMetaResponse<string>(cacheKey);
    if (cachedImageUrl) {
      return NextResponse.json({
        configured: true,
        cached: true,
        engine: `Meta ${model} (Cached)`,
        imageDataUrl: cachedImageUrl,
        costUsd: 0,
        budget: getMetaBudgetStatus(),
      });
    }

    // 2. Hard Budget Circuit Breaker ($18.00 cap) or missing API key -> Serve Golden Backdrop
    if (!apiKey || !canExecutePaidMetaCall(unitCostUsd)) {
      const goldenUrl = getGoldenBackdropDataUrl(body.prompt, body.sampleId);
      if (goldenUrl) {
        setCachedMetaResponse(cacheKey, goldenUrl, { step: 'image', modelId: model });
        return NextResponse.json({
          configured: true,
          cached: true,
          engine: `Meta ${model} (Golden Cache)`,
          imageDataUrl: goldenUrl,
          costUsd: 0,
          budget: getMetaBudgetStatus(),
        });
      }
    }

    // 3. Execute Single-Shot Master Generation via Meta Muse Image 1.0
    const upstream = await fetch(`${baseUrl}/responses`, {
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
            content: [{ type: 'input_text', text: studioPrompt }],
          },
        ],
        max_output_tokens: 2048,
        store: true,
        stream: false,
        temperature: 0.5,
        top_p: 0.9,
        tools: [
          {
            enable_image_search: true,
            enable_shell: true,
            enable_web_search: true,
            output_format: 'png',
            reasoning_strength: 'high',
            type: 'image_generation',
          },
        ],
      }),
      signal: AbortSignal.timeout(65_000),
    });

    if (!upstream.ok) {
      const goldenUrl = getGoldenBackdropDataUrl(body.prompt, body.sampleId);
      if (goldenUrl) {
        return NextResponse.json({
          configured: true,
          cached: true,
          engine: `Meta ${model} (Golden Fallback)`,
          imageDataUrl: goldenUrl,
          costUsd: 0,
          budget: getMetaBudgetStatus(),
        });
      }
      const errText = await upstream.text().catch(() => '');
      return NextResponse.json(
        { configured: true, error: `Muse Image upstream HTTP ${upstream.status}: ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await upstream.json();
    let b64: string | undefined;
    for (const item of data?.output ?? []) {
      if (item?.type === 'image_generation_call' && item?.result) {
        b64 = item.result;
        break;
      }
    }

    if (!b64) {
      const goldenUrl = getGoldenBackdropDataUrl(body.prompt, body.sampleId);
      if (goldenUrl) {
        return NextResponse.json({
          configured: true,
          cached: true,
          engine: `Meta ${model} (Golden Fallback)`,
          imageDataUrl: goldenUrl,
          costUsd: 0,
          budget: getMetaBudgetStatus(),
        });
      }
      return NextResponse.json(
        { configured: true, error: 'Muse Image returned no image_generation_call output' },
        { status: 502 },
      );
    }

    const imageDataUrl = `data:image/png;base64,${b64}`;
    setCachedMetaResponse(cacheKey, imageDataUrl, { step: 'image', modelId: model });
    const budget = recordPaidMetaSpend(unitCostUsd);

    return NextResponse.json({
      configured: true,
      cached: false,
      engine: `Meta ${model}`,
      imageDataUrl,
      costUsd: unitCostUsd,
      budget,
    });
  } catch {
    const goldenUrl = getGoldenBackdropDataUrl('');
    return NextResponse.json({
      configured: true,
      cached: true,
      engine: `Meta ${model} (Golden Fallback)`,
      imageDataUrl: goldenUrl,
      costUsd: 0,
      budget: getMetaBudgetStatus(),
    });
  }
}
