'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

interface ModelFeature {
  id: string;
  category: string;
  title: string;
  tag: string;
  description: string;
  image: string;
  details: string;
}

const MODEL_SHOWCASES: ModelFeature[] = [
  {
    id: 'gown',
    category: 'Haute Couture',
    title: 'Emerald Silk Satin Evening Gown',
    tag: 'Women’s Editorial',
    description: 'Dramatic architectural folds, natural silk sheen, and lifelike skin tones staged against minimalist travertine stone in warm golden sunlight.',
    image: '/showcase/model_01_silk_evening_gown.png',
    details: 'Editorial directional sunlight · Travertine terrace',
  },
  {
    id: 'suit',
    category: 'Tailored Menswear',
    title: 'Bespoke Double-Breasted Italian Suit',
    tag: 'Men’s Luxury',
    description: 'Crisp midnight navy wool tailoring, silk pocket square, and structured shoulders captured with classic GQ studio cyclorama lighting.',
    image: '/showcase/model_09_tailored_italian_suit.png',
    details: 'Classic studio cyclorama · Sharp peak lapels',
  },
  {
    id: 'watch',
    category: 'Luxury Horology',
    title: 'Brushed Titanium Chronograph Watch',
    tag: 'Macro Wrist Shot',
    description: 'Sub-millimeter macro dial clarity, ceramic bezel reflections, and lifelike wrist geometry under commercial studio softbox lighting.',
    image: '/showcase/model_16_luxury_chronograph_wrist.png',
    details: 'Commercial horology lighting · Ceramic bezel',
  },
  {
    id: 'eyewear',
    category: 'Designer Eyewear',
    title: 'Polarized Titanium Aviator Sunglasses',
    tag: 'Beauty & Eyewear',
    description: 'Amber lens reflections, natural skin pores, and sun-kissed natural daylight without artificial plastic skin smoothing.',
    image: '/showcase/model_18_polarized_aviators_face.png',
    details: 'Natural sun caustics · Amber polarized reflections',
  },
  {
    id: 'handbag',
    category: 'Leather Goods',
    title: 'Full-Grain Leather Crossbody Saddle Bag',
    tag: 'Lifestyle Accessories',
    description: 'Rich full-grain leather grain, burnished edges, and polished brass hardware worn by an editorial model in motion.',
    image: '/showcase/model_24_leather_crossbody_shoulder.png',
    details: 'Editorial street style · Polished brass hardware',
  },
];

export function FashionModelShowcaseSection() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeItem = MODEL_SHOWCASES[selectedIdx];

  return (
    <section id="fashion-models" className="py-20 sm:py-28 px-4 sm:px-6 bg-well/40 border-b border-line">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink max-w-xl">
              Showcase apparel &amp; accessories on editorial models.
            </h2>
          </div>
          <p className="text-sm text-ink-2 max-w-md leading-relaxed">
            Generate high-fashion lookbooks, tailored menswear, luxury watches, and designer accessories
            without booking multi-thousand dollar photo crews or renting studio spaces.
          </p>
        </div>

        {/* Interactive Selector Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {MODEL_SHOWCASES.map((item, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border cursor-pointer ${
                  isSelected
                    ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink border-cta shadow-xs'
                    : 'bg-surface text-ink-2 hover:text-ink hover:bg-well border-line hover:border-line-strong'
                }`}
              >
                <span>{item.category}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Split View */}
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 shadow-soft">
          {/* Main Visual Display */}
          <div className="relative w-full lg:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden border border-line bg-well flex-shrink-0 group">
            <img
              src={activeItem.image}
              alt={activeItem.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 select-none"
            />
          </div>

          {/* Descriptive Content */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between gap-6">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3 tracking-tight">
                {activeItem.title}
              </h3>
              <p className="text-sm text-ink-2 leading-relaxed mb-6">
                {activeItem.description}
              </p>

              {/* 3 Key Model Advantages */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-line text-xs text-ink-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>Authentic fabric weight, fold physics, and seam stitching</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>Natural skin texture, realistic hands, and accurate lighting reflections</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>Full commercial license for e-commerce, catalog, and paid advertising</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-full bg-cta text-cta-ink text-xs font-bold flex items-center gap-2 shadow-lift hover:opacity-95 transition"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#showcase"
                className="text-xs font-semibold text-ink-2 hover:text-ink transition flex items-center gap-1"
              >
                <span>View all 30 model photos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
