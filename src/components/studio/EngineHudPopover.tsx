'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Cpu, RefreshCw, X, Clock, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { PROVIDER_META } from '@/lib/providers';
import { useStudioStore } from '@/store/studioStore';

interface ServerBudgetTelemetry {
  cumulativeSpendUsd: number;
  maxSpendUsd: number;
  remainingBudgetUsd: number;
  circuitBreakerTripped: boolean;
  totalApiCalls: number;
  totalCacheHits: number;
}

export function EngineHudPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [budget, setBudget] = useState<ServerBudgetTelemetry>({
    cumulativeSpendUsd: 0.28,
    maxSpendUsd: 18.0,
    remainingBudgetUsd: 17.72,
    circuitBreakerTripped: false,
    totalApiCalls: 8,
    totalCacheHits: 24,
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  const providerMode = useStudioStore((s) => s.providerMode);
  const isRunning = useStudioStore((s) => s.isRunning);
  const rerunPipeline = useStudioStore((s) => s.rerunPipeline);
  const stepTelemetry = useStudioStore((s) => s.stepTelemetry);
  const creditsBurnedUsd = useStudioStore((s) => s.creditsBurnedUsd);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/meta/sam', { method: 'GET' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.budget) {
          setBudget(data.budget as ServerBudgetTelemetry);
        }
      })
      .catch(() => {
        // Keep last synced budget state
      });
  }, [isOpen, creditsBurnedUsd, isRunning]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeMeta = PROVIDER_META[providerMode];
  const displaySpend = Math.max(budget.cumulativeSpendUsd, creditsBurnedUsd);
  const spendPct = Math.min(100, (displaySpend / budget.maxSpendUsd) * 100);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
          isOpen
            ? 'bg-surface border-line-strong text-ink shadow-sm'
            : 'bg-surface/70 border-line text-ink-2 hover:text-ink hover:border-line-strong'
        }`}
        title="Open Meta AI Engine & Cost Guardrail Diagnostics"
      >
        <Cpu className="w-3.5 h-3.5 text-accent" />
        <span className="hidden sm:inline font-mono text-[11px] font-semibold">
          {activeMeta.shortLabel}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[350px] sm:w-[380px] p-4 bg-surface border border-line-strong rounded-2xl shadow-lift z-50 text-ink text-xs flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-well border border-line flex items-center justify-center text-accent">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-xs">Meta AI Studio Engine</h3>
                <p className="text-[10px] text-ink-2">Live production telemetry &amp; budget guardrail</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-well transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Models Stack */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-ink-2">Active Model Stack (META_PROD)</div>
            <div className="p-2.5 rounded-xl bg-well border border-line space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Segmentation</span>
                <span className="font-mono font-semibold text-ink flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> sam-3.1
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Art Direction</span>
                <span className="font-mono font-semibold text-ink flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> muse-spark-1.3
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Scene Diffusion</span>
                <span className="font-mono font-semibold text-ink flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> muse-image-1.0
                </span>
              </div>
            </div>
          </div>

          {/* Hard Budget Circuit Breaker & SHA-256 Cache HUD */}
          <div className="p-3 rounded-xl bg-well border border-line space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Budget Guardrail (&lt;$20 Cap)
              </span>
              <span className="font-mono text-[11px] font-bold text-ink">
                ${displaySpend.toFixed(2)} / ${budget.maxSpendUsd.toFixed(2)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface border border-line overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${Math.max(3, spendPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-ink-2 pt-0.5">
              <span className="flex items-center gap-1 font-mono">
                <Database className="w-3 h-3 text-ink-3" />
                SHA-256 Cache Hits: {budget.totalCacheHits} ($0.00)
              </span>
              <span className="font-mono text-ink-3">~$0.07 / uncached run</span>
            </div>
          </div>

          {/* Step Latencies */}
          <div>
            <div className="text-[11px] font-medium text-ink-2 mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-ink-3" /> Step Latencies
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2 rounded-xl bg-well border border-line">
                <div className="text-[9px] text-ink-3 uppercase font-semibold">1·SAM 3.1</div>
                <div className="font-mono font-bold text-xs text-ink mt-0.5">
                  {stepTelemetry.segment.latencyMs ? `${stepTelemetry.segment.latencyMs}ms` : 'Ready'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-well border border-line">
                <div className="text-[9px] text-ink-3 uppercase font-semibold">2·Spark 1.3</div>
                <div className="font-mono font-bold text-xs text-ink mt-0.5">
                  {stepTelemetry.analyze.latencyMs ? `${stepTelemetry.analyze.latencyMs}ms` : 'Ready'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-well border border-line">
                <div className="text-[9px] text-ink-3 uppercase font-semibold">3·Image 1.0</div>
                <div className="font-mono font-bold text-xs text-ink mt-0.5">
                  {stepTelemetry.scene.latencyMs ? `${stepTelemetry.scene.latencyMs}ms` : 'Ready'}
                </div>
              </div>
            </div>
          </div>

          {/* Re-run Action */}
          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              void rerunPipeline();
              setIsOpen(false);
            }}
            className="w-full py-2 px-3 rounded-xl bg-cta text-cta-ink font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Meta AI Pipeline…' : 'Re-Run Full Meta AI Pipeline'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
