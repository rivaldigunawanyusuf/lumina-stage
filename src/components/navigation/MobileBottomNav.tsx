'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  SlidersHorizontal,
  Wand2,
  Camera,
  ImagePlus,
  Sparkles,
  X,
  User,
  CheckCircle2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useSession, DEMO_PROFILE, initialsOf } from '@/lib/session';
import { fileToDataUrl } from '@/lib/imaging/canvas';
import { saveUserAsset } from '@/lib/storage/userAssets';
import { useStudioStore } from '@/store/studioStore';

interface MobileBottomNavProps {
  className?: string;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
}

export function MobileBottomNav({
  className = '',
  onToggleInspector,
  isInspectorOpen = false,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const activeUser = session ?? DEMO_PROFILE;

  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);

  // Process camera or gallery image
  const handleProcessFile = async (file: File, sourceLabel: string) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPEG, WebP).');
      return;
    }

    setIsProcessing(true);
    try {
      const dataUrl = await fileToDataUrl(file, 1600);
      const cleanName = file.name.replace(/\.[^/.]+$/, '') || `${sourceLabel} Capture`;

      // Save to real user library
      saveUserAsset({
        name: cleanName,
        type: 'upload',
        categoryLabel: 'My Uploads',
        dataUrl,
        thumbnailUrl: dataUrl,
        sizeBytes: file.size,
        dimensions: { width: 1024, height: 1024 },
        aspectRatio: '1:1',
      });

      // Load into studio with live Meta AI pipeline
      await loadUploadedPhoto(dataUrl, 'META_PROD');
      setIsActionSheetOpen(false);

      if (pathname === '/studio') {
        router.replace('/studio', { scroll: false });
      } else {
        router.push('/studio');
      }
    } catch (err) {
      console.error('Mobile upload failed:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const isStudioPage = pathname === '/studio';
  const isDashboardPage = pathname === '/dashboard';
  const isFilesPage = pathname === '/files';
  const isBillingPage = pathname === '/billing';

  return (
    <>
      {/* ────────────────── MOBILE BOTTOM NAVIGATION BAR ────────────────── */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-line px-3 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift transition-transform ${className}`}
        aria-label="Mobile Navigation"
      >
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          {/* Tab 1: Dashboard */}
          <Link
            href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition ${
              isDashboardPage ? 'text-accent font-bold' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Home</span>
          </Link>

          {/* Tab 2: My Files / Library */}
          <Link
            href="/files"
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition ${
              isFilesPage ? 'text-accent font-bold' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <FolderKanban className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">My Files</span>
          </Link>

          {/* ────────────────── CENTER ADD NEW PRODUCT BUTTON ────────────────── */}
          <div className="flex-1 flex justify-center items-center">
            <button
              type="button"
              onClick={() => setIsActionSheetOpen(true)}
              className="relative -top-3.5 flex flex-col items-center group cursor-pointer focus:outline-none"
              aria-label="Add New Product from Camera or Gallery"
            >
              <div className="w-13 h-13 rounded-full bg-cta text-cta-ink shadow-lift flex items-center justify-center border-4 border-paper group-active:scale-95 group-hover:shadow-glow transition duration-200">
                <Plus className="w-6 h-6 stroke-[2.75]" />
              </div>
              <span className="text-[10px] font-bold text-ink mt-0.5 tracking-tight">New</span>
            </button>
          </div>

          {/* Tab 4: Studio / Inspector */}
          {isStudioPage && onToggleInspector ? (
            <button
              type="button"
              onClick={onToggleInspector}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                isInspectorOpen ? 'text-accent font-bold' : 'text-ink-2 hover:text-ink'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Inspector</span>
            </button>
          ) : (
            <Link
              href="/studio"
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition ${
                isStudioPage ? 'text-accent font-bold' : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Wand2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Studio</span>
            </Link>
          )}

          {/* Tab 5: Account & Plan */}
          <Link
            href="/billing"
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition ${
              isBillingPage ? 'text-accent font-bold' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <div className="relative mb-0.5">
              <div className="w-5 h-5 rounded-full bg-well border border-line flex items-center justify-center text-[9px] font-bold text-ink">
                {initialsOf(activeUser.name)}
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-surface animate-pulse" />
            </div>
            <span className="text-[10px] leading-tight">Account</span>
          </Link>
        </div>
      </nav>

      {/* ────────────────── MOBILE ACTION SHEET (CAMERA / GALLERY / PRESET) ────────────────── */}
      {isActionSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop overlay dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => !isProcessing && setIsActionSheetOpen(false)}
          />

          {/* Sheet Drawer Container */}
          <div className="relative bg-surface border-t border-line rounded-t-3xl p-5 shadow-lift max-w-lg mx-auto w-full animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            {/* Top Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <span>Add Product Photo</span>
                </h3>
                <p className="text-xs text-ink-2 mt-0.5">
                  Take a photo with your camera or choose one from your phone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsActionSheetOpen(false)}
                disabled={isProcessing}
                className="p-1.5 rounded-xl bg-well text-ink-2 hover:text-ink transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Action Buttons: Camera & Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              {/* Option 1: Take Photo with Camera */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => cameraInputRef.current?.click()}
                className="p-4 rounded-2xl border-2 border-line hover:border-accent bg-well/60 hover:bg-well flex items-center gap-3.5 transition text-left cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>Take Photo</span>
                  </div>
                  <p className="text-[11px] text-ink-2 mt-0.5 leading-snug">
                    Take a product photo using your camera
                  </p>
                </div>
              </button>

              {/* Option 2: Choose from Gallery */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => galleryInputRef.current?.click()}
                className="p-4 rounded-2xl border-2 border-line hover:border-accent bg-well/60 hover:bg-well flex items-center gap-3.5 transition text-left cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <ImagePlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>Choose from Photos</span>
                  </div>
                  <p className="text-[11px] text-ink-2 mt-0.5 leading-snug">
                    Pick an existing photo from your phone
                  </p>
                </div>
              </button>
            </div>

            {/* Hidden Input Elements */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleProcessFile(f, 'Camera');
              }}
            />

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleProcessFile(f, 'Gallery');
              }}
            />

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mt-4 p-3 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center gap-2 text-xs font-semibold text-accent animate-pulse">
                <span>Preparing your product photo…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

