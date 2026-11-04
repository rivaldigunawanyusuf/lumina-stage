/**
 * WebGL1 shader pipeline for the LuminaStage Compositor (with automatic CPU fallback).
 *
 * Provides two GPU passes:
 *   1. `gaussianBlurCanvas`: separable 9-tap Gaussian blur for cast shadows.
 *   2. `renderEdgeLightWrap`: computes an inner 2-4px rim mask along the
 *      product silhouette weighted by `dot(edgeNormal, lightDir)` and tinted
 *      with `warmthHex` + ambient background colour.
 *
 * Performance optimizations:
 * - Reuses persistent WebGL textures and scratch 2D canvases to avoid GC churn
 *   during 60fps Lighting Vector Gizmo drags.
 * - Marked in `.lumina_internal/memory.md` §6 (MC-1) as a target for Meta Muse Code.
 */
import { createCanvas, ctx2d, hexToRgb } from '@/lib/imaging/canvas';

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Separable 9-tap Gaussian blur in fragment shader
const FRAG_BLUR = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_step;

void main() {
  vec4 sum = texture2D(u_tex, v_uv) * 0.227027;
  sum += texture2D(u_tex, v_uv + u_step * 1.384615) * 0.316216;
  sum += texture2D(u_tex, v_uv - u_step * 1.384615) * 0.316216;
  sum += texture2D(u_tex, v_uv + u_step * 3.230769) * 0.070270;
  sum += texture2D(u_tex, v_uv - u_step * 3.230769) * 0.070270;
  gl_FragColor = sum;
}
`;

// Directional Edge Light-Wrap shader
const FRAG_LIGHT_WRAP = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_sil;
uniform vec2 u_texel;
uniform vec2 u_lightDir;
uniform vec3 u_tint;
uniform float u_rimWidthPx;
uniform float u_intensity;

float sampleA(vec2 uv) {
  return texture2D(u_sil, clamp(uv, vec2(0.0), vec2(1.0))).a;
}

void main() {
  float centerA = sampleA(v_uv);
  if (centerA <= 0.01) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 r = u_texel * u_rimWidthPx;
  float aR = sampleA(v_uv + vec2(r.x, 0.0));
  float aL = sampleA(v_uv - vec2(r.x, 0.0));
  float aU = sampleA(v_uv + vec2(0.0, r.y));
  float aD = sampleA(v_uv - vec2(0.0, r.y));
  float aUR = sampleA(v_uv + vec2(r.x, r.y) * 0.707);
  float aUL = sampleA(v_uv + vec2(-r.x, r.y) * 0.707);
  float aDR = sampleA(v_uv + vec2(r.x, -r.y) * 0.707);
  float aDL = sampleA(v_uv + vec2(-r.x, -r.y) * 0.707);

  float avgAround = (aR + aL + aU + aD + aUR + aUL + aDR + aDL) * 0.125;
  float rim = clamp((centerA - avgAround) * 2.4, 0.0, 1.0) * centerA;

  vec2 grad = vec2(aR - aL, -(aU - aD));
  float gLen = length(grad);
  vec2 normal = gLen > 0.001 ? (-grad / gLen) : u_lightDir;

  float dirWeight = 0.32 + 0.68 * max(0.0, dot(normal, u_lightDir));
  float alpha = rim * dirWeight * u_intensity;
  gl_FragColor = vec4(u_tint * alpha, alpha);
}
`;

interface GlContextBundle {
  canvas: HTMLCanvasElement;
  midCanvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  blurProg: WebGLProgram;
  wrapProg: WebGLProgram;
  quadBuf: WebGLBuffer;
  tex: WebGLTexture;
}

let glBundle: GlContextBundle | null | false = null;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile error: ${log}`);
  }
  return sh;
}

function linkProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  if (!prog) throw new Error('createProgram failed');
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link error: ${log}`);
  }
  return prog;
}

function getGl(): GlContextBundle | null {
  if (glBundle === false) return null;
  if (glBundle) return glBundle;
  if (typeof document === 'undefined') return null;
  try {
    const canvas = createCanvas(64, 64);
    const midCanvas = createCanvas(64, 64);
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      glBundle = false;
      return null;
    }
    const blurProg = linkProgram(gl, VERT_SRC, FRAG_BLUR);
    const wrapProg = linkProgram(gl, VERT_SRC, FRAG_LIGHT_WRAP);
    const quadBuf = gl.createBuffer();
    const tex = gl.createTexture();
    if (!quadBuf || !tex) throw new Error('createBuffer/createTexture failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    glBundle = { canvas, midCanvas, gl, blurProg, wrapProg, quadBuf, tex };
    return glBundle;
  } catch {
    glBundle = false;
    return null;
  }
}

function uploadToTexture(gl: WebGLRenderingContext, tex: WebGLTexture, src: TexImageSource) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
}

/**
 * Separable Gaussian blur via WebGL into `targetCanvas` (or a new canvas if omitted).
 */
export function gaussianBlurCanvas(
  src: HTMLCanvasElement,
  sigmaPx: number,
  targetCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = targetCanvas ?? createCanvas(w, h);
  if (out.width !== w || out.height !== h) {
    out.width = w;
    out.height = h;
  }

  const b = getGl();
  if (!b || sigmaPx <= 0.5) {
    const ctx = ctx2d(out);
    ctx.clearRect(0, 0, w, h);
    ctx.filter = `blur(${Math.max(1, sigmaPx)}px)`;
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';
    return out;
  }

  try {
    const { canvas, midCanvas, gl, blurProg, quadBuf, tex } = b;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (midCanvas.width !== w || midCanvas.height !== h) {
      midCanvas.width = w;
      midCanvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(blurProg);

    const posLoc = gl.getAttribLocation(blurProg, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const stepLoc = gl.getUniformLocation(blurProg, 'u_step');
    const radiusScale = Math.max(0.5, sigmaPx / 3.2);

    // Pass 1: horizontal blur
    uploadToTexture(gl, tex, src);
    gl.uniform2f(stepLoc, radiusScale / w, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const mctx = ctx2d(midCanvas);
    mctx.clearRect(0, 0, w, h);
    mctx.drawImage(canvas, 0, 0);

    // Pass 2: vertical blur
    uploadToTexture(gl, tex, midCanvas);
    gl.uniform2f(stepLoc, 0, radiusScale / h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const octx = ctx2d(out);
    octx.clearRect(0, 0, w, h);
    octx.drawImage(canvas, 0, 0);
    return out;
  } catch {
    const ctx = ctx2d(out);
    ctx.clearRect(0, 0, w, h);
    ctx.filter = `blur(${Math.max(1, sigmaPx)}px)`;
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';
    return out;
  }
}

/**
 * Computes the outer 2-4px Edge Light-Wrap overlay for Layer 3.
 */
export function renderEdgeLightWrap(opts: {
  silAlpha: HTMLCanvasElement;
  lightDirScreen: [number, number];
  warmthHex: string;
  bgAvgRgb: [number, number, number];
  intensity: number;
  rimWidthPx?: number;
  targetCanvas?: HTMLCanvasElement;
}): HTMLCanvasElement {
  const { silAlpha, lightDirScreen, warmthHex, bgAvgRgb, intensity } = opts;
  const rimWidthPx = opts.rimWidthPx ?? 3.2;
  const w = silAlpha.width;
  const h = silAlpha.height;
  const out = opts.targetCanvas ?? createCanvas(w, h);
  if (out.width !== w || out.height !== h) {
    out.width = w;
    out.height = h;
  }

  const warm = hexToRgb(warmthHex);
  const tint: [number, number, number] = [
    (warm[0] * 0.65 + bgAvgRgb[0] * 0.35) / 255,
    (warm[1] * 0.65 + bgAvgRgb[1] * 0.35) / 255,
    (warm[2] * 0.65 + bgAvgRgb[2] * 0.35) / 255,
  ];

  const b = getGl();
  if (b) {
    try {
      const { canvas, gl, wrapProg, quadBuf, tex } = b;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.useProgram(wrapProg);

      const posLoc = gl.getAttribLocation(wrapProg, 'a_pos');
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      uploadToTexture(gl, tex, silAlpha);
      gl.uniform2f(gl.getUniformLocation(wrapProg, 'u_texel'), 1 / w, 1 / h);
      gl.uniform2f(gl.getUniformLocation(wrapProg, 'u_lightDir'), lightDirScreen[0], lightDirScreen[1]);
      gl.uniform3f(gl.getUniformLocation(wrapProg, 'u_tint'), tint[0], tint[1], tint[2]);
      gl.uniform1f(gl.getUniformLocation(wrapProg, 'u_rimWidthPx'), rimWidthPx);
      gl.uniform1f(gl.getUniformLocation(wrapProg, 'u_intensity'), Math.min(1, Math.max(0.15, intensity * 0.85)));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      const octx = ctx2d(out);
      octx.clearRect(0, 0, w, h);
      octx.drawImage(canvas, 0, 0);
      return out;
    } catch {
      // fall through to 2D canvas rim fallback
    }
  }

  const ctx = ctx2d(out);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(silAlpha, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.filter = `blur(${rimWidthPx}px)`;
  ctx.drawImage(silAlpha, 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(silAlpha, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.hypot(w, h) * 0.5;
  const g = ctx.createLinearGradient(
    cx + lightDirScreen[0] * R,
    cy + lightDirScreen[1] * R,
    cx - lightDirScreen[0] * R,
    cy - lightDirScreen[1] * R,
  );
  const rgbStr = `${Math.round(tint[0] * 255)},${Math.round(tint[1] * 255)},${Math.round(tint[2] * 255)}`;
  g.addColorStop(0, `rgba(${rgbStr},${0.78 * intensity})`);
  g.addColorStop(1, `rgba(${rgbStr},${0.22 * intensity})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

export function isWebGLCompositorActive(): boolean {
  return getGl() !== null;
}
