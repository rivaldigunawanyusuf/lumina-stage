'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Upload,
  Layers,
  CreditCard,
  Sparkles,
  FolderKanban,
  Wand2,
  Building,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Wordmark, BrandMark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSession, signOut, initialsOf, DEMO_PROFILE } from '@/lib/session';
import { fileToDataUrl } from '@/lib/imaging/canvas';
import { saveUserAsset } from '@/lib/storage/userAssets';
import { useStudioStore } from '@/store/studioStore';

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className = '' }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const user = session ?? DEMO_PROFILE;

  const isCollapsed = useStudioStore((s) => s.sidebarCollapsed);
  const setIsCollapsed = useStudioStore((s) => s.setSidebarCollapsed);
  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPEG, WebP).');
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file, 1600);

      // Save to user asset library
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

      // Load into studio workstation using live Meta AI pipeline
      await loadUploadedPhoto(dataUrl, 'META_PROD');

      // Navigate or clear sample query param so upload stays active
      if (pathname === '/studio') {
        router.replace('/studio', { scroll: false });
      } else {
        router.push('/studio');
      }
    } catch (err) {
      console.error('Upload processing failed:', err);
      alert('Failed to process image. Please try another file.');
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

  return (
    <>
      <aside
        className={`h-dvh border-r border-line bg-surface flex flex-col justify-between shrink-0 select-none z-30 transition-[width] duration-200 ease-out relative ${
          isCollapsed ? 'w-16' : 'w-60'
        } ${className}`}
      >
        {/* ── 56px TOP BRAND HEADER (Aligned 1:1 with Page Header) ── */}
        <div className="h-14 px-3 border-b border-line flex items-center justify-between gap-2 shrink-0">
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 mx-auto rounded-xl hover:bg-well flex items-center justify-center text-ink transition cursor-pointer"
              title="Expand Sidebar"
            >
              <BrandMark className="h-5 w-5 text-ink" />
            </button>
          ) : (
            <>
              <Wordmark href="/" size="sm" />
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-well transition cursor-pointer shrink-0"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* ── MIDDLE NAVIGATION & UPLOAD SECTION ── */}
        <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3 custom-scrollbar">
          {/* Expand button when collapsed */}
          {isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-8 mx-auto rounded-lg bg-well/70 hover:bg-well text-ink-2 hover:text-ink flex items-center justify-center transition cursor-pointer"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Workspace Pill (Expanded) */}
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-well text-xs text-ink-2">
              <div className="flex items-center gap-2 truncate">
                <Building className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                <span className="font-semibold text-ink truncate text-[11px]">{user.workspace}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
          )}

          {/* UPLOAD ACTION */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={isUploading}
            onChange={handleFileChange}
          />

          {isCollapsed ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Upload Product Photo"
              className="w-10 h-10 mx-auto rounded-xl bg-cta text-cta-ink flex items-center justify-center hover:opacity-90 transition shadow-xs cursor-pointer"
            >
              <Upload className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
            </button>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer ${
                isDragging
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line hover:border-line-strong bg-well/40 hover:bg-well/70 text-ink'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-surface border border-line flex items-center justify-center text-ink shadow-xs">
                <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce text-emerald-500' : 'text-accent'}`} />
              </div>
              <div>
                <div className="text-xs font-bold text-ink">
                  {isUploading ? 'Uploading…' : 'Upload Photo'}
                </div>
                <div className="text-[10px] text-ink-3 mt-0.5">
                  Drag &amp; drop PNG, JPG
                </div>
              </div>
            </div>
          )}

          {/* MAIN NAVIGATION LINKS */}
          <div className="flex flex-col gap-1">
            {/* 1. Home (Dashboard) */}
            <Link
              href="/dashboard"
              title={isCollapsed ? 'Home' : undefined}
              className={`py-2 rounded-xl text-xs font-semibold flex items-center transition ${
                isCollapsed ? 'w-10 h-10 mx-auto justify-center px-0' : 'justify-between px-3'
              } ${
                pathname === '/dashboard'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-well'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Home</span>}
              </div>
            </Link>

            {/* 2. Photo Studio */}
            <Link
              href="/studio"
              title={isCollapsed ? 'Photo Studio' : undefined}
              className={`group py-2 rounded-xl text-xs font-semibold flex items-center transition ${
                isCollapsed ? 'w-10 h-10 mx-auto justify-center px-0' : 'justify-between px-3'
              } ${
                pathname === '/studio'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-well'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wand2 className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Photo Studio</span>}
              </div>
              {!isCollapsed && (
                <span
                  className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                    pathname === '/studio'
                      ? 'bg-black/15 dark:bg-black/15 text-cta-ink'
                      : 'bg-well group-hover:bg-surface text-ink-2 group-hover:text-ink border border-line'
                  }`}
                >
                  Editor
                </span>
              )}
            </Link>

            {/* 3. My Files */}
            <Link
              href="/files"
              title={isCollapsed ? 'My Files' : undefined}
              className={`group py-2 rounded-xl text-xs font-semibold flex items-center transition ${
                isCollapsed ? 'w-10 h-10 mx-auto justify-center px-0' : 'justify-between px-3'
              } ${
                pathname === '/files'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-well'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban
                  className={`w-4 h-4 shrink-0 ${
                    pathname === '/files' ? 'text-cta-ink' : 'text-accent'
                  }`}
                />
                {!isCollapsed && <span>My Files</span>}
              </div>
              {!isCollapsed && (
                <span
                  className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                    pathname === '/files'
                      ? 'bg-black/15 dark:bg-black/15 text-cta-ink'
                      : 'bg-well group-hover:bg-surface text-ink-2 group-hover:text-ink border border-line'
                  }`}
                >
                  Library
                </span>
              )}
            </Link>

            {/* 4. Account & Plan */}
            <Link
              href="/billing"
              title={isCollapsed ? 'Account & Plan' : undefined}
              className={`group py-2 rounded-xl text-xs font-semibold flex items-center transition ${
                isCollapsed ? 'w-10 h-10 mx-auto justify-center px-0' : 'justify-between px-3'
              } ${
                pathname === '/billing'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-well'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard
                  className={`w-4 h-4 shrink-0 ${
                    pathname === '/billing'
                      ? 'text-cta-ink'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
                {!isCollapsed && <span>Account &amp; Plan</span>}
              </div>
              {!isCollapsed && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    pathname === '/billing'
                      ? 'bg-black/15 dark:bg-black/15 border-current/20 text-cta-ink'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  Free
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ── BOTTOM PROFILE & THEME ── */}
        <div className="p-2.5 border-t border-line bg-surface flex flex-col gap-2 shrink-0">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/billing"
                className="w-8 h-8 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-bold flex items-center justify-center cursor-pointer"
                title={`${user.name} (${user.workspace})`}
              >
                {initialsOf(user.name)}
              </Link>
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Link
                href="/billing"
                className="flex items-center gap-2.5 truncate cursor-pointer hover:opacity-80 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-cta text-cta-ink text-xs font-bold flex items-center justify-center shrink-0">
                  {initialsOf(user.name)}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-ink truncate leading-tight">{user.name}</div>
                  <div className="text-[10px] text-ink-3 truncate leading-tight">{user.email}</div>
                </div>
              </Link>

              <div className="flex items-center gap-1 shrink-0">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    router.push('/');
                  }}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-well transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
