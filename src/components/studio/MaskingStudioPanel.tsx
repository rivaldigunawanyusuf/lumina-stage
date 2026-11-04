'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

export function MaskingStudioPanel() {
  const activeSampleId = useStudioStore((s) => s.activeSampleId);
  const loadSample = useStudioStore((s) => s.loadSample);
  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);
  const providerMode = useStudioStore((s) => s.providerMode);
  const isRunning = useStudioStore((s) => s.isRunning);
  const pipelineResult = useStudioStore((s) => s.pipelineResult);

  const showSilhouetteOverlay = useStudioStore((s) => s.showSilhouetteOverlay);
  const setShowSilhouetteOverlay = useStudioStore((s) => s.setShowSilhouetteOverlay);
  const showBrandSafeOverlay = useStudioStore((s) => s.showBrandSafeOverlay);
  const setShowBrandSafeOverlay = useStudioStore((s) => s.setShowBrandSafeOverlay);

  const brushMode = useStudioStore((s) => s.brushMode);
  const setBrushMode = useStudioStore((s) => s.setBrushMode);
  const brushSize = useStudioStore((s) => s.brushSize);
  const setBrushSize = useStudioStore((s) => s.setBrushSize);
  const commitBrandSafeMaskUpdate = useStudioStore((s) => s.commitBrandSafeMaskUpdate);

  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const origImgRef = useRef<HTMLImageElement | null>(null);
  const silAlphaRef = useRef<HTMLCanvasElement | null>(null);
  const lockAlphaRef = useRef<HTMLCanvasElement | null>(null);
  const initialLockAlphaRef = useRef<HTMLCanvasElement | null>(null);

  // Cached layer buffers so pointer hover / brush strokes do 0 DOM canvas allocations
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
    ectx.fillStyle = 'rgba(16, 185, 129, 0.48)';
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
    dctx.fillStyle = 'rgba(4, 7, 15, 0.48)';
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
    cctx.fillStyle = 'rgba(6, 182, 212, 0.28)';
    cctx.fillRect(0, 0, W, H);
    cctx.globalCompositeOperation = 'source-over';
  }, []);

  // Fast composite of pre-built buffers + cursor ring (zero canvas allocations per frame)
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
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
        ctx.lineWidth = Math.max(2, Math.round(W * 0.0025));
        ctx.setLineDash([10, 8]);
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
      ctx.strokeStyle = brushMode === 'protect' ? '#10B981' : '#F43F5E';
      ctx.lineWidth = Math.max(2.5, W * 0.003);
      ctx.stroke();
      ctx.fillStyle =
        brushMode === 'protect' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(244, 63, 94, 0.18)';
      ctx.fill();
      ctx.restore();
    }
  }, [
    showSilhouetteOverlay,
    showBrandSafeOverlay,
    boundingBox,
    cursorPos,
    brushSize,
    brushMode,
  ]);

  // Decode source & mask images ONLY when a new job arrives (not on mouse move or brush stroke)
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
        // ignore transient image decode errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, origUrl, silUrl, rebuildStaticOverlays, rebuildEmeraldOverlay]);

  useEffect(() => {
    redrawViewer();
  }, [redrawViewer, decodeTick]);

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
    const nextMode = providerMode === 'MOCK_OFFLINE' ? 'FREE_DEV' : providerMode;
    await loadUploadedPhoto(dataUrl, nextMode);
  };

  return (
    <section className="flex flex-col gap-3.5 bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3.5">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-xs font-bold">
            1
          </span>
          <div>
            <h2 className="studio-heading font-semibold text-white">
              Hierarchical Masking Studio
            </h2>
            <p className="text-[11px] text-slate-400">
              SAM 3.1 Dual-Layer Architecture · Brush Refinement
            </p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Label Preserved
        </span>
      </div>

      {/* Fictional-Brand Sample Presets (Trademark Safe) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-300">
            Curated Commercial Presets (Fictional Brands)
          </span>
          <span className="text-[10px] text-slate-500">Curated Samples</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SAMPLE_CATALOG.map((item) => {
            const selected = activeSampleId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isRunning}
                onClick={() => void loadSample(item.id)}
                className={`text-left p-2 rounded-xl border transition-all ${
                  selected
                    ? 'bg-slate-800/95 border-emerald-500/60 shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: item.swatch }}
                  />
                  <span className="text-xs font-bold text-white truncate">
                    {item.brand}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">{item.product}</div>
                <div className="text-[10px] text-slate-500 truncate">{item.tagline}</div>
              </button>
            );
          })}
        </div>
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
        className={`cursor-pointer rounded-xl border border-dashed px-3 py-2.5 transition flex items-center justify-between gap-2 ${
          isDraggingFile
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-slate-700/80 bg-slate-950/50 hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
            <Upload className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate">
              Upload Raw Product Photo (Phone / Studio)
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              SAM 3.1 dual-layer hierarchical segmentation
            </div>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 shrink-0">
          Browse
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFilePicked(e.target.files?.[0])}
        />
      </label>

      {/* Dual-Layer Mask Overlay Toggles */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowSilhouetteOverlay(!showSilhouetteOverlay)}
          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition ${
            showSilhouetteOverlay
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
            <span>Layer 1: Product Silhouette Mask</span>
          </span>
          {showSilhouetteOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setShowBrandSafeOverlay(!showBrandSafeOverlay)}
          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition ${
            showBrandSafeOverlay
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span>Layer 2: Protected Label Zone</span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300">
              PRESERVED
            </span>
          </span>
          {showBrandSafeOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Interactive Mask Canvas Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center aspect-[3/4] max-h-[340px]">
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
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none flex items-center justify-between text-[10px] px-2 py-1 rounded-md bg-slate-950/80 border border-slate-800/80 text-slate-300">
          <span className="flex items-center gap-1 truncate">
            <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
            Paint on product to lock/unlock typography
          </span>
          <span className="font-mono text-slate-400 shrink-0 ml-1">
            {boundingBox ? `${boundingBox.width}×${boundingBox.height}px` : ''}
          </span>
        </div>
      </div>

      {/* Interactive Canvas Brush Refinement Controls */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Label Zone Brush Tool
          </span>
          <button
            type="button"
            onClick={handleResetMask}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset Mask
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setBrushMode('protect')}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition ${
              brushMode === 'protect'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brush className="w-3.5 h-3.5" /> Protect (Lock)
          </button>
          <button
            type="button"
            onClick={() => setBrushMode('erase')}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition ${
              brushMode === 'erase'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" /> Erase (Unlock)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 w-16">Brush: {brushSize}px</span>
          <input
            type="range"
            min={8}
            max={80}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
}
