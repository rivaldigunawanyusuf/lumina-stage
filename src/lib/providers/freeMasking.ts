/**
 * Local hierarchical pixel masking refinement.
 *
 * Layer 1 (silhouette):
 *   Border-seeded colour region growing, largest component isolation,
 *   morphological opening, and edge feathering.
 *
 * Layer 2 (brand-safe zone): inner erosion of the silhouette intersected with
 * the band of highest Sobel "text energy" - where labels and typography live.
 * The user then refines it with the Protect/Erase brush.
 */
import type { HierarchicalMasks } from '@/types/lumina';
import {
  alphaBoundingBox,
  alphaToMaskDataUrl,
  createCanvas,
  ctx2d,
  loadImage,
  type Box,
} from '@/lib/imaging/canvas';
import type { StepOutput } from './types';

const MODEL_ID = process.env.NEXT_PUBLIC_FREE_SEGMENTATION_MODEL || 'local-sobel-v1';
const TRANSFORMERS_CDN =
  process.env.NEXT_PUBLIC_TRANSFORMERS_CDN || '';
const ML_TIMEOUT_MS = 12_000;
const WORK_MAX = 512;

export type MaskingProgress = (msg: string) => void;

// ─────────────────────────── ML segmentation (transformers.js) ───────────────────────────

type TransformersModule = {
  AutoModel: { from_pretrained(id: string, opts?: Record<string, unknown>): Promise<TModel> };
  AutoProcessor: { from_pretrained(id: string, opts?: Record<string, unknown>): Promise<TProcessor> };
  RawImage: { fromURL(url: string): Promise<unknown> };
  env: { allowLocalModels: boolean };
};
type TTensor = { data: Float32Array | Uint8Array; dims: number[] };
type TModel = ((inputs: Record<string, unknown>) => Promise<Record<string, TTensor>>) & {
  sessions?: Record<string, { inputNames?: string[] }>;
};
type TProcessor = (image: unknown) => Promise<{ pixel_values: unknown }>;

let mlPromise: Promise<{ model: TModel; processor: TProcessor; T: TransformersModule }> | null = null;

// Runtime import that the bundler cannot see or rewrite.
const runtimeImport = new Function('u', 'return import(u)') as (u: string) => Promise<TransformersModule>;

async function loadMl(onProgress?: MaskingProgress) {
  if (!mlPromise) {
    mlPromise = (async () => {
      onProgress?.('Loading transformers.js runtime…');
      const T = await runtimeImport(TRANSFORMERS_CDN);
      T.env.allowLocalModels = false;
      onProgress?.(`Downloading ${MODEL_ID} (cached after first run)…`);
      const isRmbg = /RMBG-1\.4/i.test(MODEL_ID);
      const model = await T.AutoModel.from_pretrained(MODEL_ID, isRmbg ? { config: { model_type: 'custom' } } : {});
      const processor = await T.AutoProcessor.from_pretrained(
        MODEL_ID,
        isRmbg
          ? {
              config: {
                do_normalize: true,
                do_pad: false,
                do_rescale: true,
                do_resize: true,
                image_mean: [0.5, 0.5, 0.5],
                feature_extractor_type: 'ImageFeatureExtractor',
                image_std: [1, 1, 1],
                resample: 2,
                rescale_factor: 0.00392156862745098,
                size: { width: 1024, height: 1024 },
              },
            }
          : {},
      );
      return { model, processor, T };
    })();
    mlPromise.catch(() => {
      mlPromise = null;
    });
  }
  return mlPromise;
}

async function segmentWithMl(imageUrl: string, width: number, height: number, onProgress?: MaskingProgress) {
  const { model, processor, T } = await loadMl(onProgress);
  onProgress?.('Running segmentation model…');
  const image = await T.RawImage.fromURL(imageUrl);
  const { pixel_values } = await processor(image);
  const inputName = model.sessions?.model?.inputNames?.[0] ?? 'input';
  const outputs = await model({ [inputName]: pixel_values });
  const tensor = Object.values(outputs)[0];
  const dims = tensor.dims;
  const mh = dims[dims.length - 2];
  const mw = dims[dims.length - 1];
  const data = tensor.data;
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < mw * mh; i++) {
    const v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const needsSigmoid = min < -0.01 || max > 1.01;
  const small = createCanvas(mw, mh);
  const sctx = ctx2d(small);
  const img = sctx.createImageData(mw, mh);
  for (let i = 0; i < mw * mh; i++) {
    let v = data[i];
    if (needsSigmoid) v = 1 / (1 + Math.exp(-v));
    const a = Math.round(Math.min(1, Math.max(0, v)) * 255);
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = a;
  }
  sctx.putImageData(img, 0, 0);
  const full = createCanvas(width, height);
  const fctx = ctx2d(full);
  fctx.imageSmoothingQuality = 'high';
  fctx.drawImage(small, 0, 0, width, height);
  return full;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ─────────────────────────── Offline colour-key segmentation ───────────────────────────

/**
 * Scanline-aware border flood-fill foreground extractor.
 * Models each row's background as a linear colour interpolation between the
 * left and right image borders on that same scanline, so wall/table horizons
 * and directional window-light falloffs are cleanly removed even offline.
 */
function colorKeyForeground(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const N = w * h;
  const B = Math.max(2, Math.round(Math.min(w, h) * 0.015));

  // Estimate left and right border RGB for every row y
  const rowLeft = new Float32Array(h * 3);
  const rowRight = new Float32Array(h * 3);
  for (let y = 0; y < h; y++) {
    let lr = 0,
      lg = 0,
      lb = 0,
      rr = 0,
      rg = 0,
      rb = 0;
    for (let x = 0; x < B; x++) {
      const il = (y * w + x) * 4;
      lr += rgba[il];
      lg += rgba[il + 1];
      lb += rgba[il + 2];
      const ir = (y * w + (w - 1 - x)) * 4;
      rr += rgba[ir];
      rg += rgba[ir + 1];
      rb += rgba[ir + 2];
    }
    rowLeft[y * 3] = lr / B;
    rowLeft[y * 3 + 1] = lg / B;
    rowLeft[y * 3 + 2] = lb / B;
    rowRight[y * 3] = rr / B;
    rowRight[y * 3 + 1] = rg / B;
    rowRight[y * 3 + 2] = rb / B;
  }

  const rowBgDist = (idx: number): number => {
    const x = idx % w;
    const y = (idx / w) | 0;
    const t = w > 1 ? x / (w - 1) : 0;
    const er = rowLeft[y * 3] * (1 - t) + rowRight[y * 3] * t;
    const eg = rowLeft[y * 3 + 1] * (1 - t) + rowRight[y * 3 + 1] * t;
    const eb = rowLeft[y * 3 + 2] * (1 - t) + rowRight[y * 3 + 2] * t;
    const dr = rgba[idx * 4] - er;
    const dg = rgba[idx * 4 + 1] - eg;
    const db = rgba[idx * 4 + 2] - eb;
    return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db) * 1.6;
  };

  const tLocal = 22;
  const tRowBg = 34;

  const isBg = new Uint8Array(N);
  const queue = new Int32Array(N);
  let qh = 0,
    qt = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < B || y < B || x >= w - B || y >= h - B) {
        const i = y * w + x;
        if (!isBg[i] && rowBgDist(i) < tRowBg * 1.35) {
          isBg[i] = 1;
          queue[qt++] = i;
        }
      }
    }
  }

  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w;
    const y = (i / w) | 0;
    const nbrs = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const n of nbrs) {
      if (n < 0 || isBg[n]) continue;
      if (colorDist(rgba, i, n) < tLocal && rowBgDist(n) < tRowBg) {
        isBg[n] = 1;
        queue[qt++] = n;
      }
    }
  }

  const fg = new Uint8Array(N);
  for (let i = 0; i < N; i++) fg[i] = isBg[i] ? 0 : 1;
  return largestComponent(open(fg, w, h, 2), w, h);
}

function colorDist(d: Uint8ClampedArray, a: number, b: number) {
  const dr = d[a * 4] - d[b * 4];
  const dg = d[a * 4 + 1] - d[b * 4 + 1];
  const db = d[a * 4 + 2] - d[b * 4 + 2];
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db) * 1.6;
}

/** Box-filter erosion (r>0) / dilation (r<0) of a binary map via integral image - O(N). */
export function morph(bin: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const rad = Math.abs(Math.round(r));
  if (rad === 0) return bin.slice();
  const erode = r > 0;
  const I = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += bin[y * w + x];
      I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - rad),
      y1 = Math.min(h - 1, y + rad);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - rad),
        x1 = Math.min(w - 1, x + rad);
      const sum = I[(y1 + 1) * (w + 1) + x1 + 1] - I[y0 * (w + 1) + x1 + 1] - I[(y1 + 1) * (w + 1) + x0] + I[y0 * (w + 1) + x0];
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      out[y * w + x] = erode ? (sum === area ? 1 : 0) : sum > 0 ? 1 : 0;
    }
  }
  return out;
}

function open(bin: Uint8Array, w: number, h: number, r: number) {
  return morph(morph(bin, w, h, r), w, h, -r);
}

function largestComponent(bin: Uint8Array, w: number, h: number): Uint8Array {
  const N = w * h;
  const label = new Int32Array(N);
  const stack = new Int32Array(N);
  let best = 0,
    bestSize = 0,
    cur = 0;
  for (let s = 0; s < N; s++) {
    if (!bin[s] || label[s]) continue;
    cur++;
    let sp = 0,
      size = 0;
    stack[sp++] = s;
    label[s] = cur;
    while (sp) {
      const i = stack[--sp];
      size++;
      const x = i % w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const n of nb) {
        if (n >= 0 && n < N && bin[n] && !label[n]) {
          label[n] = cur;
          stack[sp++] = n;
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = cur;
    }
  }
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) out[i] = label[i] === best ? 1 : 0;
  return out;
}

function binaryToAlphaCanvas(bin: Uint8Array, w: number, h: number, outW: number, outH: number, feather = true) {
  const small = createCanvas(w, h);
  const sctx = ctx2d(small);
  const img = sctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = bin[i] ? 255 : 0;
  }
  sctx.putImageData(img, 0, 0);
  const full = createCanvas(outW, outH);
  const fctx = ctx2d(full);
  fctx.imageSmoothingEnabled = feather;
  fctx.imageSmoothingQuality = 'high';
  fctx.drawImage(small, 0, 0, outW, outH);
  return full;
}

function readWorking(src: CanvasImageSource, w: number, h: number) {
  const c = createCanvas(w, h);
  const ctx = ctx2d(c, { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

function alphaToBinary(alpha: HTMLCanvasElement, w: number, h: number, thr = 128): Uint8Array {
  const d = readWorking(alpha, w, h);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = d[i * 4 + 3] >= thr ? 1 : 0;
  return out;
}

// ─────────────────────────── Auto brand-safe (label) mask ───────────────────────────

/**
 * Inner erosion of the silhouette ∩ band of maximal Sobel text energy.
 * Returns an alpha canvas at full resolution.
 */
export function autoBrandSafeMask(original: CanvasImageSource, silAlpha: HTMLCanvasElement): HTMLCanvasElement {
  const W = silAlpha.width;
  const H = silAlpha.height;
  const s = Math.min(1, WORK_MAX / Math.max(W, H));
  const w = Math.max(8, Math.round(W * s));
  const h = Math.max(8, Math.round(H * s));
  const sil = alphaToBinary(silAlpha, w, h);
  // bbox at working res
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (sil[y * w + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return createCanvas(W, H);
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const inner = morph(sil, w, h, Math.max(2, Math.round(Math.min(bw, bh) * 0.07)));

  // Sobel energy of luminance
  const px = readWorking(original, w, h);
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const rowE = new Float32Array(h);
  const colE = new Float32Array(w);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!inner[i]) continue;
      const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1];
      const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
      const m = Math.sqrt(gx * gx + gy * gy);
      const e = m > 40 ? m : 0; // keep strong (glyph-like) edges only
      rowE[y] += e;
      colE[x] += e;
    }
  }
  const band = energyBand(rowE, minY + bh * 0.12, maxY - bh * 0.04, bh * 0.22, [minY + bh * 0.3, minY + bh * 0.86]);
  const cols = energyBand(colE, minX, maxX, bw * 0.4, [minX + bw * 0.1, minX + bw * 0.9]);
  const pad = Math.round(bh * 0.02);
  const y0 = Math.max(minY, Math.floor(band[0]) - pad);
  const y1 = Math.min(maxY, Math.ceil(band[1]) + pad);
  const x0 = Math.max(minX, Math.floor(cols[0]) - pad);
  const x1 = Math.min(maxX, Math.ceil(cols[1]) + pad);
  const out = new Uint8Array(w * h);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out[y * w + x] = inner[y * w + x];
  return binaryToAlphaCanvas(out, w, h, W, H);
}

/** Smallest window containing the central 84% of energy mass, with fallbacks. */
function energyBand(E: Float32Array, lo: number, hi: number, minLen: number, fallback: [number, number]): [number, number] {
  const a = Math.max(0, Math.floor(lo));
  const b = Math.min(E.length - 1, Math.ceil(hi));
  let total = 0;
  for (let i = a; i <= b; i++) total += E[i];
  if (total <= 0 || b <= a) return fallback;
  let acc = 0,
    start = a,
    end = b;
  for (let i = a; i <= b; i++) {
    acc += E[i];
    if (acc >= total * 0.08) {
      start = i;
      break;
    }
  }
  acc = 0;
  for (let i = b; i >= a; i--) {
    acc += E[i];
    if (acc >= total * 0.08) {
      end = i;
      break;
    }
  }
  if (end - start < minLen) {
    const mid = (start + end) / 2;
    start = Math.max(a, mid - minLen / 2);
    end = Math.min(b, mid + minLen / 2);
  }
  return [start, end];
}

// ─────────────────────────── Public API ───────────────────────────

async function finalize(
  imageUrl: string,
  original: HTMLImageElement,
  silAlpha: HTMLCanvasElement,
): Promise<HierarchicalMasks> {
  const brandSafe = autoBrandSafeMask(original, silAlpha);
  const bbox: Box = alphaBoundingBox(silAlpha, 100);
  return {
    originalImageUrl: imageUrl,
    productSilhouetteMaskUrl: alphaToMaskDataUrl(silAlpha),
    brandSafeZoneMaskUrl: alphaToMaskDataUrl(brandSafe),
    boundingBox: bbox,
  };
}

/** Deterministic, offline, instant segmentation. */
export async function segmentOffline(imageUrl: string): Promise<StepOutput<HierarchicalMasks>> {
  const original = await loadImage(imageUrl);
  const W = original.naturalWidth;
  const H = original.naturalHeight;
  const s = Math.min(1, WORK_MAX / Math.max(W, H));
  const w = Math.round(W * s);
  const h = Math.round(H * s);
  const fg = colorKeyForeground(readWorking(original, w, h), w, h);
  const silAlpha = binaryToAlphaCanvas(fg, w, h, W, H);
  return {
    data: await finalize(imageUrl, original, silAlpha),
    engine: 'Canvas colour-key segmentation',
    fallback: true,
    costUsd: 0,
  };
}

export async function segmentFree(imageUrl: string, onProgress?: MaskingProgress): Promise<StepOutput<HierarchicalMasks>> {
  onProgress?.('Extracting high-resolution product silhouette and label masks…');
  return segmentOffline(imageUrl);
}

