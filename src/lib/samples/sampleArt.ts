'use client';

/**
 * Marketing / dashboard art derived from the same fictional-brand sample
 * renderers the engine uses (100% IP-safe). Generated once per sample on the
 * client at half resolution and memoised for the session.
 */
import { useEffect, useState } from 'react';
import type { SampleId } from '@/lib/providers/types';
import { renderSample } from '@/lib/samples/renderers';
import {
  alphaBoundingBox,
  applyAlpha,
  createCanvas,
  ctx2d,
  cropCanvas,
  maskToAlpha,
  type Box,
} from '@/lib/imaging/canvas';

export interface FractionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SampleArt {
  id: SampleId;
  /** Full raw "phone shot" (JPEG, 600×800). */
  original: string;
  /** Raw shot cropped tight to the product (JPEG). */
  originalCrop: string;
  /** Transparent product cutout cropped to the silhouette (PNG). */
  cutout: string;
  /** Label region as fractions of the crop. */
  label: FractionBox;
  /** Crop aspect ratio (w / h). */
  aspect: number;
}

const W = 600;
const H = 800;
const cache = new Map<SampleId, SampleArt>();
const pending = new Map<SampleId, Promise<SampleArt>>();

function pad(box: Box, p: number, maxW: number, maxH: number): Box {
  const x = Math.max(0, box.x - p);
  const y = Math.max(0, box.y - p);
  return {
    x,
    y,
    width: Math.min(maxW - x, box.width + p * 2),
    height: Math.min(maxH - y, box.height + p * 2),
  };
}

function build(id: SampleId): SampleArt {
  const r = renderSample(id);
  const original = createCanvas(W, H);
  const octx = ctx2d(original);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(r.original, 0, 0, W, H);

  const silA = maskToAlpha(r.silhouette, W, H);
  const lockA = maskToAlpha(r.brandSafe, W, H);
  const crop = pad(alphaBoundingBox(silA), 14, W, H);
  const lbl = alphaBoundingBox(lockA);

  const cutout = cropCanvas(applyAlpha(original, silA), crop);
  const originalCrop = cropCanvas(original, crop);

  return {
    id,
    original: original.toDataURL('image/jpeg', 0.9),
    originalCrop: originalCrop.toDataURL('image/jpeg', 0.92),
    cutout: cutout.toDataURL('image/png'),
    label: {
      x: (lbl.x - crop.x) / crop.width,
      y: (lbl.y - crop.y) / crop.height,
      w: lbl.width / crop.width,
      h: lbl.height / crop.height,
    },
    aspect: crop.width / crop.height,
  };
}

export function loadSampleArt(id: SampleId): Promise<SampleArt> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const p = new Promise<SampleArt>((resolve, reject) => {
    // Yield to the browser first so first paint isn't blocked by canvas work
    setTimeout(() => {
      try {
        const art = build(id);
        cache.set(id, art);
        resolve(art);
      } catch (err) {
        reject(err);
      } finally {
        pending.delete(id);
      }
    }, 0);
  });
  pending.set(id, p);
  return p;
}

export function useSampleArt(id: SampleId): SampleArt | null {
  const [art, setArt] = useState<SampleArt | null>(() => cache.get(id) ?? null);
  useEffect(() => {
    let alive = true;
    void loadSampleArt(id).then((a) => {
      if (alive) setArt(a);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return art && art.id === id ? art : (cache.get(id) ?? null);
}

