'use client';

import { useState, useEffect, useCallback } from 'react';

export type AccentTheme = 'vermilion' | 'gold' | 'indigo' | 'emerald' | 'azure' | 'rose';

export const ACCENT_THEMES: { id: AccentTheme; label: string; color: string }[] = [
  { id: 'vermilion', label: 'Vermilion', color: '#E11D48' },
  { id: 'gold', label: 'Gold', color: '#D4AF37' },
  { id: 'indigo', label: 'Indigo', color: '#6366F1' },
  { id: 'emerald', label: 'Emerald', color: '#10B981' },
  { id: 'azure', label: 'Azure', color: '#0EA5E9' },
  { id: 'rose', label: 'Rose', color: '#F43F5E' },
];

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [accent, setAccentState] = useState<AccentTheme>('vermilion');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initialize dark/light mode
    const savedMode = localStorage.getItem('nuvellite_theme');
    if (savedMode === 'light' || savedMode === 'dark') {
      setTheme(savedMode);
      document.documentElement.classList.toggle('light', savedMode === 'light');
    } else {
      document.documentElement.classList.remove('light');
    }

    // Initialize color theme accent
    const savedAccent = localStorage.getItem('nuvellite_theme_accent') as AccentTheme | null;
    const validAccents: AccentTheme[] = ['vermilion', 'gold', 'indigo', 'emerald', 'azure', 'rose'];
    if (savedAccent && validAccents.includes(savedAccent)) {
      setAccentState(savedAccent);
      document.documentElement.setAttribute('data-accent', savedAccent);
    } else {
      document.documentElement.setAttribute('data-accent', 'vermilion');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('nuvellite_theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  }, [theme]);

  const setAccent = useCallback((nextAccent: AccentTheme) => {
    setAccentState(nextAccent);
    localStorage.setItem('nuvellite_theme_accent', nextAccent);
    document.documentElement.setAttribute('data-accent', nextAccent);
  }, []);

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    accent,
    setAccent,
    mounted,
  };
}
