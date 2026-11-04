'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Search,
  Upload,
  FolderOpen,
  ArrowRight,
  Download,
  Trash2,
  HardDrive,
  ExternalLink,
  Sparkles,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
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

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: UserAsset) => void;
}

type FilterType = 'all' | 'upload' | 'render' | 'adkit';

export function FileManagerModal({ isOpen, onClose, onSelectAsset }: FileManagerModalProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUploadedPhoto = useStudioStore((s) => s.loadUploadedPhoto);
  const loadSample = useStudioStore((s) => s.loadSample);

  // Load assets from storage, listen to custom updates, and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    setAssets(getUserAssets());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('luminastage:assets_updated', handleUpdate);
    };
  }, [isOpen, onClose]);

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
      const newAsset = saveUserAsset({
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'upload',
        categoryLabel: 'My Uploads',
        dataUrl,
        thumbnailUrl: dataUrl,
        sizeBytes: file.size,
        dimensions: { width: 1024, height: 1024 },
        aspectRatio: '1:1',
      });

      showToast(`Uploaded "${file.name}" to library!`);
      setAssets(getUserAssets());

      // If user wants to open directly in studio
      await loadUploadedPhoto(dataUrl, 'META_PROD');
      onClose();
      router.push('/studio?upload=1');
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to process image upload. Please try another image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleOpenInStudio = async (asset: UserAsset) => {
    if (onSelectAsset) {
      onSelectAsset(asset);
      onClose();
      return;
    }

    if (asset.sampleId) {
      await loadSample(asset.sampleId, 'META_PROD');
      onClose();
      router.push(`/studio?sample=${asset.sampleId}`);
      return;
    }

    // Real uploaded or rendered image
    await loadUploadedPhoto(asset.dataUrl, 'META_PROD');
    onClose();
    router.push('/studio?upload=1');
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Delete "${name}" from your library?`)) {
      deleteUserAsset(id);
      showToast(`Deleted "${name}"`);
    }
  };

  // Filtered list
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl rounded-3xl border border-line bg-surface shadow-lift overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-manager-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-well border border-line text-ink flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="file-manager-title" className="text-base font-bold text-ink">
                  File Management &amp; Content Library
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-well text-ink-2 font-mono text-[10px] font-semibold border border-line">
                  {assets.length} items
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                Manage your uploaded packshots, generated scenes, and exported ad kits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold flex items-center gap-2 shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading…' : 'Upload Image'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-well hover:bg-cta border border-line hover:border-cta text-ink-2 hover:text-cta-ink transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters, and Stats */}
        <div className="px-6 py-3 border-b border-line bg-well/30 flex flex-wrap items-center justify-between gap-3">
          {/* Filters */}
          <div className="flex items-center bg-well border border-line rounded-xl p-1 text-xs gap-0.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
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
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
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
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeFilter === 'render'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface'
              }`}
            >
              Studio Renders ({assets.filter((a) => a.type === 'render').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('adkit')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeFilter === 'adkit'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface'
              }`}
            >
              Ad Kits ({assets.filter((a) => a.type === 'adkit').length})
            </button>
          </div>

          {/* Search + Storage Pill */}
          <div className="flex items-center gap-3">
            <div className="relative w-52">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets…"
                className="w-full pl-8 pr-3 py-1 rounded-lg bg-surface border border-line text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-line text-[10.5px] font-mono text-ink-3">
              <HardDrive className="w-3 h-3 text-ink-2" />
              <span>{formatFileSize(totalSize)}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar relative ${
            isDragging ? 'bg-accent/5 border-2 border-dashed border-accent' : ''
          }`}
        >
          {/* Drag Overlay Notice */}
          {isDragging && (
            <div className="absolute inset-0 bg-surface/90 backdrop-blur-xs z-30 flex flex-col items-center justify-center gap-3 pointer-events-none text-accent">
              <Upload className="w-12 h-12 animate-bounce" />
              <div className="text-sm font-bold">Drop image anywhere to upload &amp; stage in studio</div>
            </div>
          )}

          {/* Toast */}
          {toastMessage && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-surface border border-line shadow-lift px-4 py-2 flex items-center gap-2 text-xs text-ink animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {filteredAssets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 border-2 border-dashed border-line rounded-2xl bg-well/30">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-ink-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink">No files found</div>
                <div className="text-xs text-ink-3 mt-1 max-w-sm">
                  {searchQuery
                    ? `No assets match "${searchQuery}". Try a different keyword.`
                    : 'Upload your own product photograph to start staging in the studio.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl bg-cta text-cta-ink text-xs font-semibold flex items-center gap-2 shadow-xs hover:opacity-90"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Photo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleOpenInStudio(asset)}
                  className="group rounded-2xl border border-line bg-surface hover:border-line-strong hover:shadow-soft transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[4/3] w-full bg-well overflow-hidden flex items-center justify-center p-2 dot-grid">
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="w-full h-full object-contain group-hover:scale-103 transition-transform duration-300 select-none"
                    />

                    {/* Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur-md border border-line text-[10px] font-bold text-ink shadow-xs">
                      {asset.type === 'upload' && 'Upload'}
                      {asset.type === 'render' && 'Render'}
                      {asset.type === 'adkit' && 'Ad Kit'}
                    </div>

                    {asset.aspectRatio && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-mono">
                        {asset.aspectRatio}
                      </div>
                    )}
                  </div>

                  {/* Details & Actions */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                    <div>
                      <h4 className="font-bold text-xs text-ink truncate group-hover:text-accent transition">
                        {asset.name}
                      </h4>
                      <div className="flex items-center justify-between text-[10.5px] text-ink-3 mt-1">
                        <span>{formatDate(asset.createdAt)}</span>
                        <span>{formatFileSize(asset.sizeBytes)}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2.5 border-t border-line flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInStudio(asset);
                        }}
                        className="px-3 py-1 rounded-lg bg-well text-ink border border-line text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer group-hover:bg-cta group-hover:text-cta-ink group-hover:border-cta hover:bg-cta hover:text-cta-ink hover:border-cta"
                      >
                        <span>Open in Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadUserAsset(asset);
                            showToast(`Downloading "${asset.name}"`);
                          }}
                          className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-well transition"
                          title="Download high-resolution image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, asset.id, asset.name)}
                          className="p-1.5 rounded-lg text-ink-3 hover:text-rose-600 hover:bg-well transition"
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink-3 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Persisted local &amp; cloud testing storage</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-well hover:bg-cta border border-line hover:border-cta text-xs font-semibold text-ink hover:text-cta-ink transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
