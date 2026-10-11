/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kairos: {
          50: '#eefcfb',
          100: '#d3f5f2',
          200: '#a8ebe6',
          300: '#72d9d3',
          400: '#3ebdb9',
          500: '#249d9c',
          600: '#1a7d7e',
          700: '#186466',
          800: '#175053',
          900: '#164346',
          950: '#082628',
        },
      },
      // Sombras con tinte teal (kairos-950) en lugar de negro puro: dan profundidad sin ensuciar.
      boxShadow: {
        sm: '0 1px 2px 0 rgb(8 38 40 / 0.06), 0 1px 3px 0 rgb(8 38 40 / 0.05)',
        DEFAULT: '0 2px 4px -1px rgb(8 38 40 / 0.07), 0 1px 3px 0 rgb(8 38 40 / 0.06)',
        md: '0 4px 12px -2px rgb(8 38 40 / 0.08), 0 2px 6px -2px rgb(8 38 40 / 0.06)',
        lg: '0 12px 28px -6px rgb(8 38 40 / 0.12), 0 4px 10px -4px rgb(8 38 40 / 0.07)',
        xl: '0 20px 40px -10px rgb(8 38 40 / 0.18), 0 8px 16px -8px rgb(8 38 40 / 0.10)',
        '2xl': '0 32px 64px -16px rgb(8 38 40 / 0.30)',
        glow: '0 6px 16px -4px rgb(26 125 126 / 0.45), 0 2px 4px -1px rgb(8 38 40 / 0.10)',
        'glow-lg': '0 10px 24px -6px rgb(26 125 126 / 0.55), 0 3px 6px -2px rgb(8 38 40 / 0.12)',
      },
      backgroundImage: {
        'kairos-gradient': 'linear-gradient(135deg, #082628 0%, #186466 45%, #3ebdb9 100%)',
      },
    },
  },
  plugins: [],
};
