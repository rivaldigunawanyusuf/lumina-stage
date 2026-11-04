/**
 * High-resolution PNG & multi-ratio ZIP Ad Kit exporter.
 *
 * Renders each requested aspect ratio at full native resolution:
 *   - 1:1  → 1080 × 1080
 *   - 9:16 → 1080 × 1920
 *   - 4:5  → 1080 × 1350
 * and bundles them with a `manifest.json` using `fflate` (MIT).
 */
import { zipSync, strToU8 } from 'fflate';
import type { AdCopyConfig, LightingVector, ProviderMode } from '@/types/lumina';
import { createCanvas } from '@/lib/imaging/canvas';
import { ARTBOARD_ORDER, ARTBOARD_SPECS, type AspectRatioId } from './layout';
import { renderArtboard, type PreparedCompositorAssets } from './compositor';

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Canvas PNG encoding failed'));
          return;
        }
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      },
      'image/png',
      1,
    );
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function exportSingleArtboardPng(opts: {
  ratio: AspectRatioId;
  assets: PreparedCompositorAssets;
  lighting: LightingVector;
  adCopy: AdCopyConfig;
}): Promise<void> {
  const spec = ARTBOARD_SPECS[opts.ratio];
  const c = createCanvas(spec.width, spec.height);
  renderArtboard(c, opts.ratio, opts.assets, {
    lighting: opts.lighting,
    adCopy: opts.adCopy,
    pixelLockEnabled: true,
    inspectorEnabled: false,
  });
  const bytes = await canvasToPngBytes(c);
  const ratioSlug = opts.ratio.replace(':', 'x');
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' });
  triggerDownload(blob, `luminastage-${ratioSlug}-${spec.width}x${spec.height}.png`);
}

export async function exportMultiRatioAdKitZip(opts: {
  assets: PreparedCompositorAssets;
  lighting: LightingVector;
  adCopy: AdCopyConfig;
  providerUsed: ProviderMode;
  scenePrompt: string;
}): Promise<void> {
  const files: Record<string, Uint8Array> = {};

  for (const ratio of ARTBOARD_ORDER) {
    const spec = ARTBOARD_SPECS[ratio];
    const c = createCanvas(spec.width, spec.height);
    renderArtboard(c, ratio, opts.assets, {
      lighting: opts.lighting,
      adCopy: opts.adCopy,
      pixelLockEnabled: true,
      inspectorEnabled: false,
    });
    const slug = ratio.replace(':', 'x');
    files[`luminastage-${slug}-${spec.width}x${spec.height}.png`] = await canvasToPngBytes(c);
  }

  const manifest = {
    generator: 'LuminaStage · Commercial Product Staging & Multi-Channel Ad Studio',
    exportedAt: new Date().toISOString(),
    jobId: opts.assets.jobId,
    providerUsed: opts.providerUsed,
    labelPreservationMode: 'Active (original packaging artwork layered over scene)',
    lightingVector: opts.lighting,
    adCopy: opts.adCopy,
    spatialScenePrompt: opts.scenePrompt,
    deliverables: [
      { ratio: '1:1', resolution: '1080x1080', channel: 'Marketplace Catalog' },
      { ratio: '9:16', resolution: '1080x1920', channel: 'Vertical Video / Story' },
      { ratio: '4:5', resolution: '1080x1350', channel: 'Social Portrait Feed' },
    ],
  };

  files['ad-kit-manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
  triggerDownload(blob, `luminastage-ad-kit-${opts.assets.jobId}.zip`);
}

