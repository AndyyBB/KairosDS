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
      backgroundImage: {
        'kairos-gradient': 'linear-gradient(135deg, #082628 0%, #186466 45%, #3ebdb9 100%)',
      },
    },
  },
  plugins: [],
};
