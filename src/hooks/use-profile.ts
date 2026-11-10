'use client';

import { useSyncExternalStore } from 'react';

// Local Collector Profile (Round 3, B.2): Nuvellite is a zero-backend,
// privacy-first app — "signing in" creates a local profile stored on the
// device (nuvellite_profile_v1), completely separate from the collection
// store (nuvellite_collection_v2) so signing out never touches the user's
// books. The useProfile() surface is shaped so a real OAuth provider can
// replace the local implementation later without changing the menu.

export interface LocalProfile {
  name: string;
  tag?: string;
  signedInAt: string;
}

const PROFILE_KEY = 'nuvellite_profile_v1';

let profile: LocalProfile | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function initFromStorage(): LocalProfile | null {
  if (initialized || typeof window === 'undefined') return profile;
  initialized = true;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalProfile;
      if (parsed && typeof parsed.name === 'string' && parsed.name.trim()) {
        profile = parsed;
      }
    }
  } catch {
    profile = null;
  }
  return profile;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LocalProfile | null {
  return initialized ? profile : initFromStorage();
}

export function useProfile() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const signIn = (name: string, tag?: string) => {
    const clean = name.trim().slice(0, 24);
    if (!clean) return;
    profile = {
      name: clean,
      tag: tag?.trim().slice(0, 40) || undefined,
      signedInAt: new Date().toISOString(),
    };
    initialized = true;
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Best-effort persistence.
    }
    emit();
  };

  const signOut = () => {
    profile = null;
    initialized = true;
    try {
      window.localStorage.removeItem(PROFILE_KEY);
    } catch {
      // Best-effort.
    }
    emit();
  };

  return { profile: current, isSignedIn: current !== null, signIn, signOut };
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
