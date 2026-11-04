'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Upload,
  FolderOpen,
  ArrowRight,
  Download,
  Trash2,
  HardDrive,
  Image as ImageIcon,
  CheckCircle2,
  Building,
  LogOut,
  Wand2,
} from 'lucide-react';
import { Wordmark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { useSession, signOut, initialsOf, DEMO_PROFILE } from '@/lib/session';
import {
  getUserAssets,
  saveUserAsset,
  deleteUserAsset,
  downloadUserAsset,
  formatFileSize,
  formatDate,
  type UserAsset,
} from '@/lib/storage/userAssets';
import { fileToDataUrl } from '@/lib/imaging/canvas';
import { useStudioStore } from '@/store/studioStore';

type FilterType = 'all' | 'upload' | 'render' | 'adkit';

export default function FilesPage() {
  const router = useRouter();
  const { session, ready } = useSession();
  const activeUser = session ?? DEMO_PROFILE;

  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);
  const loadSample = useStudioStore((s) => s.loadSample);

  useEffect(() => {
    if (ready && !session) {
      router.push('/login?redirect=/files');
    }
  }, [ready, session, router]);

  useEffect(() => {
    setAssets(getUserAssets());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserAsset[]>;
      if (customEvent.detail) {
        setAssets(customEvent.detail);
      } else {
        setAssets(getUserAssets());
      }
    };

    window.addEventListener('luminastage:assets_updated', handleUpdate);
    return () => {
      window.removeEventListener('luminastage:assets_updated', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP).');
      return;
    }

    setIsUploading(true);
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

      showToast(`Uploaded "${file.name}" to My Files`);
      setAssets(getUserAssets());

      await loadUploadedPhoto(dataUrl, 'META_PROD');
      router.push('/studio');
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to process image upload. Please try another image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleProcessFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleProcessFile(file);
  };

  const handleOpenInStudio = async (asset: UserAsset) => {
    if (asset.sampleId) {
      await loadSample(asset.sampleId, 'META_PROD');
      router.push(`/studio?sample=${asset.sampleId}`);
      return;
    }

    await loadUploadedPhoto(asset.dataUrl, 'META_PROD');
    router.push('/studio');
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Delete "${name}" from your files?`)) {
      deleteUserAsset(id);
      showToast(`Deleted "${name}"`);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    if (activeFilter !== 'all' && asset.type !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.categoryLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSize = assets.reduce((acc, a) => acc + (a.sizeBytes || 2500000), 0);

  return (
    <div className="h-dvh flex bg-paper text-ink overflow-hidden">
      {/* ────────────────── PERSISTENT LEFT APP SIDEBAR ────────────────── */}
      <AppSidebar className="hidden md:flex" />

      {/* ────────────────── MAIN WORKSPACE CONTENT ────────────────── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="flex-1 flex flex-col h-dvh overflow-y-auto min-w-0 relative"
      >
        {/* Drag Overlay Notice */}
        {isDragging && (
          <div className="fixed inset-0 bg-surface/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center gap-3 pointer-events-none text-accent">
            <Upload className="w-12 h-12 animate-bounce" />
            <div className="text-sm font-bold">Drop photo anywhere to upload &amp; open in Studio</div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-surface border border-line shadow-lift px-4 py-2.5 flex items-center gap-2 text-xs text-ink animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* 56px Top Header Bar (Aligned 1:1 with AppSidebar, Dashboard & Studio) */}
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
                  placeholder="Search your files…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-full bg-well border border-line text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Open Studio Quick Link */}
              <Link
                href="/studio"
                className="group hidden sm:flex px-3 py-1.5 rounded-full bg-well hover:bg-cta border border-line hover:border-cta text-xs font-semibold text-ink hover:text-cta-ink items-center gap-1.5 transition"
              >
                <Wand2 className="w-3.5 h-3.5 text-accent group-hover:text-cta-ink transition-colors" />
                <span>Photo Studio</span>
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

        {/* Page Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-8 flex flex-col gap-6 sm:gap-8">
          {/* Page Title & Primary Upload Action */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-surface border border-line text-ink flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                <FolderOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                    My Files &amp; Library
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-well text-ink-2 font-mono text-xs font-semibold border border-line">
                    {assets.length} files
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-ink-2 mt-1">
                  Manage your uploaded product photos, studio results, and downloaded ad kits.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2.5 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold flex items-center justify-center gap-2 shadow-soft hover:opacity-90 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading Photo…' : 'Upload Product Photo'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Filter Tabs & Storage Bar */}
          <div className="p-3 rounded-2xl bg-surface border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center bg-well border border-line rounded-xl p-1 text-xs gap-1">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                    : 'text-ink-2 hover:text-ink hover:bg-surface'
                }`}
              >
                All Files ({assets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('upload')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeFilter === 'upload'
                    ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                    : 'text-ink-2 hover:text-ink hover:bg-surface'
                }`}
              >
                My Uploads ({assets.filter((a) => a.type === 'upload').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('render')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeFilter === 'render'
                    ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                    : 'text-ink-2 hover:text-ink hover:bg-surface'
                }`}
              >
                Studio Results ({assets.filter((a) => a.type === 'render').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('adkit')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeFilter === 'adkit'
                    ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                    : 'text-ink-2 hover:text-ink hover:bg-surface'
                }`}
              >
                Ad Kits ({assets.filter((a) => a.type === 'adkit').length})
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="relative flex-1 sm:w-56 md:hidden">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-well border border-line text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-well border border-line text-xs font-mono text-ink-2">
                <HardDrive className="w-3.5 h-3.5 text-accent" />
                <span>Total Size: {formatFileSize(totalSize)}</span>
              </span>
            </div>
          </div>

          {/* Files Grid */}
          {filteredAssets.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center gap-3 text-center p-6 border-2 border-dashed border-line rounded-3xl bg-surface">
              <div className="w-12 h-12 rounded-2xl bg-well border border-line flex items-center justify-center text-ink-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink">No files found</div>
                <div className="text-xs text-ink-3 mt-1 max-w-sm">
                  {searchQuery
                    ? `No files match "${searchQuery}". Try another search term.`
                    : 'Upload your product photo to start editing in the studio.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold flex items-center gap-2 shadow-xs hover:opacity-90 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Photo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => void handleOpenInStudio(asset)}
                  className="group rounded-3xl border border-line bg-surface hover:border-line-strong hover:shadow-soft transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[4/3] w-full bg-well overflow-hidden flex items-center justify-center p-3 dot-grid border-b border-line">
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="w-full h-full object-contain group-hover:scale-103 transition-transform duration-300 select-none"
                    />

                    {/* Type Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-surface/90 backdrop-blur-md border border-line text-[10px] font-bold text-ink shadow-xs">
                      {asset.type === 'upload' && 'Upload'}
                      {asset.type === 'render' && 'Studio Result'}
                      {asset.type === 'adkit' && 'Ad Kit'}
                    </div>

                    {asset.aspectRatio && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-mono">
                        {asset.aspectRatio}
                      </div>
                    )}
                  </div>

                  {/* Details & Actions */}
                  <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-ink truncate group-hover:text-accent transition">
                        {asset.name}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-ink-3 mt-1">
                        <span>{formatDate(asset.createdAt)}</span>
                        <span>{formatFileSize(asset.sizeBytes)}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenInStudio(asset);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-well text-ink border border-line text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer group-hover:bg-cta group-hover:text-cta-ink group-hover:border-cta hover:bg-cta hover:text-cta-ink hover:border-cta"
                      >
                        <span>Open in Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadUserAsset(asset);
                            showToast(`Downloading "${asset.name}"`);
                          }}
                          className="p-2 rounded-xl bg-well hover:bg-cta border border-line hover:border-cta text-ink-2 hover:text-cta-ink transition cursor-pointer"
                          title="Download high-resolution image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, asset.id, asset.name)}
                          className="p-2 rounded-xl bg-well hover:bg-rose-600 border border-line hover:border-rose-600 text-ink-2 hover:text-white transition cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ────────────────── MOBILE BOTTOM NAVIGATION BAR ────────────────── */}
      <MobileBottomNav />
    </div>
  );
}

