'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Camera, Sun, Layers, ShieldCheck, ArrowRight, Sparkles, User, Utensils, Check } from 'lucide-react';

interface StudioDemoTab {
  id: string;
  name: string;
  icon: React.ElementType;
  badge: string;
  title: string;
  description: string;
  image: string;
  specs: { label: string; value: string }[];
  sampleId: string;
}

const STUDIO_TABS: StudioDemoTab[] = [
  {
    id: 'packshot',
    name: 'Packshot Staging',
    icon: Camera,
    badge: 'Packaging Fidelity',
    title: 'Transform isolated bottles & packshots into editorial scenes',
    description: 'Keep your product label 100% crisp while placing it on sun-drenched travertine pedestals with natural olive branch caustics and true ground contact shadows.',
    image: '/showcase/showcase_01_aura_serum.png',
    specs: [
      { label: 'Label Fidelity', value: 'Original packaging preservation' },
      { label: 'Lighting', value: '58° Warm Studio Key' },
      { label: 'Surface', value: 'Travertine stone pedestal' },
      { label: 'Shadows', value: 'Soft directional occlusion' },
    ],
    sampleId: 'aura',
  },
  {
    id: 'fashion',
    name: 'Fashion & Models',
    icon: User,
    badge: 'Virtual Haute Couture',
    title: 'Showcase apparel & jewelry on editorial fashion models',
    description: 'Eliminate $5,000+ photo crew bookings. Generate high-fashion editorial imagery showcasing silk gowns, tailored suits, luxury watches, and fine jewelry on realistic models.',
    image: '/showcase/model_01_silk_evening_gown.png',
    specs: [
      { label: 'Garment', value: 'Emerald green silk satin gown' },
      { label: 'Lighting', value: 'Haute editorial golden key' },
      { label: 'Anatomy', value: 'Natural skin texture & draping' },
      { label: 'Environment', value: 'Travertine architectural terrace' },
    ],
    sampleId: 'aura',
  },
  {
    id: 'culinary',
    name: 'Culinary & Dining',
    icon: Utensils,
    badge: 'Commercial Gastronomy',
    title: 'Appetizing commercial food styling for menus & delivery ads',
    description: 'Stage artisanal ramen bowls, artisan burgers, sushi platters, and authentic regional dishes with glistening sauces, fresh herbs, and macro spotlight illumination.',
    image: '/showcase/food_10_tonkotsu_ramen.png',
    specs: [
      { label: 'Dish', value: 'Rich Tonkotsu Pork Belly Ramen' },
      { label: 'Lighting', value: 'Macro tabletop food studio key' },
      { label: 'Texture', value: 'Black garlic oil & chashu glisten' },
      { label: 'Styling', value: 'Japanese ceramic stoneware' },
    ],
    sampleId: 'veloce',
  },
  {
    id: 'multiratio',
    name: 'Multi-Ratio Kits',
    icon: Layers,
    badge: 'Instant Social Kits',
    title: 'One photo session automatically formatted for every platform',
    description: 'Export ready-to-run assets in 1:1 Catalog Square, 9:16 Vertical Reels/Stories, and 4:5 Feed Portrait without awkward cropping or blurred margins.',
    image: '/showcase/showcase_07_kinetix_can.png',
    specs: [
      { label: '1:1 Square', value: '1080×1080 Marketplace catalog' },
      { label: '9:16 Vertical', value: '1080×1920 Vertical Stories' },
      { label: '4:5 Portrait', value: '1080×1350 High-CTR sponsored' },
      { label: 'Safe Zones', value: 'Built-in UI clearance' },
    ],
    sampleId: 'kinetix',
  },
];

export function StudioDarkroomFeatures() {
  const [activeTabId, setActiveTabId] = useState<string>('packshot');

  const currentTab = STUDIO_TABS.find((t) => t.id === activeTabId) || STUDIO_TABS[0];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-zinc-950 text-white border-y border-zinc-800 relative overflow-hidden">
      {/* Subtle Dot Grid Background */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #71717a 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-6xl mx-auto flex flex-col gap-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-xl">
              Commercial staging suite engineered for high-converting visual assets.
            </h2>
          </div>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
            Replace costly photography studio rentals, lighting grips, and manual retouching. LuminaStage gives
            your creative team full control over scenes, lighting angles, and packaging fidelity.
          </p>
        </div>

        {/* Studio Switcher Tabs */}
        <div className="flex items-center justify-start overflow-x-auto pb-2 gap-2 border-b border-zinc-800">
          {STUDIO_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2.5 whitespace-nowrap border cursor-pointer ${
                  isActive
                    ? 'bg-white text-zinc-950 hover:bg-white hover:text-zinc-950 border-white shadow-sm'
                    : 'bg-zinc-900/70 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Studio Preview Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 shadow-2xl">
          {/* Visual Canvas Display */}
          <div className="relative w-full lg:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 group">
            <img
              src={currentTab.image}
              alt={currentTab.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 select-none"
            />
          </div>

          {/* Details & Specs */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between gap-6">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
                {currentTab.title}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {currentTab.description}
              </p>
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
              {currentTab.specs.map((spec, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-[10.5px] uppercase tracking-wider text-zinc-500 font-mono">
                    {spec.label}
                  </span>
                  <span className="text-zinc-200 font-medium truncate">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Action */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold flex items-center gap-2 transition shadow-sm"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Free instant browser trial
              </span>
            </div>
          </div>
        </div>

        {/* Minimalist Studio Highlights */}
        <div className="pt-8 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-1.5 md:pr-6 md:border-r border-zinc-800/80">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Clear Logo &amp; Text
            </div>
            <div className="text-xs font-semibold text-zinc-300">
              Original Label Protected
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Your product logo, text, and fine details stay sharp and untouched when changing the background.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 md:px-6 md:border-r border-zinc-800/80">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              360° Studio Lighting
            </div>
            <div className="text-xs font-semibold text-zinc-300">
              Natural Light &amp; Shadows
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Adjust light direction and brightness with automatic shadows and gentle edge reflections.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 md:pl-6">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Ready for Every Platform
            </div>
            <div className="text-xs font-semibold text-zinc-300">
              Square, Story &amp; Feed Sizes
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Download images formatted for online stores, mobile stories, and social media posts in one click.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
