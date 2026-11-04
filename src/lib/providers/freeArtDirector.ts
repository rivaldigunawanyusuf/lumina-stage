/**
 * FREE_DEV Autonomous Art Director - $0.
 *
 * 1. Deterministic Luminance Gradient Analyzer (always runs, client-side):
 *    - azimuth from the offset between the luminance-weighted centroid and the
 *      geometric centroid of the product (plus backdrop falloff direction),
 *    - elevation from offset magnitude + top/bottom luminance bias,
 *    - intensity from luminance contrast (P95 − P5),
 *    - warmthHex from the chroma of specular highlights,
 *    - accent colour from a k-means palette.
 * 2. Optional free Vision LLM refinement via `/api/art-director` (server holds
 *    FREE_VISION_API_KEY). Without a key the heuristic result is returned as-is.
 */
import type { ArtDirectorAnalysis, HierarchicalMasks, LightingVector } from '@/types/lumina';
import { createCanvas, ctx2d, loadImage, rgbToHex } from '@/lib/imaging/canvas';
import { STUDIO_PRESETS } from '@/lib/samples/mockAnalyses';
import { composeScenePrompt, mergeArtDirector } from './shared';
import type { StepOutput } from './types';

interface PixelStats {
  lighting: LightingVector;
  palette: Array<{ rgb: [number, number, number]; weight: number }>;
  aspect: number; // h / w
  highlightFrac: number;
  meanSat: number;
  contrast: number;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hueName(h: number, s: number, l: number): string {
  if (s < 0.12) return l > 0.7 ? 'white' : l < 0.25 ? 'black' : 'silver';
  if (l < 0.22 && (h > 200 && h < 260)) return 'navy';
  if (h < 15 || h >= 345) return 'crimson';
  if (h < 40) return l < 0.45 ? 'amber' : 'copper';
  if (h < 65) return 'golden';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 260) return 'blue';
  if (h < 300) return 'violet';
  return 'rose';
}

function kmeans(samples: Array<[number, number, number]>, k: number, iters = 8) {
  if (samples.length === 0) return [];
  const cents = Array.from({ length: k }, (_, i) => samples[Math.floor(((i + 0.5) / k) * samples.length)].slice() as [number, number, number]);
  const counts = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    counts.fill(0);
    for (const p of samples) {
      let bi = 0,
        bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (p[0] - cents[c][0]) ** 2 + (p[1] - cents[c][1]) ** 2 + (p[2] - cents[c][2]) ** 2;
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      sums[bi][0] += p[0];
      sums[bi][1] += p[1];
      sums[bi][2] += p[2];
      counts[bi]++;
    }
    for (let c = 0; c < k; c++) if (counts[c]) cents[c] = [sums[c][0] / counts[c], sums[c][1] / counts[c], sums[c][2] / counts[c]];
  }
  return cents.map((rgb, i) => ({ rgb, weight: counts[i] / samples.length })).sort((a, b) => b.weight - a.weight);
}

/** Core pixel analysis. Exported for unit testing / Muse Code optimisation. */
export async function analyzePixels(masks: HierarchicalMasks): Promise<PixelStats> {
  const [img, sil] = await Promise.all([loadImage(masks.originalImageUrl), loadImage(masks.productSilhouetteMaskUrl)]);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const s = Math.min(1, 256 / Math.max(W, H));
  const w = Math.max(8, Math.round(W * s));
  const h = Math.max(8, Math.round(H * s));
  const c = createCanvas(w, h);
  const ctx = ctx2d(c, { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(sil, 0, 0, w, h);
  const mk = ctx.getImageData(0, 0, w, h).data;

  const lum: number[] = [];
  let gx = 0,
    gy = 0,
    gn = 0;
  let bgx = 0,
    bgy = 0,
    bgw = 0;
  const b = masks.boundingBox;
  const by0 = b.y * s,
    bw = Math.max(1, b.width * s),
    bh = Math.max(1, b.height * s);
  const prod: Array<{ x: number; y: number; L: number; i: number }> = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const m = (mk[i] * mk[i + 3]) / (255 * 255);
      const L = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
      if (m > 0.5) {
        prod.push({ x, y, L, i });
        lum.push(L);
        gx += x;
        gy += y;
        gn++;
      } else {
        // backdrop falloff: brighter background pulls toward the light
        const wgt = L * L;
        bgx += (x - w / 2) * wgt;
        bgy += (y - h / 2) * wgt;
        bgw += wgt;
      }
    }
  }
  if (gn < 20) {
    return {
      lighting: { azimuthDegrees: 125, elevationDegrees: 50, intensity: 0.7, warmthHex: '#FFF4E0' },
      palette: [],
      aspect: 1,
      highlightFrac: 0,
      meanSat: 0,
      contrast: 0.4,
    };
  }
  gx /= gn;
  gy /= gn;
  const sorted = lum.slice().sort((a, b2) => a - b2);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const Lmed = q(0.5);
  const p95 = q(0.95);
  const p5 = q(0.05);
  const p97 = q(0.97);

  let lx = 0,
    ly = 0,
    lw = 0,
    topL = 0,
    topN = 0,
    botL = 0,
    botN = 0;
  let hr = 0,
    hg = 0,
    hb = 0,
    hn = 0,
    satSum = 0,
    highlightCount = 0;
  const samples: Array<[number, number, number]> = [];
  const stride = Math.max(1, Math.floor(prod.length / 3000));
  for (let k = 0; k < prod.length; k++) {
    const p = prod[k];
    const wgt = Math.max(0, p.L - Lmed);
    lx += p.x * wgt;
    ly += p.y * wgt;
    lw += wgt;
    const rel = (p.y - by0) / bh;
    if (rel < 0.4) {
      topL += p.L;
      topN++;
    } else if (rel > 0.6) {
      botL += p.L;
      botN++;
    }
    const r = px[p.i],
      g = px[p.i + 1],
      bl = px[p.i + 2];
    const [, sat, l] = rgbToHsl(r, g, bl);
    satSum += sat;
    if (p.L >= p97) {
      hr += r;
      hg += g;
      hb += bl;
      hn++;
    }
    if (l > 0.88 && sat < 0.25) highlightCount++;
    if (k % stride === 0) samples.push([r, g, bl]);
  }
  const dxP = lw > 0 ? (lx / lw - gx) / (bw / 2) : 0;
  const dyP = lw > 0 ? (ly / lw - gy) / (bh / 2) : 0;
  const dxB = bgw > 0 ? bgx / bgw / (w / 2) : 0;
  const dyB = bgw > 0 ? bgy / bgw / (h / 2) : 0;
  const meanL = sorted.reduce((a, v) => a + v, 0) / sorted.length;
  const topBias = topN && botN ? (topL / topN - botL / botN) / Math.max(0.05, meanL) : 0;

  const vx = dxP * 0.7 + dxB * 0.6;
  const vyUp = -(dyP * 0.7 + dyB * 0.6) + Math.max(0, topBias) * 0.6 + 0.08;
  let az = (Math.atan2(vyUp, vx) * 180) / Math.PI;
  if (az < 0) az += 360;
  // Studio key lights live in the upper hemisphere.
  if (az > 180 && az <= 270) az = 165;
  else if (az > 270) az = 15;
  az = Math.min(165, Math.max(15, az));
  const mh = Math.min(1, Math.abs(vx));
  const elevation = Math.round(Math.min(82, Math.max(18, 64 - mh * 95 + topBias * 45)));
  const contrast = Math.max(0, p95 - p5);
  const intensity = Math.round(Math.min(1, Math.max(0.35, 0.3 + contrast * 0.85)) * 100) / 100;

  let warmthHex = '#FFF4E0';
  if (hn > 0) {
    let r = hr / hn,
      g = hg / hn,
      bl = hb / hn;
    const mx = Math.max(r, g, bl, 1);
    r = (r / mx) * 255;
    g = (g / mx) * 255;
    bl = (bl / mx) * 255;
    // keep only a gentle tint
    warmthHex = rgbToHex(r * 0.45 + 255 * 0.55, g * 0.45 + 255 * 0.55, bl * 0.45 + 255 * 0.55);
  }

  return {
    lighting: { azimuthDegrees: Math.round(az), elevationDegrees: elevation, intensity, warmthHex },
    palette: kmeans(samples, 4),
    aspect: bh / bw,
    highlightFrac: highlightCount / prod.length,
    meanSat: satSum / prod.length,
    contrast,
  };
}

function pickAccent(palette: PixelStats['palette']): string {
  let best: [number, number, number] = [79, 122, 85];
  let score = -1;
  for (const p of palette) {
    const [, s, l] = rgbToHsl(...p.rgb);
    const sc = s * Math.sqrt(p.weight + 0.05) * (l > 0.15 && l < 0.8 ? 1 : 0.3);
    if (sc > score) {
      score = sc;
      best = p.rgb;
    }
  }
  const [h, s, l] = rgbToHsl(...best);
  // boost saturation, keep mid luminance for a strong CTA
  const ss = Math.min(0.85, Math.max(0.45, s * 1.25));
  const ll = Math.min(0.52, Math.max(0.36, l));
  return hslToHex(h, ss, ll);
}

function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export function buildHeuristicAnalysis(stats: PixelStats): ArtDirectorAnalysis {
  const dom = stats.palette[0]?.rgb ?? [180, 160, 140];
  const [h, s, l] = rgbToHsl(...dom);
  const colour = hueName(h, s, l);
  const shape =
    stats.aspect > 2.1 ? 'Tall Bottle' : stats.aspect > 1.45 ? 'Bottle / Can' : stats.aspect > 0.8 ? 'Jar / Box' : 'Wide Pack / Pouch';
  const finish =
    stats.highlightFrac > 0.025 && stats.contrast > 0.45
      ? stats.meanSat < 0.18
        ? 'brushed metal with specular highlights'
        : 'glossy glass with specular highlights'
      : stats.meanSat < 0.15
        ? 'matte coated packaging'
        : 'satin printed packaging';
  const material = `${colour[0].toUpperCase()}${colour.slice(1)} ${finish}`;
  const dark = l < 0.35;
  const base = dark ? STUDIO_PRESETS.slate : stats.meanSat > 0.35 ? STUDIO_PRESETS.linen : STUDIO_PRESETS.marble;
  const presets = [base, ...[STUDIO_PRESETS.linen, STUDIO_PRESETS.marble, STUDIO_PRESETS.slate].filter((p) => p !== base)].map(
    (p) => ({ id: p.id, title: p.title, prompt: p.prompt }),
  );
  const headlines: Record<string, string> = {
    'Tall Bottle': 'Pure Ritual, Bottled.',
    'Bottle / Can': 'Crafted to Stand Out.',
    'Jar / Box': 'Small Batch. Big Taste.',
    'Wide Pack / Pouch': 'Everyday, Elevated.',
  };
  return {
    productCategory: `Consumer Product · ${shape}`,
    detectedMaterial: material,
    lightingVector: stats.lighting,
    spatialScenePrompt: composeScenePrompt(base.prompt.split(',').slice(0, 3).join(','), stats.lighting, material),
    suggestedPresets: presets,
    adCopy: {
      headline: headlines[shape],
      subheadline: `Studio-quality ${colour} finish, photographed true to label.`,
      ctaText: 'Shop Now',
      accentColorHex: pickAccent(stats.palette),
    },
  };
}

export async function analyzeHeuristic(masks: HierarchicalMasks): Promise<ArtDirectorAnalysis> {
  return buildHeuristicAnalysis(await analyzePixels(masks));
}

async function smallJpeg(url: string, max = 640): Promise<string> {
  const img = await loadImage(url);
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = createCanvas(img.naturalWidth * s, img.naturalHeight * s);
  ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

export async function analyzeFree(masks: HierarchicalMasks): Promise<StepOutput<ArtDirectorAnalysis>> {
  const heuristic = await analyzeHeuristic(masks);
  try {
    const res = await fetch('/api/art-director', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl: await smallJpeg(masks.originalImageUrl), heuristic }),
    });
    const json = (await res.json()) as {
      source: 'llm' | 'heuristic';
      engine?: string;
      analysis?: unknown;
      note?: string;
    };
    if (json.source === 'llm' && json.analysis) {
      const merged = mergeArtDirector(heuristic, json.analysis);
      return { data: merged, engine: json.engine ?? 'Meta Llama Vision', fallback: false, costUsd: 0, note: json.note };
    }
    return {
      data: heuristic,
      engine: 'Luminance Gradient Analyzer',
      fallback: false,
      costUsd: 0,
      note: json.note ?? 'No FREE_VISION_API_KEY configured - deterministic analyzer used',
    };
  } catch (err) {
    return {
      data: heuristic,
      engine: 'Luminance Gradient Analyzer',
      fallback: true,
      costUsd: 0,
      note: `Vision LLM unreachable (${(err as Error).message})`,
    };
  }
}

