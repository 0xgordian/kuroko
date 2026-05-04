import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        terminal: ['Geist Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'rgba(255,255,255,0.08)',
        background: '#000000',
        foreground: '#f0f0f0',
        sidebar: {
          DEFAULT: '#0a0a0a',
          foreground: '#a0a0a0',
          primary: '#7c3aed',
          'primary-foreground': '#ffffff',
          accent: '#161616',
          'accent-foreground': '#f0f0f0',
          border: 'rgba(255,255,255,0.06)',
          ring: '#7c3aed',
        },
      },
      typography: {
        invert: {
          css: {
            '--tw-prose-body': '#e0e0e0',
            '--tw-prose-headings': '#f0f0f0',
            '--tw-prose-links': '#a78bfa',
            '--tw-prose-bold': '#f0f0f0',
            '--tw-prose-counters': '#a0a0a0',
            '--tw-prose-bullets': '#555',
            '--tw-prose-hr': 'rgba(255,255,255,0.08)',
            '--tw-prose-quotes': '#a0a0a0',
            '--tw-prose-quote-borders': 'rgba(124,58,237,0.4)',
            '--tw-prose-captions': '#555',
            '--tw-prose-code': '#a78bfa',
            '--tw-prose-pre-code': '#a0a0a0',
            '--tw-prose-pre-bg': '#0d0d0d',
            '--tw-prose-th-borders': 'rgba(255,255,255,0.08)',
            '--tw-prose-td-borders': 'rgba(255,255,255,0.06)',
          },
        },
      },
      boxShadow: {
        'glow': '0 0 10px rgba(124,58,237,0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
