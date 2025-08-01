// tailwind.config.ts
import type { Config } from "tailwindcss";

import { Comfortaa } from 'next/font/google'

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-comfortaa',
})

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-comfortaa)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-comfortaa)', 'sans-serif'],
      },
    },
  },
}