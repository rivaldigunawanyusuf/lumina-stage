/**
 * Programmatic fictional-brand product "phone photos" for MOCK_OFFLINE mode.
 *
 * Each product is defined by vector paths, so the silhouette mask and the
 * brand-safe (label) mask are mathematically exact - perfect ground truth for
 * demonstrating the Pixel-Lock invariant. All brands are FICTIONAL
 * (AURA / KINETIX / VELOCE) - never replace with real trademarks.
 */
import type { SampleId } from '@/lib/providers/types';
import { createCanvas, ctx2d, seededRandom, type Box } from '@/lib/imaging/canvas';

export const SAMPLE_W = 1200;
export const SAMPLE_H = 1600;

export interface RenderedSample {
  original: HTMLCanvasElement;
  silhouette: HTMLCanvasElement;
  brandSafe: HTMLCanvasElement;
  boundingBox: Box;
}

interface ProductDef {
  silhouette: Path2D;
  label: Path2D;
  bbox: Box;
  /** -1 = light from left, +1 = light from right (baked into the "photo"). */
  lightSide: -1 | 1;
  backdrop: { wallTop: string; wallBottom: string; table: string; tableFar: string };
  draw(ctx: CanvasRenderingContext2D): void;
}

type Ctx = CanvasRenderingContext2D;

function setSpacing(ctx: Ctx, px: number) {
  // letterSpacing is supported in modern Chromium/Safari; harmless elsewhere.
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function roundRectPath(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

/** Horizontal cylinder shading gradient for a body spanning [x0, x1]. */
function cylGradient(ctx: Ctx, x0: number, x1: number, stops: Array<[number, string]>, flip: boolean) {
  const g = ctx.createLinearGradient(flip ? x1 : x0, 0, flip ? x0 : x1, 0);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function cylOverlay(ctx: Ctx, area: Path2D, x0: number, x1: number, lightSide: -1 | 1, strength = 1) {
  ctx.save();
  ctx.clip(area);
  const flip = lightSide === 1;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = cylGradient(
    ctx,
    x0,
    x1,
    [
      [0, `rgba(0,0,0,${0.42 * strength})`],
      [0.18, `rgba(0,0,0,${0.06 * strength})`],
      [0.5, 'rgba(0,0,0,0)'],
      [0.8, `rgba(0,0,0,${0.16 * strength})`],
      [1, `rgba(0,0,0,${0.5 * strength})`],
    ],
    flip,
  );
  ctx.fillRect(x0, 0, x1 - x0, SAMPLE_H);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = cylGradient(
    ctx,
    x0,
    x1,
    [
      [0, 'rgba(255,255,255,0)'],
      [0.22, `rgba(255,255,255,${0.22 * strength})`],
      [0.3, `rgba(255,255,255,${0.05 * strength})`],
      [1, 'rgba(255,255,255,0)'],
    ],
    flip,
  );
  ctx.fillRect(x0, 0, x1 - x0, SAMPLE_H);
  ctx.restore();
}

function specularStreak(ctx: Ctx, x: number, y: number, w: number, h: number, alpha: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.15, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.85, `rgba(255,255,255,${alpha * 0.8})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, w / 2);
  ctx.fill();
}

// ───────────────────────────── AURA Botanical Serum ─────────────────────────────
function auraDef(): ProductDef {
  const s = new Path2D();
  s.moveTo(548, 465);
  s.lineTo(548, 330);
  s.bezierCurveTo(548, 236, 652, 236, 652, 330);
  s.lineTo(652, 465);
  s.lineTo(690, 465);
  s.quadraticCurveTo(698, 465, 698, 473);
  s.lineTo(698, 572);
  s.lineTo(655, 572);
  s.lineTo(655, 615);
  s.bezierCurveTo(655, 652, 815, 650, 815, 735);
  s.lineTo(815, 1325);
  s.quadraticCurveTo(815, 1365, 775, 1365);
  s.lineTo(425, 1365);
  s.quadraticCurveTo(385, 1365, 385, 1325);
  s.lineTo(385, 735);
  s.bezierCurveTo(385, 650, 545, 652, 545, 615);
  s.lineTo(545, 572);
  s.lineTo(502, 572);
  s.lineTo(502, 473);
  s.quadraticCurveTo(502, 465, 510, 465);
  s.closePath();

  const labelRect = { x: 405, y: 830, w: 390, h: 400 };
  const label = roundRectPath(labelRect.x, labelRect.y, labelRect.w, labelRect.h, 6);
  const lightSide = -1 as -1 | 1;

  return {
    silhouette: s,
    label,
    bbox: { x: 385, y: 259, width: 431, height: 1107 },
    lightSide,
    backdrop: { wallTop: '#ECE6DD', wallBottom: '#DCD3C6', table: '#CDBFAE', tableFar: '#D9CDBD' },
    draw(ctx) {
      const flip = lightSide === 1;
      // Amber glass body
      ctx.save();
      ctx.clip(s);
      ctx.fillStyle = cylGradient(
        ctx,
        385,
        815,
        [
          [0, '#2B1204'],
          [0.1, '#6A330B'],
          [0.26, '#C06E22'],
          [0.36, '#93501A'],
          [0.62, '#7A3E0E'],
          [0.88, '#47210A'],
          [1, '#220E03'],
        ],
        flip,
      );
      ctx.fillRect(380, 560, 440, 820);
      // base thickness
      const base = ctx.createLinearGradient(0, 1300, 0, 1365);
      base.addColorStop(0, 'rgba(0,0,0,0)');
      base.addColorStop(1, 'rgba(20,6,0,0.55)');
      ctx.fillStyle = base;
      ctx.fillRect(380, 1300, 440, 70);
      ctx.restore();

      // Rubber bulb
      ctx.save();
      const bulb = new Path2D();
      bulb.moveTo(548, 470);
      bulb.lineTo(548, 330);
      bulb.bezierCurveTo(548, 236, 652, 236, 652, 330);
      bulb.lineTo(652, 470);
      bulb.closePath();
      ctx.fillStyle = cylGradient(
        ctx,
        548,
        652,
        [
          [0, '#050505'],
          [0.28, '#4A4A4A'],
          [0.45, '#1A1A1A'],
          [1, '#050505'],
        ],
        flip,
      );
      ctx.fill(bulb);
      ctx.restore();

      // Ribbed collar
      ctx.save();
      const collar = roundRectPath(502, 465, 196, 107, 8);
      ctx.fillStyle = cylGradient(
        ctx,
        502,
        698,
        [
          [0, '#0C0C0C'],
          [0.25, '#5A5A5A'],
          [0.4, '#262626'],
          [1, '#080808'],
        ],
        flip,
      );
      ctx.fill(collar);
      ctx.clip(collar);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 3;
      for (let x = 510; x < 698; x += 11) {
        ctx.beginPath();
        ctx.moveTo(x, 465);
        ctx.lineTo(x, 572);
        ctx.stroke();
      }
      ctx.restore();

      // Glass speculars (outside label)
      specularStreak(ctx, flip ? 755 : 420, 700, 20, 120, 0.55);
      specularStreak(ctx, flip ? 755 : 420, 1245, 20, 90, 0.4);
      specularStreak(ctx, flip ? 420 : 778, 760, 9, 520, 0.18);

      // Label
      ctx.save();
      ctx.clip(label);
      ctx.fillStyle = '#F4EEE2';
      ctx.fillRect(labelRect.x, labelRect.y, labelRect.w, labelRect.h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      // leaf emblem
      ctx.fillStyle = '#4F7A55';
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(600, 905);
        ctx.bezierCurveTo(600 + dir * 10, 870, 600 + dir * 42, 862, 600 + dir * 52, 868);
        ctx.bezierCurveTo(600 + dir * 46, 892, 600 + dir * 22, 906, 600, 905);
        ctx.fill();
      }
      ctx.fillRect(598, 895, 4, 24);
      ctx.fillStyle = '#26352A';
      ctx.font = '700 132px "Didot", "Bodoni 72", "Bodoni MT", Georgia, serif';
      setSpacing(ctx, 14);
      ctx.fillText('AURA', 607, 1035);
      ctx.fillStyle = '#B07A3B';
      ctx.fillRect(520, 1058, 160, 3);
      ctx.fillStyle = '#26352A';
      ctx.font = '600 33px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
      setSpacing(ctx, 7);
      ctx.fillText('BOTANICAL SERUM', 604, 1108);
      setSpacing(ctx, 0);
      ctx.font = 'italic 26px Georgia, "Times New Roman", serif';
      ctx.fillStyle = '#4C5A4E';
      ctx.fillText('Bakuchiol + Rosehip Oil', 600, 1152);
      ctx.font = '500 21px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
      setSpacing(ctx, 2);
      ctx.fillText('30 ml  ·  1.0 fl oz', 601, 1198);
      setSpacing(ctx, 0);
      ctx.restore();
      cylOverlay(ctx, label, 385, 815, lightSide, 0.85);
    },
  };
}

// ───────────────────────────── KINETIX Cold Brew ─────────────────────────────
function kinetixDef(): ProductDef {
  const s = new Path2D();
  s.moveTo(442, 398);
  s.lineTo(758, 398);
  s.quadraticCurveTo(772, 398, 776, 412);
  s.lineTo(790, 470);
  s.lineTo(790, 1290);
  s.lineTo(772, 1338);
  s.quadraticCurveTo(766, 1352, 750, 1352);
  s.lineTo(450, 1352);
  s.quadraticCurveTo(434, 1352, 428, 1338);
  s.lineTo(410, 1290);
  s.lineTo(410, 470);
  s.lineTo(424, 412);
  s.quadraticCurveTo(428, 398, 442, 398);
  s.closePath();

  const label = roundRectPath(424, 566, 352, 568, 4);
  const lightSide = 1 as -1 | 1;

  return {
    silhouette: s,
    label,
    bbox: { x: 410, y: 398, width: 381, height: 955 },
    lightSide,
    backdrop: { wallTop: '#E4E6E9', wallBottom: '#D2D5DA', table: '#BDB6AD', tableFar: '#CAC3BA' },
    draw(ctx) {
      const flip = lightSide === 1;
      ctx.save();
      ctx.clip(s);
      // body
      ctx.fillStyle = cylGradient(
        ctx,
        410,
        790,
        [
          [0, '#04060C'],
          [0.1, '#18223D'],
          [0.24, '#46598A'],
          [0.31, '#1E2A4A'],
          [0.66, '#141C33'],
          [0.9, '#0A0F1E'],
          [1, '#03050A'],
        ],
        flip,
      );
      ctx.fillRect(400, 390, 400, 970);
      // aluminium top + bottom
      const alu = cylGradient(
        ctx,
        410,
        790,
        [
          [0, '#5D6168'],
          [0.22, '#F2F4F7'],
          [0.34, '#A5AAB2'],
          [0.7, '#868B93'],
          [1, '#3F4248'],
        ],
        flip,
      );
      ctx.fillStyle = alu;
      ctx.fillRect(400, 390, 400, 86);
      ctx.fillRect(400, 1286, 400, 70);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      for (const y of [420, 452, 476, 1290, 1318]) {
        ctx.beginPath();
        ctx.moveTo(400, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }
      // orange accent band
      ctx.fillStyle = '#FF6A2B';
      ctx.fillRect(400, 1176, 400, 34);
      ctx.fillStyle = '#FFB088';
      ctx.fillRect(400, 1216, 400, 6);
      ctx.restore();

      // Label content
      ctx.save();
      ctx.clip(label);
      ctx.textAlign = 'center';
      // bolt logo
      ctx.fillStyle = '#FF6A2B';
      ctx.beginPath();
      ctx.moveTo(612, 600);
      ctx.lineTo(560, 690);
      ctx.lineTo(596, 690);
      ctx.lineTo(582, 760);
      ctx.lineTo(642, 664);
      ctx.lineTo(604, 664);
      ctx.lineTo(626, 600);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'italic 800 100px "Futura", "Avenir Next Condensed", "Arial Black", Impact, sans-serif';
      setSpacing(ctx, 3);
      ctx.fillText('KINETIX', 602, 880);
      ctx.fillStyle = '#FF6A2B';
      ctx.font = '700 50px "Futura", "Avenir Next", "Arial Black", sans-serif';
      setSpacing(ctx, 10);
      ctx.fillText('COLD BREW', 605, 948);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(470, 978, 260, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = '600 22px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
      setSpacing(ctx, 3);
      ctx.fillText('NITRO · OAT MILK · ARABICA', 601, 1020);
      ctx.font = '500 20px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('120 mg natural caffeine', 601, 1054);
      ctx.font = '700 30px "Futura", "Avenir Next", Arial, sans-serif';
      setSpacing(ctx, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('330 ml', 602, 1112);
      setSpacing(ctx, 0);
      ctx.restore();
      cylOverlay(ctx, s, 410, 790, lightSide, 0.6);
      specularStreak(ctx, flip ? 690 : 495, 488, 14, 780, 0.28);
    },
  };
}

// ───────────────────────────── VELOCE Artisan Honey ─────────────────────────────
function veloceDef(): ProductDef {
  const s = new Path2D();
  s.moveTo(378, 560);
  s.lineTo(822, 560);
  s.quadraticCurveTo(840, 560, 840, 578);
  s.lineTo(840, 700);
  s.quadraticCurveTo(840, 715, 822, 715);
  s.lineTo(822, 725);
  s.bezierCurveTo(822, 755, 865, 760, 865, 800);
  s.lineTo(865, 1290);
  s.quadraticCurveTo(865, 1350, 805, 1350);
  s.lineTo(395, 1350);
  s.quadraticCurveTo(335, 1350, 335, 1290);
  s.lineTo(335, 800);
  s.bezierCurveTo(335, 760, 378, 755, 378, 725);
  s.lineTo(378, 715);
  s.quadraticCurveTo(360, 715, 360, 700);
  s.lineTo(360, 578);
  s.quadraticCurveTo(360, 560, 378, 560);
  s.closePath();

  const labelRect = { x: 372, y: 872, w: 456, h: 336 };
  const label = roundRectPath(labelRect.x, labelRect.y, labelRect.w, labelRect.h, 10);
  const lightSide = -1 as -1 | 1;

  return {
    silhouette: s,
    label,
    bbox: { x: 335, y: 560, width: 531, height: 791 },
    lightSide,
    backdrop: { wallTop: '#F1EEE9', wallBottom: '#E2DDD5', table: '#BFA88C', tableFar: '#CDB89D' },
    draw(ctx) {
      const flip = lightSide === 1;
      ctx.save();
      ctx.clip(s);
      // honey glass
      ctx.fillStyle = cylGradient(
        ctx,
        335,
        865,
        [
          [0, '#5A2A03'],
          [0.12, '#B4650C'],
          [0.28, '#F3B547'],
          [0.4, '#DE9420'],
          [0.7, '#C37514'],
          [0.92, '#7A3E06'],
          [1, '#4A2202'],
        ],
        flip,
      );
      ctx.fillRect(330, 700, 540, 660);
      // headspace (air gap) under lid
      const air = ctx.createLinearGradient(0, 715, 0, 800);
      air.addColorStop(0, 'rgba(255,236,200,0.75)');
      air.addColorStop(1, 'rgba(255,236,200,0)');
      ctx.fillStyle = air;
      ctx.fillRect(330, 715, 540, 90);
      // gold lid
      const lidPath = roundRectPath(360, 560, 480, 155, 18);
      ctx.fillStyle = cylGradient(
        ctx,
        360,
        840,
        [
          [0, '#5C4410'],
          [0.2, '#E9CF7A'],
          [0.3, '#FFF1BF'],
          [0.42, '#C9A443'],
          [0.8, '#8C6B1E'],
          [1, '#4A360A'],
        ],
        flip,
      );
      ctx.fill(lidPath);
      ctx.clip(lidPath);
      ctx.strokeStyle = 'rgba(60,40,5,0.35)';
      ctx.lineWidth = 3;
      for (let x = 368; x < 840; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 575);
        ctx.lineTo(x, 700);
        ctx.stroke();
      }
      ctx.restore();

      specularStreak(ctx, flip ? 805 : 368, 820, 18, 380, 0.42);
      specularStreak(ctx, flip ? 372 : 836, 840, 8, 360, 0.18);

      // Kraft label
      ctx.save();
      ctx.clip(label);
      ctx.fillStyle = '#CDA97C';
      ctx.fillRect(labelRect.x, labelRect.y, labelRect.w, labelRect.h);
      const rnd = seededRandom(42);
      ctx.fillStyle = 'rgba(90,60,30,0.10)';
      for (let i = 0; i < 900; i++) {
        ctx.fillRect(labelRect.x + rnd() * labelRect.w, labelRect.y + rnd() * labelRect.h, 1 + rnd() * 6, 1);
      }
      ctx.strokeStyle = '#4A2E17';
      ctx.lineWidth = 2;
      ctx.strokeRect(labelRect.x + 14, labelRect.y + 14, labelRect.w - 28, labelRect.h - 28);
      // hexagon emblem
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = 600 + Math.cos(a) * 26;
        const py = 935 + Math.sin(a) * 26;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#4A2E17';
      ctx.beginPath();
      ctx.arc(600, 935, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#3A2212';
      ctx.font = '600 92px "Baskerville", "Didot", "Big Caslon", Georgia, serif';
      setSpacing(ctx, 12);
      ctx.fillText('VELOCE', 606, 1048);
      ctx.font = '700 29px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
      setSpacing(ctx, 9);
      ctx.fillText('ARTISAN HONEY', 604, 1096);
      setSpacing(ctx, 0);
      ctx.font = 'italic 24px Georgia, "Times New Roman", serif';
      ctx.fillText('Raw Wildflower · Small Batch', 600, 1140);
      ctx.font = '600 19px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
      setSpacing(ctx, 3);
      ctx.fillText('NET WT 500 g', 601, 1178);
      setSpacing(ctx, 0);
      ctx.restore();
      cylOverlay(ctx, label, 335, 865, lightSide, 0.7);
    },
  };
}

const DEFS: Record<SampleId, () => ProductDef> = {
  aura: auraDef,
  kinetix: kinetixDef,
  veloce: veloceDef,
};

function drawPhotoBackdrop(ctx: Ctx, def: ProductDef) {
  const W = SAMPLE_W;
  const H = SAMPLE_H;
  const horizon = 1180;
  const wall = ctx.createLinearGradient(0, 0, 0, horizon);
  wall.addColorStop(0, def.backdrop.wallTop);
  wall.addColorStop(1, def.backdrop.wallBottom);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, horizon);
  const table = ctx.createLinearGradient(0, horizon, 0, H);
  table.addColorStop(0, def.backdrop.tableFar);
  table.addColorStop(1, def.backdrop.table);
  ctx.fillStyle = table;
  ctx.fillRect(0, horizon, W, H - horizon);
  // window light falloff
  const lx = def.lightSide === -1 ? 0 : W;
  const glow = ctx.createRadialGradient(lx, 300, 50, lx, 300, 1300);
  glow.addColorStop(0, 'rgba(255,250,240,0.45)');
  glow.addColorStop(1, 'rgba(255,250,240,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const dark = ctx.createLinearGradient(def.lightSide === -1 ? 0 : W, 0, def.lightSide === -1 ? W : 0, 0);
  dark.addColorStop(0, 'rgba(0,0,0,0)');
  dark.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, H);

  // photographed shadow (cast away from the window)
  const b = def.bbox;
  const baseY = b.y + b.height;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#2A2118';
  ctx.beginPath();
  const dir = -def.lightSide;
  ctx.moveTo(b.x + 10, baseY);
  ctx.lineTo(b.x + b.width - 10, baseY);
  ctx.lineTo(b.x + b.width + dir * 260 + 40, baseY - 70);
  ctx.lineTo(b.x + dir * 260 + 40, baseY - 70);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const contact = ctx.createRadialGradient(
    b.x + b.width / 2,
    baseY,
    4,
    b.x + b.width / 2,
    baseY,
    b.width * 0.62,
  );
  contact.addColorStop(0, 'rgba(25,18,10,0.55)');
  contact.addColorStop(1, 'rgba(25,18,10,0)');
  ctx.save();
  ctx.translate(0, baseY);
  ctx.scale(1, 0.12);
  ctx.fillStyle = contact;
  ctx.fillRect(b.x - b.width, -b.width, b.width * 3, b.width * 2);
  ctx.restore();

  // sensor grain
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const rnd = seededRandom(7);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 9;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export function renderSample(id: SampleId): RenderedSample {
  const def = DEFS[id]();
  const original = createCanvas(SAMPLE_W, SAMPLE_H);
  const octx = ctx2d(original, { willReadFrequently: true });
  drawPhotoBackdrop(octx, def);
  def.draw(octx);

  const silhouette = createCanvas(SAMPLE_W, SAMPLE_H);
  const sctx = ctx2d(silhouette);
  sctx.fillStyle = '#000';
  sctx.fillRect(0, 0, SAMPLE_W, SAMPLE_H);
  sctx.fillStyle = '#fff';
  sctx.fill(def.silhouette);

  const brandSafe = createCanvas(SAMPLE_W, SAMPLE_H);
  const bctx = ctx2d(brandSafe);
  bctx.fillStyle = '#000';
  bctx.fillRect(0, 0, SAMPLE_W, SAMPLE_H);
  bctx.save();
  bctx.clip(def.silhouette);
  bctx.fillStyle = '#fff';
  bctx.fill(def.label);
  bctx.restore();

  return { original, silhouette, brandSafe, boundingBox: def.bbox };
}

