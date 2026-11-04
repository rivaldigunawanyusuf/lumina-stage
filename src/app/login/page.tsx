'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wordmark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  loginUser,
  loginAsJudge,
  PRESEEDED_JUDGE_ACCOUNT,
} from '@/lib/auth/authService';
import { ArrowRight, ShieldCheck, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  // Pre-seed with the Judge credentials by default
  const [email, setEmail] = useState(PRESEEDED_JUDGE_ACCOUNT.email);
  const [password, setPassword] = useState(PRESEEDED_JUDGE_ACCOUNT.password);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInstantJudgeLogin = () => {
    setLoading(true);
    setError(null);
    loginAsJudge();
    router.push(redirectTarget);
  };

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = loginUser({
      email,
      password,
    });

    if (res.success) {
      router.push(redirectTarget);
    } else {
      setError(res.error || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const fillJudgeCredentials = () => {
    setEmail(PRESEEDED_JUDGE_ACCOUNT.email);
    setPassword(PRESEEDED_JUDGE_ACCOUNT.password);
    setError(null);
  };

  return (
    <div className="min-h-dvh flex flex-col md:grid md:grid-cols-12 bg-paper text-ink">
      {/* ────────────────── LEFT COLUMN: AUTH FORM ────────────────── */}
      <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-14 border-r border-line bg-surface">
        <div>
          {/* Top Brand & Theme */}
          <div className="flex items-center justify-between mb-8 sm:mb-12">
            <Wordmark href="/" size="md" />
            <ThemeToggle />
          </div>

          <div className="max-w-sm mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-2">
                Workspace Authentication
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-1.5">
                Sign in to LuminaStage
              </h1>
              <p className="text-xs sm:text-sm text-ink-2">
                Brand-safe autonomous product staging &amp; ad studio.
              </p>
            </div>

            {/* ────────────────── CRITICAL HACKATHON FEATURE: 1-CLICK JUDGE LOGIN ────────────────── */}
            <div className="p-4 rounded-2xl bg-well border border-line mb-6 flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-ink">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Meta AI Hackathon Judge Login</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                  Pre-Seeded
                </span>
              </div>
              <p className="text-[11px] text-ink-2 leading-relaxed">
                Pre-loaded with sample CPG assets, 3D lighting engines, and export kits for rapid evaluation.
              </p>
              <button
                type="button"
                onClick={handleInstantJudgeLogin}
                disabled={loading}
                className="w-full py-2.5 px-3 rounded-xl bg-cta text-cta-ink text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>Instant Judge Login (1-Click Access)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <span className="relative px-3 bg-surface text-[11px] font-mono uppercase tracking-wider text-ink-3">
                Or Sign In with Credentials
              </span>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email / Password Form (Pre-seeded by default) */}
            <form onSubmit={handleStandardSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-ink-2">
                    Email Address
                  </label>
                  <button
                    type="button"
                    onClick={fillJudgeCredentials}
                    className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Reset to Judge Account</span>
                  </button>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 rounded-xl bg-well border border-line focus:outline-none focus:border-accent text-ink placeholder:text-ink-3 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-ink-2">
                    Password
                  </label>
                  <span className="text-[10px] text-ink-3">
                    Default: {PRESEEDED_JUDGE_ACCOUNT.password}
                  </span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-well border border-line focus:outline-none focus:border-accent text-ink placeholder:text-ink-3 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-surface border border-line hover:border-line-strong text-ink font-semibold text-xs mt-2 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? 'Authenticating…' : 'Sign In with Account'}
              </button>
            </form>

            <div className="text-center text-xs text-ink-2 mt-6">
              Don’t have an account yet?{' '}
              <Link
                href={`/register?redirect=${encodeURIComponent(redirectTarget)}`}
                className="font-semibold text-ink underline"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-ink-3 text-center sm:text-left mt-8 pt-6 border-t border-line">
          Meta Global AI Developer Hackathon · Evaluator Live Access
        </div>
      </div>

      {/* ────────────────── RIGHT COLUMN: EDITORIAL SHOWCASE ────────────────── */}
      <div className="hidden md:col-span-6 lg:col-span-7 md:flex flex-col justify-between p-10 lg:p-14 bg-well relative overflow-hidden dot-grid">
        <div className="relative z-10 max-w-lg">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-3">
            Packaging Protection Engine
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight mb-4">
            Commercial staging that honors your packaging.
          </h2>

          <p className="text-sm text-ink-2 leading-relaxed">
            Standard AI image models blur fine text and deform brand typography. LuminaStage preserves your
            original product artwork while dynamically generating editorial 3D studio environments, shadows, and reflections.
          </p>
        </div>

        <div className="relative z-10 p-6 rounded-3xl bg-surface border border-line shadow-soft max-w-md">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-ink">Evaluation Sandbox</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Meta AI Live Engine</span>
          </div>
          <p className="text-xs text-ink-2 leading-relaxed">
            All 90 commercial assets (Botanical Serum, Nitro Cold Brew, Wildflower Honey, Haute Couture models)
            are fully unlocked and ready to test with zero credit limits.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-paper text-ink text-xs text-ink-3">
          Loading Sign In…
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
