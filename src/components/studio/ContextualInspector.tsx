'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveUserAsset } from '@/lib/storage/userAssets';
import {
  Brush,
  Eraser,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  Shield,
  Sparkles,
  Upload,
  Layers,
  Wand2,
  RefreshCw,
  Type,
  Palette,
  Sliders,
  SplitSquareVertical,
  SlidersHorizontal,
} from 'lucide-react';
import { SAMPLE_CATALOG } from '@/lib/samples/mockAnalyses';
import {
  alphaToMaskDataUrl,
  createCanvas,
  ctx2d,
  fileToDataUrl,
  loadImage,
  maskToAlpha,
} from '@/lib/imaging/canvas';
import { autoBrandSafeMask } from '@/lib/providers/freeMasking';
import { useStudioStore } from '@/store/studioStore';
import { LightingVectorGizmo } from './LightingVectorGizmo';

export function ContextualInspector() {
  const router = useRouter();
  const activeStep = useStudioStore((s) => s.activeStep);
  const activeSampleId = useStudioStore((s) => s.activeSampleId);
  const loadSample = useStudioStore((s) => s.loadSample);
  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);
  const providerMode = useStudioStore((s) => s.providerMode);
  const isRunning = useStudioStore((s) => s.isRunning);
  const pipelineResult = useStudioStore((s) => s.pipelineResult);

  // Masking & Brush
  const showSilhouetteOverlay = useStudioStore((s) => s.showSilhouetteOverlay);
  const setShowSilhouetteOverlay = useStudioStore((s) => s.setShowSilhouetteOverlay);
  const showBrandSafeOverlay = useStudioStore((s) => s.showBrandSafeOverlay);
  const setShowBrandSafeOverlay = useStudioStore((s) => s.setShowBrandSafeOverlay);
  const brushMode = useStudioStore((s) => s.brushMode);
  const setBrushMode = useStudioStore((s) => s.setBrushMode);
  const brushSize = useStudioStore((s) => s.brushSize);
  const setBrushSize = useStudioStore((s) => s.setBrushSize);
  const commitBrandSafeMaskUpdate = useStudioStore((s) => s.commitBrandSafeMaskUpdate);

  // Art Director & Scene
  const scenePrompt = useStudioStore((s) => s.scenePrompt);
  const setScenePrompt = useStudioStore((s) => s.setScenePrompt);
  const regenerateBackground = useStudioStore((s) => s.regenerateBackground);
  const isRegeneratingScene = useStudioStore((s) => s.isRegeneratingScene);
  const artDirection = pipelineResult?.artDirection;

  // Copy & Compositor Layers
  const adCopy = useStudioStore((s) => s.adCopy);
  const setAdCopy = useStudioStore((s) => s.setAdCopy);
  const showBackdropLayer = useStudioStore((s) => s.showBackdropLayer);
  const setShowBackdropLayer = useStudioStore((s) => s.setShowBackdropLayer);
  const showShadowLayer = useStudioStore((s) => s.showShadowLayer);
  const setShowShadowLayer = useStudioStore((s) => s.setShowShadowLayer);
  const showLightWrapLayer = useStudioStore((s) => s.showLightWrapLayer);
  const setShowLightWrapLayer = useStudioStore((s) => s.setShowLightWrapLayer);
  const pixelLockEnabled = useStudioStore((s) => s.pixelLockEnabled);
  const setPixelLockEnabled = useStudioStore((s) => s.setPixelLockEnabled);
  const showCopyLayer = useStudioStore((s) => s.showCopyLayer);
  const setShowCopyLayer = useStudioStore((s) => s.setShowCopyLayer);
  const showSafeZonesOverlay = useStudioStore((s) => s.showSafeZonesOverlay);
  const setShowSafeZonesOverlay = useStudioStore((s) => s.setShowSafeZonesOverlay);

  // Split Inspector
  const inspectorEnabled = useStudioStore((s) => s.inspectorEnabled);
  const setInspectorEnabled = useStudioStore((s) => s.setInspectorEnabled);
  const inspectorSplit = useStudioStore((s) => s.inspectorSplit);
  const setInspectorSplit = useStudioStore((s) => s.setInspectorSplit);

  // Mask canvas refs
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const origImgRef = useRef<HTMLImageElement | null>(null);
  const silAlphaRef = useRef<HTMLCanvasElement | null>(null);
  const lockAlphaRef = useRef<HTMLCanvasElement | null>(null);
  const initialLockAlphaRef = useRef<HTMLCanvasElement | null>(null);
  const baseBackdropBufRef = useRef<HTMLCanvasElement | null>(null);
  const cyanOverlayBufRef = useRef<HTMLCanvasElement | null>(null);
  const emeraldOverlayBufRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [decodeTick, setDecodeTick] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const boundingBox = pipelineResult?.masks.boundingBox;
  const jobId = pipelineResult?.jobId;
  const origUrl = pipelineResult?.masks.originalImageUrl;
  const silUrl = pipelineResult?.masks.productSilhouetteMaskUrl;

  const rebuildEmeraldOverlay = useCallback(() => {
    const lockAlpha = lockAlphaRef.current;
    if (!lockAlpha) return;
    const W = lockAlpha.width;
    const H = lockAlpha.height;
    let emerald = emeraldOverlayBufRef.current;
    if (!emerald || emerald.width !== W || emerald.height !== H) {
      emerald = createCanvas(W, H);
      emeraldOverlayBufRef.current = emerald;
    }
    const ectx = ctx2d(emerald);
    ectx.clearRect(0, 0, W, H);
    ectx.drawImage(lockAlpha, 0, 0);
    ectx.globalCompositeOperation = 'source-in';
    ectx.fillStyle = 'rgba(22, 101, 52, 0.48)';
    ectx.fillRect(0, 0, W, H);
    ectx.globalCompositeOperation = 'source-over';
  }, []);

  const rebuildStaticOverlays = useCallback(() => {
    const orig = origImgRef.current;
    const silAlpha = silAlphaRef.current;
    if (!orig || !silAlpha) return;
    const W = orig.naturalWidth;
    const H = orig.naturalHeight;

    let base = baseBackdropBufRef.current;
    if (!base || base.width !== W || base.height !== H) {
      base = createCanvas(W, H);
      baseBackdropBufRef.current = base;
    }
    const bctx = ctx2d(base);
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(orig, 0, 0, W, H);

    const dim = createCanvas(W, H);
    const dctx = ctx2d(dim);
    dctx.fillStyle = 'rgba(18, 18, 17, 0.45)';
    dctx.fillRect(0, 0, W, H);
    dctx.globalCompositeOperation = 'destination-out';
    dctx.drawImage(silAlpha, 0, 0);
    bctx.drawImage(dim, 0, 0);

    let cyan = cyanOverlayBufRef.current;
    if (!cyan || cyan.width !== W || cyan.height !== H) {
      cyan = createCanvas(W, H);
      cyanOverlayBufRef.current = cyan;
    }
    const cctx = ctx2d(cyan);
    cctx.clearRect(0, 0, W, H);
    cctx.drawImage(silAlpha, 0, 0);
    cctx.globalCompositeOperation = 'source-in';
    cctx.fillStyle = 'rgba(14, 165, 233, 0.28)';
    cctx.fillRect(0, 0, W, H);
    cctx.globalCompositeOperation = 'source-over';
  }, []);

  const redrawViewer = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const base = baseBackdropBufRef.current;
    if (!canvas || !base) return;

    const W = base.width;
    const H = base.height;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = ctx2d(canvas);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);

    if (showSilhouetteOverlay && cyanOverlayBufRef.current) {
      ctx.drawImage(cyanOverlayBufRef.current, 0, 0);
      if (boundingBox) {
        ctx.save();
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.85)';
        ctx.lineWidth = Math.max(2, Math.round(W * 0.0025));
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
        ctx.restore();
      }
    }

    if (showBrandSafeOverlay && emeraldOverlayBufRef.current) {
      ctx.drawImage(emeraldOverlayBufRef.current, 0, 0);
    }

    if (cursorPos) {
      const radiusImagePx = (brushSize / 260) * W;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, radiusImagePx, 0, Math.PI * 2);
      ctx.strokeStyle = brushMode === 'protect' ? '#166534' : '#DC2626';
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.stroke();
      ctx.fillStyle =
        brushMode === 'protect' ? 'rgba(22, 101, 52, 0.22)' : 'rgba(220, 38, 38, 0.22)';
      ctx.fill();
      ctx.restore();
    }
  }, [showSilhouetteOverlay, showBrandSafeOverlay, boundingBox, cursorPos, brushSize, brushMode]);

  useEffect(() => {
    let cancelled = false;
    const latest = useStudioStore.getState().pipelineResult;
    const lockUrl = latest?.masks.brandSafeZoneMaskUrl;
    if (!jobId || !origUrl || !silUrl || !lockUrl) return;
    initialLockAlphaRef.current = null;

    void (async () => {
      try {
        const [orig, silImg, lockImg] = await Promise.all([
          loadImage(origUrl),
          loadImage(silUrl),
          loadImage(lockUrl),
        ]);
        if (cancelled) return;
        const W = orig.naturalWidth;
        const H = orig.naturalHeight;
        origImgRef.current = orig;
        silAlphaRef.current = maskToAlpha(silImg, W, H);
        const lockA = maskToAlpha(lockImg, W, H);
        lockAlphaRef.current = lockA;

        const snap = createCanvas(W, H);
        ctx2d(snap).drawImage(lockA, 0, 0);
        initialLockAlphaRef.current = snap;

        rebuildStaticOverlays();
        rebuildEmeraldOverlay();
        setDecodeTick((t) => t + 1);
      } catch {
        // ignore transient decode errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, origUrl, silUrl, rebuildStaticOverlays, rebuildEmeraldOverlay]);

  useEffect(() => {
    if (activeStep === 1) {
      redrawViewer();
    }
  }, [redrawViewer, decodeTick, activeStep]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const paintSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const lockAlpha = lockAlphaRef.current;
    const silAlpha = silAlphaRef.current;
    if (!lockAlpha || !silAlpha) return;

    const W = lockAlpha.width;
    const radiusImagePx = (brushSize / 260) * W;
    const lctx = ctx2d(lockAlpha);

    lctx.save();
    lctx.lineCap = 'round';
    lctx.lineJoin = 'round';
    lctx.lineWidth = radiusImagePx * 2;

    if (brushMode === 'protect') {
      lctx.globalCompositeOperation = 'source-over';
      lctx.strokeStyle = '#FFFFFF';
      lctx.fillStyle = '#FFFFFF';
    } else {
      lctx.globalCompositeOperation = 'destination-out';
      lctx.strokeStyle = 'rgba(0,0,0,1)';
      lctx.fillStyle = 'rgba(0,0,0,1)';
    }

    lctx.beginPath();
    lctx.moveTo(from.x, from.y);
    lctx.lineTo(to.x, to.y);
    lctx.stroke();

    lctx.beginPath();
    lctx.arc(to.x, to.y, radiusImagePx, 0, Math.PI * 2);
    lctx.fill();

    lctx.globalCompositeOperation = 'destination-in';
    lctx.drawImage(silAlpha, 0, 0);
    lctx.restore();

    rebuildEmeraldOverlay();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvasCoords(e);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isPaintingRef.current = true;
    lastPtRef.current = pt;
    paintSegment(pt, pt);
    setCursorPos(pt);
    redrawViewer();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvasCoords(e);
    setCursorPos(pt);
    if (!isPaintingRef.current || !pt) return;
    paintSegment(lastPtRef.current ?? pt, pt);
    lastPtRef.current = pt;
    redrawViewer();
  };

  const finishStroke = () => {
    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    lastPtRef.current = null;
    if (lockAlphaRef.current) {
      const updatedUrl = alphaToMaskDataUrl(lockAlphaRef.current);
      commitBrandSafeMaskUpdate(updatedUrl);
    }
  };

  const handleResetMask = () => {
    const orig = origImgRef.current;
    const silAlpha = silAlphaRef.current;
    if (!orig || !silAlpha) return;

    if (initialLockAlphaRef.current) {
      const copy = createCanvas(orig.naturalWidth, orig.naturalHeight);
      ctx2d(copy).drawImage(initialLockAlphaRef.current, 0, 0);
      lockAlphaRef.current = copy;
    } else {
      lockAlphaRef.current = autoBrandSafeMask(orig, silAlpha);
    }
    rebuildEmeraldOverlay();
    redrawViewer();
    if (lockAlphaRef.current) {
      commitBrandSafeMaskUpdate(alphaToMaskDataUrl(lockAlphaRef.current));
    }
  };

  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file, 1500);
    saveUserAsset({
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: 'upload',
      categoryLabel: 'My Uploads',
      dataUrl,
      thumbnailUrl: dataUrl,
      sizeBytes: file.size,
      dimensions: { width: 1024, height: 1024 },
      aspectRatio: '1:1',
    });
    await loadUploadedPhoto(dataUrl, 'META_PROD');
    router.replace('/studio', { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-surface border border-line rounded-2xl shadow-soft">
      {/* ────────────────── STEP 1: PRODUCT & LOGO PROTECTION ────────────────── */}
      {activeStep === 1 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div>
              <h3 className="font-semibold text-ink text-sm">Product &amp; Logo Protection</h3>
              <p className="text-[11px] text-ink-2">Keeps your product and original text sharp</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-lock-bg text-lock border border-lock/30 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Logo &amp; Text Safe
            </span>
          </div>

          {/* Upload Dropzone */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              void handleFilePicked(e.dataTransfer.files?.[0]);
            }}
            className={`group cursor-pointer rounded-xl border border-dashed px-3 py-2.5 transition flex items-center justify-between gap-2 ${
              isDraggingFile
                ? 'border-accent bg-accent/10'
                : 'border-line-strong bg-well/50 hover:border-ink-2'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-surface border border-line flex items-center justify-center text-ink shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink truncate">
                  Upload Product Photo
                </div>
                <div className="text-[10px] text-ink-2 truncate">
                  Choose a photo from your device
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface group-hover:bg-cta border border-line group-hover:border-cta text-ink group-hover:text-cta-ink transition-colors shrink-0">
              Browse
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFilePicked(e.target.files?.[0])}
            />
          </label>

          {/* Highlight Visibility Toggles */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowSilhouetteOverlay(!showSilhouetteOverlay)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                showSilhouetteOverlay
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300 font-medium'
                  : 'bg-well border-line hover:border-line-strong text-ink-2 hover:text-ink'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                <span>Show Product Outline</span>
              </span>
              {showSilhouetteOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowBrandSafeOverlay(!showBrandSafeOverlay)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                showBrandSafeOverlay
                  ? 'bg-lock-bg border-lock/30 text-lock font-medium'
                  : 'bg-well border-line hover:border-line-strong text-ink-2 hover:text-ink'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                <span>Show Original Logo &amp; Text Area</span>
              </span>
              {showBrandSafeOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Preview Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-line bg-well flex items-center justify-center aspect-[4/3] max-h-[260px]">
            <canvas
              ref={displayCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              onPointerLeave={() => {
                setCursorPos(null);
                finishStroke();
              }}
              className="h-full w-auto max-w-full object-contain cursor-crosshair touch-none select-none"
            />
            <div className="absolute bottom-2 left-2 right-2 pointer-events-none flex items-center justify-between text-[10px] px-2.5 py-1 rounded-md bg-surface/90 border border-line text-ink shadow-sm">
              <span className="flex items-center gap-1.5 truncate font-medium">
                <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Brush over logo or text to keep original
              </span>
            </div>
          </div>

          {/* Brush Controls */}
          <div className="p-2.5 rounded-xl bg-well/70 border border-line flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink flex items-center gap-1.5">
                <Brush className="w-3.5 h-3.5 text-accent" /> Touch-Up Brush
              </span>
              <button
                type="button"
                onClick={handleResetMask}
                className="text-[11px] text-ink-2 hover:text-ink flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setBrushMode('protect')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  brushMode === 'protect'
                    ? 'bg-lock-bg border-lock/40 text-lock'
                    : 'bg-surface border-line hover:border-line-strong text-ink-2 hover:text-ink'
                }`}
              >
                <Brush className="w-3.5 h-3.5" /> Keep Original
              </button>
              <button
                type="button"
                onClick={() => setBrushMode('erase')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  brushMode === 'erase'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : 'bg-surface border-line hover:border-line-strong text-ink-2 hover:text-ink'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" /> Remove Area
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-ink-2 w-16">Brush Size</span>
              <input
                type="range"
                min={8}
                max={80}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="ls-range flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── STEP 2: BACKGROUND & LIGHTING ────────────────── */}
      {activeStep === 2 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div>
              <h3 className="font-semibold text-ink text-sm">Background &amp; Lighting</h3>
              <p className="text-[11px] text-ink-2">Adjust light direction and choose a backdrop style</p>
            </div>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>

          {/* Product Details */}
          {artDirection && (
            <div className="p-2.5 rounded-xl bg-well border border-line flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Product Type</span>
                <span className="font-semibold text-ink">{artDirection.productCategory}</span>
              </div>
              <div className="text-[11px] text-ink-2 leading-relaxed">
                <span className="font-medium text-ink">Surface Details: </span>
                {artDirection.detectedMaterial}
              </div>
            </div>
          )}

          {/* Light Direction Control */}
          <LightingVectorGizmo />

          {/* Background Style & Quick Themes */}
          <div className="p-3 rounded-xl bg-well/70 border border-line flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-accent" /> Background Style
              </span>
              <span className="text-[10px] text-ink-3">Auto-matched</span>
            </div>

            {/* Quick Style Themes */}
            {artDirection?.suggestedPresets && (
              <div className="flex flex-wrap gap-1">
                {artDirection.suggestedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isRegeneratingScene}
                    onClick={() => void regenerateBackground(preset.id, preset.prompt)}
                    className="text-[10.5px] px-2.5 py-1 rounded-lg bg-surface hover:bg-cta border border-line hover:border-cta text-ink hover:text-cta-ink font-semibold transition cursor-pointer"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            )}

            <textarea
              rows={3}
              value={scenePrompt}
              onChange={(e) => setScenePrompt(e.target.value)}
              placeholder="Describe the background setting you want (e.g., warm wooden table with morning sunlight)..."
              className="w-full rounded-xl bg-surface border border-line px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none"
            />

            <button
              type="button"
              disabled={isRegeneratingScene}
              onClick={() => void regenerateBackground()}
              className="w-full py-2 px-3 rounded-xl bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingScene ? 'animate-spin' : ''}`} />
              <span>{isRegeneratingScene ? 'Updating Background…' : 'Change Background'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── STEP 3: TEXT & IMAGE SIZES ────────────────── */}
      {activeStep === 3 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div>
              <h3 className="font-semibold text-ink text-sm">Text &amp; Image Sizes</h3>
              <p className="text-[11px] text-ink-2">Customize promotional text across all 3 sizes</p>
            </div>
            <Type className="w-4 h-4 text-accent" />
          </div>

          {/* Promotional Text Form */}
          <div className="p-3 rounded-xl bg-well/70 border border-line flex flex-col gap-2.5 text-xs">
            <div>
              <label className="text-[10px] font-medium text-ink-2 block mb-1">Main Title</label>
              <input
                type="text"
                value={adCopy.headline}
                onChange={(e) => setAdCopy({ headline: e.target.value })}
                className="w-full rounded-lg bg-surface border border-line px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-ink-2 block mb-1">Subtitle</label>
              <input
                type="text"
                value={adCopy.subheadline}
                onChange={(e) => setAdCopy({ subheadline: e.target.value })}
                className="w-full rounded-lg bg-surface border border-line px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-ink-2 block mb-1">Button Text</label>
                <input
                  type="text"
                  value={adCopy.ctaText}
                  onChange={(e) => setAdCopy({ ctaText: e.target.value })}
                  className="w-full rounded-lg bg-surface border border-line px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-ink-2 block mb-1 flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Button Color
                </label>
                <label className="flex items-center justify-center gap-1.5 rounded-lg bg-surface border border-line px-2 py-1.5 cursor-pointer">
                  <input
                    type="color"
                    value={adCopy.accentColorHex}
                    onChange={(e) => setAdCopy({ accentColorHex: e.target.value.toUpperCase() })}
                    className="w-5 h-4 bg-transparent border-0 cursor-pointer"
                  />
                  <span className="text-[10px] text-ink-2">Pick</span>
                </label>
              </div>
            </div>
          </div>

          {/* Mobile Story Margin Guides */}
          <div className="p-2.5 rounded-xl bg-well border border-line flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-ink">Text Margins</div>
              <div className="text-[10px] text-ink-2">Show safe area for mobile stories</div>
            </div>
            <button
              type="button"
              onClick={() => setShowSafeZonesOverlay(!showSafeZonesOverlay)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showSafeZonesOverlay
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-sm'
                  : 'bg-surface hover:bg-cta border border-line hover:border-cta text-ink-2 hover:text-cta-ink'
              }`}
            >
              {showSafeZonesOverlay ? 'Visible' : 'Hidden'}
            </button>
          </div>

          {/* Show / Hide Visual Elements */}
          <div className="p-3 rounded-xl bg-well/70 border border-line flex flex-col gap-1.5 text-xs">
            <div className="font-semibold text-ink flex items-center gap-1.5 mb-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
              Show / Hide Elements
            </div>

            <button
              type="button"
              onClick={() => setShowBackdropLayer(!showBackdropLayer)}
              className="flex items-center justify-between py-1 text-ink-2 hover:text-ink cursor-pointer"
            >
              <span>Studio Background</span>
              <span className={`text-[11px] font-semibold ${showBackdropLayer ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-3'}`}>
                {showBackdropLayer ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowShadowLayer(!showShadowLayer)}
              className="flex items-center justify-between py-1 text-ink-2 hover:text-ink cursor-pointer"
            >
              <span>Natural Shadows</span>
              <span className={`text-[11px] font-semibold ${showShadowLayer ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-3'}`}>
                {showShadowLayer ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowLightWrapLayer(!showLightWrapLayer)}
              className="flex items-center justify-between py-1 text-ink-2 hover:text-ink cursor-pointer"
            >
              <span>Edge Light Reflection</span>
              <span className={`text-[11px] font-semibold ${showLightWrapLayer ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-3'}`}>
                {showLightWrapLayer ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPixelLockEnabled(!pixelLockEnabled)}
              className="flex items-center justify-between py-1 text-ink font-medium cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-lock">
                <Lock className="w-3.5 h-3.5" /> Original Logo &amp; Text
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pixelLockEnabled ? 'bg-lock-bg text-lock' : 'bg-rose-500/15 text-rose-600'}`}>
                {pixelLockEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowCopyLayer(!showCopyLayer)}
              className="flex items-center justify-between py-1 text-ink-2 hover:text-ink cursor-pointer"
            >
              <span>Promotional Text &amp; Button</span>
              <span className={`text-[11px] font-semibold ${showCopyLayer ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-3'}`}>
                {showCopyLayer ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

