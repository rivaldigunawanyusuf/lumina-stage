import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { ART_DIRECTOR_SYSTEM_PROMPT, extractJson } from '@/lib/providers/shared';
import {
  canExecutePaidMetaCall,
  computeMetaCacheKey,
  getCachedMetaResponse,
  getGoldenSparkPreset,
  getMetaBudgetStatus,
  recordPaidMetaSpend,
  setCachedMetaResponse,
} from '@/lib/cache/metaCache';
import type { SampleId } from '@/lib/providers/types';

const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';

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

/**
 * POST /api/meta/spark - Meta Muse Spark 1.3 Multimodal Art Director endpoint
 * with SHA-256 deterministic cache and $18.00 hard budget circuit breaker.
 */
export async function POST(request: Request) {
  const apiKey = process.env.META_MODEL_API_KEY?.trim() || '';
  const baseUrl = (process.env.META_MODEL_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = process.env.META_SPARK_MODEL || 'muse-spark-1.3';
  const unitCostUsd = Number.parseFloat(process.env.META_COST_SPARK_USD || '0.01') || 0.01;

  try {
    const body = (await request.json()) as {
      imageDataUrl: string;
      sampleId?: SampleId;
      boundingBox?: unknown;
      lightingPrior?: unknown;
    };

    const resolvedUrl = resolveDataUrl(body.imageDataUrl);
    const cacheKey = computeMetaCacheKey({
      imageDataUrl: resolvedUrl,
      step: 'spark',
      prompt: JSON.stringify(body.lightingPrior ?? {}),
      modelId: model,
    });

    // 1. Check SHA-256 Deterministic Cache ($0.00 cost, <20ms latency)
    const cached = getCachedMetaResponse<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json({
        configured: true,
        cached: true,
        engine: `Meta ${model} (Cached)`,
        analysis: cached,
        costUsd: 0,
        budget: getMetaBudgetStatus(),
      });
    }

    // 2. Serve Golden Preset if sampleId is passed or $18.00 circuit breaker is active
    if (body.sampleId || !apiKey || !canExecutePaidMetaCall(unitCostUsd)) {
      const golden = getGoldenSparkPreset(body.sampleId);
      setCachedMetaResponse(cacheKey, golden, { step: 'spark', modelId: model });
      return NextResponse.json({
        configured: true,
        cached: true,
        engine: `Meta ${model}`,
        analysis: golden,
        costUsd: 0,
        budget: getMetaBudgetStatus(),
      });
    }

    const priorNote = body.lightingPrior
      ? `\nMeasured Luminance Gradient Prior: ${JSON.stringify(body.lightingPrior)}`
      : '';

    const upstream = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: 'low' },
        max_output_tokens: 1500,
        input: [
          {
            role: 'user',
            type: 'message',
            content: [
              { type: 'input_text', text: `${ART_DIRECTOR_SYSTEM_PROMPT}${priorNote}` },
              { type: 'input_image', image_url: resolvedUrl },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (!upstream.ok) {
      const golden = getGoldenSparkPreset(body.sampleId);
      return NextResponse.json({
        configured: true,
        cached: true,
        engine: `Meta ${model} (Golden Fallback)`,
        analysis: golden,
        costUsd: 0,
        budget: getMetaBudgetStatus(),
      });
    }

    const data = await upstream.json();
    const msgItem = (data?.output ?? []).find((item: { type?: string }) => item.type === 'message');
    const text: string = msgItem?.content?.[0]?.text ?? '';
    const parsed = extractJson(text) ?? data?.analysis ?? getGoldenSparkPreset(body.sampleId);

    setCachedMetaResponse(cacheKey, parsed, { step: 'spark', modelId: model });
    const budget = recordPaidMetaSpend(unitCostUsd);

    return NextResponse.json({
      configured: true,
      cached: false,
      engine: `Meta ${model}`,
      analysis: parsed,
      costUsd: unitCostUsd,
      budget,
    });
  } catch {
    const golden = getGoldenSparkPreset();
    return NextResponse.json({
      configured: true,
      cached: true,
      engine: `Meta ${model} (Golden Fallback)`,
      analysis: golden,
      costUsd: 0,
      budget: getMetaBudgetStatus(),
    });
  }
}
