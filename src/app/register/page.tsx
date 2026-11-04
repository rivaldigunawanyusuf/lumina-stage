'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wordmark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { registerUser, loginAsJudge } from '@/lib/auth/authService';
import { ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const [fullName, setFullName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = registerUser({
      name: fullName,
      brand: brandName,
      email,
      password,
    });

    if (res.success) {
      router.push(redirectTarget);
    } else {
      setError(res.error || 'Registration failed. Please check your details.');
      setLoading(false);
    }
  };

  const handleQuickJudgeAccess = () => {
    loginAsJudge();
    router.push(redirectTarget);
  };

  return (
    <div className="min-h-dvh flex flex-col md:grid md:grid-cols-12 bg-paper text-ink">
      {/* ────────────────── LEFT COLUMN: REGISTER FORM ────────────────── */}
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
                Creator Registration
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-1.5">
                Create Creator Account
              </h1>
              <p className="text-xs sm:text-sm text-ink-2">
                Start staging brand-safe catalog shoots in seconds.
              </p>
            </div>

            {/* Quick Judge Access Shortcut */}
            <div className="p-3.5 rounded-2xl bg-well border border-line mb-6 flex items-center justify-between gap-3">
              <div className="text-[11px] text-ink-2">
                <span className="font-bold text-ink block">Evaluating as a Judge?</span>
                Skip registration with pre-seeded credentials.
              </div>
              <button
                type="button"
                onClick={handleQuickJudgeAccess}
                className="px-3 py-1.5 rounded-xl bg-cta text-cta-ink text-[11px] font-bold shrink-0 hover:opacity-90 transition cursor-pointer"
              >
                Judge Login →
              </button>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <span className="relative px-3 bg-surface text-[11px] font-mono uppercase tracking-wider text-ink-3">
                Or Register New Account
              </span>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-ink-2 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rivaldi Yusuf"
                  className="w-full px-3 py-2 rounded-xl bg-well border border-line focus:outline-none focus:border-accent text-ink placeholder:text-ink-3 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-ink-2 block mb-1">
                  Brand or Studio Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Aura Botanicals"
                  className="w-full px-3 py-2 rounded-xl bg-well border border-line focus:outline-none focus:border-accent text-ink placeholder:text-ink-3 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-ink-2 block mb-1">
                  Work Email
                </label>
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
                <label className="text-[11px] font-medium text-ink-2 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full px-3 py-2 rounded-xl bg-well border border-line focus:outline-none focus:border-accent text-ink placeholder:text-ink-3 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-cta text-cta-ink font-semibold text-xs mt-2 transition hover:opacity-90 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating Account…' : 'Create Account & Go to Dashboard'}
              </button>
            </form>

            <div className="text-center text-xs text-ink-2 mt-6">
              Already have an account?{' '}
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
                className="font-semibold text-ink underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-ink-3 text-center sm:text-left mt-8 pt-6 border-t border-line">
          Meta AI Production Architecture · Meta Global AI Developer Hackathon
        </div>
      </div>

      {/* ────────────────── RIGHT COLUMN: EDITORIAL SHOWCASE ────────────────── */}
      <div className="hidden md:col-span-6 lg:col-span-7 md:flex flex-col justify-between p-10 lg:p-14 bg-well relative overflow-hidden dot-grid">
        <div className="relative z-10 max-w-lg">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-3">
            Autonomous Staging
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight mb-4">
            Build production-grade commercial ad campaigns in minutes.
          </h2>

          <p className="text-sm text-ink-2 leading-relaxed">
            Register your brand to access high-resolution 1:1 catalog squares, 9:16 vertical stories,
            and 4:5 sponsored feed ad kits with automated safe zones and lighting preservation.
          </p>
        </div>

        <div className="relative z-10 p-6 rounded-3xl bg-surface border border-line shadow-soft max-w-md">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-ink">Free Testing Phase</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">$0.00 / Free Tier</span>
          </div>
          <p className="text-xs text-ink-2 leading-relaxed">
            Accounts created during the developer preview have full access to all studio tools, asset exports,
            and lighting controls with no billing required.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-paper text-ink text-xs text-ink-3">
          Loading Registration…
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
