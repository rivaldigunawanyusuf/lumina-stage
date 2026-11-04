'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sun, ShieldCheck, Layers, Grid } from 'lucide-react';

export function EditorialStudioBento() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-paper border-b border-line">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.1]">
              Engineered for packaging integrity, lighting physics, and multi-format distribution.
            </h2>
          </div>
          <p className="text-sm text-ink-2 max-w-md leading-relaxed">
            Four core architectural pillars designed to replace expensive physical photo studios and eliminate generative label distortions.
          </p>
        </div>

        {/* ── Asymmetrical Bento Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── BENTO 1: Preserved Packaging Integrity (Span 7 cols) ── */}
          <div className="lg:col-span-7 rounded-3xl border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-soft overflow-hidden relative group">
            <div className="flex flex-col gap-3 relative z-10 max-w-lg mb-8">
              <div className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                Dedicated Packaging Preservation
              </div>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                Generative AI models notoriously hallucinate and blur fine text. LuminaStage preserves your raw camera pixels for logos, nutrition panels, and barcodes so they remain 100% authentic on e-commerce shelves.
              </p>
            </div>

            {/* Visual Loupe Comparison Display */}
            <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-line bg-well flex items-center justify-center">
              <div className="w-full h-full grid grid-cols-2">
                {/* Left: Raw Packshot */}
                <div className="relative h-full border-r border-line bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src="/showcase/packshot_aura_raw.png"
                    alt="Raw white packshot"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 text-[11px] font-mono text-ink-3">
                    White Catalog Shot
                  </div>
                </div>

                {/* Right: Travertine Staging */}
                <div className="relative h-full bg-surface flex items-center justify-center overflow-hidden">
                  <img
                    src="/showcase/studio_3d_relit_aura.png"
                    alt="Commercial travertine staging"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Staged with 3D Light
                  </div>
                </div>
              </div>

              {/* Center Divider Indicator */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-line pointer-events-none" />
            </div>

            <div className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs text-ink-2">
              <span className="font-semibold text-ink">Zero typography warping</span>
              <Link href="/dashboard" className="text-ink font-bold hover:underline flex items-center gap-1">
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ── BENTO 2: 360° Studio Key Light Rig (Span 5 cols) ── */}
          <div className="lg:col-span-5 rounded-3xl border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-soft overflow-hidden relative">
            <div className="flex flex-col gap-3 relative z-10 mb-6">
              <div className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                360° Directional Lighting
              </div>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                Position your studio light source at any angle. Our lighting engine calculates soft ground contact occlusion and edge rim specular highlights.
              </p>
            </div>

            {/* Visual Light Dial Simulation */}
            <div className="relative w-full h-56 sm:h-64 rounded-2xl border border-line bg-well flex flex-col items-center justify-center p-4 dot-grid overflow-hidden">
              <div className="relative w-40 h-40 rounded-full border border-line flex items-center justify-center bg-surface/80 shadow-inner">
                {/* Center product proxy */}
                <div className="w-16 h-16 rounded-full bg-well border border-line flex items-center justify-center shadow-soft">
                  <Sun className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                {/* Orbiting key indicator */}
                <div
                  className="absolute w-5 h-5 rounded-full bg-ink text-paper text-[10px] font-mono font-bold flex items-center justify-center shadow-lift -top-2.5 left-1/2 -translate-x-1/2"
                >
                  58°
                </div>
                {/* Radial guide ticks */}
                <div className="absolute inset-2 border border-dashed border-line rounded-full pointer-events-none" />
              </div>
              <div className="text-[11px] font-mono text-ink-3 mt-3">
                Key Light Azimuth: 58° · Elevation: 45°
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs text-ink-2">
              <span className="font-semibold text-ink">Ground contact shadows</span>
              <a href="#podium-3d" className="text-ink font-bold hover:underline flex items-center gap-1">
                <span>Orbit 3D Light</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* ── BENTO 3: Multi-Platform Campaign Kits (Span 5 cols) ── */}
          <div className="lg:col-span-5 rounded-3xl border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-soft overflow-hidden relative">
            <div className="flex flex-col gap-3 relative z-10 mb-6">
              <div className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                Instant Multi-Ratio Formats
              </div>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                One photo session automatically produces 1:1 Catalog Square, 9:16 Vertical Reels/Stories, and 4:5 Feed Portrait without clumsy manual cropping.
              </p>
            </div>

            {/* Visual Aspect Ratio Silhouettes */}
            <div className="relative w-full h-56 sm:h-64 rounded-2xl border border-line bg-well flex items-center justify-center gap-3 p-4 overflow-hidden">
              {/* 1:1 Square */}
              <div className="w-20 aspect-square rounded-xl border border-line bg-surface shadow-xs flex flex-col items-center justify-center p-2 text-center">
                <span className="font-mono text-xs font-bold text-ink">1:1</span>
                <span className="text-[9px] text-ink-3 mt-1">Catalog</span>
              </div>
              {/* 9:16 Vertical */}
              <div className="w-16 aspect-[9/16] rounded-xl border-2 border-ink bg-surface shadow-lift flex flex-col items-center justify-center p-2 text-center">
                <span className="font-mono text-xs font-bold text-ink">9:16</span>
                <span className="text-[9px] text-ink-3 mt-1">Reels</span>
              </div>
              {/* 4:5 Portrait */}
              <div className="w-18 aspect-[4/5] rounded-xl border border-line bg-surface shadow-xs flex flex-col items-center justify-center p-2 text-center">
                <span className="font-mono text-xs font-bold text-ink">4:5</span>
                <span className="text-[9px] text-ink-3 mt-1">Meta Ad</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs text-ink-2">
              <span className="font-semibold text-ink">Safe-zone clearance</span>
              <a href="#multi-ratio" className="text-ink font-bold hover:underline flex items-center gap-1">
                <span>View Ratio Kits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* ── BENTO 4: 90+ Commercial Assets (Span 7 cols) ── */}
          <div className="lg:col-span-7 rounded-3xl border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-soft overflow-hidden relative">
            <div className="flex flex-col gap-3 relative z-10 max-w-lg mb-6">
              <div className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                90+ Commercial Studio Assets
              </div>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                Staged across CPG cosmetics and beverage cans, Michelin-styled world culinary dishes, and haute couture virtual fashion models in motion.
              </p>
            </div>

            {/* Overlapping Fanned Photo Cards */}
            <div className="relative w-full h-56 sm:h-64 rounded-2xl border border-line bg-well flex items-center justify-center overflow-hidden p-4">
              <div className="relative w-full max-w-md h-full flex items-center justify-center">
                {/* Photo 1: Food (left tilt) */}
                <div className="absolute w-36 sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden border border-line shadow-soft -translate-x-20 -rotate-6 hover:rotate-0 hover:z-20 transition-all duration-300">
                  <img
                    src="/showcase/food_10_tonkotsu_ramen.png"
                    alt="Artisanal ramen culinary staging"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Photo 2: Fashion Model (center) */}
                <div className="absolute w-36 sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden border border-line shadow-lift z-10 hover:scale-105 transition-all duration-300">
                  <img
                    src="/showcase/model_01_silk_evening_gown.png"
                    alt="Haute couture virtual fashion model"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Photo 3: Beverage CPG (right tilt) */}
                <div className="absolute w-36 sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden border border-line shadow-soft translate-x-20 rotate-6 hover:rotate-0 hover:z-20 transition-all duration-300">
                  <img
                    src="/showcase/showcase_07_kinetix_can.png"
                    alt="Cold brew beverage packaging"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs text-ink-2">
              <span className="font-semibold text-ink">Food, Fashion &amp; Packshot</span>
              <a href="#showcase" className="text-ink font-bold hover:underline flex items-center gap-1">
                <span>Browse All 90 Photos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

