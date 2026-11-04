/**
 * LuminaStage - LOCKED DATA CONTRACT
 *
 * All three provider modes (MOCK_OFFLINE, FREE_DEV, META_PROD) MUST return and
 * consume exactly these shapes. The UI and the compositor depend only on this
 * file, which is what makes the Phase 3 Meta cutover a zero-refactor switch.
 *
 * Conventions (binding for every adapter):
 * - Mask URLs are PNG data/blob/same-origin URLs at the SAME resolution as
 *   `originalImageUrl`. White / opaque = selected.
 * - `boundingBox` is in original-image pixel coordinates.
 * - `azimuthDegrees` uses the math convention: 0° = light from the right,
 *   90° = light from the top of the frame, counter-clockwise.
 */

export type ProviderMode = 'MOCK_OFFLINE' | 'FREE_DEV' | 'META_PROD';

export interface LightingVector {
  azimuthDegrees: number; // 0 to 360 degrees (direction of light source)
  elevationDegrees: number; // 10 to 90 degrees (height of light source)
  intensity: number; // 0.0 to 1.0
  warmthHex: string; // e.g., "#FFF4E0" for ambient edge-wrapping tint
}

export interface AdCopyConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  accentColorHex: string;
}

export interface HierarchicalMasks {
  originalImageUrl: string;
  productSilhouetteMaskUrl: string; // Full product cutout mask (SAM 3.1 Layer 1)
  brandSafeZoneMaskUrl: string; // Protected label/typography mask (SAM 3.1 Layer 2 - IMMUTABLE)
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface ArtDirectorAnalysis {
  productCategory: string;
  detectedMaterial: string;
  lightingVector: LightingVector;
  spatialScenePrompt: string;
  suggestedPresets: Array<{
    id: string;
    title: string;
    prompt: string;
  }>;
  adCopy: AdCopyConfig;
}

export interface LuminaPipelineResult {
  jobId: string;
  providerUsed: ProviderMode;
  latencyMs: number;
  masks: HierarchicalMasks;
  artDirection: ArtDirectorAnalysis;
  generatedBackgroundUrl: string;
}

