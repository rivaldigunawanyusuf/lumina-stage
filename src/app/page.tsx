'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  Sun,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Camera,
  User,
  Utensils,
  ShieldCheck,
} from 'lucide-react';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PackshotToStageComparison } from '@/components/landing/PackshotToStageComparison';
import { CommercialGallery } from '@/components/landing/CommercialGallery';
import { StudioDarkroomFeatures } from '@/components/landing/StudioDarkroomFeatures';
import { FashionModelShowcaseSection } from '@/components/landing/FashionModelShowcaseSection';
import { EditorialStudioBento } from '@/components/landing/EditorialStudioBento';
import { Wordmark } from '@/components/ui/BrandMark';
import { useSession } from '@/lib/session';

// Dynamically load client-only interactive components with zero SSR hydration mismatch
const MultiCursorStage = dynamic(
  () => import('@/components/landing/MultiCursorStage').then((m) => m.MultiCursorStage),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl border border-line bg-surface flex items-center justify-center text-xs text-ink-3">
        Loading Interactive Studio…
      </div>
    ),
  }
);

const StudioPodium3D = dynamic(
  () => import('@/components/landing/StudioPodium3D').then((m) => m.StudioPodium3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl border border-line bg-surface flex items-center justify-center text-xs text-ink-3">
        Loading 3D Lighting Stage…
      </div>
    ),
  }
);

const FAQS = [
  {
    q: 'How does LuminaStage keep packaging labels and fine text sharp?',
    a: 'Standard generative AI re-creates the entire image from noise, which frequently garbles fine typography, barcodes, and regulatory badges. LuminaStage isolates your product label and layers the original, untouched camera pixels over the new background and 3D lighting to maintain packaging readability.',
  },
  {
    q: 'What kind of product photos can I upload?',
    a: 'You can upload everyday smartphone photos, flat lays, or white-background catalog shots in JPEG, PNG, or WebP formats up to 20MB. Our background removal tool automatically extracts the product outline so you can place it in any setting.',
  },
  {
    q: 'How does the interactive 3D lighting work?',
    a: 'Rather than guessing static lighting, our lighting tool lets you position the key light in 360°. It dynamically projects realistic ground contact shadows and directional cast shadows so the product looks naturally integrated into the scene.',
  },
  {
    q: 'Is there a free tier to test the studio?',
    a: 'Yes. You can test all studio tools, background generators, 3D lighting controls, and export ad kits completely free of charge without entering a credit card.',
  },
  {
    q: 'What export sizes and formats are provided?',
    a: 'You can export high-resolution PNGs tailored for e-commerce marketplaces (1:1 Square, 1080×1080), Vertical Video & Stories (9:16 Vertical, 1080×1920), and social feeds (4:5 Portrait, 1080×1350) with safe zones pre-configured.',
  },
];

export default function LandingPage() {
  const { session } = useSession();
  const studioUrl = session ? '/dashboard' : '/login?redirect=/dashboard';
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-dvh flex flex-col bg-paper text-ink selection:bg-accent/20">
      <LandingNavbar />

      <main className="flex-1 flex flex-col">
        {/* ────────────────── 1. HERO SECTION WITH FLANKING VISUALS ────────────────── */}
        <section className="relative pt-8 sm:pt-16 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
          {/* Subtle atmospheric radial backlight */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-amber-100/25 via-emerald-100/15 to-blue-100/15 dark:from-amber-950/20 dark:via-emerald-950/15 dark:to-blue-950/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
            {/* 3-Part Flanking Layout: Left Fashion Model, Center Hero Copy, Right Staged Product */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16">
              {/* ── LEFT FLANKING VISUAL: Virtual Fashion Model ── */}
              <div className="hidden lg:flex lg:col-span-3 flex-col items-center">
                <div className="w-full max-w-[240px] aspect-[3/4] rounded-3xl overflow-hidden border border-line bg-surface shadow-lift p-2 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-well">
                    <img
                      src="/showcase/model_01_silk_evening_gown.png"
                      alt="Virtual Haute Couture Fashion Editorial"
                      className="w-full h-full object-cover select-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── CENTER HERO COPY & ACTIONS ── */}
              <div className="lg:col-span-6 flex flex-col items-center text-center px-2">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-ink leading-[1.08] mb-6">
                  Commercial product photography with{' '}
                  <span className="relative inline-block text-ink underline decoration-emerald-500 decoration-wavy decoration-2 underline-offset-8">
                    full lighting control.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-ink-2 max-w-xl leading-relaxed mb-8">
                  Place packaging, apparel, and culinary goods into photorealistic 3D studio environments with 360° light control, soft ground shadows, and multi-format campaign kits.
                </p>

                {/* Primary CTA Group */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-6">
                  <Link
                    href={studioUrl}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-sm font-bold flex items-center justify-center gap-2.5 shadow-lift hover:opacity-95 transition group"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <a
                    href="#showcase"
                    className="w-full sm:w-auto px-7 py-4 rounded-full bg-surface hover:bg-well border border-line hover:border-line-strong text-ink hover:text-ink text-sm font-semibold transition shadow-soft flex items-center justify-center gap-2"
                  >
                    <span>Explore 90 Showcases</span>
                  </a>
                </div>

                {/* Micro Trust Indicators */}
                <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Pre-seeded Judge Live Access
                  </span>
                  <span className="text-ink-3">·</span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Dedicated Label Preservation
                  </span>
                </div>
              </div>

              {/* ── RIGHT FLANKING VISUAL: Staged Product Packshot ── */}
              <div className="hidden lg:flex lg:col-span-3 flex-col items-center">
                <div className="w-full max-w-[240px] aspect-[3/4] rounded-3xl overflow-hidden border border-line bg-surface shadow-lift p-2 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-well">
                    <img
                      src="/showcase/showcase_01_aura_serum.png"
                      alt="Commercial Staged Product Photography"
                      className="w-full h-full object-cover select-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Interactive Showcase Stage */}
            <div id="studio-tour" className="w-full max-w-5xl rounded-3xl border border-line bg-surface shadow-lift p-1">
              <MultiCursorStage />
            </div>
          </div>
        </section>

        {/* ────────────────── 2. EDITORIAL STUDIO BENTO SHOWCASE ────────────────── */}
        <EditorialStudioBento />

        {/* ────────────────── 3. EDITORIAL DARKROOM STUDIO SECTION ────────────────── */}
        <StudioDarkroomFeatures />

        {/* ────────────────── 4. ALTERNATING Z-PATTERN: ROW 1 (Packshot to Lifestyle) ────────────────── */}
        <section id="pixel-lock" className="py-20 sm:py-28 px-4 sm:px-6 bg-well/40 border-b border-line">
          <div className="max-w-6xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink max-w-xl">
                  Turn plain catalog packshots into editorial campaigns.
                </h2>
              </div>
              <p className="text-sm text-ink-2 max-w-md leading-relaxed">
                Take a standard white e-commerce catalog shot and place it into sun-drenched travertine stone,
                botanical foliage, and directional 3D light while keeping your packaging marks completely crisp.
              </p>
            </div>

            {/* Interactive Before & After Transformation Slider */}
            <PackshotToStageComparison />
          </div>
        </section>

        {/* ────────────────── 5. ALTERNATING Z-PATTERN: ROW 2 (Directional 3D Studio Lighting) ────────────────── */}
        <section id="podium-3d" className="py-20 sm:py-28 px-4 sm:px-6 bg-paper border-b border-line">
          <div className="max-w-6xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink max-w-xl">
                  Realistic studio lighting &amp; soft shadows. Never flat stickers.
                </h2>
              </div>
              <p className="text-sm text-ink-2 max-w-md leading-relaxed">
                Position the key light in full 360° to match the mood of your product. Our lighting engine
                calculates soft contact occlusion and gentle rim reflections so your item looks grounded in the scene.
              </p>
            </div>

            {/* Interactive 3D Cyclorama Stage */}
            <StudioPodium3D />
          </div>
        </section>

        {/* ────────────────── 6. ALTERNATING Z-PATTERN: ROW 3 (Virtual Fashion Models & Accessories) ────────────────── */}
        <FashionModelShowcaseSection />

        {/* ────────────────── 7. MULTI-PLATFORM CAMPAIGN AD KITS ────────────────── */}
        <section id="multi-ratio" className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink max-w-xl">
                One photo shoot. All social and catalog ratios.
              </h2>
            </div>
            <p className="text-sm text-ink-2 max-w-md leading-relaxed">
              No manual cropping or awkward dead space. LuminaStage positions your product, headlines, and
              safe zones automatically for every marketing channel.
            </p>
          </div>

          {/* Visual Creative Multi-Device Spread */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            {/* 1:1 Catalog Square */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-square w-full rounded-3xl overflow-hidden border border-line bg-surface shadow-soft group hover:shadow-lift transition-all duration-300 p-2">
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-well">
                  <img
                    src="/showcase/ad_kinetix_square.png"
                    alt="1:1 Catalog and Marketplace Square"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between text-xs font-mono text-ink">
                  <span className="font-bold">1:1 Square</span>
                  <span className="text-ink-3">1080×1080</span>
                </div>
                <div className="text-sm font-bold text-ink">Marketplace &amp; Catalog</div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Clean central product composition with ground contact shadows, optimized for e-commerce listings and feed grids.
                </p>
              </div>
            </div>

            {/* 9:16 Vertical Story (Tall Phone Proportions) */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[9/16] w-full max-w-[320px] mx-auto rounded-[36px] overflow-hidden border-2 border-line bg-surface shadow-lift group hover:shadow-xl transition-all duration-300 p-2.5">
                <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-black">
                  <img
                    src="/showcase/ad_kinetix_story.png"
                    alt="9:16 Vertical Stories and Stories"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  {/* Subtle Phone Speaker bar */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/20 rounded-full pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between text-xs font-mono text-ink">
                  <span className="font-bold">9:16 Full Screen</span>
                  <span className="text-ink-3">1080×1920</span>
                </div>
                <div className="text-sm font-bold text-ink">Vertical Video &amp; Stories</div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Vertical immersion with automatic UI clearance for account handles, sound titles, and engagement icons.
                </p>
              </div>
            </div>

            {/* 4:5 Feed Portrait */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden border border-line bg-surface shadow-soft group hover:shadow-lift transition-all duration-300 p-2">
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-well">
                  <img
                    src="/showcase/ad_kinetix_feed.png"
                    alt="4:5 Social Feed Sponsored Ad"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between text-xs font-mono text-ink">
                  <span className="font-bold">4:5 Portrait</span>
                  <span className="text-ink-3">1080×1350</span>
                </div>
                <div className="text-sm font-bold text-ink">Meta Sponsored Feed</div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Maximizes mobile screen height on feeds for highest click-through rates and clear headline readability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────── 8. CURATED COMMERCIAL STUDIO SHOWCASE (90 ASSETS) ────────────────── */}
        <section id="showcase" className="py-20 sm:py-28 px-4 sm:px-6 max-w-6xl mx-auto w-full border-t border-line">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink mb-3">
              Commercial imagery across food, fashion, models &amp; packaging
            </h2>
            <p className="text-sm text-ink-2">
              Explore 90 studio-grade commercial photographs staged with LuminaStage. Switch between CPG &amp; Packshot (30), World Culinary (30), and Fashion &amp; Editorial Models (30).
            </p>
          </div>

          {/* Interactive Filterable Gallery */}
          <CommercialGallery />
        </section>

        {/* ────────────────── 9. TECHNICAL COMPARISON MATRIX (Why Brands Choose LuminaStage) ────────────────── */}
        <section id="comparison" className="py-20 sm:py-28 px-4 sm:px-6 bg-well/30 border-y border-line">
          <div className="max-w-6xl mx-auto flex flex-col gap-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink mb-3">
                Why Brands Choose LuminaStage
              </h2>
              <p className="text-sm text-ink-2">
                How LuminaStage compares to traditional photo studios and generic AI image generators.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-well/60 text-ink">
                    <th className="p-4 sm:p-5 font-bold text-sm">Capability</th>
                    <th className="p-4 sm:p-5 font-semibold text-ink-2">Traditional Photo Studio</th>
                    <th className="p-4 sm:p-5 font-semibold text-ink-2">Generic AI Generator</th>
                    <th className="p-4 sm:p-5 font-bold text-ink">
                      LuminaStage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-2">
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-ink">Cost per Shoot</td>
                    <td className="p-4 sm:p-5">$1,500 - $5,000</td>
                    <td className="p-4 sm:p-5">$0.05 - $0.20</td>
                    <td className="p-4 sm:p-5 font-bold text-ink">Free Studio Tier</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-ink">Packaging Labels &amp; Logos</td>
                    <td className="p-4 sm:p-5 text-ink font-medium">Original Photo Fidelity</td>
                    <td className="p-4 sm:p-5 text-rose-600 dark:text-rose-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5" /> Warps &amp; Blurs Text
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Original Label Preserved
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-ink">Lighting &amp; Shadows</td>
                    <td className="p-4 sm:p-5">Physical Light Grips</td>
                    <td className="p-4 sm:p-5 text-rose-600 dark:text-rose-400">Random / Unpredictable</td>
                    <td className="p-4 sm:p-5 font-bold text-ink">
                      Interactive 3D Directional Light
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-ink">Multi-Platform Formats</td>
                    <td className="p-4 sm:p-5">Manual Cropping &amp; Retouch</td>
                    <td className="p-4 sm:p-5 text-rose-600 dark:text-rose-400">Inconsistent Aspect Ratios</td>
                    <td className="p-4 sm:p-5 font-bold text-ink">
                      Instant 1:1, 9:16 &amp; 4:5 Ad Kit
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-ink">Turnaround Time</td>
                    <td className="p-4 sm:p-5">1 to 3 Weeks</td>
                    <td className="p-4 sm:p-5">30 Seconds</td>
                    <td className="p-4 sm:p-5 font-bold text-ink">
                      Instant (Real-Time In-Browser)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ────────────────── 10. FREQUENTLY ASKED QUESTIONS ────────────────── */}
        <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 max-w-4xl mx-auto w-full">
          <div className="flex flex-col gap-8">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-ink-2">
                Simple answers about our product photography engine and studio tools.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-ink hover:text-ink transition"
                    >
                      <span>{faq.q}</span>
                      <span className="p-1 rounded-lg bg-well border border-line text-ink-2">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-ink-2 leading-relaxed border-t border-line pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ────────────────── 11. FINAL EDITORIAL CTA BANNER ────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-6xl mx-auto w-full">
          <div className="rounded-3xl p-8 sm:p-16 border border-line bg-surface shadow-lift text-center flex flex-col items-center relative overflow-hidden">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-ink max-w-3xl mb-6">
              Commercial product staging designed for brand packaging.
            </h2>

            <p className="text-sm sm:text-base text-ink-2 max-w-xl mb-10 leading-relaxed">
              Create brand-accurate product imagery, fashion lookbooks, and multi-ratio ad kits in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href={studioUrl}
                className="w-full sm:w-auto px-9 py-4 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-sm font-bold flex items-center justify-center gap-2 shadow-lift hover:opacity-95 transition"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?redirect=/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-surface hover:bg-well border border-line text-ink hover:text-ink text-sm font-semibold hover:border-line-strong transition shadow-soft"
              >
                Instant Judge Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ────────────────── 12. COMPREHENSIVE FOOTER ────────────────── */}
      <footer className="border-t border-line bg-surface/80 py-14 px-4 sm:px-8 text-xs text-ink-2">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="flex flex-col gap-3 max-w-sm">
            <Wordmark href="/" size="md" />
            <p className="text-[11px] leading-relaxed text-ink-3">
              The AI photo studio for real brands. Built for the Meta Global AI Developer Hackathon 2026.
            </p>
            <div className="text-xs text-ink-3 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>All Systems Operational</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[11.5px]">
            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-ink">Product</span>
              <Link href="/dashboard" className="hover:text-ink transition">Dashboard</Link>
              <Link href="/dashboard" className="hover:text-ink transition">Workspace</Link>
              <a href="#podium-3d" className="hover:text-ink transition">3D Lighting</a>
              <a href="#pixel-lock" className="hover:text-ink transition">Label Protection</a>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-ink">Showcase</span>
              <Link href="/dashboard" className="hover:text-ink transition">Botanical Serum (Cosmetics)</Link>
              <Link href="/dashboard" className="hover:text-ink transition">Nitro Cold Brew (Beverage)</Link>
              <Link href="/dashboard" className="hover:text-ink transition">Wildflower Honey (Food)</Link>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-ink">Event</span>
              <span className="text-ink-3">Meta Hackathon 2026</span>
              <span className="text-ink-3">Theme 1: World Track</span>
              <Link href="/login" className="hover:text-ink transition">Demo Access</Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-ink-3">
          <span>© 2026 LuminaStage. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-ink transition">Privacy</Link>
            <Link href="/dashboard" className="hover:text-ink transition">Terms</Link>
            <Link href="/dashboard" className="hover:text-ink transition">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
