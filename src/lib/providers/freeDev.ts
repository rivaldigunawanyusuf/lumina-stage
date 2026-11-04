/**
 * FREE_DEV adapter - $0 end-to-end AI pipeline for real user photos & samples.
 * - Hierarchical Masking: Transformers / Canvas segmentation + auto brand-safe label zone
 *   (with deterministic offline colour-key fallback).
 * - Autonomous Art Director: client Luminance Gradient Analyzer + Meta Llama Vision refinement.
 * - Studio Scene Generator: LuminaStage Studio Engine ($0) via `/api/scene`
 *   with procedural backdrop fallback.
 */
import type { ArtDirectorAnalysis, HierarchicalMasks } from '@/types/lumina';
import { segmentFree } from './freeMasking';
import { analyzeFree } from './freeArtDirector';
import { generateSceneFree } from './freeImageGen';
import type { LuminaProviderAdapter, PipelineInput, SampleId, SceneRequest, StepOutput } from './types';

// Real production product photographs for starter SKUs
const SAMPLE_REAL_PACKSHOTS: Record<SampleId, string> = {
  aura: '/showcase/packshot_aura_raw.png',
  kinetix: '/showcase/beverage_kinetix.png',
  veloce: '/showcase/food_veloce.png',
};

export const freeDevAdapter: LuminaProviderAdapter = {
  mode: 'FREE_DEV',
  label: 'Free Dev · $0 AI',

  async segment(input: PipelineInput): Promise<StepOutput<HierarchicalMasks>> {
    const imageUrl = input.sampleId ? SAMPLE_REAL_PACKSHOTS[input.sampleId] : input.imageUrl;
    return segmentFree(imageUrl);
  },

  async analyze(_input: PipelineInput, masks: HierarchicalMasks): Promise<StepOutput<ArtDirectorAnalysis>> {
    return analyzeFree(masks);
  },

  async generateScene(req: SceneRequest): Promise<StepOutput<string>> {
    return generateSceneFree(req);
  },
};
