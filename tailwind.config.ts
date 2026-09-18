import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised-rgb) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken-rgb) / <alpha-value>)',
          overlay: 'rgb(var(--surface-overlay-rgb) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'var(--border-subtle)',
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
          bold: 'var(--border-bold)',
        },
        accent: {
          50: '#FDF5F3',
          100: '#FCEBE7',
          200: '#F9D4CB',
          300: '#F5B3A3',
          400: '#EE8068',
          DEFAULT: 'rgb(var(--accent-rgb, 229 77 63) / <alpha-value>)',
          600: '#D03E22',
          700: '#A92F18',
          800: '#7E2412',
          900: '#52170B',
        },
        // Alias gold to accent for seamless theme harmony
        gold: {
          50: '#FDF5F3',
          100: '#FCEBE7',
          200: '#F9D4CB',
          300: '#F5B3A3',
          400: '#EE8068',
          DEFAULT: 'rgb(var(--accent-rgb, 229 77 63) / <alpha-value>)',
          600: '#D03E22',
          700: '#A92F18',
          800: '#7E2412',
          900: '#52170B',
        },
        editorial: {
          title: 'var(--editorial-title)',
          body: 'var(--editorial-body)',
          muted: 'var(--editorial-muted)',
          faint: 'var(--editorial-faint)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        editorial: ['var(--font-editorial)', 'Newsreader', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
