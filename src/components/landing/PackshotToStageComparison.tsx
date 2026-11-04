'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function PackshotToStageComparison() {
  const [splitPos, setSplitPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateSplitFromPointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0.05, Math.min(0.95, rel));
    setSplitPos(Math.round(clamped * 100));
  };

  if (!isMounted) {
    return (
      <div className="w-full h-[520px] rounded-3xl border border-line bg-surface flex items-center justify-center text-xs text-ink-3">
        Loading Product Transformation…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full select-none">
      {/* ────────────────── INTERACTIVE SPLIT COMPARISON CARD ────────────────── */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-line bg-surface shadow-lift">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-line bg-surface/90 backdrop-blur-md z-20 relative">
          <div>
            <div className="text-xs font-bold text-ink">
              Original Photo → Studio Background
            </div>
            <div className="text-[11px] text-ink-2">
              Drag the slider to compare a plain product photo with the finished studio result
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-ink-2">
            <span>Plain Photo</span>
            <span className="text-ink-3">→</span>
            <span className="text-ink font-semibold">Studio Result</span>
          </div>
        </div>

        {/* Comparison Stage Viewport */}
        <div
          ref={containerRef}
          onPointerDown={(e) => {
            setIsDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            updateSplitFromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (isDragging) updateSplitFromPointer(e.clientX);
          }}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
          className="relative h-[440px] sm:h-[540px] w-full flex items-center justify-center p-3 sm:p-6 dot-grid studio-well cursor-ew-resize overflow-hidden touch-none"
        >
          {/* Framed Comparison Screen */}
          <div className="relative w-full max-w-3xl h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-lift border border-line bg-surface">
            {/* ── LEFT HALF: Raw Packshot (Plain White Background) ── */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white"
              style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
            >
              <img
                src="/showcase/packshot_aura_raw.png"
                alt="Raw White Background E-Commerce Packshot"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>

            {/* ── RIGHT HALF: LuminaStage Commercial Editorial Staging (Travertine Stone & Sun) ── */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-surface"
              style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
            >
              <img
                src="/showcase/studio_3d_relit_aura.png"
                alt="LuminaStage Commercial Staged Product Photography"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>

            {/* ── DIVIDER BAR WITH CIRCLE DRAG HANDLE ── */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-30 shadow-lg"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-surface border-2 border-ink shadow-lift flex items-center justify-center text-xs font-bold text-ink backdrop-blur-md">
                ↔
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Slider Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-line bg-surface/95 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <span className="text-xs font-semibold text-ink-2 shrink-0">
              Drag Divider:
            </span>
            <input
              type="range"
              min={5}
              max={95}
              value={splitPos}
              onChange={(e) => setSplitPos(Number(e.target.value))}
              className="ls-range flex-1"
            />
            <span className="text-ink text-xs font-bold w-12 text-right">
              {splitPos}%
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-2">
            <span className="text-ink font-semibold">
              Label Typography Preserved
            </span>
            <span className="text-ink-3">·</span>
            <Link
              href="/dashboard"
              className="text-ink font-bold hover:underline flex items-center gap-1"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

