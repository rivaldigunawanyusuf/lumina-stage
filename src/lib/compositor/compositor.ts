/**
 * LuminaStage 5-Layer Canvas + WebGL Compositing Engine (Performance-Optimized).
 *
 * Strict 5-Layer Compositing Order (per PRD §4.3 & Master Prompt):
 *   Layer 1: Generated Studio Background (center-weighted smart crop per ratio).
 *   Layer 2: Directional Drop Shadow (Δx = -d·cosθ·cotφ, Δy = -d·sinθ·cotφ)
 *            + Dual-Kernel Ambient Contact Shadow under the product base.
 *   Layer 3: Segmented Product Silhouette + Directional Relight + WebGL Edge
 *            Light-Wrapping (2-4px outer rim blended with `warmthHex`).
 *   Layer 4: IMMUTABLE BRAND-SAFE PIXEL-LOCK LAYER - re-stamps the exact raw
 *            pixels from `originalImageUrl` masked by `brandSafeZoneMaskUrl`
 *            with identity filter so 100% of typography & logos remain untouched.
 *   Layer 5: Smart Responsive Typography & CTA Badge Layer (disjoint from the
 *            product bounding box across 1:1, 9:16, and 4:5).
 *
 * Performance Caching:
 * - Lit product + WebGL edge light-wrap is cached per `lightingKey` on
 *   `PreparedCompositorAssets` so all 3 artboards share 1 WebGL pass per lighting
 *   change, and Inspector split drags / Ad Copy edits trigger 0 WebGL passes.
 * - Blurred quarter-res shadows are cached per `(ratio, lightingKey)`.
 */
import type { AdCopyConfig, LightingVector, LuminaPipelineResult } from '@/types/lumina';
import {
  alphaBoundingBox,
  alphaToMaskDataUrl,
  applyAlpha,
  averageColor,
  clamp,
  contrastRatio,
  createCanvas,
  cropCanvas,
  ctx2d,
  hexToRgb,
  loadImage,
  maskToAlpha,
  relativeLuminance,
  type Box,
} from '@/lib/imaging/canvas';
import { computeShadowProjection } from './math';
import { gaussianBlurCanvas, renderEdgeLightWrap } from './webglEffects';
import { solveArtboardLayout, type AspectRatioId, type SolvedArtboardLayout } from './layout';

export interface PreparedCompositorAssets {
  jobId: string;
  original: HTMLImageElement;
  background: HTMLImageElement;
  /** Full-res normalized silhouette alpha mask (white + alpha). */
  silAlphaFull: HTMLCanvasElement;
  /** Full-res normalized brand-safe alpha mask (mutable via interactive brush). */
  lockAlphaFull: HTMLCanvasElement;
  /** Tight crop box around silhouette (+ small padding). */
  cropBox: Box;
  /** Cropped silhouette alpha. */
  silAlphaCrop: HTMLCanvasElement;
  /** Cropped product cutout (`original ⊙ silAlpha`). */
  cutoutCrop: HTMLCanvasElement;
  /** Cropped immutable brand-safe pixel stamp (`original ⊙ lockAlpha`). */
  lockStampCrop: HTMLCanvasElement;
  /** Pre-tinted emerald overlay of `lockStampCrop` for diagnostic highlight. */
  lockHighlightCrop: HTMLCanvasElement;
  /** Simulated warped "Naive AI Inpainting" product crop for the Inspector split view. */
  warpedCutoutCrop: HTMLCanvasElement;
  /** Average RGB of the studio background for ambient light-wrap harmonisation. */
  bgAvgRgb: [number, number, number];
  /** Top luminance of the background for Layer 5 contrast calculation. */
  topBgIsLight: boolean;
  /** Internal memoization caches for 60fps interaction. */
  _cache: {
    lightingKey: string;
    rimCanvas: HTMLCanvasElement;
    litCleanProduct: HTMLCanvasElement;
    litWarpedProduct: HTMLCanvasElement;
    warpedLightingKey: string;
    shadowsByRatio: Partial<Record<AspectRatioId, { key: string; raw: HTMLCanvasElement; blurred: HTMLCanvasElement }>>;
  };
}

export interface CompositorRenderOptions {
  lighting: LightingVector;
  adCopy: AdCopyConfig;
  /** Whether Layer 4 (Immutable Brand-Safe Pixel-Lock) is enabled. Default: true. */
  pixelLockEnabled?: boolean;
  /** Whether to show the Before/After Brand-Safety Inspector split slider. */
  inspectorEnabled?: boolean;
  /** Split position 0..1 (left = Standard AI Distortion, right = LuminaStage Pixel-Locked). */
  inspectorSplit?: number;
  /** Optional debug overlay of the brand-safe zone on the artboard. */
  highlightBrandSafeZone?: boolean;
  /** Layer 1 Studio Backdrop visibility. Default: true. */
  showBackdropLayer?: boolean;
  /** Layer 2 Directional Drop & Contact Shadow visibility. Default: true. */
  showShadowLayer?: boolean;
  /** Layer 3 WebGL Edge Light-Wrap & Relighting visibility. Default: true. */
  showLightWrapLayer?: boolean;
  /** Layer 5 Multi-Ratio Typography & CTA visibility. Default: true. */
  showCopyLayer?: boolean;
  /** Optional Social UI & Safe-Zone overlay guides (Step 3). Default: false. */
  showSafeZonesOverlay?: boolean;
}

function buildLockHighlight(lockStampCrop: HTMLCanvasElement): HTMLCanvasElement {
  const tint = createCanvas(lockStampCrop.width, lockStampCrop.height);
  const tctx = ctx2d(tint);
  tctx.drawImage(lockStampCrop, 0, 0);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = 'rgba(16, 185, 129, 0.30)';
  tctx.fillRect(0, 0, tint.width, tint.height);
  tctx.globalCompositeOperation = 'source-over';
  return tint;
}

/**
 * Decode all URLs from `LuminaPipelineResult` into ready-to-composite canvas buffers.
 */
export async function prepareCompositorAssets(
  result: LuminaPipelineResult,
): Promise<PreparedCompositorAssets> {
  const [original, silImg, lockImg, background] = await Promise.all([
    loadImage(result.masks.originalImageUrl),
    loadImage(result.masks.productSilhouetteMaskUrl),
    loadImage(result.masks.brandSafeZoneMaskUrl),
    loadImage(result.generatedBackgroundUrl),
  ]);

  const W = original.naturalWidth;
  const H = original.naturalHeight;
  const silAlphaFull = maskToAlpha(silImg, W, H);
  const lockAlphaFull = maskToAlpha(lockImg, W, H);

  // Clip lockAlphaFull to silAlphaFull so brand-safe mask never spills outside the product
  const lctx = ctx2d(lockAlphaFull);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(silAlphaFull, 0, 0);
  lctx.globalCompositeOperation = 'source-over';

  const rawBox = alphaBoundingBox(silAlphaFull, 20);
  const pad = 8;
  const x = Math.max(0, rawBox.x - pad);
  const y = Math.max(0, rawBox.y - pad);
  const width = Math.min(W - x, rawBox.width + pad * 2);
  const height = Math.min(H - y, rawBox.height + pad * 2);
  const cropBox: Box = { x, y, width, height };

  const silAlphaCrop = cropCanvas(silAlphaFull, cropBox);
  const cutoutFull = applyAlpha(original, silAlphaFull);
  const cutoutCrop = cropCanvas(cutoutFull, cropBox);

  const lockStampFull = applyAlpha(original, lockAlphaFull);
  const lockStampCrop = cropCanvas(lockStampFull, cropBox);
  const lockHighlightCrop = buildLockHighlight(lockStampCrop);

  const warpedCutoutCrop = buildWarpedAiSimulation(cutoutCrop, silAlphaCrop);
  const bgAvgRgb = averageColor(background);

  const topSampleBox: Box = {
    x: 0,
    y: 0,
    width: background.naturalWidth,
    height: Math.round(background.naturalHeight * 0.28),
  };
  const topBgIsLight = relativeLuminance(averageColor(background, topSampleBox)) > 0.42;

  return {
    jobId: result.jobId,
    original,
    background,
    silAlphaFull,
    lockAlphaFull,
    cropBox,
    silAlphaCrop,
    cutoutCrop,
    lockStampCrop,
    lockHighlightCrop,
    warpedCutoutCrop,
    bgAvgRgb,
    topBgIsLight,
    _cache: {
      lightingKey: '',
      rimCanvas: createCanvas(cropBox.width, cropBox.height),
      litCleanProduct: createCanvas(cropBox.width, cropBox.height),
      litWarpedProduct: createCanvas(cropBox.width, cropBox.height),
      warpedLightingKey: '',
      shadowsByRatio: {},
    },
  };
}

/**
 * Rebuild `lockStampCrop` and return the updated `brandSafeZoneMaskUrl` after a
 * user brush stroke modifies `assets.lockAlphaFull`.
 */
export function refreshBrandSafeStamp(assets: PreparedCompositorAssets): string {
  const lctx = ctx2d(assets.lockAlphaFull);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(assets.silAlphaFull, 0, 0);
  lctx.globalCompositeOperation = 'source-over';

  const lockStampFull = applyAlpha(assets.original, assets.lockAlphaFull);
  assets.lockStampCrop = cropCanvas(lockStampFull, assets.cropBox);
  assets.lockHighlightCrop = buildLockHighlight(assets.lockStampCrop);
  return alphaToMaskDataUrl(assets.lockAlphaFull);
}

/**
 * Simulates the characteristic packaging text distortion / melting produced by
 * standard diffusion img2img / inpainting pipelines when re-rendering a product.
 */
function buildWarpedAiSimulation(
  cutoutCrop: HTMLCanvasElement,
  silAlphaCrop: HTMLCanvasElement,
): HTMLCanvasElement {
  const w = cutoutCrop.width;
  const h = cutoutCrop.height;
  const srcCtx = ctx2d(cutoutCrop, { willReadFrequently: true });
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const warped = createCanvas(w, h);
  const wctx = ctx2d(warped);
  const outImg = wctx.createImageData(w, h);
  const dst = outImg.data;

  const ampX = Math.max(3.5, w * 0.018);
  const ampY = Math.max(2.2, h * 0.008);

  for (let y = 0; y < h; y++) {
    const waveX = Math.sin((y / h) * Math.PI * 14) * ampX + Math.cos((y / h) * Math.PI * 29) * (ampX * 0.45);
    for (let x = 0; x < w; x++) {
      const waveY = Math.sin((x / w) * Math.PI * 10 + y * 0.05) * ampY;
      const sx = clamp(Math.round(x + waveX * Math.sin((x / w) * Math.PI)), 0, w - 1);
      const sy = clamp(Math.round(y + waveY), 0, h - 1);
      const si = (sy * w + sx) * 4;
      const di = (y * w + x) * 4;
      dst[di] = clamp(srcData[si] * 1.05 - 6, 0, 255);
      dst[di + 1] = clamp(srcData[si + 1] * 0.98, 0, 255);
      dst[di + 2] = clamp(srcData[si + 2] * 0.93 + 8, 0, 255);
      dst[di + 3] = srcData[si + 3];
    }
  }
  wctx.putImageData(outImg, 0, 0);

  const out = createCanvas(w, h);
  const octx = ctx2d(out);
  octx.filter = 'blur(1.2px)';
  octx.drawImage(warped, 0, 0);
  octx.filter = 'none';
  octx.globalCompositeOperation = 'destination-in';
  octx.drawImage(silAlphaCrop, 0, 0);
  octx.globalCompositeOperation = 'source-over';
  return out;
}

function lightingCacheKey(lv: LightingVector): string {
  return `${Math.round(lv.azimuthDegrees)}_${Math.round(lv.elevationDegrees)}_${Math.round(lv.intensity * 100)}_${lv.warmthHex}`;
}

// ─────────────────────────── Layer Renderers ───────────────────────────

function drawLayer1Background(
  ctx: CanvasRenderingContext2D,
  bg: HTMLImageElement,
  W: number,
  H: number,
) {
  const bw = bg.naturalWidth || 1024;
  const bh = bg.naturalHeight || 1024;
  const scale = Math.max(W / bw, H / bh);
  const sw = W / scale;
  const sh = H / scale;
  const sx = (bw - sw) * 0.5;
  const sy = (bh - sh) * 0.56;
  ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, W, H);

  const vig = ctx.createRadialGradient(
    W * 0.5,
    H * 0.52,
    Math.min(W, H) * 0.28,
    W * 0.5,
    H * 0.52,
    Math.max(W, H) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawLayer2Shadows(
  ctx: CanvasRenderingContext2D,
  ratio: AspectRatioId,
  assets: PreparedCompositorAssets,
  productRect: Box,
  lighting: LightingVector,
) {
  const proj = computeShadowProjection(lighting, productRect.height);
  const baseX = productRect.x + productRect.width * 0.5;
  const baseY = productRect.y + productRect.height * 0.975;
  const lKey = lightingCacheKey(lighting);

  const qScale = 0.25;
  const qw = Math.max(64, Math.round(ctx.canvas.width * qScale));
  const qh = Math.max(64, Math.round(ctx.canvas.height * qScale));

  let entry = assets._cache.shadowsByRatio[ratio];
  if (!entry) {
    entry = {
      key: '',
      raw: createCanvas(qw, qh),
      blurred: createCanvas(qw, qh),
    };
    assets._cache.shadowsByRatio[ratio] = entry;
  }

  if (entry.key !== lKey) {
    if (entry.raw.width !== qw || entry.raw.height !== qh) {
      entry.raw.width = qw;
      entry.raw.height = qh;
    }
    const sctx = ctx2d(entry.raw);
    sctx.clearRect(0, 0, qw, qh);

    const rx = productRect.x * qScale;
    const ry = productRect.y * qScale;
    const rw = productRect.width * qScale;
    const rh = productRect.height * qScale;
    const qBaseY = baseY * qScale;

    const kx = proj.shearX;
    const ky = proj.shearY;
    sctx.save();
    sctx.setTransform(1, 0, -kx, -ky, kx * qBaseY, qBaseY * (1 + ky));
    sctx.drawImage(assets.silAlphaCrop, rx, ry, rw, rh);
    sctx.restore();

    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = '#0F0B08';
    sctx.fillRect(0, 0, qw, qh);
    sctx.globalCompositeOperation = 'source-over';

    gaussianBlurCanvas(entry.raw, proj.blurSigma, entry.blurred);
    entry.key = lKey;
  }

  ctx.save();
  ctx.globalAlpha = proj.castAlpha;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(entry.blurred, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  // Ambient contact shadow directly underneath the product base
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const contactRx = productRect.width * 0.46;
  const contactRy = Math.max(8, productRect.width * 0.065);
  ctx.translate(baseX, baseY);
  ctx.scale(1, contactRy / contactRx);
  const cg = ctx.createRadialGradient(0, 0, contactRx * 0.06, 0, 0, contactRx);
  cg.addColorStop(0, `rgba(12, 8, 5, ${proj.contactAlpha})`);
  cg.addColorStop(0.55, `rgba(12, 8, 5, ${proj.contactAlpha * 0.45})`);
  cg.addColorStop(1, 'rgba(12, 8, 5, 0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, contactRx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getLitProductCanvas(
  assets: PreparedCompositorAssets,
  lighting: LightingVector,
  useWarpedSource: boolean,
): HTMLCanvasElement {
  const lKey = lightingCacheKey(lighting);
  const { height: h } = assets.cutoutCrop;
  const proj = computeShadowProjection(lighting, h);
  const I = clamp(lighting.intensity, 0, 1);

  // Ensure shared rim light-wrap + clean lit product are up to date for this lightingKey
  if (assets._cache.lightingKey !== lKey) {
    renderEdgeLightWrap({
      silAlpha: assets.silAlphaCrop,
      lightDirScreen: proj.lightDirScreen,
      warmthHex: lighting.warmthHex,
      bgAvgRgb: assets.bgAvgRgb,
      intensity: I,
      rimWidthPx: 3.4,
      targetCanvas: assets._cache.rimCanvas,
    });

    composeRelitProductBuffer(
      assets._cache.litCleanProduct,
      assets.cutoutCrop,
      assets._cache.rimCanvas,
      proj.lightDirScreen,
      lighting,
    );
    assets._cache.lightingKey = lKey;
  }

  if (!useWarpedSource) {
    return assets._cache.litCleanProduct;
  }

  if (assets._cache.warpedLightingKey !== lKey) {
    composeRelitProductBuffer(
      assets._cache.litWarpedProduct,
      assets.warpedCutoutCrop,
      assets._cache.rimCanvas,
      proj.lightDirScreen,
      lighting,
    );
    assets._cache.warpedLightingKey = lKey;
  }
  return assets._cache.litWarpedProduct;
}

function composeRelitProductBuffer(
  target: HTMLCanvasElement,
  sourceCutout: HTMLCanvasElement,
  rimCanvas: HTMLCanvasElement,
  lightDirScreen: [number, number],
  lighting: LightingVector,
) {
  const w = sourceCutout.width;
  const h = sourceCutout.height;
  if (target.width !== w || target.height !== h) {
    target.width = w;
    target.height = h;
  }
  const pctx = ctx2d(target);
  pctx.clearRect(0, 0, w, h);
  pctx.imageSmoothingQuality = 'high';
  pctx.drawImage(sourceCutout, 0, 0);

  const [lx, ly] = lightDirScreen;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const R = Math.hypot(w, h) * 0.5;
  const warm = hexToRgb(lighting.warmthHex);
  const I = clamp(lighting.intensity, 0, 1);

  pctx.globalCompositeOperation = 'source-atop';
  const relight = pctx.createLinearGradient(cx + lx * R, cy + ly * R, cx - lx * R, cy - ly * R);
  relight.addColorStop(0, `rgba(${warm[0]},${warm[1]},${warm[2]},${0.2 * I})`);
  relight.addColorStop(0.5, 'rgba(0,0,0,0)');
  relight.addColorStop(1, `rgba(8,10,16,${0.22 * I})`);
  pctx.fillStyle = relight;
  pctx.fillRect(0, 0, w, h);

  pctx.globalCompositeOperation = 'screen';
  pctx.drawImage(rimCanvas, 0, 0);
  pctx.globalCompositeOperation = 'source-over';
}

function drawLayer3ProductAndLightWrap(
  ctx: CanvasRenderingContext2D,
  assets: PreparedCompositorAssets,
  productRect: Box,
  lighting: LightingVector,
  useWarpedSource = false,
) {
  const prodBuf = getLitProductCanvas(assets, lighting, useWarpedSource);
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(prodBuf, productRect.x, productRect.y, productRect.width, productRect.height);
  ctx.restore();
}

function drawLayer4ImmutablePixelLock(
  ctx: CanvasRenderingContext2D,
  assets: PreparedCompositorAssets,
  productRect: Box,
  highlightBrandSafeZone = false,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    assets.lockStampCrop,
    productRect.x,
    productRect.y,
    productRect.width,
    productRect.height,
  );

  if (highlightBrandSafeZone) {
    ctx.drawImage(
      assets.lockHighlightCrop,
      productRect.x,
      productRect.y,
      productRect.width,
      productRect.height,
    );
  }
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${cur} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      cur = test;
    } else {
      lines.push(cur);
      cur = words[i];
    }
  }
  lines.push(cur);
  return lines.length > maxLines ? lines.slice(0, maxLines) : lines;
}

function drawLayer5TypographyAndCta(
  ctx: CanvasRenderingContext2D,
  assets: PreparedCompositorAssets,
  layout: SolvedArtboardLayout,
  adCopy: AdCopyConfig,
) {
  const { copyBox, ctaBox, canvasWidth: W } = layout;
  const isLightBg = assets.topBgIsLight;

  ctx.save();
  const scrim = ctx.createLinearGradient(0, 0, 0, copyBox.y + copyBox.height + 60);
  if (isLightBg) {
    scrim.addColorStop(0, 'rgba(255,255,255,0.62)');
    scrim.addColorStop(0.75, 'rgba(255,255,255,0.28)');
    scrim.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    scrim.addColorStop(0, 'rgba(8,10,15,0.68)');
    scrim.addColorStop(0.75, 'rgba(8,10,15,0.32)');
    scrim.addColorStop(1, 'rgba(8,10,15,0)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, copyBox.y + copyBox.height + 60);

  const primaryText = isLightBg ? '#0F141C' : '#F8FAFC';
  const secondaryText = isLightBg ? 'rgba(15,20,28,0.78)' : 'rgba(248,250,252,0.82)';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const centerX = copyBox.x + copyBox.width * 0.5;

  const headline = adCopy.headline.trim() || 'Studio Ready.';
  let headSize = layout.ratio === '9:16' ? 68 : 62;
  let headLines: string[] = [headline];
  while (headSize >= 36) {
    ctx.font = `800 ${headSize}px -apple-system, BlinkMacSystemFont, "Geist", "Inter", sans-serif`;
    headLines = wrapLines(ctx, headline, copyBox.width, 2);
    const widest = Math.max(...headLines.map((l) => ctx.measureText(l).width), 0);
    if (widest <= copyBox.width && headLines.length * headSize * 1.12 <= copyBox.height * 0.62) break;
    headSize -= 4;
  }

  let cursorY = copyBox.y;
  ctx.fillStyle = primaryText;
  ctx.shadowColor = isLightBg ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  for (const line of headLines) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += Math.round(headSize * 1.12);
  }

  const sub = adCopy.subheadline.trim();
  if (sub) {
    cursorY += 12;
    const subSize = layout.ratio === '9:16' ? 30 : 27;
    ctx.font = `500 ${subSize}px -apple-system, BlinkMacSystemFont, "Geist", "Inter", sans-serif`;
    ctx.fillStyle = secondaryText;
    ctx.shadowBlur = 8;
    const subLines = wrapLines(ctx, sub, copyBox.width * 0.92, 2);
    for (const line of subLines) {
      ctx.fillText(line, centerX, cursorY);
      cursorY += Math.round(subSize * 1.28);
    }
  }
  ctx.shadowBlur = 0;

  const ctaText = (adCopy.ctaText.trim() || 'Shop Now').toUpperCase();
  const ctaFontPx = layout.ratio === '9:16' ? 28 : 25;
  ctx.font = `700 ${ctaFontPx}px -apple-system, BlinkMacSystemFont, "Geist", "Inter", sans-serif`;
  const textW = ctx.measureText(ctaText).width;
  const pillW = clamp(Math.round(textW + 96), 240, ctaBox.width);
  const pillH = ctaBox.height;
  const pillX = Math.round(ctaBox.x + (ctaBox.width - pillW) * 0.5);
  const pillY = ctaBox.y;

  const accentRgb = hexToRgb(adCopy.accentColorHex);
  const whiteContrast = contrastRatio(accentRgb, [255, 255, 255]);
  const ctaLabelColor = whiteContrast >= 3.2 ? '#FFFFFF' : '#0B0F17';

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.32)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = adCopy.accentColorHex || '#4F7A55';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH * 0.5);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pillX + 1, pillY + 1, pillW - 2, pillH - 2, pillH * 0.5);
  ctx.stroke();

  ctx.fillStyle = ctaLabelColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${ctaText}  →`, pillX + pillW * 0.5, pillY + pillH * 0.52);

  ctx.restore();
}

/**
 * Render a complete 5-layer artboard for the given aspect ratio (`1:1`, `9:16`, or `4:5`).
 */
export function renderArtboard(
  targetCanvas: HTMLCanvasElement,
  ratio: AspectRatioId,
  assets: PreparedCompositorAssets,
  opts: CompositorRenderOptions,
): SolvedArtboardLayout {
  const layout = solveArtboardLayout(ratio, assets.cropBox.width, assets.cropBox.height);
  if (targetCanvas.width !== layout.canvasWidth || targetCanvas.height !== layout.canvasHeight) {
    targetCanvas.width = layout.canvasWidth;
    targetCanvas.height = layout.canvasHeight;
  }

  const ctx = ctx2d(targetCanvas);
  const W = layout.canvasWidth;
  const H = layout.canvasHeight;
  ctx.clearRect(0, 0, W, H);

  const inspectorOn = Boolean(opts.inspectorEnabled);
  const split = clamp(opts.inspectorSplit ?? 0.5, 0.05, 0.95);
  const pixelLockOn = opts.pixelLockEnabled ?? true;

  if (!inspectorOn) {
    // Layer 1: Studio Background
    if (opts.showBackdropLayer ?? true) {
      drawLayer1Background(ctx, assets.background, W, H);
    } else {
      ctx.fillStyle = assets.topBgIsLight ? '#F3F4F6' : '#111827';
      ctx.fillRect(0, 0, W, H);
    }

    // Layer 2: Directional Drop & Contact Shadow
    if (opts.showShadowLayer ?? true) {
      drawLayer2Shadows(ctx, ratio, assets, layout.productRect, opts.lighting);
    }

    drawLayer3ProductAndLightWrap(ctx, assets, layout.productRect, opts.lighting, false);
    if (pixelLockOn) {
      drawLayer4ImmutablePixelLock(ctx, assets, layout.productRect, opts.highlightBrandSafeZone);
    }
  } else {
    const splitX = Math.round(W * split);

    // Left clip: Plain Raw Unedited Photo (Before Studio Edit)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, H);
    ctx.clip();
    ctx.fillStyle = '#F7F6F2';
    ctx.fillRect(0, 0, W, H);
    const horizonY = Math.round(layout.productRect.y + layout.productRect.height * 0.9);
    ctx.fillStyle = '#EFECE6';
    ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.drawImage(
      assets.cutoutCrop,
      layout.productRect.x,
      layout.productRect.y,
      layout.productRect.width,
      layout.productRect.height,
    );
    ctx.restore();

    // Right clip: Full Studio Staged & Relit Scene (After Studio Edit)
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, W - splitX, H);
    ctx.clip();
    if (opts.showBackdropLayer ?? true) {
      drawLayer1Background(ctx, assets.background, W, H);
    } else {
      ctx.fillStyle = assets.topBgIsLight ? '#F3F4F6' : '#111827';
      ctx.fillRect(0, 0, W, H);
    }
    if (opts.showShadowLayer ?? true) {
      drawLayer2Shadows(ctx, ratio, assets, layout.productRect, opts.lighting);
    }
    drawLayer3ProductAndLightWrap(ctx, assets, layout.productRect, opts.lighting, false);
    if (pixelLockOn) {
      drawLayer4ImmutablePixelLock(ctx, assets, layout.productRect, false);
    }
    ctx.restore();

    // Divider line & Before / After badges
    ctx.save();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, H);
    ctx.stroke();

    const handleY = layout.productRect.y + layout.productRect.height * 0.52;
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.arc(splitX, handleY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↔', splitX, handleY);

    const badgeY = Math.max(24, layout.productRect.y - 46);
    const badgeW = 224;
    const badgeH = 36;
    const leftBadgeX = clamp(splitX - badgeW - 12, 16, W - badgeW * 2 - 32);
    const rightBadgeX = clamp(splitX + 12, leftBadgeX + badgeW + 12, W - badgeW - 16);

    ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Geist", sans-serif';
    ctx.fillStyle = 'rgba(20, 20, 24, 0.88)';
    ctx.beginPath();
    ctx.roundRect(leftBadgeX, badgeY, badgeW, badgeH, 18);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText('Before · Plain Raw Photo', leftBadgeX + badgeW * 0.5, badgeY + 19);

    ctx.fillStyle = 'rgba(6, 78, 59, 0.94)';
    ctx.beginPath();
    ctx.roundRect(rightBadgeX, badgeY, badgeW, badgeH, 18);
    ctx.fill();
    ctx.fillStyle = '#A7F3D0';
    ctx.fillText('After · Studio Staged', rightBadgeX + badgeW * 0.5, badgeY + 19);
    ctx.restore();
  }

  // Layer 5: Smart Responsive Typography & CTA
  if (opts.showCopyLayer ?? true) {
    drawLayer5TypographyAndCta(ctx, assets, layout, opts.adCopy);
  }

  // Optional Social UI & Safe-Zone overlay guides (Step 3)
  if (opts.showSafeZonesOverlay) {
    ctx.save();
    ctx.strokeStyle = 'rgba(217, 93, 57, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(layout.stageBox.x, layout.stageBox.y, layout.stageBox.width, layout.stageBox.height);
    if (ratio === '9:16') {
      // Stories/Reels header safe margin (top 240px) & engagement buttons right margin
      ctx.fillStyle = 'rgba(217, 93, 57, 0.08)';
      ctx.fillRect(0, 0, W, 220);
      ctx.fillRect(0, H - 320, W, 320);
      ctx.fillStyle = 'rgba(217, 93, 57, 0.9)';
      ctx.font = '600 14px monospace';
      ctx.fillText('TOP REELS UI SAFE ZONE', 24, 200);
      ctx.fillText('BOTTOM ENGAGEMENT SAFE ZONE', 24, H - 290);
    }
    ctx.restore();
  }

  return layout;
}
