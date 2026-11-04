'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  HardDrive,
  LogOut,
  Wand2,
  FolderKanban,
  ArrowRight,
} from 'lucide-react';
import { Wordmark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { useSession, signOut, initialsOf, DEMO_PROFILE } from '@/lib/session';

export default function BillingPage() {
  const router = useRouter();
  const { session, ready } = useSession();
  const user = session ?? DEMO_PROFILE;

  React.useEffect(() => {
    if (ready && !session) {
      router.push('/login?redirect=/billing');
    }
  }, [ready, session, router]);

  return (
    <div className="h-dvh flex bg-paper text-ink overflow-hidden">
      {/* ────────────────── PERSISTENT LEFT APP SIDEBAR ────────────────── */}
      <AppSidebar className="hidden md:flex" />

      {/* ────────────────── MAIN WORKSPACE CONTENT ────────────────── */}
      <div className="flex-1 flex flex-col h-dvh overflow-y-auto min-w-0">
        {/* 56px Top Header Bar (Aligned 1:1 with AppSidebar, Dashboard & Studio) */}
        <header className="h-14 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden">
                <Wordmark href="/" size="sm" />
              </div>
              <div className="text-xs font-semibold text-ink hidden sm:flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-ink-2" />
                <span>{user.workspace}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/files"
                className="group hidden sm:flex px-3 py-1.5 rounded-full bg-well hover:bg-cta border border-line hover:border-cta text-xs font-semibold text-ink hover:text-cta-ink items-center gap-1.5 transition"
              >
                <FolderKanban className="w-3.5 h-3.5 text-accent group-hover:text-cta-ink transition-colors" />
                <span>My Files</span>
              </Link>

              <Link
                href="/studio"
                className="group hidden sm:flex px-3 py-1.5 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold items-center gap-1.5 hover:opacity-90 transition shadow-xs"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Open Studio</span>
              </Link>

              <ThemeToggle />

              {/* User Avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-line">
                <div
                  className="w-8 h-8 rounded-full bg-cta text-cta-ink text-xs font-bold flex items-center justify-center"
                  title={user.name}
                >
                  {initialsOf(user.name)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    router.push('/');
                  }}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-well transition hidden sm:inline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-8 flex flex-col gap-6 sm:gap-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                    Account &amp; Plan
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                    Free Studio Plan
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-ink-2 mt-1">
                  Manage your account profile, studio plan benefits, and payment receipts.
                </p>
              </div>
            </div>

            <Link
              href="/studio"
              className="px-4 py-2.5 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-semibold flex items-center justify-center gap-2 shadow-soft hover:opacity-90 transition shrink-0"
            >
              <span>Go to Photo Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 1. Free Access Banner */}
          <div className="p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <div className="font-bold text-emerald-800 dark:text-emerald-300">
                Free Studio Access · No Credit Card Required
              </div>
              <div className="text-emerald-700 dark:text-emerald-400/90 mt-1 text-xs">
                LuminaStage is free to use. All photo editing tools, lighting adjustments, logo protection, and multi-size downloads are included at no cost.
              </div>
            </div>
          </div>

          {/* 2. Current Plan Card */}
          <div className="p-6 rounded-3xl border border-line bg-surface shadow-soft flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-line">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">
                  Current Subscription
                </span>
                <div className="text-xl sm:text-2xl font-black text-ink flex items-center gap-2 mt-0.5">
                  <span>Free Studio Plan</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-black text-ink">$0.00</div>
                <div className="text-xs text-ink-3">Forever free access</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-ink-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-well/60 border border-line/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-ink">Unlimited background changes</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-well/60 border border-line/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-ink">360° Studio Lighting &amp; Shadows</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-well/60 border border-line/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-ink">Automatic logo &amp; text protection</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-well/60 border border-line/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-ink">Download in all 3 sizes (Square, Story, Feed)</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-well/60 border border-line/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-ink">Save &amp; organize photos in My Files</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-well/60 border border-line/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-ink">Ready for online stores &amp; social media</span>
              </div>
            </div>
          </div>

          {/* 3. Usage Summary & Profile Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Plan Highlights */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl border border-line bg-surface shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-ink-3 mb-2">
                  <span className="text-xs font-medium">Photo Edits</span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-xl font-bold text-ink">Unlimited</div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    Included in Free Plan
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl border border-line bg-surface shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-ink-3 mb-2">
                  <span className="text-xs font-medium">Saved Photos</span>
                  <HardDrive className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-xl font-bold text-ink">My Files</div>
                  <div className="text-[11px] text-ink-3 mt-1 font-medium">
                    Always available
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl border border-line bg-surface shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-ink-3 mb-2">
                  <span className="text-xs font-medium">Image Quality</span>
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="text-xl font-bold text-ink">High-Res</div>
                  <div className="text-[11px] text-ink-3 mt-1 font-medium">
                    Sharp PNG Downloads
                  </div>
                </div>
              </div>
            </div>

            {/* Account Profile Card */}
            <div className="lg:col-span-5 p-5 rounded-3xl border border-line bg-surface shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-cta text-cta-ink text-sm font-bold flex items-center justify-center shrink-0">
                  {initialsOf(user.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink truncate">{user.name}</div>
                  <div className="text-xs text-ink-2 truncate">{user.email}</div>
                </div>
              </div>
              <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
                <span className="text-ink-3">Workspace</span>
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-ink-2" />
                  <span>{user.workspace}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4. Billing Receipts Table */}
          <div className="rounded-3xl border border-line bg-surface shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Billing History &amp; Receipts</h2>
              <span className="text-xs text-ink-3">$0.00 Total Charged</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-well/40 text-ink-3 text-[11px]">
                    <th className="p-4 font-semibold">Receipt ID</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Plan</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-2">
                  <tr>
                    <td className="p-4 font-mono font-medium text-ink flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-ink-3" />
                      <span>INV-2026-002</span>
                    </td>
                    <td className="p-4">Nov 4, 2026</td>
                    <td className="p-4">Free Studio Plan</td>
                    <td className="p-4 font-mono text-ink font-bold">$0.00</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        Active · Free
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-medium text-ink flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-ink-3" />
                      <span>INV-2026-001</span>
                    </td>
                    <td className="p-4">Oct 4, 2026</td>
                    <td className="p-4">Free Studio Plan</td>
                    <td className="p-4 font-mono text-ink font-bold">$0.00</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        Active · Free
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ────────────────── MOBILE BOTTOM NAVIGATION BAR ────────────────── */}
      <MobileBottomNav />
    </div>
  );
}
