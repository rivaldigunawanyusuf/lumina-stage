/**
 * Low-level canvas / image helpers shared by providers and the compositor.
 * Browser-only (uses DOM canvas).
 */

export type Box = { x: number; y: number; width: number; height: number };

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function ctx2d(
  canvas: HTMLCanvasElement,
  opts: CanvasRenderingContext2DSettings = {},
): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', opts);
  if (!ctx) throw new Error('2D canvas context unavailable');
  return ctx;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

export async function imageToCanvas(src: string | CanvasImageSource): Promise<HTMLCanvasElement> {
  const img = typeof src === 'string' ? await loadImage(src) : src;
  const { width, height } = sourceSize(img);
  const c = createCanvas(width, height);
  ctx2d(c).drawImage(img, 0, 0, width, height);
  return c;
}

export function sourceSize(src: CanvasImageSource): { width: number; height: number } {
  if (src instanceof HTMLImageElement) return { width: src.naturalWidth, height: src.naturalHeight };
  if (src instanceof HTMLVideoElement) return { width: src.videoWidth, height: src.videoHeight };
  if ('width' in src && 'height' in src) {
    const w = (src as { width: number | SVGAnimatedLength }).width;
    const h = (src as { height: number | SVGAnimatedLength }).height;
    return {
      width: typeof w === 'number' ? w : w.baseVal.value,
      height: typeof h === 'number' ? h : h.baseVal.value,
    };
  }
  return { width: 0, height: 0 };
}

/** Read a user File, normalise orientation and downscale to `maxEdge`. */
export async function fileToDataUrl(file: File, maxEdge = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const c = createCanvas(bitmap.width * scale, bitmap.height * scale);
  const ctx = ctx2d(c);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c.toDataURL('image/png');
}

/**
 * Normalise any mask image (white-on-black luminance OR alpha) into a canvas
 * whose ALPHA channel carries the mask and RGB is white.
 */
export function maskToAlpha(src: CanvasImageSource, width?: number, height?: number): HTMLCanvasElement {
  const size = sourceSize(src);
  const w = width ?? size.width;
  const h = height ?? size.height;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c, { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const a = d[i + 3] / 255;
    const v = Math.round(luma * a * 255);
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Convert an alpha mask canvas back into an opaque white-on-black PNG data URL (contract format). */
export function alphaToMaskDataUrl(alpha: HTMLCanvasElement): string {
  const c = createCanvas(alpha.width, alpha.height);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(alpha, 0, 0);
  return c.toDataURL('image/png');
}

/** Tight bounding box of alpha > threshold. */
export function alphaBoundingBox(alpha: HTMLCanvasElement, threshold = 24): Box {
  const ctx = ctx2d(alpha, { willReadFrequently: true });
  const { width: w, height: h } = alpha;
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width: w, height: h };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Image × alpha mask → transparent cutout (same size as the image). */
export function applyAlpha(image: CanvasImageSource, alpha: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(alpha.width, alpha.height);
  const ctx = ctx2d(c);
  ctx.drawImage(image, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(alpha, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

export function cropCanvas(src: CanvasImageSource, box: Box): HTMLCanvasElement {
  const c = createCanvas(box.width, box.height);
  ctx2d(c).drawImage(src, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
  return c;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [255, 244, 224];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Average colour of a region (sampled at low res). */
export function averageColor(src: CanvasImageSource, box?: Box): [number, number, number] {
  const size = sourceSize(src);
  const b = box ?? { x: 0, y: 0, width: size.width, height: size.height };
  const c = createCanvas(16, 16);
  const ctx = ctx2d(c, { willReadFrequently: true });
  ctx.drawImage(src, b.x, b.y, Math.max(1, b.width), Math.max(1, b.height), 0, 0, 16, 16);
  const d = ctx.getImageData(0, 0, 16, 16).data;
  let r = 0,
    g = 0,
    bl = 0,
    n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    r += d[i] * a;
    g += d[i + 1] * a;
    bl += d[i + 2] * a;
    n += a;
  }
  if (n === 0) return [128, 128, 128];
  return [r / n, g / n, bl / n];
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function newJobId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `job_${Date.now().toString(36)}_${rnd}`;
}

