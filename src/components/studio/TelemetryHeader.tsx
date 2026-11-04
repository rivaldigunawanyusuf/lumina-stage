'use client';

import React from 'react';
import {
  Activity,
  Cpu,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { ProviderMode } from '@/types/lumina';
import { PROVIDER_META } from '@/lib/providers';
import { useStudioStore } from '@/store/studioStore';
import { LuminaLogo } from './LuminaLogo';

const MODES: ProviderMode[] = ['MOCK_OFFLINE', 'FREE_DEV', 'META_PROD'];

export function TelemetryHeader() {
  const providerMode = useStudioStore((s) => s.providerMode);
  const setProviderMode = useStudioStore((s) => s.setProviderMode);
  const isRunning = useStudioStore((s) => s.isRunning);
  const rerunPipeline = useStudioStore((s) => s.rerunPipeline);
  const pipelineResult = useStudioStore((s) => s.pipelineResult);
  const stepTelemetry = useStudioStore((s) => s.stepTelemetry);
  const creditsBurnedUsd = useStudioStore((s) => s.creditsBurnedUsd);

  const activeMeta = PROVIDER_META[providerMode];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1800px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <LuminaLogo className="w-8 h-8 shrink-0 text-white" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">
                LuminaStage
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Commercial Product Staging &amp; Multi-Channel Ad Studio · Meta AI Hackathon
            </p>
          </div>
        </div>

        {/* Provider Adapter Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 max-w-full overflow-x-auto">
          {MODES.map((m) => {
            const meta = PROVIDER_META[m];
            const active = providerMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setProviderMode(m)}
                disabled={isRunning}
                title={meta.description}
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                  active
                    ? m === 'META_PROD'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : m === 'FREE_DEV'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active
                      ? m === 'META_PROD'
                        ? 'bg-blue-300 animate-pulse'
                        : m === 'FREE_DEV'
                          ? 'bg-cyan-400'
                          : 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
                <span className="font-mono">{meta.shortLabel}</span>
                <span className="hidden md:inline text-[10px] opacity-75">
                  ({meta.costLabel})
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void rerunPipeline()}
            disabled={isRunning}
            title="Re-run full 3-stage pipeline"
            className="ml-0.5 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Live Telemetry & Zero-Burn Credit Meter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] bg-slate-900/70 border border-slate-800/90 rounded-lg px-2.5 py-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Mask:</span>
            <span className="text-slate-200 font-mono">
              {stepTelemetry.segment.status === 'running'
                ? 'running…'
                : `${stepTelemetry.segment.latencyMs ?? 0}ms`}
            </span>
            <span className="text-slate-700">|</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400">Director:</span>
            <span className="text-slate-200 font-mono">
              {stepTelemetry.analyze.status === 'running'
                ? 'running…'
                : `${stepTelemetry.analyze.latencyMs ?? 0}ms`}
            </span>
            <span className="text-slate-700">|</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400">Scene:</span>
            <span className="text-slate-200 font-mono">
              {stepTelemetry.scene.status === 'running'
                ? 'running…'
                : `${stepTelemetry.scene.latencyMs ?? 0}ms`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Total:</span>
            <span className="font-mono text-slate-100 font-semibold">
              {pipelineResult ? `${pipelineResult.latencyMs}ms` : '-'}
            </span>
          </div>

          <div
            title={`Active stack: ${activeMeta.stackSummary}`}
            className="flex items-center gap-1.5 text-xs bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 rounded-lg px-2.5 py-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono font-semibold">
              ${creditsBurnedUsd.toFixed(2)} / $150.00
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 px-1.5 py-0.2 rounded text-emerald-200">
              {creditsBurnedUsd === 0 ? 'Zero-Burn' : 'Metered'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

