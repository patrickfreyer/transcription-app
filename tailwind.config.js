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
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-bcg': 'linear-gradient(135deg, #00A758 0%, #008C4A 100%)',
        'gradient-bcg-blue': 'linear-gradient(135deg, #0077C8 0%, #0062A8 100%)',
        'gradient-accent': 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
        'gradient-success': 'linear-gradient(135deg, #00A758 0%, #008C4A 100%)',
        'gradient-error': 'linear-gradient(135deg, #FF3B30 0%, #D32F2F 100%)',
        'gradient-warning': 'linear-gradient(135deg, #FF9500 0%, #E68500 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient': 'gradient 8s ease infinite',
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
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 20px 60px 0 rgba(0, 0, 0, 0.5)',
        'inner-lg': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        // Elevation shadows for dark mode (subtle, for depth without heavy borders)
        'dark-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.4)',
        'dark-md': '0 4px 16px 0 rgba(0, 0, 0, 0.5)',
        'dark-lg': '0 8px 24px 0 rgba(0, 0, 0, 0.6)',
        'dark-xl': '0 12px 32px 0 rgba(0, 0, 0, 0.7)',
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
