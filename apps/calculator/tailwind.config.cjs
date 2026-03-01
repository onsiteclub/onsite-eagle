/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false, // Don't reset existing custom CSS
  },
  content: [
    '../../packages/auth-ui/src/**/*.{ts,tsx}',
  ],
}
