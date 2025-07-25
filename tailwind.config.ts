import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        heading: ['var(--font-montserrat)'],
      },
      colors: {
        primary: {
          DEFAULT: '#e53e3e',
          light: '#fc8181',
          dark: '#c53030',
        },
        success: '#48bb78',
        warning: '#f6ad55',
        error: '#f56565',
      },
    },
  },
  plugins: [],
}
export default config