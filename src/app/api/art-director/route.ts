import { NextResponse } from 'next/server';
import { ART_DIRECTOR_SYSTEM_PROMPT, extractJson } from '@/lib/providers/shared';

/**
 * POST /api/art-director
 * Server-side proxy for Meta Llama Vision analysis and deterministic physical lighting prior.
 * Keeps API keys out of client browser bundles.
 *
 * Zero-Key Guarantee:
 * When `FREE_VISION_API_KEY` is not configured, returns `{ source: 'heuristic' }`
 * with HTTP 200 so the client immediately uses its deterministic Luminance
 * Gradient Analyzer without throwing errors.
 */
export async function POST(request: Request) {
  const apiKey = process.env.FREE_VISION_API_KEY?.trim();

  let body: { imageDataUrl?: string; heuristic?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ source: 'heuristic', note: 'Invalid JSON body' });
  }

  if (!apiKey || !body.imageDataUrl) {
    return NextResponse.json({
      source: 'heuristic',
      note: 'Zero-Key mode active - using deterministic Luminance Gradient Analyzer',
    });
  }

  const priorHint = body.heuristic
    ? `\nPhysical Luminance Analyzer Prior (use as lighting anchor unless clearly contradicted): ${JSON.stringify(body.heuristic)}`
    : '';

  try {
    const endpoint =
      process.env.LLAMA_VISION_ENDPOINT ||
      process.env.META_VISION_ENDPOINT ||
      'https://api.llama.com/v1/chat/completions';
    const model =
      process.env.LLAMA_VISION_MODEL ||
      process.env.FREE_VISION_MODEL ||
      'meta-llama/llama-3.2-11b-vision-instruct';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 750,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${ART_DIRECTOR_SYSTEM_PROMPT}${priorHint}` },
              { type: 'image_url', image_url: { url: body.imageDataUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(22_000),
    });

    if (!res.ok) {
      return NextResponse.json({
        source: 'heuristic',
        note: `Vision API HTTP ${res.status} - used deterministic Luminance Analyzer`,
      });
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(content);
    if (!parsed) {
      return NextResponse.json({ source: 'heuristic', note: 'Vision model returned invalid JSON; used heuristic' });
    }
    return NextResponse.json({
      source: 'llm',
      engine: `Meta Llama Vision · ${model.split('/').pop()}`,
      analysis: parsed,
    });
  } catch (err) {
    return NextResponse.json({
      source: 'heuristic',
      note: `Vision model error (${(err as Error).message}); used deterministic analyzer`,
    });
  }
}
