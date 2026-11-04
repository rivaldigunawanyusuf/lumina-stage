'use client';

import { signIn, signOut, type LuminaSession } from '@/lib/session';

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  brand: string;
  workspace: string;
  role: 'judge' | 'creator' | 'brand';
  createdAt: string;
}

const USERS_STORAGE_KEY = 'luminastage_registered_users_v2';

export const PRESEEDED_JUDGE_ACCOUNT: RegisteredUser = {
  id: 'usr-judge-meta-01',
  name: 'Meta Hackathon Judge',
  email: 'judge@lumina.stage',
  password: 'lumina-judge-2026',
  brand: 'Meta AI Hackathon Evaluation Team',
  workspace: 'Judge Review Sandbox',
  role: 'judge',
  createdAt: '2026-11-04T07:00:00.000Z',
};

export const PRESEEDED_CREATOR_ACCOUNT: RegisteredUser = {
  id: 'usr-creator-02',
  name: 'Rivaldi Yusuf',
  email: 'rivaldi@studio.lumina',
  password: 'lumina-stage-demo',
  brand: 'Aura Botanicals & Kinetix',
  workspace: 'Master Creative Studio',
  role: 'creator',
  createdAt: '2026-11-04T08:00:00.000Z',
};

/**
 * Returns all registered users from localStorage, seeded with defaults.
 */
export function getRegisteredUsers(): RegisteredUser[] {
  if (typeof window === 'undefined') {
    return [PRESEEDED_JUDGE_ACCOUNT, PRESEEDED_CREATOR_ACCOUNT];
  }
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const initial = [PRESEEDED_JUDGE_ACCOUNT, PRESEEDED_CREATOR_ACCOUNT];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as RegisteredUser[];
    // Ensure the judge account always exists
    if (!parsed.some((u) => u.email.toLowerCase() === PRESEEDED_JUDGE_ACCOUNT.email.toLowerCase())) {
      parsed.unshift(PRESEEDED_JUDGE_ACCOUNT);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return [PRESEEDED_JUDGE_ACCOUNT, PRESEEDED_CREATOR_ACCOUNT];
  }
}

/**
 * Register a new user into production local state.
 */
export function registerUser(params: {
  name: string;
  brand: string;
  email: string;
  password: string;
}): { success: boolean; error?: string; user?: RegisteredUser } {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim();
  const cleanBrand = params.brand.trim() || 'Independent Brand';
  const cleanPass = params.password;

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Email and password are required.' };
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (cleanPass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  const existingUsers = getRegisteredUsers();
  if (existingUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in instead.',
    };
  }

  const newUser: RegisteredUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName || cleanEmail.split('@')[0],
    email: cleanEmail,
    password: cleanPass,
    brand: cleanBrand,
    workspace: `${cleanBrand} Workspace`,
    role: 'creator',
    createdAt: new Date().toISOString(),
  };

  const updated = [...existingUsers, newUser];
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist user in storage:', err);
  }

  // Automatically sign in the newly registered user
  signIn({
    name: newUser.name,
    email: newUser.email,
    brand: newUser.brand,
    workspace: newUser.workspace,
    provider: 'email',
  });

  return { success: true, user: newUser };
}

/**
 * Log in an existing user or preseeded judge account.
 */
export function loginUser(params: {
  email: string;
  password: string;
}): { success: boolean; error?: string; user?: RegisteredUser } {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPass = params.password;

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  const users = getRegisteredUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

  // Fallback direct match for preseeded judge account
  if (cleanEmail === PRESEEDED_JUDGE_ACCOUNT.email.toLowerCase()) {
    if (cleanPass === PRESEEDED_JUDGE_ACCOUNT.password) {
      signIn({
        name: PRESEEDED_JUDGE_ACCOUNT.name,
        email: PRESEEDED_JUDGE_ACCOUNT.email,
        brand: PRESEEDED_JUDGE_ACCOUNT.brand,
        workspace: PRESEEDED_JUDGE_ACCOUNT.workspace,
        provider: 'demo',
      });
      return { success: true, user: PRESEEDED_JUDGE_ACCOUNT };
    }
    return {
      success: false,
      error: 'Incorrect password for Judge account. Default password is: lumina-judge-2026',
    };
  }

  if (!found) {
    return {
      success: false,
      error: 'Account not found. You can register a new account or use the pre-seeded Judge button.',
    };
  }

  if (found.password !== cleanPass) {
    return {
      success: false,
      error: 'Invalid password. Please check your credentials and try again.',
    };
  }

  signIn({
    name: found.name,
    email: found.email,
    brand: found.brand,
    workspace: found.workspace,
    provider: 'email',
  });

  return { success: true, user: found };
}

/**
 * 1-Click Judge Login shortcut.
 */
export function loginAsJudge(): { success: boolean; user: RegisteredUser } {
  signIn({
    name: PRESEEDED_JUDGE_ACCOUNT.name,
    email: PRESEEDED_JUDGE_ACCOUNT.email,
    brand: PRESEEDED_JUDGE_ACCOUNT.brand,
    workspace: PRESEEDED_JUDGE_ACCOUNT.workspace,
    provider: 'demo',
  });
  return { success: true, user: PRESEEDED_JUDGE_ACCOUNT };
}
