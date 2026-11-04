/**
 * Lighting & shadow geometry math for the 5-layer compositor.
 *
 * Implements the exact specification formula:
 *   Δx = -d * cos(θ) * cot(φ)
 *   Δy = -d * sin(θ) * cot(φ)
 * where θ = azimuthDegrees (math CCW, 0° = right, 90° = top/back),
 * φ = elevationDegrees ∈ [10°, 90°], and d = product height.
 */
import type { LightingVector } from '@/types/lumina';
import { clamp } from '@/lib/imaging/canvas';

export interface ShadowProjection {
  /** Raw world-plane offset from the formula Δx = -d·cos(θ)·cot(φ). */
  deltaX: number;
  /** Raw world-plane offset from the formula Δy = -d·sin(θ)·cot(φ). */
  deltaY: number;
  /** Screen-space (y-down, foreshortened tabletop) horizontal displacement at top of product. */
  screenDeltaX: number;
  /** Screen-space vertical displacement at top of product. */
  screenDeltaY: number;
  /** Affine shear factor kx = screenDeltaX / d. */
  shearX: number;
  /** Affine vertical scale factor ky = screenDeltaY / d on tabletop plane. */
  shearY: number;
  /** Softness sigma (in quarter-res pixels) proportional to shadow length. */
  blurSigma: number;
  /** Cast shadow opacity. */
  castAlpha: number;
  /** Ambient contact shadow opacity under the product base. */
  contactAlpha: number;
  /** Normalized 2D light direction in screen coordinates (x right, y down). */
  lightDirScreen: [number, number];
}

const DEG2RAD = Math.PI / 180;
/** Camera foreshortening of the tabletop plane (approx. 25° camera tilt). */
const TABLETOP_FORESHORTENING = 0.38;

export function computeShadowProjection(lv: LightingVector, productHeightPx: number): ShadowProjection {
  const theta = lv.azimuthDegrees * DEG2RAD;
  const phi = clamp(lv.elevationDegrees, 10, 89.5) * DEG2RAD;

  // cot(φ) = cos(φ) / sin(φ), clamped so near-horizon grazing light stays bounded
  const cotPhi = clamp(Math.cos(phi) / Math.max(0.08, Math.sin(phi)), 0.02, 2.35);

  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Exact PRD formula: Δx = -d * cos(θ) * cot(φ), Δy = -d * sin(θ) * cot(φ)
  const deltaX = -productHeightPx * cosT * cotPhi;
  const deltaY = -productHeightPx * sinT * cotPhi;

  // Convert math-Y (up) to screen-Y (down) on a foreshortened ground plane:
  // When light is at θ = 90° (top/back), sin(θ) = +1 -> shadow projects forward (+screen Y, downward).
  const screenDeltaX = deltaX;
  const rawScreenY = -deltaY * TABLETOP_FORESHORTENING;
  // Ensure a minimum tabletop depth footprint so shadow never collapses to a 1px line
  const minDepth = productHeightPx * 0.09 * (rawScreenY >= 0 ? 1 : -1);
  const screenDeltaY = Math.abs(rawScreenY) < Math.abs(minDepth) ? minDepth : rawScreenY;

  const d = Math.max(1, productHeightPx);
  const shearX = screenDeltaX / d;
  const shearY = screenDeltaY / d;

  const blurSigma = clamp(2.5 + cotPhi * 4.2, 2.5, 13);
  const intensity = clamp(lv.intensity, 0, 1);
  const castAlpha = clamp(0.56 * intensity * (0.55 + 0.45 * Math.sin(phi)), 0.08, 0.72);
  const contactAlpha = clamp(0.62 * (0.45 + 0.55 * intensity), 0.22, 0.78);

  // Light vector in screen space (pointing TOWARD the light source)
  const lx = cosT;
  const ly = -sinT;
  const len = Math.hypot(lx, ly) || 1;

  return {
    deltaX,
    deltaY,
    screenDeltaX,
    screenDeltaY,
    shearX,
    shearY,
    blurSigma,
    castAlpha,
    contactAlpha,
    lightDirScreen: [lx / len, ly / len],
  };
}

