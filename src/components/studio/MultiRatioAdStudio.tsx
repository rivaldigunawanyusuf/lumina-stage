'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  LayoutGrid,
  Lock,
  Maximize2,
  SplitSquareVertical,
  Unlock,
  Sparkles,
} from 'lucide-react';
import {
  ARTBOARD_ORDER,
  ARTBOARD_SPECS,
  type AspectRatioId,
  type SolvedArtboardLayout,
} from '@/lib/compositor/layout';
import {
  prepareCompositorAssets,
  refreshBrandSafeStamp,
  renderArtboard,
  type PreparedCompositorAssets,
} from '@/lib/compositor/compositor';
import {
  exportMultiRatioAdKitZip,
  exportSingleArtboardPng,
} from '@/lib/compositor/export';
import { clamp, ctx2d, loadImage, maskToAlpha } from '@/lib/imaging/canvas';
import { useStudioStore } from '@/store/studioStore';

const ASPECT_CLASS: Record<AspectRatioId, string> = {
  '1:1': 'aspect-square',
  '9:16': 'aspect-[9/16]',
  '4:5': 'aspect-[4/5]',
};

interface MultiRatioAdStudioProps {
  showHeader?: boolean;
  className?: string;
}

export function MultiRatioAdStudio({
  showHeader = false,
  className = '',
}: MultiRatioAdStudioProps) {
  const pipelineResult = useStudioStore((s) => s.pipelineResult);
  const maskRevision = useStudioStore((s) => s.maskRevision);
  const lightingVector = useStudioStore((s) => s.lightingVector);
  const adCopy = useStudioStore((s) => s.adCopy);
  const scenePrompt = useStudioStore((s) => s.scenePrompt);
  const providerMode = useStudioStore((s) => s.providerMode);
  const setProviderMode = useStudioStore((s) => s.setProviderMode);

  const pixelLockEnabled = useStudioStore((s) => s.pixelLockEnabled);
  const setPixelLockEnabled = useStudioStore((s) => s.setPixelLockEnabled);
  const inspectorEnabled = useStudioStore((s) => s.inspectorEnabled);
  const setInspectorEnabled = useStudioStore((s) => s.setInspectorEnabled);
  const inspectorSplit = useStudioStore((s) => s.inspectorSplit);
  const setInspectorSplit = useStudioStore((s) => s.setInspectorSplit);

  const artboardView = useStudioStore((s) => s.artboardView);
  const setArtboardView = useStudioStore((s) => s.setArtboardView);

  const showBackdropLayer = useStudioStore((s) => s.showBackdropLayer);
  const showShadowLayer = useStudioStore((s) => s.showShadowLayer);
  const showLightWrapLayer = useStudioStore((s) => s.showLightWrapLayer);
  const showCopyLayer = useStudioStore((s) => s.showCopyLayer);
  const showSafeZonesOverlay = useStudioStore((s) => s.showSafeZonesOverlay);
  const highlightBrandSafeZone = useStudioStore((s) => s.highlightBrandSafeZone);

  const isRunning = useStudioStore((s) => s.isRunning);
  const errorMessage = useStudioStore((s) => s.errorMessage);
  const metaUnconfiguredNotice = useStudioStore((s) => s.metaUnconfiguredNotice);
  const dismissNotice = useStudioStore((s) => s.dismissNotice);

  const [assets, setAssets] = useState<PreparedCompositorAssets | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportSuccessToast, setExportSuccessToast] = useState<string | null>(null);

  const canvasRefs = useRef<Record<AspectRatioId, HTMLCanvasElement | null>>({
    '1:1': null,
    '9:16': null,
    '4:5': null,
  });
  const layoutsRef = useRef<Partial<Record<AspectRatioId, SolvedArtboardLayout>>>({});
  const draggingSplitRef = useRef<AspectRatioId | null>(null);
  const jobId = pipelineResult?.jobId;
  const bgUrl = pipelineResult?.generatedBackgroundUrl;

  // Full asset preparation only when jobId or generatedBackgroundUrl changes
  useEffect(() => {
    let cancelled = false;
    const currentResult = useStudioStore.getState().pipelineResult;
    if (!currentResult || !jobId || !bgUrl) return;

    void (async () => {
      try {
        const prepared = await prepareCompositorAssets(currentResult);
        if (!cancelled) {
          setAssets(prepared);
          useStudioStore.getState().setPreparedAssets(prepared);
        }
      } catch {
        // ignore transient image decode error
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, bgUrl]);

  // Lightweight incremental stamp refresh when user edits the brandSafeZoneMask via Brush
  useEffect(() => {
    let cancelled = false;
    const currentResult = useStudioStore.getState().pipelineResult;
    if (!assets || !currentResult) return;
    if (assets.jobId !== currentResult.jobId) return;

    void (async () => {
      try {
        const lockImg = await loadImage(currentResult.masks.brandSafeZoneMaskUrl);
        if (cancelled) return;
        const W = assets.original.naturalWidth;
        const H = assets.original.naturalHeight;
        const nextLockAlpha = maskToAlpha(lockImg, W, H);
        const lctx = ctx2d(assets.lockAlphaFull);
        lctx.clearRect(0, 0, W, H);
        lctx.drawImage(nextLockAlpha, 0, 0);
        refreshBrandSafeStamp(assets);
        setRenderTick((t) => t + 1);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [maskRevision, assets]);

  // Real-time 5-layer compositing across all visible artboards
  useEffect(() => {
    if (!assets) return;
    const rafId = requestAnimationFrame(() => {
      for (const ratio of ARTBOARD_ORDER) {
        const canvas = canvasRefs.current[ratio];
        if (!canvas) continue;
        layoutsRef.current[ratio] = renderArtboard(canvas, ratio, assets, {
          lighting: lightingVector,
          adCopy,
          pixelLockEnabled,
          inspectorEnabled,
          inspectorSplit,
          showBackdropLayer,
          showShadowLayer,
          showLightWrapLayer,
          showCopyLayer,
          showSafeZonesOverlay,
          highlightBrandSafeZone,
        });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [
    assets,
    renderTick,
    lightingVector,
    adCopy,
    pixelLockEnabled,
    inspectorEnabled,
    inspectorSplit,
    artboardView,
    showBackdropLayer,
    showShadowLayer,
    showLightWrapLayer,
    showCopyLayer,
    showSafeZonesOverlay,
    highlightBrandSafeZone,
  ]);

  const updateInspectorFromPointer = (
    ratio: AspectRatioId,
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRefs.current[ratio];
    const layout = layoutsRef.current[ratio];
    if (!canvas || !layout) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const rel = (canvasX - layout.productRect.x) / Math.max(1, layout.productRect.width);
    setInspectorSplit(clamp(rel, 0.08, 0.92));
  };

  const handleSingleExport = async (ratio: AspectRatioId) => {
    if (!assets) return;
    await exportSingleArtboardPng({
      ratio,
      assets,
      lighting: lightingVector,
      adCopy,
    });
    setExportSuccessToast(`Exported ${ratio} (${ARTBOARD_SPECS[ratio].width}×${ARTBOARD_SPECS[ratio].height} PNG)`);
    setTimeout(() => setExportSuccessToast(null), 3200);
  };

  const handleExportAdKit = async () => {
    if (!assets || !pipelineResult) return;
    setIsExportingZip(true);
    try {
      await exportMultiRatioAdKitZip({
        assets,
        lighting: lightingVector,
        adCopy,
        providerUsed: pipelineResult.providerUsed,
        scenePrompt,
      });
      setExportSuccessToast('Downloaded all 3 image sizes (.ZIP)');
      setTimeout(() => setExportSuccessToast(null), 4000);
    } finally {
      setIsExportingZip(false);
    }
  };

  const visibleRatios: AspectRatioId[] =
    artboardView === 'all' ? ARTBOARD_ORDER : [artboardView];

  return (
    <div className={`flex flex-col gap-4 w-full ${className}`}>
      {/* Optional Standalone Top Bar */}
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-surface border border-line">
          <div>
            <h2 className="text-xs font-bold text-ink">
              Multi-Ratio WebGL &amp; Canvas Stage
            </h2>
            <p className="text-[11px] text-ink-2">
              1:1 Catalog · 9:16 Reels/Story · 4:5 Social Feed
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ratio Switcher */}
            <div className="flex items-center bg-well border border-line rounded-xl p-1 text-xs gap-0.5">
              <button
                type="button"
                onClick={() => setArtboardView('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer ${
                  artboardView === 'all'
                    ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-sm'
                    : 'text-ink-2 hover:text-ink hover:bg-surface'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>All 3</span>
              </button>
              {ARTBOARD_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setArtboardView(r)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition cursor-pointer ${
                    artboardView === r
                      ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-sm'
                      : 'text-ink-2 hover:text-ink hover:bg-surface'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Label Preservation Layer Toggle */}
            <button
              type="button"
              onClick={() => setPixelLockEnabled(!pixelLockEnabled)}
              title="Toggle Label Preservation Layer"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                pixelLockEnabled
                  ? 'bg-lock-bg border-lock/30 text-lock'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
              }`}
            >
              {pixelLockEnabled ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Label Layer: ON</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Label Layer: OFF</span>
                </>
              )}
            </button>

            {/* Split Inspector Shortcut */}
            <button
              type="button"
              onClick={() => setInspectorEnabled(!inspectorEnabled)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                inspectorEnabled
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface border-line text-ink-2 hover:text-ink hover:border-line-strong'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>{inspectorEnabled ? 'Exit Inspector' : 'Split Inspector'}</span>
            </button>

            {/* Ad Kit ZIP Export */}
            <button
              type="button"
              disabled={!assets || isExportingZip}
              onClick={() => void handleExportAdKit()}
              className="px-3 py-1.5 rounded-xl bg-cta text-cta-ink font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition shadow-sm"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isExportingZip ? 'Bundling ZIP…' : 'Export Ad Kit'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Zero-Burn / Meta Unconfigured Notice or Error Banner */}
      {metaUnconfiguredNotice && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-ink">
                Zero-Burn Guard Active for META_PROD ($0.00 Spent)
              </div>
              <p className="text-ink-2 text-[11px] mt-0.5">
                {metaUnconfiguredNotice}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProviderMode('META_PROD')}
              className="px-3 py-1 rounded-xl bg-cta text-cta-ink font-semibold text-xs hover:opacity-90 transition shadow-sm"
            >
              Run Meta AI Pipeline
            </button>
            <button
              type="button"
              onClick={dismissNotice}
              className="px-2.5 py-1 rounded-xl bg-surface border border-line text-ink-2 text-xs hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={dismissNotice}
            className="text-[11px] underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {exportSuccessToast && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{exportSuccessToast}</span>
        </div>
      )}

      {/* Responsive Artboard Canvas Viewport */}
      <div
        className={`grid gap-5 items-start transition-all duration-300 ${
          artboardView === 'all'
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 max-w-xl mx-auto w-full'
        }`}
      >
        {visibleRatios.map((ratio) => {
          const spec = ARTBOARD_SPECS[ratio];
          const isFocused = artboardView === ratio;

          return (
            <div
              key={ratio}
              className="flex flex-col bg-surface border border-line rounded-3xl overflow-hidden shadow-soft hover:shadow-lift transition-all duration-300 group"
            >
              {/* Artboard Card Header */}
              <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2 bg-surface/90">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-ink font-mono tracking-tight truncate">
                    {spec.title}
                  </div>
                  <div className="text-[10px] text-ink-3 uppercase tracking-wider truncate">
                    {spec.channel}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setArtboardView(artboardView === ratio ? 'all' : ratio)
                    }
                    title={isFocused ? 'Show all 3 ratios' : `Focus ${ratio}`}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      isFocused
                        ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink border-transparent shadow-sm'
                        : 'bg-well hover:bg-cta border-line hover:border-cta text-ink-2 hover:text-cta-ink'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={!assets}
                    onClick={() => void handleSingleExport(ratio)}
                    className="px-2.5 py-1.5 rounded-xl bg-well hover:bg-cta border border-line hover:border-cta text-ink hover:text-cta-ink text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title={`Download ${spec.width}×${spec.height} PNG`}
                  >
                    <Download className="w-3 h-3" />
                    <span>PNG</span>
                  </button>
                </div>
              </div>

              {/* Artboard Canvas Container with dot-grid desk & shadow */}
              <div className="relative p-4 sm:p-5 flex items-center justify-center dot-grid studio-well min-h-[300px]">
                <canvas
                  ref={(el) => {
                    canvasRefs.current[ratio] = el;
                  }}
                  onPointerDown={(e) => {
                    if (!inspectorEnabled) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    draggingSplitRef.current = ratio;
                    updateInspectorFromPointer(ratio, e);
                  }}
                  onPointerMove={(e) => {
                    if (draggingSplitRef.current !== ratio) return;
                    updateInspectorFromPointer(ratio, e);
                  }}
                  onPointerUp={() => {
                    draggingSplitRef.current = null;
                  }}
                  onPointerCancel={() => {
                    draggingSplitRef.current = null;
                  }}
                  className={`${ASPECT_CLASS[ratio]} w-full h-auto max-h-[560px] object-contain rounded-2xl shadow-lift border border-line/60 transition-transform duration-200 ${
                    inspectorEnabled ? 'cursor-ew-resize touch-none ring-2 ring-accent/30' : ''
                  }`}
                />

                {isRunning && (
                  <div className="absolute inset-0 bg-surface/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-xs text-ink rounded-b-none">
                    <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    <span className="font-medium text-ink-2">Preparing your product photos…</span>
                  </div>
                )}
              </div>

              {/* Artboard Footer: Floating Mini-Pill Style */}
              <div className="px-4 py-2 border-t border-line bg-surface flex items-center justify-between text-[10.5px]">
                <div className="text-ink-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                  <span>
                    {inspectorEnabled
                      ? `Before / After: ${Math.round(inspectorSplit * 100)}%`
                      : `${spec.width}×${spec.height}`}
                  </span>
                </div>
                <div
                  className={`font-semibold flex items-center gap-1 ${
                    pixelLockEnabled ? 'text-lock' : 'text-ink-3'
                  }`}
                  title={
                    pixelLockEnabled
                      ? 'Original logo and text kept sharp'
                      : 'Original text overlay turned off'
                  }
                >
                  <Lock className="w-3 h-3" />
                  <span>{pixelLockEnabled ? 'Logo & Text Safe' : 'Original Off'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
