'use client';

import React from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSession } from '@/lib/session';
import { ArrowRight } from 'lucide-react';

export function LandingNavbar() {
  const { session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-full border border-line glass shadow-soft backdrop-blur-xl">
        {/* Brand Identity */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Wordmark href="/" size="md" />

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-ink-2">
            <a href="#studio-tour" className="hover:text-ink transition-colors">
              How it Works
            </a>
            <a href="#podium-3d" className="hover:text-ink transition-colors">
              3D Lighting
            </a>
            <a href="#pixel-lock" className="hover:text-ink transition-colors">
              Label Protection
            </a>
            <a href="#showcase" className="hover:text-ink transition-colors">
              Showcase
            </a>
            <a href="#comparison" className="hover:text-ink transition-colors">
              Comparison
            </a>
            <a href="#faq" className="hover:text-ink transition-colors">
              FAQ
            </a>
          </nav>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />

          {!session && (
            <Link
              href="/login?redirect=/dashboard"
              className="text-xs font-semibold text-ink-2 hover:text-ink hover:bg-well rounded-full px-3 py-1.5 transition hidden sm:inline shrink-0"
            >
              Sign In
            </Link>
          )}

          <Link
            href={session ? '/dashboard' : '/login?redirect=/dashboard'}
            className="px-3.5 sm:px-5 py-2 rounded-full bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition group shrink-0"
          >
            <span>Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </header>
  );
}
