'use client';

// Locked theme (Round 2, Blocks 1+7 / risk mitigation §6.2): the design
// language is a single near-black dark canvas with one lime accent. This hook
// is kept as a safe no-op so existing components referencing useTheme()
// compile cleanly while the locked style is enforced. There is no light mode
// and no accent picker anymore.
export type AccentTheme = 'lime';

export const ACCENT_THEMES: { id: AccentTheme; label: string; color: string }[] = [
  { id: 'lime', label: 'Lime', color: '#A3E635' },
];

export function useTheme() {
  return {
    theme: 'dark' as const,
    toggleTheme: () => {},
    isDark: true,
    accent: 'lime' as AccentTheme,
    setAccent: (_next: AccentTheme) => {},
    mounted: true,
  };
}
