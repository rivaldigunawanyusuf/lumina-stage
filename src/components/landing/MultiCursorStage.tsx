'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sun, Pause, Play, Sparkles } from 'lucide-react';

export function MultiCursorStage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [interactiveLightAngle, setInteractiveLightAngle] = useState(58);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Autonomous sequence loop (cycles through Agent 1 -> Agent 2 -> Agent 3)
  useEffect(() => {
    if (isPaused || !isMounted) return;

    const interval = setInterval(() => {
      setStep((prev) => (prev === 3 ? 1 : ((prev + 1) as 1 | 2 | 3)));
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, isMounted]);

  // Round light gleam coordinates for zero SSR discrepancy
  const rad = (interactiveLightAngle * Math.PI) / 180;
  const lightGleamX = Math.round(50 + Math.cos(rad) * 35);
  const lightGleamY = Math.round(45 - Math.sin(rad) * 25);

  if (!isMounted) {
    return (
      <div className="relative w-full rounded-3xl border border-line bg-surface h-[520px] flex items-center justify-center text-xs text-ink-3">
        Loading Interactive Studio…
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full rounded-3xl overflow-hidden border border-line bg-well shadow-lift select-none group"
    >
      {/* ────────────────── TOP TACTILE BAR ────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-line bg-surface/90 backdrop-blur-md z-20 relative">
        <div>
          <div className="text-xs font-bold text-ink">
            Autonomous Product Workflow
          </div>
          <div className="text-[11px] text-ink-2">
            Automated label protection, realistic studio lighting, and multi-format campaign export
          </div>
        </div>

        {/* Step Indicator & Play/Pause */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-well border border-line rounded-xl p-1 text-xs gap-0.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                step === 1
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink font-bold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface font-medium'
              }`}
            >
              1. Protect Label
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                step === 2
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink font-bold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface font-medium'
              }`}
            >
              2. Studio Light
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                step === 3
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink font-bold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface font-medium'
              }`}
            >
              3. Campaign Formats
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl border border-line hover:border-cta text-ink-2 hover:text-cta-ink bg-surface hover:bg-cta text-xs shadow-xs transition cursor-pointer"
            title={isPaused ? 'Resume autoplay' : 'Pause on current step'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ────────────────── MAIN STAGE VIEWPORT ────────────────── */}
      <div className="relative min-h-[480px] sm:min-h-[520px] p-6 sm:p-8 flex items-center justify-center overflow-hidden dot-grid studio-well">
        {/* ── Central Stage Canvas: Product & Multi-Ratio Layout ── */}
        <div className="relative w-full max-w-4xl flex items-center justify-center">
          {/* Active Product Showcase (Steps 1 & 2) */}
          <div
            className={`transition-all duration-500 flex flex-col items-center justify-center ${
              step === 3 ? 'scale-90 opacity-90 -translate-x-12 hidden md:flex' : 'scale-100'
            }`}
          >
            <div className="relative w-72 sm:w-80 aspect-square rounded-3xl bg-surface border border-line shadow-lift flex flex-col justify-between p-4 overflow-hidden">
              {/* Card Meta */}
              <div className="flex items-center justify-between text-xs text-ink-2 border-b border-line pb-2 mb-2">
                <span className="font-semibold text-ink">
                  Nitro Cold Brew Coffee
                </span>
                <span className="text-ink-2 text-xs font-medium">
                  Label Preservation
                </span>
              </div>

              {/* Photorealistic Commercial Product Photography */}
              <div className="relative flex-1 rounded-2xl overflow-hidden bg-well flex items-center justify-center">
                <img
                  src="/showcase/beverage_kinetix.png"
                  alt="Nitro Cold Brew Coffee commercial studio photography"
                  className="w-full h-full object-cover"
                />

                {/* Clean Precision Label Bounding Box (Step 1 only) */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-8 top-12 bottom-16 border-2 border-emerald-400/90 rounded-xl pointer-events-none bg-emerald-500/10 shadow-sm"
                  >
                    {/* Precision corner handles */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-xs" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-xs" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-xs" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-xs" />
                  </motion.div>
                )}

                {/* Dynamic Studio Key Light Gleam (Step 2) */}
                {step === 2 && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-200"
                    style={{
                      background: `radial-gradient(circle at ${lightGleamX}% ${lightGleamY}%, rgba(255,255,255,0.28) 0%, transparent 60%)`,
                      mixBlendMode: 'screen',
                    }}
                  />
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="flex items-center justify-between border-t border-line pt-2 mt-2 text-[11px] text-ink-2">
                <span>Light Angle: {interactiveLightAngle}°</span>
                <span className="text-ink font-semibold">Original Label Layer</span>
              </div>
            </div>
          </div>

          {/* Step 3: Multi-Platform Commercial Campaign Showcase */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full"
            >
              {[
                {
                  ratio: '1:1',
                  name: 'Catalog & Marketplace',
                  size: '1080×1080',
                  badge: 'Online Catalog',
                  image: '/showcase/ad_kinetix_square.png',
                },
                {
                  ratio: '9:16',
                  name: 'Vertical Video & Stories',
                  size: '1080×1920',
                  badge: 'Vertical Story',
                  image: '/showcase/ad_kinetix_story.png',
                },
                {
                  ratio: '4:5',
                  name: 'Social Feed Portrait',
                  size: '1080×1350',
                  badge: 'Meta Feed Ad',
                  image: '/showcase/ad_kinetix_feed.png',
                },
              ].map((item) => (
                <div
                  key={item.ratio}
                  className="rounded-2xl border border-line bg-surface overflow-hidden flex flex-col justify-between shadow-soft group hover:border-line-strong transition"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between p-3 border-b border-line bg-surface/90 text-xs">
                    <span className="font-bold text-ink bg-well px-2 py-0.5 rounded border border-line">
                      {item.ratio}
                    </span>
                    <span className="text-ink-2 text-[11px]">{item.size}</span>
                  </div>

                  {/* High-Resolution Commercial Asset */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-well">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Card Bottom */}
                  <div className="p-3 text-xs font-semibold text-ink truncate border-t border-line bg-surface">
                    {item.name}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ────────────────── AUTONOMOUS SMART CURSORS ────────────────── */}
        {/* Step 1: Label Lock Cursor */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -40, y: 30 }}
            animate={{ opacity: 1, x: 45, y: -20 }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
            className="absolute z-30 pointer-events-none flex items-start gap-1.5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-sm text-ink">
              <path d="M4 4L11 20L14 13L21 10L4 4Z" fill="#18181B" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
            <div className="px-2.5 py-1 rounded-lg bg-ink text-paper text-xs font-medium shadow-sm whitespace-nowrap">
              Isolating Brand Typography
            </div>
          </motion.div>
        )}

        {/* Step 2: Lighting Cursor */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: -120, y: -80 }}
            animate={{ opacity: 1, x: -80, y: -60 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="absolute z-30 pointer-events-none flex items-start gap-1.5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-sm text-ink">
              <path d="M4 4L11 20L14 13L21 10L4 4Z" fill="#18181B" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
            <div className="px-2.5 py-1 rounded-lg bg-ink text-paper text-xs font-medium shadow-sm whitespace-nowrap">
              Studio Light: {interactiveLightAngle}°
            </div>
          </motion.div>
        )}

        {/* Step 3: Multi-Ratio Layout Cursor */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 120, y: 60 }}
            animate={{ opacity: 1, x: 90, y: 80 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="absolute z-30 pointer-events-none flex items-start gap-1.5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-sm text-ink">
              <path d="M4 4L11 20L14 13L21 10L4 4Z" fill="#18181B" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>
            <div className="px-2.5 py-1 rounded-lg bg-ink text-paper text-xs font-medium shadow-sm whitespace-nowrap">
              Exporting Campaign Kits
            </div>
          </motion.div>
        )}
      </div>

      {/* ────────────────── BOTTOM INTERACTIVE SLIDER BAR ────────────────── */}
      <div className="px-4 sm:px-6 py-3 border-t border-line bg-surface/95 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <span className="text-xs font-semibold text-ink-2 shrink-0 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-ink" /> Test Light Angle:
          </span>
          <input
            type="range"
            min={0}
            max={360}
            value={interactiveLightAngle}
            onChange={(e) => setInteractiveLightAngle(Number(e.target.value))}
            className="ls-range flex-1"
          />
          <span className="text-ink text-xs font-bold w-12 text-right">
            {interactiveLightAngle}°
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-2">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Brand Label Protected
          </span>
          <span>·</span>
          <span>Packaging Clarity</span>
        </div>
      </div>
    </div>
  );
}
