'use client';

import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '@/lib/theme';

/**
 * Two-state light/dark switch. Both icon + label states live in the markup and
 * the inactive one is hidden via the `dark:` variant, so the control is correct
 * before hydration (no icon flash, no hydration mismatch).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface hover:bg-well text-ink-2 transition-colors hover:text-ink hover:border-line-strong cursor-pointer ${className}`}
    >
      <Moon aria-hidden className="h-4 w-4 dark:hidden" />
      <Sun aria-hidden className="hidden h-4 w-4 dark:block" />
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="sr-only hidden dark:inline">Switch to light theme</span>
    </button>
  );
}

