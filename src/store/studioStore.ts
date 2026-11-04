'use client';

import { create } from 'zustand';
import type {
  AdCopyConfig,
  LightingVector,
  LuminaPipelineResult,
  ProviderMode,
} from '@/types/lumina';
import { runLuminaPipeline, regenerateStudioScene } from '@/lib/pipeline';
import {
  ProviderNotConfiguredError,
  type PipelineStepEvent,
  type SampleId,
} from '@/lib/providers/types';
import type { AspectRatioId } from '@/lib/compositor/layout';
import type { PreparedCompositorAssets } from '@/lib/compositor/compositor';

export type BrushMode = 'protect' | 'erase';
export type ArtboardViewMode = 'all' | AspectRatioId;

export interface StudioState {
  // Provider & Telemetry
  providerMode: ProviderMode;
  isRunning: boolean;
  isRegeneratingScene: boolean;
  errorMessage: string | null;
  metaUnconfiguredNotice: string | null;
  creditsBurnedUsd: number;
  stepTelemetry: Record<'segment' | 'analyze' | 'scene', PipelineStepEvent>;

  // Source input
  activeSampleId: SampleId | null;
  uploadedImageUrl: string | null;
  seed: number;

  // Locked contract output
  pipelineResult: LuminaPipelineResult | null;
  preparedAssets: PreparedCompositorAssets | null;

  // Live reactive studio overrides (initialized from pipelineResult.artDirection)
  lightingVector: LightingVector;
  aiDetectedLighting: LightingVector;
  scenePrompt: string;
  adCopy: AdCopyConfig;

  // Masking Studio & Brush state
  showSilhouetteOverlay: boolean;
  showBrandSafeOverlay: boolean;
  brushMode: BrushMode;
  brushSize: number;
  maskRevision: number; // incremented on brush stroke end to re-render artboards

  // Brand-Safety Inspector & Artboard display
  pixelLockEnabled: boolean;
  inspectorEnabled: boolean;
  inspectorSplit: number;
  artboardView: ArtboardViewMode;

  // Progressive Disclosure Studio (Phase 2.5)
  activeStep: 1 | 2 | 3;
  sidebarCollapsed: boolean;
  showBackdropLayer: boolean;
  showShadowLayer: boolean;
  showLightWrapLayer: boolean;
  showCopyLayer: boolean;
  showSafeZonesOverlay: boolean;
  highlightBrandSafeZone: boolean;

  // Actions
  setPreparedAssets: (assets: PreparedCompositorAssets | null) => void;
  setActiveStep: (step: 1 | 2 | 3) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setShowBackdropLayer: (v: boolean) => void;
  setShowShadowLayer: (v: boolean) => void;
  setShowLightWrapLayer: (v: boolean) => void;
  setShowCopyLayer: (v: boolean) => void;
  setShowSafeZonesOverlay: (v: boolean) => void;
  setHighlightBrandSafeZone: (v: boolean) => void;
  setProviderMode: (mode: ProviderMode) => void;
  loadSample: (sampleId: SampleId, overrideMode?: ProviderMode) => Promise<void>;
  loadUploadedPhoto: (dataUrl: string, overrideMode?: ProviderMode) => Promise<void>;
  rerunPipeline: () => Promise<void>;
  regenerateBackground: (presetId?: string, customPrompt?: string) => Promise<void>;
  setLightingVector: (patch: Partial<LightingVector>) => void;
  resetLightingToAi: () => void;
  setScenePrompt: (prompt: string) => void;
  setAdCopy: (patch: Partial<AdCopyConfig>) => void;
  setShowSilhouetteOverlay: (v: boolean) => void;
  setShowBrandSafeOverlay: (v: boolean) => void;
  setBrushMode: (mode: BrushMode) => void;
  setBrushSize: (size: number) => void;
  commitBrandSafeMaskUpdate: (newMaskDataUrl: string) => void;
  setPixelLockEnabled: (v: boolean) => void;
  setInspectorEnabled: (v: boolean) => void;
  setInspectorSplit: (split: number) => void;
  setArtboardView: (view: ArtboardViewMode) => void;
  dismissNotice: () => void;
}

const DEFAULT_LIGHTING: LightingVector = {
  azimuthDegrees: 140,
  elevationDegrees: 48,
  intensity: 0.82,
  warmthHex: '#FFE6C4',
};

const DEFAULT_COPY: AdCopyConfig = {
  headline: 'Glow, Botanically.',
  subheadline: 'Bakuchiol + rosehip serum for overnight radiance.',
  ctaText: 'Shop the Ritual',
  accentColorHex: '#4F7A55',
};

const INITIAL_STEPS: Record<'segment' | 'analyze' | 'scene', PipelineStepEvent> = {
  segment: { step: 'segment', status: 'done', engine: 'Idle', latencyMs: 0, costUsd: 0 },
  analyze: { step: 'analyze', status: 'done', engine: 'Idle', latencyMs: 0, costUsd: 0 },
  scene: { step: 'scene', status: 'done', engine: 'Idle', latencyMs: 0, costUsd: 0 },
};

const initialMode: ProviderMode = 'META_PROD';

export const useStudioStore = create<StudioState>((set, get) => ({
  providerMode: initialMode,
  isRunning: false,
  isRegeneratingScene: false,
  errorMessage: null,
  metaUnconfiguredNotice: null,
  creditsBurnedUsd: 0,
  stepTelemetry: INITIAL_STEPS,

  activeSampleId: 'aura',
  uploadedImageUrl: null,
  seed: 104,

  pipelineResult: null,
  preparedAssets: null,

  lightingVector: DEFAULT_LIGHTING,
  aiDetectedLighting: DEFAULT_LIGHTING,
  scenePrompt: '',
  adCopy: DEFAULT_COPY,

  showSilhouetteOverlay: true,
  showBrandSafeOverlay: true,
  brushMode: 'protect',
  brushSize: 28,
  maskRevision: 0,

  pixelLockEnabled: true,
  inspectorEnabled: false,
  inspectorSplit: 0.5,
  artboardView: 'all',

  activeStep: 1,
  sidebarCollapsed: false,
  showBackdropLayer: true,
  showShadowLayer: true,
  showLightWrapLayer: true,
  showCopyLayer: true,
  showSafeZonesOverlay: false,
  highlightBrandSafeZone: false,

  setPreparedAssets: (preparedAssets) => set({ preparedAssets }),
  setActiveStep: (activeStep) => set({ activeStep }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setShowBackdropLayer: (showBackdropLayer) => set({ showBackdropLayer }),
  setShowShadowLayer: (showShadowLayer) => set({ showShadowLayer }),
  setShowLightWrapLayer: (showLightWrapLayer) => set({ showLightWrapLayer }),
  setShowCopyLayer: (showCopyLayer) => set({ showCopyLayer }),
  setShowSafeZonesOverlay: (showSafeZonesOverlay) => set({ showSafeZonesOverlay }),
  setHighlightBrandSafeZone: (highlightBrandSafeZone) => set({ highlightBrandSafeZone }),

  setProviderMode: (mode) => {
    set({ providerMode: mode, errorMessage: null, metaUnconfiguredNotice: null });
    void get().rerunPipeline();
  },

  loadSample: async (sampleId, overrideMode) => {
    const mode = overrideMode ?? get().providerMode;
    set({
      activeSampleId: sampleId,
      uploadedImageUrl: null,
      providerMode: mode,
      errorMessage: null,
      metaUnconfiguredNotice: null,
    });
    await get().rerunPipeline();
  },

  loadUploadedPhoto: async (dataUrl, overrideMode) => {
    // When uploading a real photo while in MOCK_OFFLINE, automatically offer/run FREE_DEV
    // or run with current mode
    const mode = overrideMode ?? get().providerMode;
    set({
      activeSampleId: null,
      uploadedImageUrl: dataUrl,
      providerMode: mode,
      errorMessage: null,
      metaUnconfiguredNotice: null,
    });
    await get().rerunPipeline();
  },

  rerunPipeline: async () => {
    const state = get();
    const mode = state.providerMode;
    const sampleId = state.activeSampleId ?? undefined;
    const imageUrl = state.uploadedImageUrl ?? '';

    set({ isRunning: true, errorMessage: null, metaUnconfiguredNotice: null });

    try {
      const bundle = await runLuminaPipeline({
        mode,
        input: {
          imageUrl,
          sampleId,
          seed: state.seed,
        },
        onStep: (ev) => {
          set((prev) => ({
            stepTelemetry: { ...prev.stepTelemetry, [ev.step]: ev },
          }));
        },
      });

      const { result, totalCostUsd } = bundle;
      set((prev) => ({
        isRunning: false,
        pipelineResult: result,
        creditsBurnedUsd: Math.round((prev.creditsBurnedUsd + totalCostUsd) * 1000) / 1000,
        lightingVector: { ...result.artDirection.lightingVector },
        aiDetectedLighting: { ...result.artDirection.lightingVector },
        scenePrompt: result.artDirection.spatialScenePrompt,
        adCopy: { ...result.artDirection.adCopy },
        maskRevision: prev.maskRevision + 1,
      }));
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) {
        set({
          isRunning: false,
          metaUnconfiguredNotice: err.message,
        });
        return;
      }
      set({
        isRunning: false,
        errorMessage: (err as Error).message || 'Pipeline execution failed',
      });
    }
  },

  regenerateBackground: async (presetId, customPrompt) => {
    const state = get();
    if (!state.pipelineResult) return;
    const nextPrompt = customPrompt ?? state.scenePrompt;
    const nextSeed = Math.floor(Math.random() * 9000) + 100;

    set({
      isRegeneratingScene: true,
      scenePrompt: nextPrompt,
      seed: nextSeed,
      errorMessage: null,
    });

    try {
      const analysisWithCurrentLight = {
        ...state.pipelineResult.artDirection,
        lightingVector: state.lightingVector,
        spatialScenePrompt: nextPrompt,
      };
      const { backgroundUrl, step } = await regenerateStudioScene({
        mode: state.providerMode,
        analysis: analysisWithCurrentLight,
        prompt: nextPrompt,
        seed: nextSeed,
        presetId,
        onStep: (ev) =>
          set((prev) => ({
            stepTelemetry: { ...prev.stepTelemetry, [ev.step]: ev },
          })),
      });

      set((prev) => ({
        isRegeneratingScene: false,
        creditsBurnedUsd:
          Math.round((prev.creditsBurnedUsd + (step.costUsd ?? 0)) * 1000) / 1000,
        pipelineResult: prev.pipelineResult
          ? {
              ...prev.pipelineResult,
              generatedBackgroundUrl: backgroundUrl,
              artDirection: analysisWithCurrentLight,
            }
          : null,
      }));
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) {
        set({ isRegeneratingScene: false, metaUnconfiguredNotice: err.message });
        return;
      }
      set({
        isRegeneratingScene: false,
        errorMessage: (err as Error).message || 'Scene regeneration failed',
      });
    }
  },

  setLightingVector: (patch) =>
    set((prev) => ({
      lightingVector: { ...prev.lightingVector, ...patch },
    })),

  resetLightingToAi: () =>
    set((prev) => ({
      lightingVector: { ...prev.aiDetectedLighting },
    })),

  setScenePrompt: (scenePrompt) => set({ scenePrompt }),

  setAdCopy: (patch) =>
    set((prev) => ({
      adCopy: { ...prev.adCopy, ...patch },
    })),

  setShowSilhouetteOverlay: (showSilhouetteOverlay) => set({ showSilhouetteOverlay }),
  setShowBrandSafeOverlay: (showBrandSafeOverlay) => set({ showBrandSafeOverlay }),
  setBrushMode: (brushMode) => set({ brushMode }),
  setBrushSize: (brushSize) => set({ brushSize }),

  commitBrandSafeMaskUpdate: (newMaskDataUrl) =>
    set((prev) => ({
      maskRevision: prev.maskRevision + 1,
      pipelineResult: prev.pipelineResult
        ? {
            ...prev.pipelineResult,
            masks: {
              ...prev.pipelineResult.masks,
              brandSafeZoneMaskUrl: newMaskDataUrl,
            },
          }
        : null,
    })),

  setPixelLockEnabled: (pixelLockEnabled) => set({ pixelLockEnabled }),
  setInspectorEnabled: (inspectorEnabled) => set({ inspectorEnabled }),
  setInspectorSplit: (inspectorSplit) => set({ inspectorSplit }),
  setArtboardView: (artboardView) => set({ artboardView }),
  dismissNotice: () => set({ errorMessage: null, metaUnconfiguredNotice: null }),
}));

