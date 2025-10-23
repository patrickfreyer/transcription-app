/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./main.js",
    "./preload.js"
  ],
  theme: {
    extend: {
      colors: {
        // macOS/iOS inspired colors
        accent: {
          DEFAULT: '#007AFF',
          hover: '#0051D5',
          light: '#4DA3FF',
          dark: '#0047B3',
        },
        success: {
          DEFAULT: '#34C759',
          hover: '#2FB350',
          light: '#5DD67D',
          dark: '#28A745',
        },
        error: {
          DEFAULT: '#FF3B30',
          hover: '#D32F2F',
          light: '#FF6B61',
          dark: '#C62828',
        },
        warning: {
          DEFAULT: '#FF9500',
          hover: '#E68500',
          light: '#FFB340',
          dark: '#CC7700',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-main': 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        'gradient-accent': 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
        'gradient-success': 'linear-gradient(135deg, #34C759 0%, #2FB350 100%)',
        'gradient-error': 'linear-gradient(135deg, #FF3B30 0%, #D32F2F 100%)',
        'gradient-warning': 'linear-gradient(135deg, #FF9500 0%, #E68500 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
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
