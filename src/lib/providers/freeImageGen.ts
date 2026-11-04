/**
 * FREE_DEV Studio Scene Generator - LuminaStage Studio Engine ($0).
 * Requests go through the same-origin `/api/scene` proxy so the returned image
 * never taints the export canvas. Falls back to a procedural backdrop.
 */
import { renderBackdrop, styleFromPrompt } from '@/lib/samples/backdrops';
import { composeScenePrompt } from './shared';
import type { SceneRequest, StepOutput } from './types';

const CLIENT_TIMEOUT_MS = 18_000;

export async function generateSceneFree(req: SceneRequest): Promise<StepOutput<string>> {
  const prompt = composeScenePrompt(req.prompt, req.analysis.lightingVector, req.analysis.detectedMaterial);
  const params = new URLSearchParams({
    prompt,
    seed: String(req.seed),
    width: String(req.width),
    height: String(req.height),
  });
  try {
    const res = await fetch(`/api/scene?${params.toString()}`, { signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    if (!blob.type.startsWith('image/') || blob.size < 2000) throw new Error('Invalid image payload');
    return { data: URL.createObjectURL(blob), engine: 'LuminaStage Studio Engine', fallback: false, costUsd: 0 };
  } catch (err) {
    const style = styleFromPrompt(req.prompt, req.presetId);
    const canvas = renderBackdrop(style, req.analysis.lightingVector, 1600, 1600, req.seed);
    return {
      data: canvas.toDataURL('image/jpeg', 0.92),
      engine: `Procedural backdrop · ${style}`,
      fallback: true,
      costUsd: 0,
      note: `Studio engine unavailable (${(err as Error).message}); procedural fallback used`,
    };
  }
}
