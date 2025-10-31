/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}",
    "./main.js",
    "./preload.js"
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Surface Colors (backgrounds)
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          secondary: 'rgb(var(--surface-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--surface-tertiary) / <alpha-value>)',
        },
        // Semantic Text Colors
        foreground: {
          DEFAULT: 'rgb(var(--foreground) / <alpha-value>)',
          secondary: 'rgb(var(--foreground-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--foreground-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--foreground-inverse) / <alpha-value>)',
        },
        // Semantic Border Colors
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        },
        // Interactive Colors (buttons, links, actions)
        interactive: {
          DEFAULT: 'rgb(var(--interactive) / <alpha-value>)',
          hover: 'rgb(var(--interactive-hover) / <alpha-value>)',
          active: 'rgb(var(--interactive-active) / <alpha-value>)',
          disabled: 'rgb(var(--interactive-disabled) / <alpha-value>)',
        },
        // Semantic State Colors
        success: {
          DEFAULT: '#00A758',
          hover: '#008C4A',
          light: '#33B977',
          bg: '#f0fdf4',
        },
        error: {
          DEFAULT: '#ff3b30',
          hover: '#e02d23',
          light: '#FF6B61',
          bg: '#fef2f2',
        },
        warning: {
          DEFAULT: '#ff9500',
          hover: '#e68500',
          light: '#FFB340',
          bg: '#fffbeb',
        },
        info: {
          DEFAULT: '#007aff',
          hover: '#0051d5',
          light: '#4DA3FF',
          bg: '#eff6ff',
        },
        // Primary (maps to interactive for compatibility)
        primary: {
          DEFAULT: '#00A758',
          hover: '#008C4A',
          light: '#33B977',
          dark: '#007042',
        },
        // Brand Colors (preserved)
        'bcg-green': {
          DEFAULT: '#00A758',
          hover: '#008C4A',
          light: '#33B977',
          dark: '#007042',
        },
        'bcg-blue': {
          DEFAULT: '#0077C8',
          hover: '#0062A8',
          light: '#3395D8',
          dark: '#005291',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
