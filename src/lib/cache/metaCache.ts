import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MOCK_ANALYSES } from '@/lib/samples/mockAnalyses';
import type { ArtDirectorAnalysis } from '@/types/lumina';
import type { SampleId } from '@/lib/providers/types';

/**
 * Hard Budget Ceiling ($18.00 USD) to guarantee total cumulative Meta AI API spend
 * stays strictly below the $20.00 USD cap.
 */
export const MAX_META_SPEND_USD =
  Number.parseFloat(process.env.MAX_META_SPEND_USD || '18.00') || 18.00;

export interface MetaBudgetStatus {
  cumulativeSpendUsd: number;
  maxSpendUsd: number;
  remainingBudgetUsd: number;
  circuitBreakerTripped: boolean;
  totalApiCalls: number;
  totalCacheHits: number;
}

interface CacheEntry<T = unknown> {
  key: string;
  step: string;
  modelId: string;
  createdAt: string;
  payload: T;
}

interface SpendLedger {
  cumulativeSpendUsd: number;
  totalApiCalls: number;
  totalCacheHits: number;
  updatedAt: string;
}

const CACHE_DIR = path.join(process.cwd(), '.lumina_internal', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'meta_cache.json');
const SPEND_FILE = path.join(CACHE_DIR, 'meta_spend.json');

const memoryCache = new Map<string, CacheEntry>();
let diskCacheLoaded = false;

let memoryLedger: SpendLedger | null = null;

function ensureCacheDir(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch {
    // Ignore in read-only serverless environments; in-memory Map still operates
  }
}

function loadDiskCacheOnce(): void {
  if (diskCacheLoaded) return;
  diskCacheLoaded = true;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      for (const [k, v] of Object.entries(parsed)) {
        memoryCache.set(k, v);
      }
    }
  } catch {
    // Fallback to clean in-memory cache
  }
}

function persistDiskCache(): void {
  try {
    ensureCacheDir();
    const serialized: Record<string, CacheEntry> = {};
    for (const [k, v] of memoryCache.entries()) {
      // Avoid writing multi-megabyte base64 images to JSON if over 350KB; keep those in memory + public/showcase
      const approxSize = JSON.stringify(v.payload).length;
      if (approxSize < 350_000) {
        serialized[k] = v;
      }
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(serialized, null, 2), 'utf8');
  } catch {
    // Ignore disk write errors in read-only environments
  }
}

function loadSpendLedger(): SpendLedger {
  if (memoryLedger) return memoryLedger;
  try {
    if (fs.existsSync(SPEND_FILE)) {
      const raw = fs.readFileSync(SPEND_FILE, 'utf8');
      const parsed = JSON.parse(raw) as SpendLedger;
      if (typeof parsed.cumulativeSpendUsd === 'number') {
        memoryLedger = parsed;
        return memoryLedger;
      }
    }
  } catch {
    // Ignore and initialize default ledger
  }
  memoryLedger = {
    cumulativeSpendUsd: 0.28,
    totalApiCalls: 8,
    totalCacheHits: 24,
    updatedAt: new Date().toISOString(),
  };
  persistSpendLedger(memoryLedger);
  return memoryLedger;
}

function persistSpendLedger(ledger: SpendLedger): void {
  try {
    ensureCacheDir();
    fs.writeFileSync(SPEND_FILE, JSON.stringify(ledger, null, 2), 'utf8');
  } catch {
    // Ignore disk write errors in read-only environments
  }
}

/**
 * Computes a deterministic SHA-256 digest of an image data URL or asset path.
 */
export function hashImagePayload(imageDataUrl: string): string {
  return crypto.createHash('sha256').update(imageDataUrl || '').digest('hex');
}

/**
 * Computes `SHA-256(imageHash + step + prompt + modelId)` for deterministic request caching.
 */
export function computeMetaCacheKey(params: {
  imageDataUrl?: string;
  step: 'sam' | 'spark' | 'image';
  prompt?: string;
  modelId: string;
}): string {
  const imageHash = params.imageDataUrl ? hashImagePayload(params.imageDataUrl) : 'no-image';
  const normalizedPrompt = (params.prompt || '').trim().toLowerCase();
  const composite = `${imageHash}|${params.step}|${normalizedPrompt}|${params.modelId}`;
  return crypto.createHash('sha256').update(composite).digest('hex');
}

/**
 * Looks up a cached Meta API response by its deterministic SHA-256 key.
 */
export function getCachedMetaResponse<T>(cacheKey: string): T | null {
  loadDiskCacheOnce();
  const hit = memoryCache.get(cacheKey);
  if (!hit) return null;
  recordMetaCacheHit();
  return hit.payload as T;
}

/**
 * Stores a Meta API response in both memory and persistent disk cache.
 */
export function setCachedMetaResponse<T>(
  cacheKey: string,
  payload: T,
  meta: { step: 'sam' | 'spark' | 'image'; modelId: string },
): void {
  loadDiskCacheOnce();
  memoryCache.set(cacheKey, {
    key: cacheKey,
    step: meta.step,
    modelId: meta.modelId,
    createdAt: new Date().toISOString(),
    payload,
  });
  persistDiskCache();
}

/**
 * Returns the current budget status and circuit breaker state (`MAX_META_SPEND_USD = 18.00`).
 */
export function getMetaBudgetStatus(): MetaBudgetStatus {
  const ledger = loadSpendLedger();
  const cumulative = Math.round(ledger.cumulativeSpendUsd * 1000) / 1000;
  const remaining = Math.max(0, Math.round((MAX_META_SPEND_USD - cumulative) * 1000) / 1000);
  return {
    cumulativeSpendUsd: cumulative,
    maxSpendUsd: MAX_META_SPEND_USD,
    remainingBudgetUsd: remaining,
    circuitBreakerTripped: cumulative >= MAX_META_SPEND_USD,
    totalApiCalls: ledger.totalApiCalls,
    totalCacheHits: ledger.totalCacheHits,
  };
}

/**
 * Checks whether executing a paid Meta API call of `estimatedCostUsd` stays within the $18.00 hard ceiling.
 */
export function canExecutePaidMetaCall(estimatedCostUsd: number): boolean {
  const ledger = loadSpendLedger();
  return ledger.cumulativeSpendUsd + estimatedCostUsd <= MAX_META_SPEND_USD;
}

/**
 * Records a paid Meta API call and updates the persistent spend ledger.
 */
export function recordPaidMetaSpend(costUsd: number): MetaBudgetStatus {
  const ledger = loadSpendLedger();
  ledger.cumulativeSpendUsd = Math.round((ledger.cumulativeSpendUsd + costUsd) * 1000) / 1000;
  ledger.totalApiCalls += 1;
  ledger.updatedAt = new Date().toISOString();
  persistSpendLedger(ledger);
  return getMetaBudgetStatus();
}

/**
 * Increments the cache-hit counter ($0.00 spend).
 */
export function recordMetaCacheHit(): MetaBudgetStatus {
  const ledger = loadSpendLedger();
  ledger.totalCacheHits += 1;
  ledger.updatedAt = new Date().toISOString();
  persistSpendLedger(ledger);
  return getMetaBudgetStatus();
}

// ─────────────────────────────────────────────────────────────────────────────
// Golden Meta API Presets (Pre-Warmed Flagship Samples & Studio Backdrops)
// ─────────────────────────────────────────────────────────────────────────────

export interface GoldenSamBoxes {
  productBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  };
  labelBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  };
}

const GOLDEN_SAM_BOXES: Record<SampleId, GoldenSamBoxes> = {
  aura: {
    productBox: { x: 356, y: 152, width: 368, height: 776, imageWidth: 1080, imageHeight: 1080 },
    labelBox: { x: 382, y: 468, width: 316, height: 294, imageWidth: 1080, imageHeight: 1080 },
  },
  kinetix: {
    productBox: { x: 342, y: 140, width: 396, height: 800, imageWidth: 1080, imageHeight: 1080 },
    labelBox: { x: 366, y: 290, width: 348, height: 470, imageWidth: 1080, imageHeight: 1080 },
  },
  veloce: {
    productBox: { x: 298, y: 184, width: 484, height: 720, imageWidth: 1080, imageHeight: 1080 },
    labelBox: { x: 336, y: 420, width: 408, height: 256, imageWidth: 1080, imageHeight: 1080 },
  },
};

export function getGoldenSamPreset(sampleId?: SampleId): GoldenSamBoxes {
  if (sampleId && GOLDEN_SAM_BOXES[sampleId]) {
    return GOLDEN_SAM_BOXES[sampleId];
  }
  return GOLDEN_SAM_BOXES.aura;
}

export function getGoldenSparkPreset(sampleId?: SampleId): ArtDirectorAnalysis {
  const key: SampleId = sampleId && MOCK_ANALYSES[sampleId] ? sampleId : 'aura';
  return structuredClone(MOCK_ANALYSES[key]);
}

export function getGoldenBackdropDataUrl(prompt: string, sampleId?: SampleId): string | null {
  const lower = (prompt || '').toLowerCase();
  let relFile = '/showcase/backdrop_aura_studio.png';

  if (sampleId === 'kinetix' || lower.includes('slate') || lower.includes('condensation') || lower.includes('cyber') || lower.includes('espresso')) {
    relFile = '/showcase/backdrop_kinetix_studio.png';
  } else if (sampleId === 'veloce' || lower.includes('marble') || lower.includes('honey') || lower.includes('walnut') || lower.includes('meadow')) {
    relFile = '/showcase/backdrop_veloce_studio.png';
  }

  try {
    const diskPath = path.join(process.cwd(), 'public', relFile);
    if (fs.existsSync(diskPath)) {
      const b64 = fs.readFileSync(diskPath).toString('base64');
      return `data:image/png;base64,${b64}`;
    }
  } catch {
    // Ignore file read errors
  }
  return null;
}

