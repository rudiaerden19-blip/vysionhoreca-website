/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3C4D6B',
          light: '#4A5D7B',
          dark: '#2E3D55',
        },
        accent: '#E85A3C',
        dark: '#1a1a1a',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'mijn-vysion-kenburns': {
          '0%': { transform: 'scale(1) translate(0%, 0%)' },
          '100%': { transform: 'scale(1.1) translate(-3.5%, -2.5%)' },
        },
      },
      animation: {
        'mijn-vysion-kenburns':
          'mijn-vysion-kenburns 50s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
}

