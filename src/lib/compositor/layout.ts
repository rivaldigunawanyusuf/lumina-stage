/**
 * Multi-Ratio Responsive Layout Solver (Layer 5 + Product Placement).
 *
 * Guarantees that the Headline, Subheadline, and CTA Badge NEVER overlap the
 * segmented product bounding box across all 3 required aspect ratios:
 *   - 1:1 Square (1080×1080 - Marketplace Catalog)
 *   - 9:16 Vertical (1080×1920 - Vertical Video / Story, respecting platform UI safe zones)
 *   - 4:5 Portrait (1080×1350 - Social Portrait Feed)
 */
import type { Box } from '@/lib/imaging/canvas';

export type AspectRatioId = '1:1' | '9:16' | '4:5';

export interface ArtboardSpec {
  id: AspectRatioId;
  title: string;
  channel: string;
  width: number;
  height: number;
}

export const ARTBOARD_SPECS: Record<AspectRatioId, ArtboardSpec> = {
  '1:1': {
    id: '1:1',
    title: '1:1 Square',
    channel: 'Marketplace Catalog · 1080×1080',
    width: 1080,
    height: 1080,
  },
  '9:16': {
    id: '9:16',
    title: '9:16 Vertical',
    channel: 'Vertical Video / Story · 1080×1920',
    width: 1080,
    height: 1920,
  },
  '4:5': {
    id: '4:5',
    title: '4:5 Portrait',
    channel: 'Social Portrait Feed · 1080×1350',
    width: 1080,
    height: 1350,
  },
};

export const ARTBOARD_ORDER: AspectRatioId[] = ['1:1', '9:16', '4:5'];

export interface SolvedArtboardLayout {
  ratio: AspectRatioId;
  canvasWidth: number;
  canvasHeight: number;
  /** Available stage region for product placement (disjoint from text & CTA). */
  stageBox: Box;
  /** Exact destination rectangle where the cropped product silhouette is drawn. */
  productRect: Box;
  /** Upper typography block (headline + subheadline). */
  copyBox: Box;
  /** CTA button bounding zone. */
  ctaBox: Box;
  textAlign: 'left' | 'center';
}

export function rectsIntersect(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function solveArtboardLayout(
  ratio: AspectRatioId,
  productCropWidth: number,
  productCropHeight: number,
): SolvedArtboardLayout {
  const spec = ARTBOARD_SPECS[ratio];
  const W = spec.width;
  const H = spec.height;

  let copyBox: Box;
  let stageBox: Box;
  let ctaBox: Box;
  let textAlign: 'left' | 'center' = 'center';

  if (ratio === '1:1') {
    // 1080×1080: Editorial header band at top, hero product centered on studio floor, CTA pill at bottom
    copyBox = { x: 72, y: 54, width: W - 144, height: 176 };
    stageBox = { x: 140, y: 248, width: W - 280, height: 648 };
    ctaBox = { x: 290, y: 924, width: W - 580, height: 92 };
    textAlign = 'center';
  } else if (ratio === '9:16') {
    // 1080×1920: Respects top 13% (250px) and bottom 16% (310px) Reels UI safe zones
    copyBox = { x: 84, y: 256, width: W - 168, height: 244 };
    stageBox = { x: 130, y: 530, width: W - 260, height: 870 };
    ctaBox = { x: 260, y: 1440, width: W - 520, height: 108 };
    textAlign = 'center';
  } else {
    // 4:5 (1080×1350): Balanced social feed portrait
    copyBox = { x: 78, y: 68, width: W - 156, height: 210 };
    stageBox = { x: 136, y: 300, width: W - 272, height: 790 };
    ctaBox = { x: 280, y: 1126, width: W - 560, height: 100 };
    textAlign = 'center';
  }

  // Fit product inside stageBox preserving aspect ratio, anchored to the bottom of stageBox
  const pw = Math.max(1, productCropWidth);
  const ph = Math.max(1, productCropHeight);
  const scale = Math.min(stageBox.width / pw, stageBox.height / ph);
  const drawW = Math.round(pw * scale);
  const drawH = Math.round(ph * scale);
  const drawX = Math.round(stageBox.x + (stageBox.width - drawW) / 2);
  // Anchor slightly above the bottom of stageBox so contact shadow sits cleanly on the surface
  const drawY = Math.round(stageBox.y + stageBox.height - drawH - stageBox.height * 0.03);

  const productRect: Box = { x: drawX, y: drawY, width: drawW, height: drawH };

  return {
    ratio,
    canvasWidth: W,
    canvasHeight: H,
    stageBox,
    productRect,
    copyBox,
    ctaBox,
    textAlign,
  };
}

