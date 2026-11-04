'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  Edit2,
  Check,
  LayoutGrid,
  SplitSquareVertical,
  SlidersHorizontal,
  X,
  Upload,
  FolderKanban,
} from 'lucide-react';
import { Wordmark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { StudioStepRail } from '@/components/studio/StudioStepRail';
import { ContextualInspector } from '@/components/studio/ContextualInspector';
import { MultiRatioAdStudio } from '@/components/studio/MultiRatioAdStudio';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { ARTBOARD_ORDER, ARTBOARD_SPECS } from '@/lib/compositor/layout';
import { exportMultiRatioAdKitZip } from '@/lib/compositor/export';
import { renderArtboard } from '@/lib/compositor/compositor';
import { fileToDataUrl, createCanvas } from '@/lib/imaging/canvas';
import { saveUserAsset } from '@/lib/storage/userAssets';
import { useStudioStore } from '@/store/studioStore';
import { useSession } from '@/lib/session';
import type { SampleId } from '@/lib/providers/types';

function StudioSkeleton() {
  return (
    <div className="h-dvh flex bg-paper text-ink overflow-hidden">
      <div className="hidden md:flex w-60 border-r border-line bg-surface flex-col animate-pulse">
        <div className="h-14 border-b border-line px-4 flex items-center">
          <div className="w-32 h-5 rounded bg-well" />
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-line bg-surface/90 px-4 flex items-center justify-between animate-pulse">
          <div className="w-48 h-4 rounded bg-well" />
          <div className="w-32 h-8 rounded-xl bg-well" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-ink-2 text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span>Initializing LuminaStage Studio…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sampleParam = searchParams.get('sample') as SampleId | null;

  const { session, ready } = useSession();

  const pipelineResult = useStudioStore((s) => s.pipelineResult);
  const activeSampleId = useStudioStore((s) => s.activeSampleId);
  const uploadedImageUrl = useStudioStore((s) => s.uploadedImageUrl);
  const loadSample = useStudioStore((s) => s.loadSample);
  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);
  const isRunning = useStudioStore((s) => s.isRunning);
  const preparedAssets = useStudioStore((s) => s.preparedAssets);

  const artboardView = useStudioStore((s) => s.artboardView);
  const setArtboardView = useStudioStore((s) => s.setArtboardView);
  const inspectorEnabled = useStudioStore((s) => s.inspectorEnabled);
  const setInspectorEnabled = useStudioStore((s) => s.setInspectorEnabled);
  const activeStep = useStudioStore((s) => s.activeStep);

  const lightingVector = useStudioStore((s) => s.lightingVector);
  const adCopy = useStudioStore((s) => s.adCopy);
  const scenePrompt = useStudioStore((s) => s.scenePrompt);

  // Project title editing
  const [projectTitle, setProjectTitle] = useState('Botanical Serum · Campaign Kit');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state & notifications
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile bottom drawer for inspector
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Track last applied URL sample param so sidebar/inspector clicks are never overwritten
  const lastAppliedSampleParamRef = useRef<string | null>(null);

  // Redirect unauthenticated users to login with pre-seeded credentials
  useEffect(() => {
    if (ready && !session) {
      const target = sampleParam ? `/studio?sample=${sampleParam}` : '/studio';
      router.push(`/login?redirect=${encodeURIComponent(target)}`);
    }
  }, [ready, session, router, sampleParam]);

  // Apply URL ?sample= param once when it changes, or initialize default sample once
  useEffect(() => {
    if (sampleParam && ['aura', 'kinetix', 'veloce'].includes(sampleParam)) {
      if (lastAppliedSampleParamRef.current !== sampleParam) {
        lastAppliedSampleParamRef.current = sampleParam;
        if ((!pipelineResult || activeSampleId !== sampleParam) && !isRunning) {
          void loadSample(sampleParam, 'META_PROD');
        }
      }
    } else {
      lastAppliedSampleParamRef.current = null;
      if (!pipelineResult && !isRunning && !uploadedImageUrl) {
        void loadSample(activeSampleId || 'kinetix', 'META_PROD');
      }
    }
  }, [sampleParam, pipelineResult, activeSampleId, uploadedImageUrl, loadSample, isRunning]);

  // Update default project title based on active sample
  useEffect(() => {
    if (activeSampleId === 'kinetix') {
      setProjectTitle('Nitro Cold Brew · Launch Kit');
    } else if (activeSampleId === 'aura') {
      setProjectTitle('Botanical Serum · Campaign Kit');
    } else if (activeSampleId === 'veloce') {
      setProjectTitle('Wildflower Honey · Social Kit');
    }
  }, [activeSampleId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file, 1600);
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

      await loadUploadedPhoto(dataUrl, 'META_PROD');
      router.replace('/studio', { scroll: false });
      setProjectTitle(`${file.name.replace(/\.[^/.]+$/, '')} · Commercial Shoot`);
      setToastMessage(`Loaded "${file.name}" into studio workspace`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to load image upload:', err);
      alert('Failed to process image upload.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportAdKit = async () => {
    if (!preparedAssets || !pipelineResult) return;
    setIsExportingZip(true);
    try {
      await exportMultiRatioAdKitZip({
        assets: preparedAssets,
        lighting: lightingVector,
        adCopy,
        providerUsed: pipelineResult.providerUsed,
        scenePrompt,
      });

      try {
        const spec = ARTBOARD_SPECS['1:1'];
        const c = createCanvas(spec.width, spec.height);
        renderArtboard(c, '1:1', preparedAssets, {
          lighting: lightingVector,
          adCopy,
          pixelLockEnabled: true,
          inspectorEnabled: false,
        });
        const previewUrl = c.toDataURL('image/png');
        saveUserAsset({
          name: `${projectTitle} · 3-Ratio Ad Kit`,
          type: 'adkit',
          categoryLabel: 'Exported Ad Kits',
          dataUrl: previewUrl,
          thumbnailUrl: previewUrl,
          dimensions: { width: 1080, height: 1080 },
          aspectRatio: '1:1',
        });
      } catch (err) {
        console.error('Failed to save ad kit to library:', err);
      }

      setToastMessage('Downloaded all 3 image sizes and saved to My Files');
      setTimeout(() => setToastMessage(null), 3800);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="h-dvh flex bg-paper text-ink overflow-hidden">
      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ────────────────── PERSISTENT LEFT APP SIDEBAR (Identical shell to /dashboard) ────────────────── */}
      <AppSidebar className="hidden md:flex" />

      {/* ────────────────── RIGHT WORKSPACE COLUMN ────────────────── */}
      <div className="flex-1 flex flex-col h-dvh overflow-hidden min-w-0 relative">
        {/* 56px Top Header Bar (Aligned 1:1 with AppSidebar top bar & Dashboard header) */}
        <header className="h-14 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          {/* Left: Mobile Wordmark / Back Link + Project Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="md:hidden">
              <Wordmark href="/dashboard" size="sm" />
            </div>

            <Link
              href="/dashboard"
              className="hidden md:inline-flex p-1.5 rounded-lg bg-well hover:bg-cta border border-line hover:border-cta text-ink-2 hover:text-cta-ink transition shrink-0"
              title="Back to Workspace Hub"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>

            <div className="h-4 w-px bg-line hidden sm:block shrink-0" />

            {/* Project Title */}
            <div className="flex items-center gap-2 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="px-2 py-0.5 rounded-lg bg-well border border-accent text-xs font-semibold text-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1 rounded-lg hover:bg-well text-ink-2 hover:text-ink"
                  >
                    <Check className="w-3.5 h-3.5 text-accent" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="group flex items-center gap-1.5 text-left min-w-0 max-w-[160px] sm:max-w-[280px] cursor-pointer"
                  title="Click to rename shoot"
                >
                  <span className="font-semibold text-xs text-ink truncate group-hover:text-accent transition">
                    {projectTitle}
                  </span>
                  <Edit2 className="w-3 h-3 text-ink-3 group-hover:text-ink-2 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* Center: View Mode Switcher + Before/After Compare */}
          <div className="hidden md:flex items-center gap-2">
            {/* Size View Switcher */}
            <div className="flex items-center bg-well border border-line rounded-xl p-1 text-xs gap-0.5">
              <button
                type="button"
                onClick={() => setArtboardView('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  artboardView === 'all'
                    ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-sm'
                    : 'text-ink-2 hover:text-ink hover:bg-surface'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">All 3 Sizes</span>
                <span className="lg:hidden">All</span>
              </button>
              {ARTBOARD_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setArtboardView(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    artboardView === r
                      ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-sm'
                      : 'text-ink-2 hover:text-ink hover:bg-surface'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Before/After Compare Toggle */}
            <button
              type="button"
              onClick={() => setInspectorEnabled(!inspectorEnabled)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                inspectorEnabled
                  ? 'bg-cta border-cta text-cta-ink hover:bg-cta hover:text-cta-ink'
                  : 'bg-surface hover:bg-well border-line hover:border-line-strong text-ink-2 hover:text-ink'
              }`}
              title={inspectorEnabled ? 'Exit Before / After View' : 'Compare Original vs Edited'}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{inspectorEnabled ? 'Exit Compare' : 'Before / After'}</span>
            </button>
          </div>

          {/* Right: Theme Toggle + Download All Sizes */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />

            <button
              type="button"
              disabled={!preparedAssets || isExportingZip}
              onClick={() => void handleExportAdKit()}
              className="h-9 px-3 sm:px-4 rounded-xl bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition shadow-sm shrink-0 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isExportingZip ? 'Preparing Download…' : 'Download All (.ZIP)'}
              </span>
              <span className="sm:hidden">{isExportingZip ? '…' : 'Download'}</span>
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-surface border border-line shadow-lift px-4 py-2.5 flex items-center gap-2.5 text-xs text-ink animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Studio Main Body: Central Canvas + Right Inspector */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Central Viewport */}
          <main className="flex-1 h-full overflow-y-auto dot-grid studio-well p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 flex flex-col justify-start">
            <MultiRatioAdStudio showHeader={false} />
          </main>

          {/* Desktop Right Inspector (380px) */}
          <aside className="hidden lg:flex w-[380px] border-l border-line bg-surface flex-col h-full overflow-hidden shrink-0 shadow-soft">
            <div className="p-3 border-b border-line bg-surface/90 backdrop-blur-xs">
              <StudioStepRail />
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <ContextualInspector />
            </div>
          </aside>

          {/* Tablet Floating Drawer Toggle (md to lg) */}
          <div className="hidden md:flex lg:hidden fixed bottom-6 right-6 z-40 items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl bg-surface border border-line text-ink shadow-lift hover:bg-well transition cursor-pointer"
              title="Upload Photo"
            >
              <Upload className="w-4 h-4 text-accent" />
            </button>
            <Link
              href="/files"
              className="p-3 rounded-2xl bg-surface border border-line text-ink shadow-lift hover:bg-well transition"
              title="My Files"
            >
              <FolderKanban className="w-4 h-4 text-ink-2" />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="px-4 py-3 rounded-2xl bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink font-semibold text-xs shadow-lift flex items-center gap-2 hover:opacity-95 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Inspector (Step {activeStep})</span>
            </button>
          </div>

          {/* Mobile / Tablet Slide-up Drawer */}
          {isMobileDrawerOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-surface border-t border-line rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-lift animate-in slide-in-from-bottom duration-200">
                <div className="p-3 border-b border-line flex items-center justify-between">
                  <StudioStepRail className="flex-1 mr-2" />
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-2 rounded-xl bg-well text-ink-2 hover:text-ink shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <ContextualInspector />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────── MOBILE UNIFIED BOTTOM NAVIGATION (< md) ────────────────── */}
      <MobileBottomNav
        onToggleInspector={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        isInspectorOpen={isMobileDrawerOpen}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <StudioContent />
    </Suspense>
  );
}
