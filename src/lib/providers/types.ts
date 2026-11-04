import type {
  ArtDirectorAnalysis,
  HierarchicalMasks,
  ProviderMode,
} from '@/types/lumina';

export type SampleId = 'aura' | 'kinetix' | 'veloce';

export interface PipelineInput {
  /** data: or blob: URL, already downscaled to <= 1600px on the long edge. */
  imageUrl: string;
  /** Set when the user picked a built-in fictional-brand sample. */
  sampleId?: SampleId;
  seed: number;
}

export interface SceneRequest {
  analysis: ArtDirectorAnalysis;
  /** Usually `analysis.spatialScenePrompt`, possibly edited by the user. */
  prompt: string;
  seed: number;
  width: number;
  height: number;
  /** Hint for procedural fallbacks / mock backdrops. */
  sampleId?: SampleId;
  presetId?: string;
}

/** Every adapter step reports which engine actually ran and what it cost. */
export interface StepOutput<T> {
  data: T;
  engine: string;
  fallback: boolean;
  costUsd: number;
  note?: string;
}

export interface LuminaProviderAdapter {
  readonly mode: ProviderMode;
  readonly label: string;
  segment(input: PipelineInput): Promise<StepOutput<HierarchicalMasks>>;
  analyze(
    input: PipelineInput,
    masks: HierarchicalMasks,
  ): Promise<StepOutput<ArtDirectorAnalysis>>;
  generateScene(req: SceneRequest): Promise<StepOutput<string>>;
}

export type PipelineStepId = 'segment' | 'analyze' | 'scene';

export interface PipelineStepEvent {
  step: PipelineStepId;
  status: 'running' | 'done' | 'error';
  engine?: string;
  fallback?: boolean;
  latencyMs?: number;
  costUsd?: number;
  note?: string;
  error?: string;
}

export class ProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotConfiguredError';
  }
}

