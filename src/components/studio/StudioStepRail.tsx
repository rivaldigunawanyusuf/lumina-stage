'use client';

import React from 'react';
import { Layers, Sparkles, Type, CheckCircle2 } from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';

const STEPS = [
  {
    step: 1 as const,
    label: '1. Product',
    short: '1. Product',
    subtitle: 'Keep Logo Clear',
    icon: Layers,
  },
  {
    step: 2 as const,
    label: '2. Background',
    short: '2. Background',
    subtitle: 'Scene & Light',
    icon: Sparkles,
  },
  {
    step: 3 as const,
    label: '3. Text & Sizes',
    short: '3. Text',
    subtitle: 'Ad Layout',
    icon: Type,
  },
];

export function StudioStepRail({ className = '' }: { className?: string }) {
  const activeStep = useStudioStore((s) => s.activeStep);
  const setActiveStep = useStudioStore((s) => s.setActiveStep);

  return (
    <nav
      aria-label="Studio workflow steps"
      className={`grid grid-cols-3 gap-1 p-1 bg-surface border border-line rounded-2xl ${className}`}
    >
      {STEPS.map((item) => {
        const isActive = activeStep === item.step;
        const Icon = item.icon;
        return (
          <button
            key={item.step}
            type="button"
            onClick={() => setActiveStep(item.step)}
            className={`group min-w-0 py-2 px-2 rounded-xl text-left transition-colors flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink shadow-sm'
                : 'text-ink-2 hover:text-ink hover:bg-well'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isActive
                  ? 'bg-black/15 dark:bg-black/10 border-current/20 text-cta-ink'
                  : 'bg-well group-hover:bg-surface border-line text-ink-2 group-hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`text-[11px] font-semibold truncate leading-tight ${
                  isActive ? 'text-cta-ink' : 'text-ink group-hover:text-ink'
                }`}
              >
                {item.label}
              </div>
              <div
                className={`text-[9px] truncate leading-tight ${
                  isActive ? 'text-cta-ink opacity-80' : 'text-ink-3 group-hover:text-ink-2'
                }`}
              >
                {item.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

