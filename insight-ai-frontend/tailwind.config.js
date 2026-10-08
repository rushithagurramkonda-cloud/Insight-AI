/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#00404E', dark: '#002F3A', mid: '#0B5B6E', soft: '#E7F0F2' },
        surface: '#F5F6FC',
        lavender: '#EEF0FB',
        line: '#E5E8F3',
        ink: { DEFAULT: '#111827', soft: '#4B5563', mute: '#6B7280' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.04)',
        pop: '0 12px 32px rgba(16,24,40,.12)',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        toastIn: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        fadeIn: 'fadeIn .35s ease-out both',
        toastIn: 'toastIn .25s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
