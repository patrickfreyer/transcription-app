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
        // Primary Theme - BCG Green
        'primary': {
          DEFAULT: '#00A758',
          hover: '#008C4A',
          light: '#33B977',
          dark: '#007042',
        },
        // BCG Brand Colors
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
        // Apple/iOS system colors (Secondary)
        'ios-blue': {
          DEFAULT: '#007aff',
          hover: '#0051d5',
        },
        'ios-green': {
          DEFAULT: '#34c759',
          hover: '#2fb350',
        },
        'ios-red': {
          DEFAULT: '#ff3b30',
          hover: '#e02d23',
        },
        'ios-orange': {
          DEFAULT: '#ff9500',
          hover: '#e68500',
        },
        'ios-purple': {
          DEFAULT: '#af52de',
          hover: '#9d3fd1',
        },
        // Background colors (Apple light theme)
        'bg-white': '#ffffff',
        'bg-gray': {
          50: '#f5f5f7',   // Cards, sections
          100: '#fbfbfd',  // Drop zones, visualizers
          200: '#e8e8ed',  // Borders
          300: '#d2d2d7',  // Darker borders
        },
        // Text colors
        'text-dark': '#1d1d1f',
        'text-gray': {
          DEFAULT: '#6e6e73',
          light: '#86868b',
        },
        // Legacy mappings for compatibility
        accent: {
          DEFAULT: '#007aff',
          hover: '#0051d5',
          light: '#4DA3FF',
          dark: '#0047B3',
        },
        success: {
          DEFAULT: '#00A758',
          hover: '#008C4A',
          light: '#33B977',
          dark: '#007042',
        },
        error: {
          DEFAULT: '#ff3b30',
          hover: '#e02d23',
          light: '#FF6B61',
          dark: '#C62828',
        },
        warning: {
          DEFAULT: '#ff9500',
          hover: '#e68500',
          light: '#FFB340',
          dark: '#CC7700',
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
