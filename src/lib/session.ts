'use client';

/**
 * Lightweight client-only session (Phase 2.5 hackathon auth).
 * Nothing leaves the browser: the "account" is a profile stored in
 * localStorage so judges can get from landing → dashboard → studio in one click.
 */
import { useSyncExternalStore } from 'react';

export type AuthProvider = 'email' | 'meta' | 'github' | 'demo';

export interface LuminaSession {
  name: string;
  email: string;
  workspace: string;
  brand: string;
  provider: AuthProvider;
  createdAt: string;
}

const STORAGE_KEY = 'ls-session';
const CHANGE_EVENT = 'ls-session-change';
const SSR_SENTINEL = '__ssr__';

export const DEMO_PROFILE: Omit<LuminaSession, 'createdAt'> = {
  name: 'Meta Hackathon Judge',
  email: 'judge@lumina.stage',
  workspace: 'Judge Review Sandbox',
  brand: 'Meta AI Hackathon Evaluation',
  provider: 'demo',
};

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

let lastRaw: string | null | undefined;
let lastParsed: LuminaSession | null = null;

function parse(raw: string | null): LuminaSession | null {
  if (raw === lastRaw) return lastParsed;
  lastRaw = raw;
  try {
    lastParsed = raw ? (JSON.parse(raw) as LuminaSession) : null;
  } catch {
    lastParsed = null;
  }
  return lastParsed;
}

export function signIn(profile: Partial<Omit<LuminaSession, 'createdAt'>>): LuminaSession {
  const session: LuminaSession = {
    ...DEMO_PROFILE,
    ...Object.fromEntries(Object.entries(profile).filter(([, v]) => typeof v === 'string' && v.trim() !== '')),
    createdAt: new Date().toISOString(),
  } as LuminaSession;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore - session still flows for this navigation via the event below
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return session;
}

export function signInDemo(): LuminaSession {
  return signIn(DEMO_PROFILE);
}

export function signOut() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return 'LS';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * `ready` is false during SSR / first hydration pass, so gated pages can
 * render a neutral shell instead of flashing a redirect.
 */
export function useSession(): { session: LuminaSession | null; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, readRaw, () => SSR_SENTINEL);
  if (raw === SSR_SENTINEL) return { session: null, ready: false };
  return { session: parse(raw), ready: true };
}

