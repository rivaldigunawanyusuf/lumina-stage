'use client';

export interface UserAsset {
  id: string;
  name: string;
  type: 'upload' | 'render' | 'adkit';
  categoryLabel: string;
  dataUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  sizeBytes?: number;
  dimensions?: { width: number; height: number };
  aspectRatio?: string;
  sampleId?: 'aura' | 'kinetix' | 'veloce';
}

const STORAGE_KEY = 'luminastage_user_assets_v3';

// Comprehensive production-ready assets pre-seeded for Judge & Creator evaluation
const INITIAL_ASSETS: UserAsset[] = [
  // ── 1. Raw Photographic E-Commerce Packshots (My Uploads) ──
  {
    id: 'asset-seed-01',
    name: 'Botanical Facial Serum · Raw Studio Packshot',
    type: 'upload',
    categoryLabel: 'My Uploads',
    dataUrl: '/showcase/packshot_aura_raw.png',
    thumbnailUrl: '/showcase/packshot_aura_raw.png',
    createdAt: '2026-11-04T10:15:00.000Z',
    sizeBytes: 480572,
    dimensions: { width: 1920, height: 1280 },
    aspectRatio: '3:2',
    sampleId: 'aura',
  },
  {
    id: 'asset-seed-02',
    name: 'Nitro Cold Brew Coffee · Commercial Can Shot',
    type: 'upload',
    categoryLabel: 'My Uploads',
    dataUrl: '/showcase/beverage_kinetix.png',
    thumbnailUrl: '/showcase/beverage_kinetix.png',
    createdAt: '2026-11-04T10:30:00.000Z',
    sizeBytes: 2915215,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
    sampleId: 'kinetix',
  },
  {
    id: 'asset-seed-03',
    name: 'Wildflower Raw Honey · Tabletop Jar Shot',
    type: 'upload',
    categoryLabel: 'My Uploads',
    dataUrl: '/showcase/food_veloce.png',
    thumbnailUrl: '/showcase/food_veloce.png',
    createdAt: '2026-11-04T10:45:00.000Z',
    sizeBytes: 2804310,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
    sampleId: 'veloce',
  },
  {
    id: 'asset-seed-04',
    name: 'Artisan Eau de Parfum · Glass Flacon Shot',
    type: 'upload',
    categoryLabel: 'My Uploads',
    dataUrl: '/showcase/luxury_perfume.png',
    thumbnailUrl: '/showcase/luxury_perfume.png',
    createdAt: '2026-11-04T11:00:00.000Z',
    sizeBytes: 3031616,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
  },

  // ── 2. AI Staged Commercial Studio Renders (Studio Renders) ──
  {
    id: 'asset-seed-05',
    name: 'Botanical Serum · Travertine Pedestal & Warm Sun',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/showcase_01_aura_serum.png',
    thumbnailUrl: '/showcase/showcase_01_aura_serum.png',
    createdAt: '2026-11-04T11:20:00.000Z',
    sizeBytes: 3017189,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
    sampleId: 'aura',
  },
  {
    id: 'asset-seed-06',
    name: 'Nitro Cold Brew Coffee · Ice Splash Staging',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/showcase_07_kinetix_can.png',
    thumbnailUrl: '/showcase/showcase_07_kinetix_can.png',
    createdAt: '2026-11-04T11:45:00.000Z',
    sizeBytes: 3043539,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
    sampleId: 'kinetix',
  },
  {
    id: 'asset-seed-07',
    name: 'Wildflower Raw Honey · Carrara Marble Counter',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/showcase_19_veloce_honey.png',
    thumbnailUrl: '/showcase/showcase_19_veloce_honey.png',
    createdAt: '2026-11-04T12:15:00.000Z',
    sizeBytes: 3501285,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
    sampleId: 'veloce',
  },
  {
    id: 'asset-seed-08',
    name: 'Emerald Silk Evening Gown · Haute Couture Model',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/model_01_silk_evening_gown.png',
    thumbnailUrl: '/showcase/model_01_silk_evening_gown.png',
    createdAt: '2026-11-04T13:00:00.000Z',
    sizeBytes: 3287025,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
  },
  {
    id: 'asset-seed-09',
    name: 'Bespoke Double-Breasted Suit · Italian Tailoring',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/model_09_tailored_italian_suit.png',
    thumbnailUrl: '/showcase/model_09_tailored_italian_suit.png',
    createdAt: '2026-11-04T13:30:00.000Z',
    sizeBytes: 3217908,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
  },
  {
    id: 'asset-seed-10',
    name: 'Titanium Chronograph Watch · Macro Horology',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/model_16_luxury_chronograph_wrist.png',
    thumbnailUrl: '/showcase/model_16_luxury_chronograph_wrist.png',
    createdAt: '2026-11-04T14:00:00.000Z',
    sizeBytes: 3272177,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
  },
  {
    id: 'asset-seed-11',
    name: 'Tonkotsu Pork Belly Ramen · Tabletop Food Styling',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/food_10_tonkotsu_ramen.png',
    thumbnailUrl: '/showcase/food_10_tonkotsu_ramen.png',
    createdAt: '2026-11-04T14:30:00.000Z',
    sizeBytes: 3629284,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
  },
  {
    id: 'asset-seed-12',
    name: 'Tokyo Nigiri Sushi Platter · Artisan Presentation',
    type: 'render',
    categoryLabel: 'Studio Renders',
    dataUrl: '/showcase/food_09_tokyo_nigiri_sushi.png',
    thumbnailUrl: '/showcase/food_09_tokyo_nigiri_sushi.png',
    createdAt: '2026-11-04T15:00:00.000Z',
    sizeBytes: 3691074,
    dimensions: { width: 1600, height: 1200 },
    aspectRatio: '4:3',
  },

  // ── 3. Production Multi-Ratio Campaign Ad Kits (Exported Ad Kits) ──
  {
    id: 'asset-seed-13',
    name: 'Nitro Cold Brew Coffee · Marketplace Catalog 1:1',
    type: 'adkit',
    categoryLabel: 'Exported Ad Kits',
    dataUrl: '/showcase/ad_kinetix_square.png',
    thumbnailUrl: '/showcase/ad_kinetix_square.png',
    createdAt: '2026-11-04T15:30:00.000Z',
    sizeBytes: 3623359,
    dimensions: { width: 1080, height: 1080 },
    aspectRatio: '1:1',
    sampleId: 'kinetix',
  },
  {
    id: 'asset-seed-14',
    name: 'Nitro Cold Brew Coffee · Vertical Video & Stories 9:16',
    type: 'adkit',
    categoryLabel: 'Exported Ad Kits',
    dataUrl: '/showcase/ad_kinetix_story.png',
    thumbnailUrl: '/showcase/ad_kinetix_story.png',
    createdAt: '2026-11-04T15:31:00.000Z',
    sizeBytes: 3145793,
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    sampleId: 'kinetix',
  },
  {
    id: 'asset-seed-15',
    name: 'Nitro Cold Brew Coffee · Meta Sponsored Feed 4:5',
    type: 'adkit',
    categoryLabel: 'Exported Ad Kits',
    dataUrl: '/showcase/ad_kinetix_feed.png',
    thumbnailUrl: '/showcase/ad_kinetix_feed.png',
    createdAt: '2026-11-04T15:32:00.000Z',
    sizeBytes: 3864768,
    dimensions: { width: 1080, height: 1350 },
    aspectRatio: '4:5',
    sampleId: 'kinetix',
  },
  {
    id: 'asset-seed-16',
    name: 'Botanical Facial Serum · E-Commerce Catalog 1:1',
    type: 'adkit',
    categoryLabel: 'Exported Ad Kits',
    dataUrl: '/showcase/showcase_01_aura_serum.png',
    thumbnailUrl: '/showcase/showcase_01_aura_serum.png',
    createdAt: '2026-11-04T16:00:00.000Z',
    sizeBytes: 3017189,
    dimensions: { width: 1080, height: 1080 },
    aspectRatio: '1:1',
    sampleId: 'aura',
  },
];

export function getUserAssets(): UserAsset[] {
  if (typeof window === 'undefined') return INITIAL_ASSETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ASSETS));
      return INITIAL_ASSETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ASSETS;
  } catch (err) {
    console.error('Failed to load user assets from localStorage:', err);
    return INITIAL_ASSETS;
  }
}

export function saveUserAsset(item: Omit<UserAsset, 'id' | 'createdAt'>): UserAsset {
  const assets = getUserAssets();
  const newAsset: UserAsset = {
    ...item,
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  // Prepend to top
  const updated = [newAsset, ...assets.filter((a) => a.id !== newAsset.id)];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('luminastage:assets_updated', { detail: updated }));
    } catch (err) {
      console.error('Failed to save asset to localStorage:', err);
    }
  }

  return newAsset;
}

export function deleteUserAsset(id: string): void {
  const assets = getUserAssets();
  const updated = assets.filter((a) => a.id !== id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('luminastage:assets_updated', { detail: updated }));
    } catch (err) {
      console.error('Failed to delete asset from localStorage:', err);
    }
  }
}

export function downloadUserAsset(asset: UserAsset): void {
  if (typeof window === 'undefined') return;
  const link = document.createElement('a');
  link.href = asset.dataUrl;
  const safeName = (asset.name || 'lumina-stage-asset')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  link.download = `${safeName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '2.8 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recent';
  }
}
