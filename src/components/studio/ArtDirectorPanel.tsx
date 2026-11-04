'use client';

import React from 'react';
import {
  Palette,
  RefreshCw,
  Sliders,
  Sparkles,
  SplitSquareVertical,
  Type,
  Wand2,
} from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';
import { LightingVectorGizmo } from './LightingVectorGizmo';

export function ArtDirectorPanel() {
  const pipelineResult = useStudioStore((s) => s.pipelineResult);
  const scenePrompt = useStudioStore((s) => s.scenePrompt);
  const setScenePrompt = useStudioStore((s) => s.setScenePrompt);
  const regenerateBackground = useStudioStore((s) => s.regenerateBackground);
  const isRegeneratingScene = useStudioStore((s) => s.isRegeneratingScene);

  const adCopy = useStudioStore((s) => s.adCopy);
  const setAdCopy = useStudioStore((s) => s.setAdCopy);

  const inspectorEnabled = useStudioStore((s) => s.inspectorEnabled);
  const setInspectorEnabled = useStudioStore((s) => s.setInspectorEnabled);
  const inspectorSplit = useStudioStore((s) => s.inspectorSplit);
  const setInspectorSplit = useStudioStore((s) => s.setInspectorSplit);

  const artDirection = pipelineResult?.artDirection;

  return (
    <section className="flex flex-col gap-3.5 bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xs font-bold">
            2
          </span>
          <div>
            <h2 className="studio-heading font-semibold text-white">
              Autonomous Art Director
            </h2>
            <p className="text-[11px] text-slate-400">
              Muse Spark Spatial Prompting &amp; Lighting Vector
            </p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-amber-400" />
      </div>

      {/* Extracted Product Material & Category Badges */}
      {artDirection && (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Category</span>
            <span className="font-medium text-cyan-300">{artDirection.productCategory}</span>
          </div>
          <div className="text-[11px] text-slate-300 leading-snug">
            <span className="text-slate-500">Material: </span>
            {artDirection.detectedMaterial}
          </div>
        </div>
      )}

      {/* Interactive Lighting Vector Gizmo */}
      <LightingVectorGizmo />

      {/* Before vs. After Brand-Safety Inspector Toggle */}
      <div
        className={`rounded-xl border p-2.5 transition ${
          inspectorEnabled
            ? 'bg-emerald-950/35 border-emerald-500/50'
            : 'bg-slate-950/70 border-slate-800/90'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">
                Before vs. After Packaging Inspector
              </div>
              <div className="text-[10px] text-slate-400">
                Compare diffusion blur vs. LuminaStage Label Overlay
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInspectorEnabled(!inspectorEnabled)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              inspectorEnabled
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {inspectorEnabled ? 'Active' : 'Inspect'}
          </button>
        </div>

        {inspectorEnabled && (
          <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center gap-2">
            <span className="text-[10px] text-rose-300 font-medium">Naive AI</span>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.01}
              value={inspectorSplit}
              onChange={(e) => setInspectorSplit(Number(e.target.value))}
              className="flex-1 accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-emerald-300 font-medium">Preserved Label</span>
          </div>
        )}
      </div>

      {/* Spatial Scene Prompt & Presets */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
            Studio Scene Prompt
          </span>
          <span className="text-[10px] text-slate-500">Lighting-Aligned</span>
        </div>

        {/* Suggested Scene Presets */}
        {artDirection?.suggestedPresets && (
          <div className="flex flex-wrap gap-1">
            {artDirection.suggestedPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={isRegeneratingScene}
                onClick={() => void regenerateBackground(preset.id, preset.prompt)}
                className="text-[11px] px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
              >
                {preset.title}
              </button>
            ))}
          </div>
        )}

        <textarea
          rows={3}
          value={scenePrompt}
          onChange={(e) => setScenePrompt(e.target.value)}
          placeholder="Describe the studio tabletop environment..."
          className="w-full rounded-lg bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 resize-none"
        />

        <button
          type="button"
          disabled={isRegeneratingScene}
          onClick={() => void regenerateBackground()}
          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingScene ? 'animate-spin' : ''}`} />
          {isRegeneratingScene ? 'Generating Studio Backdrop…' : 'Regenerate Studio Backdrop'}
        </button>
      </div>

      {/* Multi-Ratio Ad Copy & CTA Editor */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-400" />
            Smart Multi-Ratio Ad Copy
          </span>
          <span className="text-[10px] text-slate-500">Auto-Avoids Product BBox</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Headline</label>
            <input
              type="text"
              value={adCopy.headline}
              onChange={(e) => setAdCopy({ headline: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Subheadline</label>
            <input
              type="text"
              value={adCopy.subheadline}
              onChange={(e) => setAdCopy({ subheadline: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 block mb-0.5">CTA Badge Text</label>
              <input
                type="text"
                value={adCopy.ctaText}
                onChange={(e) => setAdCopy({ ctaText: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
                <Palette className="w-2.5 h-2.5" /> Accent
              </label>
              <label className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 cursor-pointer">
                <input
                  type="color"
                  value={adCopy.accentColorHex}
                  onChange={(e) => setAdCopy({ accentColorHex: e.target.value.toUpperCase() })}
                  className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-200 truncate">
                  {adCopy.accentColorHex}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Compositor Layer Stack Legend */}
      <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-2.5 text-[11px] text-slate-400 flex flex-col gap-1">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-0.5">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          Active 5-Layer Compositing Pipeline
        </div>
        <div className="flex items-center justify-between">
          <span>L5 · Smart Multi-Ratio Typography &amp; CTA</span>
          <span className="text-emerald-400 font-mono text-[10px]">ON</span>
        </div>
        <div className="flex items-center justify-between text-emerald-300 font-medium">
          <span>L4 · Label Preservation Overlay</span>
          <span className="bg-emerald-500/20 px-1.5 rounded font-mono text-[10px]">ACTIVE</span>
        </div>
        <div className="flex items-center justify-between">
          <span>L3 · Product Cutout + WebGL Edge Wrap</span>
          <span className="text-cyan-400 font-mono text-[10px]">2-4px</span>
        </div>
        <div className="flex items-center justify-between">
          <span>L2 · Directional Shadow (-d·cosθ·cotφ)</span>
          <span className="text-amber-400 font-mono text-[10px]">WEBGL</span>
        </div>
        <div className="flex items-center justify-between">
          <span>L1 · Generated Studio Scene (Smart Crop)</span>
          <span className="text-slate-300 font-mono text-[10px]">3 RATIOS</span>
        </div>
      </div>
    </section>
  );
}

