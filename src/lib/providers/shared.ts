/**
 * Pure (DOM-free) helpers shared by client adapters and server route handlers:
 * lighting phrase builder, Art Director system prompt, and contract validation.
 */
import type { AdCopyConfig, ArtDirectorAnalysis, LightingVector } from '@/types/lumina';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normaliseAzimuth(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

export function clampLighting(lv: Partial<LightingVector> | undefined, fallback: LightingVector): LightingVector {
  const num = (v: unknown, fb: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fb);
  return {
    azimuthDegrees: normaliseAzimuth(num(lv?.azimuthDegrees, fallback.azimuthDegrees)),
    elevationDegrees: Math.min(90, Math.max(10, num(lv?.elevationDegrees, fallback.elevationDegrees))),
    intensity: Math.min(1, Math.max(0, num(lv?.intensity, fallback.intensity))),
    warmthHex:
      typeof lv?.warmthHex === 'string' && HEX_RE.test(lv.warmthHex.trim())
        ? lv.warmthHex.trim().toUpperCase()
        : fallback.warmthHex,
  };
}

/** Natural-language description of a lighting vector, injected into image prompts. */
export function buildLightingPhrase(lv: LightingVector): string {
  const t = (lv.azimuthDegrees * Math.PI) / 180;
  const cx = Math.cos(t);
  const sy = Math.sin(t);
  const horiz = cx > 0.38 ? 'right' : cx < -0.38 ? 'left' : '';
  const vert = sy > 0.38 ? 'upper' : sy < -0.38 ? 'front' : '';
  const from = [vert, horiz].filter(Boolean).join(' ') || 'front';
  const sHoriz = cx > 0.38 ? 'left' : cx < -0.38 ? 'right' : '';
  const sVert = sy > 0.38 ? 'toward the camera' : sy < -0.38 ? 'behind the subject' : '';
  const shadow = [sVert, sHoriz ? `to the ${sHoriz}` : ''].filter(Boolean).join(' ') || 'directly underneath';
  const elev =
    lv.elevationDegrees > 65
      ? 'high overhead'
      : lv.elevationDegrees > 35
        ? `${Math.round(lv.elevationDegrees)}-degree`
        : 'low raking';
  const quality = lv.intensity > 0.75 ? 'crisp' : lv.intensity > 0.45 ? 'soft' : 'diffused';
  return `${quality} ${elev} key light from the ${from}, shadows falling ${shadow}, light tint ${lv.warmthHex}`;
}

export const ART_DIRECTOR_SYSTEM_PROMPT = `You are the Autonomous Art Director of LuminaStage, a brand-safe product staging studio.
Analyse the product photo and return STRICT JSON (no markdown) with exactly this shape:
{
  "productCategory": string,            // e.g. "Skincare · Facial Serum"
  "detectedMaterial": string,           // packaging materials & finishes
  "lightingVector": {
    "azimuthDegrees": number,           // 0-360, math convention: 0 = light from right, 90 = from top/back, 180 = from left
    "elevationDegrees": number,         // 10-90, 90 = overhead
    "intensity": number,                // 0-1
    "warmthHex": string                 // light colour, e.g. "#FFF4E0"
  },
  "spatialScenePrompt": string,         // photorealistic EMPTY studio backdrop prompt matching the lighting; never include products, text or logos
  "suggestedPresets": [{ "id": string, "title": string, "prompt": string }],  // exactly 3 alternative empty backdrops
  "adCopy": { "headline": string (<= 32 chars), "subheadline": string (<= 70 chars), "ctaText": string (<= 18 chars), "accentColorHex": string }
}
Rules: never invent or mention real trademarks; describe only what is visible; copy must be honest and generic to the product type.`;

function str(v: unknown, fb: string, max = 400): string {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fb;
}

/**
 * Merge an untrusted (LLM / remote) partial analysis on top of a trusted
 * heuristic analysis. Never throws; always returns a contract-valid object.
 */
export function mergeArtDirector(base: ArtDirectorAnalysis, incoming: unknown): ArtDirectorAnalysis {
  if (!incoming || typeof incoming !== 'object') return base;
  const r = incoming as Record<string, unknown>;
  const copy = (r.adCopy ?? {}) as Partial<AdCopyConfig>;
  const presetsRaw = Array.isArray(r.suggestedPresets) ? r.suggestedPresets : [];
  const presets = presetsRaw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .slice(0, 3)
    .map((p, i) => ({
      id: str(p.id, `preset-${i + 1}`, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      title: str(p.title, `Preset ${i + 1}`, 60),
      prompt: str(p.prompt, base.spatialScenePrompt, 600),
    }));
  return {
    productCategory: str(r.productCategory, base.productCategory, 80),
    detectedMaterial: str(r.detectedMaterial, base.detectedMaterial, 160),
    lightingVector: clampLighting(r.lightingVector as Partial<LightingVector>, base.lightingVector),
    spatialScenePrompt: str(r.spatialScenePrompt, base.spatialScenePrompt, 800),
    suggestedPresets: presets.length === 3 ? presets : base.suggestedPresets,
    adCopy: {
      headline: str(copy.headline, base.adCopy.headline, 48),
      subheadline: str(copy.subheadline, base.adCopy.subheadline, 110),
      ctaText: str(copy.ctaText, base.adCopy.ctaText, 24),
      accentColorHex:
        typeof copy.accentColorHex === 'string' && HEX_RE.test(copy.accentColorHex.trim())
          ? copy.accentColorHex.trim().toUpperCase()
          : base.adCopy.accentColorHex,
    },
  };
}

/** Extract the first JSON object from a model response (tolerates ``` fences). */
export function extractJson(text: string): unknown {
  const fenced = text.replace(/```(?:json)?/gi, '');
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Compose the final image prompt: scene + lighting + hard negatives. */
export function composeScenePrompt(scenePrompt: string, lv: LightingVector, material?: string): string {
  const parts = [
    scenePrompt.trim().replace(/\.$/, ''),
    buildLightingPhrase(lv),
    material ? `colour palette complementing ${material.toLowerCase()}` : '',
    'empty foreground surface for product placement, centered composition, shallow depth of field, 85mm commercial photography, no text, no logos, no products, no people',
  ];
  return parts.filter(Boolean).join(', ');
}

