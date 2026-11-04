/**
 * LuminaStage Pipeline Orchestrator.
 * Executes `segment -> analyze -> generateScene` against the active provider
 * adapter, emits granular step telemetry for the header status bar, and returns
 * a strict `LuminaPipelineResult` (locked contract).
 */
import type { ArtDirectorAnalysis, LuminaPipelineResult, ProviderMode } from '@/types/lumina';
import { newJobId } from '@/lib/imaging/canvas';
import { getProvider } from './providers';
import type { PipelineInput, PipelineStepEvent, SceneRequest } from './providers/types';

export interface RunPipelineOptions {
  mode: ProviderMode;
  input: PipelineInput;
  sceneWidth?: number;
  sceneHeight?: number;
  onStep?: (ev: PipelineStepEvent) => void;
}

export interface PipelineExecutionBundle {
  result: LuminaPipelineResult;
  totalCostUsd: number;
  steps: Record<'segment' | 'analyze' | 'scene', PipelineStepEvent>;
}

export async function runLuminaPipeline(opts: RunPipelineOptions): Promise<PipelineExecutionBundle> {
  const adapter = getProvider(opts.mode);
  const t0 = performance.now();
  let totalCostUsd = 0;

  const steps: Record<'segment' | 'analyze' | 'scene', PipelineStepEvent> = {
    segment: { step: 'segment', status: 'running' },
    analyze: { step: 'analyze', status: 'running' },
    scene: { step: 'scene', status: 'running' },
  };

  // Step 1 - Hierarchical Masking
  opts.onStep?.({ step: 'segment', status: 'running' });
  const s0 = performance.now();
  const segOut = await adapter.segment(opts.input);
  const segLatency = Math.round(performance.now() - s0);
  totalCostUsd += segOut.costUsd;
  steps.segment = {
    step: 'segment',
    status: 'done',
    engine: segOut.engine,
    fallback: segOut.fallback,
    latencyMs: segLatency,
    costUsd: segOut.costUsd,
    note: segOut.note,
  };
  opts.onStep?.(steps.segment);

  // Step 2 - Autonomous Art Director
  opts.onStep?.({ step: 'analyze', status: 'running' });
  const a0 = performance.now();
  const anaOut = await adapter.analyze(opts.input, segOut.data);
  const anaLatency = Math.round(performance.now() - a0);
  totalCostUsd += anaOut.costUsd;
  steps.analyze = {
    step: 'analyze',
    status: 'done',
    engine: anaOut.engine,
    fallback: anaOut.fallback,
    latencyMs: anaLatency,
    costUsd: anaOut.costUsd,
    note: anaOut.note,
  };
  opts.onStep?.(steps.analyze);

  // Step 3 - Studio Scene Generation
  opts.onStep?.({ step: 'scene', status: 'running' });
  const g0 = performance.now();
  const sceneReq: SceneRequest = {
    analysis: anaOut.data,
    prompt: anaOut.data.spatialScenePrompt,
    seed: opts.input.seed,
    width: opts.sceneWidth ?? 1024,
    height: opts.sceneHeight ?? 1024,
    sampleId: opts.input.sampleId,
  };
  const sceneOut = await adapter.generateScene(sceneReq);
  const sceneLatency = Math.round(performance.now() - g0);
  totalCostUsd += sceneOut.costUsd;
  steps.scene = {
    step: 'scene',
    status: 'done',
    engine: sceneOut.engine,
    fallback: sceneOut.fallback,
    latencyMs: sceneLatency,
    costUsd: sceneOut.costUsd,
    note: sceneOut.note,
  };
  opts.onStep?.(steps.scene);

  const latencyMs = Math.round(performance.now() - t0);
  const result: LuminaPipelineResult = {
    jobId: newJobId(),
    providerUsed: opts.mode,
    latencyMs,
    masks: segOut.data,
    artDirection: anaOut.data,
    generatedBackgroundUrl: sceneOut.data,
  };

  return { result, totalCostUsd, steps };
}

export async function regenerateStudioScene(opts: {
  mode: ProviderMode;
  analysis: ArtDirectorAnalysis;
  prompt: string;
  seed: number;
  presetId?: string;
  onStep?: (ev: PipelineStepEvent) => void;
}): Promise<{ backgroundUrl: string; step: PipelineStepEvent }> {
  const adapter = getProvider(opts.mode);
  opts.onStep?.({ step: 'scene', status: 'running' });
  const t0 = performance.now();
  const out = await adapter.generateScene({
    analysis: opts.analysis,
    prompt: opts.prompt,
    seed: opts.seed,
    width: 1024,
    height: 1024,
    presetId: opts.presetId,
  });
  const step: PipelineStepEvent = {
    step: 'scene',
    status: 'done',
    engine: out.engine,
    fallback: out.fallback,
    latencyMs: Math.round(performance.now() - t0),
    costUsd: out.costUsd,
    note: out.note,
  };
  opts.onStep?.(step);
  return { backgroundUrl: out.data, step };
}

