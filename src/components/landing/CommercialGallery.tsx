'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Utensils, User, Package, Grid } from 'lucide-react';
import {
  ALL_SHOWCASE_ITEMS,
  CULINARY_ITEMS,
  FASHION_ITEMS,
  CPG_ITEMS,
  type ShowcaseItem,
} from './showcaseData';

type CollectionType = 'all' | 'culinary' | 'fashion' | 'cpg';

export function CommercialGallery() {
  const [activeCollection, setActiveCollection] = useState<CollectionType>('cpg');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');

  // Sub-category filters depending on active collection
  const subCategoryFilters = React.useMemo(() => {
    switch (activeCollection) {
      case 'culinary':
        return [
          { id: 'all', label: 'All World Culinary (30)' },
          { id: 'nusantara', label: 'Nusantara / Indonesian (8)' },
          { id: 'asia', label: 'East & Southeast Asia (8)' },
          { id: 'west', label: 'Western & European (7)' },
          { id: 'arab', label: 'Middle Eastern & Arabic (7)' },
        ];
      case 'fashion':
        return [
          { id: 'all', label: 'All Fashion & Models (30)' },
          { id: 'women', label: "Women's Haute Couture (8)" },
          { id: 'men', label: "Men's Tailored & Streetwear (7)" },
          { id: 'jewelry', label: 'Luxury Watches & Fine Jewelry (8)' },
          { id: 'accessories', label: 'Bags, Shoes & Accessories (7)' },
        ];
      case 'cpg':
        return [
          { id: 'all', label: 'All CPG Products (30)' },
          { id: 'beauty', label: 'Skincare & Beauty (6)' },
          { id: 'beverages', label: 'Beverages & Energy (6)' },
          { id: 'fragrance', label: 'Luxury Fragrance (6)' },
          { id: 'pantry', label: 'Gourmet Pantry (6)' },
          { id: 'edc', label: 'Everyday Carry (6)' },
        ];
      case 'all':
      default:
        return [
          { id: 'all', label: 'All Showcase (90)' },
          { id: 'culinary', label: 'World Culinary (30)' },
          { id: 'fashion', label: 'Fashion & Models (30)' },
          { id: 'cpg', label: 'CPG & Packaging (30)' },
        ];
    }
  }, [activeCollection]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    let pool: ShowcaseItem[];
    if (activeCollection === 'culinary') pool = CULINARY_ITEMS;
    else if (activeCollection === 'fashion') pool = FASHION_ITEMS;
    else if (activeCollection === 'cpg') pool = CPG_ITEMS;
    else pool = ALL_SHOWCASE_ITEMS;

    if (activeSubCategory === 'all') return pool;

    if (activeCollection === 'all') {
      return pool.filter((item) => item.group === activeSubCategory);
    }

    return pool.filter((item) => item.subCategory === activeSubCategory);
  }, [activeCollection, activeSubCategory]);

  const handleCollectionChange = (coll: CollectionType) => {
    setActiveCollection(coll);
    setActiveSubCategory('all');
  };

  return (
    <div className="flex flex-col gap-10 w-full select-none">
      {/* ────────────────── PRIMARY COLLECTION SELECTOR (Large Tabs) ────────────────── */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-well border border-line shadow-xs max-w-full overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => handleCollectionChange('cpg')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeCollection === 'cpg'
                ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs border-transparent'
                : 'text-ink-2 hover:text-ink hover:bg-surface border-transparent'
            }`}
          >
            <Package className={`w-4 h-4 ${activeCollection === 'cpg' ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>CPG &amp; Packshot</span>
          </button>

          <button
            type="button"
            onClick={() => handleCollectionChange('culinary')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeCollection === 'culinary'
                ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs border-transparent'
                : 'text-ink-2 hover:text-ink hover:bg-surface border-transparent'
            }`}
          >
            <Utensils className={`w-4 h-4 ${activeCollection === 'culinary' ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>World Culinary</span>
          </button>

          <button
            type="button"
            onClick={() => handleCollectionChange('fashion')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeCollection === 'fashion'
                ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs border-transparent'
                : 'text-ink-2 hover:text-ink hover:bg-surface border-transparent'
            }`}
          >
            <User className={`w-4 h-4 ${activeCollection === 'fashion' ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>Fashion &amp; Models</span>
          </button>

          <button
            type="button"
            onClick={() => handleCollectionChange('all')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeCollection === 'all'
                ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs border-transparent'
                : 'text-ink-2 hover:text-ink hover:bg-surface border-transparent'
            }`}
          >
            <Grid className={`w-4 h-4 ${activeCollection === 'all' ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>All Showcases</span>
          </button>
        </div>
      </div>

      {/* ────────────────── SUB-CATEGORY CHIPS ────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {subCategoryFilters.map((sub) => {
          const isActive = activeSubCategory === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setActiveSubCategory(sub.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border cursor-pointer ${
                isActive
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink border-cta shadow-xs'
                  : 'bg-surface text-ink-2 hover:text-ink hover:bg-well border-line hover:border-line-strong'
              }`}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      {/* ────────────────── PRODUCT SHOWCASE GRID ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group rounded-3xl border border-line bg-surface hover:border-line-strong hover:shadow-lift transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            {/* Image Viewport */}
            <div className="relative aspect-[4/3] w-full bg-well overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 select-none"
              />
            </div>

            {/* Content Details */}
            <div className="p-5 flex flex-col justify-between flex-1 gap-4">
              <div>
                <h3 className="font-bold text-base text-ink group-hover:text-ink transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-ink-2 mt-1.5 leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-well border border-line text-[11px] text-ink-2">
                  <span className="font-semibold text-ink">Staging &amp; Light: </span>
                  {item.lighting}
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-3 border-t border-line flex items-center justify-between">
                <span className="text-[11px] text-ink-3">Studio-Lit Staging</span>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-well text-ink border border-line px-3 py-1.5 rounded-xl transition shadow-xs group-hover:bg-cta group-hover:text-cta-ink group-hover:border-cta hover:bg-cta hover:text-cta-ink hover:border-cta"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
