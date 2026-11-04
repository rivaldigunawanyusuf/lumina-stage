'use client';

import React from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Building,
  HardDrive,
  Clock,
  Layers,
} from 'lucide-react';
import { useSession, DEMO_PROFILE } from '@/lib/session';

interface AccountBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountBillingModal({ isOpen, onClose }: AccountBillingModalProps) {
  const { session } = useSession();
  const user = session ?? DEMO_PROFILE;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-3xl border border-line bg-surface shadow-lift overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-modal-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="billing-modal-title" className="text-base font-bold text-ink">
                  Account Settings &amp; Subscription
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  Live Studio Mode
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                Manage your studio subscription, testing quota, and workspace details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-well hover:bg-cta border border-line hover:border-cta text-ink-2 hover:text-cta-ink transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar text-ink">
          {/* ────────────────── 1. FREE ACCESS BANNER ────────────────── */}
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-emerald-800 dark:text-emerald-300">
                Free Studio Access · No Billing Required
              </div>
              <div className="text-emerald-700 dark:text-emerald-400/90 mt-1">
                LuminaStage is currently free to use. All photo editing tools, lighting adjustments, logo protection, and image downloads are included at no cost.
              </div>
            </div>
          </div>

          {/* ────────────────── 2. CURRENT PLAN CARD ────────────────── */}
          <div className="p-5 rounded-2xl border border-line bg-well/50 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
              <div>
                <span className="text-[10.5px] uppercase tracking-wider text-ink-3">
                  Current Plan
                </span>
                <div className="text-xl font-black text-ink flex items-center gap-2 mt-0.5">
                  <span>Free Studio Plan</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-black text-ink">$0.00</div>
                <div className="text-[11px] text-ink-3">Free access</div>
              </div>
            </div>

            {/* Included Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-ink-2 pt-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Unlimited background changes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>360° Studio Lighting &amp; Shadows</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Automatic logo &amp; text protection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Download in all 3 sizes (Square, Story, Feed)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Save &amp; organize photos in My Files</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Ready for online stores &amp; social media</span>
              </div>
            </div>
          </div>

          {/* ────────────────── 3. USAGE SUMMARY ────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-3">
              Plan Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between text-ink-3 mb-1">
                  <span className="text-[11px]">Photo Edits</span>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-lg font-bold text-ink">Unlimited</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  Included in Free Plan
                </div>
              </div>

              <div className="p-4 rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between text-ink-3 mb-1">
                  <span className="text-[11px]">Saved Photos</span>
                  <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-lg font-bold text-ink">My Files</div>
                <div className="text-[10px] text-ink-3 mt-1 font-medium">
                  Always available
                </div>
              </div>

              <div className="p-4 rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between text-ink-3 mb-1">
                  <span className="text-[11px]">Image Quality</span>
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="text-lg font-bold text-ink truncate">High-Res</div>
                <div className="text-[10px] text-ink-3 mt-1 truncate">
                  Sharp PNG Downloads
                </div>
              </div>
            </div>
          </div>

          {/* ────────────────── 4. PROFILE & WORKSPACE ────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-3 font-mono">
              Workspace &amp; Account
            </h3>
            <div className="p-4 rounded-xl border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cta text-cta-ink text-xs font-bold flex items-center justify-center">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-ink">{user.name}</div>
                  <div className="text-[11px] text-ink-2">{user.email}</div>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-semibold text-ink flex items-center sm:justify-end gap-1.5">
                  <Building className="w-3.5 h-3.5 text-ink-2" />
                  <span>{user.workspace}</span>
                </div>
                <div className="text-[11px] text-ink-3 mt-0.5">Role: Creative Director</div>
              </div>
            </div>
          </div>

          {/* ────────────────── 5. TEST BILLING INVOICES ────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-3 font-mono">
              Test Invoices &amp; Receipts
            </h3>
            <div className="rounded-xl border border-line bg-surface overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-well/40 text-ink-3 text-[11px]">
                    <th className="p-3 font-semibold">Invoice</th>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Amount</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-2">
                  <tr>
                    <td className="p-3 font-mono font-medium text-ink flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-ink-3" />
                      <span>INV-2026-TEST-002</span>
                    </td>
                    <td className="p-3 text-[11px]">Nov 5, 2026</td>
                    <td className="p-3 font-mono text-ink font-bold">$0.00</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        PAID (Live Studio Mode)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-medium text-ink flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-ink-3" />
                      <span>INV-2026-TEST-001</span>
                    </td>
                    <td className="p-3 text-[11px]">Nov 4, 2026</td>
                    <td className="p-3 font-mono text-ink font-bold">$0.00</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        PAID (Live Studio Mode)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-surface flex items-center justify-between text-xs">
          <span className="text-ink-3 text-[11px]">
            LuminaStage Studio · Live Studio Mode
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink font-semibold text-xs transition hover:opacity-90 shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
