/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/auth-ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF9EB',
          100: '#FFF3D6',
          200: '#F2D28B',
          300: '#E0B84D',
          400: '#D4A02E',
          500: '#C58B1B',
          600: '#A67516',
          700: '#8F6513',
          800: '#6B4C0F',
          900: '#4A340A',
        },
      },
    },
  },
  plugins: [],
}
