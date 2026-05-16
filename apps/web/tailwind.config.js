/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#F7F3EC',
        ink: '#1C1A17',
        terracotta: {
          50: '#FBF1EC',
          100: '#F5DED2',
          200: '#EABDA5',
          300: '#DD9778',
          400: '#CB7350',
          500: '#B85A36',
          600: '#97472A',
          700: '#723524',
        },
        sage: {
          100: '#E4EAE1',
          400: '#8BA088',
          600: '#5C7159',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28,26,23,0.04), 0 4px 16px rgba(28,26,23,0.06)',
      },
    },
  },
  plugins: [],
};
