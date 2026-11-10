'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

// Dual-mode theme store (Round 3, supersedes the Round 2 dark-only lock —
// S-01/S-02): mode ('dark' | 'light', dark default) + one of 6 accents
// (azure default) persisted in localStorage and applied to <html> as the
// .light class + data-accent attribute, which drive the token tables in
// globals.css. A module-level store + listener set keeps every consumer
// (Header, ProfileMenu, MobileNav) in sync, mirroring use-collection.

export type AccentTheme =
  | 'azure'
  | 'vermilion'
  | 'emerald'
  | 'indigo'
  | 'gold'
  | 'rose';

export type ThemeMode = 'dark' | 'light';

export const ACCENT_THEMES: { id: AccentTheme; label: string; color: string }[] = [
  { id: 'azure', label: 'Biru Langit', color: '#0EA5E9' },
  { id: 'vermilion', label: 'Merah Koral', color: '#E11D48' },
  { id: 'emerald', label: 'Zamrud', color: '#10B981' },
  { id: 'indigo', label: 'Nila', color: '#6366F1' },
  { id: 'gold', label: 'Emas', color: '#D4AF37' },
  { id: 'rose', label: 'Merah Muda', color: '#F43F5E' },
];

const MODE_KEY = 'nuvellite_theme';
const ACCENT_KEY = 'nuvellite_theme_accent';
const VALID_ACCENTS: AccentTheme[] = ACCENT_THEMES.map((t) => t.id);

interface ThemeState {
  theme: ThemeMode;
  accent: AccentTheme;
}

const DEFAULT_STATE: ThemeState = { theme: 'dark', accent: 'azure' };

let state: ThemeState = DEFAULT_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function applyToDocument(next: ThemeState) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', next.theme === 'light');
  document.documentElement.setAttribute('data-accent', next.accent);
}

function initFromStorage(): ThemeState {
  if (initialized || typeof window === 'undefined') return state;
  initialized = true;
  try {
    const mode = window.localStorage.getItem(MODE_KEY);
    const accent = window.localStorage.getItem(ACCENT_KEY) as AccentTheme | null;
    state = {
      theme: mode === 'light' ? 'light' : 'dark',
      accent: accent && VALID_ACCENTS.includes(accent) ? accent : 'azure',
    };
    applyToDocument(state);
  } catch {
    // Storage unavailable (private mode): keep defaults.
  }
  return state;
}

function setState(next: ThemeState) {
  state = next;
  applyToDocument(next);
  try {
    window.localStorage.setItem(MODE_KEY, next.theme);
    window.localStorage.setItem(ACCENT_KEY, next.accent);
  } catch {
    // Persisting is best-effort; the in-memory state still applies.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeState {
  return initialized ? state : initFromStorage();
}

export function useTheme() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const setTheme = (next: ThemeMode) => setState({ ...state, theme: next });
  const toggleTheme = () =>
    setState({ ...state, theme: state.theme === 'dark' ? 'light' : 'dark' });
  const setAccent = (next: AccentTheme) => setState({ ...state, accent: next });

  return {
    theme: current.theme,
    setTheme,
    toggleTheme,
    isDark: current.theme === 'dark',
    accent: current.accent,
    setAccent,
    mounted,
  };
}
