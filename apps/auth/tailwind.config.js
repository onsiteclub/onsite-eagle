/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // OnSite Brand Colors (based on Timekeeper design)
        onsite: {
          // Primary - Dark greenish gray
          dark: '#1B2B27',
          darker: '#0F1A17',
          
          // Secondary - Light gray backgrounds
          light: '#FBFAFC',
          lighter: '#FFFFFF',
          gray: '#F5F5F5',
          
          // Accent - Golden yellow
          accent: '#F6C343',
          'accent-hover': '#E5B23A',
          
          // Teal accents (from the color swatches)
          teal: '#0F172A',
          'teal-light': '#1E3A3A',
          
          // Status colors
          success: '#0F172A',
          warning: '#F6C343',
          error: '#DC2626',
          
          // Text colors
          'text-primary': '#1B2B27',
          'text-secondary': '#6B7280',
          'text-muted': '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'onsite': '12px',
        'onsite-lg': '16px',
      },
      boxShadow: {
        'onsite': '0 2px 8px rgba(27, 43, 39, 0.08)',
        'onsite-lg': '0 4px 16px rgba(27, 43, 39, 0.12)',
      },
    },
  },
  plugins: [],
};
