/**
 * Procedural studio backdrops. Used by MOCK_OFFLINE scene generation and as the
 * deterministic fallback when remote studio image generation fails.
 * Lighting is baked from the LightingVector so the backdrop agrees with the
 * product shadow direction.
 */
import type { LightingVector } from '@/types/lumina';
import { createCanvas, ctx2d, hexToRgb, seededRandom } from '@/lib/imaging/canvas';

export type BackdropStyle = 'linen' | 'marble' | 'slate';

export function styleFromPrompt(prompt: string, presetId?: string): BackdropStyle {
  const p = `${presetId ?? ''} ${prompt}`.toLowerCase();
  if (/slate|dark|night|neon|moody|charcoal|black/.test(p)) return 'slate';
  if (/marble|counter|kitchen|stone|plaster|bright/.test(p)) return 'marble';
  return 'linen';
}

function rgba([r, g, b]: [number, number, number], a: number) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function renderBackdrop(
  style: BackdropStyle,
  light: LightingVector,
  width = 1600,
  height = 1600,
  seed = 1,
): HTMLCanvasElement {
  const c = createCanvas(width, height);
  const ctx = ctx2d(c);
  const W = width;
  const H = height;
  const rnd = seededRandom(seed * 9973 + 17);
  const theta = (light.azimuthDegrees * Math.PI) / 180;
  const lx = 0.5 + Math.cos(theta) * 0.55; // light position in normalised screen space
  const ly = 0.35 - Math.sin(theta) * 0.25;
  const warm = hexToRgb(light.warmthHex);
  const horizon = H * 0.6;

  if (style === 'slate') {
    const wall = ctx.createLinearGradient(0, 0, 0, horizon);
    wall.addColorStop(0, '#15171C');
    wall.addColorStop(1, '#262A31');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, horizon);
    const floor = ctx.createLinearGradient(0, horizon, 0, H);
    floor.addColorStop(0, '#2E323A');
    floor.addColorStop(1, '#121418');
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, W, H - horizon);
    // rim glow on the light side
    const glow = ctx.createRadialGradient(lx * W, ly * H, 10, lx * W, ly * H, W * 0.75);
    glow.addColorStop(0, rgba(warm, 0.55 * light.intensity));
    glow.addColorStop(0.5, rgba(warm, 0.12 * light.intensity));
    glow.addColorStop(1, rgba(warm, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    // counter glow (cool/warm complement)
    const comp = ctx.createRadialGradient((1 - lx) * W, H * 0.3, 10, (1 - lx) * W, H * 0.3, W * 0.5);
    comp.addColorStop(0, 'rgba(255,106,43,0.18)');
    comp.addColorStop(1, 'rgba(255,106,43,0)');
    ctx.fillStyle = comp;
    ctx.fillRect(0, 0, W, horizon);
    // bokeh
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = rnd() * horizon * 0.85;
      const r = 8 + rnd() * 38;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = rnd() > 0.5 ? warm : ([255, 140, 80] as [number, number, number]);
      g.addColorStop(0, rgba(col, 0.22));
      g.addColorStop(0.7, rgba(col, 0.12));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // wet reflections on floor
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 40; i++) {
      const y = horizon + rnd() * (H - horizon);
      ctx.fillStyle = rgba(warm, 0.03 + rnd() * 0.04);
      ctx.fillRect(0, y, W, 1 + rnd() * 3);
    }
    ctx.globalCompositeOperation = 'source-over';
    const edge = ctx.createLinearGradient(0, horizon - 2, 0, horizon + 6);
    edge.addColorStop(0, rgba(warm, 0));
    edge.addColorStop(0.5, rgba(warm, 0.25));
    edge.addColorStop(1, rgba(warm, 0));
    ctx.fillStyle = edge;
    ctx.fillRect(0, horizon - 2, W, 8);
  } else if (style === 'marble') {
    const wall = ctx.createLinearGradient(0, 0, 0, horizon);
    wall.addColorStop(0, '#F3EFE9');
    wall.addColorStop(1, '#E4DED5');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, horizon);
    // plaster texture
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = `rgba(120,105,90,${0.015 + rnd() * 0.03})`;
      ctx.fillRect(rnd() * W, rnd() * horizon, 2 + rnd() * 5, 2 + rnd() * 5);
    }
    // marble counter
    const floor = ctx.createLinearGradient(0, horizon, 0, H);
    floor.addColorStop(0, '#E9E7E3');
    floor.addColorStop(1, '#F7F6F3');
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, W, H - horizon);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, W, H - horizon);
    ctx.clip();
    for (let v = 0; v < 14; v++) {
      ctx.strokeStyle = `rgba(110,110,118,${0.08 + rnd() * 0.18})`;
      ctx.lineWidth = 0.8 + rnd() * 2.6;
      ctx.beginPath();
      let x = rnd() * W;
      let y = horizon + rnd() * (H - horizon) * 0.3;
      ctx.moveTo(x, y);
      for (let s = 0; s < 12; s++) {
        x += (rnd() - 0.3) * 160;
        y += 20 + rnd() * 50;
        ctx.quadraticCurveTo(x + (rnd() - 0.5) * 90, y - 20, x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // counter front edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, horizon, W, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, horizon + 3, W, 6);
  } else {
    // linen sweep
    const sweep = ctx.createLinearGradient(0, 0, 0, H);
    sweep.addColorStop(0, '#E9DCC8');
    sweep.addColorStop(0.55, '#E2CFB4');
    sweep.addColorStop(0.62, '#DCC6A8');
    sweep.addColorStop(1, '#CFB491');
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, W, H);
    // linen weave
    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = `rgba(120,90,60,${0.02 + rnd() * 0.025})`;
      ctx.fillRect(0, y, W, 1);
    }
    for (let x = 0; x < W; x += 3) {
      ctx.fillStyle = `rgba(255,255,255,${0.015 + rnd() * 0.02})`;
      ctx.fillRect(x, 0, 1, H);
    }
    // botanical leaf shadows (gobo) - projected away from the light
    const sx = -Math.cos(theta);
    for (let i = 0; i < 9; i++) {
      const cx = (lx + sx * 0.15 + (rnd() - 0.5) * 0.6) * W;
      const cy = (0.12 + rnd() * 0.38) * H;
      const len = (0.12 + rnd() * 0.14) * W;
      const ang = rnd() * Math.PI;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
      g.addColorStop(0, `rgba(80,55,30,${0.11 * light.intensity})`);
      g.addColorStop(1, 'rgba(80,55,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // global key light falloff (brighter towards the light)
  const key = ctx.createRadialGradient(lx * W, ly * H, 0, lx * W, ly * H, W * 1.1);
  const keyAlpha = style === 'slate' ? 0.08 : 0.32;
  key.addColorStop(0, rgba(warm, keyAlpha * light.intensity));
  key.addColorStop(1, rgba(warm, 0));
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, W, H);
  const shade = ctx.createLinearGradient(lx * W, ly * H, (1 - lx) * W, (1 - ly) * H);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, `rgba(0,0,0,${style === 'slate' ? 0.25 : 0.12})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  return c;
}

