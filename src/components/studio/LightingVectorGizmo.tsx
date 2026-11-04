'use client';

import React, { useRef } from 'react';
import { RotateCcw, Sun } from 'lucide-react';
import { clamp } from '@/lib/imaging/canvas';
import { computeShadowProjection } from '@/lib/compositor/math';
import { useStudioStore } from '@/store/studioStore';

const SIZE = 188;
const CENTER = SIZE / 2;
const MAX_R = 74;

/**
 * Interactive 2D/3D hemisphere radar for controlling `LightingVector`:
 * - Outer rim = 10° grazing elevation; center = 90° zenith overhead.
 * - Angle = `azimuthDegrees` (0° = right, 90° = top/back, CCW).
 * - Opposite vector arrow shows the real-time projected shadow direction
 *   (Δx = -d·cosθ·cotφ, Δy = -d·sinθ·cotφ).
 */
export function LightingVectorGizmo() {
  const lighting = useStudioStore((s) => s.lightingVector);
  const aiLighting = useStudioStore((s) => s.aiDetectedLighting);
  const setLightingVector = useStudioStore((s) => s.setLightingVector);
  const resetLightingToAi = useStudioStore((s) => s.resetLightingToAi);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const polarToXY = (azimuthDeg: number, elevationDeg: number) => {
    const r = ((90 - clamp(elevationDeg, 10, 90)) / 80) * MAX_R;
    const rad = (azimuthDeg * Math.PI) / 180;
    return {
      x: CENTER + r * Math.cos(rad),
      y: CENTER - r * Math.sin(rad),
    };
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((clientX - rect.left) / rect.width) * SIZE - CENTER;
    const dy = ((clientY - rect.top) / rect.height) * SIZE - CENTER;

    let az = (Math.atan2(-dy, dx) * 180) / Math.PI;
    if (az < 0) az += 360;
    const dist = Math.min(MAX_R, Math.hypot(dx, dy));
    const el = clamp(Math.round(90 - (dist / MAX_R) * 80), 10, 90);

    setLightingVector({
      azimuthDegrees: Math.round(az),
      elevationDegrees: el,
    });
  };

  const handlePos = polarToXY(lighting.azimuthDegrees, lighting.elevationDegrees);
  const aiPos = polarToXY(aiLighting.azimuthDegrees, aiLighting.elevationDegrees);
  const proj = computeShadowProjection(lighting, 100);

  // Opposite shadow vector preview inside the radar
  const shadowEndX = clamp(CENTER + proj.screenDeltaX * 0.48, 16, SIZE - 16);
  const shadowEndY = clamp(CENTER + proj.screenDeltaY * 0.85, 16, SIZE - 16);

  return (
    <div className="bg-slate-950/75 border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-white">
            Light Direction
          </span>
        </div>
        <button
          type="button"
          onClick={resetLightingToAi}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
          title="Reset to automatic light position"
        >
          <RotateCcw className="w-3 h-3" /> Auto Light
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Hemisphere Radar SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            draggingRef.current = true;
            updateFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            updateFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
          className="w-[154px] h-[154px] shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <defs>
            <radialGradient id="hemisphereGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={lighting.warmthHex} stopOpacity={0.22 * lighting.intensity} />
              <stop offset="70%" stopColor="#0F172A" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#020617" stopOpacity={1} />
            </radialGradient>
          </defs>

          {/* Outer Dome */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={MAX_R}
            fill="url(#hemisphereGrad)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* Elevation rings: 35° and 65° */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={MAX_R * 0.68}
            fill="none"
            stroke="#1E293B"
            strokeDasharray="3 3"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={MAX_R * 0.34}
            fill="none"
            stroke="#1E293B"
            strokeDasharray="3 3"
          />
          {/* Crosshair axes */}
          <line x1={CENTER - MAX_R} y1={CENTER} x2={CENTER + MAX_R} y2={CENTER} stroke="#1E293B" />
          <line x1={CENTER} y1={CENTER - MAX_R} x2={CENTER} y2={CENTER + MAX_R} stroke="#1E293B" />

          {/* Projected Shadow Vector (opposite to light) */}
          <line
            x1={CENTER}
            y1={CENTER}
            x2={shadowEndX}
            y2={shadowEndY}
            stroke="#64748B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
          <circle cx={shadowEndX} cy={shadowEndY} r={4} fill="#475569" />

          {/* Center Product Anchor */}
          <circle cx={CENTER} cy={CENTER} r={5} fill="#E2E8F0" />

          {/* AI-Detected Ghost Ring */}
          <circle
            cx={aiPos.x}
            cy={aiPos.y}
            r={7}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />

          {/* Active Light Ray Line */}
          <line
            x1={CENTER}
            y1={CENTER}
            x2={handlePos.x}
            y2={handlePos.y}
            stroke="#FBBF24"
            strokeWidth="2.2"
          />

          {/* Draggable Sun Handle */}
          <circle
            cx={handlePos.x}
            cy={handlePos.y}
            r={10}
            fill={lighting.warmthHex}
            stroke="#F59E0B"
            strokeWidth="2.5"
          />
          <circle cx={handlePos.x} cy={handlePos.y} r={3.5} fill="#B45309" />
        </svg>

        {/* Friendly Readouts & Sliders */}
        <div className="flex-1 flex flex-col gap-2.5 text-xs">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1">
              <div className="text-[10px] text-slate-400">Light Angle</div>
              <div className="font-semibold text-amber-300">
                {lighting.azimuthDegrees}°
              </div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1">
              <div className="text-[10px] text-slate-400">Light Height</div>
              <div className="font-semibold text-amber-300">
                {lighting.elevationDegrees}°
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Brightness</span>
              <span className="text-slate-200 font-medium">
                {Math.round(lighting.intensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.02}
              value={lighting.intensity}
              onChange={(e) => setLightingVector({ intensity: Number(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Light Warmth</span>
            <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5">
              <input
                type="color"
                value={lighting.warmthHex}
                onChange={(e) => setLightingVector({ warmthHex: e.target.value.toUpperCase() })}
                className="w-4 h-4 rounded bg-transparent cursor-pointer border-0"
              />
              <span className="text-[11px] text-slate-200">
                Choose Color
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

