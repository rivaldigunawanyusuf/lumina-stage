'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Upload,
  Search,
  Sliders,
  Sparkles,
  ArrowRight,
  Archive,
  Layers,
  ChevronRight,
  LogOut,
  FolderOpen,
  FolderKanban,
  CreditCard,
  Building,
} from 'lucide-react';
import { Wordmark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { useSession, signOut, initialsOf, DEMO_PROFILE } from '@/lib/session';
import { SAMPLE_CATALOG } from '@/lib/samples/mockAnalyses';
import { useSampleArt } from '@/lib/samples/sampleArt';
import { fileToDataUrl } from '@/lib/imaging/canvas';
import { saveUserAsset } from '@/lib/storage/userAssets';
import { useStudioStore } from '@/store/studioStore';

// Plain Raw (Before) & Studio Staged (After) pairs for production starter items
const STARTER_REAL_PHOTOS: Record<string, { rawImage: string; stagedImage: string; category: string }> = {
  aura: {
    rawImage: '/showcase/packshot_aura_raw.png',
    stagedImage: '/showcase/showcase_01_aura_serum.png',
    category: 'Skincare & Beauty',
  },
  kinetix: {
    rawImage: '/showcase/beverage_kinetix.png',
    stagedImage: '/showcase/showcase_07_kinetix_can.png',
    category: 'Cold Brew Beverage',
  },
  veloce: {
    rawImage: '/showcase/food_veloce.png',
    stagedImage: '/showcase/showcase_19_veloce_honey.png',
    category: 'Culinary & Honey',
  },
};

// Recent production-grade multi-ratio campaigns showcased in dashboard
const RECENT_CAMPAIGNS = [
  {
    id: 'campaign-01',
    sampleId: 'aura' as const,
    title: 'Botanical Serum · Glow Ritual',
    subtitle: 'Amber glass bottle · Travertine sunlit stage',
    date: 'Today',
    image: '/showcase/showcase_01_aura_serum.png',
    ratios: ['1:1 Square', '9:16 Story', '4:5 Feed'],
  },
  {
    id: 'campaign-02',
    sampleId: 'kinetix' as const,
    title: 'Nitro Cold Brew · Dark Slate Launch',
    subtitle: 'Matte aluminum can · Dark slate cold mist',
    date: 'Yesterday',
    image: '/showcase/ad_kinetix_square.png',
    ratios: ['1:1 Square', '9:16 Story', '4:5 Feed'],
  },
  {
    id: 'campaign-03',
    sampleId: 'veloce' as const,
    title: 'Wildflower Honey · Golden Harvest',
    subtitle: 'Hexagonal glass jar · Carrara marble stage',
    date: 'Nov 03',
    image: '/showcase/showcase_19_veloce_honey.png',
    ratios: ['1:1 Square', '9:16 Story', '4:5 Feed'],
  },
];

// Preset sample thumbnail card component showing Plain (Before) -> Staged (After)
function StarterProductCard({
  id,
  brand,
  product,
  tagline,
  swatch,
  onSelect,
}: {
  id: 'aura' | 'kinetix' | 'veloce';
  brand: string;
  product: string;
  tagline: string;
  swatch: string;
  onSelect: () => void;
}) {
  const itemPhoto = STARTER_REAL_PHOTOS[id];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="p-4 rounded-3xl border border-line bg-surface hover:border-line-strong hover:shadow-soft text-left transition flex flex-col justify-between group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-black/10 shrink-0"
            style={{ backgroundColor: swatch }}
          />
          <span className="font-bold text-xs text-ink">{brand}</span>
        </div>
        <span className="text-[11px] font-mono text-ink-3">
          {itemPhoto?.category ?? 'Commercial Product'}
        </span>
      </div>

      {/* Side-by-Side Plain Raw (Before) -> Studio Staged (After) */}
      <div className="relative h-48 w-full rounded-2xl bg-well grid grid-cols-2 gap-1.5 p-1.5 mb-3 overflow-hidden border border-line/60">
        <div className="relative rounded-xl overflow-hidden bg-[#F7F6F2] flex items-center justify-center">
          <img
            src={itemPhoto?.rawImage || '/showcase/packshot_aura_raw.png'}
            alt={`${brand} Original Photo`}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/65 text-[9px] font-medium text-white">
            Original Photo
          </span>
        </div>
        <div className="relative rounded-xl overflow-hidden bg-surface flex items-center justify-center">
          <img
            src={itemPhoto?.stagedImage || '/showcase/showcase_01_aura_serum.png'}
            alt={`${brand} Studio Result`}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-900/85 text-[9px] font-medium text-emerald-200">
            Studio Result
          </span>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-ink group-hover:text-accent transition">
          {product}
        </div>
        <div className="text-[11px] text-ink-2 truncate">{tagline}</div>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, ready } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready && !session) {
      router.push('/login?redirect=/dashboard');
    }
  }, [ready, session, router]);

  const loadSample = useStudioStore((s) => s.loadSample);
  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);

  const activeUser = session ?? DEMO_PROFILE;

  const handlePickSample = (id: 'aura' | 'kinetix' | 'veloce') => {
    void loadSample(id, 'META_PROD');
    router.push(`/studio?sample=${id}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file, 1600);

      // Save to real user library
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

      void loadUploadedPhoto(dataUrl, 'META_PROD');
      router.push('/studio');
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload image. Please try another file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-dvh flex bg-paper text-ink overflow-hidden">
      {/* ────────────────── PERSISTENT LEFT APP SIDEBAR (Identical shell to /studio) ────────────────── */}
      <AppSidebar className="hidden md:flex" />

      {/* ────────────────── MAIN WORKSPACE CONTENT ────────────────── */}
      <div className="flex-1 flex flex-col h-dvh overflow-y-auto min-w-0">
        {/* 56px Top Header Bar (Aligned 1:1 with AppSidebar top bar & Studio header) */}
        <header className="h-14 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden">
                <Wordmark href="/" size="sm" />
              </div>
              <div className="text-xs font-semibold text-ink hidden sm:flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-ink-2" />
                <span>{activeUser.workspace}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search Input */}
              <div className="relative hidden md:block w-60">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your projects…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-full bg-well border border-line text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
              </div>

              {/* My Files Quick Action */}
              <Link
                href="/files"
                className="group hidden sm:flex px-3 py-1.5 rounded-full bg-well hover:bg-cta border border-line hover:border-cta text-xs font-semibold text-ink hover:text-cta-ink items-center gap-1.5 transition cursor-pointer"
                title="Open My Files"
              >
                <FolderKanban className="w-3.5 h-3.5 text-accent group-hover:text-cta-ink transition-colors" />
                <span>My Files</span>
              </Link>

              <ThemeToggle />

              {/* User Avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-line">
                <Link
                  href="/billing"
                  className="w-8 h-8 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-bold flex items-center justify-center cursor-pointer"
                  title="Account & Plan"
                >
                  {initialsOf(activeUser.name)}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    router.push('/');
                  }}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-well transition hidden sm:inline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-8 flex flex-col gap-8 sm:gap-10">
          {/* Quick Start Hero Action */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                  Welcome, {activeUser.name}
                </h1>
                <p className="text-xs sm:text-sm text-ink-2 mt-1">
                  Upload your product photo or try one of the example products below.
                </p>
              </div>

              {/* Direct Upload Button */}
              <div className="flex items-center gap-2">
                <Link
                  href="/files"
                  className="px-4 py-2.5 rounded-full bg-surface hover:bg-well border border-line hover:border-line-strong text-ink hover:text-ink text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-accent" />
                  <span>My Files</span>
                </Link>

                <label className="cursor-pointer px-4 py-2.5 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold flex items-center justify-center gap-2 shadow-soft hover:opacity-90 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading Photo…' : 'Upload Product Photo'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* 3 Example Product Cards (Before & After) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {SAMPLE_CATALOG.map((item) => (
                <StarterProductCard
                  key={item.id}
                  id={item.id}
                  brand={item.brand}
                  product={item.product}
                  tagline={item.tagline}
                  swatch={item.swatch}
                  onSelect={() => handlePickSample(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Recent Projects Grid */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <span>Recent Projects</span>
              </h2>
              <Link
                href="/files"
                className="text-xs font-semibold text-ink hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Files</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {RECENT_CAMPAIGNS.map((campaign) => (
                <div
                  key={campaign.id}
                  className="group p-4 rounded-2xl border border-line bg-surface hover:border-line-strong transition duration-300 flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div>
                    {/* Visual Photo Preview */}
                    <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-well mb-3 border border-line">
                      <img
                        src={campaign.image}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-medium text-white/90">
                        3 Sizes Ready
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-ink group-hover:text-accent transition">
                        {campaign.title}
                      </span>
                      <span className="text-[10px] text-ink-3">{campaign.date}</span>
                    </div>
                    <p className="text-[11px] text-ink-2 mb-2 line-clamp-1">{campaign.subtitle}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-2">
                      {campaign.ratios.map((ratio) => (
                        <span key={ratio} className="px-2 py-0.5 rounded bg-well border border-line/60">
                          {ratio}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePickSample(campaign.sampleId)}
                      className="w-full py-2 rounded-xl bg-well text-ink border border-line text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer group-hover:bg-cta group-hover:text-cta-ink group-hover:border-cta hover:bg-cta hover:text-cta-ink hover:border-cta"
                    >
                      <span>Open in Studio</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ────────────────── MOBILE BOTTOM NAVIGATION BAR ────────────────── */}
      <MobileBottomNav />
    </div>
  );
}
