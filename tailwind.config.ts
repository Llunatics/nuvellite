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
        gold: {
          50: '#FDFBF5',
          100: '#FAF5E6',
          200: '#F4E9C7',
          300: '#EBD99F',
          400: '#DFC26F',
          DEFAULT: 'rgb(var(--gold-rgb, 212 175 55) / <alpha-value>)',
          600: '#B89326',
          700: '#8C6F19',
          800: '#614C0E',
          900: '#3D2F05',
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
