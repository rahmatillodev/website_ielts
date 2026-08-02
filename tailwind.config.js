/**
 * NOTE: this file is NOT loaded.
 *
 * The project runs Tailwind v4 via `@tailwindcss/vite`, which is CSS-first —
 * a JS config is only picked up through an explicit `@config` directive, and
 * `src/index.css` has none. Everything here has been inert.
 *
 * A `theme.extend.colors` block used to live here. It was dead weight that
 * actively misled: it still declared `primary: '#1990e6'` (the old blue) long
 * after the app moved on, and carried typos nothing caught because nothing
 * consumed them — `primary.dark: '#ffff'` (five hex digits) and
 * `background.light: '#ff33333'` (seven). It has been deleted so the token
 * layer in `src/index.css` is unambiguously the only source of truth for
 * colour. The full ramps, semantic aliases and per-mode values all live there.
 *
 * If a JS config is ever genuinely needed, add
 *   @config "../tailwind.config.js";
 * to `src/index.css` — and expect anything defined here to start taking effect.
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Enable class-based dark mode (add 'dark' class to html/body)
  darkMode: 'class',

  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "!./src/components/pdf/**/*"
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },

      // Border radius values
      borderRadius: {
        'sm': 'calc(0.625rem - 4px)',   // 6px
        'md': 'calc(0.625rem - 2px)',   // 8px
        'lg': '0.625rem',                // 10px
        'xl': 'calc(0.625rem + 4px)',   // 14px
      },

      // Animation keyframes
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '0.45' },
        },
      },

      // Animation utilities
      animation: {
        shimmer: 'shimmer 2s infinite',
        'soft-pulse': 'softPulse 2s ease-in-out infinite',
      },
    },
  },

  plugins: [],
}
